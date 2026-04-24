import path from 'node:path';
import {Command} from 'commander';
import {addDays, formatDate, getDaysBetween, startOfLocalDay, type DateRange} from '../utils/date.js';

const MAX_SINCE_DAYS = 3650;

export type RangeRequest =
	| {kind: 'fixed'; range: DateRange}
	| {kind: 'custom'; from?: DateInput; to?: DateInput};

export type DateInput = {
	raw: string;
	precision: 'year' | 'month' | 'day';
	startDate: string;
	endDate: string;
};

export type CliOptions = {
	repo: string;
	rangeRequest: RangeRequest;
	branch?: string;
	author?: string;
	me: boolean;
	heatmap: boolean;
	ranking: boolean;
};

const parsePositiveInteger = (value: string, optionName: string): number => {
	const parsed = Number.parseInt(value, 10);
	if (!/^\d+$/.test(value) || !Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`${optionName} 必须是正整数。`);
	}

	return parsed;
};

const parseSinceRange = (value: string): DateRange => {
	const since = parsePositiveInteger(value, '--since');
	if (since > MAX_SINCE_DAYS) {
		throw new Error(`--since 最大支持 ${MAX_SINCE_DAYS} 天。`);
	}

	const end = startOfLocalDay(new Date());
	const start = addDays(end, -(since - 1));

	return {
		kind: 'since',
		startDate: formatDate(start),
		endDate: formatDate(end),
		label: `last ${since} days`,
		dayCount: since
	};
};

const parseYearRange = (value: string): DateRange => {
	const input = parseDateInput(value, '--year');
	if (input.precision !== 'year') {
		throw new Error('--year 必须是 yyyy 格式。');
	}

	const {startDate, endDate} = input;

	return {
		kind: 'year',
		startDate,
		endDate,
		label: input.raw,
		dayCount: getDaysBetween(startDate, endDate) + 1
	};
};

const parseMonthRange = (value: string): DateRange => {
	const input = parseDateInput(value, '--month');
	if (input.precision !== 'month') {
		throw new Error('--month 必须是 yyyy-MM 格式。');
	}

	const {startDate, endDate} = input;

	return {
		kind: 'month',
		startDate,
		endDate,
		label: input.raw,
		dayCount: getDaysBetween(startDate, endDate) + 1
	};
};

const parseRangeRequest = (values: {
	since?: string;
	year?: string;
	month?: string;
	from?: string;
	to?: string;
}): RangeRequest => {
	const fixedValues = [values.since, values.year, values.month].filter(value => value !== undefined);
	const hasCustomRange = values.from !== undefined || values.to !== undefined;

	if (fixedValues.length > 1) {
		throw new Error('--since、--year、--month 只能指定一个。');
	}

	if (hasCustomRange && fixedValues.length > 0) {
		throw new Error('--from/--to 不能和 --since、--year、--month 同时使用。');
	}

	if (hasCustomRange) {
		const from = values.from === undefined ? undefined : parseDateInput(String(values.from), '--from');
		const to = values.to === undefined ? undefined : parseDateInput(String(values.to), '--to');

		if (from && to && from.precision !== to.precision) {
			throw new Error('--from 和 --to 同时使用时必须采用相同格式。');
		}

		return {kind: 'custom', from, to};
	}

	if (values.year !== undefined) {
		return {kind: 'fixed', range: parseYearRange(String(values.year))};
	}

	if (values.month !== undefined) {
		return {kind: 'fixed', range: parseMonthRange(String(values.month))};
	}

	return {kind: 'fixed', range: parseSinceRange(String(values.since ?? '365'))};
};

export function createCustomDateRange(request: Extract<RangeRequest, {kind: 'custom'}>, fallbackStartDate?: string): DateRange {
	const startDate = request.from?.startDate ?? fallbackStartDate;
	const endDate = request.to?.endDate ?? formatDate(startOfLocalDay(new Date()));

	if (!startDate) {
		return {
			kind: 'custom',
			startDate: endDate,
			endDate,
			label: getCustomRangeLabel(request),
			dayCount: 0
		};
	}

	const dayCount = getDaysBetween(startDate, endDate) + 1;
	if (dayCount <= 0) {
		throw new Error('--from 不能晚于 --to。');
	}

	if (dayCount > MAX_SINCE_DAYS) {
		throw new Error(`时间范围最大支持 ${MAX_SINCE_DAYS} 天。`);
	}

	return {
		kind: 'custom',
		startDate,
		endDate,
		label: getCustomRangeLabel(request),
		dayCount
	};
}

function parseDateInput(value: string, optionName: string): DateInput {
	if (/^\d{4}$/.test(value)) {
		return {
			raw: value,
			precision: 'year',
			startDate: `${value}-01-01`,
			endDate: `${value}-12-31`
		};
	}

	const monthMatch = /^(\d{4})-(\d{2})$/.exec(value);
	if (monthMatch) {
		const year = Number.parseInt(monthMatch[1] ?? '', 10);
		const month = Number.parseInt(monthMatch[2] ?? '', 10);
		if (month < 1 || month > 12) {
			throw new Error(`${optionName} 的月份必须在 01 到 12 之间。`);
		}

		return {
			raw: value,
			precision: 'month',
			startDate: formatDate(new Date(year, month - 1, 1)),
			endDate: formatDate(new Date(year, month, 0))
		};
	}

	const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (dayMatch) {
		const year = Number.parseInt(dayMatch[1] ?? '', 10);
		const month = Number.parseInt(dayMatch[2] ?? '', 10);
		const day = Number.parseInt(dayMatch[3] ?? '', 10);
		const date = new Date(year, month - 1, day);
		const formatted = formatDate(date);

		if (formatted !== value) {
			throw new Error(`${optionName} 必须是存在的日期。`);
		}

		return {
			raw: value,
			precision: 'day',
			startDate: formatted,
			endDate: formatted
		};
	}

	throw new Error(`${optionName} 必须是 yyyy、yyyy-MM 或 yyyy-MM-dd 格式。`);
}

function getCustomRangeLabel(request: Extract<RangeRequest, {kind: 'custom'}>): string {
	return `${request.from?.raw ?? 'first commit'}..${request.to?.raw ?? 'now'}`;
}

export function parseArgs(argv = process.argv): CliOptions {
	const program = new Command();

	program
		.name('git-insight')
		.description('一次性输出型 Git 仓库分析工具')
		.helpOption('-h, --help', '显示帮助信息')
		.option('--since <days>', '统计最近 N 天数据，默认 365，最大 3650')
		.option('--year <yyyy>', '统计指定年份数据')
		.option('--month <yyyy-MM>', '统计指定月份数据')
		.option('--from <date>', '统计起始时间，支持 yyyy、yyyy-MM、yyyy-MM-dd')
		.option('--to <date>', '统计结束时间，支持 yyyy、yyyy-MM、yyyy-MM-dd')
		.option('--branch <name>', '指定分析分支，默认当前分支')
		.option('--repo <path>', '指定 Git 仓库目录，默认当前目录', process.cwd())
		.option('--author <query>', '只展示匹配作者名称或邮箱的数据')
		.option('--me', '只展示当前 Git 配置用户的数据')
		.option('--no-heatmap', '关闭提交热力图')
		.option('--no-ranking', '关闭作者排名')
		.addHelpText('after', `
时间范围:
  默认使用 --since 365。
  --since、--year、--month、--from/--to 只能选择一种时间范围。
  --from 和 --to 可以单独使用；同时使用时必须采用相同格式。
  只有 --from 时默认统计到今天，只有 --to 时默认从当前分析分支的第一个提交开始。
  所有时间范围最大支持 ${MAX_SINCE_DAYS} 天。

作者过滤:
  --author 和 --me 只能选择一个。
  --author 会匹配作者名称、邮箱和配置合并后的主邮箱。
  --me 使用当前仓库 Git 配置中的 user.name / user.email。

显示开关:
  默认显示提交热力图和作者排名。
  --no-heatmap 可关闭热力图，--no-ranking 可关闭作者排名。

示例:
  git-insight --help
  git-insight
  git-insight --repo /path/to/repo
  git-insight --repo /path/to/repo --since 90
  git-insight --repo /path/to/repo --year 2025
  git-insight --repo /path/to/repo --month 2025-04
  git-insight --repo /path/to/repo --from 2024 --to 2025
  git-insight --repo /path/to/repo --from 2025-04-01 --to 2025-04-20
  git-insight --repo /path/to/repo --branch main --author alice
  git-insight --repo /path/to/repo --me
  git-insight --repo /path/to/repo --no-heatmap --no-ranking
`);

	program.parse(argv);
	const values = program.opts();
	if (values.author && values.me) {
		throw new Error('--author 和 --me 只能指定一个。');
	}

	return {
		repo: path.resolve(String(values.repo)),
		rangeRequest: parseRangeRequest(values),
		branch: values.branch,
		author: values.author,
		me: values.me,
		heatmap: values.heatmap,
		ranking: values.ranking
	};
}

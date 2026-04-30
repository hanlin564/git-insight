import path from 'node:path';
import {Command, Help, type Argument, type Option} from 'commander';
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
	branchActivity: boolean;
};

const parsePositiveInteger = (value: string, optionName: string): number => {
	const parsed = Number.parseInt(value, 10);
	if (!/^\d+$/.test(value) || !Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`${optionName} 必须是正整数。`);
	}

	return parsed;
};

const parseSinceRange = (value: string): DateRange => {
	const last = parsePositiveInteger(value, '--last');
	if (last > MAX_SINCE_DAYS) {
		throw new Error(`--last 最大支持 ${MAX_SINCE_DAYS} 天。`);
	}

	const end = startOfLocalDay(new Date());
	const start = addDays(end, -(last - 1));

	return {
		kind: 'since',
		startDate: formatDate(start),
		endDate: formatDate(end),
		label: `最近 ${last} 天`,
		dayCount: last
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
	last?: string;
	year?: string;
	month?: string;
	from?: string;
	to?: string;
}): RangeRequest => {
	const fixedValues = [values.last, values.year, values.month].filter(value => value !== undefined);
	const hasCustomRange = values.from !== undefined || values.to !== undefined;

	if (fixedValues.length > 1) {
		throw new Error('--last、--year、--month 只能指定一个。');
	}

	if (hasCustomRange && fixedValues.length > 0) {
		throw new Error('--from/--to 不能和 --last、--year、--month 同时使用。');
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

	return {kind: 'fixed', range: parseSinceRange(String(values.last ?? '365'))};
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
	return `${request.from?.raw ?? '首个提交'}..${request.to?.raw ?? '今天'}`;
}

export function parseArgs(argv = process.argv): CliOptions {
	const program = new Command();

	program
		.name('git-insight')
		.description('一次性输出型 Git 仓库分析工具')
		.configureHelp({
			optionDescription: describeOption,
			argumentDescription: describeArgument,
			formatHelp: formatChineseHelp
		})
		.configureOutput({
			outputError: (text, write) => {
				write(translateCommanderError(text));
			}
		})
		.helpOption('-h, --help', '显示帮助信息')
		.option('--last <days>', '统计最近 N 天数据，默认 365，最大 3650')
		.option('--year <yyyy>', '统计指定年份数据')
		.option('--month <yyyy-MM>', '统计指定月份数据')
		.option('--from <date>', '统计起始时间，支持 yyyy、yyyy-MM、yyyy-MM-dd')
		.option('--to <date>', '统计结束时间，支持 yyyy、yyyy-MM、yyyy-MM-dd')
		.option('--branch <name>', '指定分析分支，默认当前分支')
		.option('--repo <path>', '指定 Git 仓库目录，默认当前目录', process.cwd())
		.option('--author <query>', '只展示匹配作者名称或邮箱的数据')
		.option('--me', '聚焦当前 Git 配置用户的数据和排名')
		.option('--no-heatmap', '关闭提交热力图')
		.option('--no-ranking', '关闭作者排名')
		.option('--no-branch-activity', '关闭活跃/不活跃分支')
		.addHelpText('after', `
时间范围:
  默认使用 --last 365。
  --last、--year、--month、--from/--to 只能选择一种时间范围。
  --from 和 --to 可以单独使用；同时使用时必须采用相同格式。
  只有 --from 时默认统计到今天，只有 --to 时默认从当前分析分支的第一个提交开始。
  所有时间范围最大支持 ${MAX_SINCE_DAYS} 天。

作者过滤:
  --author 和 --me 只能选择一个。
  --author 会匹配作者名称、邮箱和配置合并后的展示名称/邮箱。
  --me 使用当前仓库 Git 配置中的 user.name / user.email；热力图展示本人，排行榜展示全仓库排名中的本人位置。

显示开关:
  默认显示提交热力图、作者排名和活跃/不活跃分支。
  --no-heatmap 可关闭热力图，--no-ranking 可关闭作者排名，--no-branch-activity 可关闭活跃/不活跃分支。
  使用 --branch 指定单个分析分支时，不展示活跃/不活跃分支。

示例:
  git-insight --help
  git-insight
  git-insight --repo /path/to/repo
  git-insight --repo /path/to/repo --last 90
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
		ranking: values.ranking,
		branchActivity: values.branchActivity
	};
}

const defaultHelp = new Help();

function describeOption(option: Option): string {
	return translateHelpExtra(defaultHelp.optionDescription(option));
}

function describeArgument(argument: Argument): string {
	return translateHelpExtra(defaultHelp.argumentDescription(argument));
}

function translateHelpExtra(value: string): string {
	return value
		.replace(/\bchoices: /g, '可选值：')
		.replace(/\bdefault: /g, '默认：')
		.replace(/\bpreset: /g, '预设：')
		.replace(/\benv: /g, '环境变量：');
}

function translateCommanderError(value: string): string {
	return value
		.replace(/^error: unknown option '([^']+)'/m, '错误：未知选项 \'$1\'')
		.replace(/^error: option '([^']+)' argument missing/m, '错误：选项 \'$1\' 缺少参数')
		.replace(/^error: required option '([^']+)' not specified/m, '错误：必填选项 \'$1\' 未指定')
		.replace(/^error: missing required argument '([^']+)'/m, '错误：缺少必填参数 \'$1\'')
		.replace(/^error: too many arguments\. Expected (\d+) arguments? but got (\d+)\./m, '错误：参数过多。需要 $1 个，收到 $2 个。')
		.replace(/\(Did you mean one of ([^)]+)\?\)/g, '（你是想输入这些选项之一吗：$1？）')
		.replace(/\(Did you mean ([^)]+)\?\)/g, '（你是想输入 $1 吗？）');
}

function formatChineseHelp(command: Command, helper: Help): string {
	const termWidth = helper.padWidth(command, helper);
	const helpWidth = helper.helpWidth ?? 80;
	const itemIndentWidth = 2;
	const itemSeparatorWidth = 2;
	const formatItem = (term: string, description: string): string => {
		if (!description) {
			return term;
		}

		const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
		return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
	};
	const formatList = (items: string[]): string => items.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth));

	let output = [`用法：${helper.commandUsage(command)}`, ''];

	const commandDescription = helper.commandDescription(command);
	if (commandDescription.length > 0) {
		output = output.concat([helper.wrap(commandDescription, helpWidth, 0), '']);
	}

	const argumentList = helper.visibleArguments(command).map(argument =>
		formatItem(helper.argumentTerm(argument), helper.argumentDescription(argument))
	);
	if (argumentList.length > 0) {
		output = output.concat(['参数：', formatList(argumentList), '']);
	}

	const optionList = helper.visibleOptions(command).map(option =>
		formatItem(helper.optionTerm(option), helper.optionDescription(option))
	);
	if (optionList.length > 0) {
		output = output.concat(['选项：', formatList(optionList), '']);
	}

	if (helper.showGlobalOptions) {
		const globalOptionList = helper.visibleGlobalOptions(command).map(option =>
			formatItem(helper.optionTerm(option), helper.optionDescription(option))
		);
		if (globalOptionList.length > 0) {
			output = output.concat(['全局选项：', formatList(globalOptionList), '']);
		}
	}

	const commandList = helper.visibleCommands(command).map(visibleCommand =>
		formatItem(helper.subcommandTerm(visibleCommand), helper.subcommandDescription(visibleCommand))
	);
	if (commandList.length > 0) {
		output = output.concat(['命令：', formatList(commandList), '']);
	}

	return output.join('\n');
}

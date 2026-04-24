import path from 'node:path';
import {Command} from 'commander';
import {addDays, formatDate, getDaysBetween, startOfLocalDay, type DateRange} from '../utils/date.js';

const MAX_SINCE_DAYS = 3650;

export type CliOptions = {
	repo: string;
	range: DateRange;
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
	if (!/^\d{4}$/.test(value)) {
		throw new Error('--year 必须是 yyyy 格式。');
	}

	const startDate = `${value}-01-01`;
	const endDate = `${value}-12-31`;

	return {
		kind: 'year',
		startDate,
		endDate,
		label: value,
		dayCount: getDaysBetween(startDate, endDate) + 1
	};
};

const parseMonthRange = (value: string): DateRange => {
	const match = /^(\d{4})-(\d{2})$/.exec(value);
	if (!match) {
		throw new Error('--month 必须是 yyyy-MM 格式。');
	}

	const [, year, month] = match;
	const monthNumber = Number.parseInt(month ?? '', 10);
	if (monthNumber < 1 || monthNumber > 12) {
		throw new Error('--month 的月份必须在 01 到 12 之间。');
	}

	const start = new Date(Number.parseInt(year ?? '', 10), monthNumber - 1, 1);
	const end = new Date(Number.parseInt(year ?? '', 10), monthNumber, 0);
	const startDate = formatDate(start);
	const endDate = formatDate(end);

	return {
		kind: 'month',
		startDate,
		endDate,
		label: `${year}-${month}`,
		dayCount: getDaysBetween(startDate, endDate) + 1
	};
};

const parseRange = (values: {since?: string; year?: string; month?: string}): DateRange => {
	const selected = [values.since, values.year, values.month].filter(value => value !== undefined);
	if (selected.length > 1) {
		throw new Error('--since、--year、--month 只能指定一个。');
	}

	if (values.year !== undefined) {
		return parseYearRange(String(values.year));
	}

	if (values.month !== undefined) {
		return parseMonthRange(String(values.month));
	}

	return parseSinceRange(String(values.since ?? '365'));
};

export function parseArgs(argv = process.argv): CliOptions {
	const program = new Command();

	program
		.name('git-insight')
		.description('一次性输出型 Git 仓库分析工具')
		.option('--since <days>', '统计最近 N 天数据，默认 365')
		.option('--year <yyyy>', '统计指定年份数据')
		.option('--month <yyyy-MM>', '统计指定月份数据')
		.option('--branch <name>', '指定分析分支，默认当前分支')
		.option('--repo <path>', 'Git 仓库目录', process.cwd())
		.option('--author <query>', '只展示匹配作者名称或邮箱的数据')
		.option('--me', '只展示当前 Git 配置用户的数据')
		.option('--no-heatmap', '关闭提交热力图')
		.option('--no-ranking', '关闭作者排名');

	program.parse(argv);
	const values = program.opts();
	if (values.author && values.me) {
		throw new Error('--author 和 --me 只能指定一个。');
	}

	return {
		repo: path.resolve(String(values.repo)),
		range: parseRange(values),
		branch: values.branch,
		author: values.author,
		me: values.me,
		heatmap: values.heatmap,
		ranking: values.ranking
	};
}

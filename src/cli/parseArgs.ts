import path from 'node:path';
import {Command} from 'commander';

const MAX_SINCE_DAYS = 3650;

export type CliOptions = {
	since: number;
	branchSince: number;
	top: number;
	repo: string;
	author?: string;
	heatmap: boolean;
	ranking: boolean;
	branch: boolean;
};

const positiveInteger = (value: string, fallback: number): number => {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const boundedSinceDays = (value: string): number => {
	const since = positiveInteger(value, 365);
	if (since > MAX_SINCE_DAYS) {
		throw new Error(`--since 最大支持 ${MAX_SINCE_DAYS} 天。`);
	}

	return since;
};

export function parseArgs(argv = process.argv): CliOptions {
	const program = new Command();

	program
		.name('git-insight')
		.description('一次性输出型 Git 仓库分析工具')
		.option('--since <days>', '热力图和作者统计范围天数', '365')
		.option('--branch-since <days>', '分支活跃度统计范围天数', '90')
		.option('--top <number>', '排名输出数量', '10')
		.option('--repo <path>', 'Git 仓库目录', process.cwd())
		.option('--author <name>', '只展示匹配作者的数据')
		.option('--no-heatmap', '关闭作者提交热力图')
		.option('--no-ranking', '关闭作者排名')
		.option('--no-branch', '关闭分支活跃度');

	program.parse(argv);
	const values = program.opts();

	return {
		since: boundedSinceDays(values.since),
		branchSince: positiveInteger(values.branchSince, 90),
		top: positiveInteger(values.top, 10),
		repo: path.resolve(String(values.repo)),
		author: values.author,
		heatmap: values.heatmap,
		ranking: values.ranking,
		branch: values.branch
	};
}

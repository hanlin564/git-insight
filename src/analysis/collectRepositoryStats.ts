import {createCustomDateRange, type CliOptions} from '../cli/parseArgs.js';
import type {AuthorStat, CommitRecord, GitUserIdentity, RepositoryTarget} from '../git/types.js';
import {
	createRepositoryTarget,
	getCurrentBranchName,
	getCurrentGitUser,
	getFirstCommitDate,
	getLogWithNumstat,
	GitBranchError,
	GitRepositoryError,
	resolveAnalysisBranch
} from '../git/gitClient.js';
import type {DateRange} from '../utils/date.js';
import {parseGitLogWithNumstat} from '../git/gitLogParser.js';
import {AuthorAliasConfigError, loadAuthorAliasLookup} from './authorAliases.js';
import {createAuthorIdentityResolver} from './authorIdentity.js';
import {collectAuthorStats, topAuthorsByChangedLines, topAuthorsByCommits} from './authorStats.js';
import {collectContributionHeatmap, type ContributionHeatmapStat} from './heatmapStats.js';

const DEFAULT_RANKING_LIMIT = 10;

export type RepositoryStats = {
	repository: RepositoryTarget;
	commits: CommitRecord[];
	authorStats: AuthorStat[];
	topByCommits: AuthorStat[];
	topByChangedLines: AuthorStat[];
	heatmap?: ContributionHeatmapStat;
	currentGitUser?: GitUserIdentity;
	currentBranchName: string;
	analysisBranchName: string;
	range: DateRange;
};

export type RepositoryStatsResult =
	| {ok: true; stats: RepositoryStats}
	| {ok: false; error: string; repositoryPath: string};

export async function collectRepositoryStats(options: CliOptions): Promise<RepositoryStatsResult> {
	try {
		const repository = await createRepositoryTarget(options.repo);
		const currentBranchName = await getCurrentBranchName(repository.path);
		const branch = await resolveAnalysisBranch(repository.path, options.branch, currentBranchName);
		const range = await resolveDateRange(repository.path, branch.ref, options);
		const logOutput = branch.ref ? await getLogWithNumstat(repository.path, range, branch.ref) : '';
		const commits = parseGitLogWithNumstat(logOutput);
		const authorAliases = await loadAuthorAliasLookup(repository.path);
		const authorResolver = createAuthorIdentityResolver(commits, authorAliases);
		const currentGitUser = options.me ? await getCurrentGitUser(repository.path) : undefined;

		if (options.me && !currentGitUser) {
			return {ok: false, error: '未读取到当前 Git 配置用户，请先配置 user.name 或 user.email。', repositoryPath: options.repo};
		}

		const authorStats = collectAuthorStats(commits, authorResolver, range.dayCount, options.author, currentGitUser);

		return {
			ok: true,
			stats: {
				repository,
				commits,
				authorStats,
				topByCommits: topAuthorsByCommits(authorStats, DEFAULT_RANKING_LIMIT),
				topByChangedLines: topAuthorsByChangedLines(authorStats, DEFAULT_RANKING_LIMIT),
				heatmap: options.heatmap
					? collectContributionHeatmap(commits, range, authorResolver, options.author, currentGitUser)
					: undefined,
				currentGitUser,
				currentBranchName,
				analysisBranchName: branch.name,
				range
			}
		};
	} catch (error) {
		if (error instanceof GitRepositoryError || error instanceof GitBranchError || error instanceof AuthorAliasConfigError) {
			return {ok: false, error: error.message, repositoryPath: options.repo};
		}

		throw error;
	}
}

async function resolveDateRange(
	repositoryPath: string,
	branchRef: string | undefined,
	options: CliOptions
): Promise<DateRange> {
	if (options.rangeRequest.kind === 'fixed') {
		return options.rangeRequest.range;
	}

	const fallbackStartDate = branchRef && !options.rangeRequest.from
		? await getFirstCommitDate(repositoryPath, branchRef)
		: undefined;

	return createCustomDateRange(options.rangeRequest, fallbackStartDate);
}

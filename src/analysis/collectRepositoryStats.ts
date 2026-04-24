import type {CliOptions} from '../cli/parseArgs.js';
import type {AuthorStat, BranchStat, CommitRecord, RepositoryTarget} from '../git/types.js';
import {createRepositoryTarget, getCurrentGitUser, getLogWithNumstat, GitRepositoryError} from '../git/gitClient.js';
import {parseGitLogWithNumstat} from '../git/gitLogParser.js';
import {AuthorAliasConfigError, loadAuthorAliasLookup} from './authorAliases.js';
import {createAuthorIdentityResolver} from './authorIdentity.js';
import {collectAuthorStats, topAuthorsByChangedLines, topAuthorsByCommits} from './authorStats.js';
import {collectContributionHeatmap, type ContributionHeatmapStat} from './heatmapStats.js';
import {collectBranchStats} from './branchStats.js';

export type RepositoryStats = {
	repository: RepositoryTarget;
	commits: CommitRecord[];
	authorStats: AuthorStat[];
	topByCommits: AuthorStat[];
	topByChangedLines: AuthorStat[];
	heatmap?: ContributionHeatmapStat;
	branchStats: BranchStat[];
};

export type RepositoryStatsResult =
	| {ok: true; stats: RepositoryStats}
	| {ok: false; error: string; repositoryPath: string};

export async function collectRepositoryStats(options: CliOptions): Promise<RepositoryStatsResult> {
	try {
		const repository = await createRepositoryTarget(options.repo);
		const logOutput = await getLogWithNumstat(repository.path, options.since);
		const commits = parseGitLogWithNumstat(logOutput);
		const authorAliases = await loadAuthorAliasLookup(repository.path);
		const authorResolver = createAuthorIdentityResolver(commits, authorAliases);
		const authorStats = collectAuthorStats(commits, authorResolver, options.author);
		const currentGitUser = options.heatmap && options.currentUser ? await getCurrentGitUser(repository.path) : undefined;

		return {
			ok: true,
			stats: {
				repository,
				commits,
				authorStats,
				topByCommits: topAuthorsByCommits(authorStats, options.top),
				topByChangedLines: topAuthorsByChangedLines(authorStats, options.top),
				heatmap: options.heatmap && (!options.currentUser || currentGitUser)
					? collectContributionHeatmap(commits, options.since, authorResolver, options.author, currentGitUser)
					: undefined,
				branchStats: options.branch ? await collectBranchStats(repository.path, options.branchSince) : []
			}
		};
	} catch (error) {
		if (error instanceof GitRepositoryError || error instanceof AuthorAliasConfigError) {
			return {ok: false, error: error.message, repositoryPath: options.repo};
		}

		throw error;
	}
}

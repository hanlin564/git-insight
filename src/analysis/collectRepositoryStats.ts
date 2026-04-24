import type {CliOptions} from '../cli/parseArgs.js';
import type {AuthorStat, BranchStat, CommitRecord, RepositoryTarget} from '../git/types.js';
import {createRepositoryTarget, getLogWithNumstat, GitRepositoryError} from '../git/gitClient.js';
import {parseGitLogWithNumstat} from '../git/gitLogParser.js';
import {collectAuthorStats, topAuthorsByChangedLines, topAuthorsByCommits} from './authorStats.js';
import {collectAuthorHeatmaps, type AuthorHeatmapStat} from './heatmapStats.js';
import {collectBranchStats} from './branchStats.js';

export type RepositoryStats = {
	repository: RepositoryTarget;
	commits: CommitRecord[];
	authorStats: AuthorStat[];
	topByCommits: AuthorStat[];
	topByChangedLines: AuthorStat[];
	heatmaps: AuthorHeatmapStat[];
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
		const authorStats = collectAuthorStats(commits, options.author);

		return {
			ok: true,
			stats: {
				repository,
				commits,
				authorStats,
				topByCommits: topAuthorsByCommits(authorStats, options.top),
				topByChangedLines: topAuthorsByChangedLines(authorStats, options.top),
				heatmaps: options.heatmap ? collectAuthorHeatmaps(commits, options.since, options.author) : [],
				branchStats: options.branch ? await collectBranchStats(repository.path, options.branchSince) : []
			}
		};
	} catch (error) {
		if (error instanceof GitRepositoryError) {
			return {ok: false, error: error.message, repositoryPath: options.repo};
		}

		throw error;
	}
}

import path from 'node:path';
import type {CommitRecord, GitUserIdentity, HeatmapPeriodCount} from '../git/types.js';
import {discoverGitRepositories} from '../git/repositoryDiscovery.js';
import {getGlobalGitUser, getRepositoryCommits, GitGlobalUserError} from '../git/gitClient.js';
import {addDays, addMonths, formatDate, getDateRangeBetween, startOfLocalDay} from '../utils/date.js';

export type ProgressSnapshot =
	| {
		phase: 'scanning';
		scannedDirectories?: number;
		repositoryCount: number;
		currentPath?: string;
	}
	| {
		phase: 'analyzing';
		completedRepositories: number;
		totalRepositories: number;
		currentRepository?: string;
	};

export type PeriodSummary = {
	label: string;
	commitCount: number;
	changedLines: number;
};

export type FailedRepository = {
	path: string;
	error: string;
};

export type MyGitData = {
	rootPath: string;
	rootPaths: string[];
	user: GitUserIdentity;
	year: number;
	repositoryCount: number;
	successfulRepositoryCount: number;
	failedRepositories: FailedRepository[];
	heatmap: HeatmapPeriodCount[];
	last12MonthsHeatmap: HeatmapPeriodCount[];
	summaries: {
		today: PeriodSummary;
		last7Days: PeriodSummary;
		last30Days: PeriodSummary;
	};
};

export type MyGitDataResult =
	| {ok: true; data: MyGitData}
	| {ok: false; error: string};

type CollectionWindow = {
	year: number;
	today: string;
	yearStart: string;
	yearEnd: string;
	logStart: string;
	last7Start: string;
	last30Start: string;
	last12MonthsStart: string;
};

export async function collectMyGitData(
	rootPaths: string | string[],
	onProgress?: (progress: ProgressSnapshot) => void,
	now = new Date()
): Promise<MyGitDataResult> {
	const resolvedRootPaths = normalizeRootPaths(rootPaths);
	const window = createCollectionWindow(now);

	try {
		const user = await getGlobalGitUser(process.cwd());
		const repositories = await discoverGitRepositories(resolvedRootPaths, onProgress);
		const failedRepositories: FailedRepository[] = [];
		const commits: CommitRecord[] = [];

		for (const [index, repositoryPath] of repositories.entries()) {
			onProgress?.({
				phase: 'analyzing',
				completedRepositories: index,
				totalRepositories: repositories.length,
				currentRepository: repositoryPath
			});

			try {
				const repositoryCommits = await getRepositoryCommits(repositoryPath, window.logStart, window.today);
				commits.push(...repositoryCommits.filter(commit => isCurrentUserCommit(commit, user)));
			} catch (error) {
				failedRepositories.push({
					path: repositoryPath,
					error: error instanceof Error ? error.message : String(error)
				});
			}

			onProgress?.({
				phase: 'analyzing',
				completedRepositories: index + 1,
				totalRepositories: repositories.length,
				currentRepository: repositoryPath
			});
		}

		return {
			ok: true,
			data: {
				rootPath: resolvedRootPaths[0] ?? process.cwd(),
				rootPaths: resolvedRootPaths,
				user,
				year: window.year,
				repositoryCount: repositories.length,
				successfulRepositoryCount: repositories.length - failedRepositories.length,
				failedRepositories,
				heatmap: collectDailyHeatmap(commits, window.yearStart, window.yearEnd),
				last12MonthsHeatmap: collectDailyHeatmap(commits, window.last12MonthsStart, window.today),
				summaries: {
					today: summarizePeriod('今天', commits, window.today, window.today),
					last7Days: summarizePeriod('过去 7 天', commits, window.last7Start, window.today),
					last30Days: summarizePeriod('过去 30 天', commits, window.last30Start, window.today)
				}
			}
		};
	} catch (error) {
		if (error instanceof GitGlobalUserError) {
			return {ok: false, error: error.message};
		}

		throw error;
	}
}

function normalizeRootPaths(rootPaths: string | string[]): string[] {
	const paths = Array.isArray(rootPaths) ? rootPaths : [rootPaths];
	const resolvedPaths = paths.length > 0 ? paths : [process.cwd()];
	return [...new Set(resolvedPaths.map(rootPath => path.resolve(rootPath)))];
}

function createCollectionWindow(now: Date): CollectionWindow {
	const todayDate = startOfLocalDay(now);
	const year = todayDate.getFullYear();
	const today = formatDate(todayDate);
	const yearStart = `${year}-01-01`;
	const yearEnd = `${year}-12-31`;
	const last7Start = formatDate(addDays(todayDate, -6));
	const last30Start = formatDate(addDays(todayDate, -29));
	const last12MonthsStart = formatDate(addDays(addMonths(todayDate, -12), 1));
	const logStart = [yearStart, last30Start, last12MonthsStart].sort()[0] ?? yearStart;

	return {
		year,
		today,
		yearStart,
		yearEnd,
		logStart,
		last7Start,
		last30Start,
		last12MonthsStart
	};
}

function isCurrentUserCommit(commit: CommitRecord, user: GitUserIdentity): boolean {
	return Boolean(
		user.name && commit.authorName === user.name
		|| user.email && commit.authorEmail.toLowerCase() === user.email.toLowerCase()
	);
}

function collectDailyHeatmap(commits: CommitRecord[], startDate: string, endDate: string): HeatmapPeriodCount[] {
	const periods = new Map(
		getDateRangeBetween(startDate, endDate).map(period => [period, {period, count: 0}])
	);

	for (const commit of commits) {
		const period = periods.get(commit.date);
		if (period) {
			period.count += 1;
		}
	}

	return [...periods.values()];
}

function summarizePeriod(
	label: string,
	commits: CommitRecord[],
	startDate: string,
	endDate: string
): PeriodSummary {
	return commits.reduce<PeriodSummary>((summary, commit) => {
		if (commit.date < startDate || commit.date > endDate) {
			return summary;
		}

		return {
			label,
			commitCount: summary.commitCount + 1,
			changedLines: summary.changedLines + commit.additions + commit.deletions
		};
	}, {
		label,
		commitCount: 0,
		changedLines: 0
	});
}

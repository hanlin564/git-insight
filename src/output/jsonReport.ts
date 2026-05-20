import type {RepositoryStats, RepositoryStatsResult} from '../analysis/collectRepositoryStats.js';
import type {CliOptions} from '../cli/parseArgs.js';
import type {AuthorStat, BranchGroups, BranchSummary, GitUserIdentity} from '../git/types.js';

type JsonReport =
	| JsonSuccessReport
	| JsonErrorReport;

type JsonSuccessReport = {
	ok: true;
	generatedAt: string;
	repository: {
		name: string;
		path: string;
	};
	branches: {
		current: string;
		analysis: string;
	};
	range: {
		kind: string;
		label: string;
		startDate: string;
		endDate: string;
		dayCount: number;
	};
	filters: {
		author: string | null;
		me: boolean;
		currentGitUser: GitUserIdentity | null;
	};
	totals: {
		commitCount: number;
		authorCount: number;
		additions: number;
		deletions: number;
		changedLines: number;
	};
	authors: {
		all: JsonAuthorStat[];
		topByCommits: JsonAuthorStat[];
		topByChangedLines: JsonAuthorStat[];
	};
	fileHotspots: RepositoryStats['fileHotspots'];
	heatmap: RepositoryStats['heatmap'] | null;
	branchGroups: JsonBranchGroups | null;
};

type JsonErrorReport = {
	ok: false;
	error: string;
	repositoryPath: string;
};

type JsonAuthorStat = Omit<AuthorStat, 'authorEmail' | 'isCurrentUser'> & {
	authorEmail: string | null;
	isCurrentUser: boolean;
};

type JsonBranchGroups = Omit<BranchGroups, 'defaultBranch' | 'active' | 'stale' | 'defaultBranchName'> & {
	defaultBranch: JsonBranchSummary | null;
	active: JsonBranchSummary[];
	stale: JsonBranchSummary[];
	defaultBranchName: string | null;
};

type JsonBranchSummary = Omit<BranchSummary, 'latestCommitDate' | 'isCurrentBranch'> & {
	latestCommitDate: string | null;
	isCurrentBranch: boolean;
};

export function formatJsonReport(
	result: RepositoryStatsResult,
	options: CliOptions,
	generatedAt = new Date()
): string {
	return `${JSON.stringify(createJsonReport(result, options, generatedAt), null, 2)}\n`;
}

function createJsonReport(
	result: RepositoryStatsResult,
	options: CliOptions,
	generatedAt: Date
): JsonReport {
	if (!result.ok) {
		return {
			ok: false,
			error: result.error,
			repositoryPath: result.repositoryPath
		};
	}

	const {stats} = result;

	return {
		ok: true,
		generatedAt: generatedAt.toISOString(),
		repository: {
			name: stats.repository.name,
			path: stats.repository.path
		},
		branches: {
			current: stats.currentBranchName,
			analysis: stats.analysisBranchName
		},
		range: {
			kind: stats.range.kind,
			label: stats.range.label,
			startDate: stats.range.startDate,
			endDate: stats.range.endDate,
			dayCount: stats.range.dayCount
		},
		filters: {
			author: options.author ?? null,
			me: options.me,
			currentGitUser: options.me ? stats.currentGitUser ?? null : null
		},
		totals: summarizeAuthors(stats.authorStats),
		authors: {
			all: stats.authorStats.map(toJsonAuthorStat),
			topByCommits: stats.topByCommits.map(toJsonAuthorStat),
			topByChangedLines: stats.topByChangedLines.map(toJsonAuthorStat)
		},
		fileHotspots: stats.fileHotspots,
		heatmap: stats.heatmap ?? null,
		branchGroups: stats.branchGroups ? toJsonBranchGroups(stats.branchGroups) : null
	};
}

function summarizeAuthors(authorStats: AuthorStat[]): JsonSuccessReport['totals'] {
	return authorStats.reduce<JsonSuccessReport['totals']>((totals, author) => ({
		commitCount: totals.commitCount + author.commitCount,
		authorCount: totals.authorCount,
		additions: totals.additions + author.additions,
		deletions: totals.deletions + author.deletions,
		changedLines: totals.changedLines + author.changedLines
	}), {
		commitCount: 0,
		authorCount: authorStats.length,
		additions: 0,
		deletions: 0,
		changedLines: 0
	});
}

function toJsonAuthorStat(author: AuthorStat): JsonAuthorStat {
	return {
		authorName: author.authorName,
		authorEmail: author.authorEmail ?? null,
		commitCount: author.commitCount,
		additions: author.additions,
		deletions: author.deletions,
		changedLines: author.changedLines,
		changedLinesPerDay: author.changedLinesPerDay,
		isCurrentUser: author.isCurrentUser === true
	};
}

function toJsonBranchGroups(groups: BranchGroups): JsonBranchGroups {
	return {
		defaultBranch: groups.defaultBranch ? toJsonBranchSummary(groups.defaultBranch) : null,
		active: groups.active.map(toJsonBranchSummary),
		stale: groups.stale.map(toJsonBranchSummary),
		defaultBranchName: groups.defaultBranchName ?? null,
		staleThresholdDate: groups.staleThresholdDate
	};
}

function toJsonBranchSummary(branch: BranchSummary): JsonBranchSummary {
	return {
		branchName: branch.branchName,
		latestCommitDate: branch.latestCommitDate ?? null,
		isCurrentBranch: branch.isCurrentBranch === true
	};
}

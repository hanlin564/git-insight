export type RepositoryTarget = {
	path: string;
	name: string;
};

export type GitUserIdentity = {
	name?: string;
	email?: string;
};

export type LocalBranchRef = {
	name: string;
	ref: string;
	latestCommitDate?: string;
};

export type CommitRecord = {
	hash: string;
	authorName: string;
	authorEmail: string;
	date: string;
	additions: number;
	deletions: number;
};

export type AuthorStat = {
	authorName: string;
	authorEmail?: string;
	commitCount: number;
	additions: number;
	deletions: number;
	changedLines: number;
	changedLinesPerDay: number;
	isCurrentUser?: boolean;
};

export type BranchSummary = {
	branchName: string;
	latestCommitDate?: string;
	isCurrentBranch?: boolean;
};

export type BranchGroups = {
	active: BranchSummary[];
	stale: BranchSummary[];
	defaultBranchName?: string;
	staleThresholdDate: string;
};

export type HeatmapGranularity = 'daily' | 'monthly';

export type HeatmapPeriodCount = {
	period: string;
	count: number;
};

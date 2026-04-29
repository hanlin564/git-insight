export type RepositoryTarget = {
	path: string;
	name: string;
};

export type GitUserIdentity = {
	name?: string;
	email?: string;
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

export type HeatmapGranularity = 'daily' | 'monthly';

export type HeatmapPeriodCount = {
	period: string;
	count: number;
};

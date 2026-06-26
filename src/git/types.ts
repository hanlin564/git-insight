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
	files: CommitFileChange[];
};

export type CommitFileChange = {
	path: string;
	additions: number;
	deletions: number;
	changedLines: number;
};

export type HeatmapPeriodCount = {
	period: string;
	count: number;
};

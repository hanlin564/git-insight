export type RepositoryTarget = {
	path: string;
	name: string;
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
};

export type DailyCommitCount = {
	date: string;
	count: number;
};

export type BranchStat = {
	branchName: string;
	commitCount: number;
};

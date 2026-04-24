import type {AuthorStat, CommitRecord} from '../git/types.js';
import {matchesText} from '../utils/text.js';

const getAuthorKey = (commit: CommitRecord): string => `${commit.authorName}<${commit.authorEmail}>`;

export function collectAuthorStats(commits: CommitRecord[], authorQuery?: string): AuthorStat[] {
	const stats = new Map<string, AuthorStat>();

	for (const commit of commits) {
		if (!matchesText(commit.authorName, authorQuery) && !matchesText(commit.authorEmail, authorQuery)) {
			continue;
		}

		const key = getAuthorKey(commit);
		const current = stats.get(key) ?? {
			authorName: commit.authorName,
			authorEmail: commit.authorEmail,
			commitCount: 0,
			additions: 0,
			deletions: 0,
			changedLines: 0
		};

		current.commitCount += 1;
		current.additions += commit.additions;
		current.deletions += commit.deletions;
		current.changedLines = current.additions + current.deletions;
		stats.set(key, current);
	}

	return [...stats.values()].sort((a, b) => b.commitCount - a.commitCount);
}

export function topAuthorsByCommits(stats: AuthorStat[], top: number): AuthorStat[] {
	return [...stats].sort((a, b) => b.commitCount - a.commitCount).slice(0, top);
}

export function topAuthorsByChangedLines(stats: AuthorStat[], top: number): AuthorStat[] {
	return [...stats].sort((a, b) => b.changedLines - a.changedLines).slice(0, top);
}

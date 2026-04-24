import type {AuthorStat, CommitRecord} from '../git/types.js';
import type {AuthorIdentityQuery, AuthorIdentityResolver} from './authorIdentity.js';

export function collectAuthorStats(
	commits: CommitRecord[],
	authorResolver: AuthorIdentityResolver,
	authorQuery?: string,
	currentUser?: AuthorIdentityQuery
): AuthorStat[] {
	const stats = new Map<string, AuthorStat>();

	for (const commit of commits) {
		if (currentUser && !authorResolver.matchesIdentity(commit, currentUser)) {
			continue;
		}

		if (!authorResolver.matches(commit, authorQuery)) {
			continue;
		}

		const author = authorResolver.resolve(commit);
		const key = author.key;
		const current = stats.get(key) ?? {
			authorName: author.authorName,
			authorEmail: author.authorEmail,
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

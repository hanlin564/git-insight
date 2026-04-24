import type {CommitRecord, DailyCommitCount} from '../git/types.js';
import {getDateRange} from '../utils/date.js';
import type {AuthorIdentityQuery, AuthorIdentityResolver} from './authorIdentity.js';

export type AuthorHeatmapStat = {
	authorName: string;
	authorEmail: string;
	days: DailyCommitCount[];
};

export function collectAuthorHeatmaps(
	commits: CommitRecord[],
	sinceDays: number,
	authorResolver: AuthorIdentityResolver,
	authorQuery?: string,
	currentUser?: AuthorIdentityQuery
): AuthorHeatmapStat[] {
	const dates = getDateRange(sinceDays);
	const byAuthor = new Map<string, AuthorHeatmapStat>();

	for (const commit of commits) {
		if (!authorResolver.matchesIdentity(commit, currentUser)) {
			continue;
		}

		if (!authorResolver.matches(commit, authorQuery)) {
			continue;
		}

		const author = authorResolver.resolve(commit);
		const key = author.key;
		const stat = byAuthor.get(key) ?? createEmptyHeatmap(author.authorName, author.authorEmail, dates);
		const day = stat.days.find(item => item.date === commit.date);

		if (day) {
			day.count += 1;
		}

		byAuthor.set(key, stat);
	}

	return [...byAuthor.values()].sort((a, b) => getTotal(b.days) - getTotal(a.days));
}

function createEmptyHeatmap(authorName: string, authorEmail: string, dates: string[]): AuthorHeatmapStat {
	return {
		authorName,
		authorEmail,
		days: dates.map(date => ({date, count: 0}))
	};
}

function getTotal(days: DailyCommitCount[]): number {
	return days.reduce((sum, day) => sum + day.count, 0);
}

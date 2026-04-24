import type {CommitRecord, DailyCommitCount} from '../git/types.js';
import {getDateRange} from '../utils/date.js';
import {matchesText} from '../utils/text.js';

export type AuthorHeatmapStat = {
	authorName: string;
	authorEmail: string;
	days: DailyCommitCount[];
};

const getAuthorKey = (commit: CommitRecord): string => `${commit.authorName}<${commit.authorEmail}>`;

export function collectAuthorHeatmaps(
	commits: CommitRecord[],
	sinceDays: number,
	authorQuery?: string
): AuthorHeatmapStat[] {
	const dates = getDateRange(sinceDays);
	const byAuthor = new Map<string, AuthorHeatmapStat>();

	for (const commit of commits) {
		if (!matchesText(commit.authorName, authorQuery) && !matchesText(commit.authorEmail, authorQuery)) {
			continue;
		}

		const key = getAuthorKey(commit);
		const stat = byAuthor.get(key) ?? createEmptyHeatmap(commit.authorName, commit.authorEmail, dates);
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

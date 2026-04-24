import type {CommitRecord, HeatmapGranularity, HeatmapPeriodCount} from '../git/types.js';
import {getDateRange, getMonthRange} from '../utils/date.js';
import type {AuthorIdentityQuery, AuthorIdentityResolver} from './authorIdentity.js';

const DAILY_HEATMAP_MAX_DAYS = 365;

export type AuthorHeatmapStat = {
	authorName: string;
	authorEmail: string;
	granularity: HeatmapGranularity;
	periods: HeatmapPeriodCount[];
};

export function collectAuthorHeatmaps(
	commits: CommitRecord[],
	sinceDays: number,
	authorResolver: AuthorIdentityResolver,
	authorQuery?: string,
	currentUser?: AuthorIdentityQuery
): AuthorHeatmapStat[] {
	const granularity: HeatmapGranularity = sinceDays <= DAILY_HEATMAP_MAX_DAYS ? 'daily' : 'monthly';
	const periods = granularity === 'daily' ? getDateRange(sinceDays) : getMonthRange(sinceDays);
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
		const stat = byAuthor.get(key) ?? createEmptyHeatmap(author.authorName, author.authorEmail, granularity, periods);
		const periodKey = granularity === 'daily' ? commit.date : commit.date.slice(0, 7);
		const period = stat.periods.find(item => item.period === periodKey);

		if (period) {
			period.count += 1;
		}

		byAuthor.set(key, stat);
	}

	return [...byAuthor.values()].sort((a, b) => getTotal(b.periods) - getTotal(a.periods));
}

function createEmptyHeatmap(
	authorName: string,
	authorEmail: string,
	granularity: HeatmapGranularity,
	periods: string[]
): AuthorHeatmapStat {
	return {
		authorName,
		authorEmail,
		granularity,
		periods: periods.map(period => ({period, count: 0}))
	};
}

function getTotal(periods: HeatmapPeriodCount[]): number {
	return periods.reduce((sum, period) => sum + period.count, 0);
}

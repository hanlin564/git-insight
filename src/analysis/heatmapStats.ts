import type {CommitRecord, HeatmapGranularity, HeatmapPeriodCount} from '../git/types.js';
import {getDateRange, getMonthRange} from '../utils/date.js';
import type {AuthorIdentityQuery, AuthorIdentityResolver} from './authorIdentity.js';

const DAILY_HEATMAP_MAX_DAYS = 365;

export type ContributionHeatmapStat = {
	granularity: HeatmapGranularity;
	periods: HeatmapPeriodCount[];
};

export function collectContributionHeatmap(
	commits: CommitRecord[],
	sinceDays: number,
	authorResolver: AuthorIdentityResolver,
	authorQuery?: string,
	currentUser?: AuthorIdentityQuery
): ContributionHeatmapStat | undefined {
	const granularity: HeatmapGranularity = sinceDays <= DAILY_HEATMAP_MAX_DAYS ? 'daily' : 'monthly';
	const periods = granularity === 'daily' ? getDateRange(sinceDays) : getMonthRange(sinceDays);
	const stat = createEmptyHeatmap(granularity, periods);
	let hasCommit = false;

	for (const commit of commits) {
		if (currentUser && !authorResolver.matchesIdentity(commit, currentUser)) {
			continue;
		}

		if (!authorResolver.matches(commit, authorQuery)) {
			continue;
		}

		const periodKey = granularity === 'daily' ? commit.date : commit.date.slice(0, 7);
		const period = stat.periods.find(item => item.period === periodKey);

		if (period) {
			period.count += 1;
			hasCommit = true;
		}
	}

	return hasCommit ? stat : undefined;
}

function createEmptyHeatmap(
	granularity: HeatmapGranularity,
	periods: string[]
): ContributionHeatmapStat {
	return {
		granularity,
		periods: periods.map(period => ({period, count: 0}))
	};
}

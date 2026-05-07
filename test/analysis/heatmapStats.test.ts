import {strict as assert} from 'node:assert';
import test from 'node:test';
import {createAuthorIdentityResolver} from '../../src/analysis/authorIdentity.js';
import {collectContributionHeatmap} from '../../src/analysis/heatmapStats.js';
import type {CommitRecord} from '../../src/git/types.js';
import type {DateRange} from '../../src/utils/date.js';

test('collectContributionHeatmap 在一年内使用 daily 粒度并按天累加', () => {
	const commits = [
		commit('1', 'Alice', 'alice@example.com', '2025-04-01'),
		commit('2', 'Bob', 'bob@example.com', '2025-04-01'),
		commit('3', 'Alice', 'alice@example.com', '2025-04-03')
	];
	const resolver = createAuthorIdentityResolver(commits, {groups: []});
	const heatmap = collectContributionHeatmap(commits, range('2025-04-01', '2025-04-03', 3), resolver);

	assert.equal(heatmap?.granularity, 'daily');
	assert.deepEqual(heatmap?.periods, [
		{period: '2025-04-01', count: 2},
		{period: '2025-04-02', count: 0},
		{period: '2025-04-03', count: 1}
	]);
});

test('collectContributionHeatmap 超过一年使用 monthly 粒度并支持作者过滤', () => {
	const commits = [
		commit('1', 'Alice', 'alice@example.com', '2024-01-05'),
		commit('2', 'Alice', 'alice@example.com', '2024-01-20'),
		commit('3', 'Bob', 'bob@example.com', '2025-04-01')
	];
	const resolver = createAuthorIdentityResolver(commits, {groups: []});
	const heatmap = collectContributionHeatmap(
		commits,
		range('2024-01-01', '2025-04-30', 486),
		resolver,
		'alice'
	);

	assert.equal(heatmap?.granularity, 'monthly');
	assert.equal(heatmap?.periods.find(period => period.period === '2024-01')?.count, 2);
	assert.equal(heatmap?.periods.find(period => period.period === '2025-04')?.count, 0);
});

test('collectContributionHeatmap 无匹配提交时返回 undefined', () => {
	const commits = [
		commit('1', 'Alice', 'alice@example.com', '2025-04-01')
	];
	const resolver = createAuthorIdentityResolver(commits, {groups: []});

	assert.equal(
		collectContributionHeatmap(commits, range('2025-04-01', '2025-04-03', 3), resolver, 'missing'),
		undefined
	);
});

function commit(hash: string, authorName: string, authorEmail: string, date: string): CommitRecord {
	return {
		hash,
		authorName,
		authorEmail,
		date,
		additions: 1,
		deletions: 0,
		files: [
			{path: `${hash}.txt`, additions: 1, deletions: 0, changedLines: 1}
		]
	};
}

function range(startDate: string, endDate: string, dayCount: number): DateRange {
	return {
		kind: 'custom',
		startDate,
		endDate,
		label: `${startDate}..${endDate}`,
		dayCount
	};
}

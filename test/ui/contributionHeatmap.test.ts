import test from 'node:test';
import assert from 'node:assert/strict';
import {WEEKDAY_ROW_INDEXES, buildMonthLabels, buildDailyHeatmapLayout, buildWeeks} from '../../src/ui/components/ContributionHeatmap.js';
import type {HeatmapPeriodCount} from '../../src/git/types.js';

test('年度热力图渲染 7 行无左侧星期标签数据', () => {
	assert.deepEqual(WEEKDAY_ROW_INDEXES, [0, 1, 2, 3, 4, 5, 6]);
});

test('buildWeeks 保留一周内 7 天数据', () => {
	const periods: HeatmapPeriodCount[] = [
		{period: '2026-01-05', count: 1},
		{period: '2026-01-06', count: 2},
		{period: '2026-01-07', count: 3},
		{period: '2026-01-08', count: 4},
		{period: '2026-01-09', count: 5},
		{period: '2026-01-10', count: 6},
		{period: '2026-01-11', count: 7}
	];

	const weeks = buildWeeks(periods);

	assert.equal(weeks.length, 1);
	assert.deepEqual(weeks[0]?.map(period => period?.period), periods.map(period => period.period));
});

test('月份标签使用紧凑数字并且不保留左侧星期标签缩进', () => {
	const periods: HeatmapPeriodCount[] = [
		{period: '2026-01-05', count: 0}
	];
	const labels = buildMonthLabels(buildDailyHeatmapLayout(buildWeeks(periods)));

	assert.match(labels, /^1/);
	assert.doesNotMatch(labels, /月/);
});

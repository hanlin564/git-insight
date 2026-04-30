import {strict as assert} from 'node:assert';
import test from 'node:test';
import {
	buildDailyHeatmapLayout,
	buildMonthLabels,
	buildWeeks,
	getDailyHeatmapLayoutWidth
} from '../../src/ui/components/ContributionHeatmap.js';
import {getDateRangeBetween} from '../../src/utils/date.js';
import type {HeatmapPeriodCount} from '../../src/git/types.js';

test('daily 热力图同月内周列不增加额外间距', () => {
	const weeks = buildWeeks(periodsBetween('2025-01-06', '2025-01-26'));
	const layout = buildDailyHeatmapLayout(weeks);
	const labels = buildMonthLabels(layout);

	assert.equal(getDailyHeatmapLayoutWidth(layout), weeks.length * 2);
	assert.equal(labels.length, getDailyHeatmapLayoutWidth(layout));
	assert.equal(labels.indexOf('1月'), 0);
});

test('daily 热力图不同月份边界增加额外间距', () => {
	const weeks = buildWeeks(periodsBetween('2025-01-01', '2025-04-30'));
	const layout = buildDailyHeatmapLayout(weeks);
	const labels = buildMonthLabels(layout);

	assert.equal(getDailyHeatmapLayoutWidth(layout), weeks.length * 2 + 3);
	assert.equal(labels.length, getDailyHeatmapLayoutWidth(layout));
	assert.equal(labels.indexOf('1月'), 0);
	assert.notEqual(labels.indexOf('2月'), -1);
	assert.notEqual(labels.indexOf('3月'), -1);
	assert.notEqual(labels.indexOf('4月'), -1);
});

test('daily 热力图跨月周使用新月份标记', () => {
	const weeks = buildWeeks(periodsBetween('2025-02-24', '2025-03-09'));
	const layout = buildDailyHeatmapLayout(weeks);
	const labels = buildMonthLabels(layout);

	assert.equal(labels.length, getDailyHeatmapLayoutWidth(layout));
	assert.equal(labels.indexOf('3月'), 0);
});

function periodsBetween(startDate: string, endDate: string): HeatmapPeriodCount[] {
	return getDateRangeBetween(startDate, endDate).map(period => ({period, count: 0}));
}

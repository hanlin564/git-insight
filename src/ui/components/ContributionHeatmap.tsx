import React from 'react';
import {Box, Text} from 'ink';
import type {HeatmapPeriodCount} from '../../git/types.js';
import {getMondayFirstWeekday} from '../../utils/date.js';

type ContributionHeatmapProps = {
	heatmap: HeatmapPeriodCount[];
	title?: string;
};

type WeekColumn = Array<HeatmapPeriodCount | undefined>;

type DailyHeatmapColumn = {
	week: WeekColumn;
	prefix: string;
	monthLabel?: string;
};

const COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const DAILY_WEEK_COLUMN_WIDTH = 2;

export const WEEKDAY_ROW_INDEXES = [0, 1, 2, 3, 4, 5, 6];

export function ContributionHeatmap({heatmap, title = '本年度个人提交热力图'}: ContributionHeatmapProps) {
	const weeks = buildWeeks(heatmap);
	const layout = buildDailyHeatmapLayout(weeks);
	const monthLabels = buildMonthLabels(layout);

	return (
		<Box flexDirection="column" marginTop={1} marginBottom={1}>
			<Text color="cyan" bold>{title}</Text>
			<Legend />
			<Text color="gray">{monthLabels}</Text>
			{WEEKDAY_ROW_INDEXES.map(rowIndex => (
				<Text key={rowIndex}>
					{layout.map((column, weekIndex) => (
						<React.Fragment key={`${rowIndex}-${weekIndex}`}>
							{column.prefix && <Text>{column.prefix}</Text>}
							<Text color={getDailyColor(column.week[rowIndex]?.count ?? 0)}>■ </Text>
						</React.Fragment>
					))}
				</Text>
			))}
		</Box>
	);
}

function Legend() {
	return (
		<Text>
			<Text color="gray">少 </Text>
			{COLORS.map(color => <Text key={color} color={color}>■ </Text>)}
			<Text color="gray">多</Text>
		</Text>
	);
}

export function buildWeeks(periods: HeatmapPeriodCount[]): WeekColumn[] {
	if (periods.length === 0) {
		return [];
	}

	const weeks: WeekColumn[] = [];
	let current: WeekColumn = Array.from({length: 7});

	for (const period of periods) {
		const weekday = getMondayFirstWeekday(period.period);
		const isNewWeek = weekday === 0 && current.some(Boolean);

		if (isNewWeek) {
			weeks.push(current);
			current = Array.from({length: 7});
		}

		current[weekday] = period;
	}

	if (current.some(Boolean)) {
		weeks.push(current);
	}

	return weeks;
}

export function buildDailyHeatmapLayout(weeks: WeekColumn[]): DailyHeatmapColumn[] {
	let previousMonth = '';

	return weeks.map(week => {
		const firstNewMonthPeriod = findMonthLabelPeriod(week, previousMonth);
		const column: DailyHeatmapColumn = {
			week,
			prefix: firstNewMonthPeriod && previousMonth !== '' ? ' ' : ''
		};

		if (!firstNewMonthPeriod) {
			return column;
		}

		previousMonth = getMonthKey(firstNewMonthPeriod.period);
		column.monthLabel = getMonthLabel(firstNewMonthPeriod.period);
		return column;
	});
}

export function buildMonthLabels(layout: DailyHeatmapColumn[]): string {
	let cursor = 0;
	const labels = Array.from({length: getDailyHeatmapLayoutWidth(layout)}, () => ' ');

	for (const column of layout) {
		cursor += column.prefix.length;

		if (column.monthLabel) {
			for (let index = 0; index < column.monthLabel.length && cursor + index < labels.length; index += 1) {
				labels[cursor + index] = column.monthLabel[index] ?? ' ';
			}
		}

		cursor += DAILY_WEEK_COLUMN_WIDTH;
	}

	return labels.join('');
}

function getDailyHeatmapLayoutWidth(layout: DailyHeatmapColumn[]): number {
	return layout.reduce(
		(width, column) => width + column.prefix.length + DAILY_WEEK_COLUMN_WIDTH,
		0
	);
}

function findMonthLabelPeriod(week: WeekColumn, previousMonth: string): HeatmapPeriodCount | undefined {
	const periods = week.filter(period => period !== undefined);
	if (periods.length === 0) {
		return undefined;
	}

	const newMonthPeriods = periods.filter(period => getMonthKey(period.period) !== previousMonth);
	if (newMonthPeriods.length === 0) {
		return undefined;
	}

	if (previousMonth === '' && hasMultipleMonths(newMonthPeriods)) {
		return newMonthPeriods.at(-1);
	}

	return newMonthPeriods[0];
}

function hasMultipleMonths(periods: HeatmapPeriodCount[]): boolean {
	const months = new Set(periods.map(period => getMonthKey(period.period)));
	return months.size > 1;
}

function getMonthKey(dateText: string): string {
	return dateText.slice(0, 7);
}

function getMonthLabel(dateText: string): string {
	const monthIndex = Number.parseInt(dateText.slice(5, 7), 10) - 1;
	return MONTHS[monthIndex] ?? dateText.slice(5, 7);
}

function getDailyColor(count: number): string {
	if (count === 0) {
		return COLORS[0];
	}

	if (count === 1) {
		return COLORS[1];
	}

	if (count <= 3) {
		return COLORS[2];
	}

	if (count <= 6) {
		return COLORS[3];
	}

	return COLORS[4];
}

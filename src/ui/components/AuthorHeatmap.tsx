import React from 'react';
import {Box, Text} from 'ink';
import type {HeatmapPeriodCount} from '../../git/types.js';
import type {AuthorHeatmapStat} from '../../analysis/heatmapStats.js';
import {getMondayFirstWeekday, getMonthLabel} from '../../utils/date.js';

type AuthorHeatmapProps = {
	heatmap: AuthorHeatmapStat;
};

type WeekColumn = Array<HeatmapPeriodCount | undefined>;

type YearRow = {
	year: string;
	months: Array<HeatmapPeriodCount | undefined>;
};

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];

export function AuthorHeatmap({heatmap}: AuthorHeatmapProps) {
	if (heatmap.granularity === 'monthly') {
		return <MonthlyHeatmap heatmap={heatmap} />;
	}

	return <DailyHeatmap heatmap={heatmap} />;
}

function DailyHeatmap({heatmap}: AuthorHeatmapProps) {
	const weeks = buildWeeks(heatmap.periods);
	const monthLabels = buildMonthLabels(weeks);

	return (
		<Box flexDirection="column" marginTop={1} marginBottom={1}>
			<Text>
				{heatmap.authorName} <Text color="gray">&lt;{heatmap.authorEmail}&gt;</Text>
			</Text>
			<Legend />
			<Text color="gray">      {monthLabels}</Text>
			{WEEKDAY_LABELS.map((label, rowIndex) => (
				<Text key={label}>
					<Text color="gray">{label}   </Text>
					{weeks.map((week, weekIndex) => (
						<Text key={`${label}-${weekIndex}`} color={getDailyColor(week[rowIndex]?.count ?? 0)}>■ </Text>
					))}
				</Text>
			))}
		</Box>
	);
}

function MonthlyHeatmap({heatmap}: AuthorHeatmapProps) {
	const rows = buildYearRows(heatmap.periods);

	return (
		<Box flexDirection="column" marginTop={1} marginBottom={1}>
			<Text>
				{heatmap.authorName} <Text color="gray">&lt;{heatmap.authorEmail}&gt;</Text>
			</Text>
			<Legend />
			<Text color="gray">Monthly view</Text>
			<Text color="gray">      {MONTH_LABELS.map(label => label.padEnd(4, ' ')).join('')}</Text>
			{rows.map(row => (
				<Text key={row.year}>
					<Text color="gray">{row.year}  </Text>
					{row.months.map((month, monthIndex) => (
						<Text key={`${row.year}-${monthIndex}`} color={getMonthlyColor(month?.count ?? 0)}>
							{month ? '■   ' : '    '}
						</Text>
					))}
				</Text>
			))}
		</Box>
	);
}

function Legend() {
	return (
		<Text>
			<Text color="gray">Less </Text>
			{COLORS.map(color => <Text key={color} color={color}>■ </Text>)}
			<Text color="gray">More</Text>
		</Text>
	);
}

function buildWeeks(periods: HeatmapPeriodCount[]): WeekColumn[] {
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

function buildMonthLabels(weeks: WeekColumn[]): string {
	let previousMonth = '';

	return weeks.map(week => {
		const firstPeriod = week.find(Boolean);
		if (!firstPeriod) {
			return '  ';
		}

		const label = getMonthLabel(firstPeriod.period);
		if (label === previousMonth) {
			return '  ';
		}

		previousMonth = label;
		return label.padEnd(4, ' ');
	}).join('');
}

function buildYearRows(periods: HeatmapPeriodCount[]): YearRow[] {
	const rows = new Map<string, YearRow>();

	for (const period of periods) {
		const [year, month] = period.period.split('-');
		const monthIndex = Number.parseInt(month ?? '', 10) - 1;

		if (!year || monthIndex < 0 || monthIndex > 11) {
			continue;
		}

		const row = rows.get(year) ?? {year, months: Array.from({length: 12})};
		row.months[monthIndex] = period;
		rows.set(year, row);
	}

	return [...rows.values()];
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

function getMonthlyColor(count: number): string {
	if (count === 0) {
		return COLORS[0];
	}

	if (count <= 2) {
		return COLORS[1];
	}

	if (count <= 5) {
		return COLORS[2];
	}

	if (count <= 10) {
		return COLORS[3];
	}

	return COLORS[4];
}

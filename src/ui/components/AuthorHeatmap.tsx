import React from 'react';
import {Box, Text} from 'ink';
import type {DailyCommitCount} from '../../git/types.js';
import type {AuthorHeatmapStat} from '../../analysis/heatmapStats.js';
import {getMondayFirstWeekday, getMonthLabel} from '../../utils/date.js';

type AuthorHeatmapProps = {
	heatmap: AuthorHeatmapStat;
};

type WeekColumn = Array<DailyCommitCount | undefined>;

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];

export function AuthorHeatmap({heatmap}: AuthorHeatmapProps) {
	const weeks = buildWeeks(heatmap.days);
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
						<Text key={`${label}-${weekIndex}`} color={getColor(week[rowIndex]?.count ?? 0)}>■ </Text>
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

function buildWeeks(days: DailyCommitCount[]): WeekColumn[] {
	if (days.length === 0) {
		return [];
	}

	const weeks: WeekColumn[] = [];
	let current: WeekColumn = Array.from({length: 7});

	for (const day of days) {
		const weekday = getMondayFirstWeekday(day.date);
		const isNewWeek = weekday === 0 && current.some(Boolean);

		if (isNewWeek) {
			weeks.push(current);
			current = Array.from({length: 7});
		}

		current[weekday] = day;
	}

	if (current.some(Boolean)) {
		weeks.push(current);
	}

	return weeks;
}

function buildMonthLabels(weeks: WeekColumn[]): string {
	let previousMonth = '';

	return weeks.map(week => {
		const firstDay = week.find(Boolean);
		if (!firstDay) {
			return '  ';
		}

		const label = getMonthLabel(firstDay.date);
		if (label === previousMonth) {
			return '  ';
		}

		previousMonth = label;
		return label.padEnd(4, ' ');
	}).join('');
}

function getColor(count: number): string {
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

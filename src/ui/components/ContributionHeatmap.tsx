import React from 'react';
import {Box, Text} from 'ink';
import type {HeatmapPeriodCount} from '../../git/types.js';
import type {ContributionHeatmapStat} from '../../analysis/heatmapStats.js';
import {DEFAULT_LANGUAGE, getMessages, type SupportedLanguage} from '../../i18n.js';
import {getMondayFirstWeekday} from '../../utils/date.js';

type ContributionHeatmapProps = {
	heatmap: ContributionHeatmapStat;
	language: SupportedLanguage;
};

export type WeekColumn = Array<HeatmapPeriodCount | undefined>;

type DailyHeatmapColumn = {
	week: WeekColumn;
	prefix: string;
	monthLabel?: string;
};

type YearRow = {
	year: string;
	months: Array<HeatmapPeriodCount | undefined>;
};

const COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
const DAILY_WEEK_COLUMN_WIDTH = 2;

export function ContributionHeatmap({heatmap, language}: ContributionHeatmapProps) {
	if (heatmap.granularity === 'monthly') {
		return <MonthlyHeatmap heatmap={heatmap} language={language} />;
	}

	return <DailyHeatmap heatmap={heatmap} language={language} />;
}

function DailyHeatmap({heatmap, language}: ContributionHeatmapProps) {
	const t = getMessages(language).ui;
	const weeks = buildWeeks(heatmap.periods);
	const layout = buildDailyHeatmapLayout(weeks, language);
	const monthLabels = buildMonthLabels(layout);

	return (
		<Box flexDirection="column" marginTop={1} marginBottom={1}>
			<Legend language={language} />
			<Text color="gray">      {monthLabels}</Text>
			{t.weekdays.map((label, rowIndex) => (
				<Text key={label}>
					<Text color="gray">{label}  </Text>
					{layout.map((column, weekIndex) => (
						<React.Fragment key={`${label}-${weekIndex}`}>
							{column.prefix && <Text>{column.prefix}</Text>}
							<Text color={getDailyColor(column.week[rowIndex]?.count ?? 0)}>■ </Text>
						</React.Fragment>
					))}
				</Text>
			))}
		</Box>
	);
}

function MonthlyHeatmap({heatmap, language}: ContributionHeatmapProps) {
	const t = getMessages(language).ui;
	const rows = buildYearRows(heatmap.periods);

	return (
		<Box flexDirection="column" marginTop={1} marginBottom={1}>
			<Legend language={language} />
			<Text color="gray">{t.monthlyView}</Text>
			<Text color="gray">      {t.months.map(label => label.padEnd(4, ' ')).join('')}</Text>
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

function Legend({language}: {language: SupportedLanguage}) {
	const t = getMessages(language).ui;

	return (
		<Text>
			<Text color="gray">{t.less} </Text>
			{COLORS.map(color => <Text key={color} color={color}>■ </Text>)}
			<Text color="gray">{t.more}</Text>
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

export function buildDailyHeatmapLayout(
	weeks: WeekColumn[],
	language: SupportedLanguage = DEFAULT_LANGUAGE
): DailyHeatmapColumn[] {
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
		column.monthLabel = getLocalizedMonthLabel(firstNewMonthPeriod.period, language);
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

export function getDailyHeatmapLayoutWidth(layout: DailyHeatmapColumn[]): number {
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

function getLocalizedMonthLabel(dateText: string, language: SupportedLanguage): string {
	const monthIndex = Number.parseInt(dateText.slice(5, 7), 10) - 1;
	return getMessages(language).ui.months[monthIndex] ?? dateText.slice(5, 7);
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

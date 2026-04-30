import React from 'react';
import {Box, Text} from 'ink';
import {formatNumber} from '../../utils/number.js';
import {getDisplayWidth, padEndSafe} from '../../utils/text.js';

export type BarChartItem = {
	key?: string;
	rank?: number;
	label: string;
	value?: number;
	isGap?: boolean;
	isHighlighted?: boolean;
};

type BarChartProps = {
	items: BarChartItem[];
	width?: number;
	color?: string;
	emptyText?: string;
	itemGap?: number;
	barGap?: number;
	barChar?: string;
};

export function BarChart({
	items,
	width = 24,
	color = 'green',
	emptyText = 'No data',
	itemGap = 0,
	barGap = 1,
	barChar = '█'
}: BarChartProps) {
	const max = Math.max(...items.map(item => item.value ?? 0), 0);
	const labelWidth = Math.min(Math.max(...items.filter(item => !item.isGap).map(item => getDisplayWidth(item.label)), 0), 32);
	const rankWidth = Math.max(...items.map(item => item.rank ? getDisplayWidth(`#${item.rank}`) : 0), 0);
	const barPadding = ' '.repeat(barGap);

	if (items.length === 0) {
		return <Text color="gray">{emptyText}</Text>;
	}

	return (
		<Box flexDirection="column">
			{items.map((item, index) => {
				const key = item.key ?? item.label;
				const marginBottom = index === items.length - 1 ? 0 : itemGap;
				const rankLabel = item.rank ? padEndSafe(`#${item.rank}`, rankWidth) : ' '.repeat(rankWidth);
				const rankPadding = rankWidth > 0 ? ' ' : '';

				if (item.isGap) {
					return (
						<Box key={key} marginBottom={marginBottom}>
							<Text color="gray">{rankLabel}{rankPadding}...</Text>
						</Box>
					);
				}

				const value = item.value ?? 0;
				const rowColor = item.isHighlighted ? 'cyan' : undefined;

				return (
					<Box key={key} marginBottom={marginBottom}>
						<Text color={rowColor} bold={item.isHighlighted}>
							{rankLabel}{rankPadding}
							{padEndSafe(item.label, labelWidth)}{barPadding}
							<Text color={item.isHighlighted ? 'cyan' : color}>{getBar(value, max, width, barChar)}</Text>{barPadding}
							{formatNumber(value)}
						</Text>
					</Box>
				);
			})}
		</Box>
	);
}

function getBar(value: number, max: number, width: number, barChar: string): string {
	if (max <= 0) {
		return ''.padEnd(width, ' ');
	}

	const size = Math.max(1, Math.round((value / max) * width));
	return barChar.repeat(size).padEnd(width, ' ');
}

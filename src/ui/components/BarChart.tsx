import React from 'react';
import {Box, Text} from 'ink';
import {formatNumber} from '../../utils/number.js';
import {padEndSafe} from '../../utils/text.js';

export type BarChartItem = {
	key?: string;
	label: string;
	value: number;
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
	emptyText = '暂无数据',
	itemGap = 0,
	barGap = 1,
	barChar = '█'
}: BarChartProps) {
	const max = Math.max(...items.map(item => item.value), 0);
	const labelWidth = Math.min(Math.max(...items.map(item => item.label.length), 0), 32);
	const barPadding = ' '.repeat(barGap);

	if (items.length === 0) {
		return <Text color="gray">{emptyText}</Text>;
	}

	return (
		<Box flexDirection="column">
			{items.map((item, index) => {
				const key = item.key ?? item.label;
				const marginBottom = index === items.length - 1 ? 0 : itemGap;

				return (
					<Box key={key} marginBottom={marginBottom}>
						<Text>
							{padEndSafe(item.label, labelWidth)}{barPadding}
							<Text color={color}>{getBar(item.value, max, width, barChar)}</Text>{barPadding}
							{formatNumber(item.value)}
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

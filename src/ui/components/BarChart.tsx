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
};

export function BarChart({items, width = 24, color = 'green', emptyText = '暂无数据'}: BarChartProps) {
	const max = Math.max(...items.map(item => item.value), 0);
	const labelWidth = Math.min(Math.max(...items.map(item => item.label.length), 0), 32);

	if (items.length === 0) {
		return <Text color="gray">{emptyText}</Text>;
	}

	return (
		<Box flexDirection="column">
			{items.map(item => (
				<Text key={item.key ?? item.label}>
					{padEndSafe(item.label, labelWidth)}{' '}
					<Text color={color}>{getBar(item.value, max, width)}</Text>{' '}
					{formatNumber(item.value)}
				</Text>
			))}
		</Box>
	);
}

function getBar(value: number, max: number, width: number): string {
	if (max <= 0) {
		return ''.padEnd(width, ' ');
	}

	const size = Math.max(1, Math.round((value / max) * width));
	return '█'.repeat(size).padEnd(width, ' ');
}

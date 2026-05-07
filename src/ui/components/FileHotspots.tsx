import React from 'react';
import {Box} from 'ink';
import type {FileHotspotStat, FileHotspotStats} from '../../git/types.js';
import {getMessages, type SupportedLanguage} from '../../i18n.js';
import {BarChart, type BarChartItem} from './BarChart.js';
import {Section} from './Section.js';

type FileHotspotsProps = {
	hotspots: FileHotspotStats;
	language: SupportedLanguage;
};

export function FileHotspots({hotspots, language}: FileHotspotsProps) {
	const t = getMessages(language).ui;

	return (
		<Box flexDirection="column">
			<Section title={t.fileHotspotsTitle}>
				<Box flexDirection="column">
					<Section title={t.topFilesTitle}>
						<BarChart items={toChartItems(hotspots.topFiles)} emptyText={t.noFileHotspots} barChar="━" />
					</Section>

					<Section title={t.topExtensionsTitle}>
						<BarChart items={toChartItems(hotspots.topExtensions)} emptyText={t.noFileHotspots} barChar="━" />
					</Section>

					<Section title={t.multiAuthorFilesTitle}>
						<BarChart items={toAuthorCountChartItems(hotspots.multiAuthorFiles)} emptyText={t.noFileHotspots} barChar="━" />
					</Section>
				</Box>
			</Section>
		</Box>
	);
}

function toChartItems(stats: FileHotspotStat[]): BarChartItem[] {
	return stats.map((stat, index) => ({
		key: `${stat.label}-${index}`,
		rank: index + 1,
		label: stat.label,
		value: stat.changedLines
	}));
}

function toAuthorCountChartItems(stats: FileHotspotStat[]): BarChartItem[] {
	return stats.map((stat, index) => ({
		key: `${stat.label}-${index}`,
		rank: index + 1,
		label: stat.label,
		value: stat.authorCount
	}));
}

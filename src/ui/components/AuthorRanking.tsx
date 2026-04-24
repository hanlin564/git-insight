import React from 'react';
import {Box} from 'ink';
import type {RepositoryStats} from '../../analysis/collectRepositoryStats.js';
import {Section} from './Section.js';
import {BarChart} from './BarChart.js';

type AuthorRankingProps = {
	stats: RepositoryStats;
};

export function AuthorRanking({stats}: AuthorRankingProps) {
	return (
		<Box flexDirection="column">
			<Section title="Author Ranking by Commits">
				<BarChart items={stats.topByCommits.map(author => ({
					key: author.authorEmail,
					label: author.authorName,
					value: author.commitCount
				}))} />
			</Section>

			<Section title="Author Ranking by Changed Lines">
				<BarChart items={stats.topByChangedLines.map(author => ({
					key: author.authorEmail,
					label: author.authorName,
					value: author.changedLines
				}))} />
			</Section>
		</Box>
	);
}

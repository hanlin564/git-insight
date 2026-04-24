import React from 'react';
import {Box, Text} from 'ink';
import type {CliOptions} from '../cli/parseArgs.js';
import type {RepositoryStatsResult} from '../analysis/collectRepositoryStats.js';
import {Section} from './components/Section.js';
import {AuthorHeatmap} from './components/AuthorHeatmap.js';
import {AuthorRanking} from './components/AuthorRanking.js';
import {BranchActivity} from './components/BranchActivity.js';

type AppProps = {
	options: CliOptions;
	result: RepositoryStatsResult;
};

export function App({options, result}: AppProps) {
	if (!result.ok) {
		return (
			<Box flexDirection="column">
				<Text color="green" bold>Git Insight</Text>
				<Text color="red">{result.error}</Text>
				<Text color="gray">请使用 --repo 指向一个有效 Git 仓库。</Text>
			</Box>
		);
	}

	const {stats} = result;
	const hasAuthorData = stats.authorStats.length > 0;

	return (
		<Box flexDirection="column">
			<Text color="green" bold>Git Insight</Text>
			<Text>Repository: <Text color="cyan">{stats.repository.name}</Text></Text>
			<Text>Range: last {options.since} days</Text>
			{options.author && <Text>Author filter: {options.author}</Text>}
			<Text> </Text>

			{!hasAuthorData && <Text color="yellow">当前统计范围内没有匹配的提交数据。</Text>}

			{options.heatmap && hasAuthorData && (
				<Section title="Author Contribution Heatmaps">
					{stats.heatmaps.map(heatmap => (
						<AuthorHeatmap key={`${heatmap.authorName}-${heatmap.authorEmail}`} heatmap={heatmap} />
					))}
				</Section>
			)}

			{options.ranking && hasAuthorData && <AuthorRanking stats={stats} />}

			{options.branch && (
				<Section title="Branch Activity">
					<Text color="gray">Range: last {options.branchSince} days</Text>
					<BranchActivity branches={stats.branchStats} top={options.top} />
				</Section>
			)}
		</Box>
	);
}

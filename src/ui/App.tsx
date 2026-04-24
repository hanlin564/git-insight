import React from 'react';
import {Box, Text} from 'ink';
import type {CliOptions} from '../cli/parseArgs.js';
import type {RepositoryStatsResult} from '../analysis/collectRepositoryStats.js';
import {Section} from './components/Section.js';
import {ContributionHeatmap} from './components/ContributionHeatmap.js';
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
				<Text color="gray">请检查 --repo 指向的 Git 仓库，或仓库根目录的 .git-insight.json。</Text>
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

			{options.heatmap && stats.heatmap && (
				<Section title={options.currentUser ? 'Current User Contribution Heatmap' : 'Repository Contribution Heatmap'}>
					<ContributionHeatmap heatmap={stats.heatmap} />
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

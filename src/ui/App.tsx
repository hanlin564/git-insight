import React from 'react';
import {Box, Text} from 'ink';
import type {CliOptions} from '../cli/parseArgs.js';
import type {RepositoryStatsResult} from '../analysis/collectRepositoryStats.js';
import type {GitUserIdentity} from '../git/types.js';
import {Section} from './components/Section.js';
import {ContributionHeatmap} from './components/ContributionHeatmap.js';
import {AuthorRanking} from './components/AuthorRanking.js';

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
				<Text color="gray">请检查 --repo、--branch，或项目/全局 .git-insight.json。</Text>
			</Box>
		);
	}

	const {stats} = result;
	const hasAuthorData = stats.authorStats.length > 0;
	const heatmapTitle = options.me ? '当前 Git 用户贡献热力图' : '仓库贡献热力图';
	const heatmapScope = options.me
		? `统计口径：当前 Git 用户 ${formatGitUser(stats.currentGitUser)}`
		: '统计口径：仓库内所有匹配作者';

	return (
		<Box flexDirection="column">
			<Text color="green" bold>Git Insight</Text>
			<Text>Repository: <Text color="cyan">{stats.repository.name}</Text></Text>
			<Text>Branch: <Text color="cyan">{stats.branchName}</Text></Text>
			<Text>Range: {stats.range.label}</Text>
			{options.author && <Text>Author filter: {options.author}</Text>}
			{options.me && <Text>Current user: {formatGitUser(stats.currentGitUser)}</Text>}
			<Text> </Text>

			{!hasAuthorData && <Text color="yellow">当前统计范围内没有匹配的提交数据。</Text>}

			{options.heatmap && stats.heatmap && (
				<Section title={heatmapTitle}>
					<Text color="gray">{heatmapScope}</Text>
					<ContributionHeatmap heatmap={stats.heatmap} />
				</Section>
			)}

			{options.ranking && hasAuthorData && <AuthorRanking stats={stats} showCurrentUserContext={options.me} />}
		</Box>
	);
}

function formatGitUser(user?: GitUserIdentity): string {
	if (!user) {
		return '未读取到';
	}

	if (user.name && user.email) {
		return `${user.name} <${user.email}>`;
	}

	return user.name ?? user.email ?? '未读取到';
}

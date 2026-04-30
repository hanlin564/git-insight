import React from 'react';
import {Box, Text} from 'ink';
import type {CliOptions} from '../cli/parseArgs.js';
import type {RepositoryStatsResult} from '../analysis/collectRepositoryStats.js';
import type {GitUserIdentity} from '../git/types.js';
import {getMessages, type SupportedLanguage} from '../i18n.js';
import {Section} from './components/Section.js';
import {ContributionHeatmap} from './components/ContributionHeatmap.js';
import {AuthorRanking} from './components/AuthorRanking.js';
import {BranchActivity} from './components/BranchActivity.js';

type AppProps = {
	options: CliOptions;
	result: RepositoryStatsResult;
};

export function App({options, result}: AppProps) {
	const t = getMessages(options.language).ui;

	if (!result.ok) {
		return (
			<Box flexDirection="column">
				<Text color="green" bold>Git Insight</Text>
				<Text color="red">{result.error}</Text>
				<Text color="gray">{t.checkInputHint}</Text>
			</Box>
		);
	}

	const {stats} = result;
	const hasAuthorData = stats.authorStats.length > 0;
	const heatmapTitle = options.me ? t.currentUserHeatmapTitle : t.repositoryHeatmapTitle;
	const heatmapScope = options.me
		? t.currentUserHeatmapScope(formatGitUser(stats.currentGitUser, options.language))
		: t.repositoryHeatmapScope;

	return (
		<Box flexDirection="column">
			<Text color="green" bold>Git Insight</Text>
			<Text>{t.repository} <Text color="cyan">{stats.repository.name}</Text></Text>
			<Text>{t.currentBranch} <Text color="cyan">{stats.currentBranchName}</Text></Text>
			<Text>{t.analysisBranch} <Text color="cyan">{stats.analysisBranchName}</Text></Text>
			<Text>{t.dateRange} {stats.range.label}</Text>
			{options.author && <Text>{t.authorFilter} {options.author}</Text>}
			{options.me && <Text>{t.currentUser} {formatGitUser(stats.currentGitUser, options.language)}</Text>}
			<Text> </Text>

			{!hasAuthorData && <Text color="yellow">{t.noMatchingCommits}</Text>}

			{stats.heatmap && (
				<Section title={heatmapTitle}>
					<Text color="gray">{heatmapScope}</Text>
					<ContributionHeatmap heatmap={stats.heatmap} language={options.language} />
				</Section>
			)}

			{!options.branch && stats.branchGroups && (
				<BranchActivity groups={stats.branchGroups} language={options.language} />
			)}

			{hasAuthorData && <AuthorRanking stats={stats} showCurrentUserContext={options.me} language={options.language} />}
		</Box>
	);
}

function formatGitUser(user: GitUserIdentity | undefined, language: SupportedLanguage): string {
	if (!user) {
		return getMessages(language).ui.missingGitUser;
	}

	if (user.name && user.email) {
		return `${user.name} <${user.email}>`;
	}

	return user.name ?? user.email ?? getMessages(language).ui.missingGitUser;
}

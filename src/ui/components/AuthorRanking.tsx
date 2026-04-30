import React from 'react';
import {Box, Text} from 'ink';
import type {RepositoryStats} from '../../analysis/collectRepositoryStats.js';
import type {AuthorStat} from '../../git/types.js';
import {getMessages, type SupportedLanguage} from '../../i18n.js';
import {Section} from './Section.js';
import {BarChart, type BarChartItem} from './BarChart.js';

type AuthorRankingProps = {
	stats: RepositoryStats;
	showCurrentUserContext?: boolean;
	language: SupportedLanguage;
};

type RankingAuthor = {
	author: AuthorStat;
	rank: number;
	value: number;
};

type RankingView = {
	items: BarChartItem[];
	currentRank?: number;
	total: number;
};

export function AuthorRanking({stats, showCurrentUserContext = false, language}: AuthorRankingProps) {
	const t = getMessages(language).ui;
	const changedLinesPerDayRanking = createRankingView(
		stats.authorStats,
		author => author.changedLinesPerDay,
		showCurrentUserContext,
		(a, b) => b.changedLines - a.changedLines || b.commitCount - a.commitCount,
		language
	);
	const commitRanking = createRankingView(stats.authorStats, author => author.commitCount, showCurrentUserContext, undefined, language);
	const changedLinesRanking = createRankingView(stats.authorStats, author => author.changedLines, showCurrentUserContext, undefined, language);

	return (
		<Box flexDirection="column">
			<Section title={t.changedLinesPerDayRankingTitle}>
				{showCurrentUserContext && <CurrentRankText ranking={changedLinesPerDayRanking} language={language} />}
				<BarChart items={changedLinesPerDayRanking.items} barChar="━" />
			</Section>

			<Section title={t.commitRankingTitle}>
				{showCurrentUserContext && <CurrentRankText ranking={commitRanking} language={language} />}
				<BarChart items={commitRanking.items} barChar="━" />
			</Section>

			<Section title={t.changedLinesRankingTitle}>
				{showCurrentUserContext && <CurrentRankText ranking={changedLinesRanking} language={language} />}
				<BarChart items={changedLinesRanking.items} barChar="━" />
			</Section>
		</Box>
	);
}

function CurrentRankText({ranking, language}: {ranking: RankingView; language: SupportedLanguage}) {
	const t = getMessages(language).ui;

	if (!ranking.currentRank) {
		return <Text color="yellow">{t.missingCurrentRank(ranking.total)}</Text>;
	}

	return <Text color="cyan">{t.currentRank(ranking.currentRank, ranking.total)}</Text>;
}

function createRankingView(
	authors: AuthorStat[],
	getValue: (author: AuthorStat) => number,
	showCurrentUserContext: boolean,
	compareTies: ((a: AuthorStat, b: AuthorStat) => number) | undefined,
	language: SupportedLanguage
): RankingView {
	const rankedAuthors = [...authors]
		.sort((a, b) => getValue(b) - getValue(a) || (compareTies?.(a, b) ?? 0))
		.map((author, index) => ({
			author,
			rank: index + 1,
			value: getValue(author)
		}));
	const currentUserIndex = rankedAuthors.findIndex(item => item.author.isCurrentUser);
	const selectedIndices = showCurrentUserContext
		? selectCurrentUserRankingIndices(rankedAuthors.length, currentUserIndex)
		: selectDefaultRankingIndices(rankedAuthors.length);
	const selectedAuthors = selectedIndices.map(index => rankedAuthors[index]).filter((item): item is RankingAuthor => item !== undefined);

	return {
		items: toAuthorItems(selectedAuthors, rankedAuthors, language),
		currentRank: currentUserIndex >= 0 ? rankedAuthors[currentUserIndex]?.rank : undefined,
		total: rankedAuthors.length
	};
}

function selectDefaultRankingIndices(total: number): number[] {
	if (total <= 10) {
		return createRange(0, total - 1);
	}

	return [...createRange(0, 4), ...createRange(total - 5, total - 1)];
}

function selectCurrentUserRankingIndices(total: number, currentUserIndex: number): number[] {
	const indices = [
		...createRange(0, Math.min(2, total - 1)),
		...createRange(Math.max(currentUserIndex - 2, 0), Math.min(currentUserIndex + 2, total - 1)),
		...createRange(Math.max(total - 3, 0), total - 1)
	];

	return [...new Set(indices)].sort((a, b) => a - b);
}

function createRange(start: number, end: number): number[] {
	if (start < 0 || end < start) {
		return [];
	}

	return Array.from({length: end - start + 1}, (_, index) => start + index);
}

function toAuthorItems(authors: RankingAuthor[], allAuthors: RankingAuthor[], language: SupportedLanguage): BarChartItem[] {
	const nameCounts = allAuthors.reduce((counts, author) => {
		counts.set(author.author.authorName, (counts.get(author.author.authorName) ?? 0) + 1);
		return counts;
	}, new Map<string, number>());
	const items: BarChartItem[] = [];

	for (const [index, rankingAuthor] of authors.entries()) {
		const previous = authors[index - 1];

		if (previous && rankingAuthor.rank - previous.rank > 1) {
			items.push({
				key: `gap-${previous.rank}-${rankingAuthor.rank}`,
				label: '...',
				isGap: true
			});
		}

		const {author, rank, value} = rankingAuthor;

		items.push({
			key: author.authorEmail ? `${author.authorName}-${author.authorEmail}-${rank}` : `${author.authorName}-${rank}`,
			rank,
			label: getAuthorLabel(author, (nameCounts.get(author.authorName) ?? 0) > 1, author.isCurrentUser === true, language),
			value,
			isHighlighted: author.isCurrentUser === true
		});
	}

	return items;
}

function getAuthorLabel(author: AuthorStat, needsEmail: boolean, isCurrentUser: boolean, language: SupportedLanguage): string {
	const prefix = isCurrentUser ? `${getMessages(language).ui.currentUserPrefix} ` : '';

	if (!needsEmail || !author.authorEmail) {
		return `${prefix}${author.authorName}`;
	}

	return `${prefix}${author.authorName} <${getEmailHandle(author.authorEmail)}>`;
}

function getEmailHandle(email: string): string {
	return email.split('@')[0] ?? email;
}

import React from 'react';
import {Box, Text} from 'ink';
import type {RepositoryStats} from '../../analysis/collectRepositoryStats.js';
import type {AuthorStat} from '../../git/types.js';
import {Section} from './Section.js';
import {BarChart, type BarChartItem} from './BarChart.js';

type AuthorRankingProps = {
	stats: RepositoryStats;
	showCurrentUserContext?: boolean;
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

export function AuthorRanking({stats, showCurrentUserContext = false}: AuthorRankingProps) {
	const commitRanking = createRankingView(stats.authorStats, author => author.commitCount, showCurrentUserContext);
	const changedLinesRanking = createRankingView(stats.authorStats, author => author.changedLines, showCurrentUserContext);

	return (
		<Box flexDirection="column">
			<Section title="提交数排行榜">
				{showCurrentUserContext && <CurrentRankText ranking={commitRanking} />}
				<BarChart items={commitRanking.items} barChar="━" />
			</Section>

			<Section title="代码改动排行榜">
				{showCurrentUserContext && <CurrentRankText ranking={changedLinesRanking} />}
				<BarChart items={changedLinesRanking.items} barChar="━" />
			</Section>
		</Box>
	);
}

function CurrentRankText({ranking}: {ranking: RankingView}) {
	if (!ranking.currentRank) {
		return <Text color="yellow">你的排名 -/{ranking.total}（当前 Git 用户在统计范围内无提交）</Text>;
	}

	return <Text color="cyan">你的排名 {ranking.currentRank}/{ranking.total}</Text>;
}

function createRankingView(
	authors: AuthorStat[],
	getValue: (author: AuthorStat) => number,
	showCurrentUserContext: boolean
): RankingView {
	const rankedAuthors = [...authors]
		.sort((a, b) => getValue(b) - getValue(a))
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
		items: toAuthorItems(selectedAuthors, rankedAuthors),
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

function toAuthorItems(authors: RankingAuthor[], allAuthors: RankingAuthor[]): BarChartItem[] {
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
			label: getAuthorLabel(author, (nameCounts.get(author.authorName) ?? 0) > 1, author.isCurrentUser === true),
			value,
			isHighlighted: author.isCurrentUser === true
		});
	}

	return items;
}

function getAuthorLabel(author: AuthorStat, needsEmail: boolean, isCurrentUser: boolean): string {
	const prefix = isCurrentUser ? '你 ' : '';

	if (!needsEmail || !author.authorEmail) {
		return `${prefix}${author.authorName}`;
	}

	return `${prefix}${author.authorName} <${getEmailHandle(author.authorEmail)}>`;
}

function getEmailHandle(email: string): string {
	return email.split('@')[0] ?? email;
}

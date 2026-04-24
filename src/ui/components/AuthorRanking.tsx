import React from 'react';
import {Box} from 'ink';
import type {RepositoryStats} from '../../analysis/collectRepositoryStats.js';
import type {AuthorStat} from '../../git/types.js';
import {Section} from './Section.js';
import {BarChart, type BarChartItem} from './BarChart.js';

type AuthorRankingProps = {
	stats: RepositoryStats;
};

export function AuthorRanking({stats}: AuthorRankingProps) {
	return (
		<Box flexDirection="column">
			<Section title="Author Ranking by Commits">
				<BarChart items={toAuthorItems(stats.topByCommits, author => author.commitCount)} />
			</Section>

			<Section title="Author Ranking by Changed Lines">
				<BarChart items={toAuthorItems(stats.topByChangedLines, author => author.changedLines)} />
			</Section>
		</Box>
	);
}

function toAuthorItems(authors: AuthorStat[], getValue: (author: AuthorStat) => number): BarChartItem[] {
	const nameCounts = authors.reduce((counts, author) => {
		counts.set(author.authorName, (counts.get(author.authorName) ?? 0) + 1);
		return counts;
	}, new Map<string, number>());

	return authors.map(author => ({
		key: author.authorEmail ? `${author.authorName}-${author.authorEmail}` : author.authorName,
		label: getAuthorLabel(author, (nameCounts.get(author.authorName) ?? 0) > 1),
		value: getValue(author)
	}));
}

function getAuthorLabel(author: AuthorStat, needsEmail: boolean): string {
	if (!needsEmail || !author.authorEmail) {
		return author.authorName;
	}

	return `${author.authorName} <${getEmailHandle(author.authorEmail)}>`;
}

function getEmailHandle(email: string): string {
	return email.split('@')[0] ?? email;
}

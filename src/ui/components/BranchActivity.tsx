import React from 'react';
import {Box, Text} from 'ink';
import type {BranchGroups, BranchSummary} from '../../git/types.js';
import {getMessages, type SupportedLanguage} from '../../i18n.js';
import {getDisplayWidth, padEndSafe} from '../../utils/text.js';
import {Section} from './Section.js';

type BranchActivityProps = {
	groups: BranchGroups;
	language: SupportedLanguage;
};

export function BranchActivity({groups, language}: BranchActivityProps) {
	const t = getMessages(language).ui;

	return (
		<Box flexDirection="column">
			<Section title={t.defaultBranchTitle}>
				<Text color="gray">{t.defaultBranchDescription}</Text>
				<BranchList branches={groups.defaultBranch ? [groups.defaultBranch] : []} emptyText={t.noDefaultBranch} language={language} showIndex={false} />
			</Section>

			<Section title={t.activeBranchesTitle}>
				<Text color="gray">{t.activeBranchesDescription}</Text>
				<BranchList branches={groups.active} emptyText={t.noActiveBranches} language={language} />
			</Section>

			<Section title={t.staleBranchesTitle}>
				<Text color="gray">{t.staleBranchesDescription(groups.staleThresholdDate)}</Text>
				<BranchList branches={groups.stale} emptyText={t.noStaleBranches} language={language} />
			</Section>
		</Box>
	);
}

function BranchList({
	branches,
	emptyText,
	language,
	showIndex = true
}: {
	branches: BranchSummary[];
	emptyText: string;
	language: SupportedLanguage;
	showIndex?: boolean;
}) {
	if (branches.length === 0) {
		return <Text color="gray">{emptyText}</Text>;
	}

	const nameWidth = Math.min(Math.max(...branches.map(branch => getDisplayWidth(getBranchLabel(branch, language)))), 40);

	return (
		<Box flexDirection="column">
			{branches.map((branch, index) => (
				<Text key={branch.branchName} color={branch.isCurrentBranch ? 'cyan' : undefined} bold={branch.isCurrentBranch}>
					{showIndex ? `#${index + 1} ` : ''}{padEndSafe(getBranchLabel(branch, language), nameWidth)}  {branch.latestCommitDate ?? '-'}
				</Text>
			))}
		</Box>
	);
}

function getBranchLabel(branch: BranchSummary, language: SupportedLanguage): string {
	return branch.isCurrentBranch
		? `${getMessages(language).ui.currentBranchPrefix} ${branch.branchName}`
		: branch.branchName;
}

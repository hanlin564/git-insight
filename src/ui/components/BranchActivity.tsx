import React from 'react';
import {Box, Text} from 'ink';
import type {BranchGroups, BranchSummary} from '../../git/types.js';
import {getDisplayWidth, padEndSafe} from '../../utils/text.js';
import {Section} from './Section.js';

type BranchActivityProps = {
	groups: BranchGroups;
};

export function BranchActivity({groups}: BranchActivityProps) {
	return (
		<Box flexDirection="column">
			<Section title="活跃分支">
				<Text color="gray">最近 90 天有提交，默认分支 {groups.defaultBranchName ?? '未识别'} 不参与展示</Text>
				<BranchList branches={groups.active} emptyText="当前没有活跃分支" />
			</Section>

			<Section title="不活跃分支">
				<Text color="gray">最近 90 天无提交，阈值日期：{groups.staleThresholdDate}</Text>
				<BranchList branches={groups.stale} emptyText="当前没有不活跃分支" />
			</Section>
		</Box>
	);
}

function BranchList({branches, emptyText}: {branches: BranchSummary[]; emptyText: string}) {
	if (branches.length === 0) {
		return <Text color="gray">{emptyText}</Text>;
	}

	const nameWidth = Math.min(Math.max(...branches.map(branch => getDisplayWidth(getBranchLabel(branch)))), 40);

	return (
		<Box flexDirection="column">
			{branches.map((branch, index) => (
				<Text key={branch.branchName} color={branch.isCurrentBranch ? 'cyan' : undefined} bold={branch.isCurrentBranch}>
					#{index + 1} {padEndSafe(getBranchLabel(branch), nameWidth)}  {branch.latestCommitDate ?? '-'}
				</Text>
			))}
		</Box>
	);
}

function getBranchLabel(branch: BranchSummary): string {
	return branch.isCurrentBranch ? `当前 ${branch.branchName}` : branch.branchName;
}

import React from 'react';
import type {BranchStat} from '../../git/types.js';
import {BarChart} from './BarChart.js';

type BranchActivityProps = {
	branches: BranchStat[];
	top: number;
};

export function BranchActivity({branches, top}: BranchActivityProps) {
	const activeBranches = branches.filter(branch => branch.commitCount > 0);

	return (
		<BarChart
			items={activeBranches.slice(0, top).map(branch => ({
				label: branch.branchName,
				value: branch.commitCount
			}))}
			emptyText="当前分支统计范围内暂无活跃分支"
		/>
	);
}

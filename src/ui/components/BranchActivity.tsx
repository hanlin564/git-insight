import React from 'react';
import type {BranchStat} from '../../git/types.js';
import {BarChart} from './BarChart.js';

type BranchActivityProps = {
	branches: BranchStat[];
	top: number;
};

export function BranchActivity({branches, top}: BranchActivityProps) {
	return (
		<BarChart
			items={branches.slice(0, top).map(branch => ({
				label: branch.branchName,
				value: branch.commitCount
			}))}
			emptyText="暂无本地分支数据"
		/>
	);
}

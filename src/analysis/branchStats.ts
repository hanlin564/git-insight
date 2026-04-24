import type {BranchStat} from '../git/types.js';
import {getBranchCommitCount, getLocalBranches} from '../git/gitClient.js';

export async function collectBranchStats(repoPath: string, sinceDays: number): Promise<BranchStat[]> {
	const branches = await getLocalBranches(repoPath);
	const stats = await Promise.all(
		branches.map(async branchName => ({
			branchName,
			commitCount: await getBranchCommitCount(repoPath, branchName, sinceDays)
		}))
	);

	return stats.sort((a, b) => b.commitCount - a.commitCount);
}

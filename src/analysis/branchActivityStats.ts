import {getLocalBranches, getRemoteDefaultBranchName} from '../git/gitClient.js';
import type {BranchGroups, BranchSummary, LocalBranchRef} from '../git/types.js';
import {addDays, formatDate, startOfLocalDay} from '../utils/date.js';

const DEFAULT_BRANCH_GROUP_LIMIT = 10;
const STALE_THRESHOLD_DAYS = 90;

export async function collectBranchGroups(
	repoPath: string,
	currentBranchName: string,
	today = new Date(),
	limit = DEFAULT_BRANCH_GROUP_LIMIT
): Promise<BranchGroups> {
	const branches = await getLocalBranches(repoPath);
	const defaultBranchName = await resolveDefaultBranchName(repoPath, branches, currentBranchName);
	const defaultBranch = branches.find(branch => branch.name === defaultBranchName);
	const staleThresholdDate = formatDate(addDays(startOfLocalDay(today), -STALE_THRESHOLD_DAYS));
	const summaries = branches
		.filter(branch => branch.name !== defaultBranchName)
		.map(branch => toBranchSummary(branch, currentBranchName));

	return {
		defaultBranch: defaultBranch ? toBranchSummary(defaultBranch, currentBranchName) : undefined,
		active: summaries
			.filter(branch => isActiveBranch(branch, staleThresholdDate))
			.sort(compareLatestDateDesc)
			.slice(0, limit),
		stale: summaries
			.filter(branch => !isActiveBranch(branch, staleThresholdDate))
			.sort(compareLatestDateAsc)
			.slice(0, limit),
		defaultBranchName,
		staleThresholdDate
	};
}

async function resolveDefaultBranchName(
	repoPath: string,
	branches: LocalBranchRef[],
	currentBranchName: string
): Promise<string | undefined> {
	const remoteDefaultBranchName = await getRemoteDefaultBranchName(repoPath);

	return findBranchName(branches, remoteDefaultBranchName)
		?? findBranchName(branches, 'main')
		?? findBranchName(branches, 'master')
		?? findBranchName(branches, currentBranchName)
		?? branches[0]?.name;
}

function findBranchName(branches: LocalBranchRef[], branchName?: string): string | undefined {
	return branchName && branches.some(branch => branch.name === branchName) ? branchName : undefined;
}

function toBranchSummary(branch: LocalBranchRef, currentBranchName: string): BranchSummary {
	return {
		branchName: branch.name,
		latestCommitDate: branch.latestCommitDate,
		isCurrentBranch: branch.name === currentBranchName
	};
}

function isActiveBranch(branch: BranchSummary, staleThresholdDate: string): boolean {
	return Boolean(branch.latestCommitDate && branch.latestCommitDate >= staleThresholdDate);
}

function compareLatestDateDesc(a: BranchSummary, b: BranchSummary): number {
	return (b.latestCommitDate ?? '').localeCompare(a.latestCommitDate ?? '')
		|| a.branchName.localeCompare(b.branchName);
}

function compareLatestDateAsc(a: BranchSummary, b: BranchSummary): number {
	return (a.latestCommitDate ?? '').localeCompare(b.latestCommitDate ?? '')
		|| a.branchName.localeCompare(b.branchName);
}

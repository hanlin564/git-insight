import path from 'node:path';
import {execa} from 'execa';
import type {DateRange} from '../utils/date.js';
import type {GitUserIdentity, RepositoryTarget} from './types.js';

export class GitRepositoryError extends Error {
	constructor(repoPath: string) {
		super(`目录不是 Git 仓库：${repoPath}`);
		this.name = 'GitRepositoryError';
	}
}

export class GitBranchError extends Error {
	constructor(branchName: string) {
		super(`找不到指定分支：${branchName}`);
		this.name = 'GitBranchError';
	}
}

const runGit = async (repoPath: string, args: string[]): Promise<string> => {
	const result = await execa('git', args, {cwd: repoPath});
	return result.stdout;
};

export async function createRepositoryTarget(repoPath: string): Promise<RepositoryTarget> {
	let rootPath: string;

	try {
		rootPath = (await runGit(repoPath, ['rev-parse', '--show-toplevel'])).trim();
	} catch (error) {
		if (!isNotGitRepositoryError(error)) {
			throw error;
		}

		throw new GitRepositoryError(repoPath);
	}

	return {
		path: rootPath,
		name: path.basename(rootPath)
	};
}

export async function resolveAnalysisBranch(
	repoPath: string,
	branchName?: string,
	currentBranchName?: string
): Promise<{name: string; ref?: string}> {
	const name = branchName ?? currentBranchName ?? await getCurrentBranchName(repoPath);
	const ref = branchName ? await resolveBranchRef(repoPath, name) : await resolveCurrentBranchRef(repoPath, name);
	return {name, ref};
}

export async function getLogWithNumstat(repoPath: string, range: DateRange, branchRef: string): Promise<string> {
	try {
		return await runGit(repoPath, [
			'log',
			branchRef,
			`--since=${range.startDate} 00:00:00`,
			`--until=${range.endDate} 23:59:59`,
			'--numstat',
			'--date=short',
			'--pretty=format:__COMMIT__%H%x1f%an%x1f%ae%x1f%ad'
		]);
	} catch (error) {
		if (isEmptyRepositoryLogError(error)) {
			return '';
		}

		throw error;
	}
}

export async function getFirstCommitDate(repoPath: string, branchRef: string): Promise<string | undefined> {
	try {
		const roots = await runGit(repoPath, [
			'rev-list',
			'--max-parents=0',
			'--reverse',
			branchRef
		]);
		const firstCommit = roots.split('\n').find(Boolean);

		if (!firstCommit) {
			return undefined;
		}

		return (await runGit(repoPath, [
			'show',
			'-s',
			'--date=short',
			'--format=%ad',
			firstCommit
		])).trim();
	} catch (error) {
		if (isEmptyRepositoryLogError(error)) {
			return undefined;
		}

		throw error;
	}
}

export async function getCurrentBranchName(repoPath: string): Promise<string> {
	const branchName = (await runGit(repoPath, ['branch', '--show-current'])).trim();
	return branchName || 'HEAD';
}

async function resolveBranchRef(repoPath: string, branchName: string): Promise<string> {
	try {
		return (await runGit(repoPath, ['rev-parse', '--verify', `${branchName}^{commit}`])).trim();
	} catch {
		throw new GitBranchError(branchName);
	}
}

async function resolveCurrentBranchRef(repoPath: string, branchName: string): Promise<string | undefined> {
	try {
		return (await runGit(repoPath, ['rev-parse', '--verify', `${branchName}^{commit}`])).trim();
	} catch {
		return undefined;
	}
}

export async function getCurrentGitUser(repoPath: string): Promise<GitUserIdentity | undefined> {
	const [email, name] = await Promise.all([
		getGitConfigValue(repoPath, 'user.email'),
		getGitConfigValue(repoPath, 'user.name')
	]);

	if (!email && !name) {
		return undefined;
	}

	return {
		...(name ? {name} : {}),
		...(email ? {email} : {})
	};
}

async function getGitConfigValue(repoPath: string, key: string): Promise<string | undefined> {
	try {
		const output = await runGit(repoPath, ['config', '--get', key]);
		const value = output.trim();
		return value.length > 0 ? value : undefined;
	} catch {
		return undefined;
	}
}

function isEmptyRepositoryLogError(error: unknown): boolean {
	const detail = getErrorDetail(error).toLowerCase();
	return detail.includes('does not have any commits') || detail.includes('bad default revision');
}

function isNotGitRepositoryError(error: unknown): boolean {
	return getErrorDetail(error).toLowerCase().includes('not a git repository');
}

function getErrorDetail(error: unknown): string {
	if (typeof error === 'object' && error && 'stderr' in error) {
		return String(error.stderr);
	}

	return error instanceof Error ? error.message : String(error);
}

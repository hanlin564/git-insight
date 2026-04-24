import path from 'node:path';
import {execa} from 'execa';
import type {RepositoryTarget} from './types.js';

export class GitRepositoryError extends Error {
	constructor(repoPath: string) {
		super(`目录不是 Git 仓库：${repoPath}`);
		this.name = 'GitRepositoryError';
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
	} catch {
		throw new GitRepositoryError(repoPath);
	}

	return {
		path: rootPath,
		name: path.basename(rootPath)
	};
}

export async function getLogWithNumstat(repoPath: string, sinceDays: number): Promise<string> {
	try {
		return await runGit(repoPath, [
			'log',
			`--since=${sinceDays} days ago`,
			'--numstat',
			'--date=short',
			'--pretty=format:__COMMIT__%H|%an|%ae|%ad'
		]);
	} catch (error) {
		if (isEmptyRepositoryLogError(error)) {
			return '';
		}

		throw error;
	}
}

export async function getLocalBranches(repoPath: string): Promise<string[]> {
	const output = await runGit(repoPath, ['branch', '--format=%(refname:short)']);
	return output.split('\n').map(line => line.trim()).filter(Boolean);
}

export async function getBranchCommitCount(
	repoPath: string,
	branchName: string,
	sinceDays: number
): Promise<number> {
	const output = await runGit(repoPath, [
		'rev-list',
		'--count',
		`--since=${sinceDays} days ago`,
		branchName
	]);

	return Number.parseInt(output.trim(), 10) || 0;
}

function isEmptyRepositoryLogError(error: unknown): boolean {
	const detail = getErrorDetail(error).toLowerCase();
	return detail.includes('does not have any commits') || detail.includes('bad default revision');
}

function getErrorDetail(error: unknown): string {
	if (typeof error === 'object' && error && 'stderr' in error) {
		return String(error.stderr);
	}

	return error instanceof Error ? error.message : String(error);
}

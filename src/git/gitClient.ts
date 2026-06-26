import {execa} from 'execa';
import type {CommitRecord, GitUserIdentity} from './types.js';
import {parseGitLogWithNumstat} from './gitLogParser.js';

export class GitGlobalUserError extends Error {
	constructor() {
		super('未读取到 Git 全局用户名或邮箱，请先配置 git config --global user.name / user.email。');
		this.name = 'GitGlobalUserError';
	}
}

export async function getGlobalGitUser(cwd: string): Promise<GitUserIdentity> {
	const [name, email] = await Promise.all([
		getGlobalGitConfigValue(cwd, 'user.name'),
		getGlobalGitConfigValue(cwd, 'user.email')
	]);

	if (!name && !email) {
		throw new GitGlobalUserError();
	}

	return {
		...(name ? {name} : {}),
		...(email ? {email} : {})
	};
}

export async function getRepositoryCommits(
	repoPath: string,
	startDate: string,
	endDate: string
): Promise<CommitRecord[]> {
	const output = await getLogWithNumstat(repoPath, startDate, endDate);
	return parseGitLogWithNumstat(output);
}

async function getLogWithNumstat(
	repoPath: string,
	startDate: string,
	endDate: string
): Promise<string> {
	const result = await execa('git', [
		'log',
		'--all',
		`--since=${startDate} 00:00:00`,
		`--until=${endDate} 23:59:59`,
		'--numstat',
		'--date=short',
		'--pretty=format:__COMMIT__%H%x1f%an%x1f%ae%x1f%ad'
	], {
		cwd: repoPath,
		reject: false
	});

	if (result.exitCode === 0) {
		return result.stdout;
	}

	const detail = `${result.stderr}\n${result.stdout}`.toLowerCase();
	if (detail.includes('does not have any commits') || detail.includes('bad default revision')) {
		return '';
	}

	throw new Error(result.stderr || result.stdout || `读取 Git 日志失败：${repoPath}`);
}

async function getGlobalGitConfigValue(cwd: string, key: string): Promise<string | undefined> {
	const result = await execa('git', ['config', '--global', '--get', key], {
		cwd,
		reject: false
	});
	const value = result.stdout.trim();
	return result.exitCode === 0 && value.length > 0 ? value : undefined;
}

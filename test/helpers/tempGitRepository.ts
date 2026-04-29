import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execa} from 'execa';
import type {TestContext} from 'node:test';

type CommitOptions = {
	authorName?: string;
	authorEmail?: string;
	date: string;
	message?: string;
	filePath?: string;
	content?: string;
};

type CreateTempGitRepositoryOptions = {
	configureUser?: boolean;
};

export type TempGitRepository = {
	path: string;
	name: string;
	git: (args: string[]) => Promise<string>;
	configUser: (name: string, email: string) => Promise<void>;
	unsetUser: () => Promise<void>;
	commitFile: (options: CommitOptions) => Promise<void>;
	removeFile: (options: Omit<CommitOptions, 'content'>) => Promise<void>;
	checkout: (branchName: string) => Promise<void>;
	createBranch: (branchName: string) => Promise<void>;
	writeAuthorAliases: (content: string) => Promise<void>;
};

const DEFAULT_AUTHOR_NAME = 'Alice';
const DEFAULT_AUTHOR_EMAIL = 'alice@example.com';

export async function createTempGitRepository(
	t: TestContext,
	options: CreateTempGitRepositoryOptions = {}
): Promise<TempGitRepository> {
	const repoPath = await mkdtemp(path.join(os.tmpdir(), 'git-insight-test-'));
	const repoName = path.basename(repoPath);

	t.after(async () => {
		await rm(repoPath, {recursive: true, force: true});
	});

	const git = async (args: string[]): Promise<string> => {
		const result = await execa('git', args, {cwd: repoPath});
		return result.stdout;
	};

	await git(['init']);
	if (options.configureUser !== false) {
		await git(['config', 'user.name', DEFAULT_AUTHOR_NAME]);
		await git(['config', 'user.email', DEFAULT_AUTHOR_EMAIL]);
	}
	await git(['branch', '-M', 'main']);

	return {
		path: repoPath,
		name: repoName,
		git,
		async configUser(name: string, email: string) {
			await git(['config', 'user.name', name]);
			await git(['config', 'user.email', email]);
		},
		async unsetUser() {
			await execa('git', ['config', '--unset', 'user.name'], {cwd: repoPath, reject: false});
			await execa('git', ['config', '--unset', 'user.email'], {cwd: repoPath, reject: false});
		},
		async commitFile(options: CommitOptions) {
			const filePath = options.filePath ?? 'README.md';
			const fullPath = path.join(repoPath, filePath);
			await mkdir(path.dirname(fullPath), {recursive: true});
			await writeFile(fullPath, options.content ?? `${options.message ?? 'change'}\n`, 'utf8');
			await git(['add', filePath]);

			const authorName = options.authorName ?? DEFAULT_AUTHOR_NAME;
			const authorEmail = options.authorEmail ?? DEFAULT_AUTHOR_EMAIL;
			const date = `${options.date}T12:00:00+08:00`;
			await execa('git', ['commit', '-m', options.message ?? `提交 ${filePath}`], {
				cwd: repoPath,
				env: {
					GIT_AUTHOR_NAME: authorName,
					GIT_AUTHOR_EMAIL: authorEmail,
					GIT_AUTHOR_DATE: date,
					GIT_COMMITTER_NAME: authorName,
					GIT_COMMITTER_EMAIL: authorEmail,
					GIT_COMMITTER_DATE: date
				}
			});
		},
		async removeFile(options: Omit<CommitOptions, 'content'>) {
			const filePath = options.filePath ?? 'README.md';
			await git(['rm', filePath]);

			const authorName = options.authorName ?? DEFAULT_AUTHOR_NAME;
			const authorEmail = options.authorEmail ?? DEFAULT_AUTHOR_EMAIL;
			const date = `${options.date}T12:00:00+08:00`;
			await execa('git', ['commit', '-m', options.message ?? `删除 ${filePath}`], {
				cwd: repoPath,
				env: {
					GIT_AUTHOR_NAME: authorName,
					GIT_AUTHOR_EMAIL: authorEmail,
					GIT_AUTHOR_DATE: date,
					GIT_COMMITTER_NAME: authorName,
					GIT_COMMITTER_EMAIL: authorEmail,
					GIT_COMMITTER_DATE: date
				}
			});
		},
		async checkout(branchName: string) {
			await git(['checkout', branchName]);
		},
		async createBranch(branchName: string) {
			await git(['checkout', '-b', branchName]);
		},
		async writeAuthorAliases(content: string) {
			await writeFile(path.join(repoPath, '.git-insight.json'), content, 'utf8');
		}
	};
}

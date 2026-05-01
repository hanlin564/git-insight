import {appendFile, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
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
	namePrefix?: string;
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
	writeConfig: (content: string) => Promise<void>;
	writeAuthorAliases: (content: string) => Promise<void>;
};

const DEFAULT_AUTHOR_NAME = 'Alice';
const DEFAULT_AUTHOR_EMAIL = 'alice@example.com';

export async function createTempGitRepository(
	t: TestContext,
	options: CreateTempGitRepositoryOptions = {}
): Promise<TempGitRepository> {
	const repoPath = await mkdtemp(path.join(os.tmpdir(), options.namePrefix ?? 'git-insight-test-'));
	const repoName = path.basename(repoPath);
	const fastImportMarksPath = path.join(repoPath, '.git-insight-fast-import-marks');
	const branchTips = new Map<string, string | undefined>([['main', undefined]]);
	let currentBranchName = 'main';

	t.after(async () => {
		await rm(repoPath, {recursive: true, force: true});
	});

	const git = async (args: string[]): Promise<string> => {
		const result = await execa('git', args, {cwd: repoPath});
		return result.stdout;
	};

	await git(['init', '--initial-branch=main']);
	if (options.configureUser !== false) {
		await appendGitUserConfig(repoPath, DEFAULT_AUTHOR_NAME, DEFAULT_AUTHOR_EMAIL);
	}

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
			await importCommit({
				repoPath,
				marksPath: fastImportMarksPath,
				branchName: currentBranchName,
				parentHash: branchTips.get(currentBranchName),
				options,
				fileCommand: [
					`M 100644 inline ${filePath}`,
					`data ${Buffer.byteLength(options.content ?? `${options.message ?? 'change'}\n`)}`,
					options.content ?? `${options.message ?? 'change'}\n`
				].join('\n')
			});
			branchTips.set(currentBranchName, await readFastImportMark(fastImportMarksPath));
		},
		async removeFile(options: Omit<CommitOptions, 'content'>) {
			const filePath = options.filePath ?? 'README.md';
			await importCommit({
				repoPath,
				marksPath: fastImportMarksPath,
				branchName: currentBranchName,
				parentHash: branchTips.get(currentBranchName),
				options,
				fileCommand: `D ${filePath}`
			});
			branchTips.set(currentBranchName, await readFastImportMark(fastImportMarksPath));
		},
		async checkout(branchName: string) {
			await git(['checkout', branchName]);
			currentBranchName = branchName;
		},
		async createBranch(branchName: string) {
			await git(['checkout', '-b', branchName]);
			branchTips.set(branchName, branchTips.get(currentBranchName));
			currentBranchName = branchName;
		},
		async writeConfig(content: string) {
			await writeFile(path.join(repoPath, '.git-insight.json'), content, 'utf8');
		},
		async writeAuthorAliases(content: string) {
			await writeFile(path.join(repoPath, '.git-insight.json'), content, 'utf8');
		}
	};
}

type ImportCommitOptions = {
	repoPath: string;
	marksPath: string;
	branchName: string;
	parentHash?: string;
	options: Omit<CommitOptions, 'content'>;
	fileCommand: string;
};

async function importCommit({
	repoPath,
	marksPath,
	branchName,
	parentHash,
	options,
	fileCommand
}: ImportCommitOptions): Promise<void> {
	const filePath = options.filePath ?? 'README.md';
	const authorName = options.authorName ?? DEFAULT_AUTHOR_NAME;
	const authorEmail = options.authorEmail ?? DEFAULT_AUTHOR_EMAIL;
	const message = options.message ?? `提交 ${filePath}`;
	const parentCommand = parentHash ? `from ${parentHash}\n` : '';
	const input = [
		`commit refs/heads/${branchName}`,
		'mark :1',
		`author ${formatFastImportIdentity(authorName, authorEmail)} ${formatFastImportDate(options.date)}`,
		`committer ${formatFastImportIdentity(authorName, authorEmail)} ${formatFastImportDate(options.date)}`,
		`data ${Buffer.byteLength(message)}`,
		message,
		parentCommand + fileCommand
	].join('\n') + '\n';

	await execa('git', ['fast-import', '--quiet', `--export-marks=${marksPath}`], {
		cwd: repoPath,
		input
	});
}

async function readFastImportMark(marksPath: string): Promise<string> {
	const marks = await readFile(marksPath, 'utf8');
	const [, hash] = marks.trim().split(/\s+/, 2);

	if (!hash) {
		throw new Error('未读取到 fast-import 提交标记。');
	}

	return hash;
}

async function appendGitUserConfig(repoPath: string, name: string, email: string): Promise<void> {
	await appendFile(path.join(repoPath, '.git', 'config'), `\n[user]\n\tname = ${name}\n\temail = ${email}\n`, 'utf8');
}

function formatFastImportIdentity(name: string, email: string): string {
	return `${name.replace(/[<>\r\n]/g, ' ')} <${email.replace(/[<>\s]/g, '')}>`;
}

function formatFastImportDate(date: string): string {
	const timestamp = Math.floor(new Date(`${date}T12:00:00+08:00`).getTime() / 1000);
	return `${timestamp} +0800`;
}

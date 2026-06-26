import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverGitRepositories} from '../../src/git/repositoryDiscovery.js';
import {createTempGitRepository} from '../helpers/tempGitRepository.js';

test('递归发现当前目录下的 Git 仓库并跳过仓库内部目录', async t => {
	const rootPath = await mkdtemp(path.join(os.tmpdir(), 'show-my-git-data-root-'));
	t.after(async () => {
		await rm(rootPath, {recursive: true, force: true});
	});

	const firstRepo = await createTempGitRepository(t, {parentDir: rootPath, namePrefix: 'repo-a-'});
	const secondRepo = await createTempGitRepository(t, {parentDir: rootPath, namePrefix: 'repo-b-'});
	await mkdir(path.join(firstRepo.path, 'nested', 'child'), {recursive: true});
	await writeFile(path.join(firstRepo.path, 'nested', 'child', '.git'), 'gitdir: ../.git/worktrees/child\n', 'utf8');
	await mkdir(path.join(rootPath, 'node_modules', 'ignored'), {recursive: true});
	await writeFile(path.join(rootPath, 'node_modules', 'ignored', '.git'), 'gitdir: ignored\n', 'utf8');

	const repositories = await discoverGitRepositories(rootPath);

	assert.deepEqual(
		repositories.map(repositoryPath => path.basename(repositoryPath)).sort(),
		[path.basename(firstRepo.path), path.basename(secondRepo.path)].sort()
	);
});

test('识别 .git 文件形式的 worktree 仓库', async t => {
	const rootPath = await mkdtemp(path.join(os.tmpdir(), 'show-my-git-data-worktree-'));
	t.after(async () => {
		await rm(rootPath, {recursive: true, force: true});
	});

	const worktreePath = path.join(rootPath, 'repo-worktree');
	await mkdir(worktreePath);
	await writeFile(path.join(worktreePath, '.git'), 'gitdir: /tmp/example/.git/worktrees/repo-worktree\n', 'utf8');

	const repositories = await discoverGitRepositories(rootPath);

	assert.deepEqual(repositories, [worktreePath]);
});

test('支持多个扫描目录并去重重复发现的仓库', async t => {
	const rootPath = await mkdtemp(path.join(os.tmpdir(), 'show-my-git-data-multi-root-'));
	t.after(async () => {
		await rm(rootPath, {recursive: true, force: true});
	});

	const frontendPath = path.join(rootPath, 'frontend');
	const backendPath = path.join(rootPath, 'backend');
	await mkdir(frontendPath);
	await mkdir(backendPath);
	const frontendRepo = await createTempGitRepository(t, {parentDir: frontendPath, namePrefix: 'repo-web-'});
	const backendRepo = await createTempGitRepository(t, {parentDir: backendPath, namePrefix: 'repo-api-'});

	const repositories = await discoverGitRepositories([frontendPath, backendPath, frontendRepo.path]);

	assert.deepEqual(
		repositories.sort(),
		[frontendRepo.path, backendRepo.path].sort()
	);
});

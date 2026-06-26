import {mkdtemp, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {runGitInsight} from './helpers/cli.js';
import {createTempGitRepository} from './helpers/tempGitRepository.js';

test('show-my-git-data 默认扫描当前目录下多个仓库并只统计全局 Git 用户', async t => {
	const rootPath = await mkdtemp(path.join(os.tmpdir(), 'show-my-git-data-cli-'));
	t.after(async () => {
		await rm(rootPath, {recursive: true, force: true});
	});

	const today = new Date();
	const todayText = [
		today.getFullYear(),
		String(today.getMonth() + 1).padStart(2, '0'),
		String(today.getDate()).padStart(2, '0')
	].join('-');

	const firstRepo = await createTempGitRepository(t, {parentDir: rootPath, namePrefix: 'repo-a-'});
	await firstRepo.commitFile({
		date: todayText,
		authorName: 'Alice',
		authorEmail: 'alice@example.com',
		filePath: 'a.txt',
		content: 'a\nb\n'
	});
	await firstRepo.commitFile({
		date: todayText,
		authorName: 'Bob',
		authorEmail: 'bob@example.com',
		filePath: 'bob.txt',
		content: 'ignored\n'
	});

	const secondRepo = await createTempGitRepository(t, {parentDir: rootPath, namePrefix: 'repo-b-'});
	await secondRepo.commitFile({
		date: todayText,
		authorName: 'Alice',
		authorEmail: 'alice@example.com',
		filePath: 'b.txt',
		content: 'a\n'
	});

	const result = await runGitInsight(t, [], {
		cwd: rootPath,
		globalUser: {
			name: 'Alice',
			email: 'alice@example.com'
		}
	});

	assert.equal(result.exitCode, 0);
	assert.match(result.output, /show-my-git-data/);
	assert.match(result.output, /当前用户：Alice <alice@example.com>/);
	assert.match(result.output, /仓库：成功 2 \/ 共 2/);
	assert.match(result.output, /本年度个人提交热力图/);
	assert.match(result.output, /今天：2 次提交，3 行代码/);
	assert.doesNotMatch(result.output, /Bob/);
});

test('没有发现 Git 仓库时输出空状态', async t => {
	const rootPath = await mkdtemp(path.join(os.tmpdir(), 'show-my-git-data-empty-'));
	t.after(async () => {
		await rm(rootPath, {recursive: true, force: true});
	});

	const result = await runGitInsight(t, [], {
		cwd: rootPath,
		globalUser: {
			name: 'Alice',
			email: 'alice@example.com'
		}
	});

	assert.equal(result.exitCode, 0);
	assert.match(result.output, /当前目录下未发现 Git 仓库/);
	assert.match(result.output, /今天：0 次提交，0 行代码/);
});

test('缺少 Git 全局用户时返回错误', async t => {
	const rootPath = await mkdtemp(path.join(os.tmpdir(), 'show-my-git-data-missing-user-'));
	t.after(async () => {
		await rm(rootPath, {recursive: true, force: true});
	});

	const result = await runGitInsight(t, [], {cwd: rootPath});

	assert.equal(result.exitCode, 1);
	assert.match(result.output, /未读取到 Git 全局用户名或邮箱/);
});

test('传入参数时提示命令无需参数', async t => {
	const result = await runGitInsight(t, ['--year', '2025']);

	assert.equal(result.exitCode, 1);
	assert.match(result.output, /不需要任何参数/);
});

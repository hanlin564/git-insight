import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {collectMyGitData} from '../../src/analysis/myGitData.js';
import {createTempGitRepository} from '../helpers/tempGitRepository.js';

test('跨仓库汇总全局 Git 用户的年度热力图和近期统计', async t => {
	const rootPath = await mkdtemp(path.join(os.tmpdir(), 'show-my-git-data-stats-'));
	const globalConfigPath = path.join(rootPath, '.gitconfig');
	const previousGlobalConfigPath = process.env.GIT_CONFIG_GLOBAL;
	const previousNoSystem = process.env.GIT_CONFIG_NOSYSTEM;

	t.after(async () => {
		if (previousGlobalConfigPath === undefined) {
			delete process.env.GIT_CONFIG_GLOBAL;
		} else {
			process.env.GIT_CONFIG_GLOBAL = previousGlobalConfigPath;
		}

		if (previousNoSystem === undefined) {
			delete process.env.GIT_CONFIG_NOSYSTEM;
		} else {
			process.env.GIT_CONFIG_NOSYSTEM = previousNoSystem;
		}

		await rm(rootPath, {recursive: true, force: true});
	});

	process.env.GIT_CONFIG_GLOBAL = globalConfigPath;
	process.env.GIT_CONFIG_NOSYSTEM = '1';
	await writeFile(globalConfigPath, '[user]\n\tname = Alice\n\temail = alice@example.com\n', 'utf8');

	const firstRepo = await createTempGitRepository(t, {parentDir: rootPath, namePrefix: 'repo-a-'});
	await firstRepo.commitFile({
		date: '2024-04-30',
		authorName: 'Alice',
		authorEmail: 'alice@example.com',
		filePath: 'before-last-12-months.txt',
		content: 'ignored\n'
	});
	await firstRepo.commitFile({
		date: '2024-05-01',
		authorName: 'Alice',
		authorEmail: 'alice@example.com',
		filePath: 'last-year.txt',
		content: 'a\n'
	});
	await firstRepo.commitFile({
		date: '2025-04-29',
		authorName: 'Alice',
		authorEmail: 'alice@example.com',
		filePath: 'week.txt',
		content: 'a\nb\nc\n'
	});
	await firstRepo.commitFile({
		date: '2025-04-30',
		authorName: 'Alice',
		authorEmail: 'alice@example.com',
		filePath: 'today.txt',
		content: 'a\nb\n'
	});
	await firstRepo.commitFile({
		date: '2025-04-30',
		authorName: 'Bob',
		authorEmail: 'bob@example.com',
		filePath: 'other.txt',
		content: 'ignored\n'
	});

	const secondRepo = await createTempGitRepository(t, {parentDir: rootPath, namePrefix: 'repo-b-'});
	await secondRepo.commitFile({
		date: '2025-04-10',
		authorName: 'Someone',
		authorEmail: 'alice@example.com',
		filePath: 'month.txt',
		content: 'a\n'
	});

	const result = await collectMyGitData(rootPath, undefined, new Date('2025-04-30T12:00:00'));

	assert.equal(result.ok, true);
	if (!result.ok) {
		return;
	}

	assert.equal(result.data.repositoryCount, 2);
	assert.equal(result.data.successfulRepositoryCount, 2);
	assert.equal(result.data.summaries.today.commitCount, 1);
	assert.equal(result.data.summaries.today.changedLines, 2);
	assert.equal(result.data.summaries.last7Days.commitCount, 2);
	assert.equal(result.data.summaries.last7Days.changedLines, 5);
	assert.equal(result.data.summaries.last30Days.commitCount, 3);
	assert.equal(result.data.summaries.last30Days.changedLines, 6);
	assert.equal(result.data.heatmap.find(period => period.period === '2025-04-30')?.count, 1);
	assert.equal(result.data.heatmap.find(period => period.period === '2025-04-10')?.count, 1);
	assert.equal(result.data.heatmap.find(period => period.period === '2024-05-01'), undefined);
	assert.equal(result.data.last12MonthsHeatmap.find(period => period.period === '2024-05-01')?.count, 1);
	assert.equal(result.data.last12MonthsHeatmap.find(period => period.period === '2024-04-30'), undefined);
});

test('缺少 Git 全局用户时返回可读错误', async t => {
	const rootPath = await mkdtemp(path.join(os.tmpdir(), 'show-my-git-data-no-user-'));
	const globalConfigPath = path.join(rootPath, '.gitconfig');
	const previousGlobalConfigPath = process.env.GIT_CONFIG_GLOBAL;

	t.after(async () => {
		if (previousGlobalConfigPath === undefined) {
			delete process.env.GIT_CONFIG_GLOBAL;
		} else {
			process.env.GIT_CONFIG_GLOBAL = previousGlobalConfigPath;
		}

		await rm(rootPath, {recursive: true, force: true});
	});

	process.env.GIT_CONFIG_GLOBAL = globalConfigPath;
	const result = await collectMyGitData(rootPath, undefined, new Date('2025-04-30T12:00:00'));

	assert.equal(result.ok, false);
	assert.match(result.ok ? '' : result.error, /未读取到 Git 全局用户名或邮箱/);
});

test('支持多个扫描目录并避免重复统计同一个仓库', async t => {
	const rootPath = await mkdtemp(path.join(os.tmpdir(), 'show-my-git-data-multi-stats-'));
	const globalConfigPath = path.join(rootPath, '.gitconfig');
	const previousGlobalConfigPath = process.env.GIT_CONFIG_GLOBAL;
	const previousNoSystem = process.env.GIT_CONFIG_NOSYSTEM;

	t.after(async () => {
		if (previousGlobalConfigPath === undefined) {
			delete process.env.GIT_CONFIG_GLOBAL;
		} else {
			process.env.GIT_CONFIG_GLOBAL = previousGlobalConfigPath;
		}

		if (previousNoSystem === undefined) {
			delete process.env.GIT_CONFIG_NOSYSTEM;
		} else {
			process.env.GIT_CONFIG_NOSYSTEM = previousNoSystem;
		}

		await rm(rootPath, {recursive: true, force: true});
	});

	process.env.GIT_CONFIG_GLOBAL = globalConfigPath;
	process.env.GIT_CONFIG_NOSYSTEM = '1';
	await writeFile(globalConfigPath, '[user]\n\tname = Alice\n\temail = alice@example.com\n', 'utf8');

	const frontendPath = path.join(rootPath, 'frontend');
	const backendPath = path.join(rootPath, 'backend');
	await mkdir(frontendPath);
	await mkdir(backendPath);
	const frontendRepo = await createTempGitRepository(t, {parentDir: frontendPath, namePrefix: 'repo-web-'});
	const backendRepo = await createTempGitRepository(t, {parentDir: backendPath, namePrefix: 'repo-api-'});

	await frontendRepo.commitFile({
		date: '2025-04-30',
		authorName: 'Alice',
		authorEmail: 'alice@example.com',
		filePath: 'frontend.txt',
		content: 'a\nb\n'
	});
	await backendRepo.commitFile({
		date: '2025-04-30',
		authorName: 'Alice',
		authorEmail: 'alice@example.com',
		filePath: 'backend.txt',
		content: 'a\n'
	});

	const result = await collectMyGitData([frontendPath, backendPath, frontendPath], undefined, new Date('2025-04-30T12:00:00'));

	assert.equal(result.ok, true);
	if (!result.ok) {
		return;
	}

	assert.deepEqual(result.data.rootPaths, [frontendPath, backendPath]);
	assert.equal(result.data.repositoryCount, 2);
	assert.equal(result.data.summaries.today.commitCount, 2);
	assert.equal(result.data.summaries.today.changedLines, 3);
});

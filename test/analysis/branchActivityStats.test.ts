import {strict as assert} from 'node:assert';
import test from 'node:test';
import {collectBranchGroups} from '../../src/analysis/branchActivityStats.js';
import {createTempGitRepository} from '../helpers/tempGitRepository.js';

const TODAY = new Date('2026-04-30T12:00:00+08:00');

test('collectBranchGroups 按最近 90 天将本地分支分为活跃和不活跃', async t => {
	const repo = await createTempGitRepository(t);
	await repo.commitFile({
		date: '2026-04-01',
		message: '默认分支提交',
		filePath: 'main.txt',
		content: 'main\n'
	});
	await repo.createBranch('feature/recent');
	await repo.commitFile({
		date: '2026-04-20',
		message: '近期分支提交',
		filePath: 'recent.txt',
		content: 'recent\n'
	});
	await repo.checkout('main');
	await repo.createBranch('feature/current');
	await repo.commitFile({
		date: '2026-04-10',
		message: '当前分支提交',
		filePath: 'current.txt',
		content: 'current\n'
	});
	await repo.checkout('main');
	await repo.createBranch('feature/stale');
	await repo.commitFile({
		date: '2025-12-01',
		message: '不活跃分支提交',
		filePath: 'stale.txt',
		content: 'stale\n'
	});
	await repo.checkout('feature/current');

	const groups = await collectBranchGroups(repo.path, 'feature/current', TODAY);

	assert.equal(groups.defaultBranchName, 'main');
	assert.deepEqual(groups.defaultBranch, {
		branchName: 'main',
		latestCommitDate: '2026-04-01',
		isCurrentBranch: false
	});
	assert.equal(groups.staleThresholdDate, '2026-01-30');
	assert.deepEqual(groups.active.map(branch => [branch.branchName, branch.latestCommitDate]), [
		['feature/recent', '2026-04-20'],
		['feature/current', '2026-04-10']
	]);
	assert.deepEqual(groups.stale.map(branch => [branch.branchName, branch.latestCommitDate]), [
		['feature/stale', '2025-12-01']
	]);
	assert.equal(groups.active[1]?.isCurrentBranch, true);
});

test('collectBranchGroups 排除默认分支且不活跃分支按最旧提交排序', async t => {
	const repo = await createTempGitRepository(t);
	await repo.commitFile({
		date: '2026-04-01',
		message: 'main 提交',
		filePath: 'main.txt',
		content: 'main\n'
	});
	await repo.createBranch('feature/older');
	await repo.commitFile({
		date: '2025-10-01',
		message: '更旧分支提交',
		filePath: 'older.txt',
		content: 'older\n'
	});
	await repo.checkout('main');
	await repo.createBranch('feature/old');
	await repo.commitFile({
		date: '2025-12-01',
		message: '旧分支提交',
		filePath: 'old.txt',
		content: 'old\n'
	});

	const groups = await collectBranchGroups(repo.path, 'feature/old', TODAY);

	assert.deepEqual(groups.active, []);
	assert.deepEqual(groups.stale.map(branch => branch.branchName), ['feature/older', 'feature/old']);
	assert.equal(groups.stale.some(branch => branch.branchName === 'main'), false);
	assert.equal(groups.stale[1]?.isCurrentBranch, true);
});

test('collectBranchGroups 只有默认分支时单独返回默认分支', async t => {
	const repo = await createTempGitRepository(t);
	await repo.commitFile({
		date: '2026-04-01',
		message: 'main 提交',
		filePath: 'main.txt',
		content: 'main\n'
	});

	const groups = await collectBranchGroups(repo.path, 'main', TODAY);

	assert.equal(groups.defaultBranchName, 'main');
	assert.deepEqual(groups.defaultBranch, {
		branchName: 'main',
		latestCommitDate: '2026-04-01',
		isCurrentBranch: true
	});
	assert.deepEqual(groups.active, []);
	assert.deepEqual(groups.stale, []);
});

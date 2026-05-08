import {strict as assert} from 'node:assert';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, {type TestContext} from 'node:test';
import {GitInsightConfigError, loadGitInsightConfig} from '../../src/config/gitInsightConfig.js';

test('loadGitInsightConfig 读取 excludePatterns 配置', async t => {
	const repoPath = await createTempDirectory(t);
	await writeFile(path.join(repoPath, '.git-insight.json'), JSON.stringify({
		excludePatterns: [
			'package-lock.json',
			'dist/',
			'*.generated.ts'
		]
	}), 'utf8');

	const config = await loadGitInsightConfig(repoPath);

	assert.deepEqual(config.excludePatterns, [
		'package-lock.json',
		'dist/',
		'*.generated.ts'
	]);
});

test('loadGitInsightConfig 拒绝非法 excludePatterns 配置', async t => {
	const cases = [
		JSON.stringify({excludePatterns: 'dist/'}),
		JSON.stringify({excludePatterns: ['dist/', 1]})
	];

	for (const content of cases) {
		const repoPath = await createTempDirectory(t);
		await writeFile(path.join(repoPath, '.git-insight.json'), content, 'utf8');
		await assert.rejects(() => loadGitInsightConfig(repoPath), (error: unknown) => {
			assert.equal(error instanceof GitInsightConfigError, true);
			assert.match(error instanceof Error ? error.message : String(error), /excludePatterns must be a string array/);
			return true;
		});
	}
});

async function createTempDirectory(t: TestContext): Promise<string> {
	const directory = await mkdtemp(path.join(os.tmpdir(), 'git-insight-config-test-'));
	t.after(async () => {
		await rm(directory, {recursive: true, force: true});
	});
	return directory;
}

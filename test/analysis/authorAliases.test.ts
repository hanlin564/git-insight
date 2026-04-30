import {strict as assert} from 'node:assert';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, {type TestContext} from 'node:test';
import {AuthorAliasConfigError, loadAuthorAliasLookup} from '../../src/analysis/authorAliases.js';
import {GitInsightConfigError} from '../../src/config/gitInsightConfig.js';

test('loadAuthorAliasLookup 读取仓库级作者合并配置', async t => {
	const repoPath = await createTempDirectory(t);
	await writeFile(path.join(repoPath, '.git-insight.json'), JSON.stringify({
		authors: [
			{
				displayName: 'Alice Team',
				displayEmail: 'team@example.com',
				names: [' Alice ', 'Alice'],
				emails: [' alice@example.com ']
			}
		]
	}), 'utf8');

	const lookup = await loadAuthorAliasLookup(repoPath);

	assert.deepEqual(lookup.groups, [
		{
			key: 'author:1',
			displayName: 'Alice Team',
			displayEmail: 'team@example.com',
			names: ['Alice'],
			emails: ['alice@example.com']
		}
	]);
});

test('loadAuthorAliasLookup 允许只配置语言', async t => {
	const repoPath = await createTempDirectory(t);
	await writeFile(path.join(repoPath, '.git-insight.json'), JSON.stringify({language: 'zh'}), 'utf8');

	const lookup = await loadAuthorAliasLookup(repoPath, 'zh');

	assert.deepEqual(lookup.groups, []);
});

test('loadAuthorAliasLookup 拒绝非法作者合并配置', async t => {
	const cases = [
		{
			content: '{bad json',
			message: /Git Insight config JSON format error/,
			errorClass: GitInsightConfigError
		},
		{
			content: JSON.stringify({authors: {}}),
			message: /Git Insight config authors must be an array/,
			errorClass: AuthorAliasConfigError
		},
		{
			content: JSON.stringify({authors: [{}]}),
			message: /must include names or emails/,
			errorClass: AuthorAliasConfigError
		},
		{
			content: JSON.stringify({authors: [{names: ['Alice']}, {names: ['Alice']}]}),
			message: /Author name appears in multiple alias groups/,
			errorClass: AuthorAliasConfigError
		},
		{
			content: JSON.stringify({authors: [{emails: ['alice@example.com']}, {emails: ['alice@example.com']}]}),
			message: /Email appears in multiple alias groups/,
			errorClass: AuthorAliasConfigError
		}
	];

	for (const item of cases) {
		const repoPath = await createTempDirectory(t);
		await writeFile(path.join(repoPath, '.git-insight.json'), item.content, 'utf8');
		await assert.rejects(() => loadAuthorAliasLookup(repoPath), (error: unknown) => {
			assert.equal(error instanceof item.errorClass, true);
			assert.match(error instanceof Error ? error.message : String(error), item.message);
			return true;
		});
	}
});

async function createTempDirectory(t: TestContext): Promise<string> {
	const directory = await mkdtemp(path.join(os.tmpdir(), 'git-insight-alias-test-'));
	t.after(async () => {
		await rm(directory, {recursive: true, force: true});
	});
	return directory;
}

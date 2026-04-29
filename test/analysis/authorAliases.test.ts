import {strict as assert} from 'node:assert';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, {type TestContext} from 'node:test';
import {AuthorAliasConfigError, loadAuthorAliasLookup} from '../../src/analysis/authorAliases.js';

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

test('loadAuthorAliasLookup 拒绝非法作者合并配置', async t => {
	const cases = [
		{
			content: '{bad json',
			message: /作者合并配置 JSON 格式错误/
		},
		{
			content: JSON.stringify({}),
			message: /作者合并配置必须包含 authors 数组/
		},
		{
			content: JSON.stringify({authors: [{}]}),
			message: /必须包含 names 或 emails/
		},
		{
			content: JSON.stringify({authors: [{names: ['Alice']}, {names: ['Alice']}]}),
			message: /作者名称重复出现在多个作者合并组/
		},
		{
			content: JSON.stringify({authors: [{emails: ['alice@example.com']}, {emails: ['alice@example.com']}]}),
			message: /邮箱重复出现在多个作者合并组/
		}
	];

	for (const item of cases) {
		const repoPath = await createTempDirectory(t);
		await writeFile(path.join(repoPath, '.git-insight.json'), item.content, 'utf8');
		await assert.rejects(() => loadAuthorAliasLookup(repoPath), (error: unknown) => {
			assert.equal(error instanceof AuthorAliasConfigError, true);
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

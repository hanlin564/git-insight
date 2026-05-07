import {strict as assert} from 'node:assert';
import test from 'node:test';
import {createAuthorIdentityResolver} from '../../src/analysis/authorIdentity.js';
import {collectFileHotspotStats} from '../../src/analysis/fileHotspotStats.js';
import type {CommitFileChange, CommitRecord} from '../../src/git/types.js';

test('collectFileHotspotStats 汇总目录、文件、文件类型和多作者热点', () => {
	const commits = [
		commit('1', 'Alice', 'alice@example.com', '2025-04-01', change('src/app.ts', 10, 2)),
		commit('2', 'Bob', 'bob@example.com', '2025-04-02', change('src/app.ts', 1, 3)),
		commit('3', 'Alice', 'alice@example.com', '2025-04-03', change('src/ui/App.tsx', 5, 0)),
		commit('4', 'Bob', 'bob@example.com', '2025-04-04', change('README.md', 2, 0)),
		commit('5', 'Alice', 'alice@example.com', '2025-04-05', change('docs/guide.md', 0, 6))
	];
	const resolver = createAuthorIdentityResolver(commits, {groups: []});

	const stats = collectFileHotspotStats(commits, resolver, 'en');

	assert.deepEqual(stats.topFiles.map(item => [item.label, item.changedLines, item.authorCount, item.commitCount]), [
		['src/app.ts', 16, 2, 2],
		['docs/guide.md', 6, 1, 1],
		['src/ui/App.tsx', 5, 1, 1],
		['README.md', 2, 1, 1]
	]);
	assert.deepEqual(stats.topExtensions.map(item => [item.label, item.changedLines]), [
		['.ts', 16],
		['.md', 8],
		['.tsx', 5]
	]);
	assert.deepEqual(stats.multiAuthorFiles.map(item => [item.label, item.authorCount, item.commitCount]), [
		['src/app.ts', 2, 2]
	]);
});

test('collectFileHotspotStats 支持作者查询和当前用户过滤', () => {
	const commits = [
		commit('1', 'Alice', 'alice@example.com', '2025-04-01', change('src/app.ts', 10, 0)),
		commit('2', 'Bob', 'bob@example.com', '2025-04-02', change('src/app.ts', 0, 4)),
		commit('3', 'Bob', 'bob@example.com', '2025-04-03', change('README.md', 2, 0))
	];
	const resolver = createAuthorIdentityResolver(commits, {groups: []});

	const byAuthor = collectFileHotspotStats(commits, resolver, 'en', 'bob');
	const byCurrentUser = collectFileHotspotStats(commits, resolver, 'en', undefined, {email: 'alice@example.com'});

	assert.deepEqual(byAuthor.topFiles.map(item => [item.label, item.changedLines]), [
		['src/app.ts', 4],
		['README.md', 2]
	]);
	assert.deepEqual(byAuthor.multiAuthorFiles, []);
	assert.deepEqual(byCurrentUser.topFiles.map(item => [item.label, item.changedLines]), [
		['src/app.ts', 10]
	]);
});

test('collectFileHotspotStats 多作者热点优先按作者数量排序', () => {
	const commits = [
		commit('1', 'Alice', 'alice@example.com', '2025-04-01', change('src/two-authors.ts', 20, 0)),
		commit('2', 'Bob', 'bob@example.com', '2025-04-02', change('src/two-authors.ts', 10, 0)),
		commit('3', 'Alice', 'alice@example.com', '2025-04-01', change('src/three-authors.ts', 1, 0)),
		commit('4', 'Bob', 'bob@example.com', '2025-04-02', change('src/three-authors.ts', 1, 0)),
		commit('5', 'Carol', 'carol@example.com', '2025-04-03', change('src/three-authors.ts', 1, 0))
	];
	const resolver = createAuthorIdentityResolver(commits, {groups: []});

	const stats = collectFileHotspotStats(commits, resolver, 'en');

	assert.deepEqual(stats.multiAuthorFiles.map(item => [item.label, item.authorCount, item.changedLines]), [
		['src/three-authors.ts', 3, 3],
		['src/two-authors.ts', 2, 30]
	]);
});

test('collectFileHotspotStats 使用本地化无扩展名标签', () => {
	const commits = [
		commit('1', 'Alice', 'alice@example.com', '2025-04-01', change('LICENSE', 1, 0))
	];
	const resolver = createAuthorIdentityResolver(commits, {groups: []});

	const stats = collectFileHotspotStats(commits, resolver, 'zh');

	assert.equal(stats.topExtensions[0]?.label, '无扩展名');
});

function commit(
	hash: string,
	authorName: string,
	authorEmail: string,
	date: string,
	file: CommitFileChange
): CommitRecord {
	return {
		hash,
		authorName,
		authorEmail,
		date,
		additions: file.additions,
		deletions: file.deletions,
		files: [file]
	};
}

function change(filePath: string, additions: number, deletions: number): CommitFileChange {
	return {
		path: filePath,
		additions,
		deletions,
		changedLines: additions + deletions
	};
}

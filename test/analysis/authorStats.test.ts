import {strict as assert} from 'node:assert';
import test from 'node:test';
import {createAuthorIdentityResolver} from '../../src/analysis/authorIdentity.js';
import {collectAuthorStats} from '../../src/analysis/authorStats.js';
import type {CommitRecord} from '../../src/git/types.js';

test('collectAuthorStats 汇总提交数、增删行和每日改动速度', () => {
	const commits = [
		commit('1', 'Alice', 'alice@example.com', '2025-04-01', 3, 1),
		commit('2', 'Bob', 'bob@example.com', '2025-04-02', 1, 0),
		commit('3', 'Alice', 'alice@example.com', '2025-04-03', 2, 2)
	];
	const resolver = createAuthorIdentityResolver(commits, {groups: []});

	const stats = collectAuthorStats(commits, resolver, 10);

	assert.equal(stats.length, 2);
	assert.equal(stats[0]?.authorName, 'Alice');
	assert.equal(stats[0]?.commitCount, 2);
	assert.equal(stats[0]?.additions, 5);
	assert.equal(stats[0]?.deletions, 3);
	assert.equal(stats[0]?.changedLines, 8);
	assert.equal(stats[0]?.changedLinesPerDay, 0.8);
});

test('collectAuthorStats 支持作者过滤和当前用户标记', () => {
	const commits = [
		commit('1', 'Alice', 'alice@example.com', '2025-04-01', 1, 0),
		commit('2', 'Bob', 'bob@example.com', '2025-04-02', 1, 0)
	];
	const resolver = createAuthorIdentityResolver(commits, {groups: []});

	const stats = collectAuthorStats(commits, resolver, 1, 'bob', {email: 'bob@example.com'});

	assert.equal(stats.length, 1);
	assert.equal(stats[0]?.authorName, 'Bob');
	assert.equal(stats[0]?.isCurrentUser, true);
});

function commit(
	hash: string,
	authorName: string,
	authorEmail: string,
	date: string,
	additions: number,
	deletions: number
): CommitRecord {
	return {
		hash,
		authorName,
		authorEmail,
		date,
		additions,
		deletions
	};
}

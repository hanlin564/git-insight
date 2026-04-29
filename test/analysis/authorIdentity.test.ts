import {strict as assert} from 'node:assert';
import test from 'node:test';
import {AuthorAliasConfigError} from '../../src/analysis/authorAliases.js';
import {createAuthorIdentityResolver} from '../../src/analysis/authorIdentity.js';
import type {CommitRecord} from '../../src/git/types.js';

test('createAuthorIdentityResolver 默认按原始签名解析作者', () => {
	const commits = [
		commit('1', 'Alice', 'alice@example.com', '2025-04-01'),
		commit('2', 'Alice', 'alice@work.example.com', '2025-04-02')
	];
	const resolver = createAuthorIdentityResolver(commits, {groups: []});

	assert.equal(resolver.resolve(commits[0]!).authorEmail, 'alice@example.com');
	assert.equal(resolver.resolve(commits[1]!).authorEmail, 'alice@work.example.com');
	assert.notEqual(resolver.resolve(commits[0]!).key, resolver.resolve(commits[1]!).key);
	assert.equal(resolver.matches(commits[0]!, 'alice@example.com'), true);
	assert.equal(resolver.matches(commits[1]!, 'alice@example.com'), false);
});

test('createAuthorIdentityResolver 按作者合并配置覆盖展示名称和邮箱', () => {
	const commits = [
		commit('1', 'Alice', 'alice@example.com', '2025-04-01'),
		commit('2', 'A. Li', 'alice@work.example.com', '2025-04-02')
	];
	const resolver = createAuthorIdentityResolver(commits, {
		groups: [
			{
				key: 'author:1',
				displayName: 'Alice Team',
				displayEmail: 'team@example.com',
				names: ['Alice'],
				emails: ['alice@work.example.com']
			}
		]
	});

	const identity = resolver.resolve(commits[0]!);
	assert.equal(identity.authorName, 'Alice Team');
	assert.equal(identity.authorEmail, 'team@example.com');
	assert.equal(resolver.resolve(commits[1]!).key, identity.key);
	assert.equal(resolver.matches(commits[1]!, 'team@example.com'), true);
	assert.equal(resolver.matchesIdentity(commits[0]!, {email: 'alice@work.example.com'}), true);
});

test('createAuthorIdentityResolver 检测同一签名匹配多个作者合并组', () => {
	const commits = [
		commit('1', 'Alice', 'alice@example.com', '2025-04-01')
	];

	assert.throws(() => createAuthorIdentityResolver(commits, {
		groups: [
			{
				key: 'author:1',
				names: ['Alice'],
				emails: []
			},
			{
				key: 'author:2',
				names: [],
				emails: ['alice@example.com']
			}
		]
	}), AuthorAliasConfigError);
});

function commit(
	hash: string,
	authorName: string,
	authorEmail: string,
	date: string,
	additions = 1,
	deletions = 0
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

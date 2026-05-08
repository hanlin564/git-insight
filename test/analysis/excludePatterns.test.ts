import {strict as assert} from 'node:assert';
import test from 'node:test';
import {applyExcludePatterns} from '../../src/analysis/excludePatterns.js';
import type {CommitFileChange, CommitRecord} from '../../src/git/types.js';

test('applyExcludePatterns 支持精确文件、目录和通配符规则', () => {
	const commits = [
		commit('1', [
			change('src/app.ts', 10, 2),
			change('package-lock.json', 100, 50)
		]),
		commit('2', [
			change('dist/app.js', 20, 0)
		]),
		commit('3', [
			change('src/client.generated.ts', 30, 0)
		])
	];

	const filtered = applyExcludePatterns(commits, [
		'package-lock.json',
		'dist/',
		'*.generated.ts'
	]);

	assert.deepEqual(filtered.map(item => item.hash), ['1']);
	assert.equal(filtered[0]?.additions, 10);
	assert.equal(filtered[0]?.deletions, 2);
	assert.deepEqual(filtered[0]?.files.map(file => file.path), ['src/app.ts']);
});

test('applyExcludePatterns 未配置规则时保留原提交引用', () => {
	const commits = [
		commit('1', [change('src/app.ts', 1, 0)])
	];

	assert.equal(applyExcludePatterns(commits), commits);
});

function commit(hash: string, files: CommitFileChange[]): CommitRecord {
	return {
		hash,
		authorName: 'Alice',
		authorEmail: 'alice@example.com',
		date: '2025-04-01',
		additions: files.reduce((total, file) => total + file.additions, 0),
		deletions: files.reduce((total, file) => total + file.deletions, 0),
		files
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

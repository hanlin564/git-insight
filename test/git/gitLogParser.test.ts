import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parseGitLogWithNumstat} from '../../src/git/gitLogParser.js';

const separator = '\x1f';

const commitHeader = (hash: string, name: string, email: string, date: string): string =>
	`__COMMIT__${hash}${separator}${name}${separator}${email}${separator}${date}`;

test('parseGitLogWithNumstat 解析多提交和多文件改动', () => {
	const commits = parseGitLogWithNumstat([
		commitHeader('abc123', 'Alice', 'alice@example.com', '2025-04-01'),
		'3\t1\tsrc/a.ts',
		'2\t0\tsrc/b.ts',
		commitHeader('def456', 'Bob', 'bob@example.com', '2025-04-02'),
		'0\t4\tsrc/c.ts'
	].join('\n'));

	assert.deepEqual(commits, [
		{
			hash: 'abc123',
			authorName: 'Alice',
			authorEmail: 'alice@example.com',
			date: '2025-04-01',
			additions: 5,
			deletions: 1,
			files: [
				{path: 'src/a.ts', additions: 3, deletions: 1, changedLines: 4},
				{path: 'src/b.ts', additions: 2, deletions: 0, changedLines: 2}
			]
		},
		{
			hash: 'def456',
			authorName: 'Bob',
			authorEmail: 'bob@example.com',
			date: '2025-04-02',
			additions: 0,
			deletions: 4,
			files: [
				{path: 'src/c.ts', additions: 0, deletions: 4, changedLines: 4}
			]
		}
	]);
});

test('parseGitLogWithNumstat 保留包含空格的文件路径', () => {
	const commits = parseGitLogWithNumstat([
		commitHeader('abc123', 'Alice', 'alice@example.com', '2025-04-01'),
		'3\t1\tdocs/my report.md'
	].join('\n'));

	assert.deepEqual(commits[0]?.files, [
		{path: 'docs/my report.md', additions: 3, deletions: 1, changedLines: 4}
	]);
});

test('parseGitLogWithNumstat 将二进制文件 numstat 计为 0', () => {
	const commits = parseGitLogWithNumstat([
		commitHeader('abc123', 'Alice', 'alice@example.com', '2025-04-01'),
		'-\t-\tasset.bin'
	].join('\n'));

	assert.equal(commits[0]?.additions, 0);
	assert.equal(commits[0]?.deletions, 0);
	assert.deepEqual(commits[0]?.files, [
		{path: 'asset.bin', additions: 0, deletions: 0, changedLines: 0}
	]);
});

test('parseGitLogWithNumstat 兼容 CRLF 换行输出', () => {
	const commits = parseGitLogWithNumstat([
		commitHeader('abc123', 'Alice', 'alice@example.com', '2025-04-01'),
		'1\t0\tsrc/a.ts'
	].join('\r\n'));

	assert.equal(commits[0]?.date, '2025-04-01');
	assert.equal(commits[0]?.additions, 1);
	assert.equal(commits[0]?.deletions, 0);
});

test('parseGitLogWithNumstat 忽略空输出和异常 header', () => {
	assert.deepEqual(parseGitLogWithNumstat(''), []);
	assert.deepEqual(parseGitLogWithNumstat(`__COMMIT__missing${separator}fields`), []);
});

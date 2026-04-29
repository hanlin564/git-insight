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
			deletions: 1
		},
		{
			hash: 'def456',
			authorName: 'Bob',
			authorEmail: 'bob@example.com',
			date: '2025-04-02',
			additions: 0,
			deletions: 4
		}
	]);
});

test('parseGitLogWithNumstat 将二进制文件 numstat 计为 0', () => {
	const commits = parseGitLogWithNumstat([
		commitHeader('abc123', 'Alice', 'alice@example.com', '2025-04-01'),
		'-\t-\tasset.bin'
	].join('\n'));

	assert.equal(commits[0]?.additions, 0);
	assert.equal(commits[0]?.deletions, 0);
});

test('parseGitLogWithNumstat 忽略空输出和异常 header', () => {
	assert.deepEqual(parseGitLogWithNumstat(''), []);
	assert.deepEqual(parseGitLogWithNumstat(`__COMMIT__missing${separator}fields`), []);
});

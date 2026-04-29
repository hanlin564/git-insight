import {strict as assert} from 'node:assert';
import test from 'node:test';
import {getLogWithNumstat, resolveAnalysisBranch} from '../../src/git/gitClient.js';
import {parseGitLogWithNumstat} from '../../src/git/gitLogParser.js';
import type {DateRange} from '../../src/utils/date.js';
import {createTempGitRepository} from '../helpers/tempGitRepository.js';

test('getLogWithNumstat 读取真实仓库中的新增、修改和删除行统计', async t => {
	const repo = await createTempGitRepository(t);
	await repo.commitFile({
		date: '2025-04-01',
		message: '新增文件',
		filePath: 'tracked.txt',
		content: 'one\ntwo\nthree\n'
	});
	await repo.commitFile({
		date: '2025-04-02',
		message: '减少内容',
		filePath: 'tracked.txt',
		content: 'one\n'
	});
	await repo.removeFile({
		date: '2025-04-03',
		message: '删除文件',
		filePath: 'tracked.txt'
	});
	const branch = await resolveAnalysisBranch(repo.path);

	const log = await getLogWithNumstat(repo.path, range('2025-04-01', '2025-04-03'), branch.ref!);
	const commits = parseGitLogWithNumstat(log);

	assert.equal(commits.length, 3);
	assert.equal(commits.reduce((total, commit) => total + commit.additions, 0), 3);
	assert.equal(commits.reduce((total, commit) => total + commit.deletions, 0), 3);
});

function range(startDate: string, endDate: string): DateRange {
	return {
		kind: 'custom',
		startDate,
		endDate,
		label: `${startDate}..${endDate}`,
		dayCount: 3
	};
}

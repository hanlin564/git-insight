import {strict as assert} from 'node:assert';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {mkdtemp, rm} from 'node:fs/promises';
import test, {type TestContext} from 'node:test';
import {createTempGitRepository, type TempGitRepository} from './helpers/tempGitRepository.js';
import {runGitInsight} from './helpers/cli.js';

test('按指定月份统计临时仓库提交，并输出排行榜', async t => {
	const repo = await createRepositoryWithHistory(t);

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--month',
		'2025-04',
		'--no-heatmap'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Git Insight/);
	assert.match(result.output, new RegExp(`Repository:\\s+${escapeRegExp(repo.name)}`));
	assert.match(result.output, /当前分支:\s+main/);
	assert.match(result.output, /分析分支:\s+main/);
	assert.match(result.output, /Range:\s+2025-04/);
	assert.match(result.output, /提交数排行榜/);
	assert.match(result.output, /Alice/);
	assert.match(result.output, /Bob/);
	assert.doesNotMatch(result.output, /Carol/);
	assert.doesNotMatch(result.output, /仓库贡献热力图/);
});

test('支持 --last 统计最近 N 天提交', async t => {
	const repo = await createTempGitRepository(t);
	const today = startOfLocalDay(new Date());
	const recentDate = formatDate(addDays(today, -1));
	const oldDate = formatDate(addDays(today, -10));
	await repo.commitFile({
		date: oldDate,
		message: '旧提交',
		filePath: 'old.txt',
		content: 'old\n',
		authorName: 'Old Author',
		authorEmail: 'old@example.com'
	});
	await repo.commitFile({
		date: recentDate,
		message: '近期提交',
		filePath: 'recent.txt',
		content: 'recent\n',
		authorName: 'Recent Author',
		authorEmail: 'recent@example.com'
	});

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--last',
		'7',
		'--no-heatmap'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Range:\s+last 7 days/);
	assert.match(result.output, /Recent Author/);
	assert.doesNotMatch(result.output, /Old Author/);
});

test('支持 --year 只统计指定年份提交', async t => {
	const repo = await createTempGitRepository(t);
	await repo.commitFile({
		date: '2024-12-31',
		message: '上一年提交',
		filePath: 'last-year.txt',
		content: 'old\n',
		authorName: 'Last Year',
		authorEmail: 'last-year@example.com'
	});
	await repo.commitFile({
		date: '2025-01-01',
		message: '目标年份提交',
		filePath: 'target-year.txt',
		content: 'target\n',
		authorName: 'Target Year',
		authorEmail: 'target-year@example.com'
	});

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--year',
		'2025',
		'--no-heatmap'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Range:\s+2025/);
	assert.match(result.output, /Target Year/);
	assert.doesNotMatch(result.output, /Last Year/);
});

test('支持单独使用 --from 统计到今天', async t => {
	const repo = await createTempGitRepository(t);
	const today = startOfLocalDay(new Date());
	const includedDate = formatDate(addDays(today, -1));
	const excludedDate = formatDate(addDays(today, -20));
	await repo.commitFile({
		date: excludedDate,
		message: '范围外提交',
		filePath: 'excluded.txt',
		content: 'excluded\n',
		authorName: 'Excluded Author',
		authorEmail: 'excluded@example.com'
	});
	await repo.commitFile({
		date: includedDate,
		message: '范围内提交',
		filePath: 'included.txt',
		content: 'included\n',
		authorName: 'Included Author',
		authorEmail: 'included@example.com'
	});

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--from',
		includedDate,
		'--no-heatmap'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, new RegExp(`Range:\\s+${escapeRegExp(includedDate)}\\.\\.now`));
	assert.match(result.output, /Included Author/);
	assert.doesNotMatch(result.output, /Excluded Author/);
});

test('支持单独使用 --to 从首个提交统计到指定日期', async t => {
	const repo = await createTempGitRepository(t);
	await repo.commitFile({
		date: '2025-01-10',
		message: '首个提交',
		filePath: 'first.txt',
		content: 'first\n',
		authorName: 'First Author',
		authorEmail: 'first@example.com'
	});
	await repo.commitFile({
		date: '2025-02-10',
		message: '范围外提交',
		filePath: 'after.txt',
		content: 'after\n',
		authorName: 'After Author',
		authorEmail: 'after@example.com'
	});

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--to',
		'2025-01-31',
		'--no-heatmap'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Range:\s+first commit\.\.2025-01-31/);
	assert.match(result.output, /First Author/);
	assert.doesNotMatch(result.output, /After Author/);
});

test('支持 --branch 分析指定分支，而不是当前分支', async t => {
	const repo = await createTempGitRepository(t);
	await repo.commitFile({
		date: '2025-04-01',
		message: 'main 提交',
		filePath: 'main.txt',
		content: 'main\n',
		authorName: 'Alice'
	});
	await repo.createBranch('feature/report');
	await repo.commitFile({
		date: '2025-04-02',
		message: '分支提交',
		filePath: 'feature.txt',
		content: 'feature\n',
		authorName: 'Branch User',
		authorEmail: 'branch@example.com'
	});
	await repo.checkout('main');

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--branch',
		'feature/report',
		'--from',
		'2025-04-01',
		'--to',
		'2025-04-30',
		'--no-heatmap'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /当前分支:\s+main/);
	assert.match(result.output, /分析分支:\s+feature\/report/);
	assert.match(result.output, /Branch User/);
});

test('支持 detached HEAD 状态下分析当前提交', async t => {
	const repo = await createTempGitRepository(t);
	await repo.commitFile({
		date: '2025-04-01',
		message: 'detached 提交',
		filePath: 'detached.txt',
		content: 'detached\n',
		authorName: 'Detached User',
		authorEmail: 'detached@example.com'
	});
	const hash = await repo.git(['rev-parse', 'HEAD']);
	await repo.git(['checkout', '--detach', hash]);

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--from',
		'2025-04-01',
		'--to',
		'2025-04-30',
		'--no-heatmap'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /当前分支:\s+HEAD/);
	assert.match(result.output, /分析分支:\s+HEAD/);
	assert.match(result.output, /Detached User/);
});

test('支持 --author 过滤作者数据', async t => {
	const repo = await createRepositoryWithHistory(t);

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--from',
		'2025-04-01',
		'--to',
		'2025-04-30',
		'--author',
		'bob@example.com',
		'--no-heatmap'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Author filter:\s+bob@example.com/);
	assert.match(result.output, /Bob/);
	assert.doesNotMatch(result.output, /Alice/);
});

test('支持 --me 使用临时仓库本地 Git 用户配置', async t => {
	const repo = await createRepositoryWithHistory(t);
	await repo.configUser('Bob', 'bob@example.com');

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--from',
		'2025-04-01',
		'--to',
		'2025-04-30',
		'--me',
		'--no-heatmap'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Current user:\s+Bob <bob@example.com>/);
	assert.match(result.output, /你的排名/);
	assert.match(result.output, /你 Bob/);
});

test('使用 --me 但仓库没有 Git 用户配置时返回可读错误', async t => {
	const repo = await createTempGitRepository(t, {configureUser: false});
	await repo.commitFile({
		date: '2025-04-01',
		message: '无配置仓库提交',
		filePath: 'change.txt',
		content: 'change\n',
		authorName: 'No Config Author',
		authorEmail: 'no-config@example.com'
	});

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--from',
		'2025-04-01',
		'--to',
		'2025-04-30',
		'--me'
	]);

	assert.equal(result.exitCode, 1, result.output);
	assert.match(result.output, /未读取到当前 Git 配置用户/);
});

test('支持 --no-heatmap 和 --no-ranking 只输出仓库摘要', async t => {
	const repo = await createRepositoryWithHistory(t);

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--from',
		'2025-04-01',
		'--to',
		'2025-04-30',
		'--no-heatmap',
		'--no-ranking'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Git Insight/);
	assert.doesNotMatch(result.output, /仓库贡献热力图/);
	assert.doesNotMatch(result.output, /排行榜/);
});

test('空仓库会输出无提交数据提示', async t => {
	const repo = await createTempGitRepository(t);

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--from',
		'2025-04-01',
		'--to',
		'2025-04-30'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /当前统计范围内没有匹配的提交数据/);
	assert.doesNotMatch(result.output, /排行榜/);
});

test('非 Git 目录会返回可读错误', async t => {
	const dirPath = await mkdtemp(path.join(tmpdir(), 'git-insight-not-repo-'));
	t.after(async () => {
		await rm(dirPath, {recursive: true, force: true});
	});

	const result = await runGitInsight(t, ['--repo', dirPath]);

	assert.equal(result.exitCode, 1, result.output);
	assert.match(result.output, /目录不是 Git 仓库/);
});

test('不存在的分支会返回可读错误', async t => {
	const repo = await createRepositoryWithHistory(t);

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--branch',
		'missing-branch'
	]);

	assert.equal(result.exitCode, 1, result.output);
	assert.match(result.output, /找不到指定分支：missing-branch/);
});

test('参数组合非法时返回可读错误', async t => {
	const result = await runGitInsight(t, ['--last', '7', '--month', '2025-04']);

	assert.equal(result.exitCode, 1, result.output);
	assert.match(result.output, /--last、--year、--month 只能指定一个/);
});

test('帮助命令输出关键参数说明', async t => {
	const result = await runGitInsight(t, ['--help']);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Usage:/);
	assert.match(result.output, /--repo <path>/);
	assert.match(result.output, /--from <date>/);
	assert.match(result.output, /--me/);
});

test('临时仓库内的作者合并配置会参与命令统计', async t => {
	const repo = await createRepositoryWithHistory(t);
	await repo.writeAuthorAliases(JSON.stringify({
		authors: [
			{
				displayName: 'Alice Team',
				displayEmail: 'team@example.com',
				names: ['Alice'],
				emails: ['alice@example.com']
			}
		]
	}));

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--from',
		'2025-04-01',
		'--to',
		'2025-04-30',
		'--author',
		'team@example.com',
		'--no-heatmap'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Alice Team/);
	assert.doesNotMatch(result.output, /Bob/);
});

async function createRepositoryWithHistory(t: TestContext): Promise<TempGitRepository> {
	const repo = await createTempGitRepository(t);
	await repo.commitFile({
		date: '2025-03-15',
		message: 'Carol 旧提交',
		filePath: 'src/c.txt',
		content: 'old\n',
		authorName: 'Carol',
		authorEmail: 'carol@example.com'
	});
	await repo.commitFile({
		date: '2025-04-01',
		message: 'Alice 首次提交',
		filePath: 'src/a.txt',
		content: 'one\n',
		authorName: 'Alice',
		authorEmail: 'alice@example.com'
	});
	await repo.commitFile({
		date: '2025-04-02',
		message: 'Bob 提交',
		filePath: 'src/b.txt',
		content: 'one\ntwo\n',
		authorName: 'Bob',
		authorEmail: 'bob@example.com'
	});
	return repo;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatDate(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfLocalDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

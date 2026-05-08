import {strict as assert} from 'node:assert';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {mkdtemp, readFile, realpath, rm} from 'node:fs/promises';
import test, {type TestContext} from 'node:test';
import {createTempGitRepository, type TempGitRepository} from './helpers/tempGitRepository.js';
import {runGitInsight} from './helpers/cli.js';

test('按指定月份统计临时仓库提交，并输出排行榜', async t => {
	const repo = await createRepositoryWithHistory(t);

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--month',
		'2025-04'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Git Insight/);
	assert.match(result.output, new RegExp(`Repository:\\s*${escapeRegExp(repo.name)}`));
	assert.match(result.output, /Current branch:\s+main/);
	assert.match(result.output, /Analysis branch:\s+main/);
	assert.match(result.output, /Date range:\s*2025-04/);
	assert.match(result.output, /Commit Count Ranking/);
	assert.match(result.output, /File Hotspots/);
	assert.match(result.output, /Top Files by Changed Lines/);
	assert.match(result.output, /src\/b\.txt/);
	assert.match(result.output, /Alice/);
	assert.match(result.output, /Bob/);
	assert.doesNotMatch(result.output, /Carol/);
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
		'7'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Date range:\s*Last 7 days/);
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
		'2025'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Date range:\s*2025/);
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
		includedDate
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, new RegExp(`Date range:\\s*${escapeRegExp(includedDate)}\\.\\.today`));
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
		'2025-01-31'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Date range:\s*first commit\.\.2025-01-31/);
	assert.match(result.output, /First Author/);
	assert.doesNotMatch(result.output, /After Author/);
});

test('支持中文路径和中文作者名仓库', async t => {
	const repo = await createTempGitRepository(t, {namePrefix: 'git-insight-中文-'});
	await repo.commitFile({
		date: '2025-04-01',
		message: '中文路径提交',
		filePath: 'src/中文文件.txt',
		content: '内容\n',
		authorName: '中文作者',
		authorEmail: 'zh@example.com'
	});

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--from',
		'2025-04-01',
		'--to',
		'2025-04-30'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, new RegExp(`Repository:\\s*${escapeRegExp(repo.name)}`));
	assert.match(result.output, /中文作者/);
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
		'2025-04-30'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Current branch:\s+main/);
	assert.match(result.output, /Analysis branch:\s+feature\/report/);
	assert.match(result.output, /Branch User/);
	assert.doesNotMatch(result.output, /^Active Branches$/m);
	assert.doesNotMatch(result.output, /^Stale Branches$/m);
});

test('未指定 --branch 时展示活跃和不活跃分支', async t => {
	const repo = await createTempGitRepository(t);
	const recentDate = formatDate(addDays(startOfLocalDay(new Date()), -10));
	const staleDate = formatDate(addDays(startOfLocalDay(new Date()), -120));
	await repo.commitFile({
		date: recentDate,
		message: 'main 提交',
		filePath: 'main.txt',
		content: 'main\n'
	});
	await repo.createBranch('feature/active');
	await repo.commitFile({
		date: recentDate,
		message: '活跃分支提交',
		filePath: 'feature-a.txt',
		content: 'a\n'
	});
	await repo.checkout('main');
	await repo.createBranch('feature/stale');
	await repo.commitFile({
		date: staleDate,
		message: '不活跃分支提交',
		filePath: 'feature-stale.txt',
		content: 'stale\n'
	});

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--last',
		'3650'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /^Default Branch$/m);
	assert.match(result.output, new RegExp(`main\\s+${escapeRegExp(recentDate)}`));
	assert.match(result.output, /^Active Branches$/m);
	assert.match(result.output, new RegExp(`feature/active\\s+${escapeRegExp(recentDate)}`));
	assert.match(result.output, /^Stale Branches$/m);
	assert.match(result.output, new RegExp(`current feature/stale\\s+${escapeRegExp(staleDate)}`));
});

test('只有默认分支时单独展示默认分支', async t => {
	const repo = await createTempGitRepository(t);
	const recentDate = formatDate(addDays(startOfLocalDay(new Date()), -10));
	await repo.commitFile({
		date: recentDate,
		message: 'main 提交',
		filePath: 'main.txt',
		content: 'main\n'
	});

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--last',
		'3650'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /^Default Branch$/m);
	assert.match(result.output, new RegExp(`current main\\s+${escapeRegExp(recentDate)}`));
	assert.match(result.output, /^Active Branches$/m);
	assert.match(result.output, /No active branches/);
	assert.match(result.output, /^Stale Branches$/m);
	assert.match(result.output, /No stale branches/);
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
		'2025-04-30'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Current branch:\s+HEAD/);
	assert.match(result.output, /Analysis branch:\s+HEAD/);
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
		'bob@example.com'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Author filter:\s*bob@example.com/);
	assert.match(result.output, /Bob/);
	assert.doesNotMatch(result.output, /Alice/);
});

test('默认输出多作者热点文件', async t => {
	const repo = await createTempGitRepository(t);
	const sharedPath = 'src/modules/reporting/deeply/nested/shared-hotspot-file.ts';
	await repo.commitFile({
		date: '2025-04-01',
		message: 'Alice 修改共享文件',
		filePath: sharedPath,
		content: 'one\n',
		authorName: 'Alice',
		authorEmail: 'alice@example.com'
	});
	await repo.commitFile({
		date: '2025-04-02',
		message: 'Bob 修改共享文件',
		filePath: sharedPath,
		content: 'one\ntwo\nthree\n',
		authorName: 'Bob',
		authorEmail: 'bob@example.com'
	});

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--from',
		'2025-04-01',
		'--to',
		'2025-04-30'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /File Hotspots/);
	assert.doesNotMatch(result.output, /Top Directories by Changed Lines/);
	assert.match(result.output, /Multi-author Hotspot Files/);
	assert.match(result.output, new RegExp(`${escapeRegExp(sharedPath)}\\s+━+\\s+2`));
});

test('仓库配置 language 为 zh 时输出中文文件热点', async t => {
	const repo = await createTempGitRepository(t);
	await repo.writeConfig(JSON.stringify({language: 'zh'}));
	await repo.commitFile({
		date: '2025-04-01',
		message: '无扩展名文件',
		filePath: 'LICENSE',
		content: 'license\n',
		authorName: 'Alice',
		authorEmail: 'alice@example.com'
	});

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--from',
		'2025-04-01',
		'--to',
		'2025-04-30'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /文件热点/);
	assert.match(result.output, /改动最多的文件类型/);
	assert.match(result.output, /无扩展名/);
});

test('仓库配置 excludePatterns 会排除统计文件、目录和通配符命中项', async t => {
	const repo = await createTempGitRepository(t);
	await repo.writeConfig(JSON.stringify({
		excludePatterns: [
			'package-lock.json',
			'dist/',
			'*.generated.ts'
		]
	}));
	await repo.commitFile({
		date: '2025-04-01',
		message: '源码提交',
		filePath: 'src/app.ts',
		content: 'one\n',
		authorName: 'Source Author',
		authorEmail: 'source@example.com'
	});
	await repo.commitFile({
		date: '2025-04-02',
		message: '锁文件提交',
		filePath: 'package-lock.json',
		content: '{"lockfileVersion": 3}\n',
		authorName: 'Lock Author',
		authorEmail: 'lock@example.com'
	});
	await repo.commitFile({
		date: '2025-04-03',
		message: '构建产物提交',
		filePath: 'dist/app.js',
		content: 'console.log("built");\n',
		authorName: 'Dist Author',
		authorEmail: 'dist@example.com'
	});
	await repo.commitFile({
		date: '2025-04-04',
		message: '生成文件提交',
		filePath: 'client.generated.ts',
		content: 'export const generated = true;\n',
		authorName: 'Generated Author',
		authorEmail: 'generated@example.com'
	});

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--from',
		'2025-04-01',
		'--to',
		'2025-04-30'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Source Author/);
	assert.match(result.output, /src\/app\.ts/);
	assert.doesNotMatch(result.output, /Lock Author/);
	assert.doesNotMatch(result.output, /Dist Author/);
	assert.doesNotMatch(result.output, /Generated Author/);
	assert.doesNotMatch(result.output, /package-lock\.json/);
	assert.doesNotMatch(result.output, /dist\/app\.js/);
	assert.doesNotMatch(result.output, /client\.generated\.ts/);
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
		'--me'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Current user:\s*Bob <bob@example.com>/);
	assert.match(result.output, /Your rank/);
	assert.match(result.output, /you Bob/);
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
	assert.match(result.output, /Could not read the current Git configured user/);
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
	assert.match(result.output, /No matching commit data in the current date range/);
	assert.doesNotMatch(result.output, /Ranking/);
});

test('支持 --html 按指定路径生成英文报告', async t => {
	const repo = await createRepositoryWithHistory(t);
	const outputDir = await mkdtemp(path.join(tmpdir(), 'git-insight-html-'));
	const outputPath = path.join(outputDir, 'report.html');
	t.after(async () => {
		await rm(outputDir, {recursive: true, force: true});
	});

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--month',
		'2025-04',
		'--html',
		'--path',
		outputPath
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, new RegExp(`HTML report written to ${escapeRegExp(outputPath)}`));

	const html = await readFile(outputPath, 'utf8');
	assert.match(html, /<html lang="en">/);
	assert.match(html, /Git Repository Analysis Report/);
	assert.match(html, new RegExp(escapeRegExp(repo.name)));
	assert.match(html, /Author Rankings/);
	assert.match(html, /File Hotspots/);
	assert.match(html, /Top Files by Changed Lines/);
	assert.match(html, /class="hotspot-grid"/);
	assert.match(html, /src\/b\.txt/);
	assert.match(html, /title="src\/b\.txt"/);
	assert.match(html, /title="Alice &lt;alice@example\.com&gt;"/);
	assert.match(html, new RegExp(`title="${escapeRegExp(repo.name)}"`));
	assert.match(html, /Commit Count Ranking/);
	assert.match(html, /Alice/);
	assert.match(html, /Bob/);
	assert.match(html, /heatmap-months/);
});

test('支持 --html 不指定 --path 时生成到仓库根目录', async t => {
	const repo = await createRepositoryWithHistory(t);
	const outputPath = path.join(await realpath(repo.path), 'git-insight-report.html');

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--month',
		'2025-04',
		'--html'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, new RegExp(`HTML report written to ${escapeRegExp(outputPath)}`));

	const html = await readFile(outputPath, 'utf8');
	assert.match(html, /Git Repository Analysis Report/);
	assert.match(html, /Date Range/);
});

test('仓库配置 language 为 zh 时 --html 生成中文报告', async t => {
	const repo = await createRepositoryWithHistory(t);
	await repo.writeConfig(JSON.stringify({language: 'zh'}));
	const outputDir = await mkdtemp(path.join(tmpdir(), 'git-insight-html-zh-'));
	const outputPath = path.join(outputDir, '中文报告.html');
	t.after(async () => {
		await rm(outputDir, {recursive: true, force: true});
	});

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--month',
		'2025-04',
		'--html',
		'--path',
		outputPath
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, new RegExp(`HTML 报告已生成：${escapeRegExp(outputPath)}`));

	const html = await readFile(outputPath, 'utf8');
	assert.match(html, /<html lang="zh-CN">/);
	assert.match(html, /Git 仓库分析报告/);
	assert.match(html, /文件热点/);
	assert.match(html, /作者排行榜/);
	assert.match(html, /提交数排行榜/);
	assert.doesNotMatch(html, /Repository/);
});

test('--html 分析非 Git 目录时不生成报告', async t => {
	const dirPath = await mkdtemp(path.join(tmpdir(), 'git-insight-not-repo-'));
	const outputDir = await mkdtemp(path.join(tmpdir(), 'git-insight-html-error-'));
	const outputPath = path.join(outputDir, 'report.html');
	t.after(async () => {
		await rm(dirPath, {recursive: true, force: true});
		await rm(outputDir, {recursive: true, force: true});
	});

	const result = await runGitInsight(t, [
		'--repo',
		dirPath,
		'--html',
		'--path',
		outputPath
	]);

	assert.equal(result.exitCode, 1, result.output);
	assert.match(result.output, /Not a Git repository/);
	await assert.rejects(() => readFile(outputPath, 'utf8'), /ENOENT/);
});

test('非 Git 目录会返回可读错误', async t => {
	const dirPath = await mkdtemp(path.join(tmpdir(), 'git-insight-not-repo-'));
	t.after(async () => {
		await rm(dirPath, {recursive: true, force: true});
	});

	const result = await runGitInsight(t, ['--repo', dirPath]);

	assert.equal(result.exitCode, 1, result.output);
	assert.match(result.output, /Not a Git repository/);
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
	assert.match(result.output, /Branch not found: missing-branch/);
});

test('参数组合非法时返回可读错误', async t => {
	const result = await runGitInsight(t, ['--last', '7', '--month', '2025-04']);

	assert.equal(result.exitCode, 1, result.output);
	assert.match(result.output, /Specify only one of --last, --year, and --month/);
});

test('未知参数默认返回英文错误', async t => {
	const result = await runGitInsight(t, ['--since']);

	assert.equal(result.exitCode, 1, result.output);
	assert.match(result.output, /error: unknown option '--since'/);
	assert.doesNotMatch(result.output, /错误：未知选项/);
});

test('移除的显示开关会返回未知参数错误', async t => {
	const result = await runGitInsight(t, ['--no-heatmap']);

	assert.equal(result.exitCode, 1, result.output);
	assert.match(result.output, /error: unknown option '--no-heatmap'/);
	assert.doesNotMatch(result.output, /错误：未知选项/);
});

test('帮助命令输出关键参数说明', async t => {
	const result = await runGitInsight(t, ['--help']);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, /Usage:/);
	assert.match(result.output, /Options:/);
	assert.match(result.output, /--repo <path>/);
	assert.match(result.output, /--from <date>/);
	assert.match(result.output, /--me/);
});

test('仓库配置 language 为 zh 时输出中文界面', async t => {
	const repo = await createRepositoryWithHistory(t);
	await repo.writeConfig(JSON.stringify({language: 'zh'}));

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--month',
		'2025-04'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, new RegExp(`仓库：\\s*${escapeRegExp(repo.name)}`));
	assert.match(result.output, /当前分支:\s+main/);
	assert.match(result.output, /分析分支:\s+main/);
	assert.match(result.output, /统计范围：\s*2025-04/);
	assert.match(result.output, /提交数排行榜/);
	assert.doesNotMatch(result.output, /Repository:/);
});

test('仓库配置 language 为 en 时输出英文界面', async t => {
	const repo = await createRepositoryWithHistory(t);
	await repo.writeConfig(JSON.stringify({language: 'en'}));

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--month',
		'2025-04'
	]);

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, new RegExp(`Repository:\\s*${escapeRegExp(repo.name)}`));
	assert.match(result.output, /Current branch:\s+main/);
	assert.match(result.output, /Date range:\s*2025-04/);
	assert.doesNotMatch(result.output, /仓库：/);
});

test('用户主目录配置 language 为 zh 时输出中文界面', async t => {
	const repo = await createRepositoryWithHistory(t);

	const result = await runGitInsight(t, [
		'--repo',
		repo.path,
		'--month',
		'2025-04'
	], {
		homeConfig: JSON.stringify({language: 'zh'})
	});

	assert.equal(result.exitCode, 0, result.output);
	assert.match(result.output, new RegExp(`仓库：\\s*${escapeRegExp(repo.name)}`));
	assert.match(result.output, /当前分支:\s+main/);
	assert.match(result.output, /提交数排行榜/);
	assert.doesNotMatch(result.output, /Repository:/);
});

test('中文配置下帮助和未知参数输出中文', async t => {
	const repo = await createTempGitRepository(t);
	await repo.writeConfig(JSON.stringify({language: 'zh'}));

	const help = await runGitInsight(t, ['--repo', repo.path, '--help']);
	assert.equal(help.exitCode, 0, help.output);
	assert.match(help.output, /用法：/);
	assert.match(help.output, /选项：/);

	const unknownOption = await runGitInsight(t, ['--repo', repo.path, '--since']);
	assert.equal(unknownOption.exitCode, 1, unknownOption.output);
	assert.match(unknownOption.output, /错误：未知选项 '--since'/);
	assert.doesNotMatch(unknownOption.output, /error: unknown option/);
});

test('非法 language 配置会返回可读错误', async t => {
	const repo = await createTempGitRepository(t);
	await repo.writeConfig(JSON.stringify({language: 'ja'}));

	const result = await runGitInsight(t, ['--repo', repo.path, '--help']);

	assert.equal(result.exitCode, 1, result.output);
	assert.match(result.output, /Git Insight config language must be "en" or "zh"/);
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
		'team@example.com'
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

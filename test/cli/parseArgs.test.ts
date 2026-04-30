import {strict as assert} from 'node:assert';
import test from 'node:test';
import {createCustomDateRange, parseArgs} from '../../src/cli/parseArgs.js';

const argv = (...args: string[]): string[] => ['node', 'git-insight', ...args];

test('parseArgs 使用默认范围和显示开关', () => {
	const options = parseArgs(argv());

	assert.equal(options.rangeRequest.kind, 'fixed');
	assert.equal(options.heatmap, true);
	assert.equal(options.ranking, true);
	assert.equal(options.branchActivity, true);
	assert.equal(options.me, undefined);
	assert.equal(options.rangeRequest.range.kind, 'since');
	assert.equal(options.rangeRequest.range.label, 'last 365 days');
	assert.equal(options.rangeRequest.range.dayCount, 365);
});

test('parseArgs 解析合法时间范围', () => {
	const last = parseArgs(argv('--last', '7'));
	assert.equal(last.rangeRequest.kind, 'fixed');
	assert.equal(last.rangeRequest.range.label, 'last 7 days');
	assert.equal(last.rangeRequest.range.dayCount, 7);

	const year = parseArgs(argv('--year', '2025'));
	assert.equal(year.rangeRequest.kind, 'fixed');
	assert.equal(year.rangeRequest.range.startDate, '2025-01-01');
	assert.equal(year.rangeRequest.range.endDate, '2025-12-31');

	const month = parseArgs(argv('--month', '2025-04'));
	assert.equal(month.rangeRequest.kind, 'fixed');
	assert.equal(month.rangeRequest.range.startDate, '2025-04-01');
	assert.equal(month.rangeRequest.range.endDate, '2025-04-30');

	const custom = parseArgs(argv('--from', '2025-04-01', '--to', '2025-04-30'));
	assert.equal(custom.rangeRequest.kind, 'custom');
	assert.equal(custom.rangeRequest.from?.startDate, '2025-04-01');
	assert.equal(custom.rangeRequest.to?.endDate, '2025-04-30');
});

test('parseArgs 解析仓库、作者、分支和显示关闭参数', () => {
	const options = parseArgs(argv(
		'--repo',
		'fixtures/repo',
		'--branch',
		'feature/report',
		'--author',
		'alice',
		'--no-heatmap',
		'--no-ranking',
		'--no-branch-activity'
	));

	assert.match(options.repo, /fixtures\/repo$/);
	assert.equal(options.branch, 'feature/report');
	assert.equal(options.author, 'alice');
	assert.equal(options.heatmap, false);
	assert.equal(options.ranking, false);
	assert.equal(options.branchActivity, false);
});

test('parseArgs 拒绝非法日期和互斥参数', () => {
	assert.throws(() => parseArgs(argv('--last', '0')), /--last 必须是正整数/);
	assert.throws(() => parseArgs(argv('--last', '3651')), /--last 最大支持 3650 天/);
	assert.throws(() => parseArgs(argv('--month', '2025-13')), /月份必须在 01 到 12 之间/);
	assert.throws(() => parseArgs(argv('--from', '2025-02-30')), /必须是存在的日期/);
	assert.throws(() => parseArgs(argv('--last', '7', '--year', '2025')), /--last、--year、--month 只能指定一个/);
	assert.throws(() => parseArgs(argv('--month', '2025-04', '--from', '2025-04-01')), /--from\/--to 不能和 --last、--year、--month 同时使用/);
	assert.throws(() => parseArgs(argv('--from', '2025', '--to', '2025-04')), /--from 和 --to 同时使用时必须采用相同格式/);
	assert.throws(() => parseArgs(argv('--author', 'alice', '--me')), /--author 和 --me 只能指定一个/);
});

test('createCustomDateRange 处理自定义范围边界', () => {
	const range = createCustomDateRange({
		kind: 'custom',
		from: {
			raw: '2025-04-01',
			precision: 'day',
			startDate: '2025-04-01',
			endDate: '2025-04-01'
		},
		to: {
			raw: '2025-04-30',
			precision: 'day',
			startDate: '2025-04-30',
			endDate: '2025-04-30'
		}
	});

	assert.equal(range.startDate, '2025-04-01');
	assert.equal(range.endDate, '2025-04-30');
	assert.equal(range.dayCount, 30);
	assert.throws(() => createCustomDateRange({
		kind: 'custom',
		from: {
			raw: '2025-05-01',
			precision: 'day',
			startDate: '2025-05-01',
			endDate: '2025-05-01'
		},
		to: {
			raw: '2025-04-30',
			precision: 'day',
			startDate: '2025-04-30',
			endDate: '2025-04-30'
		}
	}), /--from 不能晚于 --to/);
});

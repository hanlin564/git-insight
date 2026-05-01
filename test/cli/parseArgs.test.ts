import {strict as assert} from 'node:assert';
import path from 'node:path';
import test from 'node:test';
import {createCustomDateRange, parseArgs} from '../../src/cli/parseArgs.js';

const argv = (...args: string[]): string[] => ['node', 'git-insight', ...args];

test('parseArgs 使用默认范围', () => {
	const options = parseArgs(argv());

	assert.equal(options.rangeRequest.kind, 'fixed');
	assert.equal(options.me, undefined);
	assert.equal(options.language, 'en');
	assert.equal(options.rangeRequest.range.kind, 'since');
	assert.equal(options.rangeRequest.range.label, 'Last 365 days');
	assert.equal(options.rangeRequest.range.dayCount, 365);
});

test('parseArgs 解析合法时间范围', () => {
	const last = parseArgs(argv('--last', '7'));
	assert.equal(last.rangeRequest.kind, 'fixed');
	assert.equal(last.rangeRequest.range.label, 'Last 7 days');
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

test('parseArgs 解析仓库、作者和分支参数', () => {
	const options = parseArgs(argv(
		'--repo',
		'fixtures/repo',
		'--branch',
		'feature/report',
		'--author',
		'alice'
	));

	assert.equal(options.repo, path.resolve('fixtures/repo'));
	assert.equal(options.branch, 'feature/report');
	assert.equal(options.author, 'alice');
});

test('parseArgs 拒绝非法日期和互斥参数', () => {
	assert.throws(() => parseArgs(argv('--last', '0')), /--last must be a positive integer/);
	assert.throws(() => parseArgs(argv('--last', '3651')), /--last supports at most 3650 days/);
	assert.throws(() => parseArgs(argv('--month', '2025-13')), /month must be between 01 and 12/);
	assert.throws(() => parseArgs(argv('--from', '2025-02-30')), /must be an existing date/);
	assert.throws(() => parseArgs(argv('--last', '7', '--year', '2025')), /Specify only one of --last, --year, and --month/);
	assert.throws(() => parseArgs(argv('--month', '2025-04', '--from', '2025-04-01')), /--from\/--to cannot be used with --last, --year, or --month/);
	assert.throws(() => parseArgs(argv('--from', '2025', '--to', '2025-04')), /--from and --to must use the same format/);
	assert.throws(() => parseArgs(argv('--author', 'alice', '--me')), /Specify only one of --author and --me/);
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
	}), /--from cannot be later than --to/);
});

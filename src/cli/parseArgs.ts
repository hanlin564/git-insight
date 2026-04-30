import path from 'node:path';
import {Command, Help, type Argument, type Option} from 'commander';
import {loadGitInsightLanguageSync} from '../config/gitInsightConfig.js';
import {DEFAULT_LANGUAGE, getMessages, type SupportedLanguage} from '../i18n.js';
import {addDays, formatDate, getDaysBetween, startOfLocalDay, type DateRange} from '../utils/date.js';

const MAX_SINCE_DAYS = 3650;

export type RangeRequest =
	| {kind: 'fixed'; range: DateRange}
	| {kind: 'custom'; from?: DateInput; to?: DateInput};

export type DateInput = {
	raw: string;
	precision: 'year' | 'month' | 'day';
	startDate: string;
	endDate: string;
};

export type CliOptions = {
	repo: string;
	rangeRequest: RangeRequest;
	branch?: string;
	author?: string;
	me: boolean;
	language: SupportedLanguage;
};

const parsePositiveInteger = (value: string, optionName: string, language: SupportedLanguage): number => {
	const parsed = Number.parseInt(value, 10);
	if (!/^\d+$/.test(value) || !Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(getMessages(language).cli.errors.positiveInteger(optionName));
	}

	return parsed;
};

const parseSinceRange = (value: string, language: SupportedLanguage): DateRange => {
	const last = parsePositiveInteger(value, '--last', language);
	if (last > MAX_SINCE_DAYS) {
		throw new Error(getMessages(language).cli.errors.maxLastDays(MAX_SINCE_DAYS));
	}

	const end = startOfLocalDay(new Date());
	const start = addDays(end, -(last - 1));

	return {
		kind: 'since',
		startDate: formatDate(start),
		endDate: formatDate(end),
		label: getMessages(language).date.lastDays(last),
		dayCount: last
	};
};

const parseYearRange = (value: string, language: SupportedLanguage): DateRange => {
	const input = parseDateInput(value, '--year', language);
	if (input.precision !== 'year') {
		throw new Error(getMessages(language).cli.errors.yearFormat);
	}

	const {startDate, endDate} = input;

	return {
		kind: 'year',
		startDate,
		endDate,
		label: input.raw,
		dayCount: getDaysBetween(startDate, endDate) + 1
	};
};

const parseMonthRange = (value: string, language: SupportedLanguage): DateRange => {
	const input = parseDateInput(value, '--month', language);
	if (input.precision !== 'month') {
		throw new Error(getMessages(language).cli.errors.monthFormat);
	}

	const {startDate, endDate} = input;

	return {
		kind: 'month',
		startDate,
		endDate,
		label: input.raw,
		dayCount: getDaysBetween(startDate, endDate) + 1
	};
};

const parseRangeRequest = (values: {
	last?: string;
	year?: string;
	month?: string;
	from?: string;
	to?: string;
}, language: SupportedLanguage): RangeRequest => {
	const t = getMessages(language);
	const fixedValues = [values.last, values.year, values.month].filter(value => value !== undefined);
	const hasCustomRange = values.from !== undefined || values.to !== undefined;

	if (fixedValues.length > 1) {
		throw new Error(t.cli.errors.fixedRangeConflict);
	}

	if (hasCustomRange && fixedValues.length > 0) {
		throw new Error(t.cli.errors.customRangeConflict);
	}

	if (hasCustomRange) {
		const from = values.from === undefined ? undefined : parseDateInput(String(values.from), '--from', language);
		const to = values.to === undefined ? undefined : parseDateInput(String(values.to), '--to', language);

		if (from && to && from.precision !== to.precision) {
			throw new Error(t.cli.errors.customRangeSamePrecision);
		}

		return {kind: 'custom', from, to};
	}

	if (values.year !== undefined) {
		return {kind: 'fixed', range: parseYearRange(String(values.year), language)};
	}

	if (values.month !== undefined) {
		return {kind: 'fixed', range: parseMonthRange(String(values.month), language)};
	}

	return {kind: 'fixed', range: parseSinceRange(String(values.last ?? '365'), language)};
};

export function createCustomDateRange(
	request: Extract<RangeRequest, {kind: 'custom'}>,
	fallbackStartDate?: string,
	language: SupportedLanguage = DEFAULT_LANGUAGE
): DateRange {
	const t = getMessages(language);
	const startDate = request.from?.startDate ?? fallbackStartDate;
	const endDate = request.to?.endDate ?? formatDate(startOfLocalDay(new Date()));

	if (!startDate) {
		return {
			kind: 'custom',
			startDate: endDate,
			endDate,
			label: getCustomRangeLabel(request, language),
			dayCount: 0
		};
	}

	const dayCount = getDaysBetween(startDate, endDate) + 1;
	if (dayCount <= 0) {
		throw new Error(t.cli.errors.fromAfterTo);
	}

	if (dayCount > MAX_SINCE_DAYS) {
		throw new Error(t.cli.errors.maxRangeDays(MAX_SINCE_DAYS));
	}

	return {
		kind: 'custom',
		startDate,
		endDate,
		label: getCustomRangeLabel(request, language),
		dayCount
	};
}

function parseDateInput(value: string, optionName: string, language: SupportedLanguage): DateInput {
	const t = getMessages(language);

	if (/^\d{4}$/.test(value)) {
		return {
			raw: value,
			precision: 'year',
			startDate: `${value}-01-01`,
			endDate: `${value}-12-31`
		};
	}

	const monthMatch = /^(\d{4})-(\d{2})$/.exec(value);
	if (monthMatch) {
		const year = Number.parseInt(monthMatch[1] ?? '', 10);
		const month = Number.parseInt(monthMatch[2] ?? '', 10);
		if (month < 1 || month > 12) {
			throw new Error(t.cli.errors.monthOutOfRange(optionName));
		}

		return {
			raw: value,
			precision: 'month',
			startDate: formatDate(new Date(year, month - 1, 1)),
			endDate: formatDate(new Date(year, month, 0))
		};
	}

	const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (dayMatch) {
		const year = Number.parseInt(dayMatch[1] ?? '', 10);
		const month = Number.parseInt(dayMatch[2] ?? '', 10);
		const day = Number.parseInt(dayMatch[3] ?? '', 10);
		const date = new Date(year, month - 1, day);
		const formatted = formatDate(date);

		if (formatted !== value) {
			throw new Error(t.cli.errors.invalidDate(optionName));
		}

		return {
			raw: value,
			precision: 'day',
			startDate: formatted,
			endDate: formatted
		};
	}

	throw new Error(t.cli.errors.dateFormat(optionName));
}

function getCustomRangeLabel(request: Extract<RangeRequest, {kind: 'custom'}>, language: SupportedLanguage): string {
	const t = getMessages(language).date;
	return `${request.from?.raw ?? t.firstCommit}..${request.to?.raw ?? t.today}`;
}

export function parseArgs(argv = process.argv): CliOptions {
	const language = getConfiguredLanguageFromArgv(argv);
	const t = getMessages(language);
	const program = new Command();

	program
		.name('git-insight')
		.description(t.cli.description)
		.configureHelp({
			optionDescription: option => describeOption(option, language),
			argumentDescription: argument => describeArgument(argument, language),
			formatHelp: (command, helper) => formatHelp(command, helper, language)
		})
		.configureOutput({
			outputError: (text, write) => {
				write(t.cli.commanderError(text));
			}
		})
		.helpOption('-h, --help', t.cli.helpOption)
		.option('--last <days>', t.cli.options.last)
		.option('--year <yyyy>', t.cli.options.year)
		.option('--month <yyyy-MM>', t.cli.options.month)
		.option('--from <date>', t.cli.options.from)
		.option('--to <date>', t.cli.options.to)
		.option('--branch <name>', t.cli.options.branch)
		.option('--repo <path>', t.cli.options.repo, process.cwd())
		.option('--author <query>', t.cli.options.author)
		.option('--me', t.cli.options.me)
		.addHelpText('after', t.cli.helpText(MAX_SINCE_DAYS));

	program.parse(argv);
	const values = program.opts();
	if (values.author && values.me) {
		throw new Error(t.cli.errors.authorMeConflict);
	}

	return {
		repo: path.resolve(String(values.repo)),
		rangeRequest: parseRangeRequest(values, language),
		branch: values.branch,
		author: values.author,
		me: values.me,
		language
	};
}

export function getConfiguredLanguageFromArgv(argv = process.argv): SupportedLanguage {
	return loadGitInsightLanguageSync(getRepositoryPathFromArgv(argv));
}

const defaultHelp = new Help();

function describeOption(option: Option, language: SupportedLanguage): string {
	return translateHelpExtra(defaultHelp.optionDescription(option), language);
}

function describeArgument(argument: Argument, language: SupportedLanguage): string {
	return translateHelpExtra(defaultHelp.argumentDescription(argument), language);
}

function translateHelpExtra(value: string, language: SupportedLanguage): string {
	const extras = getMessages(language).cli.helpExtras;
	return value
		.replace(/\bchoices: /g, extras.choices)
		.replace(/\bdefault: /g, extras.default)
		.replace(/\bpreset: /g, extras.preset)
		.replace(/\benv: /g, extras.env);
}

function formatHelp(command: Command, helper: Help, language: SupportedLanguage): string {
	const headers = getMessages(language).cli.helpHeaders;
	const termWidth = helper.padWidth(command, helper);
	const helpWidth = helper.helpWidth ?? 80;
	const itemIndentWidth = 2;
	const itemSeparatorWidth = 2;
	const formatItem = (term: string, description: string): string => {
		if (!description) {
			return term;
		}

		const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
		return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
	};
	const formatList = (items: string[]): string => items.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth));

	let output = [`${headers.usage}${helper.commandUsage(command)}`, ''];

	const commandDescription = helper.commandDescription(command);
	if (commandDescription.length > 0) {
		output = output.concat([helper.wrap(commandDescription, helpWidth, 0), '']);
	}

	const argumentList = helper.visibleArguments(command).map(argument =>
		formatItem(helper.argumentTerm(argument), helper.argumentDescription(argument))
	);
	if (argumentList.length > 0) {
		output = output.concat([headers.arguments, formatList(argumentList), '']);
	}

	const optionList = helper.visibleOptions(command).map(option =>
		formatItem(helper.optionTerm(option), helper.optionDescription(option))
	);
	if (optionList.length > 0) {
		output = output.concat([headers.options, formatList(optionList), '']);
	}

	if (helper.showGlobalOptions) {
		const globalOptionList = helper.visibleGlobalOptions(command).map(option =>
			formatItem(helper.optionTerm(option), helper.optionDescription(option))
		);
		if (globalOptionList.length > 0) {
			output = output.concat([headers.globalOptions, formatList(globalOptionList), '']);
		}
	}

	const commandList = helper.visibleCommands(command).map(visibleCommand =>
		formatItem(helper.subcommandTerm(visibleCommand), helper.subcommandDescription(visibleCommand))
	);
	if (commandList.length > 0) {
		output = output.concat([headers.commands, formatList(commandList), '']);
	}

	return output.join('\n');
}

function getRepositoryPathFromArgv(argv: string[]): string {
	const args = argv.slice(2);

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--repo') {
			return path.resolve(args[index + 1] ?? process.cwd());
		}

		if (arg?.startsWith('--repo=')) {
			return path.resolve(arg.slice('--repo='.length));
		}
	}

	return process.cwd();
}

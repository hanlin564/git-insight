#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import {getConfiguredLanguageFromArgv, parseArgs} from './cli/parseArgs.js';
import {collectRepositoryStats} from './analysis/collectRepositoryStats.js';
import {App} from './ui/App.js';
import {DEFAULT_LANGUAGE, getMessages, type SupportedLanguage} from './i18n.js';

async function main() {
	let language: SupportedLanguage = DEFAULT_LANGUAGE;

	try {
		language = getConfiguredLanguageFromArgv();
		const options = parseArgs();
		language = options.language;
		const result = await collectRepositoryStats(options);

		if (!result.ok) {
			process.exitCode = 1;
		}

		render(<App options={options} result={result} />);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(getMessages(language).fatalError(message));
		process.exitCode = 1;
	}
}

main();

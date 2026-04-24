#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import {parseArgs} from './cli/parseArgs.js';
import {collectRepositoryStats} from './analysis/collectRepositoryStats.js';
import {App} from './ui/App.js';

async function main() {
	const options = parseArgs();
	const result = await collectRepositoryStats(options);

	render(<App options={options} result={result} />);
}

main().catch(error => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`Git Insight failed: ${message}`);
	process.exitCode = 1;
});

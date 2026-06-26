#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import {App} from './ui/App.js';

if (process.argv.length > 2) {
	console.error('show-my-git-data 不需要任何参数，请直接运行：show-my-git-data');
	process.exitCode = 1;
} else {
	render(<App rootPath={process.cwd()} />);
}

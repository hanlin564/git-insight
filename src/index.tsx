#!/usr/bin/env node
import path from 'node:path';
import React from 'react';
import {render} from 'ink';
import {App} from './ui/App.js';

const inputPaths = process.argv.slice(2);
const rootPaths = inputPaths.length === 0
	? [process.cwd()]
	: inputPaths.map(inputPath => path.resolve(process.cwd(), inputPath));

render(<App rootPaths={rootPaths} />);

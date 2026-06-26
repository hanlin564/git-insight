import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execa} from 'execa';
import type {TestContext} from 'node:test';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const cliEntry = path.join(projectRoot, 'dist/index.js');

export type CliRunResult = {
	exitCode: number;
	output: string;
};

type RunGitInsightOptions = {
	cwd?: string;
	globalUser?: {
		name?: string;
		email?: string;
	};
};

export async function runGitInsight(
	t: TestContext,
	args: string[],
	options: RunGitInsightOptions = {}
): Promise<CliRunResult> {
	const homePath = await mkdtemp(path.join(os.tmpdir(), 'show-my-git-data-home-'));
	const xdgConfigHomePath = path.join(homePath, '.config');
	t.after(async () => {
		await rm(homePath, {recursive: true, force: true});
	});

	if (options.globalUser) {
		await writeFile(
			path.join(homePath, '.gitconfig'),
			[
				'[user]',
				...(options.globalUser.name ? [`\tname = ${options.globalUser.name}`] : []),
				...(options.globalUser.email ? [`\temail = ${options.globalUser.email}`] : [])
			].join('\n') + '\n',
			'utf8'
		);
	}

	const result = await execa(process.execPath, [cliEntry, ...args], {
		cwd: options.cwd ?? projectRoot,
		extendEnv: false,
		reject: false,
		env: {
			CI: '1',
			FORCE_COLOR: '0',
			GIT_CONFIG_GLOBAL: path.join(homePath, '.gitconfig'),
			GIT_CONFIG_NOSYSTEM: '1',
			HOME: homePath,
			LANG: 'C',
			LC_ALL: 'C',
			NO_COLOR: '1',
			PATH: process.env.PATH ?? '',
			USERPROFILE: homePath,
			XDG_CONFIG_HOME: xdgConfigHomePath
		}
	});

	return {
		exitCode: result.exitCode ?? 0,
		output: stripAnsi(`${result.stdout}\n${result.stderr}`)
	};
}

function stripAnsi(value: string): string {
	return value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '').replace(/\r/g, '');
}

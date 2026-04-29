import {mkdtemp, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execa} from 'execa';
import type {TestContext} from 'node:test';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const cliEntry = path.join(projectRoot, 'src/index.tsx');

export type CliRunResult = {
	exitCode: number;
	output: string;
};

export async function runGitInsight(t: TestContext, args: string[]): Promise<CliRunResult> {
	const homePath = await mkdtemp(path.join(os.tmpdir(), 'git-insight-home-'));
	const xdgConfigHomePath = path.join(homePath, '.config');
	t.after(async () => {
		await rm(homePath, {recursive: true, force: true});
	});

	const result = await execa(process.execPath, ['--import', 'tsx', cliEntry, ...args], {
		cwd: projectRoot,
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

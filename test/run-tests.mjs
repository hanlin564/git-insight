import {readdir} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const testRoot = path.resolve('test');

const files = await collectTestFiles(testRoot);
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], {
	stdio: 'inherit'
});

process.exitCode = result.status ?? 1;

async function collectTestFiles(directory) {
	const entries = await readdir(directory, {withFileTypes: true});
	const files = [];

	for (const entry of entries) {
		const fullPath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...await collectTestFiles(fullPath));
			continue;
		}

		if (entry.isFile() && entry.name.endsWith('.test.ts')) {
			files.push(fullPath);
		}
	}

	return files.sort();
}

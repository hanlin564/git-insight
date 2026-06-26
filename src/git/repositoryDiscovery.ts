import {readdir} from 'node:fs/promises';
import path from 'node:path';

type RepositoryDiscoveryProgress = {
	phase: 'scanning';
	scannedDirectories?: number;
	repositoryCount: number;
	currentPath?: string;
};

const SKIPPED_DIRECTORIES = new Set([
	'.git',
	'node_modules',
	'dist',
	'.next',
	'.nuxt',
	'.cache',
	'.turbo'
]);

export async function discoverGitRepositories(
	rootPath: string,
	onProgress?: (progress: RepositoryDiscoveryProgress) => void
): Promise<string[]> {
	const repositories: string[] = [];
	const state = {scannedDirectories: 0};
	await walk(path.resolve(rootPath), repositories, state, onProgress);
	return repositories;
}

async function walk(
	directoryPath: string,
	repositories: string[],
	state: {scannedDirectories: number},
	onProgress?: (progress: RepositoryDiscoveryProgress) => void
): Promise<void> {
	state.scannedDirectories += 1;
	onProgress?.({
		phase: 'scanning',
		scannedDirectories: state.scannedDirectories,
		repositoryCount: repositories.length,
		currentPath: directoryPath
	});

	let entries;
	try {
		entries = await readdir(directoryPath, {withFileTypes: true});
	} catch {
		return;
	}

	if (entries.some(entry => entry.name === '.git' && (entry.isDirectory() || entry.isFile()))) {
		repositories.push(directoryPath);
		onProgress?.({
			phase: 'scanning',
			scannedDirectories: state.scannedDirectories,
			repositoryCount: repositories.length,
			currentPath: directoryPath
		});
		return;
	}

	for (const entry of entries) {
		if (!entry.isDirectory() || shouldSkipDirectory(entry.name)) {
			continue;
		}

		await walk(path.join(directoryPath, entry.name), repositories, state, onProgress);
	}
}

function shouldSkipDirectory(name: string): boolean {
	return SKIPPED_DIRECTORIES.has(name);
}

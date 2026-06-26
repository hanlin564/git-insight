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
	rootPaths: string | string[],
	onProgress?: (progress: RepositoryDiscoveryProgress) => void
): Promise<string[]> {
	const repositories: string[] = [];
	const seenRepositories = new Set<string>();
	const state = {scannedDirectories: 0};
	const resolvedRootPaths = normalizeRootPaths(rootPaths);

	for (const rootPath of resolvedRootPaths) {
		await walk(rootPath, repositories, seenRepositories, state, onProgress);
	}

	return repositories;
}

function normalizeRootPaths(rootPaths: string | string[]): string[] {
	const paths = Array.isArray(rootPaths) ? rootPaths : [rootPaths];
	return [...new Set(paths.map(rootPath => path.resolve(rootPath)))];
}

async function walk(
	directoryPath: string,
	repositories: string[],
	seenRepositories: Set<string>,
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
		if (!seenRepositories.has(directoryPath)) {
			seenRepositories.add(directoryPath);
			repositories.push(directoryPath);
		}

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

		await walk(path.join(directoryPath, entry.name), repositories, seenRepositories, state, onProgress);
	}
}

function shouldSkipDirectory(name: string): boolean {
	return SKIPPED_DIRECTORIES.has(name);
}

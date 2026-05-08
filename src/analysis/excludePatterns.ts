import ignore from 'ignore';
import type {CommitFileChange, CommitRecord} from '../git/types.js';

export function applyExcludePatterns(commits: CommitRecord[], patterns: string[] = []): CommitRecord[] {
	if (patterns.length === 0) {
		return commits;
	}

	const matcher = ignore().add(patterns);

	return commits
		.map(commit => filterCommit(commit, file => !matcher.ignores(toPosixPath(file.path))))
		.filter((commit): commit is CommitRecord => commit !== undefined);
}

function filterCommit(
	commit: CommitRecord,
	shouldKeepFile: (file: CommitFileChange) => boolean
): CommitRecord | undefined {
	const files = commit.files.filter(shouldKeepFile);

	if (files.length === 0) {
		return undefined;
	}

	const additions = files.reduce((total, file) => total + file.additions, 0);
	const deletions = files.reduce((total, file) => total + file.deletions, 0);

	return {
		...commit,
		additions,
		deletions,
		files
	};
}

function toPosixPath(filePath: string): string {
	return filePath.replaceAll('\\', '/');
}

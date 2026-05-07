import type {CommitFileChange, CommitRecord} from './types.js';

type MutableCommit = CommitRecord;

const commitFieldSeparator = '\x1f';

const parseNumstatValue = (value: string): number => {
	if (value === '-') {
		return 0;
	}

	return Number.parseInt(value, 10) || 0;
};

const parseCommitHeader = (line: string): MutableCommit | undefined => {
	const raw = line.replace('__COMMIT__', '').trimEnd();
	const [hash, authorName, authorEmail, date] = raw.split(commitFieldSeparator);

	if (!hash || !authorName || !date) {
		return undefined;
	}

	return {
		hash,
		authorName,
		authorEmail: authorEmail ?? '',
		date,
		additions: 0,
		deletions: 0,
		files: []
	};
};

const applyNumstat = (commit: MutableCommit, line: string): void => {
	const change = parseNumstatLine(line);

	if (!change) {
		return;
	}

	commit.additions += change.additions;
	commit.deletions += change.deletions;
	commit.files.push(change);
};

const parseNumstatLine = (line: string): CommitFileChange | undefined => {
	const normalizedLine = line.trimEnd();
	const tabParts = normalizedLine.split('\t');
	const [additions, deletions, ...pathParts] = tabParts.length >= 3
		? tabParts
		: parseWhitespaceSeparatedNumstat(normalizedLine);
	const filePath = normalizeNumstatPath(pathParts.join('\t').trim());

	if (!additions || !deletions || !filePath) {
		return undefined;
	}

	const parsedAdditions = parseNumstatValue(additions);
	const parsedDeletions = parseNumstatValue(deletions);

	return {
		path: filePath,
		additions: parsedAdditions,
		deletions: parsedDeletions,
		changedLines: parsedAdditions + parsedDeletions
	};
};

const parseWhitespaceSeparatedNumstat = (line: string): string[] => {
	const match = /^(\S+)\s+(\S+)\s+(.+)$/.exec(line);
	return match ? [match[1] ?? '', match[2] ?? '', match[3] ?? ''] : [];
};

const normalizeNumstatPath = (filePath: string): string => {
	if (!filePath.includes(' => ')) {
		return filePath;
	}

	return filePath.replace(/\{([^{}]+) => ([^{}]+)\}/g, '$2');
};

export function parseGitLogWithNumstat(output: string): CommitRecord[] {
	const commits: CommitRecord[] = [];
	let current: MutableCommit | undefined;

	for (const line of output.split('\n')) {
		if (line.startsWith('__COMMIT__')) {
			current = parseCommitHeader(line);
			if (current) {
				commits.push(current);
			}
			continue;
		}

		if (current && line.trim()) {
			applyNumstat(current, line);
		}
	}

	return commits;
}

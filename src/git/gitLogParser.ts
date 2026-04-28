import type {CommitRecord} from './types.js';

type MutableCommit = CommitRecord;

const commitFieldSeparator = '\x1f';

const parseNumstatValue = (value: string): number => {
	if (value === '-') {
		return 0;
	}

	return Number.parseInt(value, 10) || 0;
};

const parseCommitHeader = (line: string): MutableCommit | undefined => {
	const raw = line.replace('__COMMIT__', '');
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
		deletions: 0
	};
};

const applyNumstat = (commit: MutableCommit, line: string): void => {
	const [additions, deletions] = line.trim().split(/\s+/, 3);

	if (!additions || !deletions) {
		return;
	}

	commit.additions += parseNumstatValue(additions);
	commit.deletions += parseNumstatValue(deletions);
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

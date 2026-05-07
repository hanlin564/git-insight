import path from 'node:path';
import type {CommitRecord, FileHotspotStat, FileHotspotStats} from '../git/types.js';
import type {SupportedLanguage} from '../i18n.js';
import {getMessages} from '../i18n.js';
import type {AuthorIdentityQuery, AuthorIdentityResolver} from './authorIdentity.js';

const DEFAULT_HOTSPOT_LIMIT = 10;

type MutableFileHotspotStat = Omit<FileHotspotStat, 'authorCount' | 'commitCount'> & {
	authors: Set<string>;
	commits: Set<string>;
};

export function collectFileHotspotStats(
	commits: CommitRecord[],
	authorResolver: AuthorIdentityResolver,
	language: SupportedLanguage,
	authorQuery?: string,
	currentUser?: AuthorIdentityQuery,
	limit = DEFAULT_HOTSPOT_LIMIT
): FileHotspotStats {
	const topFiles = new Map<string, MutableFileHotspotStat>();
	const topExtensions = new Map<string, MutableFileHotspotStat>();
	const noExtensionLabel = getMessages(language).ui.noExtension;

	for (const commit of commits) {
		if (currentUser && !authorResolver.matchesIdentity(commit, currentUser)) {
			continue;
		}

		if (!authorResolver.matches(commit, authorQuery)) {
			continue;
		}

		const author = authorResolver.resolve(commit);

		for (const file of commit.files) {
			addChange(topFiles, file.path, commit.hash, author.key, file.additions, file.deletions);
			addChange(topExtensions, getExtensionLabel(file.path, noExtensionLabel), commit.hash, author.key, file.additions, file.deletions);
		}
	}

	return {
		topFiles: rankHotspots(topFiles, limit),
		topExtensions: rankHotspots(topExtensions, limit),
		multiAuthorFiles: rankMultiAuthorHotspots(topFiles, limit)
	};
}

function addChange(
	stats: Map<string, MutableFileHotspotStat>,
	label: string,
	commitHash: string,
	authorKey: string,
	additions: number,
	deletions: number
): void {
	const current = stats.get(label) ?? {
		label,
		changedLines: 0,
		additions: 0,
		deletions: 0,
		authors: new Set<string>(),
		commits: new Set<string>()
	};

	current.additions += additions;
	current.deletions += deletions;
	current.changedLines = current.additions + current.deletions;
	current.authors.add(authorKey);
	current.commits.add(commitHash);
	stats.set(label, current);
}

function rankHotspots(
	stats: Map<string, MutableFileHotspotStat>,
	limit: number,
	filter: (stat: MutableFileHotspotStat) => boolean = () => true
): FileHotspotStat[] {
	return [...stats.values()]
		.filter(filter)
		.map(toFileHotspotStat)
		.sort(compareHotspots)
		.slice(0, limit);
}

function rankMultiAuthorHotspots(
	stats: Map<string, MutableFileHotspotStat>,
	limit: number
): FileHotspotStat[] {
	return [...stats.values()]
		.filter(stat => stat.authors.size >= 2 && stat.commits.size >= 2)
		.map(toFileHotspotStat)
		.sort(compareMultiAuthorHotspots)
		.slice(0, limit);
}

function toFileHotspotStat(stat: MutableFileHotspotStat): FileHotspotStat {
	return {
		label: stat.label,
		changedLines: stat.changedLines,
		additions: stat.additions,
		deletions: stat.deletions,
		commitCount: stat.commits.size,
		authorCount: stat.authors.size
	};
}

function compareHotspots(a: FileHotspotStat, b: FileHotspotStat): number {
	return b.changedLines - a.changedLines
		|| b.authorCount - a.authorCount
		|| b.commitCount - a.commitCount
		|| a.label.localeCompare(b.label);
}

function compareMultiAuthorHotspots(a: FileHotspotStat, b: FileHotspotStat): number {
	return b.authorCount - a.authorCount
		|| b.changedLines - a.changedLines
		|| b.commitCount - a.commitCount
		|| a.label.localeCompare(b.label);
}

function getExtensionLabel(filePath: string, noExtensionLabel: string): string {
	const extension = path.posix.extname(filePath).toLowerCase();
	return extension || noExtensionLabel;
}

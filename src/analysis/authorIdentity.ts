import type {CommitRecord} from '../git/types.js';
import {matchesText} from '../utils/text.js';
import type {AuthorAliasLookup} from './authorAliases.js';

export type AuthorIdentityQuery = {
	name?: string;
	email?: string;
};

export type ResolvedAuthorIdentity = {
	authorName: string;
	authorEmail: string;
	key: string;
	searchNames: string[];
	searchEmails: string[];
};

export type AuthorIdentityResolver = {
	resolve: (commit: CommitRecord) => ResolvedAuthorIdentity;
	matches: (commit: CommitRecord, authorQuery?: string) => boolean;
	matchesIdentity: (commit: CommitRecord, identity?: AuthorIdentityQuery) => boolean;
};

export function createAuthorIdentityResolver(
	commits: CommitRecord[],
	aliases: AuthorAliasLookup
): AuthorIdentityResolver {
	const firstNameByEmail = collectFirstNameByEmail(commits);
	const namesByPrimaryEmail = collectNamesByPrimaryEmail(commits, aliases);

	const resolve = (commit: CommitRecord): ResolvedAuthorIdentity => {
		const primaryEmail = aliases.getPrimaryEmail(commit.authorEmail);

		if (!primaryEmail) {
			return {
				authorName: commit.authorName,
				authorEmail: commit.authorEmail,
				key: getAuthorKey(commit.authorName, commit.authorEmail),
				searchNames: [commit.authorName],
				searchEmails: [commit.authorEmail]
			};
		}

		const primaryKey = normalizeEmail(primaryEmail);
		const searchNames = [...(namesByPrimaryEmail.get(primaryKey) ?? [commit.authorName])];
		const searchEmails = aliases.getGroupEmails(primaryEmail);
		const authorName = firstNameByEmail.get(primaryKey) ?? searchNames[0] ?? commit.authorName;

		return {
			authorName,
			authorEmail: primaryEmail,
			key: getAuthorKey(authorName, primaryEmail),
			searchNames,
			searchEmails
		};
	};

	return {
		resolve,
		matches: (commit, authorQuery) => {
			if (!authorQuery) {
				return true;
			}

			const identity = resolve(commit);
			return [...identity.searchNames, ...identity.searchEmails].some(value => matchesText(value, authorQuery));
		},
		matchesIdentity: (commit, identity) => {
			if (!identity) {
				return false;
			}

			const resolved = resolve(commit);
			const email = normalizeEmail(identity.email ?? '');

			if (email) {
				return resolved.searchEmails.some(value => normalizeEmail(value) === email);
			}

			const name = normalizeText(identity.name ?? '');

			if (!name) {
				return false;
			}

			return resolved.searchNames.some(value => normalizeText(value) === name);
		}
	};
}

function collectFirstNameByEmail(commits: CommitRecord[]): Map<string, string> {
	const names = new Map<string, string>();

	for (const commit of commits) {
		const email = normalizeEmail(commit.authorEmail);

		if (!names.has(email)) {
			names.set(email, commit.authorName);
		}
	}

	return names;
}

function collectNamesByPrimaryEmail(
	commits: CommitRecord[],
	aliases: AuthorAliasLookup
): Map<string, Set<string>> {
	const names = new Map<string, Set<string>>();

	for (const commit of commits) {
		const primaryEmail = aliases.getPrimaryEmail(commit.authorEmail);

		if (!primaryEmail) {
			continue;
		}

		const key = normalizeEmail(primaryEmail);
		const current = names.get(key) ?? new Set<string>();
		current.add(commit.authorName);
		names.set(key, current);
	}

	return names;
}

function getAuthorKey(authorName: string, authorEmail: string): string {
	const email = normalizeEmail(authorEmail);

	if (email) {
		return email;
	}

	return normalizeText(authorName);
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function normalizeText(value: string): string {
	return value.trim().toLowerCase();
}

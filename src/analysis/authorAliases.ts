import {loadGitInsightConfig} from '../config/gitInsightConfig.js';
import {DEFAULT_LANGUAGE, getMessages, type SupportedLanguage} from '../i18n.js';

export type AuthorAliasGroup = {
	key: string;
	displayName?: string;
	displayEmail?: string;
	names: string[];
	emails: string[];
};

export type AuthorAliasLookup = {
	groups: AuthorAliasGroup[];
};

export class AuthorAliasConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthorAliasConfigError';
	}
}

export async function loadAuthorAliasLookup(
	repositoryPath: string,
	language: SupportedLanguage = DEFAULT_LANGUAGE
): Promise<AuthorAliasLookup> {
	const config = await loadGitInsightConfig(repositoryPath, language);
	return createAuthorAliasLookup(parseAuthorAliasConfig(config.authors, language));
}

function createAuthorAliasLookup(groups: AuthorAliasGroup[]): AuthorAliasLookup {
	return {
		groups
	};
}

function parseAuthorAliasConfig(authors: unknown, language: SupportedLanguage): AuthorAliasGroup[] {
	const t = getMessages(language);

	if (authors === undefined) {
		return [];
	}

	if (!Array.isArray(authors)) {
		throw new AuthorAliasConfigError(t.config.authorsMustBeArray);
	}

	const groups = authors.map((group, index) => parseAliasGroup(group, index, language));
	assertUniqueMatchers(groups, language);
	return groups;
}

function parseAliasGroup(value: unknown, index: number, language: SupportedLanguage): AuthorAliasGroup {
	const t = getMessages(language);
	const displayIndex = index + 1;

	if (!isRecord(value)) {
		throw new AuthorAliasConfigError(t.config.authorGroupMustBeObject(displayIndex));
	}

	const displayName = value.displayName;
	const displayEmail = value.displayEmail;
	const names = value.names;
	const emails = value.emails;

	if (displayName !== undefined && !isNonEmptyString(displayName)) {
		throw new AuthorAliasConfigError(t.config.displayNameMustBeString(displayIndex));
	}

	if (displayEmail !== undefined && !isNonEmptyString(displayEmail)) {
		throw new AuthorAliasConfigError(t.config.displayEmailMustBeString(displayIndex));
	}

	if (names !== undefined && (!Array.isArray(names) || !names.every(isNonEmptyString))) {
		throw new AuthorAliasConfigError(t.config.namesMustBeStringArray(displayIndex));
	}

	if (emails !== undefined && (!Array.isArray(emails) || !emails.every(isNonEmptyString))) {
		throw new AuthorAliasConfigError(t.config.emailsMustBeStringArray(displayIndex));
	}

	const normalizedNames = uniqueValues(Array.isArray(names) ? names.map(normalizeName) : []);
	const normalizedEmails = uniqueValues(Array.isArray(emails) ? emails.map(normalizeEmail) : []);

	if (normalizedNames.length === 0 && normalizedEmails.length === 0) {
		throw new AuthorAliasConfigError(t.config.groupMustHaveMatcher(displayIndex));
	}

	return {
		key: `author:${index + 1}`,
		displayName: isNonEmptyString(displayName) ? normalizeName(displayName) : undefined,
		displayEmail: isNonEmptyString(displayEmail) ? normalizeEmail(displayEmail) : undefined,
		names: normalizedNames,
		emails: normalizedEmails
	};
}

function assertUniqueMatchers(groups: AuthorAliasGroup[], language: SupportedLanguage): void {
	const t = getMessages(language);
	const ownerByName = new Map<string, string>();
	const ownerByEmail = new Map<string, string>();

	for (const group of groups) {
		for (const name of group.names) {
			const key = normalizeName(name);
			const owner = ownerByName.get(key);

			if (owner) {
				throw new AuthorAliasConfigError(t.config.duplicateName(name));
			}

			ownerByName.set(key, group.key);
		}

		for (const email of group.emails) {
			const key = normalizeEmail(email);
			const owner = ownerByEmail.get(key);

			if (owner) {
				throw new AuthorAliasConfigError(t.config.duplicateEmail(email));
			}

			ownerByEmail.set(key, group.key);
		}
	}
}

function uniqueValues(values: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const value of values) {
		if (!seen.has(value)) {
			seen.add(value);
			result.push(value);
		}
	}

	return result;
}

function normalizeEmail(email: string): string {
	return email.trim();
}

function normalizeName(value: string): string {
	return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

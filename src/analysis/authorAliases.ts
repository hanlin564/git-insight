import {readFile} from 'node:fs/promises';
import path from 'node:path';

export type AuthorAliasGroup = {
	primaryEmail: string;
	emails: string[];
};

export type AuthorAliasLookup = {
	groups: AuthorAliasGroup[];
	getPrimaryEmail: (email: string) => string | undefined;
	getGroupEmails: (primaryEmail: string) => string[];
};

export class AuthorAliasConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthorAliasConfigError';
	}
}

type RawAuthorAliasConfig = {
	authorAliases: unknown;
};

export async function loadAuthorAliasLookup(
	repositoryPath: string
): Promise<AuthorAliasLookup> {
	const resolvedPath = path.join(repositoryPath, '.git-insight.json');
	const content = await readConfigFile(resolvedPath);

	if (!content) {
		return createAuthorAliasLookup([]);
	}

	return createAuthorAliasLookup(parseAuthorAliasConfig(content, resolvedPath));
}

function createAuthorAliasLookup(groups: AuthorAliasGroup[]): AuthorAliasLookup {
	const primaryByEmail = new Map<string, string>();
	const emailsByPrimary = new Map<string, string[]>();

	for (const group of groups) {
		const primaryKey = normalizeEmail(group.primaryEmail);
		emailsByPrimary.set(primaryKey, group.emails);

		for (const email of group.emails) {
			primaryByEmail.set(normalizeEmail(email), group.primaryEmail);
		}
	}

	return {
		groups,
		getPrimaryEmail: email => primaryByEmail.get(normalizeEmail(email)),
		getGroupEmails: primaryEmail => emailsByPrimary.get(normalizeEmail(primaryEmail)) ?? []
	};
}

async function readConfigFile(filePath: string): Promise<string | undefined> {
	try {
		return await readFile(filePath, 'utf8');
	} catch (error) {
		if (isFileNotFoundError(error)) {
			return undefined;
		}

		throw error;
	}
}

function parseAuthorAliasConfig(content: string, filePath: string): AuthorAliasGroup[] {
	let value: unknown;

	try {
		value = JSON.parse(content);
	} catch {
		throw new AuthorAliasConfigError(`作者合并配置 JSON 格式错误：${filePath}`);
	}

	if (!isRecord(value) || !Array.isArray((value as RawAuthorAliasConfig).authorAliases)) {
		throw new AuthorAliasConfigError('作者合并配置必须包含 authorAliases 数组。');
	}

	const rawAliases = (value as {authorAliases: unknown[]}).authorAliases;
	const groups = rawAliases.map((group, index) => parseAliasGroup(group, index));
	assertUniqueEmails(groups);
	return groups;
}

function parseAliasGroup(value: unknown, index: number): AuthorAliasGroup {
	if (!isRecord(value)) {
		throw new AuthorAliasConfigError(`第 ${index + 1} 个作者合并配置必须是对象。`);
	}

	const primaryEmail = value.primaryEmail;
	const emails = value.emails;

	if (!isNonEmptyString(primaryEmail)) {
		throw new AuthorAliasConfigError(`第 ${index + 1} 个作者合并配置缺少 primaryEmail。`);
	}

	if (!Array.isArray(emails) || !emails.every(isNonEmptyString)) {
		throw new AuthorAliasConfigError(`第 ${index + 1} 个作者合并配置的 emails 必须是字符串数组。`);
	}

	return {
		primaryEmail,
		emails: uniqueEmails([primaryEmail, ...emails])
	};
}

function assertUniqueEmails(groups: AuthorAliasGroup[]): void {
	const ownerByEmail = new Map<string, string>();

	for (const group of groups) {
		for (const email of group.emails) {
			const key = normalizeEmail(email);
			const owner = ownerByEmail.get(key);

			if (owner) {
				throw new AuthorAliasConfigError(`邮箱重复出现在多个作者合并组：${email}`);
			}

			ownerByEmail.set(key, group.primaryEmail);
		}
	}
}

function uniqueEmails(emails: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const email of emails) {
		const key = normalizeEmail(email);

		if (!seen.has(key)) {
			seen.add(key);
			result.push(email);
		}
	}

	return result;
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function isFileNotFoundError(error: unknown): boolean {
	return isRecord(error) && error.code === 'ENOENT';
}

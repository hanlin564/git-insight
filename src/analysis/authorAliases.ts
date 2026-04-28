import {readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

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

type RawAuthorAliasConfig = {
	authors: unknown;
};

export async function loadAuthorAliasLookup(
	repositoryPath: string
): Promise<AuthorAliasLookup> {
	const config = await readAuthorAliasConfig(repositoryPath);

	if (!config) {
		return createAuthorAliasLookup([]);
	}

	return createAuthorAliasLookup(parseAuthorAliasConfig(config.content, config.filePath));
}

function createAuthorAliasLookup(groups: AuthorAliasGroup[]): AuthorAliasLookup {
	return {
		groups
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

async function readAuthorAliasConfig(repositoryPath: string): Promise<{content: string; filePath: string} | undefined> {
	const configPaths = [
		path.join(repositoryPath, '.git-insight.json'),
		path.join(os.homedir(), '.git-insight.json')
	];

	for (const filePath of configPaths) {
		const content = await readConfigFile(filePath);

		if (content !== undefined) {
			return {content, filePath};
		}
	}

	return undefined;
}

function parseAuthorAliasConfig(content: string, filePath: string): AuthorAliasGroup[] {
	let value: unknown;

	try {
		value = JSON.parse(content);
	} catch {
		throw new AuthorAliasConfigError(`作者合并配置 JSON 格式错误：${filePath}`);
	}

	if (!isRecord(value) || !Array.isArray((value as RawAuthorAliasConfig).authors)) {
		throw new AuthorAliasConfigError('作者合并配置必须包含 authors 数组。');
	}

	const rawAliases = (value as {authors: unknown[]}).authors;
	const groups = rawAliases.map((group, index) => parseAliasGroup(group, index));
	assertUniqueMatchers(groups);
	return groups;
}

function parseAliasGroup(value: unknown, index: number): AuthorAliasGroup {
	if (!isRecord(value)) {
		throw new AuthorAliasConfigError(`第 ${index + 1} 个作者合并配置必须是对象。`);
	}

	const displayName = value.displayName;
	const displayEmail = value.displayEmail;
	const names = value.names;
	const emails = value.emails;

	if (displayName !== undefined && !isNonEmptyString(displayName)) {
		throw new AuthorAliasConfigError(`第 ${index + 1} 个作者合并配置的 displayName 必须是非空字符串。`);
	}

	if (displayEmail !== undefined && !isNonEmptyString(displayEmail)) {
		throw new AuthorAliasConfigError(`第 ${index + 1} 个作者合并配置的 displayEmail 必须是非空字符串。`);
	}

	if (names !== undefined && (!Array.isArray(names) || !names.every(isNonEmptyString))) {
		throw new AuthorAliasConfigError(`第 ${index + 1} 个作者合并配置的 names 必须是字符串数组。`);
	}

	if (emails !== undefined && (!Array.isArray(emails) || !emails.every(isNonEmptyString))) {
		throw new AuthorAliasConfigError(`第 ${index + 1} 个作者合并配置的 emails 必须是字符串数组。`);
	}

	const normalizedNames = uniqueValues(Array.isArray(names) ? names.map(normalizeName) : []);
	const normalizedEmails = uniqueValues(Array.isArray(emails) ? emails.map(normalizeEmail) : []);

	if (normalizedNames.length === 0 && normalizedEmails.length === 0) {
		throw new AuthorAliasConfigError(`第 ${index + 1} 个作者合并配置必须包含 names 或 emails。`);
	}

	return {
		key: `author:${index + 1}`,
		displayName: isNonEmptyString(displayName) ? normalizeName(displayName) : undefined,
		displayEmail: isNonEmptyString(displayEmail) ? normalizeEmail(displayEmail) : undefined,
		names: normalizedNames,
		emails: normalizedEmails
	};
}

function assertUniqueMatchers(groups: AuthorAliasGroup[]): void {
	const ownerByName = new Map<string, string>();
	const ownerByEmail = new Map<string, string>();

	for (const group of groups) {
		for (const name of group.names) {
			const key = normalizeName(name);
			const owner = ownerByName.get(key);

			if (owner) {
				throw new AuthorAliasConfigError(`作者名称重复出现在多个作者合并组：${name}`);
			}

			ownerByName.set(key, group.key);
		}

		for (const email of group.emails) {
			const key = normalizeEmail(email);
			const owner = ownerByEmail.get(key);

			if (owner) {
				throw new AuthorAliasConfigError(`邮箱重复出现在多个作者合并组：${email}`);
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

function isFileNotFoundError(error: unknown): boolean {
	return isRecord(error) && error.code === 'ENOENT';
}

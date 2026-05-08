import {readFileSync} from 'node:fs';
import {readFile as readFileAsync} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {DEFAULT_LANGUAGE, getMessages, isSupportedLanguage, type SupportedLanguage} from '../i18n.js';

const CONFIG_FILE_NAME = '.git-insight.json';

export type GitInsightConfig = {
	filePath?: string;
	language: SupportedLanguage;
	authors?: unknown;
	excludePatterns?: string[];
};

export class GitInsightConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GitInsightConfigError';
	}
}

export async function loadGitInsightConfig(
	repositoryPath: string,
	errorLanguage: SupportedLanguage = DEFAULT_LANGUAGE
): Promise<GitInsightConfig> {
	const config = await readFirstConfigFile(repositoryPath);

	if (!config) {
		return {language: DEFAULT_LANGUAGE};
	}

	return parseGitInsightConfig(config.content, config.filePath, errorLanguage);
}

export function loadGitInsightLanguageSync(repositoryPath: string): SupportedLanguage {
	const config = readFirstConfigFileSync(repositoryPath);

	if (!config) {
		return DEFAULT_LANGUAGE;
	}

	return parseGitInsightConfig(config.content, config.filePath, DEFAULT_LANGUAGE).language;
}

function parseGitInsightConfig(
	content: string,
	filePath: string,
	errorLanguage: SupportedLanguage
): GitInsightConfig {
	const t = getMessages(errorLanguage);
	let value: unknown;

	try {
		value = JSON.parse(content);
	} catch {
		throw new GitInsightConfigError(t.config.jsonFormatError(filePath));
	}

	if (!isRecord(value)) {
		throw new GitInsightConfigError(t.config.mustBeObject);
	}

	if (value.language !== undefined && !isSupportedLanguage(value.language)) {
		throw new GitInsightConfigError(t.config.invalidLanguage(String(value.language)));
	}

	if (value.excludePatterns !== undefined && !isStringArray(value.excludePatterns)) {
		throw new GitInsightConfigError(t.config.excludePatternsMustBeStringArray);
	}

	return {
		filePath,
		language: value.language ?? DEFAULT_LANGUAGE,
		authors: value.authors,
		excludePatterns: value.excludePatterns
	};
}

async function readFirstConfigFile(repositoryPath: string): Promise<{content: string; filePath: string} | undefined> {
	for (const filePath of getConfigPaths(repositoryPath)) {
		try {
			return {
				content: await readFileAsync(filePath, 'utf8'),
				filePath
			};
		} catch (error) {
			if (isFileNotFoundError(error)) {
				continue;
			}

			throw error;
		}
	}

	return undefined;
}

function readFirstConfigFileSync(repositoryPath: string): {content: string; filePath: string} | undefined {
	for (const filePath of getConfigPaths(repositoryPath)) {
		try {
			return {
				content: readFileSync(filePath, 'utf8'),
				filePath
			};
		} catch (error) {
			if (isFileNotFoundError(error)) {
				continue;
			}

			throw error;
		}
	}

	return undefined;
}

function getConfigPaths(repositoryPath: string): string[] {
	return [
		path.join(repositoryPath, CONFIG_FILE_NAME),
		path.join(os.homedir(), CONFIG_FILE_NAME)
	];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isFileNotFoundError(error: unknown): boolean {
	return isRecord(error) && error.code === 'ENOENT';
}

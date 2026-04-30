import type {CommitRecord} from '../git/types.js';
import {DEFAULT_LANGUAGE, getMessages, type SupportedLanguage} from '../i18n.js';
import {matchesText} from '../utils/text.js';
import {AuthorAliasConfigError, type AuthorAliasGroup, type AuthorAliasLookup} from './authorAliases.js';

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
	signatureKeys: string[];
	isAliasGroup: boolean;
};

export type AuthorIdentityResolver = {
	resolve: (commit: CommitRecord) => ResolvedAuthorIdentity;
	matches: (commit: CommitRecord, authorQuery?: string) => boolean;
	matchesIdentity: (commit: CommitRecord, identity?: AuthorIdentityQuery) => boolean;
};

type AuthorSignature = {
	key: string;
	authorName: string;
	authorEmail: string;
	commitCount: number;
	firstSeen: number;
};

export function createAuthorIdentityResolver(
	commits: CommitRecord[],
	aliases: AuthorAliasLookup,
	language: SupportedLanguage = DEFAULT_LANGUAGE
): AuthorIdentityResolver {
	const identitiesBySignature = buildIdentityGroups(commits, aliases, language);

	const resolve = (commit: CommitRecord): ResolvedAuthorIdentity => {
		const identity = identitiesBySignature.get(getSignatureKey(commit.authorName, commit.authorEmail));

		if (identity) {
			return identity;
		}

		return createFallbackIdentity(commit);
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
			const name = normalizeName(identity.name ?? '');

			if (email && name) {
				if (resolved.signatureKeys.includes(getSignatureKey(name, email))) {
					return true;
				}

				return resolved.isAliasGroup
					&& (
						resolved.searchNames.some(value => normalizeName(value) === name)
						|| resolved.searchEmails.some(value => normalizeEmail(value) === email)
					);
			}

			if (email) {
				return resolved.searchEmails.some(value => normalizeEmail(value) === email);
			}

			if (!name) {
				return false;
			}

			return resolved.searchNames.some(value => normalizeName(value) === name);
		}
	};
}

function buildIdentityGroups(
	commits: CommitRecord[],
	aliases: AuthorAliasLookup,
	language: SupportedLanguage
): Map<string, ResolvedAuthorIdentity> {
	const t = getMessages(language);
	const signatures = collectSignatures(commits);
	const union = new UnionFind();
	const groupBySignature = new Map<string, AuthorAliasGroup>();
	const signaturesByName = new Map<string, string[]>();
	const signaturesByEmail = new Map<string, string[]>();

	for (const signature of signatures.values()) {
		union.add(signature.key);

		const nameKey = normalizeName(signature.authorName);
		const nameSignatures = signaturesByName.get(nameKey) ?? [];
		nameSignatures.push(signature.key);
		signaturesByName.set(nameKey, nameSignatures);

		const emailKey = normalizeEmail(signature.authorEmail);
		const emailSignatures = signaturesByEmail.get(emailKey) ?? [];
		emailSignatures.push(signature.key);
		signaturesByEmail.set(emailKey, emailSignatures);
	}

	for (const group of aliases.groups) {
		const groupSignatures = uniqueValues([
			...group.names.flatMap(name => signaturesByName.get(normalizeName(name)) ?? []),
			...group.emails.flatMap(email => signaturesByEmail.get(normalizeEmail(email)) ?? [])
		]);

		if (groupSignatures.length === 0) {
			continue;
		}

		for (const signatureKey of groupSignatures) {
			const existingGroup = groupBySignature.get(signatureKey);

			if (existingGroup && existingGroup.key !== group.key) {
				const signature = signatures.get(signatureKey);
				throw new AuthorAliasConfigError(t.config.signatureMatchesMultipleGroups(formatSignature(signature, language)));
			}

			groupBySignature.set(signatureKey, group);
		}

		const [firstSignature, ...otherSignatures] = groupSignatures;
		for (const signature of otherSignatures) {
			union.union(firstSignature, signature);
		}
	}

	const signaturesByRoot = new Map<string, AuthorSignature[]>();

	for (const signature of signatures.values()) {
		const root = union.find(signature.key);
		const group = signaturesByRoot.get(root) ?? [];
		group.push(signature);
		signaturesByRoot.set(root, group);
	}

	const identitiesBySignature = new Map<string, ResolvedAuthorIdentity>();

	for (const groupSignatures of signaturesByRoot.values()) {
		const identity = createGroupIdentity(groupSignatures, groupBySignature, language);

		for (const signature of groupSignatures) {
			identitiesBySignature.set(signature.key, identity);
		}
	}

	return identitiesBySignature;
}

function collectSignatures(commits: CommitRecord[]): Map<string, AuthorSignature> {
	const signatures = new Map<string, AuthorSignature>();

	for (const [index, commit] of commits.entries()) {
		const key = getSignatureKey(commit.authorName, commit.authorEmail);
		const signature = signatures.get(key);

		if (signature) {
			signature.commitCount += 1;
			continue;
		}

		signatures.set(key, {
			key,
			authorName: commit.authorName,
			authorEmail: normalizeEmail(commit.authorEmail),
			commitCount: 1,
			firstSeen: index
		});
	}

	return signatures;
}

function createGroupIdentity(
	signatures: AuthorSignature[],
	groupBySignature: Map<string, AuthorAliasGroup>,
	language: SupportedLanguage
): ResolvedAuthorIdentity {
	const aliasGroup = getAliasGroup(signatures, groupBySignature, language);
	const aliasNames = aliasGroup ? aliasGroup.names : [];
	const displayNames = aliasGroup?.displayName ? [aliasGroup.displayName] : [];
	const signatureEmails = uniqueValues(signatures.map(signature => signature.authorEmail));
	const aliasEmails = aliasGroup ? aliasGroup.emails : [];
	const displayEmails = aliasGroup?.displayEmail ? [aliasGroup.displayEmail] : [];
	const searchNames = uniqueValues([...signatures.map(signature => signature.authorName), ...aliasNames, ...displayNames]);
	const searchEmails = uniqueValues([...signatureEmails, ...aliasEmails]);
	const authorName = aliasGroup?.displayName ?? chooseMostUsedName(signatures);
	const authorEmail = aliasGroup?.displayEmail ?? chooseMostUsedValue(signatures, signature => signature.authorEmail);

	return {
		authorName,
		authorEmail,
		key: getResolvedAuthorKey(signatures, authorName, authorEmail, aliasGroup),
		searchNames,
		searchEmails: uniqueValues([...searchEmails, ...displayEmails]),
		signatureKeys: signatures.map(signature => signature.key),
		isAliasGroup: Boolean(aliasGroup)
	};
}

function createFallbackIdentity(commit: CommitRecord): ResolvedAuthorIdentity {
	const authorEmail = normalizeEmail(commit.authorEmail);
	const signatureKey = getSignatureKey(commit.authorName, authorEmail);

	return {
		authorName: commit.authorName,
		authorEmail,
		key: signatureKey,
		searchNames: [commit.authorName],
		searchEmails: [authorEmail],
		signatureKeys: [signatureKey],
		isAliasGroup: false
	};
}

function getResolvedAuthorKey(
	signatures: AuthorSignature[],
	authorName: string,
	authorEmail: string,
	aliasGroup?: AuthorAliasGroup
): string {
	if (aliasGroup) {
		return `alias:${aliasGroup.key}`;
	}

	return signatures[0]?.key ?? getSignatureKey(authorName, authorEmail);
}

function getAliasGroup(
	signatures: AuthorSignature[],
	groupBySignature: Map<string, AuthorAliasGroup>,
	language: SupportedLanguage
): AuthorAliasGroup | undefined {
	const t = getMessages(language);
	let aliasGroup: AuthorAliasGroup | undefined;

	for (const signature of signatures) {
		const currentGroup = groupBySignature.get(signature.key);

		if (!currentGroup) {
			continue;
		}

		if (aliasGroup && aliasGroup.key !== currentGroup.key) {
			throw new AuthorAliasConfigError(t.config.groupResolveConflict(formatSignature(signature, language)));
		}

		aliasGroup = currentGroup;
	}

	return aliasGroup;
}

function formatSignature(signature: AuthorSignature | undefined, language: SupportedLanguage): string {
	if (!signature) {
		return getMessages(language).ui.unknownAuthor;
	}

	return `${signature.authorName} <${signature.authorEmail}>`;
}

function chooseMostUsedValue(signatures: AuthorSignature[], getValue: (signature: AuthorSignature) => string): string {
	const stats = new Map<string, {value: string; count: number; firstSeen: number}>();

	for (const signature of signatures) {
		const value = getValue(signature);
		const current = stats.get(value) ?? {value, count: 0, firstSeen: signature.firstSeen};
		current.count += signature.commitCount;
		current.firstSeen = Math.min(current.firstSeen, signature.firstSeen);
		stats.set(value, current);
	}

	return [...stats.values()].sort((a, b) => b.count - a.count || a.firstSeen - b.firstSeen)[0]?.value ?? '';
}

function chooseMostUsedName(signatures: AuthorSignature[]): string {
	const stats = new Map<string, {count: number; signatures: AuthorSignature[]; firstSeen: number}>();

	for (const signature of signatures) {
		const key = normalizeName(signature.authorName);
		const current = stats.get(key) ?? {count: 0, signatures: [], firstSeen: signature.firstSeen};
		current.count += signature.commitCount;
		current.signatures.push(signature);
		current.firstSeen = Math.min(current.firstSeen, signature.firstSeen);
		stats.set(key, current);
	}

	const bestNameGroup = [...stats.values()].sort((a, b) => b.count - a.count || a.firstSeen - b.firstSeen)[0];

	if (!bestNameGroup) {
		return '';
	}

	return chooseMostUsedValue(bestNameGroup.signatures, signature => signature.authorName);
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

function getSignatureKey(authorName: string, authorEmail: string): string {
	return `${authorName}\u0000${normalizeEmail(authorEmail)}`;
}

function normalizeEmail(email: string): string {
	return email.trim();
}

function normalizeName(value: string): string {
	return value.trim();
}

class UnionFind {
	private readonly parents = new Map<string, string>();

	add(value: string): void {
		if (!this.parents.has(value)) {
			this.parents.set(value, value);
		}
	}

	find(value: string): string {
		this.add(value);
		const parent = this.parents.get(value);

		if (!parent || parent === value) {
			return value;
		}

		const root = this.find(parent);
		this.parents.set(value, root);
		return root;
	}

	union(left: string, right: string): void {
		const leftRoot = this.find(left);
		const rightRoot = this.find(right);

		if (leftRoot !== rightRoot) {
			this.parents.set(rightRoot, leftRoot);
		}
	}
}

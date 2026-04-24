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

type AuthorSignature = {
	key: string;
	authorName: string;
	authorEmail: string;
	commitCount: number;
	firstSeen: number;
};

export function createAuthorIdentityResolver(
	commits: CommitRecord[],
	aliases: AuthorAliasLookup
): AuthorIdentityResolver {
	const identitiesBySignature = buildIdentityGroups(commits, aliases);

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

			if (email) {
				return resolved.searchEmails.some(value => normalizeEmail(value) === email);
			}

			const name = normalizeName(identity.name ?? '');

			if (!name) {
				return false;
			}

			return resolved.searchNames.some(value => normalizeName(value) === name);
		}
	};
}

function buildIdentityGroups(
	commits: CommitRecord[],
	aliases: AuthorAliasLookup
): Map<string, ResolvedAuthorIdentity> {
	const signatures = collectSignatures(commits);
	const union = new UnionFind();
	const firstSignatureByName = new Map<string, string>();
	const firstSignatureByEmail = new Map<string, string>();
	const signaturesByEmail = new Map<string, string[]>();

	for (const signature of signatures.values()) {
		union.add(signature.key);
		mergeByKey(union, firstSignatureByName, normalizeName(signature.authorName), signature.key);
		mergeByKey(union, firstSignatureByEmail, normalizeEmail(signature.authorEmail), signature.key);

		const emailKey = normalizeEmail(signature.authorEmail);
		const emailSignatures = signaturesByEmail.get(emailKey) ?? [];
		emailSignatures.push(signature.key);
		signaturesByEmail.set(emailKey, emailSignatures);
	}

	for (const group of aliases.groups) {
		const groupSignatures = group.emails.flatMap(email => signaturesByEmail.get(normalizeEmail(email)) ?? []);

		if (groupSignatures.length === 0) {
			continue;
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
		const identity = createGroupIdentity(groupSignatures, aliases);

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
	aliases: AuthorAliasLookup
): ResolvedAuthorIdentity {
	const searchNames = uniqueValues(signatures.map(signature => signature.authorName));
	const signatureEmails = uniqueValues(signatures.map(signature => signature.authorEmail));
	const signatureEmailSet = new Set(signatureEmails.map(normalizeEmail));
	const aliasEmails: string[] = [];
	let primaryEmail: string | undefined;

	for (const group of aliases.groups) {
		if (!group.emails.some(email => signatureEmailSet.has(normalizeEmail(email)))) {
			continue;
		}

		primaryEmail ??= group.primaryEmail;
		aliasEmails.push(...group.emails);
	}

	const searchEmails = uniqueValues([...signatureEmails, ...aliasEmails]);
	const authorName = chooseMostUsedName(signatures);
	const authorEmail = primaryEmail ?? chooseMostUsedValue(signatures, signature => signature.authorEmail);

	return {
		authorName,
		authorEmail,
		key: getAuthorKey(authorName, authorEmail),
		searchNames,
		searchEmails
	};
}

function createFallbackIdentity(commit: CommitRecord): ResolvedAuthorIdentity {
	const authorEmail = normalizeEmail(commit.authorEmail);

	return {
		authorName: commit.authorName,
		authorEmail,
		key: getAuthorKey(commit.authorName, authorEmail),
		searchNames: [commit.authorName],
		searchEmails: [authorEmail]
	};
}

function mergeByKey(union: UnionFind, owners: Map<string, string>, groupKey: string, signatureKey: string): void {
	if (!groupKey) {
		return;
	}

	const owner = owners.get(groupKey);

	if (owner) {
		union.union(owner, signatureKey);
		return;
	}

	owners.set(groupKey, signatureKey);
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

function getAuthorKey(authorName: string, authorEmail: string): string {
	const email = normalizeEmail(authorEmail);

	if (email) {
		return email;
	}

	return normalizeName(authorName);
}

function normalizeEmail(email: string): string {
	return email.trim();
}

function normalizeName(value: string): string {
	return value.trim().toLowerCase();
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

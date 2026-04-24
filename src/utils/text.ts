export function matchesText(value: string, query?: string): boolean {
	if (!query) {
		return true;
	}

	return value.toLowerCase().includes(query.toLowerCase());
}

export function padEndSafe(value: string, length: number): string {
	if (value.length >= length) {
		return value.slice(0, length);
	}

	return value.padEnd(length, ' ');
}

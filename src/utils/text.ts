import sliceAnsi from 'slice-ansi';
import stringWidth from 'string-width';

const ANSI_ESCAPE_PATTERN = /\u001B\[[\d;]*m/;
const segmenter = new Intl.Segmenter(undefined, {granularity: 'grapheme'});

export function matchesText(value: string, query?: string): boolean {
	if (!query) {
		return true;
	}

	return value.toLowerCase().includes(query.toLowerCase());
}

export function padEndSafe(value: string, length: number): string {
	const truncated = truncateToDisplayWidth(value, length);
	const padding = Math.max(length - getDisplayWidth(truncated), 0);
	return `${truncated}${' '.repeat(padding)}`;
}

export function getDisplayWidth(value: string): number {
	return stringWidth(value);
}

function truncateToDisplayWidth(value: string, length: number): string {
	if (length <= 0) {
		return '';
	}

	if (getDisplayWidth(value) <= length) {
		return value;
	}

	if (ANSI_ESCAPE_PATTERN.test(value)) {
		return sliceAnsi(value, 0, length);
	}

	let result = '';
	let width = 0;

	for (const {segment} of segmenter.segment(value)) {
		const nextWidth = getDisplayWidth(segment);

		if (width + nextWidth > length) {
			break;
		}

		result += segment;
		width += nextWidth;
	}

	return result;
}

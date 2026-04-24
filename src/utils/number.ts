export function formatNumber(value: number): string {
	return new Intl.NumberFormat('en-US').format(value);
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

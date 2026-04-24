const MS_PER_DAY = 24 * 60 * 60 * 1000;

const pad = (value: number): string => value.toString().padStart(2, '0');

export function formatDate(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfLocalDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

export function getDateRange(days: number, endDate = new Date()): string[] {
	const end = startOfLocalDay(endDate);
	const start = addDays(end, -(days - 1));
	const dates: string[] = [];

	for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
		dates.push(formatDate(cursor));
	}

	return dates;
}

export function getMondayFirstWeekday(dateText: string): number {
	const day = new Date(`${dateText}T00:00:00`).getDay();
	return day === 0 ? 6 : day - 1;
}

export function getMonthLabel(dateText: string): string {
	return new Intl.DateTimeFormat('en', {month: 'short'}).format(new Date(`${dateText}T00:00:00`));
}

export function getDaysBetween(startDate: string, endDate: string): number {
	const start = new Date(`${startDate}T00:00:00`).getTime();
	const end = new Date(`${endDate}T00:00:00`).getTime();
	return Math.round((end - start) / MS_PER_DAY);
}

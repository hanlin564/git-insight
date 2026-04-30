const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type DateRange = {
	kind: 'since' | 'year' | 'month' | 'custom';
	startDate: string;
	endDate: string;
	label: string;
	dayCount: number;
};

const pad = (value: number): string => value.toString().padStart(2, '0');

export function formatDate(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatMonth(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function startOfLocalDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfLocalMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

export function addMonths(date: Date, months: number): Date {
	const next = new Date(date);
	next.setMonth(next.getMonth() + months);
	return next;
}

export function getDateRange(days: number, endDate = new Date()): string[] {
	const end = startOfLocalDay(endDate);
	const start = addDays(end, -(days - 1));
	return getDateRangeBetween(formatDate(start), formatDate(end));
}

export function getDateRangeBetween(startDate: string, endDate: string): string[] {
	const start = new Date(`${startDate}T00:00:00`);
	const end = new Date(`${endDate}T00:00:00`);
	const dates: string[] = [];

	for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
		dates.push(formatDate(cursor));
	}

	return dates;
}

export function getMonthRange(days: number, endDate = new Date()): string[] {
	const end = startOfLocalMonth(endDate);
	const start = startOfLocalMonth(addDays(startOfLocalDay(endDate), -(days - 1)));
	return getMonthRangeBetween(formatMonth(start), formatMonth(end));
}

export function getMonthRangeBetween(startMonth: string, endMonth: string): string[] {
	const start = startOfLocalMonth(new Date(`${startMonth}-01T00:00:00`));
	const end = startOfLocalMonth(new Date(`${endMonth}-01T00:00:00`));
	const months: string[] = [];

	for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 1)) {
		months.push(formatMonth(cursor));
	}

	return months;
}

export function getMondayFirstWeekday(dateText: string): number {
	const day = new Date(`${dateText}T00:00:00`).getDay();
	return day === 0 ? 6 : day - 1;
}

export function getMonthLabel(dateText: string): string {
	return `${Number.parseInt(dateText.slice(5, 7), 10)}月`;
}

export function getDaysBetween(startDate: string, endDate: string): number {
	const start = new Date(`${startDate}T00:00:00`).getTime();
	const end = new Date(`${endDate}T00:00:00`).getTime();
	return Math.round((end - start) / MS_PER_DAY);
}

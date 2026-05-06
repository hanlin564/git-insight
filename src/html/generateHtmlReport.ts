import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import type {RepositoryStats} from '../analysis/collectRepositoryStats.js';
import type {CliOptions} from '../cli/parseArgs.js';
import type {AuthorStat, BranchGroups, BranchSummary, GitUserIdentity, HeatmapPeriodCount} from '../git/types.js';
import {getMessages, type SupportedLanguage} from '../i18n.js';
import {formatNumber} from '../utils/number.js';

const DEFAULT_REPORT_FILE_NAME = 'git-insight-report.html';

type WriteHtmlReportOptions = {
	options: CliOptions;
	stats: RepositoryStats;
	generatedAt?: Date;
};

type RankingAuthor = {
	author: AuthorStat;
	rank: number;
	value: number;
};

type RankingItem = {
	key: string;
	label: string;
	rank?: number;
	value?: number;
	isGap?: boolean;
	isHighlighted?: boolean;
};

type RankingView = {
	items: RankingItem[];
	currentRank?: number;
	total: number;
};

type RankingPanel = {
	title: string;
	ranking: RankingView;
};

export async function writeHtmlReport({
	options,
	stats,
	generatedAt = new Date()
}: WriteHtmlReportOptions): Promise<string> {
	const outputPath = options.outputPath ?? path.join(stats.repository.path, DEFAULT_REPORT_FILE_NAME);
	await mkdir(path.dirname(outputPath), {recursive: true});
	await writeFile(outputPath, generateHtmlReport({options, stats, generatedAt}), 'utf8');
	return outputPath;
}

export function generateHtmlReport({options, stats, generatedAt = new Date()}: WriteHtmlReportOptions): string {
	const language = options.language;
	const t = getMessages(language);
	const html = t.html;
	const metaRows = [
		[html.repository, stats.repository.name],
		[html.currentBranch, stats.currentBranchName],
		[html.analysisBranch, stats.analysisBranchName],
		[html.dateRange, stats.range.label],
		...(options.author ? [[html.authorFilter, options.author]] : []),
		...(options.me ? [[html.currentUser, formatGitUser(stats.currentGitUser, language)]] : [])
	] satisfies string[][];
	const heatmapTitle = options.me ? t.ui.currentUserHeatmapTitle : t.ui.repositoryHeatmapTitle;
	const heatmapScope = options.me
		? t.ui.currentUserHeatmapScope(formatGitUser(stats.currentGitUser, language))
		: t.ui.repositoryHeatmapScope;

	return `<!doctype html>
<html lang="${language === 'zh' ? 'zh-CN' : 'en'}">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${escapeHtml(html.pageTitle)}</title>
	<style>
${REPORT_CSS}
	</style>
</head>
<body>
	<main class="report">
		<section class="masthead">
			<div>
				<h1>${escapeHtml(html.reportTitle)}</h1>
			</div>
			<div class="meta-panel" aria-label="${escapeHtml(html.metadataLabel)}">
${metaRows.map(([label, value]) => `				<div class="meta-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join('\n')}
			</div>
		</section>

		<section class="content">
			<section class="section">
				<div class="section-head">
					<div>
						<h2>${escapeHtml(heatmapTitle)}</h2>
					</div>
					<div class="scope">${escapeHtml(heatmapScope)}</div>
				</div>
${renderHeatmap(stats.heatmap?.periods ?? [], stats.heatmap?.granularity ?? 'daily', language)}
			</section>

${stats.authorStats.length > 0 ? renderRankings(stats, options.me, language) : renderEmptySection(t.ui.noMatchingCommits)}

${!options.branch && stats.branchGroups ? renderBranchActivity(stats.branchGroups, language) : ''}
		</section>

		<footer class="footer">
			<span>${escapeHtml(html.generatedBy)}</span>
			<span>${escapeHtml(html.generatedAt(formatDateTime(generatedAt)))}</span>
		</footer>
	</main>
</body>
</html>
`;
}

function renderHeatmap(
	periods: HeatmapPeriodCount[],
	granularity: 'daily' | 'monthly',
	language: SupportedLanguage
): string {
	if (periods.length === 0) {
		return `				<div class="heatmap-shell">
					<p class="empty-state">${escapeHtml(getMessages(language).html.emptyHeatmap)}</p>
				</div>`;
	}

	return granularity === 'monthly'
		? renderMonthlyHeatmap(periods, language)
		: renderDailyHeatmap(periods, language);
}

function renderDailyHeatmap(periods: HeatmapPeriodCount[], language: SupportedLanguage): string {
	const t = getMessages(language).ui;
	const periodCounts = new Map(periods.map(period => [period.period, period.count]));
	const months = getDailyMonths(periods);

	return `				<div class="heatmap-shell">
					<div class="heatmap-board" aria-label="${escapeHtml(t.monthlyView)}">
						<div class="weekdays">
							<span></span>
${t.weekdays.map(label => `							<span>${escapeHtml(label)}</span>`).join('\n')}
						</div>
						<div class="heatmap-months">
${months.map(month => renderDailyMonth(month, periodCounts, language)).join('\n')}
						</div>
					</div>
${renderLegend(language)}
				</div>`;
}

function renderDailyMonth(
	month: {year: number; monthIndex: number; key: string},
	periodCounts: Map<string, number>,
	language: SupportedLanguage
): string {
	const monthStart = new Date(month.year, month.monthIndex, 1);
	const monthEnd = new Date(month.year, month.monthIndex + 1, 0);
	const startMonday = addDays(monthStart, -getMondayFirstWeekday(monthStart));
	const endSunday = addDays(monthEnd, 6 - getMondayFirstWeekday(monthEnd));
	const weekCount = Math.round((endSunday.getTime() - startMonday.getTime()) / 604_800_000) + 1;
	const cells: string[] = [];

	for (let column = 0; column < weekCount; column += 1) {
		for (let row = 0; row < 7; row += 1) {
			const date = addDays(startMonday, column * 7 + row);
			const dateText = formatDate(date);
			const count = periodCounts.get(dateText);
			const isVisible = date.getFullYear() === month.year && date.getMonth() === month.monthIndex && count !== undefined;
			const className = isVisible ? getHeatmapClass(count) : 'empty';
			const title = isVisible ? ` title="${escapeHtml(`${dateText}: ${count} commits`)}"` : '';
			cells.push(`<span class="cell ${className}"${title}></span>`);
		}
	}

	return `							<div class="month-block">
								<div class="month-label">${escapeHtml(getMonthLabel(month.key, language))}</div>
								<div class="month-grid">${cells.join('')}</div>
							</div>`;
}

function renderMonthlyHeatmap(periods: HeatmapPeriodCount[], language: SupportedLanguage): string {
	const t = getMessages(language).ui;
	const rows = new Map<string, Array<HeatmapPeriodCount | undefined>>();

	for (const period of periods) {
		const [year, month] = period.period.split('-');
		const monthIndex = Number.parseInt(month ?? '', 10) - 1;

		if (!year || monthIndex < 0 || monthIndex > 11) {
			continue;
		}

		const row = rows.get(year) ?? Array.from<HeatmapPeriodCount | undefined>({length: 12});
		row[monthIndex] = period;
		rows.set(year, row);
	}

	return `				<div class="heatmap-shell">
					<div class="monthly-board" aria-label="${escapeHtml(t.monthlyView)}">
						<div class="monthly-months"><span></span>${t.months.map(label => `<span>${escapeHtml(label)}</span>`).join('')}</div>
${[...rows.entries()].map(([year, months]) => `						<div class="monthly-row"><b>${escapeHtml(year)}</b>${months.map(month => `<span class="cell ${getHeatmapClass(month?.count ?? 0)}" title="${escapeHtml(month ? `${month.period}: ${month.count} commits` : '')}"></span>`).join('')}</div>`).join('\n')}
					</div>
${renderLegend(language)}
				</div>`;
}

function renderLegend(language: SupportedLanguage): string {
	const t = getMessages(language).ui;
	return `					<div class="legend">
						<span>${escapeHtml(t.less)}</span><span class="cell"></span><span class="cell l1"></span><span class="cell l2"></span><span class="cell l3"></span><span class="cell l4"></span><span>${escapeHtml(t.more)}</span>
					</div>`;
}

function renderRankings(stats: RepositoryStats, showCurrentUserContext: boolean, language: SupportedLanguage): string {
	const t = getMessages(language);
	const panels: RankingPanel[] = [
		{
			title: t.ui.changedLinesPerDayRankingTitle,
			ranking: createRankingView(
				stats.authorStats,
				author => author.changedLinesPerDay,
				showCurrentUserContext,
				(a, b) => b.changedLines - a.changedLines || b.commitCount - a.commitCount,
				language
			)
		},
		{
			title: t.ui.commitRankingTitle,
			ranking: createRankingView(stats.authorStats, author => author.commitCount, showCurrentUserContext, undefined, language)
		},
		{
			title: t.ui.changedLinesRankingTitle,
			ranking: createRankingView(stats.authorStats, author => author.changedLines, showCurrentUserContext, undefined, language)
		}
	];

	return `			<section class="section">
				<div class="section-head">
					<div>
						<h2>${escapeHtml(t.html.rankingsTitle)}</h2>
					</div>
					${showCurrentUserContext ? `<div class="scope">${escapeHtml(t.html.currentUserRankingHighlighted)}</div>` : ''}
				</div>
				<div class="ranking-grid">
${panels.map(panel => renderRankingPanel(panel, showCurrentUserContext, language)).join('\n')}
				</div>
			</section>`;
}

function renderRankingPanel(panel: RankingPanel, showCurrentUserContext: boolean, language: SupportedLanguage): string {
	const t = getMessages(language).ui;
	const note = showCurrentUserContext
		? panel.ranking.currentRank
			? t.currentRank(panel.ranking.currentRank, panel.ranking.total)
			: t.missingCurrentRank(panel.ranking.total)
		: '';

	return `					<article class="ranking-panel">
						<header>
							<h3>${escapeHtml(panel.title)}</h3>
							${showCurrentUserContext ? `<span class="rank-note">${escapeHtml(note)}</span>` : ''}
						</header>
						<div class="rank-list">
${panel.ranking.items.map(item => renderRankingRow(item, panel.ranking.items)).join('\n')}
						</div>
					</article>`;
}

function renderRankingRow(item: RankingItem, items: RankingItem[]): string {
	if (item.isGap) {
		return '							<div class="gap"><span></span><span>...</span></div>';
	}

	const max = Math.max(...items.map(item => item.value ?? 0), 0);
	const width = max <= 0 ? 0 : Math.max(1, Math.round(((item.value ?? 0) / max) * 100));
	const className = item.isHighlighted ? 'rank-row current' : 'rank-row';

	return `							<div class="${className}"><span class="rank">#${item.rank ?? ''}</span><span class="name">${escapeHtml(item.label)}</span><span class="bar-track"><span class="bar" style="width: ${width}%"></span></span><span class="value">${escapeHtml(formatNumber(item.value ?? 0))}</span></div>`;
}

function renderBranchActivity(groups: BranchGroups, language: SupportedLanguage): string {
	const t = getMessages(language);

	return `			<section class="section">
				<div class="section-head">
					<div>
						<h2>${escapeHtml(t.html.branchActivityTitle)}</h2>
						<p class="note">${escapeHtml(t.html.branchActivityNote)}</p>
					</div>
				</div>
				<div class="branch-grid">
					${renderBranchPanel(t.ui.defaultBranchTitle, t.html.defaultBranchDescription, groups.defaultBranch ? [groups.defaultBranch] : [], t.ui.noDefaultBranch, language, false)}
					${renderBranchPanel(t.ui.activeBranchesTitle, t.html.activeBranchesDescription, groups.active, t.ui.noActiveBranches, language)}
					${renderBranchPanel(t.ui.staleBranchesTitle, t.html.staleBranchesDescription, groups.stale, t.ui.noStaleBranches, language)}
				</div>
			</section>`;
}

function renderBranchPanel(
	title: string,
	description: string,
	branches: BranchSummary[],
	emptyText: string,
	language: SupportedLanguage,
	showIndex = true
): string {
	return `<article class="branch-panel">
						<header>
							<h3>${escapeHtml(title)}</h3>
							<p>${escapeHtml(description)}</p>
						</header>
						<div class="branch-list">
${branches.length === 0 ? `							<p class="empty-state">${escapeHtml(emptyText)}</p>` : branches.map((branch, index) => renderBranch(branch, index, language, showIndex)).join('\n')}
						</div>
					</article>`;
}

function renderBranch(branch: BranchSummary, index: number, language: SupportedLanguage, showIndex = true): string {
	const label = branch.isCurrentBranch
		? `${getMessages(language).ui.currentBranchPrefix} ${branch.branchName}`
		: branch.branchName;
	const rank = showIndex ? `#${index + 1}` : '';

	return `							<div class="branch"><span class="branch-index">${rank}</span><span class="branch-name">${escapeHtml(label)}</span><span class="branch-date">${escapeHtml(branch.latestCommitDate ?? '-')}</span></div>`;
}

function renderEmptySection(message: string): string {
	return `			<section class="section">
				<p class="empty-state">${escapeHtml(message)}</p>
			</section>`;
}

function createRankingView(
	authors: AuthorStat[],
	getValue: (author: AuthorStat) => number,
	showCurrentUserContext: boolean,
	compareTies: ((a: AuthorStat, b: AuthorStat) => number) | undefined,
	language: SupportedLanguage
): RankingView {
	const rankedAuthors = [...authors]
		.sort((a, b) => getValue(b) - getValue(a) || (compareTies?.(a, b) ?? 0))
		.map((author, index) => ({
			author,
			rank: index + 1,
			value: getValue(author)
		}));
	const currentUserIndex = rankedAuthors.findIndex(item => item.author.isCurrentUser);
	const selectedIndices = showCurrentUserContext
		? selectCurrentUserRankingIndices(rankedAuthors.length, currentUserIndex)
		: selectDefaultRankingIndices(rankedAuthors.length);
	const selectedAuthors = selectedIndices.map(index => rankedAuthors[index]).filter((item): item is RankingAuthor => item !== undefined);

	return {
		items: toAuthorItems(selectedAuthors, rankedAuthors, language),
		currentRank: currentUserIndex >= 0 ? rankedAuthors[currentUserIndex]?.rank : undefined,
		total: rankedAuthors.length
	};
}

function selectDefaultRankingIndices(total: number): number[] {
	if (total <= 10) {
		return createRange(0, total - 1);
	}

	return [...createRange(0, 4), ...createRange(total - 5, total - 1)];
}

function selectCurrentUserRankingIndices(total: number, currentUserIndex: number): number[] {
	const indices = [
		...createRange(0, Math.min(2, total - 1)),
		...createRange(Math.max(currentUserIndex - 2, 0), Math.min(currentUserIndex + 2, total - 1)),
		...createRange(Math.max(total - 3, 0), total - 1)
	];

	return [...new Set(indices)].sort((a, b) => a - b);
}

function createRange(start: number, end: number): number[] {
	if (start < 0 || end < start) {
		return [];
	}

	return Array.from({length: end - start + 1}, (_, index) => start + index);
}

function toAuthorItems(authors: RankingAuthor[], allAuthors: RankingAuthor[], language: SupportedLanguage): RankingItem[] {
	const nameCounts = allAuthors.reduce((counts, author) => {
		counts.set(author.author.authorName, (counts.get(author.author.authorName) ?? 0) + 1);
		return counts;
	}, new Map<string, number>());
	const items: RankingItem[] = [];

	for (const [index, rankingAuthor] of authors.entries()) {
		const previous = authors[index - 1];

		if (previous && rankingAuthor.rank - previous.rank > 1) {
			items.push({
				key: `gap-${previous.rank}-${rankingAuthor.rank}`,
				label: '...',
				isGap: true
			});
		}

		const {author, rank, value} = rankingAuthor;

		items.push({
			key: author.authorEmail ? `${author.authorName}-${author.authorEmail}-${rank}` : `${author.authorName}-${rank}`,
			rank,
			label: getAuthorLabel(author, (nameCounts.get(author.authorName) ?? 0) > 1, author.isCurrentUser === true, language),
			value,
			isHighlighted: author.isCurrentUser === true
		});
	}

	return items;
}

function getAuthorLabel(author: AuthorStat, needsEmail: boolean, isCurrentUser: boolean, language: SupportedLanguage): string {
	const prefix = isCurrentUser ? `${getMessages(language).ui.currentUserPrefix} ` : '';

	if (!needsEmail || !author.authorEmail) {
		return `${prefix}${author.authorName}`;
	}

	return `${prefix}${author.authorName} <${getEmailHandle(author.authorEmail)}>`;
}

function getEmailHandle(email: string): string {
	return email.split('@')[0] ?? email;
}

function getDailyMonths(periods: HeatmapPeriodCount[]): Array<{year: number; monthIndex: number; key: string}> {
	const keys = [...new Set(periods.map(period => period.period.slice(0, 7)))];
	return keys.map(key => ({
		key,
		year: Number.parseInt(key.slice(0, 4), 10),
		monthIndex: Number.parseInt(key.slice(5, 7), 10) - 1
	}));
}

function getMonthLabel(monthKey: string, language: SupportedLanguage): string {
	const monthIndex = Number.parseInt(monthKey.slice(5, 7), 10) - 1;
	return getMessages(language).ui.months[monthIndex] ?? monthKey;
}

function getHeatmapClass(count: number): string {
	if (count === 0) {
		return '';
	}

	if (count === 1) {
		return 'l1';
	}

	if (count <= 3) {
		return 'l2';
	}

	if (count <= 6) {
		return 'l3';
	}

	return 'l4';
}

function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function getMondayFirstWeekday(date: Date): number {
	const day = date.getDay();
	return day === 0 ? 6 : day - 1;
}

function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function formatDateTime(date: Date): string {
	return `${formatDate(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatGitUser(user: GitUserIdentity | undefined, language: SupportedLanguage): string {
	if (!user) {
		return getMessages(language).ui.missingGitUser;
	}

	if (user.name && user.email) {
		return `${user.name} <${user.email}>`;
	}

	return user.name ?? user.email ?? getMessages(language).ui.missingGitUser;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

const REPORT_CSS = `		:root {
			--bg: #0d1117;
			--surface: #161b22;
			--surface-soft: #0f1620;
			--surface-raised: #1c2128;
			--ink: #e6edf3;
			--muted: #8b949e;
			--faint: #6e7681;
			--line: #30363d;
			--line-strong: #3d444d;
			--green: #3fb950;
			--blue: #58a6ff;
			--heat-0: #161b22;
			--heat-1: #0e4429;
			--heat-2: #006d32;
			--heat-3: #26a641;
			--heat-4: #39d353;
			--shadow: 0 28px 90px rgb(1 4 9 / 42%);
		}

		* {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			background: radial-gradient(circle at 50% -20%, rgb(88 166 255 / 16%), transparent 42%), var(--bg);
			color: var(--ink);
			font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			line-height: 1.5;
		}

		.report {
			width: min(1240px, calc(100% - 40px));
			margin: 28px auto 56px;
			background: var(--surface);
			border: 1px solid var(--line);
			border-radius: 12px;
			overflow: hidden;
			box-shadow: var(--shadow);
		}

		.masthead {
			display: grid;
			gap: 30px;
			padding: 58px 36px 34px;
			border-bottom: 1px solid var(--line);
			background:
				linear-gradient(135deg, rgb(88 166 255 / 12%), transparent 42%),
				linear-gradient(180deg, rgb(48 54 61 / 55%), transparent 70%);
		}

		h1 {
			max-width: 880px;
			margin: 0;
			font-size: clamp(38px, 5vw, 72px);
			line-height: .94;
			letter-spacing: 0;
			text-align: center;
			justify-self: center;
		}

		.meta-panel {
			display: grid;
			grid-template-columns: repeat(5, minmax(0, 1fr));
			align-self: stretch;
			border: 1px solid var(--line);
			background: rgb(13 17 23 / 64%);
		}

		.meta-row {
			display: grid;
			gap: 7px;
			padding: 13px 14px;
			border-right: 1px solid var(--line);
			font-size: 14px;
		}

		.meta-row:last-child {
			border-right: 0;
		}

		.meta-row span {
			color: var(--muted);
			font-size: 12px;
		}

		.meta-row b {
			min-width: 0;
			overflow-wrap: anywhere;
			font-weight: 650;
		}

		.content {
			padding: 0 36px 36px;
		}

		.section {
			padding: 34px 0;
			border-bottom: 1px solid var(--line);
		}

		.section:last-child {
			border-bottom: 0;
		}

		.section-head {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 24px;
			align-items: end;
			margin-bottom: 22px;
		}

		h2 {
			margin: 0;
			font-size: 24px;
			line-height: 1.1;
			letter-spacing: 0;
		}

		.note,
		.empty-state {
			margin: 8px 0 0;
			color: var(--muted);
			font-size: 14px;
		}

		.scope {
			color: var(--muted);
			font-size: 13px;
			text-align: right;
		}

		.heatmap-shell {
			overflow-x: visible;
			border: 1px solid var(--line);
			background: var(--surface-soft);
			padding: 18px 18px 16px;
		}

		.heatmap-board {
			display: grid;
			grid-template-columns: 36px minmax(0, 1fr);
			gap: 8px;
			width: 100%;
		}

		.weekdays {
			display: grid;
			grid-template-rows: 18px repeat(7, 10px);
			gap: 3px;
			color: var(--faint);
			font-size: 11px;
			line-height: 10px;
		}

		.heatmap-months {
			display: flex;
			gap: 10px;
			align-items: start;
			justify-content: space-between;
			min-width: 0;
		}

		.month-block {
			display: grid;
			grid-template-rows: 18px auto;
			gap: 4px;
		}

		.month-label {
			color: var(--faint);
			font-size: 12px;
		}

		.month-grid {
			display: grid;
			grid-auto-flow: column;
			grid-auto-columns: 10px;
			grid-template-rows: repeat(7, 10px);
			gap: 3px;
		}

		.monthly-board {
			display: grid;
			gap: 10px;
			overflow-x: auto;
		}

		.monthly-months,
		.monthly-row {
			display: grid;
			grid-template-columns: 52px repeat(12, 34px);
			gap: 8px;
			align-items: center;
			color: var(--faint);
			font-size: 12px;
		}

		.monthly-row b {
			color: var(--muted);
			font-size: 13px;
		}

		.cell {
			display: inline-block;
			width: 10px;
			height: 10px;
			border-radius: 3px;
			background: var(--heat-0);
		}

		.empty {
			background: transparent;
		}

		.l1 {
			background: var(--heat-1);
		}

		.l2 {
			background: var(--heat-2);
		}

		.l3 {
			background: var(--heat-3);
		}

		.l4 {
			background: var(--heat-4);
		}

		.legend {
			display: flex;
			align-items: center;
			justify-content: flex-end;
			gap: 7px;
			margin-top: 14px;
			color: var(--muted);
			font-size: 12px;
		}

		.legend .cell {
			width: 10px;
			height: 10px;
		}

		.ranking-grid {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 22px;
		}

		.ranking-panel,
		.branch-panel {
			min-width: 0;
			border: 1px solid var(--line);
			background: var(--surface-soft);
		}

		.ranking-panel header {
			display: flex;
			justify-content: space-between;
			gap: 14px;
			align-items: baseline;
			padding: 15px 16px;
			border-bottom: 1px solid var(--line);
		}

		.ranking-panel h3 {
			margin: 0;
			font-size: 15px;
			line-height: 1.2;
		}

		.rank-note {
			color: var(--blue);
			font-size: 12px;
			font-weight: 700;
			white-space: nowrap;
		}

		.rank-list {
			display: grid;
			gap: 0;
			padding: 10px 14px 14px;
		}

		.rank-row {
			display: grid;
			grid-template-columns: 34px minmax(112px, 1fr) minmax(74px, 42%) 74px;
			gap: 10px;
			align-items: center;
			min-height: 34px;
			border-bottom: 1px solid rgb(48 54 61 / 72%);
			font-size: 13px;
		}

		.rank-row:last-child {
			border-bottom: 0;
		}

		.rank {
			color: var(--faint);
			font-variant-numeric: tabular-nums;
		}

		.name {
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-weight: 650;
		}

		.bar-track {
			height: 8px;
			overflow: hidden;
			background: #21262d;
		}

		.bar {
			display: block;
			height: 100%;
			background: var(--green);
		}

		.value {
			text-align: right;
			font-variant-numeric: tabular-nums;
			color: var(--muted);
		}

		.current {
			color: var(--blue);
		}

		.current .bar {
			background: var(--blue);
		}

		.gap {
			display: grid;
			grid-template-columns: 34px 1fr;
			gap: 10px;
			align-items: center;
			min-height: 28px;
			color: var(--faint);
			font-size: 13px;
		}

		.branch-grid {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 22px;
		}

		.branch-panel header {
			padding: 15px 16px;
			border-bottom: 1px solid var(--line);
		}

		.branch-panel h3 {
			margin: 0;
			font-size: 16px;
		}

		.branch-panel p {
			margin: 7px 0 0;
			color: var(--muted);
			font-size: 13px;
		}

		.branch-list {
			display: grid;
			padding: 8px 16px 12px;
		}

		.branch {
			display: grid;
			grid-template-columns: 34px minmax(0, 1fr) auto;
			gap: 10px;
			align-items: center;
			min-height: 38px;
			border-bottom: 1px solid rgb(48 54 61 / 72%);
		}

		.branch:last-child {
			border-bottom: 0;
		}

		.branch-index {
			color: var(--faint);
			font-size: 13px;
			font-variant-numeric: tabular-nums;
		}

		.branch-name {
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
			font-size: 13px;
		}

		.branch-date {
			color: var(--muted);
			font-size: 13px;
			font-variant-numeric: tabular-nums;
		}

		.footer {
			display: flex;
			justify-content: space-between;
			gap: 16px;
			padding: 18px 36px;
			border-top: 1px solid var(--line);
			background: var(--surface-soft);
			color: var(--muted);
			font-size: 12px;
		}

		@media (max-width: 1040px) {
			.ranking-grid,
			.branch-grid {
				grid-template-columns: 1fr;
			}

			.meta-panel {
				grid-template-columns: repeat(2, minmax(0, 1fr));
			}

			.meta-row:nth-child(2n) {
				border-right: 0;
			}
		}

		@media (max-width: 680px) {
			.report {
				width: 100%;
				margin: 0;
				border-radius: 0;
				border-left: 0;
				border-right: 0;
			}

			.masthead,
			.content {
				padding-left: 18px;
				padding-right: 18px;
			}

			.masthead {
				padding-top: 42px;
			}

			.meta-panel {
				grid-template-columns: 1fr;
			}

			.meta-row,
			.meta-row:nth-child(2n) {
				border-right: 0;
				border-bottom: 1px solid var(--line);
			}

			.meta-row:last-child {
				border-bottom: 0;
			}

			.section-head {
				grid-template-columns: 1fr;
			}

			.scope {
				text-align: left;
			}

			.heatmap-board {
				grid-template-columns: 30px minmax(0, 1fr);
			}

			.weekdays {
				grid-template-rows: 16px repeat(7, 8px);
				gap: 2px;
				font-size: 9px;
				line-height: 8px;
			}

			.heatmap-months {
				flex-wrap: wrap;
				justify-content: flex-start;
				gap: 12px 14px;
			}

			.month-block {
				grid-template-rows: 16px auto;
			}

			.month-label {
				font-size: 10px;
			}

			.month-grid {
				grid-auto-columns: 8px;
				grid-template-rows: repeat(7, 8px);
				gap: 2px;
			}

			.cell {
				width: 8px;
				height: 8px;
				border-radius: 2px;
			}

			.rank-row {
				grid-template-columns: 30px minmax(88px, 1fr) 64px;
			}

			.bar-track {
				display: none;
			}

			.footer {
				display: block;
				padding-left: 18px;
				padding-right: 18px;
			}
		}`;

export type SupportedLanguage = 'en' | 'zh';

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'zh'];

type CliMessages = {
	description: string;
	helpOption: string;
	options: {
		last: string;
		year: string;
		month: string;
		from: string;
		to: string;
		branch: string;
		repo: string;
		author: string;
		me: string;
		html: string;
		path: string;
	};
	helpText: (maxSinceDays: number) => string;
	helpHeaders: {
		usage: string;
		arguments: string;
		options: string;
		globalOptions: string;
		commands: string;
	};
	helpExtras: {
		choices: string;
		default: string;
		preset: string;
		env: string;
	};
	errors: {
		positiveInteger: (optionName: string) => string;
		maxLastDays: (maxSinceDays: number) => string;
		yearFormat: string;
		monthFormat: string;
		fixedRangeConflict: string;
		customRangeConflict: string;
		customRangeSamePrecision: string;
		fromAfterTo: string;
		maxRangeDays: (maxSinceDays: number) => string;
		monthOutOfRange: (optionName: string) => string;
		invalidDate: (optionName: string) => string;
		dateFormat: (optionName: string) => string;
		authorMeConflict: string;
	};
	commanderError: (value: string) => string;
};

type UiMessages = {
	checkInputHint: string;
	repository: string;
	currentBranch: string;
	analysisBranch: string;
	dateRange: string;
	authorFilter: string;
	currentUser: string;
	missingGitUser: string;
	noMatchingCommits: string;
	repositoryHeatmapTitle: string;
	currentUserHeatmapTitle: string;
	repositoryHeatmapScope: string;
	currentUserHeatmapScope: (user: string) => string;
	defaultBranchTitle: string;
	defaultBranchDescription: string;
	activeBranchesTitle: string;
	staleBranchesTitle: string;
	activeBranchesDescription: string;
	staleBranchesDescription: (date: string) => string;
	unknownDefaultBranch: string;
	noDefaultBranch: string;
	noActiveBranches: string;
	noStaleBranches: string;
	currentBranchPrefix: string;
	changedLinesPerDayRankingTitle: string;
	commitRankingTitle: string;
	changedLinesRankingTitle: string;
	fileHotspotsTitle: string;
	topFilesTitle: string;
	topExtensionsTitle: string;
	multiAuthorFilesTitle: string;
	noFileHotspots: string;
	noExtension: string;
	hotspotMeta: (authorCount: number, commitCount: number) => string;
	currentRank: (rank: number, total: number) => string;
	missingCurrentRank: (total: number) => string;
	currentUserPrefix: string;
	noData: string;
	less: string;
	more: string;
	monthlyView: string;
	weekdays: string[];
	months: string[];
	unknownAuthor: string;
};

type DateMessages = {
	lastDays: (days: number) => string;
	firstCommit: string;
	today: string;
};

type ConfigMessages = {
	jsonFormatError: (filePath: string) => string;
	mustBeObject: string;
	invalidLanguage: (language: string) => string;
	authorsMustBeArray: string;
	authorGroupMustBeObject: (index: number) => string;
	displayNameMustBeString: (index: number) => string;
	displayEmailMustBeString: (index: number) => string;
	namesMustBeStringArray: (index: number) => string;
	emailsMustBeStringArray: (index: number) => string;
	groupMustHaveMatcher: (index: number) => string;
	duplicateName: (name: string) => string;
	duplicateEmail: (email: string) => string;
	signatureMatchesMultipleGroups: (signature: string) => string;
	groupResolveConflict: (signature: string) => string;
};

type GitMessages = {
	notRepository: (repoPath: string) => string;
	branchNotFound: (branchName: string) => string;
	currentGitUserMissing: string;
};

type HtmlMessages = {
	pageTitle: string;
	reportTitle: string;
	metadataLabel: string;
	repository: string;
	currentBranch: string;
	analysisBranch: string;
	dateRange: string;
	currentUser: string;
	authorFilter: string;
	rankingsTitle: string;
	currentUserRankingHighlighted: string;
	branchActivityTitle: string;
	branchActivityNote: string;
	defaultBranchDescription: string;
	activeBranchesDescription: string;
	staleBranchesDescription: string;
	emptyHeatmap: string;
	generatedBy: string;
	generatedAt: (time: string) => string;
	wroteReport: (filePath: string) => string;
};

export type Messages = {
	cli: CliMessages;
	ui: UiMessages;
	date: DateMessages;
	config: ConfigMessages;
	git: GitMessages;
	html: HtmlMessages;
	fatalError: (message: string) => string;
};

export const messages: Record<SupportedLanguage, Messages> = {
	en: {
		cli: {
			description: 'One-shot Git repository analysis CLI',
			helpOption: 'Display help',
			options: {
				last: 'Analyze the last N days, default 365, max 3650',
				year: 'Analyze a specific year',
				month: 'Analyze a specific month',
				from: 'Start date, supports yyyy, yyyy-MM, yyyy-MM-dd',
				to: 'End date, supports yyyy, yyyy-MM, yyyy-MM-dd',
				branch: 'Branch to analyze, defaults to current branch',
				repo: 'Git repository path, defaults to current directory',
				author: 'Only show authors matching the name or email query',
				me: 'Focus on the current Git configured user and ranking',
				html: 'Write a static HTML report instead of rendering the terminal UI',
				path: 'HTML report output file, defaults to git-insight-report.html in the repository root'
			},
			helpText: maxSinceDays => `
Date range:
  Defaults to --last 365.
  Choose only one range mode from --last, --year, --month, or --from/--to.
  --from and --to can be used separately; when used together they must use the same format.
  With only --from, the end defaults to today. With only --to, the start defaults to the first commit on the analyzed branch.
  Every date range supports at most ${maxSinceDays} days.

Author filter:
  Choose only one of --author and --me.
  --author matches author names, emails, and configured alias display names/emails.
  --me uses user.name / user.email from the current repository Git config. The heatmap shows the current user, and rankings show the user's position in the whole repository.

Output:
  By default, show the contribution heatmap, author rankings, and active/stale branches.
  When --branch targets a single branch, active/stale branches are hidden.

Examples:
  git-insight --help
  git-insight
  git-insight --repo /path/to/repo
  git-insight --repo /path/to/repo --last 90
  git-insight --repo /path/to/repo --year 2025
  git-insight --repo /path/to/repo --month 2025-04
  git-insight --repo /path/to/repo --from 2024 --to 2025
  git-insight --repo /path/to/repo --from 2025-04-01 --to 2025-04-20
  git-insight --repo /path/to/repo --branch main --author alice
  git-insight --repo /path/to/repo --me
  git-insight --repo /path/to/repo --html --path /path/to/report.html
`,
			helpHeaders: {
				usage: 'Usage:',
				arguments: 'Arguments:',
				options: 'Options:',
				globalOptions: 'Global Options:',
				commands: 'Commands:'
			},
			helpExtras: {
				choices: 'choices: ',
				default: 'default: ',
				preset: 'preset: ',
				env: 'env: '
			},
			errors: {
				positiveInteger: optionName => `${optionName} must be a positive integer.`,
				maxLastDays: maxSinceDays => `--last supports at most ${maxSinceDays} days.`,
				yearFormat: '--year must use yyyy format.',
				monthFormat: '--month must use yyyy-MM format.',
				fixedRangeConflict: 'Specify only one of --last, --year, and --month.',
				customRangeConflict: '--from/--to cannot be used with --last, --year, or --month.',
				customRangeSamePrecision: '--from and --to must use the same format when used together.',
				fromAfterTo: '--from cannot be later than --to.',
				maxRangeDays: maxSinceDays => `Date ranges support at most ${maxSinceDays} days.`,
				monthOutOfRange: optionName => `${optionName} month must be between 01 and 12.`,
				invalidDate: optionName => `${optionName} must be an existing date.`,
				dateFormat: optionName => `${optionName} must use yyyy, yyyy-MM, or yyyy-MM-dd format.`,
				authorMeConflict: 'Specify only one of --author and --me.'
			},
			commanderError: value => value
		},
		ui: {
			checkInputHint: 'Check --repo, --branch, or project/global .git-insight.json.',
			repository: 'Repository:',
			currentBranch: 'Current branch:',
			analysisBranch: 'Analysis branch:',
			dateRange: 'Date range:',
			authorFilter: 'Author filter:',
			currentUser: 'Current user:',
			missingGitUser: 'Not found',
			noMatchingCommits: 'No matching commit data in the current date range.',
			repositoryHeatmapTitle: 'Repository Contribution Heatmap',
			currentUserHeatmapTitle: 'Current Git User Contribution Heatmap',
			repositoryHeatmapScope: 'Scope: all matching authors in the repository',
			currentUserHeatmapScope: user => `Scope: current Git user ${user}`,
			defaultBranchTitle: 'Default Branch',
			defaultBranchDescription: 'Primary branch shown separately from active and stale branches.',
			activeBranchesTitle: 'Active Branches',
			staleBranchesTitle: 'Stale Branches',
			activeBranchesDescription: 'Committed in the last 90 days. Excludes the default branch.',
			staleBranchesDescription: date => `No commits in the last 90 days. Threshold date: ${date}`,
			unknownDefaultBranch: 'unknown',
			noDefaultBranch: 'No default branch found',
			noActiveBranches: 'No active branches',
			noStaleBranches: 'No stale branches',
			currentBranchPrefix: 'current',
			changedLinesPerDayRankingTitle: 'Daily Code Change Velocity Ranking (lines/day)',
			commitRankingTitle: 'Commit Count Ranking (commits)',
			changedLinesRankingTitle: 'Code Change Ranking (lines)',
			fileHotspotsTitle: 'File Hotspots',
			topFilesTitle: 'Top Files by Changed Lines',
			topExtensionsTitle: 'Top File Types by Changed Lines',
			multiAuthorFilesTitle: 'Multi-author Hotspot Files',
			noFileHotspots: 'No file hotspot data.',
			noExtension: 'no extension',
			hotspotMeta: (authorCount, commitCount) => `${authorCount} authors, ${commitCount} commits`,
			currentRank: (rank, total) => `Your rank ${rank}/${total}`,
			missingCurrentRank: total => `Your rank -/${total} (current Git user has no commits in this range)`,
			currentUserPrefix: 'you',
			noData: 'No data',
			less: 'Less',
			more: 'More',
			monthlyView: 'Monthly view',
			weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
			months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
			unknownAuthor: 'Unknown author'
		},
		date: {
			lastDays: days => `Last ${days} days`,
			firstCommit: 'first commit',
			today: 'today'
		},
		config: {
			jsonFormatError: filePath => `Git Insight config JSON format error: ${filePath}`,
			mustBeObject: 'Git Insight config must be an object.',
			invalidLanguage: language => `Git Insight config language must be "en" or "zh", got: ${language}`,
			authorsMustBeArray: 'Git Insight config authors must be an array.',
			authorGroupMustBeObject: index => `Author alias group ${index} must be an object.`,
			displayNameMustBeString: index => `Author alias group ${index} displayName must be a non-empty string.`,
			displayEmailMustBeString: index => `Author alias group ${index} displayEmail must be a non-empty string.`,
			namesMustBeStringArray: index => `Author alias group ${index} names must be a string array.`,
			emailsMustBeStringArray: index => `Author alias group ${index} emails must be a string array.`,
			groupMustHaveMatcher: index => `Author alias group ${index} must include names or emails.`,
			duplicateName: name => `Author name appears in multiple alias groups: ${name}`,
			duplicateEmail: email => `Email appears in multiple alias groups: ${email}`,
			signatureMatchesMultipleGroups: signature => `Author signature matches multiple alias groups: ${signature}`,
			groupResolveConflict: signature => `Author alias group resolution conflict: ${signature}`
		},
		git: {
			notRepository: repoPath => `Not a Git repository: ${repoPath}`,
			branchNotFound: branchName => `Branch not found: ${branchName}`,
			currentGitUserMissing: 'Could not read the current Git configured user. Configure user.name or user.email first.'
		},
		html: {
			pageTitle: 'Git Insight Report',
			reportTitle: 'Git Repository Analysis Report',
			metadataLabel: 'Report metadata',
			repository: 'Repository',
			currentBranch: 'Current Branch',
			analysisBranch: 'Analysis Branch',
			dateRange: 'Date Range',
			currentUser: 'Current User',
			authorFilter: 'Author Filter',
			rankingsTitle: 'Author Rankings',
			currentUserRankingHighlighted: 'Current user ranking is highlighted',
			branchActivityTitle: 'Branch Activity',
			branchActivityNote: 'Default branch is shown separately. Active and stale lists include other local branches.',
			defaultBranchDescription: 'Primary branch.',
			activeBranchesDescription: 'Committed in the last 90 days.',
			staleBranchesDescription: 'No commits in the last 90 days.',
			emptyHeatmap: 'No matching commit data for the heatmap.',
			generatedBy: 'Generated by Git Insight. This static HTML report uses data from the local Git repository.',
			generatedAt: time => `Generated at ${time}`,
			wroteReport: filePath => `HTML report written to ${filePath}`
		},
		fatalError: message => `Git Insight failed: ${message}`
	},
	zh: {
		cli: {
			description: '一次性输出型 Git 仓库分析工具',
			helpOption: '显示帮助信息',
			options: {
				last: '统计最近 N 天数据，默认 365，最大 3650',
				year: '统计指定年份数据',
				month: '统计指定月份数据',
				from: '统计起始时间，支持 yyyy、yyyy-MM、yyyy-MM-dd',
				to: '统计结束时间，支持 yyyy、yyyy-MM、yyyy-MM-dd',
				branch: '指定分析分支，默认当前分支',
				repo: '指定 Git 仓库目录，默认当前目录',
				author: '只展示匹配作者名称或邮箱的数据',
				me: '聚焦当前 Git 配置用户的数据和排名',
				html: '生成静态 HTML 报告，不渲染终端界面',
				path: 'HTML 报告输出文件，默认生成到仓库根目录的 git-insight-report.html'
			},
			helpText: maxSinceDays => `
时间范围:
  默认使用 --last 365。
  --last、--year、--month、--from/--to 只能选择一种时间范围。
  --from 和 --to 可以单独使用；同时使用时必须采用相同格式。
  只有 --from 时默认统计到今天，只有 --to 时默认从当前分析分支的第一个提交开始。
  所有时间范围最大支持 ${maxSinceDays} 天。

作者过滤:
  --author 和 --me 只能选择一个。
  --author 会匹配作者名称、邮箱和配置合并后的展示名称/邮箱。
  --me 使用当前仓库 Git 配置中的 user.name / user.email；热力图展示本人，排行榜展示全仓库排名中的本人位置。

显示内容:
  默认显示提交热力图、作者排名和活跃/不活跃分支。
  使用 --branch 指定单个分析分支时，不展示活跃/不活跃分支。

示例:
  git-insight --help
  git-insight
  git-insight --repo /path/to/repo
  git-insight --repo /path/to/repo --last 90
  git-insight --repo /path/to/repo --year 2025
  git-insight --repo /path/to/repo --month 2025-04
  git-insight --repo /path/to/repo --from 2024 --to 2025
  git-insight --repo /path/to/repo --from 2025-04-01 --to 2025-04-20
  git-insight --repo /path/to/repo --branch main --author alice
  git-insight --repo /path/to/repo --me
  git-insight --repo /path/to/repo --html --path /path/to/report.html
`,
			helpHeaders: {
				usage: '用法：',
				arguments: '参数：',
				options: '选项：',
				globalOptions: '全局选项：',
				commands: '命令：'
			},
			helpExtras: {
				choices: '可选值：',
				default: '默认：',
				preset: '预设：',
				env: '环境变量：'
			},
			errors: {
				positiveInteger: optionName => `${optionName} 必须是正整数。`,
				maxLastDays: maxSinceDays => `--last 最大支持 ${maxSinceDays} 天。`,
				yearFormat: '--year 必须是 yyyy 格式。',
				monthFormat: '--month 必须是 yyyy-MM 格式。',
				fixedRangeConflict: '--last、--year、--month 只能指定一个。',
				customRangeConflict: '--from/--to 不能和 --last、--year、--month 同时使用。',
				customRangeSamePrecision: '--from 和 --to 同时使用时必须采用相同格式。',
				fromAfterTo: '--from 不能晚于 --to。',
				maxRangeDays: maxSinceDays => `时间范围最大支持 ${maxSinceDays} 天。`,
				monthOutOfRange: optionName => `${optionName} 的月份必须在 01 到 12 之间。`,
				invalidDate: optionName => `${optionName} 必须是存在的日期。`,
				dateFormat: optionName => `${optionName} 必须是 yyyy、yyyy-MM 或 yyyy-MM-dd 格式。`,
				authorMeConflict: '--author 和 --me 只能指定一个。'
			},
			commanderError: value => value
				.replace(/^error: unknown option '([^']+)'/m, '错误：未知选项 \'$1\'')
				.replace(/^error: option '([^']+)' argument missing/m, '错误：选项 \'$1\' 缺少参数')
				.replace(/^error: required option '([^']+)' not specified/m, '错误：必填选项 \'$1\' 未指定')
				.replace(/^error: missing required argument '([^']+)'/m, '错误：缺少必填参数 \'$1\'')
				.replace(/^error: too many arguments\. Expected (\d+) arguments? but got (\d+)\./m, '错误：参数过多。需要 $1 个，收到 $2 个。')
				.replace(/\(Did you mean one of ([^)]+)\?\)/g, '（你是想输入这些选项之一吗：$1？）')
				.replace(/\(Did you mean ([^)]+)\?\)/g, '（你是想输入 $1 吗？）')
		},
		ui: {
			checkInputHint: '请检查 --repo、--branch，或项目/全局 .git-insight.json。',
			repository: '仓库：',
			currentBranch: '当前分支:',
			analysisBranch: '分析分支:',
			dateRange: '统计范围：',
			authorFilter: '作者过滤：',
			currentUser: '当前用户：',
			missingGitUser: '未读取到',
			noMatchingCommits: '当前统计范围内没有匹配的提交数据。',
			repositoryHeatmapTitle: '仓库贡献热力图',
			currentUserHeatmapTitle: '当前 Git 用户贡献热力图',
			repositoryHeatmapScope: '统计口径：仓库内所有匹配作者',
			currentUserHeatmapScope: user => `统计口径：当前 Git 用户 ${user}`,
			defaultBranchTitle: '默认分支',
			defaultBranchDescription: '主分支单独展示，不参与活跃/不活跃分支列表',
			activeBranchesTitle: '活跃分支',
			staleBranchesTitle: '不活跃分支',
			activeBranchesDescription: '最近 90 天有提交，不包含默认分支',
			staleBranchesDescription: date => `最近 90 天无提交，阈值日期：${date}`,
			unknownDefaultBranch: '未识别',
			noDefaultBranch: '未识别到默认分支',
			noActiveBranches: '当前没有活跃分支',
			noStaleBranches: '当前没有不活跃分支',
			currentBranchPrefix: '当前',
			changedLinesPerDayRankingTitle: '每日代码改动增速排行榜 (行/天)',
			commitRankingTitle: '提交数排行榜 (次)',
			changedLinesRankingTitle: '代码改动排行榜 (行)',
			fileHotspotsTitle: '文件热点',
			topFilesTitle: '改动最多的文件',
			topExtensionsTitle: '改动最多的文件类型',
			multiAuthorFilesTitle: '多作者热点文件',
			noFileHotspots: '暂无文件热点数据。',
			noExtension: '无扩展名',
			hotspotMeta: (authorCount, commitCount) => `${authorCount} 位作者，${commitCount} 次提交`,
			currentRank: (rank, total) => `你的排名 ${rank}/${total}`,
			missingCurrentRank: total => `你的排名 -/${total}（当前 Git 用户在统计范围内无提交）`,
			currentUserPrefix: '你',
			noData: '暂无数据',
			less: '少',
			more: '多',
			monthlyView: '按月视图',
			weekdays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
			months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
			unknownAuthor: '未知作者'
		},
		date: {
			lastDays: days => `最近 ${days} 天`,
			firstCommit: '首个提交',
			today: '今天'
		},
		config: {
			jsonFormatError: filePath => `Git Insight 配置 JSON 格式错误：${filePath}`,
			mustBeObject: 'Git Insight 配置必须是对象。',
			invalidLanguage: language => `Git Insight 配置 language 必须是 "en" 或 "zh"，当前值：${language}`,
			authorsMustBeArray: '作者合并配置必须包含 authors 数组。',
			authorGroupMustBeObject: index => `第 ${index} 个作者合并配置必须是对象。`,
			displayNameMustBeString: index => `第 ${index} 个作者合并配置的 displayName 必须是非空字符串。`,
			displayEmailMustBeString: index => `第 ${index} 个作者合并配置的 displayEmail 必须是非空字符串。`,
			namesMustBeStringArray: index => `第 ${index} 个作者合并配置的 names 必须是字符串数组。`,
			emailsMustBeStringArray: index => `第 ${index} 个作者合并配置的 emails 必须是字符串数组。`,
			groupMustHaveMatcher: index => `第 ${index} 个作者合并配置必须包含 names 或 emails。`,
			duplicateName: name => `作者名称重复出现在多个作者合并组：${name}`,
			duplicateEmail: email => `邮箱重复出现在多个作者合并组：${email}`,
			signatureMatchesMultipleGroups: signature => `作者签名同时匹配多个作者合并组：${signature}`,
			groupResolveConflict: signature => `作者合并组解析冲突：${signature}`
		},
		git: {
			notRepository: repoPath => `目录不是 Git 仓库：${repoPath}`,
			branchNotFound: branchName => `找不到指定分支：${branchName}`,
			currentGitUserMissing: '未读取到当前 Git 配置用户，请先配置 user.name 或 user.email。'
		},
		html: {
			pageTitle: 'Git Insight 报告',
			reportTitle: 'Git 仓库分析报告',
			metadataLabel: '报告元信息',
			repository: '仓库',
			currentBranch: '当前分支',
			analysisBranch: '分析分支',
			dateRange: '统计范围',
			currentUser: '当前用户',
			authorFilter: '作者过滤',
			rankingsTitle: '作者排行榜',
			currentUserRankingHighlighted: '当前用户排名已高亮',
			branchActivityTitle: '分支活跃度',
			branchActivityNote: '默认分支单独展示，活跃/不活跃列表统计其他本地分支。',
			defaultBranchDescription: '主分支。',
			activeBranchesDescription: '最近 90 天有提交。',
			staleBranchesDescription: '最近 90 天无提交。',
			emptyHeatmap: '热力图没有匹配的提交数据。',
			generatedBy: '由 Git Insight 生成。此静态 HTML 报告使用本地 Git 仓库数据。',
			generatedAt: time => `生成时间 ${time}`,
			wroteReport: filePath => `HTML 报告已生成：${filePath}`
		},
		fatalError: message => `Git Insight 执行失败：${message}`
	}
};

export function getMessages(language: SupportedLanguage = DEFAULT_LANGUAGE): Messages {
	return messages[language] ?? messages[DEFAULT_LANGUAGE];
}

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
	return typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

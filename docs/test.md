# 测试说明

## 运行方式

```bash
npm test
```

测试入口会先编译 CLI 到 `dist/`，再使用 Node.js 内置 test runner 运行测试。TypeScript 测试文件仍通过 `tsx` 直接执行，CLI 端到端测试运行编译后的 `dist/index.js`，更接近实际安装后的运行方式。当前入口定义在 `package.json`：

```bash
node test/run-tests.mjs
```

涉及类型、模块导入或 CLI 行为的改动，提交前还应运行：

```bash
npm run build
```

## 测试仓库策略

涉及 Git 行为的 CLI 端到端测试都会在系统临时目录下创建独立 Git 仓库，不依赖本机已有项目仓库。帮助信息、非法参数组合和非 Git 目录等用例只创建所需的最小临时环境。

相关 helper：

- `test/helpers/tempGitRepository.ts`：初始化临时仓库，通过 `git fast-import` 创建提交/删除文件历史，切换分支、写入 `.git-insight.json`，并在测试结束后清理临时目录。
- `test/helpers/cli.ts`：通过 `node dist/index.js` 运行 CLI，并为每次运行隔离临时 `HOME`、`XDG_CONFIG_HOME` 和 Git 全局/系统配置入口，避免本机配置或全局 `.git-insight.json` 污染测试。

## CLI 端到端测试

文件：`test/cli.test.ts`

| 测试案例 | 命令形态 | 场景 | 预期 |
| --- | --- | --- | --- |
| 按指定月份统计临时仓库提交，并输出排行榜 | `git-insight --repo <临时仓库> --month 2025-04` | 仓库包含 2025-03 的 Carol 提交，以及 2025-04 的 Alice、Bob 提交。 | 默认英文；退出码为 `0`；输出仓库名、`Current branch: main`、`Analysis branch: main`、`Date range: 2025-04`、Commit Count Ranking、Alice、Bob；不输出 Carol。 |
| 默认展示文件热点 | `git-insight --repo <临时仓库> --month 2025-04` | 仓库包含 2025-04 内多个文件改动。 | 输出 File Hotspots、Top Files by Changed Lines 和关键文件路径。 |
| 支持 `--last` 统计最近 N 天提交 | `git-insight --repo <临时仓库> --last 7` | 仓库包含最近 7 天内的 Recent Author 提交，以及 10 天前的 Old Author 提交。 | 退出码为 `0`；输出 `Date range: Last 7 days` 和 Recent Author；不输出 Old Author。 |
| 支持 `--year` 只统计指定年份提交 | `git-insight --repo <临时仓库> --year 2025` | 仓库包含 2024-12-31 和 2025-01-01 两个提交。 | 退出码为 `0`；输出 `Date range: 2025` 和 Target Year；不输出 Last Year。 |
| 支持单独使用 `--from` 统计到 today | `git-insight --repo <临时仓库> --from <日期>` | 仓库包含指定起始日期前后的提交。 | 退出码为 `0`；输出 `<日期>..today`；只输出范围内作者。 |
| 支持单独使用 `--to` 从 first commit 统计到指定日期 | `git-insight --repo <临时仓库> --to 2025-01-31` | 仓库首个提交在 2025-01-10，另有 2025-02-10 提交。 | 退出码为 `0`；输出 `first commit..2025-01-31` 和 First Author；不输出 After Author。 |
| 支持中文路径和中文作者名仓库 | `git-insight --repo <中文路径临时仓库> --from 2025-04-01 --to 2025-04-30` | 临时仓库路径包含中文，提交作者名和文件路径也包含中文。 | 退出码为 `0`；输出仓库名和中文作者名。 |
| 支持 `--branch` 分析指定分支 | `git-insight --repo <临时仓库> --branch feature/report --from 2025-04-01 --to 2025-04-30` | 当前检出 `main`，指定分析 `feature/report`，该分支有 Branch User 提交。 | 退出码为 `0`；输出 `Current branch: main`、`Analysis branch: feature/report` 和 Branch User；不输出 Active/Stale Branches。 |
| 未指定 `--branch` 时展示默认、活跃和不活跃分支 | `git-insight --repo <临时仓库> --last 3650` | 仓库包含默认分支、最近 90 天内提交的 `feature/active`，以及超过 90 天未提交的 `feature/stale`。 | 退出码为 `0`；输出 `Default Branch`、`main`、`Active Branches`、`feature/active`、`Stale Branches` 和 `current feature/stale`。 |
| 只有默认分支时仍展示默认分支 | `git-insight --repo <临时仓库> --last 3650` | 仓库只包含最近提交的 `main` 分支。 | 退出码为 `0`；输出 `Default Branch`、`current main`、`No active branches` 和 `No stale branches`。 |
| 支持 detached HEAD 状态下分析当前提交 | `git-insight --repo <临时仓库> --from 2025-04-01 --to 2025-04-30` | 仓库检出到 detached HEAD。 | 退出码为 `0`；输出 `Current branch: HEAD`、`Analysis branch: HEAD` 和 Detached User。 |
| 支持 `--author` 过滤作者数据 | `git-insight --repo <临时仓库> --from 2025-04-01 --to 2025-04-30 --author bob@example.com` | 仓库在范围内包含 Alice 和 Bob 提交。 | 退出码为 `0`；输出 `Author filter: bob@example.com` 和 Bob；不输出 Alice。 |
| 默认输出多作者热点文件 | `git-insight --repo <临时仓库> --from 2025-04-01 --to 2025-04-30` | Alice 和 Bob 在统计范围内先后修改同一个长路径文件。 | 退出码为 `0`；输出 File Hotspots、Multi-author Hotspot Files 和完整文件路径；不输出 Top Directories by Changed Lines；多作者热点文件的图表值为不同作者人数。 |
| 中文配置下输出中文文件热点 | `git-insight --repo <临时仓库> --from 2025-04-01 --to 2025-04-30` | 仓库内 `.git-insight.json` 设置 `{ "language": "zh" }`，且包含无扩展名文件改动。 | 退出码为 `0`；输出文件热点、改动最多的文件类型和无扩展名。 |
| 仓库配置 `excludePatterns` 会排除统计文件、目录和通配符命中项 | `git-insight --repo <临时仓库> --from 2025-04-01 --to 2025-04-30` | 仓库内 `.git-insight.json` 设置 `excludePatterns`，包含精确文件、目录和通配符规则；仓库提交源码、锁文件、构建产物和生成文件。 | 退出码为 `0`；只输出源码作者和源码文件；不输出被排除文件的作者、路径和文件热点。 |
| 支持 `--me` 使用临时仓库本地 Git 用户配置 | `git-insight --repo <临时仓库> --from 2025-04-01 --to 2025-04-30 --me` | 仓库本地 Git 用户配置为 `Bob <bob@example.com>`。 | 退出码为 `0`；输出当前用户、`Your rank`，并以 `you Bob` 展示当前用户。 |
| 使用 `--me` 但仓库没有 Git 用户配置时返回可读错误 | `git-insight --repo <临时仓库> --from 2025-04-01 --to 2025-04-30 --me` | 临时仓库不配置本地 `user.name` 和 `user.email`，运行环境也隔离了 HOME。 | 退出码为 `1`；输出 `Could not read the current Git configured user`。 |
| 空仓库会输出无提交数据提示 | `git-insight --repo <空临时仓库> --from 2025-04-01 --to 2025-04-30` | 仓库已 `git init`，但没有任何提交。 | 退出码为 `0`；输出 `No matching commit data in the current date range`；不输出 Ranking。 |
| 支持 `--html` 按指定路径生成英文报告 | `git-insight --repo <临时仓库> --month 2025-04 --html --path <report.html>` | 仓库包含 2025-04 的 Alice、Bob 提交，报告路径位于独立临时目录。 | 退出码为 `0`；输出生成路径；报告文件包含 `<html lang="en">`、英文标题、仓库名、文件热点、热点独立宽布局、作者排行榜、Alice、Bob、热力图容器，并为仓库名、作者名和文件路径写入悬浮完整文本。 |
| 支持 `--html` 不指定 `--path` 时生成到仓库根目录 | `git-insight --repo <临时仓库> --month 2025-04 --html` | 仓库包含提交，未显式指定报告文件路径。 | 退出码为 `0`；生成 `<仓库根目录>/git-insight-report.html`；文件包含英文标题和 Date Range。 |
| 仓库配置 `language: "zh"` 时 `--html` 生成中文报告 | `git-insight --repo <临时仓库> --month 2025-04 --html --path <中文报告.html>` | 仓库内 `.git-insight.json` 设置 `{ "language": "zh" }`。 | 退出码为 `0`；输出中文生成提示；报告包含 `<html lang="zh-CN">`、中文标题、文件热点、作者排行榜和提交数排行榜；不输出英文 `Repository`。 |
| `--html` 分析非 Git 目录时不生成报告 | `git-insight --repo <临时非 Git 目录> --html --path <report.html>` | 创建普通临时目录，不执行 `git init`，同时指定报告路径。 | 退出码为 `1`；输出 `Not a Git repository`；报告文件不存在。 |
| 非 Git 目录会返回可读错误 | `git-insight --repo <临时非 Git 目录>` | 创建普通临时目录，不执行 `git init`。 | 退出码为 `1`；输出 `Not a Git repository`。 |
| 不存在的分支会返回可读错误 | `git-insight --repo <临时仓库> --branch missing-branch` | 仓库存在提交，但指定分支不存在。 | 退出码为 `1`；输出 `Branch not found: missing-branch`。 |
| 参数组合非法时返回可读错误 | `git-insight --last 7 --month 2025-04` | 同时指定互斥的固定时间范围。 | 退出码为 `1`；输出 `Specify only one of --last, --year, and --month`。 |
| 未知参数默认返回英文错误 | `git-insight --since` | 使用不支持的参数。 | 退出码为 `1`；输出 `error: unknown option '--since'`，不输出中文未知参数错误。 |
| 已移除的显示开关会返回未知参数错误 | `git-insight --no-heatmap` | 使用已移除的显示开关。 | 退出码为 `1`；输出 `error: unknown option '--no-heatmap'`，不输出中文未知参数错误。 |
| 帮助命令输出关键参数说明 | `git-insight --help` | 请求 CLI 帮助。 | 退出码为 `0`；输出 `Usage:`、`Options:`、`--repo <path>`、`--from <date>`、`--me`。 |
| 仓库配置 `language: "zh"` 时输出中文界面 | `git-insight --repo <临时仓库> --month 2025-04` | 仓库内 `.git-insight.json` 设置 `{ "language": "zh" }`。 | 退出码为 `0`；输出仓库名、`当前分支: main`、`分析分支: main`、`统计范围：2025-04`、提交数排行榜；不输出 `Repository:`。 |
| 仓库配置 `language: "en"` 时输出英文界面 | `git-insight --repo <临时仓库> --month 2025-04` | 仓库内 `.git-insight.json` 设置 `{ "language": "en" }`。 | 退出码为 `0`；输出 `Repository:`、`Current branch:`、`Date range:`；不输出 `仓库：`。 |
| 用户主目录配置 `language: "zh"` 时输出中文界面 | `git-insight --repo <临时仓库> --month 2025-04` | 隔离的临时用户主目录中 `.git-insight.json` 设置 `{ "language": "zh" }`，仓库内无配置。 | 退出码为 `0`；输出中文仓库信息和提交数排行榜；不输出 `Repository:`。 |
| 中文配置下帮助和未知参数输出中文 | `git-insight --repo <临时仓库> --help`、`git-insight --repo <临时仓库> --since` | 仓库内 `.git-insight.json` 设置 `{ "language": "zh" }`。 | 帮助输出 `用法：`、`选项：`；未知参数输出 `错误：未知选项 '--since'`。 |
| 非法 `language` 配置会返回可读错误 | `git-insight --repo <临时仓库> --help` | 仓库内 `.git-insight.json` 设置 `{ "language": "ja" }`。 | 退出码为 `1`；输出 `Git Insight config language must be "en" or "zh"`。 |
| 临时仓库内的作者合并配置会参与命令统计 | `git-insight --repo <临时仓库> --from 2025-04-01 --to 2025-04-30 --author team@example.com` | 仓库内 `.git-insight.json` 将 Alice 合并展示为 `Alice Team <team@example.com>`。 | 退出码为 `0`；输出 Alice Team；不输出 Bob。 |

## 配置解析单测

文件：`test/config/gitInsightConfig.test.ts`

| 测试案例 | 被测对象 | 场景 | 预期 |
| --- | --- | --- | --- |
| 读取 `excludePatterns` 配置 | `loadGitInsightConfig` | 仓库内 `.git-insight.json` 包含精确文件、目录和通配符模式。 | 返回原始字符串数组，供统计过滤使用。 |
| 拒绝非法 `excludePatterns` 配置 | `loadGitInsightConfig` | `excludePatterns` 不是数组，或数组内包含非字符串。 | 抛出 `GitInsightConfigError` 和对应英文错误。 |

## 参数解析单测

文件：`test/cli/parseArgs.test.ts`

| 测试案例 | 被测对象 | 场景 | 预期 |
| --- | --- | --- | --- |
| `parseArgs` 使用默认范围 | `parseArgs([])` | 不传任何参数。 | 默认语言为 `en`，默认范围为 `Last 365 days`。 |
| `parseArgs` 解析合法时间范围 | `parseArgs` | 分别传入 `--last 7`、`--year 2025`、`--month 2025-04`、`--from 2025-04-01 --to 2025-04-30`。 | 正确生成固定或自定义时间范围，开始/结束日期符合预期。 |
| `parseArgs` 解析仓库、作者和分支参数 | `parseArgs` | 传入 `--repo`、`--branch`、`--author`。 | 仓库路径被解析为绝对路径；分支和作者值正确。 |
| `parseArgs` 解析 HTML 输出参数 | `parseArgs` | 传入 `--html --path report.html`。 | `html` 为 `true`；输出路径被解析为绝对路径。 |
| `parseArgs` 拒绝非法日期和互斥参数 | `parseArgs` | 传入非法 `--last`、非法月份、不存在日期、互斥时间参数、`--author` 与 `--me` 同用。 | 默认抛出对应英文错误。 |
| `createCustomDateRange` 处理自定义范围边界 | `createCustomDateRange` | 构造合法日期范围和 `from > to` 的非法范围。 | 合法范围 dayCount 正确；非法范围抛出 `--from cannot be later than --to`。 |

## Git 解析与真实 Git 命令测试

文件：`test/git/gitLogParser.test.ts`、`test/git/gitClient.test.ts`

| 测试案例 | 被测对象 | 场景 | 预期 |
| --- | --- | --- | --- |
| 解析多提交和多文件改动 | `parseGitLogWithNumstat` | 构造包含两个 commit、多条 numstat 的 Git log 文本。 | 正确解析 hash、作者、日期、提交级 additions/deletions 和文件级改动列表。 |
| 保留包含空格的文件路径 | `parseGitLogWithNumstat` | numstat 文件路径包含空格。 | 文件级改动列表保留完整路径。 |
| 将重命名路径规范化为目标路径 | `parseGitLogWithNumstat` | numstat 文件路径包含 Git 的 `{旧 => 新}` 紧凑重命名写法。 | 文件级改动列表使用目标路径，后续文件类型统计不会出现 `.java}` 一类后缀。 |
| 将二进制文件 numstat 计为 0 | `parseGitLogWithNumstat` | numstat 中 additions/deletions 为 `-`。 | additions、deletions 和文件级 changedLines 都为 `0`。 |
| 兼容 CRLF 换行输出 | `parseGitLogWithNumstat` | 构造使用 Windows CRLF 换行的 Git log 文本。 | 日期字段不带 `\r`，numstat 仍能正确累加。 |
| 忽略空输出和异常 header | `parseGitLogWithNumstat` | 输入空字符串或字段不完整的 commit header。 | 返回空数组，不产生脏数据。 |
| 读取临时仓库中的新增、修改和删除行统计 | `getLogWithNumstat` + `parseGitLogWithNumstat` | 临时仓库依次新增文件、减少内容、删除文件。 | 解析出 3 个提交，总新增行数为 3，总删除行数为 3。 |

## 作者合并与统计单测

文件：`test/analysis/authorAliases.test.ts`、`test/analysis/authorIdentity.test.ts`、`test/analysis/authorStats.test.ts`

| 测试案例 | 被测对象 | 场景 | 预期 |
| --- | --- | --- | --- |
| 读取仓库级作者合并配置 | `loadAuthorAliasLookup` | 仓库内 `.git-insight.json` 包含展示名、展示邮箱、names、emails，且含重复和空白字符。 | 返回规范化后的作者合并组，去掉空白和重复 matcher。 |
| 允许只配置语言 | `loadAuthorAliasLookup` | 仓库内 `.git-insight.json` 只包含 `{ "language": "zh" }`。 | 返回空作者合并组。 |
| 拒绝非法作者合并配置 | `loadAuthorAliasLookup` | 配置为非法 JSON、非法 `authors`、空 matcher、重复 name、重复 email。 | 抛出 `GitInsightConfigError` 或 `AuthorAliasConfigError` 和对应英文错误。 |
| 默认按原始签名解析作者 | `createAuthorIdentityResolver` | 同名但不同邮箱的两个提交，无作者合并配置。 | 两个签名保持独立，按原始邮箱匹配。 |
| 按作者合并配置覆盖展示名称和邮箱 | `createAuthorIdentityResolver` | 配置把两个不同签名合并为 `Alice Team <team@example.com>`。 | 两个签名解析到同一个 identity；可通过展示邮箱和原始邮箱匹配。 |
| 检测同一签名匹配多个作者合并组 | `createAuthorIdentityResolver` | 一个签名同时被一个 group 的 name 和另一个 group 的 email 命中。 | 抛出 `AuthorAliasConfigError`。 |
| 汇总提交数、增删行和每日改动速度 | `collectAuthorStats` | Alice 两个提交、Bob 一个提交，统计范围为 10 天。 | Alice 排第一；提交数、additions、deletions、changedLines、changedLinesPerDay 正确。 |
| 支持作者过滤和当前用户标记 | `collectAuthorStats` | 按 `bob` 过滤，并传入当前用户邮箱。 | 只返回 Bob，且 `isCurrentUser` 为 `true`。 |

## 文件热点统计单测

文件：`test/analysis/excludePatterns.test.ts`、`test/analysis/fileHotspotStats.test.ts`

| 测试案例 | 被测对象 | 场景 | 预期 |
| --- | --- | --- | --- |
| 按 `excludePatterns` 过滤提交文件 | `applyExcludePatterns` | 一个提交同时包含源码和锁文件，另有构建产物和生成文件提交。 | 精确文件、目录和通配符命中项被排除；剩余提交重算 additions、deletions；只剩排除文件的提交被移除。 |
| 未配置 `excludePatterns` 时保持原数据 | `applyExcludePatterns` | 不传排除规则。 | 返回原提交数组引用，避免无意义复制。 |
| 汇总文件、文件类型和多作者热点 | `collectFileHotspotStats` | 构造多个文件、扩展名和同一文件多作者改动。 | 文件、扩展名排行榜按改动行数排序；多作者热点只包含满足多作者和多提交条件的文件。 |
| 支持作者查询和当前用户过滤 | `collectFileHotspotStats` | Alice 和 Bob 修改不同文件，并分别传入作者查询和当前用户身份。 | 热点统计只包含匹配作者范围内的文件改动，多作者热点按过滤后数据重新计算。 |
| 多作者热点优先按作者数量排序 | `collectFileHotspotStats` | 构造一个 2 位作者但改动行更多的文件，以及一个 3 位作者但改动行更少的文件。 | 多作者热点中文件按不同作者人数优先排序，3 位作者的文件排在前面。 |
| 使用本地化无扩展名标签 | `collectFileHotspotStats` | 中文语言下统计 `LICENSE` 等无扩展名文件。 | 文件类型排行榜展示 `无扩展名`。 |

## 活跃/不活跃分支统计单测

文件：`test/analysis/branchActivityStats.test.ts`

| 测试案例 | 被测对象 | 场景 | 预期 |
| --- | --- | --- | --- |
| 按最近 90 天将本地分支分为活跃和不活跃 | `collectBranchGroups` | 临时仓库包含默认分支、近期提交分支、当前分支和超过 90 天未提交分支。 | 默认分支被排除；近期分支进入 active；旧分支进入 stale；当前分支标记正确。 |
| 排除默认分支且不活跃分支按最旧提交排序 | `collectBranchGroups` | 临时仓库包含 `main` 和两个超过 90 天未提交的 feature 分支。 | active 为空；stale 按最近提交日期升序排列；`main` 不出现在分组中。 |
| 只有默认分支时单独返回默认分支 | `collectBranchGroups` | 临时仓库只包含 `main` 分支。 | `defaultBranch` 为 `main` 并标记为当前分支；active 和 stale 均为空。 |

## 热力图统计单测

文件：`test/analysis/heatmapStats.test.ts`

| 测试案例 | 被测对象 | 场景 | 预期 |
| --- | --- | --- | --- |
| 一年内使用 daily 粒度并按天累加 | `collectContributionHeatmap` | 3 天范围内，两个提交落在同一天，另一个提交落在第三天。 | granularity 为 `daily`；每日 count 为 `2, 0, 1`。 |
| 超过一年使用 monthly 粒度并支持作者过滤 | `collectContributionHeatmap` | 486 天范围内，Alice 在 2024-01 有两个提交，Bob 在 2025-04 有一个提交；按 Alice 过滤。 | granularity 为 `monthly`；`2024-01` count 为 2；`2025-04` count 为 0。 |
| 无匹配提交时返回 undefined | `collectContributionHeatmap` | 按不存在的作者过滤。 | 返回 `undefined`，调用方不会渲染热力图。 |

## 热力图 UI 单测

文件：`test/ui/contributionHeatmap.test.ts`

| 测试案例 | 被测对象 | 场景 | 预期 |
| --- | --- | --- | --- |
| daily 热力图同月内周列不增加额外间距 | `buildWeeks`、`buildDailyHeatmapLayout`、`buildMonthLabels` | 统计 2025-01-06 到 2025-01-26 的连续日期。 | 布局宽度等于周列宽度总和；月份标签行宽度与布局一致。 |
| daily 热力图不同月份边界增加额外间距 | `buildWeeks`、`buildDailyHeatmapLayout`、`buildMonthLabels` | 统计 2025-01-01 到 2025-04-30 的连续日期。 | 3 个月份边界各增加 1 个空格；Jan、Feb、Mar、Apr 都显示。 |
| daily 热力图跨月周使用新月份标记 | `buildWeeks`、`buildDailyHeatmapLayout`、`buildMonthLabels` | 统计 2025-02-24 到 2025-03-09，首周同时包含 2 月和 3 月。 | 月份标签行宽度等于布局宽度；首周显示 Mar 标签。 |

## 维护建议

- 新增 CLI 参数或展示行为时，优先补充 `test/cli.test.ts` 的端到端测试，并继续使用临时仓库夹具构造场景。
- 纯解析、纯统计、作者合并等不依赖真实 Git 命令的逻辑，应补充对应单元测试。
- 每新增或调整一个测试案例，都要同步更新本文档，确保命令形态或被测函数、模拟场景、预期结果与测试代码一致。

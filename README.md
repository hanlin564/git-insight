# Git Insight

Git Insight 是一个基于 TypeScript、Ink 和 React 的一次性输出型终端 Git 分析工具。当前 MVP 分析单个本地 Git 仓库，后续结构已预留多仓库扫描和报告导出能力。

## 安装依赖

```bash
npm install
```

## 本地运行

默认分析当前目录：

```bash
npm run dev
```

指定仓库：

```bash
npm run dev -- --repo /path/to/repo
```

构建后运行：

```bash
npm run build
node dist/index.js --repo /path/to/repo
```

## 常用参数

```bash
--repo <path>           指定 Git 仓库目录，默认当前目录
--last <days>          统计最近 N 天数据，默认 365
--year <yyyy>          统计指定年份数据
--month <yyyy-MM>      统计指定月份数据
--from <date>          统计起始时间，支持 yyyy、yyyy-MM、yyyy-MM-dd
--to <date>            统计结束时间，支持 yyyy、yyyy-MM、yyyy-MM-dd
--branch <name>        指定分析分支，默认当前分支
--author <query>       只展示匹配作者名称或邮箱的数据
--me                   只展示当前 Git 配置用户的数据
--no-heatmap           关闭提交热力图
--no-ranking           关闭作者排名
```

`--last`、`--year`、`--month`、`--from/--to` 只能指定其中一种时间范围；如果都不指定，默认使用 `--last 365`。
`--from` 和 `--to` 可以单独使用，也可以配合使用；配合使用时必须采用相同格式。只有 `--from` 时默认统计到当前日期，只有 `--to` 时默认从当前分析分支的第一个提交开始。
所有时间范围最大支持 3650 天；超过一年的范围会使用月度热力图。
`--author` 和 `--me` 只能指定其中一个。作者排名固定显示前 10 条。

## 示例

查看最近 90 天统计：

```bash
npm run dev -- --repo /path/to/repo --last 90
```

查看 2025 年统计：

```bash
npm run dev -- --repo /path/to/repo --year 2025
```

查看 2025 年 4 月统计：

```bash
npm run dev -- --repo /path/to/repo --month 2025-04
```

查看 2024 年到 2025 年统计：

```bash
npm run dev -- --repo /path/to/repo --from 2024 --to 2025
```

查看 2025 年 4 月 1 日至 2025 年 4 月 20 日统计：

```bash
npm run dev -- --repo /path/to/repo --from 2025-04-01 --to 2025-04-20
```

查看从 2025 年 4 月至今的统计：

```bash
npm run dev -- --repo /path/to/repo --from 2025-04
```

指定分析分支：

```bash
npm run dev -- --repo /path/to/repo --branch main --last 90
```

只看指定作者：

```bash
npm run dev -- --repo /path/to/repo --author alice
```

只看当前 Git 配置用户的数据：

```bash
npm run dev -- --repo /path/to/repo --me
```

关闭热力图，只看作者排名：

```bash
npm run dev -- --repo /path/to/repo --no-heatmap
```

## 输出内容

工具会输出两类核心信息：

- 仓库提交热力图：GitHub 风格绿色分层，按周排列，纵向为周一到周日。
- 作者提交量排名：按提交次数和变更行数分别排名，变更行数为 additions + deletions。

默认分析当前分支，并用一张热力图展示当前统计范围内的提交频率；如果需要只查看当前 Git 配置用户，可以传入 `--me`。

如果指定目录不是 Git 仓库，工具会输出友好错误提示；如果统计范围内没有提交，会输出空状态提示。

## 作者账号合并

默认情况下，工具只会合并完整 Git 作者签名完全一致的提交，即作者名和邮箱都相同才视为同一作者。以下情况不会自动合并：

- 同名但邮箱不同，例如 `Ray-ux <work@example.com>` 和 `Ray-ux <personal@example.com>`。
- 同邮箱但作者名不同，例如 `Ray <ray@example.com>` 和 `Ray-ux <ray@example.com>`。

如果需要合并不同 Git 作者签名，可以在被分析仓库根目录创建 `.git-insight.json` 配置合并关系。文件不存在时不做跨签名合并；文件存在但 JSON 格式错误或配置结构不符合规则时会输出错误。

配置示例：

```json
{
  "authors": [
    {
      "displayName": "Alice",
      "displayEmail": "alice@company.com",
      "names": ["Alice", "alice"],
      "emails": ["alice@company.com", "alice@gmail.com"]
    }
  ]
}
```

配置中的作者名称和邮箱都按精确匹配处理，并会先去除首尾空白；大小写不同会被视为不同值。每个合并组的 `names` 和 `emails` 至少配置一个，命中任一名称或邮箱的提交都会归入该组。`displayName` 和 `displayEmail` 用于指定最终展示名称和邮箱，均可省略；省略时展示名优先使用提交数最多的原始作者名，展示邮箱沿用自动选择结果。

同一个名称或邮箱不能出现在多个合并组中；如果某个提交签名同时命中多个合并组，也会按配置错误处理。合并后的作者排名和变更行数排名都会归入同一作者；`--author` 可以匹配原始作者名、原始邮箱、配置名称、配置邮箱、展示名称或展示邮箱，`--me` 也会复用配置合并关系。

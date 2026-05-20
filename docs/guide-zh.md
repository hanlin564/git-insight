# Git Insight 用户手册

## 基本用法

在 Git 仓库目录中运行：

```bash
git-insight
```

分析指定仓库：

```bash
git-insight --repo /path/to/repo
```

查看帮助：

```bash
git-insight --help
```

默认会分析当前目录、当前分支、最近 365 天的提交数据，并在终端中显示仓库热力图、作者排行榜、文件热点和分支活跃度。

## 命令选项

| 选项 | 说明 |
| --- | --- |
| `--repo <path>` | 指定 Git 仓库目录，默认当前目录。 |
| `--last <days>` | 分析最近 N 天，默认 `365`，最大 `3650`。 |
| `--year <yyyy>` | 分析指定年份，例如 `2025`。 |
| `--month <yyyy-MM>` | 分析指定月份，例如 `2025-04`。 |
| `--from <date>` | 指定起始日期，支持 `yyyy`、`yyyy-MM`、`yyyy-MM-dd`。 |
| `--to <date>` | 指定结束日期，支持 `yyyy`、`yyyy-MM`、`yyyy-MM-dd`。 |
| `--branch <name>` | 指定要分析的分支，默认当前分支。 |
| `--author <query>` | 只展示匹配作者名称或邮箱的数据。 |
| `--me` | 聚焦当前 Git 配置用户，并在排行榜中展示该用户的位置。 |
| `--html` | 生成静态 HTML 报告，而不是显示终端界面。 |
| `--json` | 输出稳定的 JSON 摘要到 stdout，而不是显示终端界面。 |
| `--path <file>` | 指定 HTML 报告输出路径；未指定时生成到仓库根目录的 `git-insight-report.html`。 |
| `-h, --help` | 显示帮助。 |

## 时间范围

时间范围只能选择一种：

- `--last`
- `--year`
- `--month`
- `--from` / `--to`

如果不指定时间范围，默认等同于：

```bash
git-insight --last 365
```

`--from` 和 `--to` 可以单独使用：

- 只有 `--from` 时，结束日期默认为今天。
- 只有 `--to` 时，起始日期默认为分析分支的第一个提交。
- 同时使用 `--from` 和 `--to` 时，两者必须使用相同精度，例如都用 `yyyy-MM`，或都用 `yyyy-MM-dd`。

所有时间范围最大支持 3650 天。

## 常用示例

分析当前仓库最近 90 天：

```bash
git-insight --last 90
```

分析指定仓库最近 90 天：

```bash
git-insight --repo /path/to/repo --last 90
```

分析 2025 年：

```bash
git-insight --repo /path/to/repo --year 2025
```

分析 2025 年 4 月：

```bash
git-insight --repo /path/to/repo --month 2025-04
```

分析 2025 年 4 月 1 日到 2025 年 4 月 20 日：

```bash
git-insight --repo /path/to/repo --from 2025-04-01 --to 2025-04-20
```

分析 2024 年到 2025 年：

```bash
git-insight --repo /path/to/repo --from 2024 --to 2025
```

分析从 2025 年 4 月到今天：

```bash
git-insight --repo /path/to/repo --from 2025-04
```

分析 `main` 分支：

```bash
git-insight --repo /path/to/repo --branch main --last 90
```

只查看名称或邮箱匹配 `alice` 的作者：

```bash
git-insight --repo /path/to/repo --author alice
```

只查看当前 Git 配置用户：

```bash
git-insight --repo /path/to/repo --me
```

输出 JSON 摘要：

```bash
git-insight --repo /path/to/repo --month 2025-04 --json
```

生成 HTML 报告到默认位置：

```bash
git-insight --repo /path/to/repo --month 2025-04 --html
```

生成 HTML 报告到指定文件：

```bash
git-insight --repo /path/to/repo --month 2025-04 --html --path /path/to/report.html
```

## 配置文件

配置文件名为 `.git-insight.json`。可以放在两个位置：

- 被分析仓库根目录：`/path/to/repo/.git-insight.json`
- 当前用户主目录：`~/.git-insight.json`

优先读取仓库根目录中的配置；如果仓库配置不存在，才读取用户主目录中的配置。两处配置不会合并。

## 配置输出语言

`language` 用于设置终端界面、帮助信息和 HTML 报告语言。可选值：

- `en`
- `zh`

示例：

```json
{
	"language": "zh"
}
```

## 合并作者账号

同一个人可能使用多个 Git 作者名称或邮箱。可以通过 `authors` 把这些签名合并成同一位作者。

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

字段说明：

| 字段 | 说明 |
| --- | --- |
| `displayName` | 合并后展示的作者名称，可省略。 |
| `displayEmail` | 合并后展示的作者邮箱，可省略。 |
| `names` | 要匹配的原始作者名称列表，可省略。 |
| `emails` | 要匹配的原始作者邮箱列表，可省略。 |

每个作者合并组必须至少包含 `names` 或 `emails` 中的一项。名称和邮箱按精确匹配处理，会忽略首尾空白，但大小写不同会被视为不同值。同一个名称或邮箱不能出现在多个合并组中。

`--author` 可以匹配原始名称、原始邮箱、配置中的名称、配置中的邮箱、合并后的展示名称或展示邮箱。`--me` 也会使用作者合并配置。

## 排除文件

`excludePatterns` 用于从统计中排除指定文件或目录。规则采用类似 `.gitignore` 的写法，路径统一按 `/` 分隔。

```json
{
	"excludePatterns": [
		"package-lock.json",
		"vendor/",
		"*.generated.ts"
	]
}
```

常见写法：

| 规则 | 说明 |
| --- | --- |
| `"package-lock.json"` | 排除仓库根目录下的指定文件。 |
| `"vendor/"` | 排除 `vendor` 目录。 |
| `"*.generated.ts"` | 排除匹配通配符的文件。 |

## 完整配置示例

```json
{
	"language": "zh",
	"authors": [
		{
			"displayName": "Alice",
			"displayEmail": "alice@company.com",
			"names": ["Alice", "alice"],
			"emails": ["alice@company.com", "alice@gmail.com"]
		},
		{
			"displayName": "Bob",
			"emails": ["bob@company.com", "bob.personal@example.com"]
		}
	],
	"excludePatterns": [
		"vendor/",
		"generated/",
		"*.generated.ts"
	]
}
```

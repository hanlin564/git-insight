# Git Insight User Guide

## Basic Usage

Run inside a Git repository:

```bash
git-insight
```

Analyze a specific repository:

```bash
git-insight --repo /path/to/repo
```

Show help:

```bash
git-insight --help
```

By default, Git Insight analyzes the current directory, the current branch, and commits from the last 365 days. It renders a terminal report with a contribution heatmap, author rankings, file hotspots, and branch activity.

## Command Options

| Option | Description |
| --- | --- |
| `--repo <path>` | Git repository path. Defaults to the current directory. |
| `--last <days>` | Analyze the last N days. Defaults to `365`, maximum `3650`. |
| `--year <yyyy>` | Analyze one year, such as `2025`. |
| `--month <yyyy-MM>` | Analyze one month, such as `2025-04`. |
| `--from <date>` | Start date. Supports `yyyy`, `yyyy-MM`, and `yyyy-MM-dd`. |
| `--to <date>` | End date. Supports `yyyy`, `yyyy-MM`, and `yyyy-MM-dd`. |
| `--branch <name>` | Branch to analyze. Defaults to the current branch. |
| `--author <query>` | Only show data for authors matching the name or email query. |
| `--me` | Focus on the current Git configured user and show that user's ranking position. |
| `--html` | Write a static HTML report instead of rendering the terminal UI. |
| `--json` | Write a stable JSON summary to stdout instead of rendering the terminal UI. |
| `--path <file>` | HTML report output path. Defaults to `git-insight-report.html` in the repository root. |
| `-h, --help` | Show help. |

## Date Ranges

Choose only one date range mode:

- `--last`
- `--year`
- `--month`
- `--from` / `--to`

When no date range is provided, the default is:

```bash
git-insight --last 365
```

`--from` and `--to` can be used separately:

- With only `--from`, the end date defaults to today.
- With only `--to`, the start date defaults to the first commit on the analyzed branch.
- When using both `--from` and `--to`, both values must use the same precision, such as both `yyyy-MM` or both `yyyy-MM-dd`.

All date ranges support at most 3650 days.

## Examples

Analyze the current repository for the last 90 days:

```bash
git-insight --last 90
```

Analyze a specific repository for the last 90 days:

```bash
git-insight --repo /path/to/repo --last 90
```

Analyze 2025:

```bash
git-insight --repo /path/to/repo --year 2025
```

Analyze April 2025:

```bash
git-insight --repo /path/to/repo --month 2025-04
```

Analyze April 1, 2025 through April 20, 2025:

```bash
git-insight --repo /path/to/repo --from 2025-04-01 --to 2025-04-20
```

Analyze 2024 through 2025:

```bash
git-insight --repo /path/to/repo --from 2024 --to 2025
```

Analyze from April 2025 through today:

```bash
git-insight --repo /path/to/repo --from 2025-04
```

Analyze the `main` branch:

```bash
git-insight --repo /path/to/repo --branch main --last 90
```

Only show authors matching `alice`:

```bash
git-insight --repo /path/to/repo --author alice
```

Only show the current Git configured user:

```bash
git-insight --repo /path/to/repo --me
```

Write a JSON summary:

```bash
git-insight --repo /path/to/repo --month 2025-04 --json
```

Write an HTML report to the default path:

```bash
git-insight --repo /path/to/repo --month 2025-04 --html
```

Write an HTML report to a specific file:

```bash
git-insight --repo /path/to/repo --month 2025-04 --html --path /path/to/report.html
```

## Configuration File

The configuration file is named `.git-insight.json`. It can be placed in either location:

- Repository root: `/path/to/repo/.git-insight.json`
- Current user's home directory: `~/.git-insight.json`

Git Insight reads the repository configuration first. If it does not exist, it reads the home directory configuration. The two files are not merged.

## Configure Output Language

`language` controls the language of the terminal UI, help text, and HTML reports. Supported values:

- `en`
- `zh`

Example:

```json
{
	"language": "en"
}
```

## Merge Author Identities

One person may use multiple Git author names or emails. Use `authors` to merge those signatures into one displayed author.

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

Fields:

| Field | Description |
| --- | --- |
| `displayName` | Display name after merging. Optional. |
| `displayEmail` | Display email after merging. Optional. |
| `names` | Original author names to match. Optional. |
| `emails` | Original author emails to match. Optional. |

Each author group must include at least one value in `names` or `emails`. Names and emails are matched exactly. Leading and trailing whitespace is ignored, but different letter casing is treated as a different value. The same name or email cannot appear in multiple author groups.

`--author` can match original names, original emails, configured names, configured emails, merged display names, or merged display emails. `--me` also uses author merge configuration.

## Exclude Files

`excludePatterns` excludes files or directories from analysis. Patterns use syntax similar to `.gitignore`, and paths use `/` as the separator.

```json
{
	"excludePatterns": [
		"package-lock.json",
		"vendor/",
		"*.generated.ts"
	]
}
```

Common patterns:

| Pattern | Description |
| --- | --- |
| `"package-lock.json"` | Exclude a specific file at the repository root. |
| `"vendor/"` | Exclude the `vendor` directory. |
| `"*.generated.ts"` | Exclude files matching the wildcard pattern. |

## Full Configuration Example

```json
{
	"language": "en",
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

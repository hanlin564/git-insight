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
--since <days>         热力图和作者统计范围，默认 365
--branch-since <days>  分支活跃度统计范围，默认 90
--top <number>         排名输出数量，默认 10
--author <name>        只展示匹配作者名称或邮箱的数据
--current-user         热力图只展示当前 Git 配置用户
--no-heatmap           关闭提交热力图
--no-ranking           关闭作者排名
--no-branch            关闭分支活跃度
```

## 示例

查看最近 90 天统计：

```bash
npm run dev -- --repo /path/to/repo --since 90 --branch-since 90
```

只看指定作者：

```bash
npm run dev -- --repo /path/to/repo --author alice
```

只看当前 Git 配置用户的提交热力图：

```bash
npm run dev -- --repo /path/to/repo --current-user
```

关闭热力图，只看排名和分支活跃度：

```bash
npm run dev -- --repo /path/to/repo --no-heatmap
```

只输出 Top 5：

```bash
npm run dev -- --repo /path/to/repo --top 5
```

## 输出内容

工具会输出三类核心信息：

- 仓库提交热力图：GitHub 风格绿色分层，按周排列，纵向为周一到周日。
- 作者提交量排名：按提交次数和变更行数分别排名，变更行数为 additions + deletions。
- 分支活跃度：统计本地分支在最近 N 天内的提交数。

默认用一张热力图展示整个仓库的提交频率；如果需要只查看当前 Git 配置用户，可以传入 `--current-user`。

如果指定目录不是 Git 仓库，工具会输出友好错误提示；如果统计范围内没有提交，会输出空状态提示。

## 作者账号合并

默认情况下，工具只会合并完整 Git 作者签名完全一致的提交，即作者名和邮箱都相同才视为同一作者。以下情况不会自动合并：

- 同名但邮箱不同，例如 `Ray-ux <work@example.com>` 和 `Ray-ux <personal@example.com>`。
- 同邮箱但作者名不同，例如 `Ray <ray@example.com>` 和 `Ray-ux <ray@example.com>`。

如果需要合并不同 Git 作者签名，可以在被分析仓库根目录创建 `.git-insight.json` 配置合并关系。文件不存在时不做跨签名合并；文件存在但 JSON 格式错误时会输出错误。

配置示例：

```json
{
  "authorAliases": [
    {
      "primaryEmail": "alice@company.com",
      "emails": ["alice@company.com", "alice@gmail.com"]
    }
  ]
}
```

配置中的邮箱按精确匹配处理。合并后的作者排名和变更行数排名都会归入同一作者；展示名优先使用提交数最多的原始作者名，配置组的展示邮箱优先使用 `primaryEmail`。`--author` 可以匹配原始作者名、组内邮箱或主邮箱，`--current-user` 也会复用配置合并关系。

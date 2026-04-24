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
--no-heatmap           关闭作者提交热力图
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

- 作者提交热力图：GitHub 风格绿色分层，按周排列，纵向为周一到周日。
- 作者提交量排名：按提交次数和变更行数分别排名，变更行数为 additions + deletions。
- 分支活跃度：统计本地分支在最近 N 天内的提交数。

如果指定目录不是 Git 仓库，工具会输出友好错误提示；如果统计范围内没有提交，会输出空状态提示。

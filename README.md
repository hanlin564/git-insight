# Git Insight

> 本项目由 vibe coding 编写。

Git Insight 是一个 TypeScript ESM 终端 Git 分析 CLI。运行入口、Git 数据采集、统计分析和 Ink/React UI 分层放置，编译产物输出到 `dist/`。

## 快速开始

下载项目后，在项目根目录执行：

```bash
npm run setup
```

该脚本会依次完成依赖安装、项目构建和本地全局链接，等价于执行 `npm install`、`npm run build`、`npm link`。

完成后即可在任意 Git 仓库中运行：

```bash
git-insight
```

也可以通过 `--repo` 指定要分析的仓库：

```bash
git-insight --repo /path/to/repo
```

用户命令、示例和 `.git-insight.json` 配置说明见：

- [中文用户手册](docs/guide-zh.md)
- [English User Guide](docs/guide-en.md)

## 项目结构

```text
src/
  index.tsx                 CLI 入口，串联参数解析、数据收集和渲染
  cli/                      命令行参数解析
  git/                      Git 命令封装、仓库校验和日志解析
  analysis/                 作者、分支、热力图、文件热点等统计逻辑
  config/                   .git-insight.json 配置读取和校验
  html/                     静态 HTML 报告生成
  ui/                       Ink/React 终端界面
  utils/                    日期、数字、文本等通用工具
test/
  helpers/                  CLI 和临时 Git 仓库测试辅助工具
docs/
  guide-zh.md               中文用户手册
  guide-en.md               英文用户手册
  test.md                   测试覆盖说明
```

`dist/` 是生成目录，不要手动编辑其中的文件。

## 开发命令

安装依赖：

```bash
npm install
```

直接运行源码入口：

```bash
npm run dev
```

运行自动化测试：

```bash
npm test
```

编译到 `dist/`：

```bash
npm run build
```

运行已编译入口：

```bash
npm start -- --repo /path/to/repo
```

涉及类型、模块导入、CLI 参数、配置读取、Git 调用或渲染输出的修改，提交前至少运行：

```bash
npm test
npm run build
```

## 技术约定

- 使用严格 TypeScript。
- 项目为 ESM，本地运行时导入需要显式 `.js` 后缀。
- 缩进使用 Tab。
- 字符串使用单引号。
- 语句保留分号。
- 共享函数、类型和组件优先使用具名导出。
- React 组件和类型使用 PascalCase，例如 `AuthorHeatmap`。
- 函数和变量使用 camelCase，例如 `collectRepositoryStats`。
- 文件名应描述职责，例如 `gitLogParser.ts`、`BranchActivity.tsx`。

如需写注释，使用简体中文，并保持简短，只解释必要上下文。

## 跨平台要求

新增或修改代码时，需要保持 CLI 在以下环境兼容：

- macOS + zsh
- Windows + cmd
- Windows + PowerShell

涉及路径、换行、shell 命令、npm scripts、终端 Unicode/ANSI 渲染或 Git 调用的变更，应优先使用 Node.js 跨平台 API 和不经 shell 的进程调用，并补充或更新跨平台测试。

## 测试约定

项目使用 Node.js 内置 test runner，并通过 `tsx` 执行测试文件。

涉及 Git 行为的 CLI 端到端测试应使用 `test/helpers/tempGitRepository.ts` 临时创建 Git 仓库，模拟提交、分支、作者和配置等场景，不要依赖本机固定仓库。

CLI 运行应复用 `test/helpers/cli.ts`，避免被本机全局 Git 配置或全局 `.git-insight.json` 污染。

纯解析和统计逻辑优先使用就近的 `*.test.ts` 单元测试。UI 测试应聚焦关键渲染状态，以及空数据、错误数据等边界场景。

新增或调整测试案例时，同步更新 [docs/test.md](docs/test.md)，说明命令或被测函数、模拟场景和预期结果。

## 终端 UI 约定

新增或调整终端条形图时，条形宽度默认采用细线样式，优先使用现有代码量排行一致的 `━`，避免使用过粗的 `█` 造成行高或视觉重量不一致。

条形图标签必须完整显示，不要为了对齐强行截断作者名、路径或文件名。

## 手动验证仓库

需要手动验证 CLI 行为时，优先使用临时 Git 仓库或通过 `--repo` 指定你本机可访问的任意测试仓库。

验证多提交者、长期未维护老仓库等场景时，应使用可复现的临时仓库脚本或在说明中记录仓库构造方式，避免依赖特定开发者机器上的固定路径。

## 提交规范

提交信息使用简体中文，保持短句、动宾结构，并让每个提交聚焦一个变更。

示例：

```text
初始化 Git 分析工具 MVP
```

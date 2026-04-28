# Repository Guidelines

## 项目结构与模块组织

本仓库是一个基于 TypeScript ESM、Ink 和 React 的终端 Git 分析 CLI。源码位于 `src/`，编译产物输出到 `dist/`。

- `src/index.tsx`：CLI 入口，负责解析参数、收集数据并渲染 Ink UI。
- `src/cli/`：命令行参数解析，当前使用 `commander`。
- `src/git/`：Git 命令封装、仓库校验和日志解析。
- `src/analysis/`：作者、分支、热力图等统计逻辑。
- `src/ui/` 与 `src/ui/components/`：Ink/React 终端界面组件。
- `src/utils/`：日期、数字、文本等通用工具函数。

当前没有独立资源目录。`dist/` 是生成目录，不要手动编辑其中的文件。

## 构建、测试与本地开发命令

- `npm install`：安装依赖。
- `npm run dev`：通过 `tsx` 直接运行 TypeScript 入口，默认分析当前目录。
- `npm run dev -- --repo /path/to/repo`：指定要分析的 Git 仓库。
- `npm run build`：使用 `tsc` 编译到 `dist/`，生成声明文件和 source map。
- `npm start -- --repo /path/to/repo`：运行已编译的 `dist/index.js`。

涉及类型、模块导入或 CLI 行为的修改，提交前至少运行 `npm run build`。

## 代码风格与命名规范

使用严格 TypeScript。项目为 ESM，运行时本地导入需要显式 `.js` 后缀。延续现有风格：Tab 缩进、单引号、分号、共享函数和组件使用具名导出。React 组件和类型使用 PascalCase，例如 `AuthorHeatmap`；函数、变量使用 camelCase，例如 `collectRepositoryStats`。文件名应描述职责，例如 `gitLogParser.ts`、`BranchActivity.tsx`。

如需写注释，使用简体中文，并保持简短、解释必要上下文。

## 测试规范

当前尚未配置测试框架或 `npm test` 脚本。修改后先通过构建和有针对性的手动运行验证，例如：

```bash
npm run dev -- --repo /Users/wanghanlin/MyCodes/workingCodes/Echo --last 90 --top 5
npm run dev -- --repo /Users/wanghanlin/MyCodes/workingCodes/Erp --last 3650 --top 10
```

后续新增测试时，纯解析和统计逻辑优先使用就近的 `*.test.ts` 文件；UI 测试应聚焦关键渲染状态和空数据、错误数据等边界场景。

## 提交与 Pull Request 规范

现有提交历史使用简洁的中文提交信息，例如 `初始化 Git 分析工具 MVP`。继续使用简体中文提交信息，保持短句、动宾结构，并让每个提交聚焦一个变更。

PR 应包含变更摘要、已运行的验证命令、相关 issue 链接；如果改动影响终端 UI，请附上截图或关键输出片段。

## Agent 专用说明

回复使用简体中文。提交代码时，提交信息使用简体中文。新增文档时，优先使用中文文件名；建议采用 `日期-中文主题.md` 的命名方式。

后续需要手动验证 CLI 行为时，优先使用 `/Users/wanghanlin/MyCodes/workingCodes/Echo` 作为常规验证仓库；需要验证多提交者、长期未维护老仓库等场景时，使用 `/Users/wanghanlin/MyCodes/workingCodes/Erp` 作为实验对象。

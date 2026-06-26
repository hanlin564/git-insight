# Repository Guidelines

## 项目结构与模块组织

本仓库是一个基于 TypeScript ESM、Ink 和 React 的终端 CLI。源码位于 `src/`，编译产物输出到 `dist/`。

- `src/index.tsx`：CLI 入口，只接受无参数运行。
- `src/analysis/myGitData.ts`：跨仓库个人提交数据汇总。
- `src/git/`：Git 命令封装、仓库发现和日志解析。
- `src/ui/`：Ink/React 终端界面和热力图组件。
- `src/utils/`：日期等通用工具函数。

`dist/` 是生成目录，不要手动编辑其中的文件。

## 构建、测试与本地开发命令

- `npm install`：安装依赖。
- `npm run dev`：通过 `tsx` 直接运行 TypeScript 入口，默认扫描当前目录。
- `npm test`：编译后运行自动化测试。
- `npm run build`：使用 `tsc` 编译到 `dist/`，生成声明文件和 source map。
- `npm start`：运行已编译的 `dist/index.js`。

涉及类型、模块导入或 CLI 行为的修改，提交前至少运行：

```bash
npm test
npm run build
```

## 代码风格与命名规范

使用严格 TypeScript。项目为 ESM，运行时本地导入需要显式 `.js` 后缀。延续现有风格：Tab 缩进、单引号、分号、共享函数和组件使用具名导出。React 组件和类型使用 PascalCase；函数、变量使用 camelCase。文件名应描述职责，例如 `gitLogParser.ts`、`repositoryDiscovery.ts`。

如需写注释，使用简体中文，并保持简短、解释必要上下文。

## 测试规范

涉及 Git 行为的测试应使用 `test/helpers/tempGitRepository.ts` 临时创建 Git 仓库，不要依赖本机固定仓库。CLI 运行应复用 `test/helpers/cli.ts`，并隔离 Git 全局配置。

新增或调整测试案例时，同步更新 `docs/test.md`，说明命令或被测函数、模拟场景和预期结果。

## Agent 专用说明

回复使用简体中文。提交代码时，提交信息使用简体中文。新增文档时，优先使用中文文件名；建议采用 `日期-中文主题.md` 的命名方式。

新增或修改代码时，必须保持 CLI 在 macOS + zsh、Windows + cmd、Windows + PowerShell 环境下兼容。涉及路径、换行、shell 命令、npm scripts、终端 Unicode/ANSI 渲染或 Git 调用的变更，应优先使用 Node.js 跨平台 API 和不经 shell 的进程调用，并补充或更新跨平台测试。

新增或调整终端条形图时，条形宽度默认采用细线样式，优先使用 `━`，避免使用过粗的 `█` 造成行高或视觉重量不一致。

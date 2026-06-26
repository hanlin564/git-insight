# 测试说明

## 运行方式

```bash
npm test
```

测试入口会先编译 `dist/index.js`，再通过 Node.js 内置 test runner 执行 TypeScript 测试文件：

```bash
node test/run-tests.mjs
```

涉及入口、Git 调用、统计或 UI 的改动，提交前还应运行：

```bash
npm run build
```

## 覆盖范围

| 文件 | 场景 | 预期 |
| --- | --- | --- |
| `test/git/gitLogParser.test.ts` | 解析 Git log numstat 输出、空格路径、重命名路径、二进制文件和 CRLF。 | 正确生成提交、作者、日期和增删行统计。 |
| `test/git/repositoryDiscovery.test.ts` | 递归发现 `.git` 目录和 `.git` 文件形式的仓库，跳过 `node_modules`，不扫描已发现仓库内部。 | 返回正确仓库路径且不重复。 |
| `test/analysis/myGitData.test.ts` | 在临时工作区创建多个 Git 仓库，并隔离 Git 全局用户配置。 | 只统计匹配全局用户名或邮箱的提交，正确生成年度热力图和今天/7 天/30 天摘要。 |
| `test/ui/contributionHeatmap.test.ts` | 验证年度热力图星期行和周数据布局。 | 7 天数据完整保留，界面只隐藏部分行标签而不隐藏日期格子。 |
| `test/cli.test.ts` | 运行编译后的 `dist/index.js`。 | 默认扫描当前目录；缺少全局 Git 用户时报错；传入参数时报错；无仓库时输出空状态。 |

## 测试仓库策略

涉及 Git 行为的测试使用 `test/helpers/tempGitRepository.ts` 创建临时 Git 仓库，不依赖本机固定仓库。

CLI 测试使用 `test/helpers/cli.ts` 隔离 `HOME`、`USERPROFILE`、`XDG_CONFIG_HOME`、`GIT_CONFIG_GLOBAL` 和 `GIT_CONFIG_NOSYSTEM`，避免本机 Git 全局配置污染测试结果。

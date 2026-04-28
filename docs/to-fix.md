# 待修复问题清单

记录日期：2026-04-28

## 1. 文档和项目指引中的命令已经失效（已完成）

### 处理结果

- 已将 `AGENTS.md` 中的验证命令更新为当前支持的 `--last` 参数，并移除不存在的 `--top` 参数。
- `docs/2026-04-24-Erp命令执行问题清单.md` 已由用户手工删除，本次不再恢复或修改。

### 现象

- `AGENTS.md` 中仍建议运行带 `--top` 的验证命令。
- `docs/2026-04-24-Erp命令执行问题清单.md` 中仍记录 `--since --top` 命令。
- 当前 CLI 只支持 `--last`，没有 `--since` 和 `--top`。

### 影响

- 按文档执行验证命令会直接失败。
- 后续排障时容易误判 CLI 回归。

### 复现命令

```bash
npm run dev -- --repo /Users/wanghanlin/MyCodes/workingCodes/Erp --since 3650 --top 10
```

实际结果：

```text
error: unknown option '--since'
```

### 建议

- 将历史文档和 `AGENTS.md` 中的 `--since` 改为 `--last`。
- 删除或重新实现 `--top` 参数；如果暂不实现，应把文档改成“作者排名固定显示前 10 条”。

## 2. Git log 解析对作者名中的分隔符很脆弱（已完成）

### 处理结果

- 已将 `git log --pretty=format` 的字段分隔符从 `|` 改为 `%x1f` 控制字符。
- 已同步更新 `src/git/gitLogParser.ts`，按 `\x1f` 解析提交头字段。
- 已通过临时解析验证确认作者名包含 `|` 时，邮箱、日期和增删行统计不会错位。

### 现象

- `src/git/gitClient.ts` 使用 `|` 拼接 `git log --pretty=format` 字段。
- `src/git/gitLogParser.ts` 再用 `split('|')` 解析提交头。
- Git 作者名理论上可以包含 `|`。

### 影响

- 作者名包含 `|` 时，邮箱和日期字段会被切错。
- 可能导致提交被跳过、统计到错误作者，或统计日期不正确。

### 建议

- 将 pretty format 分隔符改为更不易冲突的控制字符，例如 `%x1f` 字段分隔、`%x1e` 记录分隔。
- 为日志解析补充针对特殊作者名的单元测试。

## 3. 构建不会清理旧产物，dist 中残留已不存在模块（已完成）

### 处理结果

- 已新增 `npm run clean`，使用 Node 内置 `fs.rmSync` 清理 `dist` 生成目录。
- 已将 `npm run build` 调整为先执行 `npm run clean`，再执行 `tsc`。
- 已通过重新构建确认 `dist/analysis/branchStats.*` 旧产物不再生成。

### 现象

- 源码中已没有 `src/analysis/branchStats.ts`。
- `dist/analysis/branchStats.js` 仍然存在。
- 当前 `npm run build` 只是执行 `tsc`，不会清理 `dist`。

### 影响

- 发布或排查时，旧产物会让人误以为功能仍存在。
- 如果未来包发布包含 `dist`，可能把无效代码一起带出去。

### 建议

- 在构建前清理 `dist`。
- 因项目禁止直接手动编辑 `dist`，应通过构建脚本统一处理生成目录。

## 4. 仓库校验会吞掉真实 Git 错误

### 现象

- `createRepositoryTarget` 捕获 `git rev-parse --show-toplevel` 的所有错误。
- 任意失败都会统一报“目录不是 Git 仓库”。

### 影响

- 如果真实原因是 `git` 不存在、权限不足、目录不可访问或 Git 命令异常，用户会看到错误的提示。
- 排查环境问题时信息不足。

### 建议

- 只把明确的“不是 Git 仓库”错误转换成 `GitRepositoryError`。
- 对其他错误保留原始错误信息，或包装成更具体的环境错误。

## 5. 终端表格宽度对中文和宽字符不准确

### 现象

- `BarChart` 使用 `label.length` 计算标签宽度。
- `padEndSafe` 使用 `slice` 和 `padEnd` 截断/补齐字符串。
- 中文、emoji、组合字符在终端中的显示宽度不等于 JavaScript 字符串长度。

### 影响

- 作者名包含中文或宽字符时，柱状图容易错位。
- 截断时可能破坏字符显示。

### 建议

- 使用终端显示宽度计算库，例如 `string-width`。
- 截断时使用支持宽字符的截断逻辑，例如 `slice-ansi` 或同类方案。

## 验证记录

已执行：

```bash
npm run build
npm run dev -- --repo /Users/wanghanlin/MyCodes/workingCodes/Echo --last 90 --no-heatmap
npm start -- --repo /Users/wanghanlin/MyCodes/workingCodes/Echo --last 90 --no-heatmap
npm run dev -- --repo /Users/wanghanlin/MyCodes/workingCodes/Erp --since 3650 --top 10
```

结果：

- `npm run build` 通过。
- Echo 仓库的 `dev` 和 `start` 验证通过。
- Erp 仓库旧参数命令失败，报 `unknown option '--since'`。

# show-my-git-data

`show-my-git-data` 是一个极简终端工具，用于汇总当前电脑上本人在多个 Git 仓库中的提交情况。

运行命令：

```bash
show-my-git-data
```

工具不需要任何参数。它会从当前目录开始递归扫描 Git 仓库，使用当前电脑的 Git 全局配置识别本人：

```bash
git config --global user.name
git config --global user.email
```

提交作者名称匹配全局 `user.name`，或提交作者邮箱匹配全局 `user.email`，都会计入本人数据。

## 展示内容

- 扫描和分析进度条。
- 本年度个人提交热力图。
- 今天、过去 7 天、过去 30 天的提交次数。
- 今天、过去 7 天、过去 30 天的代码行数。

代码行数按 `additions + deletions` 统计。

## 开发命令

安装依赖：

```bash
npm install
```

直接运行源码入口：

```bash
npm run dev
```

运行测试：

```bash
npm test
```

编译：

```bash
npm run build
```

运行编译后入口：

```bash
npm start
```

## 项目结构

```text
src/
  index.tsx                     CLI 入口
  analysis/myGitData.ts         多仓库个人提交统计
  git/                          Git 命令、日志解析、仓库发现
  ui/                           Ink 终端界面
  utils/date.ts                 日期工具
test/
  helpers/                      CLI 和临时 Git 仓库测试辅助工具
docs/test.md                    测试覆盖说明
```

`dist/` 是生成目录，不要手动编辑。

## 注意事项

- 当前目录下仓库很多时，扫描和分析会显示进度条。
- 单个仓库读取失败不会中断整体统计，结果中会显示失败数量。
- 工具只保留终端输出，不支持参数、配置文件、HTML 报告或 JSON 输出。

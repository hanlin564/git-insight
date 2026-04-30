# Windows 兼容性分析

本文记录当前 CLI 在 Windows + PowerShell/cmd 环境下运行的兼容性判断和待验证问题。

## 结论

当前实现大概率可以在 Windows Terminal + PowerShell 7/cmd 环境下正常运行，但尚未经过 Windows 实机或 CI 验证，因此不能视为已正式支持 Windows。

推荐运行环境：

- Node.js 20 或 22
- Git for Windows 已安装，并且 `git` 在 `PATH` 中可直接访问
- Windows Terminal、PowerShell 7 或新版 cmd
- 终端编码支持 UTF-8

## 支持正常运行的依据

- Git 调用使用 `execa('git', args, {cwd})` 直接启动进程，不经过 shell，基本避开 PowerShell/cmd 参数转义差异。
- `--repo` 使用 Node.js `path.resolve` 处理路径，能解析 Windows 风格路径。
- npm `bin` 指向 `dist/index.js`，通过 npm 安装后 Windows 会生成对应的 `.cmd` 命令包装。
- 测试脚本和测试辅助工具主要使用 Node.js 跨平台 API，例如 `path`、`os.tmpdir()`、`spawnSync`、`mkdtemp`。

## 已知风险点

### 1. 直接执行 `dist/index.js` 不可靠

`dist/index.js` 带有 shebang，在 Unix/macOS 下可以直接执行；Windows 下直接执行该文件不可靠。

Windows 用户应优先使用：

```bash
git-insight --repo C:\path\to\repo
```

或：

```bash
node dist/index.js --repo C:\path\to\repo
```

### 2. 构建脚本对 npm shell 有轻微依赖

`npm run build` 当前使用：

```bash
npm run clean && tsc && npm run chmod:bin
```

`&&` 在 npm 默认 Windows shell `cmd.exe` 下可用；如果用户自定义 npm `script-shell` 为旧版 Windows PowerShell 5.1，可能出现兼容问题。

### 3. 终端 Unicode 和 ANSI 渲染可能受环境影响

UI 使用 Ink、ANSI 颜色以及 `■`、`━` 等 Unicode 字符。Windows Terminal 和新版 PowerShell 通常能正常显示；旧 cmd 或非 UTF-8 代码页下可能出现：

- 方块、横线显示为乱码
- 热力图错位
- 排行榜条形图宽度不稳定

### 4. Git for Windows 换行输出需要验证

日志解析当前按 `\n` 分割 Git 输出。如果 Git for Windows 在某些环境下输出 CRLF，提交日期字段可能带有 `\r`，进而影响热力图日期匹配。

需要补充 Windows 或 CRLF 场景的回归测试。

### 5. Windows 全局配置路径需要实测

作者合并配置会读取：

- 仓库内 `.git-insight.json`
- 用户主目录下 `.git-insight.json`

代码使用 `os.homedir()` 解析用户主目录，理论上支持 Windows，但仍建议验证 Windows 下 `USERPROFILE`、Git 配置和实际读取路径是否符合预期。

## 建议验证项

在 Windows 环境中至少验证：

```bash
npm install
npm test
npm run build
node dist/index.js --repo C:\path\to\repo --last 30
git-insight --repo C:\path\to\repo --last 30
git-insight --repo C:\path\to\repo --from 2025-01-01 --to 2025-01-31
```

建议覆盖以下仓库状态：

- 普通 Git 仓库
- 空仓库
- detached HEAD
- 包含中文作者名或中文路径的仓库
- 包含多作者、多分支的仓库
- 仓库内存在 `.git-insight.json`
- 用户主目录存在 `.git-insight.json`

## 后续改进建议

- 在 CI 中增加 Windows runner，运行 `npm test` 和 `npm run build`。
- 为 `parseGitLogWithNumstat` 增加 CRLF 输入测试。
- 如需支持旧 cmd，可考虑提供 ASCII 降级显示模式。
- 如果发现 `npm run build` 在部分 PowerShell 环境异常，可将串联脚本改为 Node.js 脚本或分步 npm 脚本。

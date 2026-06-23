# 贡献指南

感谢你对「嗅嗅」项目的关注！本文档将帮助你快速参与项目共建。

## 行为准则

请保持友善、尊重的态度对待每一位社区成员。我们致力于打造一个开放、包容的协作环境，任何形式的人身攻击、歧视或骚扰行为均不会被容忍。

## 开发环境搭建

### 环境要求

- [Node.js](https://nodejs.org/) 18.0+
- [pnpm](https://pnpm.io/) 8.0+
- Git
- Windows 10 / 11、macOS 12+ 或主流 Linux 发行版

### 初始化项目

```bash
# 1. Fork 仓库到你的 GitHub 账号，然后克隆到本地
git clone https://github.com/<你的用户名>/xiuxiu.git
cd xiuxiu

# 2. 添加上游仓库
git remote add upstream https://github.com/xiuxiu/xiuxiu.git

# 3. 安装依赖（请使用 pnpm，不要混用 npm/yarn）
pnpm install

# 4. 启动开发模式
pnpm dev
```

如果 `pnpm install` 因为 ffmpeg 二进制下载失败，可尝试配置镜像：

```bash
pnpm config set ffmpeg_mirror https://npmmirror.com/mirrors/ffmpeg-static
```

### 常用脚本

| 命令 | 说明 |
| :--- | :--- |
| `pnpm dev` | 启动开发模式，主进程热重启 + 渲染进程 HMR |
| `pnpm build` | 编译主进程与渲染进程到 `dist/` |
| `pnpm pack` | 打包但不生成安装程序（用于快速验证） |
| `pnpm dist:win` | 打包 Windows NSIS 安装包 |
| `pnpm dist:win:portable` | 打包 Windows 免安装便携版 |

## 代码规范

### TypeScript

- 启用严格模式（`tsconfig.json` 中 `strict: true`）
- 公共函数与接口必须显式声明返回类型
- 优先使用 `interface` 定义对象类型，`type` 用于联合类型与工具类型
- 避免 `any`，确实无法推断时使用 `unknown` 并收窄

### React

- 函数组件 + Hooks，不使用 class 组件
- 状态管理统一使用 Zustand，不要引入 Redux/MobX 等额外状态库
- 副作用集中在自定义 hook 中，保持组件纯函数特性
- 列表渲染使用稳定且唯一的 `key`，避免使用数组索引

### 主进程

- IPC 通道常量统一在 `src/shared/ipc-channels.ts` 维护
- 主进程与渲染进程共享的类型放在 `src/shared/`
- 文件操作、网络请求等原生能力必须放在主进程，渲染进程通过 `window.electronAPI` 调用
- 避免在主进程中进行耗时同步操作，必要时使用 Worker 或异步分片

### 命名约定

- 文件名：组件使用 `PascalCase.tsx`（如 `ResourceCard.tsx`），其余使用 `kebab-case.ts`
- 变量与函数：`camelCase`
- 常量：`UPPER_SNAKE_CASE`
- 类型与接口：`PascalCase`，接口名不加 `I` 前缀
- React 组件：`PascalCase`

### 代码格式化

项目使用 ESLint + Prettier（如未配置可参考仓库根目录的 `.eslintrc`）。提交前请确保：

```bash
# 检查代码风格
pnpm exec eslint src/ --ext .ts,.tsx

# 自动修复
pnpm exec eslint src/ --ext .ts,.tsx --fix
```

## 提交规范

我们采用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范，提交信息格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### type 取值

| type | 说明 |
| :--- | :--- |
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 代码格式调整（不影响功能） |
| `refactor` | 重构（既不是新增功能也不是修复 Bug） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建、依赖、脚本等杂项 |
| `revert` | 回滚提交 |

### 示例

```
feat(sniffer): 支持嗅探 AVIF 图片格式

扩展图片类型 MIME 白名单，新增 image/avif 识别。
```

```
fix(downloader): 修复 M3U8 分片下载中断后无法恢复的问题

原因：暂停状态未正确写入任务持久化结构。
修复：在 pause 之前先 flush 当前任务状态。
```

### scope 建议

`sniffer` / `downloader` / `renderer` / `main` / `settings` / `tray` / `build` / `docs`

## PR 流程

### 1. 创建分支

从 `main` 拉取最新代码并创建特性分支，分支名格式 `<type>/<简短描述>`：

```bash
git checkout main
git pull upstream main
git checkout -b feat/m3u8-retry
```

### 2. 开发与自测

- 每个提交保持原子性，一个提交解决一个问题
- 新增功能请补充必要的测试或手动验证步骤
- 修改 UI 请在 PR 描述中附上前后对比截图
- 修改主进程逻辑请执行 `pnpm build` 确保编译通过

### 3. 提交 PR

PR 标题与提交信息保持一致的 Conventional Commits 格式。PR 描述请包含：

- **变更说明**：做了什么、为什么做
- **变更类型**：新功能 / Bug 修复 / 重构 / 文档
- **测试方式**：如何验证本次变更
- **关联 Issue**：如 `Closes #12`

### 4. 代码评审

- 至少需要一名 Maintainer 审查通过
- 评审意见请友善、建设性，聚焦代码本身而非个人
- 修改评审意见时，请追加新提交而非 force push 覆盖（便于评审追踪），合并时统一 squash

### 5. 合并

通过评审后，由 Maintainer 执行 squash merge 到 `main`。

## Issue 与反馈

- 提交 Bug 请使用 Bug 模板，附上复现步骤、系统版本、应用版本与日志
- 提交功能建议请说明使用场景与期望效果
- 安全漏洞请勿公开 Issue，邮件发送至 `security@xiuxiu.app`（请替换为实际邮箱）

## 行为约定

- 一次 PR 只解决一个独立问题
- 不要在 PR 中混入无关的格式化改动
- 不要自行升级依赖版本，依赖升级由 Maintainer 统一处理
- 不要在代码中引入与功能无关的第三方库

再次感谢你的贡献！

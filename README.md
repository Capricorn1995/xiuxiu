# 嗅嗅

> 跨平台网页资源嗅探器 — 浏览即嗅探，所见即所得。

「嗅嗅」是一款基于 Electron 的桌面应用，能够在你浏览网页的同时自动嗅探页面中加载的图片、视频、音频等资源，并支持一键下载与 M3U8 流媒体合并保存。无需浏览器插件，无需复杂配置，开箱即用。

## 应用截图

<!-- 截图占位区域：请将实际截图放置到 docs/screenshots/ 目录，并替换下方链接 -->

| 主界面 | 嗅探列表 | 下载管理 |
| :---: | :---: | :---: |
| ![主界面](docs/screenshots/main.png) | ![嗅探列表](docs/screenshots/sniff.png) | ![下载管理](docs/screenshots/download.png) |

> 截图缺失？欢迎在 PR 中补充。

## 功能特性

- **实时资源嗅探** — 基于 Chrome DevTools Protocol，精准捕获页面加载的全部静态与流媒体资源
- **多类型支持** — 图片（JPG/PNG/WebP/GIF/AVIF）、视频（MP4/WebM/M3U8）、音频（MP3/M4A）、文档等
- **M3U8 流媒体下载** — 自动解析 master/media 播放列表，支持多码率选择，TS 分片合并为 MP4（内置 ffmpeg）
- **批量下载** — 多任务并发，支持暂停/恢复/重试，实时速度与进度展示
- **资源过滤** — 按类型、域名、文件大小筛选，快速定位目标资源
- **智能命名** — 支持自定义命名模板（`{title}` `{index}` `{ext}` 占位符）
- **托盘常驻** — 关闭窗口时最小化到系统托盘，后台持续嗅探
- **跨平台** — 支持 Windows（macOS/Linux 即将支持）
- **本地优先** — 所有设置与下载记录保存在本地，不收集任何用户数据

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) 18.0 或更高版本
- [pnpm](https://pnpm.io/) 8.0 或更高版本
- Windows 10 / 11（macOS / Linux 用户可尝试源码运行）

### 开发环境配置

```bash
# 1. 克隆仓库
git clone https://github.com/xiuxiu/xiuxiu.git
cd xiuxiu

# 2. 安装依赖
pnpm install

# 3. 启动开发模式（同时拉起 Vite 与 Electron）
pnpm dev
```

开发模式下，渲染进程支持热更新，主进程修改后会自动重启 Electron。

### 目录说明

```
xiuxiu/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── index.ts       # 应用入口
│   │   ├── window.ts      # 窗口管理
│   │   ├── tray.ts        # 系统托盘
│   │   ├── ipc.ts         # IPC 通信处理
│   │   ├── settings.ts    # 设置持久化
│   │   ├── sniffer/       # CDP 嗅探核心
│   │   ├── downloader/    # 下载器（含 M3U8）
│   │   └── utils/
│   ├── renderer/          # React 渲染进程
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/         # Zustand 状态管理
│   │   └── styles/
│   └── shared/            # 主进程/渲染进程共享类型
├── resources/             # 应用图标等静态资源
├── scripts/               # 开发与构建脚本
├── build/                 # 构建中间产物
├── release/               # 打包产物输出目录
└── docs/                  # 文档
```

## 构建打包

### 构建源码

```bash
# 编译主进程（TypeScript）与渲染进程（Vite build）
pnpm build
```

### 打包安装包

```bash
# Windows NSIS 安装包（默认）
pnpm dist:win

# Windows 免安装便携版
pnpm dist:win:portable

# 仅打包不生成安装程序（用于快速验证）
pnpm pack
```

打包产物输出到 `release/` 目录，文件命名格式：

- 安装包：`嗅嗅-Setup-0.1.0.exe`
- 便携版：`嗅嗅-0.1.0-portable.exe`

## 技术栈

| 层级 | 技术 | 说明 |
| :--- | :--- | :--- |
| 桌面框架 | [Electron 28](https://www.electronjs.org/) | 跨平台桌面运行时 |
| UI 框架 | [React 18](https://react.dev/) + TypeScript | 渲染层视图 |
| 构建工具 | [Vite 5](https://vitejs.dev/) | 渲染进程构建 |
| 状态管理 | [Zustand](https://github.com/pmndrs/zustand) | 轻量状态库 |
| 嗅探核心 | Chrome DevTools Protocol | 通过 CDP 监听网络请求 |
| 流媒体解析 | [m3u8-parser](https://github.com/videojs/m3u8-parser) | HLS 播放列表解析 |
| 视频合并 | [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) | TS 分片合并为 MP4 |
| 设置持久化 | [electron-store](https://github.com/sindresorhus/electron-store) | 本地配置存储 |
| 打包工具 | [electron-builder](https://www.electron.build/) | 多平台打包 |

## 项目结构

详见上文「目录说明」。核心模块分布：

- `src/main/sniffer/` — CDP 嗅探引擎，挂载到 BrowserWindow，监听 `Network.responseReceived` 等事件
- `src/main/downloader/` — 下载管理器，支持普通文件下载与 M3U8 流媒体分片下载合并
- `src/renderer/store/` — Zustand 全局状态，与主进程通过 IPC 双向同步
- `src/shared/` — 主进程与渲染进程共享的类型定义与 IPC 通道常量

## 开源协议

本项目基于 [MIT License](./LICENSE) 开源。

Copyright © 2025 XiuXiu Contributors

## 贡献指南

欢迎参与项目共建！请阅读 [贡献指南](./CONTRIBUTING.md) 了解开发环境、代码规范与提交规范。

## 致谢

- 感谢 [Electron](https://www.electronjs.org/) 社区提供的跨平台桌面方案
- 感谢 [FFmpeg](https://ffmpeg.org/) 项目提供的多媒体处理能力
- 感谢所有为开源生态做出贡献的开发者

# Windows 快速启动指南

本文档面向 Windows 用户，介绍如何从源码构建或通过安装包使用「嗅嗅」。

## 环境要求

### 运行环境

- **操作系统**：Windows 10 64 位 或 Windows 11
- **运行时**：无需预装任何运行时，安装包已内置所有依赖
- **磁盘空间**：300 MB 以上（含 ffmpeg 资源）
- **内存**：建议 4 GB 以上

### 开发环境（仅源码构建需要）

- **Node.js**：18.0 或更高版本（[下载地址](https://nodejs.org/zh-cn/download)）
- **pnpm**：8.0 或更高版本
- **Git**：任意近期版本
- **Visual Studio Build Tools**：编译原生模块（如 `ffmpeg-static`）所需，安装时勾选「C++ 桌面开发」工作负载

```bash
# 安装 pnpm
npm install -g pnpm

# 验证版本
node -v   # v18.x 或更高
pnpm -v   # 8.x 或更高
```

## 方式一：从源码构建

### 1. 克隆仓库

```bash
git clone https://github.com/xiuxiu/xiuxiu.git
cd xiuxiu
```

### 2. 安装依赖

```bash
pnpm install
```

> 如果下载 `electron` 或 `ffmpeg-static` 二进制失败，请配置镜像：
>
> ```bash
> # Electron 镜像
> set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
>
> # ffmpeg 镜像
> pnpm config set ffmpeg_mirror https://npmmirror.com/mirrors/ffmpeg-static
>
> # 重新安装
> pnpm install
> ```

### 3. 启动开发模式（可选，用于调试）

```bash
pnpm dev
```

开发模式下，渲染进程支持 HMR，主进程修改后自动重启。

### 4. 编译源码

```bash
pnpm build
```

产物输出到 `dist/` 目录。

### 5. 打包安装包

```bash
# 方式 A：生成 NSIS 安装包（推荐分发给最终用户）
pnpm dist:win

# 方式 B：生成免安装便携版（解压即用）
pnpm dist:win:portable

# 方式 C：仅打包不生成安装程序（用于快速验证）
pnpm pack
```

打包产物位于 `release/` 目录：

- 安装包：`嗅嗅-Setup-0.1.0.exe`
- 便携版：`嗅嗅-0.1.0-portable.exe`

## 方式二：从安装包安装

### 1. 获取安装包

从 [GitHub Releases](https://github.com/xiuxiu/xiuxiu/releases) 下载最新版本的安装包：

- **推荐**：`嗅嗅-Setup-0.1.0.exe`（NSIS 安装包，自动创建快捷方式）
- **免安装**：`嗅嗅-0.1.0-portable.exe`（便携版，双击即用，不写注册表）

### 2. 安装步骤（NSIS 安装包）

1. 双击 `嗅嗅-Setup-0.1.0.exe`
2. 如果出现 SmartScreen 警告，点击「更多信息」→「仍要运行」（应用未签名，详见下文常见问题）
3. 选择安装目录（默认 `%LOCALAPPDATA%\Programs\嗅嗅`）
4. 勾选是否创建桌面快捷方式、开始菜单快捷方式
5. 点击「安装」→「完成」

### 3. 启动应用

- 桌面双击「嗅嗅」快捷方式
- 或从开始菜单搜索「嗅嗅」
- 便携版直接双击 `嗅嗅-0.1.0-portable.exe`

### 4. 首次使用

1. 启动后会打开内置浏览器窗口
2. 在地址栏输入目标网址（如 `https://example.com`）并回车
3. 浏览页面时，嗅探器会自动捕获图片、视频等资源
4. 在右侧「嗅探列表」中选择需要的资源，点击「下载」即可

详细使用说明请参考主 README 的「功能特性」章节。

## 常见问题

### Q1：安装时被 Windows SmartScreen 拦截？

**原因**：应用未进行代码签名（当前为内测版本），Windows SmartScreen 会默认拦截未知发布者的可执行文件。

**解决**：点击弹窗中的「更多信息」→「仍要运行」即可继续安装。我们会在正式版本中接入代码签名。

### Q2：杀毒软件误报病毒？

**原因**：Electron 应用打包后包含 Python/Node 运行时与 ffmpeg 二进制，部分杀毒软件可能误报。

**解决**：将「嗅嗅」安装目录加入信任列表即可。所有源码均开源，可自行从源码构建验证。

### Q3：启动后窗口白屏？

**原因**：通常为显卡驱动与 Electron 硬件加速冲突。

**解决**：

1. 右键桌面快捷方式 → 属性
2. 在「目标」末尾追加 ` --disable-gpu`
3. 应用并重启

### Q4：M3U8 视频下载后无法播放？

**原因**：M3U8 分片合并依赖内置 ffmpeg，若 ffmpeg 资源丢失会导致合并失败。

**解决**：

1. 检查安装目录下 `resources/ffmpeg/ffmpeg.exe` 是否存在
2. 若缺失，重新安装应用，或从源码构建时确认 `pnpm install` 完整执行
3. 临时方案：手动下载 ffmpeg.exe 放入上述目录

### Q5：嗅探不到任何资源？

**可能原因与排查**：

1. **目标页面使用 iframe**：当前版本暂不支持跨域 iframe 内资源嗅探
2. **资源通过 Service Worker 加载**：CDP 无法捕获 Service Worker 响应
3. **目标域名被排除**：在「设置 → 嗅探」中检查「排除域名」列表
4. **文件大小过滤**：在「设置 → 嗅探」中调低「最小文件大小」

### Q6：下载速度慢或卡住？

**解决**：

1. 在「设置 → 下载」中调整「最大并发下载数」（默认 3，建议 1~5）
2. 检查网络代理设置
3. M3U8 下载为分片串行/并发下载，受限于源站 CDN 限速

### Q7：便携版配置文件保存在哪里？

便携版配置保存在程序所在目录的 `config/` 子目录下，可直接迁移整个文件夹实现绿色便携。

NSIS 安装版的配置保存在：

- 设置文件：`%APPDATA%\嗅嗅\config.json`
- 下载数据：用户在设置中指定的目录（默认「下载/嗅嗅」）

### Q8：如何完全卸载？

- **NSIS 安装版**：从「设置 → 应用」中卸载，并手动删除 `%APPDATA%\嗅嗅` 目录
- **便携版**：直接删除程序所在文件夹

### Q9：从源码构建报错 `MSBUILD : error MSB3428`？

**原因**：缺少 Visual Studio C++ 构建工具。

**解决**：

1. 下载 [Visual Studio Build Tools](https://visualstudio.microsoft.com/zh-hans/visual-cpp-build-tools/)
2. 安装时勾选「使用 C++ 的桌面开发」工作负载
3. 重新执行 `pnpm install`

### Q10：如何查看应用日志？

应用日志输出到：

- **主进程日志**：`%APPDATA%\嗅嗅\logs\main.log`
- **渲染进程日志**：开发者工具 Console（`Ctrl+Shift+I`）

提交 Bug 时请附上 `main.log` 中的错误信息。

## 反馈与支持

- 提交 Issue：[github.com/xiuxiu/xiuxiu/issues](https://github.com/xiuxiu/xiuxiu/issues)
- 邮件支持：`support@xiuxiu.app`（请替换为实际邮箱）

更多文档请参考 [项目根目录 README](../README.md)。

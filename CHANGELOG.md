# 更新日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范，所有显著变更均会记录在本文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [0.1.0] - 2025-06-22

首个公开版本。完成核心嗅探与下载能力，面向投资人内测发布。

### 新增

- **资源嗅探引擎**：基于 Chrome DevTools Protocol 实时捕获页面加载的图片、视频、音频、文档等资源
- **资源类型筛选**：支持按图片/视频/音频/文档/其他分类过滤，支持按域名、文件大小筛选
- **资源元信息展示**：缩略图预览、MIME 类型、文件大小、分辨率、域名、文件名、时间戳
- **普通文件下载**：支持图片、视频直链下载，含进度、速度、暂停/恢复/重试
- **M3U8 流媒体下载**：
  - 自动解析 master/media playlist
  - 支持多码率选择
  - 支持加密 HLS（AES-128）解密
  - TS 分片并发下载
  - 内置 ffmpeg 合并为 MP4
- **批量下载**：多任务并发，可在设置中调整最大并发数（默认 3）
- **智能命名**：支持 `{title}` `{index}` `{ext}` 占位符命名模板
- **设置持久化**：基于 electron-store，包含通用、嗅探、下载三类配置
- **系统托盘**：关闭窗口时最小化到托盘，后台持续嗅探与下载
- **Windows 安装包**：提供 NSIS 安装包与免安装便携版两种分发形式
- **应用图标**：自定义品牌图标（含 .ico / .png / .svg）
- **开发者文档**：README、CONTRIBUTING、Windows 快速启动指南、投资人演示指南

### 已知问题

- macOS 与 Linux 版本尚未提供，需要进一步适配（`electron-builder.yml` 当前仅配置 Windows 目标）
- 应用未进行代码签名，Windows SmartScreen 会触发未知发布者警告，需用户手动放行
- 暂不支持跨域 iframe 内资源嗅探
- 暂不支持 Service Worker 加载的资源嗅探
- M3U8 直播流（非 VOD）下载未做完整优化，可能因分片持续产生而无法结束
- 渲染进程暂未做完整的国际化（i18n），界面文案以中文为主
- 便携版配置文件迁移流程尚未提供 UI 入口

### 技术栈

- Electron 28
- React 18 + TypeScript 5
- Vite 5 + vite-plugin-electron
- Zustand 4
- electron-store 8
- m3u8-parser 7
- ffmpeg-static 5
- electron-builder 24

### 致谢

感谢所有参与内测的早期用户与贡献者。

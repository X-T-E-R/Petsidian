<p align="center">
  <img src="assets/brand/petsidian-logo.png" alt="Petsidian logo" width="180" />
</p>

# Petsidian

[English](README.md)

Petsidian 是一个仅支持桌面端的 Obsidian 插件，会在主窗口外显示独立桌宠。它把 Codex 宠物的导入、动作、气泡和桌面行为带进 Obsidian 的 Electron 运行时。

GitHub：<https://github.com/X-T-E-R/Petsidian>

## 快速开始

通过 Obsidian 社区插件审核后，可以在 **Settings → Community plugins → Browse** 中搜索 `Petsidian` 安装。

从 GitHub Releases 手动安装：

1. 下载 `main.js`、`desktop-pet-preload.js`、`manifest.json` 和 `styles.css`。
2. 放入 `VaultFolder/.obsidian/plugins/petsidian/`。
3. 重载 Obsidian 桌面端并启用 Petsidian。

Petsidian 依赖 Obsidian 桌面端的 Electron / Node API，因此保持 `isDesktopOnly: true`。
它面向 Windows、macOS 和 Linux 的 Obsidian 桌面端，但这个仓库目前还没有在 macOS 上对独立桌宠窗口做过运行时实测。

## 功能

- 主窗口外的透明独立桌宠窗口。
- 内置原版 OpenPet `nia` 宠物。
- 支持本地导入 Codex 宠物包、`pet.json`、图集 `.webp` 和静态图片。
- 支持从 Petdex、Codex Pets 和兼容 HTTPS 页面导入网站宠物。
- 支持点击动作、随机动作池、空闲自行动作、自主移动、拖拽定位和事件气泡。
- 设置页支持英文 / 简体中文。
- 可选插件 API、`obsidian://petsidian` URI 处理器和原生 Obsidian 事件反应。

## 导入宠物

本地导入支持：

```text
pet.json
spritesheet.webp
```

也支持 Codex 宠物包目录、Codex 宠物图集 `.webp`，以及单张 `.png`、`.jpg`、`.jpeg`、`.gif`、`.webp` 图片。静态图片会自动转换成 `8×9` WebP 图集。

网站导入支持：

- [Petdex](https://petdex.crafter.run/)：`https://petdex.crafter.run/pets/<slug>`
- [Codex Pets](https://codex-pets.net/)：分享 / 详情链接
- 公开暴露宠物图集的兼容 HTTPS 页面

网站导入只下载你提供 URL 公开暴露的元数据和图集，不执行第三方安装脚本。

## 自动化

稳定命令 ID：

- `petsidian:toggle-pet`
- `petsidian:show-pet`
- `petsidian:hide-pet`
- `petsidian:open-settings`
- `petsidian:wave`

在设置中启用后，其他插件可以调用 `app.plugins.plugins.petsidian.apiV1`。

在设置中启用后，`obsidian://petsidian?...` 只接受白名单动作、事件、显示切换、文本和 `ttlMs`。

原生 Obsidian 事件反应默认关闭，并带防抖。

## 开发检查

默认检查：

```powershell
pnpm typecheck
pnpm build
git diff --check
```

可选运行时检查：

```powershell
pnpm prepare:test-vault
pnpm smoke:obsidian
pnpm smoke:obsidian:attached
```

当改动涉及独立窗口、导入运行时行为，或发布前需要真实 Obsidian 抽查时，再运行这些运行时检查。

## 发布

```powershell
pnpm build
```

发布前按 [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) 检查。

Release tag 必须与 `manifest.json.version` 完全一致，例如 `0.1.0`，不要用 `v0.1.0`。GitHub Actions 会上传 `main.js`、`desktop-pet-preload.js`、`manifest.json`、`styles.css`、`versions.json` 和手动安装 zip。

## 安全与权利提醒

- 网站导入只会在你主动使用时发起 HTTPS 请求。
- 本地导入只会读取你主动选择的文件或目录。
- 没有遥测。
- 没有广告。
- 没有自更新机制。
- 导入宠物可能包含第三方美术或商标，请只导入你有权使用的素材。
- Petsidian 使用 GPL-3.0-or-later；导入宠物可能有单独的权利要求。

## 项目链接

- GitHub：<https://github.com/X-T-E-R/Petsidian>
- 支持 / 请我喝奶茶：<https://afdian.com/a/xter123>

## 友链

- [OpenPet](https://github.com/X-T-E-R/OpenPet)
- [linux.do](https://linux.do)
- [Petdex](https://petdex.crafter.run/)
- [Codex Pets](https://codex-pets.net/)

## 许可证与致谢

Petsidian 使用 [GPL-3.0-or-later](./LICENSE) 发布。

内置 `nia` 宠物和 OpenPet 兼容图集行为来自 [OpenPet](https://github.com/X-T-E-R/OpenPet)。第三方导入宠物仍受其各自许可证约束。

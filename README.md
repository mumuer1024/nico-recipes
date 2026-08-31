# Nico Recipes

一个纯静态 Astro 菜谱网站。`src/content/recipes/` 中的 Obsidian Markdown 是唯一内容源，列表结构来自 `src/content/recipes/moc/菜谱目录.md`。

## 本地开发

```sh
npm install
astro dev --background
```

构建：`npm run build`。背景开发服务器可用 `astro dev status`、`astro dev logs` 和 `astro dev stop` 管理。

## GitHub Pages

`.github/workflows/deploy.yml` 会在 push 到 `main` 时构建并部署。Astro 根据 GitHub Actions 的 `GITHUB_REPOSITORY` 自动设置 project Pages 的 `site` 和 `base`，不需要填写仓库名。

首次启用时，在仓库 Settings → Pages → Build and deployment 中将 Source 设为 **GitHub Actions**。之后推送 `main` 即可触发部署。

## 内容约定

- 只解析 `moc/菜谱目录.md` 中的 WikiLink 与 Markdown link。
- Markdown link 优先使用 href 定位；没有路径时才按唯一文件名匹配。
- 同名文件出现多个匹配时，构建会报错；找不到目标时会给出 warning，并在目录中保留该条目但不生成详情链接。
- `moc/**` 不会生成菜谱详情页。

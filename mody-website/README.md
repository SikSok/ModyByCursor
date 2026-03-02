# 摩迪 Mody 官网

参考 [Effie 官网](https://www.effie.co/) 风格打造的摩迪品牌官网，包含产品介绍、软件下载（扫码）、推广合作（参考 [Effie /dist](https://www.effie.co/dist)）与联系（参考 [Effie /feedback](https://www.effie.co/feedback)）。整站弹性布局，在电脑、平板、手机上均可正常显示。

## 内容结构

- **产品介绍**：首屏 slogan、产品亮点（附近司机、一键联系、安全可靠）
- **软件下载**：Android / iOS **二维码**，请使用手机扫码下载（C 端为主）
- **推广**：参考 Effie 分销页，标题「推广 Mody，获得可观且持续的收入，实现多赢」+ 文案 + 推广联系二维码
- **联系**：独立页面 [contact.html](contact.html)，参考 [Effie /feedback](https://www.effie.co/feedback)，欢迎语 + 微信二维码（暂无微信社群）
- **页脚**：关于我们、隐私政策、服务条款等链接

## 微信二维码（必配）

联系区与推广区均使用同一张微信二维码图片。请将您提供的微信二维码截图保存为：

```
mody-website/assets/wechat-qr.png
```

保存后刷新页面即可在「联系」与「推广」两处看到您的二维码。若未放置该文件，对应位置会显示占位/裂图。

## 本地预览

纯静态 HTML，可直接用浏览器打开：

```
打开 mody-website/index.html
```

或使用本地服务器（避免部分环境对 file:// 的路径限制）：

```bash
cd mody-website
npx serve .
# 或 python -m http.server 8080
```

## 部署

将 `mody-website` 目录整体部署到任意静态托管（如 GitHub Pages、Vercel、OSS 静态网站）即可。资源均相对路径，无需修改。

## 资源说明

- `index.html`：首页（产品、下载、推广）
- `contact.html`：联系我们独立页（参考 Effie /feedback）
- `assets/logo.svg`、`hero.svg`、`feature-*.svg`：品牌与产品插图
- `assets/promo-dist.svg`：推广区配图
- `assets/qr-android.svg`、`qr-ios.svg`：**纯二维码**占位图（无文字）。  
  **真实 Android 下载**：在 `index.html` 中设置 `MODY_APK_URL` 为你的 APK 下载地址，页面会用该链接生成二维码；或按 [docs/apk-download-ecs.md](../docs/apk-download-ecs.md) 生成二维码 PNG 后替换为 `assets/qr-android.png`。
- `assets/wechat-qr.png`：**需自行放置**，您的微信二维码截图（联系 + 推广共用）

## 与进度表对应

对应 `modi-progress.html` 中 **新里程碑 → N01 mody 官网项目**。

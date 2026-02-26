# 摩迪项目 · Agent 开发上下文（交接用）

> 供新开 Agent 快速了解仓库状态、约定与已解决问题，避免重复踩坑。

**最后更新：2026-02-25**

---

## 当前上下文概况

| 项 | 说明 |
|----|------|
| **主开发目标** | **mody-app**（C 端一体化，乘客/司机身份选择与切换），配合 **server** + **admin-web**。 |
| **原双端** | **user-app**、**driver-app** 暂保留不删，仅作参考；新功能在 mody-app 实现。 |
| **Server 部署** | 仅采用 **方案 A**（半自动一键）。国内 ECS 拉 GitHub 易超时，已同时配置 **Gitee** 镜像，ECS 从 Gitee 拉代码部署（2026-02-25）。详见 `docs/deploy-server.md`。 |
| **真机/云端 API** | 真机连本机 server：`npm run dev-lan` 写局域网 IP 到 `apiBaseUrl.js`。连云端：`npm run pre`（admin-web / mody-app 均支持）。 |
| **C 端请求** | 使用 **react-native-blob-util** 发请求，取用需 `default ?? require(...)`，否则易报 `fetch is not a function`。 |

---

## 1. 项目结构

- **mody-app**：C 端 RN 应用，Metro 8081，主入口与身份切换在此。
- **server**：Node + Express + TypeScript，Sequelize + MySQL；启动时 `sequelize.sync({ alter: true })` 自动建表/补字段（开发与生产均执行）。
- **admin-web**：管理端 Web（Vite）。
- **user-app / driver-app**：暂保留，参考用；driver-app 若跑需端口 8082。

文档：`README.md`、`mody-app-prompt.md`、`modi-progress.html`、`modi-api-design.html`、`docs/deploy-server.md`。

---

## 2. 技术栈与版本（勿随意升级）

| 项目 | 约定 |
|------|------|
| React Native | 0.74.0 |
| Gradle（Android） | **8.6**（勿用 8.11，与 RN 插件不兼容） |
| JDK | 使用本机 Android Studio JBR，`gradle.properties` 已关自动下载并指定路径 |
| Metro | mody-app 默认 8081；driver-app 若运行则 8082 |

---

## 3. 已解决过的问题（新 Agent 勿破坏）

- **Gradle JDK**：各 RN 项目 `android/gradle.properties` 已配置 `org.gradle.java.installations.auto-download=false` 及 JBR 路径；勿删改。
- **Gradle 8.11**：使用 **8.6**；`gradle-wrapper.properties` 中 `distributionUrl` 为 `gradle-8.6-all.zip`。
- **Metro 私有方法**：各 RN 端 `babel.config.js` 已加 `@babel/plugin-transform-class-properties`、`@babel/plugin-transform-private-methods`。
- **driver-app 端口**：必须 8082（package.json、run-android、integers.xml 一致），勿改为 8081。
- **真机请求**：server 已监听 `0.0.0.0`；C 端用 react-native-blob-util，`api.ts` 中需 `default ?? module` 取用；不要对 4xx 加 `Connection: close`。
- **local.properties**：不提交；换机后在对应 `android/` 下新建，内容 `sdk.dir=本机 SDK 路径`。

---

## 4. 关键文件位置

| 用途 | 位置 |
|------|------|
| C 端 API 基址 | `mody-app/src/config/apiBaseUrl.js`（`npm run dev-lan` / `npm run pre` 写入） |
| C 端请求封装 | `mody-app/src/services/api.ts`（BlobUtil，勿改 default 取用） |
| Server 部署脚本 | `server/scripts/deploy.sh`（方案 A 一键部署） |
| Server 部署说明 | `docs/deploy-server.md`（方案 A/B/C、Gitee、国内 ECS） |
| 服务端请求日志 | `server/src/middleware/requestLogger.ts` |
| JDK/本地路径 | 各 RN 端 `android/gradle.properties`、`android/local.properties`（后者不提交） |

---

## 5. 提交与忽略约定

- **提交**：源码、`package.json`、`package-lock.json`、非本地路径配置；`debug.keystore` 可提交。
- **不提交**：`node_modules`、`build`/`dist`、`**/android/local.properties`、`.env`、密钥、日志。见 `.gitignore`。

---

## 6. 换机 / 新环境必做

1. 在 **mody-app**、**server**、**admin-web** 各目录执行 `npm install`。
2. 若做 Android：在 **mody-app/android**（及若需则 user-app/driver-app 的 android）下建 `local.properties`，写 `sdk.dir=...`。
3. 各端 `.env` 按需配置（不提交）。

---

## 7. 新 Agent 使用本文件

- 优先读 **README.md** 与本文件，再按需看 `modi-progress.html`、`docs/deploy-server.md`。
- 改 C 端请求：保留 `api.ts` 中 BlobUtil 的 `default ?? module` 取用；改 API 基址注意 `apiBaseUrl.js` 与 `dev-lan`/`pre`。
- 改 server：勿恢复 4xx 的 `Connection: close`；表结构由 `sequelize.sync({ alter: true })` 在启动时同步，模型加字段后部署重启即可。

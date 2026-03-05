# 摩迪项目 · Agent 开发上下文（交接用）

> 供新开 Agent 快速了解仓库状态、约定与已解决问题，避免重复踩坑。

**最后更新：2026-03-02**

---

## 当前上下文概况

| 项 | 说明 |
|----|------|
| **主开发目标** | **mody-app**（C 端一体化，乘客/司机身份选择与切换），配合 **server** + **admin-web**。 |
| **Server 部署** | 仅采用 **方案 A**（半自动一键）。国内 ECS 拉 GitHub 易超时，已同时配置 **Gitee** 镜像，ECS 从 Gitee 拉代码部署（2026-02-25）。详见 `docs/deploy-server.md`。 |
| **官网部署** | 与 server 同仓库、同 Gitee；ECS 已有 Nginx，一次初始化后执行 `mody-website/scripts/deploy.sh` 即可更新。详见 `mody-website/docs/deploy-quick.md`。 |
| **真机/云端 API** | 真机连本机 server：`npm run dev-lan` 写局域网 IP 到 `apiBaseUrl.js`。连云端：`npm run pre`（admin-web / mody-app 均支持）。 |
| **C 端请求** | 使用 **react-native-blob-util** 发请求，取用需 `default ?? require(...)`，否则易报 `fetch is not a function`。 |
| **账号模型** | **单 users 表**：乘客/司机为同一用户的两种身份，司机字段合并入 users（driver_status、is_available 等）；无 drivers 表。登录单 token（user.id），切换身份不重新登录；driver_id 即 user.id。 |

---

## 1. 项目结构

- **mody-app**：C 端 RN 应用，Metro 8081，主入口与身份切换在此。
- **server**：Node + Express + TypeScript，Sequelize + MySQL；启动时 `sequelize.sync({ alter: true })` 自动建表/补字段（开发与生产均执行）。
- **admin-web**：管理端 Web（Vite）。
- **user-app / driver-app**：暂保留，参考用；driver-app 若跑需端口 8082。

文档：<code>README.md</code>、<code>z-agent-context.md</code>、<code>modi-progress.html</code>、<code>modi-api-design.html</code>、<code>modi-database-design.html</code>、<code>modi-requirements.html</code>、<code>modi-tech-stack.html</code>、<code>modi-phase-summary.html</code>、<code>docs/deploy-server.md</code>、<code>mody-website/docs/deploy-quick.md</code>。

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
| 官网部署脚本 | `mody-website/scripts/deploy.sh`（一键部署，Gitee + Nginx） |
| 官网部署说明 | `mody-website/docs/deploy-quick.md` |
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

## 7. 基础网络安全配置（2026-02-27）

- **域名接入**：`mody.中国` 及子域 `www` / `admin` / `api` 已解析到同一 ECS 公网 IP，ICP 备案处理中。
- **安全组收紧**：仅对公网开放 HTTP（80），SSH 入口限制为个人笔记本所在网络 IP 段，其余端口（如 3000）不对公网开放。
- **Nginx 加固**：在全局 `http {}` 中配置 `server_tokens off;`，隐藏版本号；官网已使用统一 4xx/5xx 错误页（404 → index.html，50x → 默认 50x.html）。
- **HTTPS 计划**：等待域名备案通过后，为 `mody.中国` 及 `www/admin/api` 申请并配置证书，统一跳转到 HTTPS。

---

## 8. 近期产品决策与今日完成概要（2026-03-02）

- **乘客端定位**：无定位默认闽清县梅城镇；存上次定位到 DB，无定位时优先用上次；App 左上角「图标+位置+右箭头」入口，点击打开定位配置抽屉（重新定位 + 常用/历史，首行固定「闽清县梅城镇（默认）」）；启动时以服务端 last_* 为初始中心，保证再次打开为上次定位。
- **乘客联系司机通知**：乘客点击拨打电话前调「联系司机」接口；服务端创建通知并经 WebSocket 推送给司机；司机端收推送后调用**系统本地通知 API**（非自绘条幅），需系统通知权限（首次引导、拒绝后约一周再问）；右上角消息图标进历史，未读角标；离线暂存、重连补发 PENDING_LIST。
- **单用户表重构**：drivers 表已合并入 users，仅保留 users 表；司机字段（driver_status、is_available、证件/车辆等）均在 users，可为 NULL。driver_locations、driver_notifications 的 driver_id 指向 users.id。登录单 token（user.id），乘客/司机接口共用该 token，身份切换不重新登录；管理端司机列表/审核基于 users 的 driver_status。

---

## 9. 新 Agent 使用本文件

- 优先读 **README.md** 与本文件，再按需看 `modi-progress.html`、`docs/deploy-server.md`。
- 改 C 端请求：保留 `api.ts` 中 BlobUtil 的 `default ?? module` 取用；改 API 基址注意 `apiBaseUrl.js` 与 `dev-lan`/`pre`。
- 改 server：勿恢复 4xx 的 `Connection: close`；表结构由 `sequelize.sync({ alter: true })` 在启动时同步，模型加字段后部署重启即可。
- **账号模型**：仅 **users** 表，无 drivers 表/Driver 模型；driver_id 即 user.id（拥有司机身份的用户）；勿恢复 drivers 表或双 token 登录逻辑。

# 摩迪项目 · Agent 开发上下文（交接用）

> 供新开 Agent 快速了解当前仓库状态、已解决问题与约定，避免重复踩坑。基于前期对话整理。

**最后更新：2026-02-25**

---

## 当前上下文概况（2026-02-25）

| 项 | 说明 |
|----|------|
| **产品决策** | C 端不再分用户端/司机端两个 APP，整合为单一应用 **mody-app**；注册后选身份（乘客/司机），身份可在个人中心切换。 |
| **主开发目标** | **mody-app**（已创建，统一登录、身份选择/切换、乘客/司机主界面与 server 对接已完成）。 |
| **原双端** | **user-app**、**driver-app** 目录**暂保留、不删除**，仅作参考或对照；新功能与主流程均在 mody-app 实现。 |
| **文档已更新** | README、本文件、modi-requirements、modi-progress、modi-phase-summary、modi-tech-stack、modi-api-design、modi-database-design 已统一为「mody-app + server + admin-web」表述，并注明原双端暂保留。 |
| **AI 执行入口** | 根目录 **mody-app-prompt.md**：含新建 mody-app、身份与路由、后端对接、文档更新等完整清单及可复制给 AI 的简短指令。 |
| **技术约束** | RN 0.74、Gradle 8.6、JDK 用本机 Android Studio JBR；mody-app 建议 Metro 8081；新建 mody-app 时需同步配置 Babel 私有方法、gradle.properties 等（可参考 user-app/driver-app）。 |
| **真机调试 API** | 手机访问电脑 server：`mody-app` 运行 `npm run dev-lan` 写入电脑局域网 IP 到 `src/config/apiBaseUrl.js`；server 已监听 `0.0.0.0`，终端会打印「手机/局域网访问」地址。 |
| **C 端请求层** | 使用 **react-native-blob-util** 发 API 请求（Android 上 fetch/XHR 对 4xx 响应易卡住）；取用时需 `(require('react-native-blob-util').default ?? require('react-native-blob-util')).fetch`，否则会报「fetch is not a function」。 |
| **下一步建议** | mody-app 骨架与身份流程已就绪；真机登录若仍有问题可查 adb logcat、服务端请求日志；或按 `modi-progress.html` 推进各阶段任务。 |

---

## 1. 项目概览

- **名称**：摩迪 Mody。C 端已整合为单一应用 **mody-app**，不再分用户端/司机端两个 APP。
- **主结构**：
  - **mody-app**：C 端一体化 React Native 应用（乘客/司机身份选择与切换，主开发目标，Metro **8081**）
  - **server**：后端 Node 服务
  - **admin-web**：管理端 Web
- **暂保留（后续再删）**：**user-app**（原用户端）、**driver-app**（原司机端）目录保留不动，仅作参考。
- **文档**：根目录 `mody-app-prompt.md`（mody-app 整合与执行说明）、`README.md`、`modi-progress.html`、`modi-api-design.html`、`modi-tech-stack.html`、`modi-phase-summary.html`。

---

## 2. 技术栈与版本（当前已跑通）

| 项目       | 关键版本/约定 |
|------------|----------------|
| React Native | 0.74.0 |
| Gradle（Android） | **8.6**（勿用 8.11，与 RN 插件不兼容） |
| JDK         | 使用本机 Android Studio JBR，不在构建时自动下载 |
| Metro       | mody-app 8081；user-app/driver-app 若运行则 8081/8082（暂保留） |

---

## 3. 已解决过的问题（新 Agent 勿破坏）

- **Gradle 自动下载 JDK 17 失败**  
  - 在 `mody-app/android/gradle.properties`、`user-app/android/gradle.properties` 与 `driver-app/android/gradle.properties` 中已配置：  
    `org.gradle.java.installations.auto-download=false`  
    `org.gradle.java.installations.paths=C\:\\Program Files\\Android\\Android Studio\\jbr`  
  - 不要删或改错路径，否则换机/无外网会再次报错。

- **Gradle 8.11 报 Unresolved reference: serviceOf**  
  - 使用 **Gradle 8.6**。两端的 `android/gradle/wrapper/gradle-wrapper.properties` 里 `distributionUrl` 应为 `gradle-8.6-all.zip`。

- **Metro 报 “Class private methods are not enabled”**  
  - 已在 mody-app、user-app、driver-app 的 `babel.config.js` 中加入：  
    `@babel/plugin-transform-class-properties`、`@babel/plugin-transform-private-methods`。  
  - 两端的 `package.json` 中已包含对应 devDependencies。

- **“ModyDriverApp” has not been registered / 加载到 user-app 的包**  
  - driver-app 必须用 **8082**：  
    - `package.json` 的 `start`/`dev`/`pre` 已带 `--port 8082`；  
    - `android` 脚本为 `react-native run-android --port 8082`；  
    - `driver-app/android/app/src/main/res/values/integers.xml` 中 `react_native_dev_server_port` 为 8082。  
  - 不要改成 8081 或删掉 `--port 8082`。

- **真机访问电脑 server 收不到响应 / 一直「请求未返回」**  
  - **服务端**：`server/src/index.ts` 已用 `app.listen(PORT, '0.0.0.0', ...)`，并 `const PORT = Number(process.env.PORT) || 3000`（避免 TS 报错）。  
  - **C 端 API 地址**：真机不能用 localhost。在 `mody-app` 运行 `npm run dev-lan`，会把电脑局域网 IP 写入 `mody-app/src/config/apiBaseUrl.js`。换网络后需重跑一次。  
  - **请求实现**：Android 上原生 fetch/XHR 对 4xx 响应 body 常不回调，已改用 **react-native-blob-util** 发请求（`mody-app/src/services/api.ts`）。  
  - **BlobUtil 引用**：库为 default export，需 `const api = require('react-native-blob-util').default ?? require('react-native-blob-util'); blobUtilFetch = api.fetch.bind(api)`，否则会报 `fetch is not a function`。  
  - **服务端错误响应**：不要对 4xx 加 `Connection: close`（曾导致部分环境下客户端收不全响应）。  
  - **排查**：真机联调时可运行 `adb logcat *:S ReactNative:V ReactNativeJS:V`，看是否有 `[API 请求]`、`[API BlobUtil] 已读响应` 等日志。

- **换机后缺 local.properties**  
  - `**/android/local.properties` 已在 `.gitignore`，不提交。  
  - 换机后需在 `mody-app/android` 建 `local.properties`；若运行原双端则 user-app/android、driver-app/android 也各建一份。内容：  
    `sdk.dir=本机Android_SDK绝对路径`（如 Windows：`C\:\\Users\\用户名\\AppData\\Local\\Android\\Sdk`）。

---

## 4. 关键文件位置（改配置时别动错）

| 用途           | 位置 |
|----------------|------|
| C 端主应用     | **mody-app**（身份切换、乘客/司机能力） |
| C 端 API 基址  | `mody-app/src/config/apiBaseUrl.js`（真机用 `npm run dev-lan` 写入电脑 IP） |
| C 端请求封装   | `mody-app/src/services/api.ts`（使用 react-native-blob-util，勿改 default 取用方式） |
| 服务端请求日志 | `server/src/middleware/requestLogger.ts`（请求地址、响应码、报错原因） |
| Android 根配置 | `mody-app/android/`；原 `user-app/android/`、`driver-app/android/` 暂保留 |
| JDK/本地路径   | 各 RN 端 `android/gradle.properties`、`android/local.properties`（后者不提交） |
| Metro 端口     | mody-app 默认 8081；原 driver-app 为 8082（若保留运行） |
| Babel 私有方法 | 各 RN 端根目录 `babel.config.js` |
| 入口/注册组件  | mody-app：见项目内 `index.js`；原 user-app/driver-app 为 `ModyUserApp` / `ModyDriverApp` |

---

## 5. 提交与忽略约定

- **要提交**：源码、`package.json`、`package-lock.json`、各端及 Android 的**非本地路径**配置；`debug.keystore` 可提交便于换机 Debug 构建。
- **不提交**：`node_modules`、`build`/`dist`、`**/android/local.properties`、`.env`、密钥、日志。  
- 详见根目录 `.gitignore` 顶部注释及 `README.md`。

---

## 6. 换机 / 新环境必做（给用户或新 Agent）

1. 在 **mody-app**、**server**、**admin-web** 目录执行 `npm install`；若需运行原双端则在 user-app、driver-app 也执行。  
2. 若做 Android：在 **mody-app/android** 建 `local.properties`，写 `sdk.dir=...`；原 user-app/driver-app 若运行也需各自 android 下建。  
3. 需要时配置各端 `.env`（不提交）。

---

## 7. 建议的 Commit 文案参考（与当前 changes 相符）

- `docs: C 端整合为 mody-app，更新 README/需求/进度/技术栈/API 等文档，原 user-app/driver-app 暂保留`
- `feat(mody-app): 新建 mody-app 工程，实现身份选择/切换、统一登录、乘客/司机主界面与 server 对接`
- `fix(mody-app): 真机联调 API 使用 react-native-blob-util，dev-lan 配置与 server 0.0.0.0 监听`

---

## 8. 新 Agent 使用本文件

- **优先阅读**：根目录 `README.md` 与本文件，再按需查 `modi-phase-summary.html`、`modi-progress.html` 的后续任务与进度。  
- **改 C 端请求或登录**：务必保留 `api.ts` 里对 react-native-blob-util 的 `default ?? module` 取用方式；改端口或 API 基址时注意 `apiBaseUrl.js` 与 `npm run dev-lan`。  
- **改服务端**：勿恢复对 4xx 的 `Connection: close`；`requestLogger` 已按「请求地址 / 响应码 / 报错原因」输出，可继续沿用。

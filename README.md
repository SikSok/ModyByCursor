# 摩迪 Mody · 项目仓库

**C 端一体化应用 mody-app**（React Native）+ 服务端（Node）+ 管理端（Web）。乘客与司机通过同一 APP 身份切换使用。

---

## 项目结构

| 目录 | 说明 |
|------|------|
| **mody-app** | C 端一体化 RN 应用（乘客/司机身份切换，主开发目标） |
| **server** | 后端 Node 服务 |
| **admin-web** | 管理端 Web 前端 |
| **mody-website** | 摩迪官网（产品介绍、下载、推广、联系，参考 Effie 风格） |
| **user-app** | 原用户端 RN 应用（**暂保留**，后续再删除） |
| **driver-app** | 原司机端 RN 应用（**暂保留**，后续再删除） |

文档：<code>README.md</code>、<code>z-agent-context.md</code>、<code>modi-progress.html</code>、<code>modi-api-design.html</code>、<code>modi-database-design.html</code>、<code>modi-requirements.html</code>、<code>modi-tech-stack.html</code>、<code>modi-phase-summary.html</code>；部署见 <code>docs/deploy-server.md</code>。

---

## 环境要求

- **Node** ≥ 18  
- **npm** 或 yarn  
- **Android 开发**：JDK 17+、Android Studio（含 SDK/NDK）、本机已配置 `JAVA_HOME`  
- **iOS**：Xcode（仅 macOS）

---

## 本地运行

### C 端应用（mody-app）

```bash
cd mody-app
npm install
npm run start          # Metro 默认 8081
# 新终端
npm run android        # 或 ios
```

*（mody-app 已创建，统一登录与身份选择/切换已实现；详见根目录 <code>README.md</code> 与 <code>z-agent-context.md</code>。）*

### 服务端（server）

```bash
cd server
npm install
# 配置 .env 后启动，见 server 目录说明
```

### 管理端（admin-web）

```bash
cd admin-web
npm install
npm run dev
```

### 原用户端 / 司机端（暂保留，仅作参考）

- **user-app**：`cd user-app` → `npm install` → `npm run start`（端口 8081）→ 另开终端 `npm run android`
- **driver-app**：`cd driver-app` → `npm install` → `npm run start`（端口 8082）→ 另开终端 `npm run android --port 8082`

---

## 换一台电脑拉取后必做（避免运行/调试报错）

1. **各应用安装依赖**  
   在 **mody-app**、**server**、**admin-web** 各目录下执行一次：`npm install`。  
   若需运行原 user-app / driver-app，也需在对应目录执行 `npm install`。  
   （仓库已提交 `package-lock.json`，保证依赖一致。）

2. **Android 本地路径（仅做 RN Android 时）**  
   - 仓库**不提交** `android/local.properties`（每台机器路径不同）。  
   - 在 **mody-app/android** 下新建 `local.properties`，内容一行：  
     `sdk.dir=你的Android_SDK绝对路径`  
     例如 Windows：  
     `sdk.dir=C\:\\Users\\你的用户名\\AppData\\Local\\Android\\Sdk`  
   - 若运行 user-app / driver-app，也需在各自 `android` 目录下建 `local.properties`。  
   - 也可用 Android Studio 打开对应 `android` 目录，让它自动生成。

3. **环境变量（按需）**  
   - 各项目若有 `.env` 需求，在本地新建 `.env`（不要提交），参考项目内说明或示例。

---

## 提交与分支

- 请提交：源码、`package.json`、`package-lock.json`、各项目及 Android 的**非本地路径**配置。  
- 不提交：`node_modules`、`build`/`dist`、`android/local.properties`、`.env`、密钥、日志。  
- 详见根目录 `.gitignore`。

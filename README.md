# 摩迪 Mody · 四端项目

用户端 / 司机端（React Native）+ 服务端（Node）+ 管理端（Web）一体化仓库。

---

## 项目结构

| 目录 | 说明 |
|------|------|
| **user-app** | 用户端 RN 应用（端口 8081） |
| **driver-app** | 司机端 RN 应用（端口 8082） |
| **server** | 后端 Node 服务 |
| **admin-web** | 管理端 Web 前端 |

文档：`modi-progress.html`（进度）、`modi-api-design.html`、`modi-tech-stack.html` 等。

---

## 环境要求

- **Node** ≥ 18  
- **npm** 或 yarn  
- **Android 开发**：JDK 17+、Android Studio（含 SDK/NDK）、本机已配置 `JAVA_HOME`  
- **iOS**：Xcode（仅 macOS）

---

## 本地运行

### 用户端（user-app）

```bash
cd user-app
npm install
npm run start          # Metro 默认 8081
# 新终端
npm run android        # 或 ios
```

### 司机端（driver-app）

```bash
cd driver-app
npm install
npm run start          # Metro 固定 8082
# 新终端
npm run android --port 8082   # 或直接 npm run android（已配 8082）
```

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

---

## 换一台电脑拉取后必做（避免运行/调试报错）

1. **各应用安装依赖**  
   在 `user-app`、`driver-app`、`server`、`admin-web` 各目录下执行一次：  
   `npm install`  
   （仓库已提交 `package-lock.json`，保证依赖一致。）

2. **Android 本地路径（仅做 RN Android 时）**  
   - 仓库**不提交** `android/local.properties`（每台机器路径不同）。  
   - 在 **user-app** 和 **driver-app** 的 `android` 目录下新建 `local.properties`，内容一行：  
     `sdk.dir=你的Android_SDK绝对路径`  
     例如 Windows：  
     `sdk.dir=C\:\\Users\\你的用户名\\AppData\\Local\\Android\\Sdk`  
   - 也可用 Android Studio 打开对应 `android` 目录，让它自动生成。

3. **环境变量（按需）**  
   - 各项目若有 `.env` 需求，在本地新建 `.env`（不要提交），参考项目内说明或示例。

按以上步骤后，用户端与司机端可同时用数据线连手机调试（user-app 用 8081，driver-app 用 8082）。

---

## 提交与分支

- 请提交：源码、`package.json`、`package-lock.json`、各项目及 Android 的**非本地路径**配置。  
- 不提交：`node_modules`、`build`/`dist`、`android/local.properties`、`.env`、密钥、日志。  
- 详见根目录 `.gitignore`。

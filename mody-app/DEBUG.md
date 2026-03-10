# C 端调试与线上报错定位

`npm run pre`（C端调试）会连线上接口 `https://api.mody.中国/api`。出现「请求超时」等错误时，按下面方式定位。

---

## 一、客户端：在哪儿看报错信息

### 1. Metro 终端（首选）

运行 `npm run pre` 的**同一个终端**里，每次 API 报错都会打印一块：

```
────────── [API 报错] ──────────
接口: POST https://api.mody.中国/api/auth/login
参数: { "phone": "177...", "password": "***" }
报错原因: 请求超时
────────────────────────────────
```

- **请求超时**：5 秒内没收到响应就会打这条（见 `src/services/api.ts` 里 `REQUEST_TIMEOUT_MS`）。
- 建议：出错时先看这个终端，确认**具体是哪个接口、什么原因**（超时 / 4xx / 响应非 JSON 等）。

### 2. 登录页「查看上次接口报错」（仅开发构建可见）

每次有 API 报错，会把详情存到本地。在**开发构建**的登录页底部（**仅当 `__DEV__ === true` 时**，即未打正式发布包时）会出现：

- **「▶ 查看上次接口报错」**：点开可看完整 JSON（接口、参数、状态码、报错原因、保存时间）。
- **「清除报错记录」**：清除后不再显示，直到下次再报错。

正式打包（release）后 `__DEV__` 为 false，用户不会看到该区块，只会看到 Toast 提示。

**若 Metro 终端没有显示 `[API 请求]` / `[API 报错]`**（数据线调试时常见）：说明设备上的 JS 日志没传到 Metro。此时可以：
- **在手机上直接看**：登录页会提示「发生接口报错，请向下滚动查看上次接口报错详情」，向下滚动点「▶ 查看上次接口报错」即可看到完整接口地址、参数、报错原因，不依赖终端。
- **用 adb 看 JS 日志**：再开一个终端执行  
  `adb logcat *:S ReactNative:V ReactNativeJS:V`  
  接口请求和报错会打在这里。

---

## 二、服务端：生产环境日志打在哪里

你之前实现的「生产服务端打日志」在 **requestLogger** 中间件里：

- **日志目录**：环境变量 `LOG_DIR`；未设置时为 **Node 进程当前工作目录下的 `logs/`**。
- **日志文件**：`logs/access.log`
- **格式**：每行一条 JSON（NDJSON），包含 `time`、`method`、`path`、`statusCode`、`durationMs`、`ip`，失败时还有 `errorMessage`。
- **何时写文件**：`NODE_ENV=production` 时自动写；开发环境想写可设 `LOG_REQUEST_TO_FILE=1`。

### 怎么去看

1. **SSH 到线上服务器**，找到跑 Node 的进程（如 PM2、systemd）。
2. **确认进程的「当前工作目录」**  
   - PM2：一般是项目根目录，即 `logs/` 在项目根下。  
   - 若部署时设了 `LOG_DIR`，则到该目录下找 `access.log`。
3. **查最近错误请求**：
   ```bash
   grep -E '"statusCode":[45][0-9]{2}' logs/access.log | tail -20
   tail -20 logs/access.log
   ```

### 调试接口（若已暴露）

- **GET /api/debug/requests**：返回最近约 100 条请求（内存），可看请求是否到达服务端、状态码、耗时等。  
  （生产环境若未开放此路由，就以上面日志文件为准。）

---

## 三、验证服务端接口是否正常

超时不一定是后端代码挂了，可能是：服务没跑、端口/防火墙、Nginx 未转发、域名解析不到等。按下面顺序验证。

### 1. 在你本机用浏览器或 curl 测「能否连上」

在**你电脑**上打开浏览器或终端：

- **健康检查（最简单）**  
  浏览器访问：  
  `https://api.mody.中国/api/health`  
  若几秒内看到 `{"success":true,"message":"服务运行正常",...}`，说明**公网能访问到服务**，服务端至少是活的。
- **看响应时间**  
  终端执行（PowerShell）：  
  ```powershell
  curl -w "\n耗时: %{time_total}s\n" -s -o NUL "https://api.mody.中国/api/health"
  ```  
  若耗时 > 5 秒，客户端 5 秒超时就会报「请求超时」，需要排查服务端或网络为什么慢。

### 2. 本机直接测登录接口

在终端用 POST 测登录接口是否返回（不关心 4xx，只关心是否在 5 秒内有响应）：

```powershell
curl -X POST "https://api.mody.中国/api/auth/login" -H "Content-Type: application/json" -d "{\"phone\":\"17710222617\",\"password\":\"123456\"}" -w "\n耗时: %{time_total}s\n"
```

- **有 JSON 返回且耗时 < 5 秒**：接口正常，问题更可能是手机网络/运营商/证书等。
- **一直转圈、最后超时**：服务端没响应或很慢，需要上服务器排查。
- **连接被拒绝 / 无法解析域名**：网络或 DNS 问题，或服务没对外暴露。

### 3. 在服务器上测「本机是否正常」

SSH 到线上服务器后：

```bash
# 健康检查（端口按你实际配置改，如 3000）
curl -s "http://127.0.0.1:3000/api/health"
```

- **立刻返回** `{"success":true,...}`：说明 Node 服务在本机正常，问题在 Nginx/公网/防火墙。
- **无响应或连接被拒绝**：说明 Node 没跑、端口不对或崩了，看进程和 `logs/` 下的日志。

### 4. 看请求有没有到服务端

- 浏览器访问（若线上开放了）：  
  `https://api.mody.中国/api/debug/requests`  
  看最近请求里有没有 `POST /auth/login`，以及对应的时间、状态码、耗时。
- 或在服务器上：  
  `grep "auth/login" logs/access.log | tail -5`  
  若你点登录后这里**没有新记录**，说明请求没到 Node（被 Nginx 拦了、没转发、或域名/网络没到服务器）。

**结论**：  
- 本机 curl/浏览器也超时 → 重点查服务端是否在跑、端口、Nginx、防火墙。  
- 本机很快、只有手机超时 → 重点查手机网络、运营商、HTTPS 证书。  
- 服务端 `access.log` 或 `/api/debug/requests` 里没有这次登录请求 → 请求没到后端，查网络/域名/Nginx。

---

## 四、请求超时时的排查顺序

1. **看客户端**  
   - Metro 终端或登录页「查看上次接口报错」，确认是「请求超时」且接口是 `POST .../auth/login`（或对应接口）。
2. **看服务端是否收到请求**  
   - 线上看 `logs/access.log` 或 `/api/debug/requests`，看是否有对应 path 的请求。  
   - **没有**：多半是网络/域名/DNS/证书或请求没发出去，重点查客户端网络、`api.mody.中国` 解析、HTTPS。  
   - **有**：看该条记录的 `statusCode`、`durationMs`、`errorMessage`；若 `durationMs` 很大或 5xx，说明服务端慢或报错，再查服务端日志和数据库。
3. **可选**  
   - 适当调大客户端超时（`src/services/api.ts` 里 `REQUEST_TIMEOUT_MS`），仅作临时排查用；长期应优化服务端或网络。

按以上步骤，你后续遇到类似报错也能自己看到报错信息并快速定位是客户端超时、网络问题还是服务端问题。

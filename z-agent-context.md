# 摩迪项目 · Agent 开发上下文（交接用）

> 供新开 Agent 快速了解仓库状态、约定与已解决问题，避免重复踩坑。

**最后更新：2026-03-02（含登录/体验/推广/合规阶段改造）**

---

## 当前上下文概况

| 项 | 说明 |
|----|------|
| **主开发目标** | **mody-app**（C 端一体化，乘客/司机身份选择与切换），配合 **server** + **admin-web**。 |
| **Server 部署** | 仅采用 **方案 A**（半自动一键）。国内 ECS 拉 GitHub 易超时，已同时配置 **Gitee** 镜像，ECS 从 Gitee 拉代码部署（2026-02-25）。详见 `docs/deploy-server.md`。 |
| **官网部署** | 与 server 同仓库、同 Gitee；ECS 已有 Nginx，一次初始化后执行 `mody-website/scripts/deploy.sh` 即可更新。详见 `mody-website/docs/deploy-quick.md`。官网已上线首页、推广合作、联系、关于、隐私政策、服务条款等页面。 |
| **真机/云端 API** | 真机连本机 server：`npm run dev-lan` 写局域网 IP 到 `apiBaseUrl.js`。连云端：`npm run pre`（admin-web / mody-app 均支持）。 |
| **C 端请求** | 使用 **react-native-blob-util** 发请求，取用需 `default ?? require(...)`，否则易报 `fetch is not a function`。 |
| **账号模型** | **单 users 表**：乘客/司机为同一用户的两种身份，司机字段合并入 users（driver_status、is_available 等）；无 drivers 表。登录单 token（user.id），切换身份不重新登录；driver_id 即 user.id。 |

---

## 1. 项目结构

- **mody-app**：C 端 RN 应用，Metro 8081，主入口与身份切换在此。
- **server**：Node + Express + TypeScript，Sequelize + MySQL；启动时 `sequelize.sync({ alter: true })` 自动建表/补字段（开发与生产均执行）。
- **admin-web**：管理端 Web（Vite）。
- **mody-website**：官网静态站（首页、推广合作、联系、下载落地页、关于、隐私政策、服务条款）。
- **user-app / driver-app**：暂保留，参考用；driver-app 若跑需端口 8082。

文档：`README.md`、本文件、`modi-*.html`（需求/设计/进度）、`docs/deploy-server.md`、`mody-website/docs/deploy-quick.md`。

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
| C 端功能开关 | `mody-app/src/config/features.ts`（如微信登录开关、调试开关等） |
| 官网基础 URL | `mody-app/src/config/website.ts`（App 个人中心跳转官网 about/privacy/terms/promo 等） |
| 埋点/事件 | `mody-app/src/utils/analytics.ts` |
| 手机号工具 | `mody-app/src/utils/phone.ts`（格式校验、脱敏展示等） |
| 司机/乘客身份与 token | `mody-app/src/context/IdentityContext.tsx`、`mody-app/src/constants/storageKeys.ts` |
| 司机首页 | `mody-app/src/screens/DriverHomeScreen.tsx` |
| 乘客首页 | `mody-app/src/screens/PassengerHomeScreen.tsx` |
| 个人中心 | `mody-app/src/screens/ProfileScreen.tsx` |
| 登录页 | `mody-app/src/screens/LoginScreen.tsx` |
| 司机认证页 | `mody-app/src/screens/DriverVerificationScreen.tsx` |
| 乘客/司机教程 | `mody-app/src/components/DriverTutorial.tsx`、`mody-app/src/components/PassengerTutorial.tsx` |
| Server 部署脚本 | `server/scripts/deploy.sh`（方案 A 一键部署） |
| Server 部署说明 | `docs/deploy-server.md`（方案 A/B/C、Gitee、国内 ECS） |
| 司机认证与位置/通知 | `server/src/controllers/driverController.ts`、`server/src/services/driverService.ts`、`server/src/services/driverLocationService.ts`、`server/src/ws/driverWs.ts` |
| 司机上传文件 | `server/uploads/`（运行时目录，**不应提交到 git**） |
| 官网首页 | `mody-website/index.html` |
| 官网推广合作 | `mody-website/promo.html` |
| 官网联系页 | `mody-website/contact.html` |
| 官网下载落地页 | `mody-website/download-android.html` |
| 官网关于我们 | `mody-website/about.html` |
| 官网隐私政策 | `mody-website/privacy.html` |
| 官网服务条款 | `mody-website/terms.html` |

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

## 7. 基础网络安全与合规（2026-02-27 / 持续演进）

- **域名接入**：`mody.中国` 及子域 `www` / `admin` / `api` 已解析到同一 ECS 公网 IP，ICP 与公安备案已通过（详见官网页脚链接）。
- **安全组收紧**：仅对公网开放 HTTP（80），SSH 入口限制为个人笔记本所在网络 IP 段，其余端口（如 3000）不对公网开放。
- **Nginx 加固**：在全局 `http {}` 中配置 `server_tokens off;`，隐藏版本号；官网已使用统一 4xx/5xx 错误页（404 → index.html，50x → 默认 50x.html）。
- **HTTPS 计划**：可按需为 `mody.中国` 及 `www/admin/api` 申请并配置证书，统一跳转到 HTTPS。
- **官网合规模块**：已补充「关于我们」「隐私政策」「服务条款」页面，App 个人中心亦有入口跳转官网对应页面。

---

## 8. 产品与体验阶段性成果（截至 2026-03-02）

> 便于后续 Agent 快速理解当前 App/官网/Server 的产品形态与近期改造成果。

- **账号与登录（阶段 1 已完成）**
  - 登录与注册统一为「手机号 + 密码」模式，短信验证码登录已移除；server 侧验证码逻辑保留备选但前端不再依赖。
  - 支持微信登录流程代码，但当前**微信登录入口在 App 内隐藏**（待微信审核通过后再开启）；隐藏通过配置/注释实现，不影响未来恢复。
  - 单 users 表：drivers 表已合并入 users，仅保留 users；司机字段（driver_status、is_available、证件/车辆等）均在 users，可为 NULL。driver_locations、driver_notifications 的 driver_id 指向 users.id。登录单 token（user.id），乘客/司机接口共用该 token，身份切换不重新登录；管理端司机列表/审核基于 users 的 driver_status。
  - 司机/乘客手机号字段合一：司机端必须绑定手机号才能营业；乘客端手机号可选绑定，均在个人中心可修改，并有前后端格式校验（不做短信验证）。

- **乘客与司机体验（阶段 2 已完成）**
  - 乘客端附近司机：支持「附近司机」列表与底部 CTA，默认司机可置顶；司机手机号在 UI 层做脱敏展示（如 138****5678），拨号仍使用真实号码并在拨号前调用 `contactDriver` 接口通知司机。
  - 乘客端「最近联系」：底部区域展示最近联系过的 1～3 个司机，数据来源为本地缓存或服务端记录，便于复用常用司机。
  - 空状态与加载：附近司机为空时展示友好的空状态文案与按钮（如“暂无附近司机，换个位置试试 / 重新定位”），加载中有明确的 loading 提示，避免白屏。
  - 司机端营业/休息：点击营业/休息后有即时按钮状态与 toast 提示（如“已开启营业 / 已休息”）；未绑定手机号时，toast 明确提示「请先绑定手机号」，并引导跳转个人中心绑定。
  - 身份切换记忆：乘客↔司机切换身份时，分别记住各自上次停留的 tab（home/messages/profile），冷启动时也会按身份恢复上次 tab（乘客身份不会落在 messages）。

- **商业与数据（阶段 3 已完成）**
  - 推广合作：mody-app 个人中心增加「推广合作」入口，跳转官网 `promo.html`，与官网推广规则保持一致。
  - 司机邀请占位：司机端个人中心有「邀请司机」入口，文案为占位说明（后续可接入真实邀请码/分成逻辑）。
  - 埋点与事件：`mody-app/src/utils/analytics.ts` 提供统一埋点入口，对登录成功、切换身份、司机营业/休息、乘客联系司机、绑定/修改手机号等关键行为进行记录或预留上报（具体上报方式视环境配置）。
  - 关于/协议/隐私：App 个人中心增加「关于我们」「隐私政策」「服务条款」入口，统一跳转到官网对应静态页（about/privacy/terms）。

- **UI 与交互打磨（阶段 4 已完成）**
  - 首次使用引导：司机端已接入 DriverTutorial，小步讲解「如何营业」「定位与接单」；乘客端有 PassengerTutorial 说明如何选点、查看附近司机与联系司机（引导仅首轮出现，可跳过，完结后不再打扰）。
  - 关键操作二次确认：修改手机号在保存前有确认弹窗（如「确定将手机号改为 XXX？」）；如存在注销账号入口，同样有二次确认。
  - 表单校验时机：手机号等核心表单在失焦或点击「保存」时校验，错误文案具体（如「请输入正确的 11 位手机号」），避免实时校验干扰输入。
  - 司机卡片与拨号：乘客端司机卡片信息层级清晰（姓名为主、距离与车型为次、脱敏手机号辅助），拨号按钮样式统一且足够醒目。
  - 字号与无障碍：关键页面（登录、个人中心、司机首页、乘客首页）已统一使用 `FontScaleContext` 与 `scaledFontSize`，避免 NaN 与多余卡顿。

- **司机认证与图片上传**
  - 司机个人信息认证不再要求手动填写图片 URL，改为点击组件选择「拍照」或「从相册选择」，使用 `react-native-image-picker` 获取本地图片并上传到 server，server 返回 URL 存入 users 表对应字段。
  - 认证字段包括身份证正反面、车牌照片等，提交时仅传 URL，前端展示缩略图，后端控制访问与展示场景（仅司机本人与审核界面可见）。

- **官网与合规**
  - 官网首页 `index.html`：已商业化改版（强调产品价值与短途出行场景，去除“个人作品”等业余表述），包含产品介绍、软件下载（二维码）、推广合作与联系入口。
  - 推广合作页 `promo.html`：说明区域/渠道合作模式与用户推荐奖励规则，并提供联系二维码/入口。
  - 联系页 `contact.html`：提供在线表单与微信二维码，用于商务合作、问题反馈与用户服务。
  - 法律与隐私：已新增 `about.html`（关于我们）、`privacy.html`（隐私政策）、`terms.html`（服务条款），App 侧入口与官网页脚均指向这些页面。

---

## 9. 新 Agent 使用本文件

- 优先读 **README.md** 与本文件，再按需看 `modi-progress.html`、`docs/deploy-server.md`。
- 改 C 端请求：保留 `api.ts` 中 BlobUtil 的 `default ?? module` 取用；改 API 基址注意 `apiBaseUrl.js` 与 `dev-lan`/`pre`；特性开关与官网跳转优先通过 `config/features.ts`、`config/website.ts` 控制。
- 改 server：勿恢复 4xx 的 `Connection: close`；表结构由 `sequelize.sync({ alter: true })` 在启动时同步，模型加字段后部署重启即可；上传目录 `server/uploads/` 为运行时目录，不应提交到 git。
- **账号模型**：仅 **users** 表，无 drivers 表/Driver 模型；driver_id 即 user.id（拥有司机身份的用户）；勿恢复 drivers 表或双 token 登录逻辑。
- 改官网：保持 index/contact/promo/about/privacy/terms 之间的导航与页脚链接一致，所有链接使用相对路径，方便静态部署。

---

## 10. mody-app 页面与样式约定（避免 NaN 与卡顿）

新增或修改 RN 页面时，请与 **ProfileScreen**、**DriverHomeScreen**、**PassengerHomeScreen**、**FeedbackScreen** 等保持一致，避免以下两类问题：

| 问题 | 原因 | 约定 |
|------|------|------|
| **fontSize 报 NaN、Render Error** | `scaledFontSize(baseSize, fontScale)` 的第二个参数必须是**数字**（缩放倍数），传成 `fontScaleLevel` 字符串会得到 `NaN`。 | 只传数字：用 `FONT_SCALE_VALUES[fontScaleLevel]` 或 `useFontScale().fontScale` 得到数字后再传给 `scaledFontSize`；或在 `createStyles` 内先 `const fontScale = FONT_SCALE_VALUES[fontScaleLevel] ?? 1`，再对所有字号使用 `scaledFontSize(size, fontScale)`。 |
| **切换选项/类型时页面卡顿** | 每次 setState 触发重渲染时若执行 `StyleSheet.create` / `createStyles`，会加重 JS–Native 桥接与样式注册，造成明显卡顿。 | 样式要么**在模块顶层预创建并缓存**（如对 small/standard/large 各调一次 `createStyles` 存进 `STYLES_CACHE`，组件内按 `fontScaleLevel` 取用），要么 `useMemo(() => createStyles(...), [fontScaleLevel])` 且**依赖里不要包含会随每次点击/输入变化的 state**。交互时只做「取缓存 + 条件组合样式」，不在高频 state 变化路径里创建样式。 |

**参考实现**：`mody-app/src/screens/FeedbackScreen.tsx`（模块级 `STYLES_CACHE` + `createStyles(fontScaleLevel)` 预创建三种字号）、`DriverHomeScreen`、`PassengerHomeScreen`。


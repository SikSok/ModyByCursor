# 乘客首页地图与附近司机 · 产品分析与 Agent 执行提示词

> 本文档分为两部分：**一、产品经理对你想法的分析与完善**；**二、给 Agent 的完整执行提示词**（可直接复制给 Cursor/Agent 执行）。

---

## 一、产品分析：你的想法与完善建议

### 1. 你的想法回顾

- 乘客首页**大部分视图直接显示地图**，地图上展示**附近司机**。
- **点击某个司机** → 弹窗 → **直接打电话**。
- 附近没有司机时，先用**假数据**看效果。
- 你记得**已引入高德地图并申请了 Key**，希望把地图做出来。

### 2. 分析与完善（参考滴滴等打车 App）

| 你的点 | 分析 | 完善建议 |
|--------|------|----------|
| 首页大部分是地图 | 符合打车类 App 的「地图即首页」心智，乘客第一眼看到的是「我在哪、车在哪」。 | **采纳**。建议布局：地图占满首屏（或除顶部状态/标题外全屏），可适当在底部或侧边留一小块操作区（如「我的位置」按钮、比例尺），不喧宾夺主。 |
| 地图上显示附近司机 | 与需求文档「附近司机列表与 Marker（分色）」一致。 | **采纳**。补充：① 优先使用**用户当前定位**作为查询中心（需申请定位权限）；② 若无定位或定位失败，可用默认中心（如上海 31.23, 121.47）并提示「未获取到定位，显示默认区域」；③ 司机用 **Marker** 展示，可区分「可接客」等状态（颜色/图标）；④ 附近无司机时用**假数据**（若干固定坐标的模拟司机）保证地图上始终有 Marker 可点，便于联调与演示。 |
| 点击司机 → 弹窗 → 打电话 | 流程清晰，和滴滴「点车手→信息卡→打电话」一致。 | **采纳**。补充：① 弹窗（建议底部抽屉或居中卡片）展示司机**姓名、距离、车牌（若有）、一键拨号**；② 拨号使用系统能力（如 `Linking.openURL('tel:' + phone)`），无需登录也可拨打；③ 若后端未返回司机手机号（隐私考虑），弹窗仍可展示姓名与距离，拨号按钮可隐藏或改为「联系司机」占位，当前若接口有 phone 则直接展示拨号。 |
| 附近没司机用假数据 | 便于开发与演示，避免「空白地图」体验。 | **采纳**。约定：当 `GET /users/nearby-drivers` 返回空数组时，前端**注入 2～5 个模拟司机**（固定经纬度，如围绕默认中心散开），数据结构与接口一致（含 driver.id/name/phone、location.latitude/longitude、distance_km），这样地图始终有 Marker，点击逻辑也可跑通。 |
| 高德地图、已申请 Key | 需求文档与进度表均提到「高德地图与当前定位」。 | **采纳**。若仓库内尚未集成高德，Agent 需：① 在 mody-app 中集成高德 React Native 地图 SDK（如 `react-native-amap3d` 或高德官方 RN 方案）；② 在 Android/iOS 中配置 Key（Android: AndroidManifest + build.gradle；iOS: AppDelegate + Info.plist）；③ Key 从环境变量或配置文件读取，不提交密钥到仓库（可提交示例配置如 `apiKey: 'YOUR_AMAP_KEY'`）。若你已在一处配置过 Key，Agent 应复用该配置并保证地图能正常显示。 |

### 3. 状态与流程小结

- **首屏**：地图全屏（或接近全屏），中心为用户位置或默认中心；地图上展示附近司机 Marker（真实接口 + 无数据时假数据）。
- **定位**：进入页面请求定位权限，拿到后以用户坐标为圆心请求附近司机并移动地图视角；定位失败时用默认中心并可选 Toast 提示。
- **点击 Marker**：弹出司机信息卡（姓名、距离、车牌等），提供「拨打电话」按钮；若接口带 phone 则 `tel:` 拨号。
- **假数据**：仅当接口返回空列表时注入，数据结构与真实接口一致，便于后续去掉假数据无缝切换。

---

## 二、给 Agent 的完整执行提示词（可直接复制）

请将下面整段复制给 Cursor/Agent，作为单一任务说明执行。

---

```markdown
你正在开发「摩迪」项目的 **mody-app**（React Native）与 **server**（Node/Express）。请实现**乘客端首页：以地图为主视图，展示附近司机 Marker，点击司机弹窗并支持一键拨打电话**。实现时请严格参照仓库现有约定（见 **z-agent-context.md**、**modi-requirements.html**），不破坏已有登录、司机端与 API 风格。

## 一、业务目标

1. **乘客首页以地图为主**  
   - 乘客首页（PassengerHomeScreen）**主要区域为地图**，地图占满或接近占满首屏（除顶部标题栏外）。  
   - 地图中心优先为**用户当前定位**；若未获取到定位（权限拒绝或失败），则使用默认中心（如上海 31.23, 121.47），并可用 Toast 提示「未获取到定位，显示默认区域」。

2. **地图上展示附近司机**  
   - 使用**高德地图**（若项目已配置过高德 Key，则复用现有配置；否则在 mody-app 中集成高德 React Native 地图 SDK 并配置 Key，Key 通过配置文件或环境变量读取，不提交真实密钥）。  
   - 进入页面后：若有用户定位则以其坐标为圆心，若无则以默认中心为圆心，调用现有接口 `GET /api/users/nearby-drivers?lat=xx&lng=xx&radius_km=10` 获取附近司机。  
   - 接口返回的每个司机在其 `location.latitude/longitude` 位置绘制 **Marker**（可区分状态，如可接客用一种颜色/图标）。  
   - **若接口返回空数组**：前端注入 **2～5 个模拟司机**（固定经纬度，数据结构与接口一致：`{ driver: { id, name, phone, ... }, location: { latitude, longitude }, distance_km }`），使地图上始终有 Marker 可点，便于演示与联调。

3. **点击司机 → 弹窗 → 拨打电话**  
   - 点击某个司机 Marker 后，弹出**司机信息弹窗**（底部抽屉或居中卡片均可）：展示司机**姓名、距离**（如「约 x.x km」）、若有则展示车牌/车型，以及**「拨打电话」按钮**。  
   - 若接口返回了司机 `phone`，则点击按钮调用 `Linking.openURL('tel:' + phone)` 调起系统拨号；若接口未返回 phone，则弹窗仍展示姓名与距离，拨号按钮可隐藏或置灰并提示「暂无法拨号」。  
   - 弹窗可关闭，关闭后可再次点击其他 Marker。

4. **不破坏现有能力**  
   - 保留现有乘客首页的入口与 Tab 结构（首页 / 个人中心）；仅重构**乘客首页内容**为「地图 + Marker + 弹窗 + 拨号」。  
   - 接口仍使用现有 `getNearbyDrivers`（或封装为同一接口），请求层遵守 **z-agent-context.md** 约定（如 api.ts 使用 react-native-blob-util、真机 apiBaseUrl 等）。  
   - 错误提示沿用全局 Toast，不增加固定报错区域或日志块。

## 二、实现要点（按模块）

### 2.1 前端（mody-app）

- **地图与 Key**  
  - 在 mody-app 中集成高德地图 React Native SDK（如 **react-native-amap3d** 或高德官方推荐 RN 方案）。  
  - Android：在 `AndroidManifest.xml` 与 `build.gradle` 中配置高德 Key；iOS：在 `AppDelegate` 与 `Info.plist` 中配置。Key 建议从 `src/config/amapKey.js` 或环境变量读取，示例写法 `export const AMAP_KEY = process.env.AMAP_KEY || 'YOUR_AMAP_KEY'`，不提交真实 Key。  
  - 若仓库中已存在高德相关配置或 Key 占位，请复用并保证地图能正常显示。

- **定位**  
  - 进入乘客首页时请求定位权限（如使用 `react-native-geolocation` 或高德定位 API），获取到坐标后作为地图中心并作为 `getNearbyDrivers` 的 lat/lng。  
  - 定位失败或未授权时，使用默认中心（如 31.23, 121.47），并可选 Toast「未获取到定位，显示默认区域」。

- **PassengerHomeScreen 布局**  
  - 顶部可为标题栏（与现有 RoleHeader 一致），下方为**全屏地图**。  
  - 地图上根据「附近司机列表」绘制 Marker；列表来源：先调 `getNearbyDrivers`，若返回空数组则使用本地生成的 2～5 个模拟司机（含 id、name、phone、latitude、longitude、distance_km），数据结构与接口一致。

- **Marker 与弹窗**  
  - 每个司机一个 Marker，点击 Marker 时打开司机信息弹窗（Modal 或 BottomSheet），展示姓名、距离、车牌（若有）、「拨打电话」按钮。  
  - 拨号：若存在 `driver.phone`，则 `Linking.openURL('tel:' + driver.phone)`；否则不展示或禁用拨号按钮。

- **API 与错误**  
  - 继续使用 `getNearbyDrivers(lat, lng, radius_km)`，若当前项目用 fetch 实现且存在 4xx 收不到 body 的问题，可改为通过现有 `api.ts` 的 request 封装（react-native-blob-util）发起请求。  
  - 接口报错用全局 Toast 提示，不新增固定错误条或日志区域。

### 2.2 后端（server）

- **无需修改**  
  - 现有 `GET /api/users/nearby-drivers` 已支持按 lat/lng/radius_km 返回附近司机及距离，且含 driver 信息（含 phone 若表中有）。本次仅前端改造，后端保持不变即可。

### 2.3 数据与配置

- **假数据**  
  - 仅前端使用：当 `getNearbyDrivers` 返回空数组时，生成 2～5 条模拟数据，字段与接口一致（driver.id/name/phone、location.latitude/longitude、distance_km），坐标可围绕默认中心散开（如 31.23±0.02, 121.47±0.02），避免 Marker 重叠。

## 三、验收标准

- 乘客首页以地图为主视图，地图占满（或接近占满）首屏。  
- 地图中心为用户定位或默认中心；能调通 `getNearbyDrivers` 并在地图上展示司机 Marker。  
- 附近无司机时，地图上显示 2～5 个模拟司机 Marker，点击可弹窗。  
- 点击某司机 Marker 后弹出司机信息（姓名、距离、拨号按钮），点击拨号可调起系统拨号盘（当接口返回 phone 时）。  
- 不破坏现有登录、司机端、个人中心、z-agent-context 中的技术约定（如 api.ts、apiBaseUrl、真机 dev-lan）。
```

---

## 三、使用说明

- **给你自己 / 产品**：看「一、产品分析」即可理解想法如何被采纳与完善。  
- **给 Agent**：只复制「二、给 Agent 的完整执行提示词」中从「你正在开发「摩迪」…」到「…不破坏现有登录、司机端…」的整段内容，粘贴到 Cursor 或其它 Agent 对话中执行；必要时可补充一句：「请先阅读项目根目录 z-agent-context.md 和 modi-requirements.html 再开始实现。」  
- **高德 Key**：若 Key 尚未配置，Agent 会使用占位符或环境变量；你只需在本地或 CI 中配置真实 Key 即可。

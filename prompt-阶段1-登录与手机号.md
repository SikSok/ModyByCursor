# 阶段 1 提示词：登录与手机号

> 本文件为**独立可执行**的提示词工程，交给另一个 Agent 时只需说明：「请先阅读项目根目录 `z-agent-context.md`，再按本文件中的『给 Agent 的完整提示词』执行，且**仅做阶段 1**，不要做阶段 2/3/4。」

---

## 一、范围与边界

- **本阶段（阶段 1）**：移除短信认证，改为密码+微信登录；司机必绑手机才能营业；个人信息页支持绑定/修改手机（格式校验）；微信首次登录自动写昵称/头像。
- **明确不做的（留给后续阶段）**：
  - 阶段 2：司机手机号脱敏、营业/休息 toast、「最近联系」、空状态与加载、身份切换记住页面等。
  - 阶段 3：推广入口、邀请司机、埋点、关于/协议/隐私链接。
  - 阶段 4：首次引导、修改手机号二次确认、表单校验时机与司机卡片层级等 UI 打磨。

---

## 二、给 Agent 的完整提示词（复制整段使用）

```text
请先阅读项目根目录下的 z-agent-context.md，了解账号模型（单 users 表、driver_id 即 user.id）、C 端请求约定（api.ts 中 BlobUtil 的 default 取用）、以及 mody-app 页面与样式约定（第 10 节）。

然后**仅**完成以下「阶段 1：登录与手机号」任务，不要实现脱敏、推广、埋点、首次引导、二次确认等后续阶段内容。

---

1. 移除短信认证

- 前端（mody-app）：
  - 登录/注册页（LoginScreen.tsx）：删除「获取验证码」「验证码」输入框及 sendCode 调用；删除「忘记密码？通过验证码重置」弹窗及相关 state（showForgotPassword、resetPhone、resetCode、resetNewPassword、onSendResetCode、onResetPassword 等）。
  - 注册流程：乘客注册仅需手机号+密码（+ 可选昵称）；司机注册仅需手机号+密码+姓名（+ 可选其他资料），**不再需要验证码**。登录仅需手机号+密码。
  - 若存在 HomeScreen 等其它页面的验证码/发码逻辑，一并移除。
  - api.ts：移除或不再导出 sendCode；移除 resetPassword 的调用处；userRegister、driverRegister 的请求体去掉 code 字段。
- 后端（server）：
  - 注册接口不再校验验证码：userController.register、driverController.register 中去掉对 verificationCodeService.verifyCode 的调用；参数中去掉 code。
  - authController.resetPassword：可保留接口但前端不提供入口，或暂时移除/注释路由；若保留，文档注明「仅备用，当前无前端入口」。
  - 可选：verificationCodeController、verificationCodeService、smsService、VerificationCode 模型等可保留不删（便于以后恢复短信），但本阶段登录/注册流程不再依赖它们。

2. 密码登录与注册

- 保持或统一为「手机号 + 密码」登录。现有 auth 统一登录（/auth/login）或 users/login、drivers/login 二选一或并存均可，保证：
  - 登录成功返回 token 与用户信息（含 id、phone、name、avatar、hasDriver、driverStatus、isAvailable 等）。
  - 注册：乘客 POST /users/register  Body: { phone, password, name? }；司机 POST /drivers/register  Body: { phone, password, name, ... }，**无 code**。
  - 密码：后端用 bcrypt 等哈希存储；长度/复杂度校验按现有或约定（如至少 6 位）。
- 若当前 User 模型 phone 为 NOT NULL：为支持后续「微信登录无手机号」，将 users 表 phone 改为允许为空（allowNull: true），并同步 User 模型；迁移时注意既有数据可保留原 phone。

3. 微信登录

- 集成微信开放平台「移动应用」登录（如 react-native-wechat-lib 或项目现有方案）。登录成功后获得 openid、unionid、昵称(nickname)、头像(headimgurl)。
- 后端：提供「微信登录」接口（如 POST /auth/wechat-login），Body: { code 或 access_token + openid/unionid, nickname?, avatar? }。逻辑：
  - 根据 unionid（或 openid）查 users 表是否已有记录（需 users 表有 wechat_unionid/wechat_openid 字段，若无则新增并 migrate）。
  - 若已存在：更新该用户的 nickname、avatar（若传了），返回 token 与用户信息（同密码登录返回结构）。
  - 若不存在：创建新用户，phone、password_hash 可为空或占位（若 password_hash 当前 NOT NULL，则写入随机哈希或固定占位），name/avatar 用微信返回的 nickname/headimgurl，wechat_unionid/wechat_openid 写入；然后返回 token 与用户信息。
- 前端：登录页增加「微信登录」按钮，调起微信授权后拿 code 或 token 调后端 /auth/wechat-login，成功后与密码登录一样写入 token 并 onSuccess。
- 约定：微信登录**不**向微信索取手机号（App 端无此能力）；司机若仅用微信登录且未绑手机，则不能在「营业」中开启营业（见下）。

4. 司机必绑手机才能营业

- 后端：在司机「开启营业」接口（如 PATCH /drivers/availability 或 updateAvailability）中，当 is_available === true 时，先查当前用户的 phone 是否已绑定（非空且符合国内手机号格式）。若未绑定，返回 4xx，code 如 'NO_PHONE'，message 如「请先绑定手机号」。
- 前端：司机端在点击「营业」时，先检查当前用户是否已绑定手机号（可从 getDriverProfile/getUserProfile 的 phone 判断）。若未绑定，不调用 setAvailability(true)，而是提示「请先绑定手机号」并跳转到个人信息页（或弹窗引导去绑定），不执行开启营业。

5. 手机号绑定与修改

- 后端：
  - users 表已有 phone 字段；若改为 allowNull: true，则支持「先无手机号、后绑定」。
  - 个人资料更新接口（PUT /users/profile 与 PUT /drivers/profile）：允许传入 phone。服务端对 phone 做**国内手机号格式校验**（如 /^1\d{10}$/），不通过则 400；不发送短信。若项目统一用 users 表，则 driver 的 profile 更新可委托或同时更新 users.phone。
  - 乘客与司机共用同一 users 记录，故**一个 phone 字段**，换身份后看到的手机号一致。
- 前端：
  - **个人信息页**（ProfileScreen 或当前展示个人资料的页面）：乘客与司机均展示「手机号」一项；若已绑定则显示号码，若未绑定则显示「未绑定」或「绑定手机号」。提供「绑定手机号」或「修改手机号」入口，点击后弹窗或进入子页，输入手机号并调 PUT /users/profile（或 /drivers/profile，若后端约定用该接口更新 phone）传 { phone }。前端在失焦或点击保存时做格式校验，错误提示如「请输入正确的 11 位手机号」。
  - 司机端：未绑手机时，从个人信息页或营业按钮引导处进入绑定；绑定成功后即可营业。

6. 微信首次登录后展示昵称与头像

- 微信登录成功写入的 nickname、avatar，应在个人中心展示。若当前个人中心只读司机 profile，需保证乘客身份也能读到同一用户的 name/avatar（来自 users 表）；若后端 getProfile 已返回 name、avatar，前端直接展示即可。

---

验收标准（阶段 1）

- 登录/注册页无验证码输入与「获取验证码」按钮，无「忘记密码」通过验证码重置的弹窗。
- 乘客可仅用手机号+密码注册和登录；司机可仅用手机号+密码+姓名注册和登录。
- 司机未绑定手机号时点击「营业」会提示「请先绑定手机号」并引导到个人信息/绑定手机，且后端不会将 is_available 设为 true。
- 个人信息页（乘客与司机）可查看并「绑定/修改手机号」，格式错误有明确提示；修改后换身份仍为同一号码。
- 微信登录可用，首次微信登录后个人中心展示昵称与头像；仅微信登录的司机未绑手机时无法开启营业。
- 未实现：脱敏、最近联系、推广入口、埋点、首次引导、修改手机号二次确认等（留阶段 2/3/4）。
```

---

## 三、关键文件与接口索引（供 Agent 对照）

| 端 | 文件/位置 | 说明 |
|----|-----------|------|
| mody-app | `src/screens/LoginScreen.tsx` | 登录/注册 UI，移除验证码与忘记密码弹窗，增加微信登录入口 |
| mody-app | `src/services/api.ts` | sendCode、resetPassword、userRegister、driverRegister、unifiedLogin/userLogin/driverLogin、getUserProfile、updateUserProfile、getDriverProfile、updateDriverProfile、setAvailability |
| mody-app | `src/screens/ProfileScreen.tsx` | 个人信息页，增加手机号展示与「绑定/修改手机号」入口（乘客与司机共用同一用户，可统一调 users profile 接口） |
| mody-app | `src/screens/DriverHomeScreen.tsx` | 营业按钮点击前检查是否已绑手机，未绑则提示并跳转个人中心 |
| server | `src/controllers/authController.ts` | 登录；resetPassword 可保留但不暴露给前端 |
| server | `src/controllers/userController.ts` | register（去掉 code 与 verifyCode）、login、getProfile、updateProfile（支持 phone，格式校验） |
| server | `src/controllers/driverController.ts` | register（去掉 code 与 verifyCode）、login、updateAvailability（is_available=true 时校验 phone）、getProfile、updateProfile（支持 phone） |
| server | `src/services/userService.ts` | register(phone, password, name?)；login |
| server | `src/services/driverService.ts` | register、login、updateAvailability（在设为 true 前校验 user.phone） |
| server | `src/models/User.ts` | 如需支持微信无手机号登录，phone 改为 allowNull: true；新增 wechat_unionid/wechat_openid、或复用现有字段 |
| server | `src/routes/authRoutes.ts` | 可选新增 POST /wechat-login |
| server | `src/routes/index.ts` | 挂载 /auth 等 |

---

## 四、执行与验收建议

1. Agent 先读 `z-agent-context.md`，再按「二、给 Agent 的完整提示词」逐条实现。
2. 每完成一大项（如移除短信、密码登录注册、微信登录、司机营业校验、个人信息手机号）可自测一遍，再继续下一项。
3. 验收时按「验收标准」逐条检查；若有遗漏（如某处仍引用 sendCode 或 code 参数），补全即可。
4. 本阶段不修改与脱敏、推广、埋点、引导、二次确认相关的逻辑与 UI。

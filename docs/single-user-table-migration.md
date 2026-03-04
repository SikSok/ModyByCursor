# 单用户表重构（drivers 合并入 users）— 执行说明

## 一、执行顺序

1. **备份数据库**（必做）
   - 备份 `users`、`drivers`、`driver_locations`、`driver_notifications` 表或整库。

2. **部署含 User 司机字段的代码**
   - 已为 `users` 表增加字段：`driver_status`、`is_available`、`id_card`、`id_card_front`、`id_card_back`、`license_plate`、`license_plate_photo`、`vehicle_type`、`last_location_id`（均可为 NULL）。
   - 启动服务后 Sequelize `sync({ alter: true })` 会自动为 `users` 加列。

3. **执行数据迁移**
   - 在 `server` 目录下执行：
   - `npm run migrate-drivers-to-users`
   - 或：`npx ts-node scripts/migrate-drivers-to-users.ts`
   - 脚本会：删除指向 `drivers` 的外键 → 按手机号将 `drivers` 合并入 `users` → 更新 `driver_locations`、`driver_notifications` 的 `driver_id` → 校验 → 删除 `drivers` 表。
   - 若 `drivers` 表已不存在，脚本会直接退出并提示「无需迁移」。

4. **验证**
   - 登录、附近司机、联系司机、司机上报位置、管理端司机列表与审核、WebSocket 推送等按「单 token、driver_id = user.id」做一次回归。

## 二、行为变更摘要

- **登录**：仅查 `users`，返回一个 token（payload 为 `user.id`），以及 `hasDriver`、`driverStatus`、`isAvailable`。
- **司机注册**：同手机号仅更新该用户的司机字段；新用户则先建 `users` 再写司机字段；返回格式与登录一致。
- **密码重置**：仅更新 `users.password_hash`。
- **司机相关接口**：鉴权后要求该用户 `driver_status` 非 NULL（`requireDriver` 中间件）；`req.user.id` 即 `driver_id`。
- **WebSocket**：连接时接受 role 为 `user` 或 `driver` 的 token，用 `user.id` 作为司机连接 key，并校验该用户 `driver_status` 非 NULL。

## 三、前端（mody-app）

- 单 token 存储（`@mody_token`）；旧版双 token 在首次加载时会合并为单 token 并清理旧 key。
- 身份切换仅切换 `currentIdentity`，不重新登录；乘客/司机接口均带同一 token。
- 登录/注册返回的 `hasDriver`、`driverStatus`、`isAvailable` 用于展示「切换司机身份」入口及审核状态。

## 四、回滚

- 若在删除 `drivers` 表之前迁移失败，事务会回滚。
- 若已删表需回滚，只能用备份恢复数据库后再重新执行迁移或人工处理。

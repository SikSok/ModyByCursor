# 摩迪服务端项目

基于 Express + TypeScript 构建的服务端项目，包含用户、司机、管理端的基础模块。

## 技术栈

- **框架**: Express.js
- **语言**: TypeScript
- **数据库**: MySQL
- **ORM**: Sequelize
- **认证**: JWT
- **其他**: CORS, bcryptjs, nodemon

## 项目结构

```
server/
├── src/
│   ├── config/          # 配置文件
│   │   ├── database.ts  # 数据库配置
│   │   └── jwt.ts       # JWT 配置
│   ├── controllers/    # 控制器层
│   │   ├── userController.ts
│   │   ├── driverController.ts
│   │   └── adminController.ts
│   ├── middleware/      # 中间件
│   │   ├── auth.ts      # JWT 认证
│   │   ├── cors.ts      # CORS 配置
│   │   └── errorHandler.ts
│   ├── models/          # 数据模型
│   │   ├── User.ts
│   │   ├── Driver.ts
│   │   └── Admin.ts
│   ├── routes/          # 路由
│   │   ├── userRoutes.ts
│   │   ├── driverRoutes.ts
│   │   ├── adminRoutes.ts
│   │   └── index.ts
│   ├── services/        # 业务逻辑层
│   │   ├── userService.ts
│   │   ├── driverService.ts
│   │   └── adminService.ts
│   ├── utils/           # 工具函数
│   │   ├── jwt.ts
│   │   └── response.ts
│   └── index.ts         # 应用入口
├── .env                 # 环境变量（需要创建）
├── .gitignore
├── nodemon.json         # nodemon 配置
├── package.json
├── tsconfig.json        # TypeScript 配置
└── README.md
```

## 安装和运行

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

创建 `.env` 文件（可复制 `.env.example` 后修改），配置 MySQL 连接信息：

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mody_db
DB_USER=root
DB_PASSWORD=your_password
CORS_ORIGIN=http://localhost:3000
```

若用 Docker 跑 MySQL，可先启动容器：

```bash
docker run -d --name mody-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=123456 -e MYSQL_DATABASE=mody_db mysql:8
```

再将 `DB_PASSWORD` 设为 `123456` 即可。

### 3. 创建数据库

在 MySQL 中执行（Sequelize 不会自动建库）：

```sql
CREATE DATABASE mody_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. 运行项目

开发模式（热更新）：
```bash
npm run dev
```

生产模式：
```bash
npm run build
npm start
```

## API 接口

### 用户模块 (`/api/users`)

- `POST /api/users/register` - 用户注册
- `POST /api/users/login` - 用户登录
- `GET /api/users/profile` - 获取用户信息（需认证）
- `PUT /api/users/profile` - 更新用户信息（需认证）

### 司机模块 (`/api/drivers`)

- `POST /api/drivers/register` - 司机注册
- `POST /api/drivers/login` - 司机登录
- `GET /api/drivers/profile` - 获取司机信息（需认证）
- `PUT /api/drivers/profile` - 更新司机信息（需认证）
- `PATCH /api/drivers/status` - 更新司机状态（需认证）

### 管理端模块 (`/api/admins`)

- `POST /api/admins/register` - 管理员注册
- `POST /api/admins/login` - 管理员登录
- `GET /api/admins/profile` - 获取管理员信息（需认证）
- `PUT /api/admins/profile` - 更新管理员信息（需认证）
- `GET /api/admins/all` - 获取所有管理员（需管理员权限）
- `GET /api/admins/users` - 用户列表查询（分页，可选 `?page=1&pageSize=20&phone=&status=`，需管理员权限）
- `GET /api/admins/stats` - 数据统计面板（用户数、司机数、待审核/已通过/已驳回司机数等，需管理员权限）
- `GET /api/admins/drivers/pending` - 待审核司机列表（需管理员权限）
- `PATCH /api/admins/drivers/:id/approve` - 司机审核通过（需管理员权限）
- `PATCH /api/admins/drivers/:id/reject` - 司机审核驳回（需管理员权限）

### 验证码 (`/api/verification-codes`)

- `POST /api/verification-codes/send` - 发送验证码（body: `{ "phone": "13800138000", "type": "register" | "login" }`）。配置阿里云短信后真实发送；未配置时仅落库，开发环境响应中会返回 `code` 便于联调。

### 健康检查

- `GET /api/health` - 服务健康检查

## 认证说明

大部分接口需要 JWT 认证，请求时在 Header 中添加：

```
Authorization: Bearer <token>
```

## 开发说明

- 项目使用 TypeScript 编写，类型安全
- 采用三层架构：Routes -> Controllers -> Services
- 使用 Sequelize ORM 进行数据库操作
- 密码使用 bcryptjs 加密存储
- 支持 nodemon 热更新开发

## 阿里云短信服务（验证码发送）

项目已集成阿里云短信 SDK，在「发送验证码」时会根据配置决定是否真实发短信。

- **未配置**：验证码仍会写入数据库，接口返回成功；开发环境下响应体中会带上 `code`，便于联调。
- **已配置**：调用阿里云接口向用户手机发送短信，模板变量为 `{"code":"123456"}`。

### 环境变量（可选）

在 `.env` 中增加（可从 `.env.example` 复制）：

```env
ALIYUN_ACCESS_KEY_ID=你的AccessKeyId
ALIYUN_ACCESS_KEY_SECRET=你的AccessKeySecret
ALIYUN_SMS_SIGN_NAME=你的短信签名
ALIYUN_SMS_TEMPLATE_CODE=你的模板Code（如 SMS_123456789）
```

### 阿里云短信申请与配置步骤（需您自行在官网完成）

1. **注册/登录阿里云**  
   打开 [阿里云官网](https://www.aliyun.com/) 注册或登录账号。

2. **开通短信服务**  
   - 控制台搜索「短信服务」或打开 [短信服务控制台](https://dysms.console.aliyun.com/)  
   - 选择「国内消息」或「国际消息」  
   - 按提示开通（需实名认证）。

3. **申请短信签名**  
   - 在控制台「国内消息」→「签名管理」→「添加签名」  
   - 填写签名名称（如「摩迪」）、适用场景（验证码等）、证明类型（App/网站等）并上传对应资质  
   - 提交后等待审核（通常几小时到 1 个工作日）。

4. **申请短信模板**  
   - 「模板管理」→「添加模板」  
   - 模板类型选「验证码」  
   - 模板内容填写包含变量占位符的文案，例如：`您的验证码为：${code}，5分钟内有效。`  
   - 提交审核，审核通过后得到 **模板 CODE**（如 `SMS_123456789`）。

5. **获取 AccessKey**  
   - 右上角头像 → AccessKey 管理（或 [RAM 控制台](https://ram.console.aliyun.com/manage/ak)）  
   - 创建 AccessKey，保存 **AccessKey ID** 和 **AccessKey Secret**（只显示一次，务必保管好）。

6. **充值/套餐**  
   - 短信按条计费，需账户有余额或购买套餐  
   - 在「费用中心」或短信控制台完成充值/购买。

7. **填入项目**  
   - 将签名名称、模板 CODE、AccessKey ID、AccessKey Secret 填入 `.env` 对应变量  
   - 重启服务后，发送验证码接口会真实调用阿里云发送短信。

更多说明见 [阿里云短信服务文档](https://help.aliyun.com/product/44282.html)。

## 注意事项

1. 生产环境请修改 `JWT_SECRET` 为强随机字符串
2. 数据库密码、AccessKey 等敏感信息不要提交到版本控制
3. 生产环境建议关闭数据库自动同步功能

## 接口访问日志（生产排查）

每次 API 请求会在控制台打印；**生产环境**下会同时写入日志文件，便于出问题时查 log 调试。

- **日志文件**：`logs/access.log`（可通过环境变量 `LOG_DIR` 指定目录，默认项目根下的 `logs/`）
- **格式**：每行一条 JSON（NDJSON），包含 `time`、`method`、`path`、`statusCode`、`durationMs`、`ip`，失败时含 `errorMessage`
- **环境**：`NODE_ENV=production` 时自动写入文件；开发环境如需写入可设 `LOG_REQUEST_TO_FILE=1`；若需关闭文件日志可设 `LOG_REQUEST_TO_FILE=0`

示例查看最近错误请求：

```bash
grep -E '"statusCode":[45][0-9]{2}' logs/access.log | tail -20
tail -10 logs/access.log
```

调试用：浏览器访问 `GET /api/debug/requests` 可查看最近 100 条请求（内存）。


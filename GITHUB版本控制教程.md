# ModyByCursor 项目 — GitHub 版本控制教程

## 一、两种常见做法

你可以选择：

- **方案 A**：整个项目一个仓库（推荐，简单好维护）
- **方案 B**：每个子项目一个仓库（admin-web、server、user-app 等分别一个 repo）

下面先写方案 A，再写方案 B。

---

## 二、方案 A：整个项目一个 GitHub 仓库

### 1. 安装 Git（若未安装）

- 下载：https://git-scm.com/download/win  
- 安装后，在 PowerShell 或 CMD 里执行：`git --version`，能输出版本号即可。

### 2. 在项目根目录初始化 Git

在 PowerShell 中执行：

```powershell
cd "d:\Program Files (x86)\ModyByCursor"
git init
```

### 3. 创建根目录 .gitignore

在项目根目录新建 `.gitignore`，避免把依赖、构建产物、环境配置等提交上去。例如：

```gitignore
# 依赖
node_modules/

# 构建产物
dist/
build/

# 环境与密钥（不要提交）
.env
.env.local
.env.*.local

# 日志与临时
*.log
.DS_Store
.vscode/
.idea/

# 其他
*.swp
*.swo
```

子目录里已有的 `.gitignore`（如 `server/.gitignore`、`admin-web/.gitignore`）会一起生效。

### 4. 在 GitHub 上创建新仓库

1. 登录 https://github.com  
2. 右上角 **“+”** → **New repository**  
3. 填写：
   - **Repository name**：如 `ModyByCursor`
   - **Description**：可选
   - **Public** 或 **Private** 任选
   - **不要**勾选 “Add a README file”（本地已有代码）
4. 点击 **Create repository**。

### 5. 关联远程并首次推送

在项目根目录执行（把 `你的用户名` 和 `ModyByCursor` 换成你的 GitHub 用户名和仓库名）：

```powershell
cd "d:\Program Files (x86)\ModyByCursor"

git add .
git commit -m "初始提交：完整项目结构"

git branch -M main
git remote add origin https://github.com/你的用户名/ModyByCursor.git
git push -u origin main
```

若使用 SSH：

```powershell
git remote add origin git@github.com:你的用户名/ModyByCursor.git
git push -u origin main
```

首次推送若提示登录，按 GitHub 提示用浏览器或 Personal Access Token 完成认证。

### 6. 日常使用

```powershell
# 查看状态
git status

# 暂存并提交
git add .
git commit -m "描述本次修改"

# 推送到 GitHub
git push
```

---

## 三、方案 B：每个子项目分别一个仓库

适合：子项目独立发布、不同团队维护、或需要单独做 CI/CD。

### 1. 为每个子项目单独建仓库

例如为 `server`、`admin-web`、`user-app` 各建一个 GitHub 仓库：

- `你的用户名/mody-server`
- `你的用户名/mody-admin-web`
- `你的用户名/mody-user-app`

### 2. 在每个子目录里初始化 Git

以 `server` 为例：

```powershell
cd "d:\Program Files (x86)\ModyByCursor\server"
git init
git add .
git commit -m "初始提交：server 项目"
git branch -M main
git remote add origin https://github.com/你的用户名/mody-server.git
git push -u origin main
```

对 `admin-web`、`user-app` 等重复同样步骤，只改目录和 `origin` 的 URL。

### 3. 注意点

- 每个子目录各自是独立 Git 仓库，根目录不再做 `git init`（若已做可删掉根目录的 `.git` 再在子目录分别初始化）。
- 根目录下的 `package.json`、`modi-*.html` 等若也要版本控制，可以单独建一个仓库（如 `ModyByCursor-docs`）或放到某一个子项目里。

---

## 四、GitHub 账号与认证

### 使用 HTTPS

- 推送时可能要求登录，按提示在浏览器中完成即可。
- 若启用两步验证，需使用 **Personal Access Token** 代替密码：  
  GitHub → **Settings** → **Developer settings** → **Personal access tokens** → 生成 token，推送时密码处填 token。

### 使用 SSH（推荐，一次配置长期使用）

1. 生成密钥（若还没有）：

   ```powershell
   ssh-keygen -t ed25519 -C "你的邮箱@example.com"
   ```

   一路回车即可（或自设路径/密码）。

2. 查看公钥并复制：

   ```powershell
   Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
   ```

3. 在 GitHub：**Settings** → **SSH and GPG keys** → **New SSH key**，粘贴公钥并保存。

4. 测试：

   ```powershell
   ssh -T git@github.com
   ```

   出现 “Hi 用户名! You've successfully authenticated...” 即表示成功。之后用 `git@github.com:用户名/仓库名.git` 作为 `origin` 即可。

---

## 五、常用命令速查

| 操作           | 命令 |
|----------------|------|
| 查看状态       | `git status` |
| 查看远程       | `git remote -v` |
| 拉取最新       | `git pull` |
| 暂存全部       | `git add .` |
| 提交           | `git commit -m "说明"` |
| 推送           | `git push` |
| 查看提交历史   | `git log --oneline` |

---

## 六、建议

- 若项目是同一产品的前后端+多端，优先用 **方案 A（一个仓库）**，简单且历史统一。
- 若确定要按服务/应用拆成多个仓库，再用 **方案 B**，并保证每个子目录都有合适的 `.gitignore`（你当前 `server`、`admin-web` 已有，其他子项目可参考复制一份）。

如果你告诉我选方案 A 还是 B，以及 GitHub 用户名和仓库名，我可以按你的选择写出你直接能复制执行的命令（不包含密码/token）。

# 后台管理站快速部署（与 Server / 官网同机、Gitee、Nginx）

> 与官网 `mody-website/docs/deploy-quick.md` 同风格：代码在 Gitee，ECS 已有 Nginx，**且需安装 Node 18+**，一次初始化后每次一条命令部署后台管理站。

---

## 前提

- 阿里云 ECS 已能 SSH 登录，**Nginx 已安装**。
- **Node 18+ 已安装**（admin-web 需在 ECS 上执行 `npm run build`）。未装可：`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash` 再 `nvm install 18`，或 `yum install nodejs` / `apt install nodejs`。
- 本仓库已推送到 **Gitee**（与 server / 官网部署用同一仓库，通常已在 `/opt/mody`）。
- 安全组已放行 **80**（HTTPS 则再放行 443）。
- 域名 **admin.mody.中国** 已在阿里云解析到 ECS 公网 IP（A 记录，主机记录 `admin`）。

---

## 一、在 ECS 上做一次「后台站初始化」

**只需做一次**（若已按 deploy-server 把仓库克隆到 `/opt/mody`，只需补 Nginx 配置和目录）。

### 1. 创建站点目录

```bash
sudo mkdir -p /var/www/admin-web
sudo chown -R nginx:nginx /var/www/admin-web
```

### 2. 添加 Nginx 站点配置（后台站单独域名）

**方式 A：单独配置文件（推荐）**

```bash
sudo vi /etc/nginx/conf.d/admin-web.conf
```

内容可直接用仓库里的示例（或从本机复制）：

```nginx
server {
    listen       80;
    server_name  admin.mody.中国;

    root         /var/www/admin-web;
    index        index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
    location ~* \.(ico|css|js|gif|jpe?g|png|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html { root /usr/share/nginx/html; }
}
```

或从仓库复制：

```bash
sudo cp /opt/mody/admin-web/docs/nginx-admin-web.conf /etc/nginx/conf.d/admin-web.conf
```

**方式 B：追加到现有 mody-website.conf 末尾**

若你希望官网和后台在同一文件里，可把上面 `server { ... }` 块追加到 `/etc/nginx/conf.d/mody-website.conf` 末尾。

### 3. 检查 Nginx 并重载

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 4. 给部署脚本执行权限

```bash
chmod +x /opt/mody/admin-web/scripts/deploy.sh
```

### 5. 执行第一次部署（拉代码、构建、同步到站点目录）

```bash
cd /opt/mody && bash admin-web/scripts/deploy.sh
```

完成后访问 `http://admin.mody.中国` 应能看到后台管理站。

---

## 二、以后每次部署（一键）

与官网一样，**本地一条命令**（把 IP 换成你的 ECS 公网 IP）：

```bash
ssh root@47.110.243.97 "cd /opt/mody && bash admin-web/scripts/deploy.sh"
```

或先 SSH 登录再执行：

```bash
ssh root@47.110.243.97
cd /opt/mody && bash admin-web/scripts/deploy.sh
```

脚本会：从 **Gitee**（若已配置）或 origin 拉取最新代码 → 在 `admin-web/` 下执行 `npm ci` 与 `npm run build` → 将 `admin-web/dist/` 同步到 `/var/www/admin-web` → 修正权限 → 重载 Nginx。

---

## 三、与官网 / Server 的关系

| 项目       | 仓库目录        | 部署脚本                    | 站点/进程        |
|------------|-----------------|-----------------------------|------------------|
| Server     | `/opt/mody`     | `server/scripts/deploy.sh`  | PM2 `mody-api`   |
| 官网       | 同上            | `mody-website/scripts/deploy.sh` | Nginx `/var/www/mody-website` |
| 后台管理站 | 同上            | `admin-web/scripts/deploy.sh`    | Nginx `/var/www/admin-web` |

同一仓库、同一 Gitee 远程；官网为静态直接同步，后台为 Vite 构建后同步 `dist/`。

---

## 四、可选：自定义站点目录

若不想用 `/var/www/admin-web`，可在执行前设置环境变量：

```bash
export DEPLOY_WEB_ROOT=/home/www/admin
ssh root@IP "cd /opt/mody && DEPLOY_WEB_ROOT=/home/www/admin bash admin-web/scripts/deploy.sh"
```

同时需把 Nginx 配置里的 `root` 改为同一路径。

---

## 五、常见问题

- **`node: command not found`**  
  ECS 未装 Node 或未加入 PATH，请安装 Node 18+（nvm / yum / apt）。

- **`npm run build` 报错**  
  检查 `admin-web` 下是否有 `package.json`、`package-lock.json`，以及网络能否拉取 npm 依赖；必要时在 ECS 配置 npm 镜像。

- **访问 admin.mody.中国 404**  
  确认 DNS 已添加 `admin` 的 A 记录指向 ECS IP；确认 Nginx 已加载 `admin-web.conf` 且 `nginx -t` 通过；确认已执行过一次 `admin-web/scripts/deploy.sh` 使 `/var/www/admin-web` 有内容。

---

## 六、文档与脚本位置

| 说明           | 位置 |
|----------------|------|
| 后台站快速部署 | `admin-web/docs/deploy-quick.md`（本文） |
| 后台站部署脚本 | `admin-web/scripts/deploy.sh`            |
| Nginx 配置示例 | `admin-web/docs/nginx-admin-web.conf`   |

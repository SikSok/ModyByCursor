# 官网快速部署（与 Server 同机、Gitee、Nginx）

> 与 `docs/deploy-server.md` 同风格：代码在 Gitee，ECS 已有 Nginx，一次初始化后每次一条命令部署官网。

---

## 前提（与 Server 一致）

- 阿里云 ECS 已能 SSH 登录，**Nginx 已安装**。
- 本仓库已推送到 **Gitee**（与 server 部署用同一仓库，通常已在 `/opt/mody`）。
- 安全组已放行 **80**（HTTPS 则再放行 443）。

---

## 一、在 ECS 上做一次「官网初始化」

**只需做一次**（若已按 deploy-server 把仓库克隆到 `/opt/mody`，只需补 Nginx 配置和目录）。

### 1. 创建站点目录

```bash
sudo mkdir -p /var/www/mody-website
sudo chown -R nginx:nginx /var/www/mody-website
```

### 2. 添加 Nginx 站点配置

```bash
sudo vim /etc/nginx/conf.d/mody-website.conf
```

内容可直接用仓库里的示例（root 指向 `/var/www/mody-website`）：

```nginx
server {
    listen       80;
    server_name  _;
    root         /var/www/mody-website;
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

或从本机复制仓库内示例：

```bash
# 在 ECS 上（仓库已在 /opt/mody）
sudo cp /opt/mody/mody-website/docs/nginx-mody-website.conf /etc/nginx/conf.d/mody-website.conf
# 若 default 占 80 端口，可先备份并禁用，避免 conflicting server name "_"
sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak
sudo nginx -t && sudo systemctl reload nginx
```

### 3. 给官网部署脚本执行权限

```bash
chmod +x /opt/mody/mody-website/scripts/deploy.sh
```

### 4. 执行第一次部署（拉代码并同步到站点目录）

```bash
cd /opt/mody && mody-website/scripts/deploy.sh
```

完成后访问 `http://你的ECS公网IP` 应能看到摩的官网。

---

## 二、以后每次部署（一键）

与 server 一样，**本地一条命令**（把 `root` 和 IP 换成你的）：

```bash
ssh root@你的ECS公网IP "cd /opt/mody && mody-website/scripts/deploy.sh"
```

或先 SSH 登录再执行：

```bash
ssh root@你的ECS公网IP
cd /opt/mody && mody-website/scripts/deploy.sh
```

脚本会：从 **Gitee**（若已配置）或 origin 拉取最新代码 → 将 `mody-website/` 同步到 `/var/www/mody-website`（排除 node_modules，有 rsync 用 rsync否则用 cp）→ 修正权限 → 重载 Nginx。

**若提示 `rsync: command not found`**：脚本已支持无 rsync 时用 `cp` 同步；也可安装 rsync：`sudo yum install -y rsync`（CentOS）或 `sudo apt install -y rsync`（Ubuntu）。

---

## 三、与 Server 部署的关系

| 项目       | 仓库目录        | 部署脚本                  | 站点/进程        |
|------------|-----------------|---------------------------|------------------|
| Server     | `/opt/mody`     | `server/scripts/deploy.sh` | PM2 `mody-api`   |
| 官网       | 同上            | `mody-website/scripts/deploy.sh` | Nginx `/var/www/mody-website` |

- 同一仓库、同一 Gitee 远程，拉取逻辑一致（有 gitee 则从 gitee 拉）。
- 可同机部署：先部署 server，再部署官网，或只跑官网脚本。

---

## 四、可选：自定义站点目录

若不想用 `/var/www/mody-website`，可在执行前设置环境变量：

```bash
export DEPLOY_WEB_ROOT=/home/www/mody
ssh root@IP "cd /opt/mody && DEPLOY_WEB_ROOT=/home/www/mody mody-website/scripts/deploy.sh"
```

同时需把 Nginx 配置里的 `root` 改为同一路径。

---

## 五、常见问题

**Nginx 报 `conflicting server name "_" on 0.0.0.0:80`**  
说明有另一个站点配置也在监听 80 且用了 `server_name _`。只保留官网站点时，可禁用默认站点：

```bash
sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak
sudo nginx -t && sudo systemctl reload nginx
```

若 80 端口还要给别的站用，请把其中一个配置的 `server_name` 改成具体域名或不同端口。

---

## 六、文档与脚本位置

| 说明           | 位置 |
|----------------|------|
| 官网快速部署   | `mody-website/docs/deploy-quick.md`（本文） |
| 官网详细方案   | `mody-website/docs/deploy-aliyun-ecs.md`    |
| 官网部署脚本   | `mody-website/scripts/deploy.sh`            |
| Nginx 配置示例 | `mody-website/docs/nginx-mody-website.conf`|
| Server 部署    | `docs/deploy-server.md`、`server/scripts/deploy.sh` |

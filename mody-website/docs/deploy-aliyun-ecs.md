# 摩迪官网部署到阿里云 ECS 方案

本文档说明如何将 `mody-website` 静态官网部署到阿里云 ECS（云服务器）。

**若你已按 Server 快速部署把仓库放到 Gitee、ECS 已有 Nginx**，可直接用 **官网快速部署**：见 [deploy-quick.md](deploy-quick.md)，一次初始化后执行 `mody-website/scripts/deploy.sh` 或本地 `ssh root@IP "cd /opt/mody && mody-website/scripts/deploy.sh"` 即可更新。

---

## 一、部署架构概览

- **网站类型**：纯静态（HTML/CSS/JS + 图片/SVG）
- **推荐方式**：ECS 上安装 **Nginx**，将网站目录配置为根目录即可
- **可选**：绑定域名、配置 HTTPS（推荐）

```
用户 → 域名/公网IP → ECS 安全组 80/443 → Nginx → /var/www/mody-website
```

---

## 二、前置准备

### 2.1 ECS 实例

- 已购买阿里云 ECS（推荐 **CentOS 7/8** 或 **Alibaba Cloud Linux**）。
- 记录 **公网 IP**。
- 若使用域名，需已完成 **域名备案** 并解析到该公网 IP（A 记录）。

### 2.2 安全组

在阿里云控制台为 ECS 开放端口：

| 端口 | 协议 | 说明     |
|------|------|----------|
| 22   | TCP  | SSH 登录 |
| 80   | TCP  | HTTP     |
| 443  | TCP  | HTTPS（可选） |

### 2.3 本地需要上传的内容

只上传网站文件，**不要**上传 `node_modules`。建议打包：

```powershell
# 在项目根目录（ModyByCursor）执行，排除 node_modules
cd d:\ModyByCursor\mody-website
# 若使用 tar（Git Bash / WSL）
tar --exclude=node_modules -cvf mody-website.tar .

# 或直接用压缩工具：选中 index.html、contact.html、promo.html、assets、scripts 等，打成 zip
```

---

## 三、服务器环境准备（以 CentOS 7 为例）

### 3.1 SSH 登录

```bash
ssh root@你的ECS公网IP
# 或 ssh your_user@你的ECS公网IP
```

### 3.2 安装 Nginx

```bash
# CentOS 7
sudo yum install -y nginx

# 启动并设置开机自启
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3.3 创建网站目录

```bash
sudo mkdir -p /var/www/mody-website
sudo chown -R nginx:nginx /var/www/mody-website
# 若你用其他用户上传，可改为 chown -R 你的用户:nginx /var/www/mody-website
```

---

## 四、上传网站文件到 ECS

任选一种方式。

### 方式 A：本机 SCP 上传（推荐）

在 **本机 PowerShell**（或 Git Bash）执行：

```powershell
cd d:\ModyByCursor\mody-website
scp -r index.html contact.html promo.html assets scripts root@你的ECS公网IP:/var/www/mody-website/
```

注意：不要传 `node_modules`，只传页面和资源。

### 方式 B：先打包再上传

```bash
# 本机打包（示例）
tar --exclude=node_modules -cvf mody-website.tar .
scp mody-website.tar root@你的ECS公网IP:/tmp/
```

在 **服务器** 上解压：

```bash
cd /var/www/mody-website
sudo tar -xvf /tmp/mody-website.tar
sudo chown -R nginx:nginx /var/www/mody-website
```

### 方式 C：Git 拉取（若代码在 Git 仓库）

```bash
sudo yum install -y git
cd /var/www
sudo git clone https://你的仓库地址.git mody-website
cd mody-website
# 若有 node_modules 依赖且不需要在服务器构建，可删除
sudo rm -rf node_modules
sudo chown -R nginx:nginx /var/www/mody-website
```

---

## 五、配置 Nginx

### 5.1 默认配置（仅 IP 访问）

新建站点配置：

```bash
sudo vim /etc/nginx/conf.d/mody-website.conf
```

写入以下内容（可根据需要改 `server_name`）：

```nginx
server {
    listen       80;
    server_name  _;   # 先用 _ 表示接受任意域名/IP，后续可改为你的域名
    root         /var/www/mody-website;
    index        index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存（可选）
    location ~* \.(ico|css|js|gif|jpe?g|png|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

若 Nginx 默认已有 `default.conf` 且会冲突，可先备份并禁用：

```bash
sudo mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak
```

检查配置并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

浏览器访问：`http://你的ECS公网IP`，应能看到摩迪官网首页。

### 5.2 使用域名

若已备案并解析域名（如 `www.example.com`）到 ECS 公网 IP，将上面配置中的：

```nginx
server_name  _;
```

改为：

```nginx
server_name  www.example.com example.com;
```

然后 `sudo nginx -t && sudo systemctl reload nginx`。

---

## 六、HTTPS（可选但推荐）

### 6.1 使用阿里云免费 SSL 证书

1. 在阿里云控制台申请 **免费 DV 证书**，绑定你的域名。
2. 证书签发后，下载 **Nginx** 格式（含 `.pem` 和 `.key`）。
3. 上传到 ECS，例如：
   - `/etc/nginx/ssl/your_domain.pem`
   - `/etc/nginx/ssl/your_domain.key`
4. 在 `/etc/nginx/conf.d/mody-website.conf` 中增加 443 并引用证书（见下）。

### 6.2 使用 Let's Encrypt（Certbot）

```bash
# CentOS 7 需先装 EPEL
sudo yum install -y epel-release
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d www.example.com -d example.com
```

按提示选择是否重定向 HTTP→HTTPS。证书会自动续期。

### 6.3 Nginx 中启用 443 示例

在 `mody-website.conf` 中保留原有 `server { listen 80; ... }`，并新增：

```nginx
server {
    listen       443 ssl http2;
    server_name  www.example.com example.com;
    root         /var/www/mody-website;
    index        index.html;

    ssl_certificate     /etc/nginx/ssl/your_domain.pem;
    ssl_certificate_key /etc/nginx/ssl/your_domain.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
        try_files $uri $uri/ /index.html;
    }
    location ~* \.(ico|css|js|gif|jpe?g|png|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

若希望 HTTP 自动跳转到 HTTPS，在 **80 端口的 server** 里加：

```nginx
return 301 https://$server_name$request_uri;
```

然后执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 七、后续更新流程

1. 在本地修改 `mody-website` 下的 HTML/CSS/JS 或 `assets`。
2. 用 SCP 或 Git 将更新后的文件同步到 ECS 的 `/var/www/mody-website`。
3. 无需重启 Nginx，刷新浏览器即可看到更新。

示例（仅上传变更过的目录）：

```powershell
scp -r assets index.html root@你的ECS公网IP:/var/www/mody-website/
```

---

## 八、检查清单

- [ ] ECS 安全组已放行 80（及 443）
- [ ] Nginx 已安装并运行，`systemctl status nginx` 为 active
- [ ] 网站文件已放到 `/var/www/mody-website`，且 Nginx 用户可读
- [ ] `/etc/nginx/conf.d/mody-website.conf` 已配置且 `nginx -t` 通过
- [ ] 使用域名时：备案完成、DNS 已解析到 ECS 公网 IP
- [ ] 若启用 HTTPS：证书已配置，443 已放行

---

## 九、常见问题

**1. 访问 IP 显示 403**  
- 检查目录权限：`ls -la /var/www/mody-website`，确保有 `index.html`，且 Nginx 用户可读（如 `chown -R nginx:nginx /var/www/mody-website`）。

**2. 静态资源 404**  
- 确认 `assets`、`scripts` 已上传，路径与 HTML 中引用一致（均为相对路径即可）。

**3. 域名无法访问**  
- 确认域名已解析到 ECS 公网 IP（ping 或 `nslookup`），且安全组放行 80/443。

**4. 想用其他端口（如 8080）**  
- 在 Nginx 中写 `listen 8080;`，安全组放行 8080，访问 `http://IP:8080`。

按上述步骤即可在阿里云 ECS 上稳定运行摩迪官网；若你提供当前系统（如 CentOS 版本）和是否用域名/HTTPS，可以再细化成一份你机器上一键执行的命令清单。

# 在阿里云 ECS 上提供 APK 下载链接

> 把 Android 安装包放到 ECS，得到稳定下载地址，并用于官网「软件下载」二维码。

---

## 一、两种常见做法

| 方式 | 做法 | 优点 | 适用 |
|------|------|------|------|
| **A. 同机 Nginx 静态目录** | APK 放到 ECS 某目录，用 Nginx 提供 HTTP(S) 访问 | 简单、和现有 Node 可共存、不花钱 | 已有或可装 Nginx |
| **B. 阿里云 OSS** | 把 APK 上传到对象存储，用 OSS 提供的文件 URL | 不占 ECS 带宽、CDN 加速、适合大文件 | 希望省 ECS 流量、要加速 |

**建议**：若 ECS 上已有 Nginx（或打算用 Nginx 做反向代理），优先用 **方式 A**；若没有 Nginx 或希望下载走 CDN，用 **方式 B**。

---

## 二、方案 A 实操步骤（从零到官网二维码）

**Nginx 是什么**：一个 Web 服务器软件，可以把「某个网址路径」映射到「服务器上的一个文件夹」，用户访问该网址就相当于访问该文件夹里的文件。我们用它把路径 `/downloads/` 对应到你放 APK 的目录。

下面按顺序执行即可。

### 第一步：SSH 登录到 ECS

在你本机（Windows 用 PowerShell 或 CMD）执行：

```bash
ssh root@你的ECS公网IP
```

输入密码后，提示符变成 `root@xxx` 即表示已连上。

### 第二步：建目录

在 ECS 上执行：

```bash
sudo mkdir -p /opt/mody/downloads
ls -la /opt/mody/
```

应能看到 `downloads` 目录。

### 第三步：本机上传 APK 到 ECS

**在你电脑上**新开一个终端（不要 SSH 进 ECS），执行（把路径和 IP 换成你的）：

**Windows（PowerShell 或 CMD）：**

```bash
scp D:\path\to\your\app-release.apk root@你的ECS公网IP:/opt/mody/downloads/
```

例如 APK 在 `D:\ModyByCursor\mody-app\android\app\build\outputs\apk\release\app-release.apk`：

```bash
scp D:\ModyByCursor\mody-app\android\app\build\outputs\apk\release\app-release.apk root@你的ECS公网IP:/opt/mody/downloads/
```

上传后**回到 ECS 的 SSH 终端**执行：

```bash
cd /opt/mody/downloads
ls -la
mv app-release.apk mody-android.apk
# 若上传的文件名不同，改成：mv 你的文件名.apk mody-android.apk
ls -la
```

应能看到 `mody-android.apk`。

### 第四步：检查/安装 Nginx

在 ECS 上执行：

```bash
nginx -v
```

- 若显示版本号，说明已安装，跳到第五步。
- 若提示 `command not found`，先安装：

**Ubuntu / Debian：**

```bash
sudo apt update && sudo apt install -y nginx
```

**CentOS / 阿里云 Linux：**

```bash
sudo yum install -y nginx
```

### 第五步：找到并编辑 Nginx 配置

查看主配置路径：

```bash
nginx -t
```

常见路径：Ubuntu/Debian 为 `/etc/nginx/sites-available/default` 或 `/etc/nginx/nginx.conf`；CentOS 为 `/etc/nginx/nginx.conf`。

编辑（任选其一）：

```bash
sudo nano /etc/nginx/sites-available/default
# 或
sudo nano /etc/nginx/nginx.conf
```

没有 nano 可先安装：`sudo apt install -y nano` 或 `sudo yum install -y nano`。

在文件里找到 **`server { ... }`** 块，在 `server {` 和第一个 `location` 之间（或任意合适位置）加入下面这段：

```nginx
    location /downloads/ {
        alias /opt/mody/downloads/;
        default_type application/vnd.android.package-archive;
        add_header Content-Disposition 'attachment; filename="mody-android.apk"';
        add_header Cache-Control "public, max-age=3600";
    }
```

**示例**：原来可能是：

```nginx
server {
    listen 80 default_server;
    root /var/www/html;
    server_name _;
    location / {
        try_files $uri $uri/ =404;
    }
}
```

加完后变成：

```nginx
server {
    listen 80 default_server;
    root /var/www/html;
    server_name _;

    location /downloads/ {
        alias /opt/mody/downloads/;
        default_type application/vnd.android.package-archive;
        add_header Content-Disposition 'attachment; filename="mody-android.apk"';
        add_header Cache-Control "public, max-age=3600";
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
```

若该 server 已在做 Node API 反向代理（如 `proxy_pass http://127.0.0.1:3000`），只加 `location /downloads/` 这段即可。保存：nano 下 `Ctrl+O` 回车，`Ctrl+X` 退出。

### 第六步：检查配置并重载 Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

若无 `systemctl`：`sudo service nginx reload`。

### 第七步：安全组放行 80 端口

阿里云 ECS 控制台 → 你的实例 → 安全组 → 配置规则 → 入方向。确保有 **TCP 80**（授权对象可为 `0.0.0.0/0` 测试用）。没有则新增一条。

### 第八步：得到下载链接

浏览器访问（二选一）：

- **用域名**：`http://你的域名/downloads/mody-android.apk`
- **用 IP**：`http://你的ECS公网IP/downloads/mody-android.apk`

能下载 APK 即成功。记下这个链接，下一步要用。

### 第九步：官网用 QR Server API 显示二维码

1. 打开 **`mody-website/index.html`**。
2. 找到 `<script>` 里的：`var MODY_APK_URL = '';`
3. 填成第八步的链接，例如：
   ```javascript
   var MODY_APK_URL = 'http://你的ECS公网IP/downloads/mody-android.apk';
   ```
   或有域名时：`var MODY_APK_URL = 'https://你的域名/downloads/mody-android.apk';`
4. 保存后打开官网，Android 下载区的二维码会自动变成指向该链接的二维码，手机扫码即可下载。

**QR Server API**：页面会用 `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=你的链接`（链接会做 URL 编码）请求二维码图片并显示，无需你手动换图。

---

## 三、方式 A 简要说明（与上面步骤一致）

### 3.1 放 APK

```bash
sudo mkdir -p /opt/mody/downloads
# 本机：scp 你的.apk root@ECS的IP:/opt/mody/downloads/
# ECS 上：mv 你的.apk /opt/mody/downloads/mody-android.apk
```

### 3.2 Nginx location

在某个 `server { }` 内加入：

```nginx
location /downloads/ {
    alias /opt/mody/downloads/;
    default_type application/vnd.android.package-archive;
    add_header Content-Disposition 'attachment; filename="mody-android.apk"';
    add_header Cache-Control "public, max-age=3600";
}
```

然后：`sudo nginx -t && sudo systemctl reload nginx`。

### 3.3 下载链接

- 有域名：`https://你的域名/downloads/mody-android.apk`
- 仅 IP：`http://你的ECS公网IP/downloads/mody-android.apk`

---

## 四、方式 B：用阿里云 OSS 提供下载

1. 登录 [阿里云 OSS 控制台](https://oss.console.aliyun.com/)。
2. 创建 Bucket（读写选「公共读」或按需配鉴权），地域选离用户近的。
3. 在 Bucket 里建一个目录（如 `downloads`），上传 APK，文件名例如 `mody-android.apk`。
4. 在控制台点开该文件，复制「URL」或「外链」。
   - 格式一般为：`https://你的Bucket.oss.地域.aliyuncs.com/downloads/mody-android.apk`  
   若开了 CDN，用 CDN 域名代替上面的域名即可。
5. 该 URL 即为**稳定下载地址**，可直接用于二维码和官网。

---

## 五、在官网上用「真实下载链接」生成二维码

确定好 APK 的下载地址后（例如 `https://api.yourdomain.com/downloads/mody-android.apk`），有两种用法：

### 4.1 在线生成二维码图片后替换（推荐、不依赖外网 API）

1. 打开任意「二维码生成」网站，例如：
   - [草料二维码](https://cli.im/)
   - [联图二维码](https://www.liantu.com/)
2. 输入你的 **APK 完整下载链接**，生成二维码。
3. 下载 PNG（建议 300×300 或 400×400）。
4. 把图片放到官网项目中，替换掉占位图：
   - 文件名：`mody-website/assets/qr-android.png`
   - 在 `index.html` 里把 Android 二维码的 `src` 从 `assets/qr-android.svg` 改为 `assets/qr-android.png`。

这样官网不依赖任何第三方接口，且二维码永久有效。

### 4.2 用公共 API 动态生成（不改图片、改链接即可）

使用 [QR Server API](https://goqr.me/api/)：把「下载链接」编码后放进 URL，浏览器会返回一张二维码图片。

- 示例（把 `YOUR_APK_URL` 换成你的实际下载地址）：  
  `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=YOUR_APK_URL`  
  注意 `data` 需要做 URL 编码（encodeURIComponent）。
- 在官网里，Android 二维码的 `<img>` 的 `src` 设为上述地址，例如：  
  `src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A%2F%2Fapi.yourdomain.com%2Fdownloads%2Fmody-android.apk"`  

**缺点**：依赖第三方服务，若该服务不可用，二维码会裂图。**更稳妥**仍是 4.1：生成一次 PNG 放到站内。

---

## 六、官网里如何配置（本项目做法）

在 `mody-website/index.html` 中，Android 下载区已预留「可配置下载链接」的写法（见仓库内注释）。你只需：

1. 在 ECS 或 OSS 上按上面步骤得到 **最终 APK 下载 URL**。
2. 若用 **4.1**：生成二维码 PNG → 保存为 `assets/qr-android.png`，并把页面里 Android 二维码的 `src` 改为 `assets/qr-android.png`。
3. 若用 **4.2**：在页面里把 Android 二维码的 `src` 改成  
   `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data= encodeURIComponent(你的APK链接)` 的最终字符串形式。

iOS 上架后，用同样方式：得到 App Store 链接 → 生成二维码 PNG 或 API URL → 替换 `qr-ios.svg` 或对应 `src`。

---

## 七、简要检查清单

- [ ] APK 已上传到 ECS 某目录（方式 A）或 OSS（方式 B）。
- [ ] 在浏览器中直接打开「下载链接」，能正常下载 APK。
- [ ] 下载链接使用 **HTTPS**（若对外公开）。
- [ ] 官网 Android 二维码已改为「真实下载链接」对应的二维码图或 API 地址。
- [ ] 新版本 APK 发布时，覆盖同路径同文件名，或更新链接/二维码。

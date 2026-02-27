#!/usr/bin/env bash
# 后台管理站（admin-web）一键部署脚本（在 ECS 上使用，与 server / 官网同仓库、同 Gitee）
# 用法（在仓库根目录执行）：admin-web/scripts/deploy.sh
# 或：ssh root@47.110.243.97 "cd /opt/mody && bash admin-web/scripts/deploy.sh"
#
# 前置：ECS 已装 Nginx + Node 18+，已做「后台站一次性初始化」（见 admin-web/docs/deploy-quick.md）
# 拉取逻辑与 mody-website/scripts/deploy.sh 一致：有 gitee 远程则从 gitee 拉，否则 origin
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ADMIN_DIR="${REPO_ROOT}/admin-web"
WEB_ROOT="${DEPLOY_WEB_ROOT:-/var/www/admin-web}"
cd "$REPO_ROOT"

echo "========== 部署 Mody 后台管理站 (admin-web) =========="
echo "仓库目录: $REPO_ROOT"
echo "站点目录: $WEB_ROOT"

# 与 server / 官网部署脚本一致：优先 gitee（国内 ECS）
BRANCH="${DEPLOY_BRANCH:-main}"
REMOTE="${DEPLOY_REMOTE:-origin}"
if [[ -z "${DEPLOY_REMOTE}" ]] && git remote get-url gitee &>/dev/null; then
  REMOTE=gitee
fi
echo "拉取远程: $REMOTE 分支: $BRANCH"
git fetch "$REMOTE" "$BRANCH" --quiet
git checkout "$BRANCH" --quiet
git reset --hard "$REMOTE/$BRANCH" --quiet

# 构建前端（Vite 输出到 dist/）
echo "安装依赖并构建 admin-web..."
cd "$ADMIN_DIR"
if ! command -v node &>/dev/null; then
  echo "错误: 未检测到 Node，请先在 ECS 上安装 Node 18+（如 nvm 或 yum/apt 安装 nodejs）"
  exit 1
fi
npm ci --quiet
npm run build
cd "$REPO_ROOT"

# 同步 dist/ 到 Nginx 站点目录
BUILD_DIR="${ADMIN_DIR}/dist"
if [[ ! -d "$BUILD_DIR" ]]; then
  echo "错误: 未找到构建产物 $BUILD_DIR"
  exit 1
fi
sudo mkdir -p "$WEB_ROOT"
if command -v rsync &>/dev/null; then
  sudo rsync -av --delete "${BUILD_DIR}/" "$WEB_ROOT/"
else
  echo "未检测到 rsync，使用 cp 同步"
  sudo rm -rf "$WEB_ROOT"/*
  sudo cp -a "${BUILD_DIR}"/. "$WEB_ROOT/"
fi
sudo chown -R nginx:nginx "$WEB_ROOT"

# 重载 Nginx（配置未改则 reload 即可）
if sudo nginx -t 2>/dev/null; then
  sudo systemctl reload nginx
  echo "Nginx 已重载"
else
  echo "警告: nginx -t 未通过，请检查配置"
fi

echo "========== 后台管理站部署完成 =========="

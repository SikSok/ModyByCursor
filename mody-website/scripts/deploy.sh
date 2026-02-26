#!/usr/bin/env bash
# 官网（mody-website）一键部署脚本（在 ECS 上使用，与 server 同仓库、同 Gitee）
# 用法（在仓库根目录执行）：mody-website/scripts/deploy.sh
# 或：ssh user@ECS "cd /opt/mody && mody-website/scripts/deploy.sh"
#
# 前置：ECS 已装 Nginx，已做「官网一次性初始化」（见 mody-website/docs/deploy-quick.md）
# 拉取逻辑与 server/scripts/deploy.sh 一致：有 gitee 远程则从 gitee 拉，否则 origin
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEBSITE_DIR="${REPO_ROOT}/mody-website"
WEB_ROOT="${DEPLOY_WEB_ROOT:-/var/www/mody-website}"
cd "$REPO_ROOT"

echo "========== 部署 Mody 官网 =========="
echo "仓库目录: $REPO_ROOT"
echo "站点目录: $WEB_ROOT"

# 与 server 部署脚本一致：优先 gitee（国内 ECS）
BRANCH="${DEPLOY_BRANCH:-main}"
REMOTE="${DEPLOY_REMOTE:-origin}"
if [[ -z "${DEPLOY_REMOTE}" ]] && git remote get-url gitee &>/dev/null; then
  REMOTE=gitee
fi
echo "拉取远程: $REMOTE 分支: $BRANCH"
git fetch "$REMOTE" "$BRANCH" --quiet
git checkout "$BRANCH" --quiet
git reset --hard "$REMOTE/$BRANCH" --quiet

# 同步到 Nginx 站点目录（排除 node_modules）
sudo mkdir -p "$WEB_ROOT"
sudo rsync -av --delete \
  --exclude=node_modules \
  --exclude=.git \
  "$WEBSITE_DIR/" "$WEB_ROOT/"
sudo chown -R nginx:nginx "$WEB_ROOT"

# 重载 Nginx（配置未改则 reload 即可）
if sudo nginx -t 2>/dev/null; then
  sudo systemctl reload nginx
  echo "Nginx 已重载"
else
  echo "警告: nginx -t 未通过，请检查配置"
fi

echo "========== 官网部署完成 =========="

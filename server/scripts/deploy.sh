#!/usr/bin/env bash
# Server 一键部署脚本（在 ECS 上使用）
# 用法（在仓库根目录执行）：server/scripts/deploy.sh
# 或：ssh user@ECS "cd /opt/mody && server/scripts/deploy.sh"
set -e

# 仓库根目录（脚本位于 server/scripts/deploy.sh）
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SERVER_DIR="${REPO_ROOT}/server"
cd "$REPO_ROOT"

echo "========== 部署 Mody Server =========="
echo "仓库目录: $REPO_ROOT"

# 拉取最新代码（默认 main，可改为你的默认分支）
BRANCH="${DEPLOY_BRANCH:-main}"
echo "拉取分支: $BRANCH"
git fetch origin "$BRANCH" --quiet
git checkout "$BRANCH" --quiet
git pull origin "$BRANCH" --quiet

cd "$SERVER_DIR"
echo "安装依赖 (npm ci)..."
npm ci

echo "构建 (npm run build)..."
npm run build

# PM2：若已在运行则 restart，否则 start
if pm2 describe mody-api &>/dev/null; then
  echo "重启 PM2: mody-api"
  pm2 restart mody-api --update-env
else
  echo "启动 PM2: mody-api"
  pm2 start dist/index.js --name mody-api
fi

echo "========== 部署完成 =========="
pm2 list

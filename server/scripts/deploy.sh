#!/usr/bin/env bash
# Server 一键部署脚本（在 ECS 上使用）
# 用法（在仓库根目录执行）：server/scripts/deploy.sh
# 或：ssh user@ECS "cd /opt/mody && server/scripts/deploy.sh"
#
# 国内 ECS 访问 GitHub 常超时，可从 Gitee 拉取：
#   git remote add gitee https://gitee.com/你的用户名/ModyByCursor.git
#   export DEPLOY_REMOTE=gitee   # 可选，不设则用 origin
set -e

# 仓库根目录（脚本位于 server/scripts/deploy.sh）
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SERVER_DIR="${REPO_ROOT}/server"
cd "$REPO_ROOT"

echo "========== 部署 Mody Server =========="
echo "仓库目录: $REPO_ROOT"

# 拉取远程：国内 ECS 建议用 Gitee（DEPLOY_REMOTE=gitee），否则用 origin
# 使用 fetch + reset --hard，强制与远程一致，避免服务器本地修改导致 pull 报错
BRANCH="${DEPLOY_BRANCH:-main}"
REMOTE="${DEPLOY_REMOTE:-origin}"
# 若未指定且存在 gitee 远程，则优先用 gitee（国内 ECS 访问 GitHub 常超时）
if [[ -z "${DEPLOY_REMOTE}" ]] && git remote get-url gitee &>/dev/null; then
  REMOTE=gitee
fi
echo "拉取远程: $REMOTE 分支: $BRANCH"
git fetch "$REMOTE" "$BRANCH" --quiet
git checkout "$BRANCH" --quiet
git reset --hard "$REMOTE/$BRANCH" --quiet

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

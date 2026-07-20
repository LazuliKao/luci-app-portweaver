#!/bin/bash
# .github/workflows/update_hash.sh

set -e

# Helper function to print logs
log() {
    echo -e "[INFO] $*" >&2
}

log_err() {
    echo -e "[ERROR] $*" >&2
}

# Helper to perform curl with retries
curl_retry() {
    curl -fsSL --retry 3 --retry-delay 2 "$@"
}

# Determine the directory of the script and find repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Switch to repo root
cd "$REPO_ROOT"

# Set up Auth header if GITHUB_TOKEN is available
AUTH_HEADER=()
if [ -n "$GITHUB_TOKEN" ]; then
    AUTH_HEADER=(-H "Authorization: token $GITHUB_TOKEN")
fi

get_latest_ci_success_commit() {
    local repo="$1"
    
    log "正在获取 $repo 的默认分支..."
    local repo_info
    if ! repo_info=$(curl_retry "${AUTH_HEADER[@]}" "https://api.github.com/repos/$repo"); then
        log_err "获取 $repo 信息失败"
        return 1
    fi
    
    local default_branch
    default_branch=$(echo "$repo_info" | jq -r '.default_branch')
    if [ -z "$default_branch" ] || [ "$default_branch" = "null" ]; then
        log "未获取到默认分支，将使用 main 作为默认分支"
        default_branch="main"
    fi
    log "默认分支为: $default_branch"
    
    log "正在获取 $repo 的 $default_branch 分支最新一个 CI 成功的运行记录..."
    local runs_info
    if ! runs_info=$(curl_retry "${AUTH_HEADER[@]}" "https://api.github.com/repos/$repo/actions/runs?branch=$default_branch&status=success&per_page=1"); then
        log_err "获取 $repo 运行记录失败"
        return 1
    fi
    
    local commit_sha
    commit_sha=$(echo "$runs_info" | jq -r '.workflow_runs[0].head_commit.id')
    
    local commit_timestamp
    commit_timestamp=$(echo "$runs_info" | jq -r '.workflow_runs[0].head_commit.timestamp')
    
    if [ -z "$commit_sha" ] || [ "$commit_sha" = "null" ]; then
        log_err "无法获取 $repo 的最新 CI 成功提交哈希"
        return 1
    fi
    
    local commit_date
    commit_date=$(echo "$commit_timestamp" | cut -c 1-10)
    if [ -z "$commit_date" ] || [ "$commit_date" = "null" ]; then
        # Fallback date to today if timestamp is not available
        commit_date=$(date +%Y-%m-%d)
    fi
    
    echo "$commit_sha|$commit_date"
}

update_package() {
    local mk_path="$1"
    if [ ! -f "$mk_path" ]; then
        log_err "Makefile 不存在: $mk_path"
        return 1
    fi
    
    log "正在处理 $mk_path..."
    
    # 提取 PKG_REPO (支持 PKG_SOURCE_URL 或 URL)
    local PKG_REPO
    local url_line
    url_line=$(grep -E '^(PKG_SOURCE_URL|URL)\s*:=\s*' "$mk_path" | head -n 1)
    if [ -z "$url_line" ]; then
        log_err "无法从 $mk_path 提取 URL 或 PKG_SOURCE_URL"
        return 1
    fi
    
    PKG_REPO=$(echo "$url_line" | grep -oE "github.com/[^/]+/[^/?#\)]+" | sed 's|github.com/||' | head -n 1)
    if [ -z "$PKG_REPO" ]; then
        log_err "无法从 $mk_path 的 URL 提取 GitHub 仓库名称 (owner/repo)"
        return 1
    fi
    log "解析到仓库: $PKG_REPO"
    
    # 获取最新的 CI 成功提交哈希和日期
    local ci_res
    if ! ci_res=$(get_latest_ci_success_commit "$PKG_REPO"); then
        return 1
    fi
    
    local COMMIT_SHA
    COMMIT_SHA=$(echo "$ci_res" | cut -d'|' -f1)
    local COMMIT_DATE
    COMMIT_DATE=$(echo "$ci_res" | cut -d'|' -f2)
    
    log "最新 CI 成功 Commit: $COMMIT_SHA ($COMMIT_DATE)"
    
    # 获取当前 Makefile 中的相关变量，以便替换
    local name
    name=$(grep -E '^PKG_NAME\s*:=\s*' "$mk_path" | sed -E 's/^PKG_NAME\s*:=\s*(.*)/\1/')
    local version
    version=$(grep -E '^PKG_VERSION\s*:=\s*' "$mk_path" | sed -E 's/^PKG_VERSION\s*:=\s*(.*)/\1/')
    local source
    source=$(grep -E '^PKG_SOURCE\s*:=\s*' "$mk_path" | sed -E 's/^PKG_SOURCE\s*:=\s*(.*)/\1/')
    local source_url
    source_url=$(grep -E '^PKG_SOURCE_URL\s*:=\s*' "$mk_path" | sed -E 's/^PKG_SOURCE_URL\s*:=\s*(.*)/\1/')
    
    # 进行变量替换，解析出真实的包下载 URL
    local source_resolved
    source_resolved=${source//\$\(PKG_NAME\)/$name}
    source_resolved=${source_resolved//\$\{PKG_NAME\}/$name}
    source_resolved=${source_resolved//\$\(PKG_VERSION\)/$version}
    source_resolved=${source_resolved//\$\{PKG_VERSION\}/$version}
    source_resolved=${source_resolved//\$\(PKG_SOURCE_VERSION\)/$COMMIT_SHA}
    source_resolved=${source_resolved//\$\{PKG_SOURCE_VERSION\}/$COMMIT_SHA}
    
    local source_url_resolved
    source_url_resolved=${source_url//\$\(PKG_NAME\)/$name}
    source_url_resolved=${source_url_resolved//\$\{PKG_NAME\}/$name}
    source_url_resolved=${source_url_resolved//\$\(PKG_VERSION\)/$version}
    source_url_resolved=${source_url_resolved//\$\{PKG_VERSION\}/$version}
    source_url_resolved=${source_url_resolved//\$\(PKG_SOURCE_VERSION\)/$COMMIT_SHA}
    source_url_resolved=${source_url_resolved//\$\{PKG_SOURCE_VERSION\}/$COMMIT_SHA}
    
    local full_url="$source_url_resolved$source_resolved"
    log "完整下载 URL: $full_url"
    
    # 计算 sha256 校验哈希
    log "正在计算最新软件包的 SHA256 哈希..."
    local PKG_HASH
    if ! PKG_HASH=$(curl_retry "$full_url" | sha256sum | cut -b -64); then
        log_err "下载并计算软件包哈希失败"
        return 1
    fi
    log "最新哈希: $PKG_HASH"
    
    # 替换 Makefile 中的字段
    sed -i -E "s/^(PKG_SOURCE_DATE\s*:=\s*).*/\1$COMMIT_DATE/" "$mk_path"
    sed -i -E "s/^(PKG_SOURCE_VERSION\s*:=\s*).*/\1$COMMIT_SHA/" "$mk_path"
    sed -i -E "s/^(PKG_HASH\s*:=\s*).*/\1$PKG_HASH/" "$mk_path"
    
    log "更新 $mk_path 完成！"
    echo ""
}

# Update the target Makefiles
update_package "portweaver/Makefile"
update_package "portweaver-lite/Makefile"

log "所有 Makefiles 更新成功！"

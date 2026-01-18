#!/bin/bash

# 飞鹰计划 用户数据迁移脚本
# 将多个用户目录的数据合并到固定用户ID下

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data/backups"
TARGET_USER="priospace_user"

echo "🔄 飞鹰计划 用户数据迁移工具"
echo "=================================="

if [ ! -d "$DATA_DIR" ]; then
    echo "❌ 数据目录不存在: $DATA_DIR"
    exit 1
fi

# 检查现有用户
echo "📂 检查现有用户数据..."
USER_DIRS=($(find "$DATA_DIR" -mindepth 1 -maxdepth 1 -type d -name "user_*" ! -name "$TARGET_USER" 2>/dev/null | sort))

if [ ${#USER_DIRS[@]} -eq 0 ]; then
    echo "✅ 没有找到需要迁移的用户数据"
    exit 0
fi

echo "📋 找到 ${#USER_DIRS[@]} 个用户目录需要迁移:"
for dir in "${USER_DIRS[@]}"; do
    echo "  - $(basename "$dir")"
done

# 创建目标用户目录
TARGET_DIR="$DATA_DIR/$TARGET_USER"
echo "📁 确保目标目录存在: $TARGET_DIR"
mkdir -p "$TARGET_DIR"

# 创建备份
BACKUP_DIR="$PROJECT_DIR/backups/migration_backup_$(date +%Y%m%d_%H%M%S)"
echo "💾 创建迁移备份: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -r "$DATA_DIR" "$BACKUP_DIR/"

# 合并数据
echo "🔄 开始数据迁移..."

for user_dir in "${USER_DIRS[@]}"; do
    user_name=$(basename "$user_dir")
    echo "  📦 处理用户: $user_name"
    
    # 检查用户目录中的文件
    if [ "$(ls -A "$user_dir" 2>/dev/null | wc -l)" -eq 0 ]; then
        echo "    ⚠️  用户目录为空，跳过"
        continue
    fi
    
    # 合并每个数据文件
    for file in "$user_dir"/*.json; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            target_file="$TARGET_DIR/$filename"
            
            echo "    📄 处理文件: $filename"
            
            if [ -f "$target_file" ]; then
                # 文件已存在，需要合并策略
                echo "    🔀 目标文件已存在，使用最新数据"
                
                # 比较时间戳，保留最新的
                source_time=$(stat -c %Y "$file" 2>/dev/null || echo 0)
                target_time=$(stat -c %Y "$target_file" 2>/dev/null || echo 0)
                
                if [ "$source_time" -gt "$target_time" ]; then
                    echo "    ✅ 源文件更新，复制"
                    cp "$file" "$target_file"
                else
                    echo "    ⏭️  目标文件更新，保持不变"
                fi
            else
                echo "    ✅ 复制新文件"
                cp "$file" "$target_file"
            fi
        fi
    done
done

echo ""
echo "🗑️  清理旧用户目录..."
for user_dir in "${USER_DIRS[@]}"; do
    user_name=$(basename "$user_dir")
    echo "  🗂️  删除: $user_name"
    rm -rf "$user_dir"
done

echo ""
echo "✅ 数据迁移完成！"
echo "📊 迁移结果:"
echo "  🎯 目标用户: $TARGET_USER"
echo "  📁 数据位置: $TARGET_DIR"
echo "  💾 备份位置: $BACKUP_DIR"

if [ -d "$TARGET_DIR" ]; then
    file_count=$(find "$TARGET_DIR" -name "*.json" | wc -l)
    echo "  📄 数据文件数: $file_count"
    
    if [ $file_count -gt 0 ]; then
        echo "  📋 数据文件列表:"
        ls -la "$TARGET_DIR"/*.json 2>/dev/null | awk '{print "    " $9 " (" $5 " bytes)"}' || true
    fi
fi

echo ""
echo "💡 下次启动应用时，所有设备都将使用统一的用户ID"
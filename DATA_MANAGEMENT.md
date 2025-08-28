# 📊 Priospace 数据管理指南

## 数据存储位置

### 主机存放路径
```
./data/                    # 项目根目录下的 data 文件夹
├── backups/               # 用户备份数据
│   └── priospace_user/    # 固定用户ID目录
│       ├── darkMode.json  # 深色模式设置
│       ├── theme.json     # 主题配置
│       ├── dailyTasks.json # 任务数据
│       ├── customTags.json # 自定义标签
│       └── habits.json    # 习惯数据
└── .gitkeep               # 保持目录结构
```

### 容器内路径
```
/app/data/                 # 容器内数据目录
```

## 数据管理工具

### 🚀 快速命令

```bash
# 查看数据状态
./scripts/backup-data.sh status

# 创建备份
./scripts/backup-data.sh backup

# 查看所有备份
./scripts/backup-data.sh list

# 恢复指定备份
./scripts/backup-data.sh restore backups/priospace_backup_20241228_143022.tar.gz

# 清理30天前的备份
./scripts/backup-data.sh clean 30
```

## 数据同步机制

### 工作原理
1. **前端存储**: 数据保存在浏览器 LocalStorage 中，提供即时访问
2. **服务器备份**: 每10秒自动备份到服务器端 `/app/data/backups/`
3. **跨会话恢复**: 新会话启动时从服务器恢复数据
4. **用户隔离**: 每个用户有独立的数据目录

### 用户识别
- 系统使用固定用户ID: `priospace_user`
- 所有设备和浏览器会话共享同一用户ID
- 支持跨设备、跨浏览器（包括隐身模式）数据同步

## 数据备份策略

### 自动备份
- **频率**: 每10秒检查一次数据变化
- **触发**: 用户修改任务、习惯、设置时
- **存储**: JSON 格式，每个数据类型单独文件

### 手动备份
```bash
# 立即创建完整备份
./scripts/backup-data.sh backup

# 备份文件命名: priospace_backup_YYYYMMDD_HHMMSS.tar.gz
```

### 备份恢复
```bash
# 恢复前会自动备份当前数据
./scripts/backup-data.sh restore <backup_file>
```

## 数据迁移

### 旧版本数据迁移
如果你之前使用过旧版本，可能存在多个用户ID目录，使用迁移脚本合并数据：

```bash
# 自动迁移多用户数据到统一用户ID
./scripts/migrate-user-data.sh
```

### 导出数据
1. 访问应用的设置页面
2. 点击"导出数据"按钮
3. 下载 JSON 文件到本地

### 导入数据
1. 访问应用的设置页面
2. 点击"导入数据"按钮
3. 选择之前导出的 JSON 文件

### 跨环境迁移
```bash
# 方法1: 复制整个 data 目录
cp -r ./data /path/to/new/installation/

# 方法2: 使用备份工具
./scripts/backup-data.sh backup
# 将生成的 .tar.gz 文件复制到新环境
./scripts/backup-data.sh restore priospace_backup_YYYYMMDD_HHMMSS.tar.gz

# 方法3: 只复制用户数据目录
cp -r ./data/backups/priospace_user /path/to/new/installation/data/backups/
```

## 隐私和安全

### 数据保护
- 所有数据存储在本地主机
- 不会上传到外部服务器
- 用户可完全控制自己的数据

### 数据清理
```bash
# 清理用户数据（谨慎操作）
rm -rf ./data/backups/user_[用户ID]

# 清理所有数据
rm -rf ./data/backups/*
```

## 故障排除

### 常见问题

**问题**: 隐身模式下没有数据
**解决**: 数据会在页面加载时从服务器自动恢复，稍等片刻

**问题**: 容器重启后数据丢失
**解决**: 检查 data 目录是否正确挂载到主机

**问题**: 权限错误
**解决**: 确保 data 目录有正确的读写权限
```bash
sudo chown -R $USER:$USER ./data
chmod -R 755 ./data
```

### 检查数据完整性
```bash
# 查看数据状态
./scripts/backup-data.sh status

# 访问管理页面
http://localhost:3090/admin
```

### 手动检查
```bash
# 查看用户数据
ls -la ./data/backups/

# 查看特定用户的数据文件
ls -la ./data/backups/user_*/

# 查看数据文件内容
cat ./data/backups/user_*/dailyTasks.json | jq .
```

## 最佳实践

1. **定期备份**: 建议每周手动创建一次完整备份
2. **监控空间**: 定期检查 data 目录大小
3. **清理旧备份**: 使用 clean 命令清理过期备份
4. **测试恢复**: 定期测试备份恢复流程
5. **版本控制**: data 目录结构纳入版本控制，但数据文件被忽略
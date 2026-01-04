# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Priospace 是一个现代化的生产力应用程序，结合了任务管理、番茄钟定时器功能、习惯跟踪和实时协作功能。项目采用 Next.js 15 + React 19 构建，使用 TypeScript 和 Tailwind CSS，并支持通过 Tauri 打包为桌面应用。

## 架构概览

### 技术栈
- **前端**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **动画**: Framer Motion
- **UI组件**: shadcn/ui 组件库，Radix UI primitives
- **字体**: Nunito (Google Fonts)
- **桌面应用**: Tauri 2.x (Rust backend)
- **实时协作**: WebRTC + WebSocket 信令服务器
- **数据持久化**: LocalStorage

### 项目结构
- `app/` - Next.js App Router 应用页面和布局
- `components/` - 可复用的 React 组件
  - `ui/` - shadcn/ui 基础组件 (TypeScript)
  - 其他组件为功能组件 (.js 文件)
- `lib/` - 工具函数和实用程序
- `utils/` - 时间处理等辅助函数
- `webrtc-server/` - WebRTC 信令服务器 (Node.js + WebSocket)
- `src-tauri/` - Tauri 桌面应用配置和 Rust 代码
- `public/` - 静态资源（音频文件、图标等）

### 核心功能模块
1. **任务管理** - 任务和子任务的 CRUD 操作，支持优先级分级和周目标关联
2. **番茄钟定时器** - 定时器模态框，支持多种预设时间
3. **习惯跟踪** - GitHub 风格的贡献图表，支持优先级管理
4. **目标管理系统** - 三级目标管理（年度、季度、周目标）
   - 年度目标：长期规划，支持优先级和自动进度计算
   - 季度目标：季度里程碑，可关联年度目标，支持优先级
   - 周目标：每周聚焦，可关联季度目标和日常任务，支持优先级
5. **实时协作** - WebRTC P2P 连接和实时同步
6. **主题系统** - 4种主题切换，支持深色/浅色模式

## 常用命令

### 本地开发
```bash
npm run dev          # 启动开发服务器 (使用 Turbopack)
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 运行 ESLint 检查
```

### Docker 部署
```bash
# 生产环境部署 (推荐)
docker-compose up --build    # 构建并启动生产容器
docker-compose up -d         # 后台运行
docker-compose down          # 停止并删除容器

# 开发环境部署 (支持热重载)
docker-compose -f docker-compose.dev.yml up --build

# 使用 Docker 直接部署
docker build -t priospace .  # 构建生产镜像
docker run -p 3090:3000 -v priospace-data:/app/data priospace
```

### WebRTC 协作服务器 (本地开发用)
```bash
cd webrtc-server
npm install
npm start           # 启动 WebRTC 信令服务器
```

### Tauri 桌面应用
```bash
npm run tauri       # Tauri 相关命令
```

## 开发指南

### 组件约定
- UI 基础组件使用 TypeScript (.tsx)
- 功能组件使用 JavaScript (.js)
- 使用 Framer Motion 进行动画处理
- 遵循 shadcn/ui 的组件模式和样式约定

### 样式系统
- 使用 Tailwind CSS 工具类
- CSS 变量用于主题颜色管理
- Nunito 字体作为默认字体系列
- 支持响应式设计 (移动端优先)

### 状态管理
- React Hooks (useState, useEffect, useRef)
- LocalStorage 用于数据持久化
- WebRTC 用于实时状态同步

### 音频文件
项目包含音频反馈文件在 `public/music/`:
- `complete.mp3` - 任务完成音效
- `break.mp3` - 休息时间音效  
- `playing.mp3`, `hold.mp3`, `overtime.mp3` - 定时器音效

### WebRTC 协作
- 信令服务器使用 WebSocket (ws 库)
- P2P 连接用于实时任务同步
- 开发时需要启动独立的信令服务器

### Docker 部署架构
- 单容器部署，包含完整的 Next.js 应用
- 不需要单独的 WebRTC 服务器（WebRTC 功能内置在前端，通过 P2P 工作）
- 支持热重载开发环境和生产环境
- 通过端口 3000 对外提供服务

### Tauri 集成 (本地桌面应用)
- Next.js 可配置为静态导出模式支持 Tauri
- Docker 部署时使用 SSR 模式以获得更好的性能
- Rust 后端提供桌面应用功能

### 数据结构
- **任务支持优先级分级** (P0-P3) 和周目标关联
- 任务支持分层子任务结构
- 习惯跟踪使用日期网格数据，支持优先级
- **年度目标支持优先级、进度追踪和年份筛选**
- **季度目标支持优先级、季度筛选和年度目标关联**
- **周目标支持优先级、季度目标关联和任务链接**
- 主题配置存储在 CSS 变量中
- 所有数据通过 LocalStorage 持久化

#### 年度目标数据结构
```javascript
{
  id: string,           // 唯一标识符（时间戳生成）
  title: string,        // 目标标题（必填）
  description: string,  // 目标描述（可选）
  year: number,         // 目标年份（必填）
  completed: boolean,   // 完成状态（默认 false）
  progress: number,     // 完成进度 0-100（默认 0）
  autoCalculated: boolean, // 进度是否为自动计算（默认 false）
  tag: string,          // 标签 ID（可选）
  priority: "P0"|"P1"|"P2"|"P3"|undefined, // 优先级（可选）
  createdAt: Date       // 创建时间
}
```

**优先级说明：**
- **P0 (①)**: 最高优先级 - 紧急重要
- **P1 (②)**: 高优先级 - 重要
- **P2 (③)**: 中优先级 - 一般
- **P3 (④)**: 低优先级 - 次要
- **undefined**: 无优先级

#### 季度目标数据结构
```javascript
{
  id: string,           // 唯一标识符（时间戳生成）
  title: string,        // 目标标题（必填）
  description: string,  // 目标描述（可选）
  year: number,         // 目标年份（必填）
  quarter: number,      // 目标季度 1-4（必填）
  completed: boolean,   // 完成状态（默认 false）
  progress: number,     // 完成进度 0-100（默认 0）
  yearlyGoalId: string, // 关联的年度目标 ID（可选）
  weight: number,       // 权重占比 0-100（仅当关联年度目标时有效）
  tag: string,          // 标签 ID（可选）
  priority: "P0"|"P1"|"P2"|"P3"|undefined, // 优先级（可选）
  createdAt: Date       // 创建时间
}
```

#### 周目标数据结构
```javascript
{
  id: string,           // 唯一标识符（时间戳生成）
  title: string,        // 目标标题（必填）
  description: string,  // 目标描述（可选）
  year: number,         // 目标年份（必填）
  quarter: number,      // 所属季度 1-4（必填）
  week: number,         // 周数 1-52（必填）
  completed: boolean,   // 完成状态（默认 false）
  progress: number,     // 完成进度 0-100（默认 0）
  quarterlyGoalId: string, // 关联的季度目标 ID（可选）
  weight: number,       // 权重占比 0-100（仅当关联季度目标时有效）
  tag: string,          // 标签 ID（可选）
  priority: "P0"|"P1"|"P2"|"P3"|undefined, // 优先级（可选）
  createdAt: Date       // 创建时间
}
```

#### 任务数据结构
```javascript
{
  id: string,           // 唯一标识符（时间戳生成）
  title: string,        // 任务标题（必填）
  completed: boolean,   // 完成状态（默认 false）
  timeSpent: number,    // 已花费时间（秒）
  focusTime: number,    // 专注时间（秒）
  tag: string,          // 标签 ID（可选）
  priority: "P0"|"P1"|"P2"|"P3"|undefined, // 优先级（可选）
  weeklyGoalId: string, // 关联的周目标 ID（可选）
  subtasks: Array,      // 子任务数组（可选）
  parentTaskId: string, // 父任务 ID（仅子任务有）
  createdAt: Date       // 创建时间
}
```

**任务列表自动排序规则：**
1. 未完成任务在前，已完成任务在后
2. 在未完成任务中，按优先级排序：P0 > P1 > P2 > P3 > 无优先级
3. 同优先级按创建时间排序

#### 习惯数据结构
```javascript
{
  id: string,           // 唯一标识符（时间戳生成）
  name: string,         // 习惯名称（必填）
  completedDates: Array<string>, // 完成日期数组 ["YYYY-MM-DD"]
  tag: string,          // 标签 ID（可选）
  priority: "P0"|"P1"|"P2"|"P3"|undefined, // 优先级（可选）
  createdAt: Date       // 创建时间
}
```

#### 年度目标与季度目标关联关系
- 季度目标可以关联到同年的年度目标
- 当季度目标关联到年度目标时，年度目标的进度自动根据关联的所有季度目标的加权平均值计算
- 权重归一化：如果权重总和不等于 100%，系统自动归一化
- 计算公式：`年度进度 = Σ(季度目标进度 × 归一化权重)`
- 当年度目标有关联的季度目标时，`autoCalculated` 为 `true`，禁用手动进度编辑

#### 季度目标与周目标关联关系
- 周目标可以关联到同季度的季度目标
- 当周目标关联到季度目标时，季度目标的进度可以自动计算（类似年度目标）
- 权重分配机制与年度目标相同

#### 周目标与任务关联关系
- 任务可以关联到周目标，通过 `weeklyGoalId` 字段
- 周目标卡片显示关联的任务数量
- 帮助用户将日常任务与周目标对齐，实现从战略到执行的闭环

#### 优先级系统
- 所有实体（年度目标、季度目标、周目标、任务、习惯）都支持优先级
- 优先级使用带圈数字显示：①②③④
- 任务列表自动按优先级排序，优先级高的任务排在前面
- 优先级徽章使用统一的灰色系，保持 UI 简洁一致

## Docker 部署指南

### 快速开始
```bash
# 克隆项目
git clone <repository-url>
cd TaskSpace

# 使用 Docker Compose 部署
docker-compose up --build
```

### 访问应用
- 本机访问: http://localhost:3090
- 局域网其他设备: http://[宿主机IP]:3090
- 例如: http://192.168.1.100:3090

### 数据持久化
项目支持多层数据保护：

1. **前端 LocalStorage** - 即时存储，用户体验流畅
2. **服务器端备份** - 自动备份到 Docker 数据卷
3. **数据导出/导入** - 手动备份恢复机制

```bash
# 生产环境（优化版本，推荐）
docker-compose up --build

# 开发环境（包含热重载）
docker-compose -f docker-compose.dev.yml up --build
```

### 数据管理
数据直接存储在项目目录的 `./data/` 文件夹中，便于访问和管理：

```bash
# 查看数据状态
./scripts/backup-data.sh status

# 创建数据备份
./scripts/backup-data.sh backup

# 恢复数据备份
./scripts/backup-data.sh restore backups/priospace_backup_YYYYMMDD_HHMMSS.tar.gz

# 清理旧备份
./scripts/backup-data.sh clean 30
```

**数据存放位置:**
- 主机路径: `./data/backups/`
- 容器路径: `/app/data/backups/`
- 每个用户有独立的子目录

### 生产部署注意事项
1. 默认使用 `docker-compose.yml` 进行生产部署（优化后的配置）
2. 定期使用 `./scripts/backup-data.sh backup` 备份数据
3. 确保 `./data` 目录有正确的读写权限
4. 考虑使用 nginx 反向代理进行生产部署
5. 配置 HTTPS 以支持 WebRTC 的完整功能

### Docker 文件说明
- `Dockerfile` - 生产环境容器构建配置（多阶段构建，优化镜像大小）
- `Dockerfile.dev` - 开发环境容器配置（支持热重载）
- `docker-compose.yml` - 生产环境服务编排配置
- `docker-compose.dev.yml` - 开发环境服务编排配置
- `.dockerignore` - 构建时忽略的文件

## 特殊注意事项

1. **Docker vs Tauri 配置** - Docker 部署使用 SSR，Tauri 使用静态导出
2. **混合文件类型** - UI 组件为 TypeScript，功能组件为 JavaScript
3. **音频资源** - 包含多个音效文件，需要考虑浏览器音频策略
4. **WebRTC P2P** - 协作功能直接在前端实现，无需额外服务器
5. **主题系统** - 使用 CSS 变量和 Tailwind 类的混合主题系统
6. **跨设备访问** - Docker 部署后局域网内所有设备都可访问
7. **数据同步测试页面** - `/admin` 页面提供系统状态和数据同步测试功能
# Project Context

## Purpose
Priospace (TaskSpace) 是一个现代化的生产力应用程序，旨在帮助用户高效管理任务、追踪习惯、专注工作并实现实时协作。项目结合了任务管理、番茄钟定时器、习惯追踪和 WebRTC 实时协作功能，提供流畅的用户体验和跨设备数据同步能力。

核心目标：
- 提供直观、美观的任务和习惯管理界面
- 通过番茄钟技术提升用户专注力和生产力
- 支持实时协作，让团队成员共享工作空间
- 确保数据安全和跨设备同步
- 支持多种部署方式（Web、Docker、桌面应用）

## Tech Stack

### Frontend
- **Next.js 15** - React 框架，使用 App Router
- **React 19** - UI 库，使用 Hooks 和现代模式
- **TypeScript + JavaScript** - 混合使用（UI 组件用 TS，功能组件用 JS）
- **Tailwind CSS** - 工具优先的 CSS 框架
- **Framer Motion** - 动画库，用于流畅的交互动画
- **shadcn/ui** - 高质量、可访问的 UI 组件库
- **Lucide React** - 图标库

### Backend & Infrastructure
- **Next.js API Routes** - 服务器端 API（数据备份/恢复）
- **Node.js** - 运行时环境
- **WebRTC** - 点对点实时通信
- **WebSocket** - WebRTC 信令服务器（ws 库）

### Desktop & Deployment
- **Tauri 2.x** - 桌面应用框架（Rust 后端）
- **Docker** - 容器化部署
- **Nginx** - 反向代理（可选）

### Data Storage
- **LocalStorage** - 浏览器本地存储（即时访问）
- **文件系统** - 服务器端备份（`/app/data/backups/`）

## Project Conventions

### Code Style

#### 文件类型约定
- **TypeScript (.tsx)** - 用于 UI 基础组件（`components/ui/` 目录）
- **JavaScript (.js)** - 用于功能组件和业务逻辑
- 遵循现有项目的混合模式，不要强制统一为单一语言

#### 命名约定
- 组件文件：kebab-case（如 `task-list.js`, `timer-modal.js`）
- React 组件：PascalCase（如 `TaskList`, `TimerModal`）
- 函数和变量：camelCase
- 常量：UPPER_SNAKE_CASE（如适用）

#### 代码组织
- 组件放在 `components/` 目录
- 工具函数放在 `lib/` 或 `utils/` 目录
- API 路由放在 `app/api/` 目录
- 页面放在 `app/` 目录（App Router）

#### 样式约定
- 使用 Tailwind CSS 工具类
- CSS 变量用于主题颜色管理（`globals.css`）
- 响应式设计：移动端优先
- 使用 Framer Motion 进行动画处理

### Architecture Patterns

#### 组件架构
- **功能组件** - 使用 React Hooks（useState, useEffect, useRef）
- **状态管理** - 本地状态 + LocalStorage 持久化
- **数据流** - 单向数据流，通过 props 传递回调函数

#### 数据持久化策略
1. **前端存储** - LocalStorage（即时存储，用户体验流畅）
2. **服务器备份** - 自动备份到文件系统（防抖机制，1秒延迟）
3. **数据恢复** - 新会话启动时从服务器恢复数据
4. **智能合并** - 时间戳比较 + 冲突解决算法

#### 实时协作架构
- **WebRTC P2P** - 点对点连接，无需服务器中继
- **信令服务器** - 仅用于初始握手（WebSocket）
- **数据通道** - 通过 WebRTC DataChannel 传输数据

#### 部署架构
- **Docker 部署** - 单容器部署，包含完整 Next.js 应用
- **数据卷挂载** - `./data` 目录挂载到容器 `/app/data`
- **Tauri 集成** - 静态导出模式支持桌面应用

### Testing Strategy
- 当前项目未包含测试框架
- 建议添加测试时考虑：
  - 单元测试：工具函数和组件逻辑
  - 集成测试：数据同步和备份流程
  - E2E 测试：关键用户流程（任务创建、定时器、习惯追踪）

### Git Workflow
- 主分支：`main` 或 `master`
- 功能分支：`feature/feature-name`
- 提交信息：使用清晰的描述性信息
- 遵循项目的现有 Git 工作流

## Domain Context

### 核心概念

#### 任务管理
- **任务（Task）** - 用户可以创建、编辑、完成、删除的任务
- **子任务（Subtask）** - 任务的子项，支持嵌套（但子任务不能有子任务）
- **标签（Tag）** - 自定义分类标签，支持颜色编码
- **日期任务** - 任务按日期组织（`dailyTasks[dateString]`）
- **习惯任务** - 从习惯自动生成的每日任务

#### 番茄钟定时器
- **预设时间** - 5、10、25、50 分钟
- **专注时间（focusTime）** - 任务累计的专注时间
- **花费时间（timeSpent）** - 任务累计的总时间
- **超时追踪** - 超过预设时间后的额外时间
- **休息定时器** - 5 分钟休息时间

#### 习惯追踪
- **习惯（Habit）** - 用户定义的重复性行为
- **完成日期（completedDates）** - 习惯完成的日期数组
- **贡献图** - GitHub 风格的 90 天可视化图表
- **强度指示** - 基于完成数量的颜色强度

#### 数据同步
- **用户 ID** - 固定 ID `priospace_user`，所有设备共享
- **数据备份** - 每 10 秒检查变化，自动备份到服务器
- **数据恢复** - 页面加载时从服务器恢复数据
- **冲突解决** - 基于时间戳和完整度得分的智能合并

### 数据模型

#### 任务结构
```javascript
{
  id: string,
  title: string,
  completed: boolean,
  timeSpent: number,      // 分钟
  focusTime: number,     // 分钟
  createdAt: Date,
  tag: string,            // tag ID
  subtasks: Array<Subtask>,
  subtasksExpanded: boolean
}
```

#### 习惯结构
```javascript
{
  id: string,
  name: string,
  completedDates: Array<string>,  // ISO date strings
  tag: string                      // tag ID
}
```

#### 标签结构
```javascript
{
  id: string,
  name: string,
  color: string                    // hex color
}
```

## Important Constraints

### 技术约束
1. **浏览器兼容性** - 需要支持 WebRTC 和 LocalStorage 的现代浏览器
2. **WebRTC 要求** - HTTPS 环境（生产环境）或 localhost（开发环境）
3. **数据大小限制** - LocalStorage 通常限制为 5-10MB
4. **Tauri 限制** - 需要静态导出模式，不支持 SSR

### 业务约束
1. **数据隐私** - 所有数据存储在本地或用户控制的服务器
2. **跨设备同步** - 使用固定用户 ID，所有设备共享数据
3. **实时协作** - 需要信令服务器进行初始握手
4. **数据备份** - 自动备份机制，但用户可手动导出/导入

### 性能约束
1. **防抖机制** - 数据备份使用 1 秒防抖，避免频繁请求
2. **数据合并** - 智能合并算法需要考虑性能
3. **动画性能** - 使用 Framer Motion 优化动画性能

## External Dependencies

### 核心依赖
- **Next.js 15** - React 框架和构建工具
- **React 19** - UI 库
- **Framer Motion** - 动画库
- **Tailwind CSS** - CSS 框架
- **shadcn/ui** - UI 组件库
- **Lucide React** - 图标库

### 运行时依赖
- **Node.js 18+** - 运行时环境
- **WebRTC API** - 浏览器原生 API
- **WebSocket API** - 浏览器原生 API（信令服务器）

### 部署依赖
- **Docker** - 容器化（可选）
- **Tauri CLI** - 桌面应用构建（可选）
- **WebRTC 信令服务器** - 独立 Node.js 服务（`webrtc-server/`）

### 外部服务
- **WebRTC STUN 服务器** - Google STUN 服务器（`stun.l.google.com:19302`）
- **WebRTC 信令服务器** - 默认使用 `wss://api.prio.space`，可配置

### 数据存储
- **文件系统** - 服务器端备份存储（Docker 部署时）
- **浏览器 LocalStorage** - 客户端即时存储

## 特殊注意事项

1. **混合文件类型** - UI 组件为 TypeScript，功能组件为 JavaScript，这是项目约定
2. **数据同步机制** - 多层备份策略（LocalStorage + 服务器备份）
3. **WebRTC P2P** - 协作功能直接在前端实现，无需额外服务器（握手后）
4. **主题系统** - 使用 CSS 变量和 Tailwind 类的混合主题系统
5. **跨设备访问** - Docker 部署后局域网内所有设备都可访问
6. **用户隔离** - 使用固定用户 ID，所有设备和会话共享数据

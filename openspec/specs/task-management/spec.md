# task-management Specification

## Purpose
TBD - created by archiving change add-task-priority-weekly-link. Update Purpose after archive.
## Requirements
### Requirement: 任务优先级数据模型
系统 SHALL 为任务提供优先级字段,支持四级优先级标识。

#### Scenario: 任务数据结构包含优先级字段
- **WHEN** 创建或存储任务数据
- **THEN** 数据结构 SHALL 包含可选的 `priority` 字段
- **AND** priority 值 SHALL 为 "P0", "P1", "P2", "P3" 之一或 undefined
- **AND** P0 表示最高优先级, P3 表示最低优先级
- **AND** undefined 表示未设置优先级

#### Scenario: 向后兼容没有优先级的任务
- **WHEN** 读取没有 priority 字段的旧任务数据
- **THEN** 系统 SHALL 将 priority 视为 undefined
- **AND** 任务 SHALL 正常显示和功能
- **AND** 不应显示优先级徽章

### Requirement: 任务周目标关联数据模型
系统 SHALL 为任务提供周目标关联字段,建立任务与周目标的联系。

#### Scenario: 任务数据结构包含周目标关联字段
- **WHEN** 创建或存储任务数据
- **THEN** 数据结构 SHALL 包含可选的 `weeklyGoalId` 字段
- **AND** weeklyGoalId SHALL 为有效的周目标 ID 字符串或 undefined
- **AND** undefined 表示任务未关联任何周目标

#### Scenario: 关联无效周目标的处理
- **WHEN** 任务的 weeklyGoalId 指向已删除的周目标
- **THEN** 系统 SHALL 在任务显示时提示"关联的目标已删除"
- **AND** 任务 SHALL 仍然可以正常使用
- **AND** 用户 SHALL 能够清除或更新关联

### Requirement: 任务创建时设置优先级
用户 SHALL 能够在创建任务时选择优先级。

#### Scenario: 在任务创建表单中选择优先级
- **WHEN** 用户打开任务创建模态框
- **THEN** 系统 SHALL 显示优先级选择器
- **AND** 选择器 SHALL 包含 P0, P1, P2, P3 和"无"选项
- **AND** 默认选中"无"(不设置优先级)
- **AND** 每个优先级 SHALL 显示对应的颜色标识

#### Scenario: 创建带优先级的任务
- **WHEN** 用户选择优先级后创建任务
- **THEN** 系统 SHALL 将选中的优先级保存到任务的 priority 字段
- **AND** 系统 SHALL 保存到 LocalStorage
- **AND** 系统 SHALL 触发服务器备份

#### Scenario: 创建不设置优先级的任务
- **WHEN** 用户选择"无"或不选择优先级后创建任务
- **THEN** 系统 SHALL 将 priority 字段设置为 undefined
- **AND** 任务 SHALL 正常创建

### Requirement: 任务创建时关联周目标
用户 SHALL 能够在创建任务时选择关联的周目标。

#### Scenario: 在任务创建表单中选择周目标
- **WHEN** 用户打开任务创建模态框
- **THEN** 系统 SHALL 显示周目标关联选择器
- **AND** 选择器 SHALL 列出当前周和未来周的所有周目标
- **AND** 选择器 SHALL 包含"无关联"选项
- **AND** 每个周目标 SHALL 显示标题和所属周数

#### Scenario: 创建关联周目标的任务
- **WHEN** 用户选择周目标后创建任务
- **THEN** 系统 SHALL 将周目标 ID 保存到任务的 weeklyGoalId 字段
- **AND** 系统 SHALL 保存到 LocalStorage
- **AND** 系统 SHALL 触发服务器备份

#### Scenario: 仅显示相关时间范围的周目标
- **WHEN** 用户选择任务日期后查看周目标列表
- **THEN** 系统 SHALL 只显示任务日期所在周及之后的周目标
- **AND** 过去周的周目标 SHALL 不出现在列表中

### Requirement: 任务列表显示优先级
系统 SHALL 在任务列表中以视觉化方式显示任务优先级。

#### Scenario: 显示优先级徽章
- **WHEN** 任务设置了优先级
- **THEN** 系统 SHALL 在任务卡片上显示优先级徽章
- **AND** 徽章 SHALL 显示优先级文本(如 "P0")
- **AND** 徽章 SHALL 使用对应的颜色:
  - P0: 红色 (#ef4444)
  - P1: 橙色 (#f97316)
  - P2: 蓝色 (#3b82f6)
  - P3: 灰色 (#6b7280)

#### Scenario: 不显示未设置优先级的徽章
- **WHEN** 任务没有设置优先级(priority 为 undefined)
- **THEN** 系统 SHALL NOT 显示优先级徽章
- **AND** 任务卡片 SHALL 保持正常布局

#### Scenario: 优先级徽章在不同主题下的显示
- **WHEN** 用户切换主题或深色/浅色模式
- **THEN** 优先级徽章 SHALL 调整颜色对比度以保持可读性
- **AND** 徽章 SHALL 在所有主题下清晰可见

### Requirement: 任务列表显示周目标关联
系统 SHALL 在任务列表中显示任务与周目标的关联关系。

#### Scenario: 显示周目标关联指示器
- **WHEN** 任务关联了周目标
- **THEN** 系统 SHALL 在任务卡片上显示周目标关联图标
- **AND** 悬停或点击图标 SHALL 显示关联的周目标标题
- **AND** 点击关联信息 SHOULD 跳转到周目标视图

#### Scenario: 处理已删除周目标的显示
- **WHEN** 任务关联的周目标已被删除
- **THEN** 系统 SHALL 显示"目标已删除"提示
- **AND** 提示 SHALL 提供清除关联的选项

### Requirement: 任务优先级筛选
用户 SHALL 能够按优先级筛选任务列表。

#### Scenario: 显示优先级筛选器
- **WHEN** 任务列表中有设置优先级的任务
- **THEN** 系统 SHALL 显示优先级筛选控件
- **AND** 筛选器 SHALL 支持多选(可同时选择多个优先级)
- **AND** 筛选器 SHALL 显示每个优先级的任务数量

#### Scenario: 应用优先级筛选
- **WHEN** 用户选择一个或多个优先级
- **THEN** 系统 SHALL 只显示匹配选中优先级的任务
- **AND** 未设置优先级的任务 SHALL 在选中"无"时显示
- **AND** 筛选 SHALL 实时生效,无需刷新

#### Scenario: 清除优先级筛选
- **WHEN** 用户取消所有优先级选择
- **THEN** 系统 SHALL 显示所有任务(不过滤)

### Requirement: 任务优先级排序
系统 SHALL 支持按优先级对任务进行排序。

#### Scenario: 默认按优先级排序
- **WHEN** 任务列表加载时
- **THEN** 系统 SHALL 按以下顺序排序任务:
  1. 未完成任务优先于已完成任务
  2. 优先级高的任务在前(P0 > P1 > P2 > P3 > 无优先级)
  3. 相同优先级内按创建时间降序排列

#### Scenario: 切换排序方式
- **WHEN** 用户选择不同的排序选项
- **THEN** 系统 SHALL 应用新的排序规则
- **AND** 系统 SHALL 保持优先级排序作为可选项之一

### Requirement: 任务编辑优先级
用户 SHALL 能够编辑已存在任务的优先级。

#### Scenario: 在任务编辑界面修改优先级
- **WHEN** 用户打开任务编辑界面
- **THEN** 系统 SHALL 显示当前任务的优先级
- **AND** 用户 SHALL 能够更改优先级
- **AND** 保存后系统 SHALL 更新任务数据

#### Scenario: 快速修改任务优先级
- **WHEN** 用户在任务列表中点击优先级徽章
- **THEN** 系统 SHOULD 显示快速优先级选择器
- **AND** 用户 SHALL 能够直接切换优先级
- **AND** 更改 SHALL 立即生效并保存

### Requirement: 子任务优先级支持
子任务 SHALL 支持独立的优先级设置。

#### Scenario: 子任务拥有独立优先级
- **WHEN** 创建或编辑子任务时
- **THEN** 系统 SHALL 提供与主任务相同的优先级选择器
- **AND** 子任务的优先级 SHALL 独立于父任务
- **AND** 子任务列表 SHALL 显示各自的优先级徽章

#### Scenario: 子任务优先级在排序中的表现
- **WHEN** 按优先级排序时
- **THEN** 子任务 SHALL 跟随父任务显示
- **AND** 父任务内的子任务 SHALL 按自身优先级排序

### Requirement: 习惯优先级支持
习惯 SHALL 支持优先级设置,用于指示习惯的重要程度。

#### Scenario: 习惯数据结构包含优先级
- **WHEN** 创建或编辑习惯时
- **THEN** 系统 SHALL 提供优先级选择器
- **AND** 习惯的 priority 字段 SHALL 遵循与任务相同的规则

#### Scenario: 习惯生成的每日任务继承优先级
- **WHEN** 系统从习惯生成每日任务时
- **THEN** 生成的任务 SHALL 继承习惯的优先级
- **AND** 任务显示时 SHALL 显示对应的优先级徽章

### Requirement: 优先级数据持久化
优先级和周目标关联数据 SHALL 通过现有的 DataStorage 系统持久化。

#### Scenario: LocalStorage 存储新字段
- **WHEN** 任务数据包含 priority 或 weeklyGoalId 字段时
- **THEN** 系统 SHALL 完整保存这些字段到 LocalStorage
- **AND** 字段缺失时 SHALL 保存为 undefined

#### Scenario: 服务器备份包含新字段
- **WHEN** 系统备份任务数据到服务器时
- **THEN** 备份 SHALL 包含 priority 和 weeklyGoalId 字段
- **AND** 备份格式 SHALL 与 LocalStorage 一致

#### Scenario: 数据恢复保留新字段
- **WHEN** 系统从服务器恢复任务数据时
- **THEN** priority 和 weeklyGoalId 字段 SHALL 完整恢复
- **AND** 缺失字段 SHALL 恢复为 undefined

### Requirement: 优先级数据导出和导入
优先级和周目标关联数据 SHALL 包含在数据导出和导入功能中。

#### Scenario: 导出数据包含新字段
- **WHEN** 用户导出应用数据
- **THEN** 导出的 JSON 文件 SHALL 包含任务的 priority 和 weeklyGoalId 字段
- **AND** 数据格式 SHALL 保持向后兼容

#### Scenario: 导入旧版本数据
- **WHEN** 用户导入不包含 priority 字段的旧版本备份
- **THEN** 系统 SHALL 将缺失的字段初始化为 undefined
- **AND** 任务 SHALL 正常恢复并可用

### Requirement: 优先级 UI 样式一致性
优先级相关的 UI 元素 SHALL 在整个应用中保持一致的样式。

#### Scenario: 统一的优先级徽章组件
- **WHEN** 显示优先级徽章时
- **THEN** 系统 SHALL 使用统一的 PriorityBadge 组件
- **AND** 徽章 SHALL 在不同位置使用相同的设计语言
- **AND** 徽章大小 SHALL 根据上下文适配(sm/md/lg)

#### Scenario: 主题兼容性
- **WHEN** 用户切换应用主题时
- **THEN** 优先级徽章 SHALL 自动适配新主题的颜色系统
- **AND** 徽章 SHALL 在深色和浅色模式下都清晰可读

#### Scenario: 响应式设计
- **WHEN** 在不同设备上显示优先级元素时
- **THEN** 优先级徽章和选择器 SHALL 适配屏幕尺寸
- **AND** 移动端 SHALL 使用触摸友好的交互方式


# goal-management Specification Deltas

## MODIFIED Requirements

### Requirement: 年度目标数据模型
系统 SHALL 提供年度目标数据结构,包含目标的所有必要属性、自动进度计算标识和优先级字段。

#### Scenario: 目标数据结构包含完整属性
- **WHEN** 创建或存储年度目标数据
- **THEN** 数据结构 SHALL 包含以下字段:
  - `id`: 唯一标识符(字符串,时间戳生成)
  - `title`: 目标标题(字符串,必填)
  - `description`: 目标描述(字符串,可选)
  - `year`: 目标年份(数字,必填)
  - `completed`: 完成状态(布尔值,默认 false)
  - `progress`: 完成进度(数字,0-100,默认 0)
  - `autoCalculated`: 进度是否为自动计算(布尔值,默认 false)
  - `priority`: 优先级("P0"|"P1"|"P2"|"P3"|undefined,可选)
  - `tag`: 标签 ID(字符串,可选,引用 customTags)
  - `createdAt`: 创建时间(Date 对象)

#### Scenario: 区分手动进度和自动计算进度
- **WHEN** 年度目标数据被读取或显示
- **THEN** 系统 SHALL 根据 autoCalculated 标志区分进度来源
- **AND** autoCalculated 为 true 时,进度 SHALL 显示为"自动计算"
- **AND** autoCalculated 为 false 时,进度 SHALL 显示为"手动设置"

#### Scenario: 向后兼容没有优先级的目标
- **WHEN** 读取没有 priority 字段的旧目标数据
- **THEN** 系统 SHALL 将 priority 视为 undefined
- **AND** 目标 SHALL 正常显示和功能
- **AND** 不应显示优先级徽章

### Requirement: 目标创建功能
用户 SHALL 能够创建新的年度目标,并可选择设置优先级。

#### Scenario: 创建年度目标成功
- **WHEN** 用户填写目标标题和年份,点击"添加目标"按钮
- **THEN** 系统 SHALL 创建新目标,生成唯一 ID,设置当前时间为创建时间
- **AND** 系统 SHALL 将目标添加到 yearlyGoals 数组
- **AND** 系统 SHALL 保存到 LocalStorage
- **AND** 系统 SHALL 触发服务器备份

#### Scenario: 创建目标时设置优先级
- **WHEN** 用户在创建年度目标时选择优先级
- **THEN** 系统 SHALL 将选中的优先级保存到目标的 priority 字段
- **AND** 目标卡片 SHALL 显示对应的优先级徽章

#### Scenario: 创建目标时标题为空
- **WHEN** 用户未填写目标标题就尝试添加
- **THEN** 系统 SHALL 不创建目标
- **AND** 系统 SHOULD 提示用户输入标题

#### Scenario: 创建目标时可选择标签
- **WHEN** 用户选择标签后创建目标
- **THEN** 系统 SHALL 将标签 ID 关联到目标
- **AND** 目标显示时 SHALL 显示对应的标签颜色和名称

### Requirement: 季度目标数据模型
系统 SHALL 提供季度目标数据结构,包含目标的所有必要属性、与年度目标的关联关系和优先级字段。

#### Scenario: 季度目标数据结构包含完整属性
- **WHEN** 创建或存储季度目标数据
- **THEN** 数据结构 SHALL 包含以下字段:
  - `id`: 唯一标识符(字符串,时间戳生成)
  - `title`: 目标标题(字符串,必填)
  - `description`: 目标描述(字符串,可选)
  - `year`: 目标年份(数字,必填)
  - `quarter`: 目标季度(数字,1-4,必填)
  - `completed`: 完成状态(布尔值,默认 false)
  - `progress`: 完成进度(数字,0-100,默认 0)
  - `yearlyGoalId`: 关联的年度目标 ID(字符串,可选)
  - `weight`: 权重占比(数字,0-100,仅当关联年度目标时有效)
  - `priority`: 优先级("P0"|"P1"|"P2"|"P3"|undefined,可选)
  - `tag`: 标签 ID(字符串,可选,引用 customTags)
  - `createdAt`: 创建时间(Date 对象)

## ADDED Requirements

### Requirement: 年度目标优先级显示
系统 SHALL 在年度目标列表和卡片中显示优先级。

#### Scenario: 显示年度目标优先级徽章
- **WHEN** 年度目标设置了优先级
- **THEN** 系统 SHALL 在目标卡片上显示优先级徽章
- **AND** 徽章 SHALL 使用与任务相同的颜色系统
- **AND** 徽章位置 SHALL 在目标卡片的右上角或标题旁

#### Scenario: 按优先级筛选年度目标
- **WHEN** 用户使用优先级筛选器
- **THEN** 系统 SHALL 只显示匹配选中优先级的年度目标
- **AND** 筛选 SHALL 与年份筛选同时生效

### Requirement: 年度目标优先级编辑
用户 SHALL 能够编辑年度目标的优先级。

#### Scenario: 在编辑界面修改优先级
- **WHEN** 用户编辑年度目标时
- **THEN** 系统 SHALL 显示优先级选择器
- **AND** 当前优先级 SHALL 被预选
- **AND** 保存后系统 SHALL 更新目标的 priority 字段

### Requirement: 季度目标优先级显示
系统 SHALL 在季度目标列表和卡片中显示优先级。

#### Scenario: 显示季度目标优先级徽章
- **WHEN** 季度目标设置了优先级
- **THEN** 系统 SHALL 在目标卡片上显示优先级徽章
- **AND** 徽章 SHALL 使用与任务和年度目标相同的样式

#### Scenario: 按优先级筛选季度目标
- **WHEN** 用户使用优先级筛选器
- **THEN** 系统 SHALL 只显示匹配选中优先级的季度目标
- **AND** 筛选 SHALL 与年份和季度筛选同时生效

### Requirement: 季度目标优先级编辑
用户 SHALL 能够在创建和编辑季度目标时设置优先级。

#### Scenario: 创建季度目标时设置优先级
- **WHEN** 用户创建季度目标时选择优先级
- **THEN** 系统 SHALL 保存优先级到 priority 字段
- **AND** 目标卡片 SHALL 立即显示优先级徽章

#### Scenario: 编辑季度目标优先级
- **WHEN** 用户编辑季度目标的优先级
- **THEN** 系统 SHALL 更新 priority 字段
- **AND** 系统 SHALL 保存更改到 LocalStorage 和服务器

### Requirement: 周目标优先级支持
周目标 SHALL 支持与任务和其他目标相同的优先级系统。

#### Scenario: 周目标数据包含优先级字段
- **WHEN** 创建或编辑周目标时
- **THEN** 数据结构 SHALL 包含可选的 `priority` 字段
- **AND** priority 值 SHALL 为 "P0", "P1", "P2", "P3" 之一或 undefined

#### Scenario: 周目标显示优先级徽章
- **WHEN** 周目标设置了优先级
- **THEN** 系统 SHALL 在周目标卡片上显示优先级徽章
- **AND** 徽章 SHALL 使用统一的样式系统

#### Scenario: 按优先级筛选周目标
- **WHEN** 用户使用优先级筛选器
- **THEN** 系统 SHALL 只显示匹配选中优先级的周目标
- **AND** 筛选 SHALL 与年份、季度和周数筛选同时生效

### Requirement: 目标优先级排序
系统 SHALL 支持按优先级对目标进行排序。

#### Scenario: 目标列表按优先级排序
- **WHEN** 用户选择按优先级排序
- **THEN** 系统 SHALL 按以下顺序排列目标:
  1. 未完成目标优先于已完成目标
  2. 优先级高的目标在前(P0 > P1 > P2 > P3 > 无)
  3. 相同优先级内按创建时间排序
- **AND** 排序 SHALL 适用于年度、季度和周目标

#### Scenario: 默认排序包含优先级
- **WHEN** 目标列表初次加载时
- **THEN** 系统 MAY 将优先级作为排序条件之一
- **AND** 高优先级目标 SHOULD 更容易被用户看到

### Requirement: 目标优先级数据持久化
目标的优先级数据 SHALL 通过现有的 DataStorage 系统持久化。

#### Scenario: 保存目标优先级到 LocalStorage
- **WHEN** 年度、季度或周目标包含 priority 字段时
- **THEN** 系统 SHALL 完整保存该字段到 LocalStorage
- **AND** 缺失的 priority 字段 SHALL 保存为 undefined

#### Scenario: 目标优先级服务器备份
- **WHEN** 系统备份目标数据到服务器时
- **THEN** 备份 SHALL 包含 priority 字段
- **AND** 备份格式 SHALL 向后兼容

#### Scenario: 恢复目标优先级数据
- **WHEN** 系统从服务器恢复目标数据时
- **THEN** priority 字段 SHALL 完整恢复
- **AND** 旧数据的缺失字段 SHALL 恢复为 undefined

### Requirement: 目标优先级导出和导入
目标优先级数据 SHALL 包含在数据导出和导入功能中。

#### Scenario: 导出包含目标优先级
- **WHEN** 用户导出应用数据
- **THEN** 导出的 JSON 文件 SHALL 包含所有目标的 priority 字段
- **AND** 格式 SHALL 保持向后兼容

#### Scenario: 导入旧版本目标数据
- **WHEN** 用户导入不包含 priority 字段的旧版本备份
- **THEN** 系统 SHALL 将缺失的 priority 初始化为 undefined
- **AND** 目标 SHALL 正常恢复并可用

### Requirement: 目标优先级 UI 一致性
目标的优先级 UI 元素 SHALL 与任务管理系统保持一致。

#### Scenario: 使用统一的优先级徽章组件
- **WHEN** 显示目标优先级时
- **THEN** 系统 SHALL 使用与任务相同的 PriorityBadge 组件
- **AND** 徽章样式 SHALL 在任务和目标间保持一致

#### Scenario: 优先级选择器一致性
- **WHEN** 创建或编辑目标时显示优先级选择器
- **THEN** 选择器 SHALL 使用与任务创建相同的交互模式
- **AND** 选项、颜色和布局 SHALL 保持一致


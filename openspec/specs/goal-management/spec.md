# goal-management Specification

## Purpose
TBD - created by archiving change add-yearly-goals. Update Purpose after archive.
## Requirements
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

### Requirement: 目标列表显示
系统 SHALL 以列表形式显示所有年度目标，并显示关联的季度目标信息。

#### Scenario: 显示目标列表
- **WHEN** 用户打开年度目标追踪器
- **THEN** 系统 SHALL 显示所有年度目标的列表
- **AND** 每个目标 SHALL 显示标题、描述、进度、标签、年份
- **AND** 目标 SHALL 按年份分组或可按年份筛选
- **AND** 完成的目标 SHALL 有明显的视觉区分（如透明度、删除线等）

#### Scenario: 显示关联的季度目标
- **WHEN** 年度目标关联了季度目标
- **THEN** 系统 SHALL 在目标卡片上显示关联的季度目标数量（如"3 个季度目标"）
- **AND** 系统 SHALL 显示进度来源标识（"自动计算" 标签或图标）
- **AND** 点击关联信息 SHOULD 跳转到季度目标视图并筛选显示相关季度目标

#### Scenario: 年份筛选
- **WHEN** 用户选择特定年份
- **THEN** 系统 SHALL 只显示该年份的目标
- **AND** 系统 SHALL 显示年份切换控件

#### Scenario: 空状态显示
- **WHEN** 当前年份没有任何目标
- **THEN** 系统 SHALL 显示空状态提示
- **AND** 系统 SHALL 引导用户创建第一个目标

### Requirement: 目标进度更新
用户 SHALL 能够手动更新目标的完成进度，但当目标关联了季度目标时，进度由系统自动计算。

#### Scenario: 更新手动进度
- **WHEN** 用户调整未关联季度目标的年度目标进度
- **THEN** 系统 SHALL 更新目标的 progress 字段
- **AND** 系统 SHALL 保持 autoCalculated 为 false
- **AND** 系统 SHALL 立即保存更改到 LocalStorage
- **AND** 系统 SHALL 触发服务器备份

#### Scenario: 禁用自动计算目标的手动进度编辑
- **WHEN** 年度目标关联了至少一个季度目标
- **THEN** 系统 SHALL 禁用进度滑块或输入框
- **AND** 系统 SHALL 显示"进度由关联的季度目标自动计算"提示
- **AND** 系统 SHALL 设置 autoCalculated 为 true
- **AND** 进度编辑控件 SHALL 显示为禁用状态

#### Scenario: 进度达到 100%
- **WHEN** 进度（手动或自动计算）达到 100%
- **THEN** 系统 SHALL 自动将 completed 字段设置为 true
- **AND** 系统 SHOULD 播放完成音效
- **AND** 系统 SHALL 更新目标的视觉状态

#### Scenario: 手动标记为完成
- **WHEN** 用户点击完成按钮或复选框
- **THEN** 系统 SHALL 将 completed 设置为 true
- **AND** 系统 SHALL 将 progress 设置为 100
- **AND** 系统 SHOULD 播放完成音效

### Requirement: 目标编辑功能
用户 SHALL 能够编辑已存在的年度目标。

#### Scenario: 编辑目标信息
- **WHEN** 用户点击目标进入编辑模式
- **THEN** 系统 SHALL 显示编辑表单，预填充当前目标数据
- **AND** 用户 SHALL 能够修改标题、描述、年份、标签
- **AND** 保存后系统 SHALL 更新目标数据
- **AND** 系统 SHALL 保存到 LocalStorage 并触发服务器备份

#### Scenario: 取消编辑
- **WHEN** 用户在编辑过程中点击取消
- **THEN** 系统 SHALL 放弃所有未保存的更改
- **AND** 系统 SHALL 返回到目标列表视图

### Requirement: 目标删除功能
用户 SHALL 能够删除不再需要的年度目标。

#### Scenario: 删除目标
- **WHEN** 用户点击删除按钮
- **THEN** 系统 SHOULD 显示确认提示
- **AND** 用户确认后，系统 SHALL 从 yearlyGoals 数组中移除目标
- **AND** 系统 SHALL 更新 LocalStorage
- **AND** 系统 SHALL 触发服务器备份

#### Scenario: 取消删除
- **WHEN** 用户点击删除后选择取消
- **THEN** 系统 SHALL 不删除目标
- **AND** 系统 SHALL 保持目标列表不变

### Requirement: 数据持久化和同步
年度目标数据 SHALL 通过现有的 DataStorage 系统进行持久化和同步。

#### Scenario: LocalStorage 存储
- **WHEN** 年度目标数据发生变化
- **THEN** 系统 SHALL 在 1 秒防抖延迟后保存到 LocalStorage（键名：`yearlyGoals`）
- **AND** 系统 SHALL 触发服务器备份

#### Scenario: 服务器备份
- **WHEN** LocalStorage 数据更新后
- **THEN** 系统 SHALL 自动备份到服务器 `/app/data/backups/priospace_user/yearlyGoals.json`
- **AND** 备份 SHALL 包含完整的 yearlyGoals 数组和时间戳

#### Scenario: 数据恢复
- **WHEN** 用户在新会话或新设备上打开应用
- **THEN** 系统 SHALL 从服务器恢复 yearlyGoals 数据
- **AND** 系统 SHALL 使用智能合并策略处理本地和服务器数据冲突

#### Scenario: 数据合并
- **WHEN** 本地和服务器都有年度目标数据
- **THEN** 系统 SHALL 合并两边的数据：
  - 按目标 ID 匹配
  - 新目标直接添加
  - 冲突目标以进度更高或更新时间更晚的为准
  - 删除操作以服务器数据为准

### Requirement: 数据导出和导入
年度目标数据 SHALL 包含在应用的数据导出和导入功能中。

#### Scenario: 导出数据包含年度目标
- **WHEN** 用户导出应用数据
- **THEN** 导出的 JSON 文件 SHALL 包含 `yearlyGoals` 字段
- **AND** 数据格式 SHALL 与 LocalStorage 中的格式一致

#### Scenario: 导入数据恢复年度目标
- **WHEN** 用户导入包含 yearlyGoals 的备份文件
- **THEN** 系统 SHALL 恢复所有年度目标
- **AND** 系统 SHALL 保存到 LocalStorage
- **AND** 系统 SHALL 触发服务器备份

#### Scenario: 向后兼容
- **WHEN** 导入不包含 yearlyGoals 的旧版本备份
- **THEN** 系统 SHALL 将 yearlyGoals 初始化为空数组
- **AND** 系统 SHALL 不影响其他数据的恢复

### Requirement: UI 组件集成
年度目标追踪器 SHALL 作为独立模态框组件集成到主应用。

#### Scenario: 打开年度目标追踪器
- **WHEN** 用户点击导航栏或设置中的"年度目标"入口
- **THEN** 系统 SHALL 显示全屏模态框（底部抽屉式）
- **AND** 模态框 SHALL 使用 Framer Motion 动画显示
- **AND** 样式 SHALL 与现有习惯追踪器保持一致

#### Scenario: 关闭年度目标追踪器
- **WHEN** 用户点击关闭按钮或按 ESC 键
- **THEN** 系统 SHALL 隐藏模态框
- **AND** 系统 SHALL 保存所有未保存的更改

#### Scenario: 键盘快捷键
- **WHEN** 用户按下预定义的快捷键（如 Ctrl/Cmd + G）
- **THEN** 系统 SHALL 打开年度目标追踪器

### Requirement: 主题和样式兼容性
年度目标组件 SHALL 完全兼容现有的主题系统。

#### Scenario: 主题切换
- **WHEN** 用户切换主题（4 种主题之一）
- **THEN** 年度目标组件 SHALL 应用相应的主题颜色
- **AND** 所有 UI 元素 SHALL 使用 CSS 变量和 Tailwind 类

#### Scenario: 深色/浅色模式
- **WHEN** 用户切换深色或浅色模式
- **THEN** 年度目标组件 SHALL 正确显示对应模式的颜色
- **AND** 可读性 SHALL 在所有模式下保持良好

#### Scenario: 响应式设计
- **WHEN** 用户在不同设备上访问（移动端、平板、桌面）
- **THEN** 年度目标组件 SHALL 适配屏幕尺寸
- **AND** 布局 SHALL 在所有尺寸下保持可用性

### Requirement: 标签系统集成
年度目标 SHALL 能够使用现有的自定义标签系统。

#### Scenario: 选择现有标签
- **WHEN** 用户创建或编辑目标时
- **THEN** 系统 SHALL 显示所有可用的自定义标签
- **AND** 用户 SHALL 能够选择一个标签关联到目标

#### Scenario: 创建新标签
- **WHEN** 用户在年度目标界面中创建新标签
- **THEN** 系统 SHALL 调用 onAddCustomTag 函数
- **AND** 新标签 SHALL 立即可用于当前目标
- **AND** 新标签 SHALL 在所有功能（任务、习惯、目标）中可用

#### Scenario: 显示标签
- **WHEN** 目标关联了标签
- **THEN** 系统 SHALL 在目标卡片上显示标签徽章
- **AND** 徽章 SHALL 使用标签定义的颜色
- **AND** 徽章 SHALL 显示标签名称

### Requirement: 动画和音效
年度目标功能 SHALL 提供流畅的动画和适当的音频反馈。

#### Scenario: 目标列表动画
- **WHEN** 目标列表加载或更新时
- **THEN** 系统 SHALL 使用 Framer Motion 提供渐入动画
- **AND** 列表项 SHALL 有交错延迟动画效果

#### Scenario: 完成音效
- **WHEN** 用户标记目标为完成或进度达到 100%
- **THEN** 系统 SHALL 播放完成音效（`/music/complete.mp3`）
- **AND** 音量 SHALL 与其他音效保持一致（0.3）

#### Scenario: 交互动画
- **WHEN** 用户与目标卡片交互（点击、悬停）
- **THEN** 系统 SHALL 提供微妙的缩放或高亮动画
- **AND** 动画 SHALL 与现有任务列表动画风格一致

### Requirement: 季度目标数据模型
系统 SHALL 提供季度目标数据结构，包含目标的所有必要属性，并支持自动进度计算标识。

#### Scenario: 目标数据结构包含完整属性
- **WHEN** 创建或存储季度目标数据
- **THEN** 数据结构 SHALL 包含以下字段：
  - `id`: 唯一标识符（字符串，时间戳生成）
  - `title`: 目标标题（字符串，必填）
  - `description`: 目标描述（字符串，可选）
  - `year`: 目标年份（数字，必填）
  - `quarter`: 目标季度（数字，1-4，必填）
  - `completed`: 完成状态（布尔值，默认 false）
  - `progress`: 完成进度（数字，0-100，默认 0）
  - `autoCalculated`: 进度是否为自动计算（布尔值，默认 false）
  - `yearlyGoalId`: 关联的年度目标 ID（字符串，可选）
  - `weight`: 权重占比（数字，0-100，仅当关联年度目标时有效）
  - `tag`: 标签 ID（字符串，可选，引用 customTags）
  - `createdAt`: 创建时间（Date 对象）

#### Scenario: 区分手动进度和自动计算进度
- **WHEN** 季度目标数据被读取或显示
- **THEN** 系统 SHALL 根据 autoCalculated 标志区分进度来源
- **AND** autoCalculated 为 true 时，进度 SHALL 显示为"自动计算"
- **AND** autoCalculated 为 false 时，进度 SHALL 显示为"手动设置"

### Requirement: 季度目标创建功能
用户 SHALL 能够创建新的季度目标，并可选择关联到年度目标。

#### Scenario: 创建季度目标成功
- **WHEN** 用户填写目标标题、年份和季度，点击"添加目标"按钮
- **THEN** 系统 SHALL 创建新季度目标，生成唯一 ID，设置当前时间为创建时间
- **AND** 系统 SHALL 将目标添加到 quarterlyGoals 数组
- **AND** 系统 SHALL 保存到 LocalStorage
- **AND** 系统 SHALL 触发服务器备份

#### Scenario: 创建季度目标时关联年度目标
- **WHEN** 用户选择关联到某个年度目标并设置权重
- **THEN** 系统 SHALL 将 yearlyGoalId 和 weight 保存到季度目标
- **AND** 系统 SHALL 触发关联的年度目标进度重新计算
- **AND** 系统 SHALL 更新年度目标的 progress 和 autoCalculated 标志

#### Scenario: 创建季度目标时标题为空
- **WHEN** 用户未填写目标标题就尝试添加
- **THEN** 系统 SHALL 不创建目标
- **AND** 系统 SHOULD 提示用户输入标题

#### Scenario: 创建季度目标时选择季度
- **WHEN** 用户选择季度（Q1、Q2、Q3、Q4）
- **THEN** 系统 SHALL 将 quarter 字段设置为对应的数字（1、2、3、4）
- **AND** 目标 SHALL 在对应季度的列表中显示

### Requirement: 季度目标列表显示
系统 SHALL 以列表形式显示所有季度目标，并显示关联的周目标信息。

#### Scenario: 显示目标列表
- **WHEN** 用户打开季度目标追踪器
- **THEN** 系统 SHALL 显示所有季度目标的列表
- **AND** 每个目标 SHALL 显示标题、描述、进度、权重（如果关联）、关联的年度目标、标签、季度
- **AND** 目标 SHALL 按年份和季度分组或可按年份和季度筛选
- **AND** 完成的目标 SHALL 有明显的视觉区分

#### Scenario: 显示关联的周目标
- **WHEN** 季度目标关联了周目标
- **THEN** 系统 SHALL 在目标卡片上显示关联的周目标数量（如"5 个周目标"）
- **AND** 系统 SHALL 显示进度来源标识（"自动计算" 标签或图标）
- **AND** 点击关联信息 SHOULD 跳转到周目标视图并筛选显示相关周目标

#### Scenario: 季度筛选
- **WHEN** 用户选择特定季度（Q1-Q4）
- **THEN** 系统 SHALL 只显示该季度的目标
- **AND** 系统 SHALL 显示季度切换控件

#### Scenario: 年份筛选
- **WHEN** 用户选择特定年份
- **THEN** 系统 SHALL 只显示该年份的目标
- **AND** 系统 SHALL 显示年份切换控件

#### Scenario: 空状态显示
- **WHEN** 当前季度没有任何目标
- **THEN** 系统 SHALL 显示空状态提示
- **AND** 系统 SHALL 引导用户创建第一个季度目标

### Requirement: 季度目标进度更新
用户 SHALL 能够手动更新目标的完成进度，但当目标关联了周目标时，进度由系统自动计算。

#### Scenario: 更新手动进度
- **WHEN** 用户调整未关联周目标的季度目标进度
- **THEN** 系统 SHALL 更新目标的 progress 字段
- **AND** 系统 SHALL 保持 autoCalculated 为 false
- **AND** 系统 SHALL 立即保存更改到 LocalStorage
- **AND** 系统 SHALL 触发服务器备份
- **AND** 如果季度目标关联了年度目标，系统 SHALL 触发年度目标进度重新计算

#### Scenario: 禁用自动计算目标的手动进度编辑
- **WHEN** 季度目标关联了至少一个周目标
- **THEN** 系统 SHALL 禁用进度滑块或输入框
- **AND** 系统 SHALL 显示"进度由关联的周目标自动计算"提示
- **AND** 系统 SHALL 设置 autoCalculated 为 true
- **AND** 进度编辑控件 SHALL 显示为禁用状态

#### Scenario: 进度达到 100%
- **WHEN** 进度（手动或自动计算）达到 100%
- **THEN** 系统 SHALL 自动将 completed 字段设置为 true
- **AND** 系统 SHOULD 播放完成音效
- **AND** 系统 SHALL 更新目标的视觉状态

#### Scenario: 手动标记为完成
- **WHEN** 用户点击完成按钮或复选框
- **THEN** 系统 SHALL 将 completed 设置为 true
- **AND** 系统 SHALL 将 progress 设置为 100
- **AND** 系统 SHOULD 播放完成音效
- **AND** 如果季度目标关联了年度目标，系统 SHALL 触发年度目标进度重新计算

### Requirement: 季度目标编辑功能
用户 SHALL 能够编辑已存在的季度目标，包括修改关联的年度目标和权重。

#### Scenario: 编辑季度目标信息
- **WHEN** 用户点击季度目标进入编辑模式
- **THEN** 系统 SHALL 显示编辑表单，预填充当前目标数据
- **AND** 用户 SHALL 能够修改标题、描述、年份、季度、关联年度目标、权重、标签
- **AND** 保存后系统 SHALL 更新目标数据
- **AND** 系统 SHALL 保存到 LocalStorage 并触发服务器备份

#### Scenario: 修改关联的年度目标
- **WHEN** 用户修改季度目标关联的年度目标
- **THEN** 系统 SHALL 触发原关联年度目标的进度重新计算（移除该季度目标的权重）
- **AND** 系统 SHALL 触发新关联年度目标的进度重新计算（加入该季度目标的权重）
- **AND** 系统 SHALL 更新两个年度目标的数据

#### Scenario: 解除年度目标关联
- **WHEN** 用户将关联的年度目标设置为"无"
- **THEN** 系统 SHALL 清除 yearlyGoalId 和 weight 字段
- **AND** 系统 SHALL 触发原关联年度目标的进度重新计算
- **AND** 季度目标 SHALL 作为独立目标显示

#### Scenario: 取消编辑
- **WHEN** 用户在编辑过程中点击取消
- **THEN** 系统 SHALL 放弃所有未保存的更改
- **AND** 系统 SHALL 返回到季度目标列表视图

### Requirement: 季度目标删除功能
用户 SHALL 能够删除不再需要的季度目标，删除后自动更新关联的年度目标进度。

#### Scenario: 删除季度目标
- **WHEN** 用户点击删除按钮
- **THEN** 系统 SHOULD 显示确认提示
- **AND** 如果季度目标关联了年度目标，提示 SHALL 说明会影响年度目标进度
- **AND** 用户确认后，系统 SHALL 从 quarterlyGoals 数组中移除目标
- **AND** 系统 SHALL 更新 LocalStorage
- **AND** 系统 SHALL 触发服务器备份
- **AND** 如果关联了年度目标，系统 SHALL 触发年度目标进度重新计算

#### Scenario: 取消删除
- **WHEN** 用户点击删除后选择取消
- **THEN** 系统 SHALL 不删除目标
- **AND** 系统 SHALL 保持季度目标列表不变

### Requirement: 年度目标自动进度计算
系统 SHALL 根据关联的季度目标自动计算年度目标的进度，使用加权平均算法。

#### Scenario: 计算单个关联季度目标的进度
- **WHEN** 年度目标只关联了一个季度目标
- **THEN** 系统 SHALL 将年度目标进度设置为该季度目标的进度
- **AND** 系统 SHALL 忽略权重设置（权重视为 100%）

#### Scenario: 计算多个关联季度目标的加权平均进度
- **WHEN** 年度目标关联了多个季度目标
- **THEN** 系统 SHALL 根据每个季度目标的权重和进度计算加权平均值
- **AND** 公式为：`年度进度 = Σ(季度目标进度 × 权重) / Σ(权重)`
- **AND** 系统 SHALL 将计算结果设置为年度目标的 progress

#### Scenario: 权重归一化处理
- **WHEN** 关联季度目标的权重总和不等于 100
- **THEN** 系统 SHALL 自动归一化权重（每个权重除以总和再乘以 100）
- **AND** 系统 SHALL 使用归一化后的权重进行计算
- **AND** 系统 SHOULD 在 UI 中提示用户权重已归一化

#### Scenario: 没有关联季度目标时使用手动进度
- **WHEN** 年度目标没有关联任何季度目标
- **THEN** 系统 SHALL 使用用户手动设置的进度
- **AND** 系统 SHALL 允许用户编辑进度
- **AND** autoCalculated 标志 SHALL 为 false

#### Scenario: 有关联季度目标时禁用手动进度
- **WHEN** 年度目标关联了至少一个季度目标
- **THEN** 系统 SHALL 禁用手动进度编辑
- **AND** 系统 SHALL 显示"自动计算"标识
- **AND** autoCalculated 标志 SHALL 为 true
- **AND** 系统 SHALL 在 UI 中显示进度来源（关联的季度目标）

### Requirement: 季度目标数据持久化和同步
季度目标数据 SHALL 通过现有的 DataStorage 系统进行持久化和同步。

#### Scenario: LocalStorage 存储
- **WHEN** 季度目标数据发生变化
- **THEN** 系统 SHALL 在 1 秒防抖延迟后保存到 LocalStorage（键名：`quarterlyGoals`）
- **AND** 系统 SHALL 触发服务器备份

#### Scenario: 服务器备份
- **WHEN** LocalStorage 数据更新后
- **THEN** 系统 SHALL 自动备份到服务器 `/app/data/backups/priospace_user/quarterlyGoals.json`
- **AND** 备份 SHALL 包含完整的 quarterlyGoals 数组和时间戳

#### Scenario: 数据恢复
- **WHEN** 用户在新会话或新设备上打开应用
- **THEN** 系统 SHALL 从服务器恢复 quarterlyGoals 数据
- **AND** 系统 SHALL 使用智能合并策略处理本地和服务器数据冲突

#### Scenario: 数据合并
- **WHEN** 本地和服务器都有季度目标数据
- **THEN** 系统 SHALL 合并两边的数据：
  - 按目标 ID 匹配
  - 新目标直接添加
  - 冲突目标以进度更高或更新时间更晚的为准
  - 删除操作以服务器数据为准

### Requirement: 季度目标数据导出和导入
季度目标数据 SHALL 包含在应用的数据导出和导入功能中。

#### Scenario: 导出数据包含季度目标
- **WHEN** 用户导出应用数据
- **THEN** 导出的 JSON 文件 SHALL 包含 `quarterlyGoals` 字段
- **AND** 数据格式 SHALL 与 LocalStorage 中的格式一致

#### Scenario: 导入数据恢复季度目标
- **WHEN** 用户导入包含 quarterlyGoals 的备份文件
- **THEN** 系统 SHALL 恢复所有季度目标
- **AND** 系统 SHALL 保存到 LocalStorage
- **AND** 系统 SHALL 触发服务器备份
- **AND** 系统 SHALL 重新计算所有关联年度目标的进度

#### Scenario: 向后兼容
- **WHEN** 导入不包含 quarterlyGoals 的旧版本备份
- **THEN** 系统 SHALL 将 quarterlyGoals 初始化为空数组
- **AND** 系统 SHALL 不影响其他数据的恢复

### Requirement: 季度目标 UI 组件集成
季度目标追踪器 SHALL 作为独立模态框组件集成到主应用。

#### Scenario: 打开季度目标追踪器
- **WHEN** 用户点击导航栏或设置中的"季度目标"入口
- **THEN** 系统 SHALL 显示全屏模态框（底部抽屉式）
- **AND** 模态框 SHALL 使用 Framer Motion 动画显示
- **AND** 样式 SHALL 与现有年度目标追踪器保持一致

#### Scenario: 关闭季度目标追踪器
- **WHEN** 用户点击关闭按钮或按 ESC 键
- **THEN** 系统 SHALL 隐藏模态框
- **AND** 系统 SHALL 保存所有未保存的更改

#### Scenario: 键盘快捷键
- **WHEN** 用户按下预定义的快捷键（如 Ctrl/Cmd + Q）
- **THEN** 系统 SHALL 打开季度目标追踪器

### Requirement: 季度目标主题和样式兼容性
季度目标组件 SHALL 完全兼容现有的主题系统。

#### Scenario: 主题切换
- **WHEN** 用户切换主题（4 种主题之一）
- **THEN** 季度目标组件 SHALL 应用相应的主题颜色
- **AND** 所有 UI 元素 SHALL 使用 CSS 变量和 Tailwind 类

#### Scenario: 深色/浅色模式
- **WHEN** 用户切换深色或浅色模式
- **THEN** 季度目标组件 SHALL 正确显示对应模式的颜色
- **AND** 可读性 SHALL 在所有模式下保持良好

#### Scenario: 响应式设计
- **WHEN** 用户在不同设备上访问（移动端、平板、桌面）
- **THEN** 季度目标组件 SHALL 适配屏幕尺寸
- **AND** 布局 SHALL 在所有尺寸下保持可用性

### Requirement: 季度目标标签系统集成
季度目标 SHALL 能够使用现有的自定义标签系统。

#### Scenario: 选择现有标签
- **WHEN** 用户创建或编辑季度目标时
- **THEN** 系统 SHALL 显示所有可用的自定义标签
- **AND** 用户 SHALL 能够选择一个标签关联到目标

#### Scenario: 创建新标签
- **WHEN** 用户在季度目标界面中创建新标签
- **THEN** 系统 SHALL 调用 onAddCustomTag 函数
- **AND** 新标签 SHALL 立即可用于当前目标
- **AND** 新标签 SHALL 在所有功能（任务、习惯、年度目标、季度目标）中可用

#### Scenario: 显示标签
- **WHEN** 季度目标关联了标签
- **THEN** 系统 SHALL 在目标卡片上显示标签徽章
- **AND** 徽章 SHALL 使用标签定义的颜色
- **AND** 徽章 SHALL 显示标签名称

### Requirement: 季度目标动画和音效
季度目标功能 SHALL 提供流畅的动画和适当的音频反馈。

#### Scenario: 目标列表动画
- **WHEN** 季度目标列表加载或更新时
- **THEN** 系统 SHALL 使用 Framer Motion 提供渐入动画
- **AND** 列表项 SHALL 有交错延迟动画效果

#### Scenario: 完成音效
- **WHEN** 用户标记季度目标为完成或进度达到 100%
- **THEN** 系统 SHALL 播放完成音效（`/music/complete.mp3`）
- **AND** 音量 SHALL 与其他音效保持一致（0.3）

#### Scenario: 交互动画
- **WHEN** 用户与季度目标卡片交互（点击、悬停）
- **THEN** 系统 SHALL 提供微妙的缩放或高亮动画
- **AND** 动画 SHALL 与现有任务列表动画风格一致

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

### Requirement: 周目标数据模型
系统 SHALL 提供周目标数据结构，包含目标的所有必要属性和与季度目标的关联关系。

#### Scenario: 周目标数据结构包含完整属性
- **WHEN** 创建或存储周目标数据
- **THEN** 数据结构 SHALL 包含以下字段：
  - `id`: 唯一标识符（字符串，时间戳生成）
  - `title`: 目标标题（字符串，必填）
  - `description`: 目标描述（字符串，可选）
  - `year`: 目标年份（数字，必填）
  - `quarter`: 目标季度（数字，1-4，必填）
  - `week`: 目标周数（数字，1-52，全局周数）
  - `completed`: 完成状态（布尔值，默认 false）
  - `progress`: 完成进度（数字，0-100，默认 0）
  - `quarterlyGoalId`: 关联的季度目标 ID（字符串，可选）
  - `weight`: 权重占比（数字，0-100，仅当关联季度目标时有效）
  - `tag`: 标签 ID（字符串，可选，引用 customTags）
  - `createdAt`: 创建时间（Date 对象）

### Requirement: 周目标创建功能
用户 SHALL 能够创建新的周目标，并可选择关联到季度目标。

#### Scenario: 创建周目标成功
- **WHEN** 用户填写目标标题、年份、季度和周数，点击"添加目标"按钮
- **THEN** 系统 SHALL 创建新周目标，生成唯一 ID，设置当前时间为创建时间
- **AND** 系统 SHALL 将目标添加到 weeklyGoals 数组
- **AND** 系统 SHALL 保存到 LocalStorage
- **AND** 系统 SHALL 触发服务器备份

#### Scenario: 创建周目标时关联季度目标
- **WHEN** 用户选择关联到某个季度目标并设置权重
- **THEN** 系统 SHALL 将 quarterlyGoalId 和 weight 保存到周目标
- **AND** 系统 SHALL 触发关联的季度目标进度重新计算
- **AND** 系统 SHALL 更新季度目标的 progress 和 autoCalculated 标志
- **AND** 如果季度目标关联了年度目标，系统 SHALL 触发年度目标进度重新计算

#### Scenario: 创建周目标时标题为空
- **WHEN** 用户未填写目标标题就尝试添加
- **THEN** 系统 SHALL 不创建目标
- **AND** 系统 SHOULD 提示用户输入标题

#### Scenario: 创建周目标时选择周数
- **WHEN** 用户选择周数（1-52 或季度内周数 1-13）
- **THEN** 系统 SHALL 将 week 字段设置为对应的全局周数（1-52）
- **AND** 目标 SHALL 在对应周数的列表中显示
- **AND** UI SHALL 显示季度内周数（如"Q1 第 3 周"）以便用户理解

### Requirement: 周目标列表显示
系统 SHALL 以列表形式显示周目标，支持按年份、季度和周数筛选。

#### Scenario: 显示周目标列表
- **WHEN** 用户打开周目标追踪器
- **THEN** 系统 SHALL 显示当前年份、季度和周数的所有周目标
- **AND** 每个目标 SHALL 显示标题、描述、进度、权重（如果关联）、关联的季度目标、标签、周数
- **AND** 完成的目标 SHALL 有明显的视觉区分

#### Scenario: 周数筛选
- **WHEN** 用户选择特定周数
- **THEN** 系统 SHALL 只显示该周的目标
- **AND** 系统 SHALL 显示周数切换控件（支持上一周/下一周导航）

#### Scenario: 季度筛选
- **WHEN** 用户选择特定季度（Q1-Q4）
- **THEN** 系统 SHALL 只显示该季度的目标
- **AND** 系统 SHALL 显示季度切换控件
- **AND** 周数选择器 SHALL 显示该季度内的周数（1-13）

#### Scenario: 年份筛选
- **WHEN** 用户选择特定年份
- **THEN** 系统 SHALL 只显示该年份的目标
- **AND** 系统 SHALL 显示年份切换控件

#### Scenario: 显示关联的季度目标
- **WHEN** 周目标关联了季度目标
- **THEN** 系统 SHALL 在周目标卡片上显示关联的季度目标标题
- **AND** 系统 SHALL 显示该周目标的权重占比
- **AND** 点击季度目标标题 SHOULD 跳转到季度目标视图

#### Scenario: 空状态显示
- **WHEN** 当前周没有任何目标
- **THEN** 系统 SHALL 显示空状态提示
- **AND** 系统 SHALL 引导用户创建第一个周目标

### Requirement: 周目标进度更新
用户 SHALL 能够手动更新周目标的完成进度，更新后自动触发关联季度目标的进度计算。

#### Scenario: 更新进度百分比
- **WHEN** 用户调整进度滑块或输入进度值（0-100）
- **THEN** 系统 SHALL 更新周目标的 progress 字段
- **AND** 系统 SHALL 立即保存更改到 LocalStorage
- **AND** 系统 SHALL 触发服务器备份
- **AND** 如果周目标关联了季度目标，系统 SHALL 触发季度目标进度重新计算
- **AND** 如果季度目标关联了年度目标，系统 SHALL 触发年度目标进度重新计算（级联更新）

#### Scenario: 进度达到 100%
- **WHEN** 用户将进度设置为 100%
- **THEN** 系统 SHALL 自动将 completed 字段设置为 true
- **AND** 系统 SHOULD 播放完成音效
- **AND** 系统 SHALL 更新目标的视觉状态
- **AND** 如果关联了季度目标，系统 SHALL 更新季度目标进度
- **AND** 如果季度目标关联了年度目标，系统 SHALL 更新年度目标进度

#### Scenario: 手动标记为完成
- **WHEN** 用户点击完成按钮或复选框
- **THEN** 系统 SHALL 将 completed 设置为 true
- **AND** 系统 SHALL 将 progress 设置为 100
- **AND** 系统 SHOULD 播放完成音效
- **AND** 如果关联了季度目标，系统 SHALL 更新季度目标进度
- **AND** 如果季度目标关联了年度目标，系统 SHALL 更新年度目标进度

### Requirement: 周目标编辑功能
用户 SHALL 能够编辑已存在的周目标，包括修改关联的季度目标和权重。

#### Scenario: 编辑周目标信息
- **WHEN** 用户点击周目标进入编辑模式
- **THEN** 系统 SHALL 显示编辑表单，预填充当前目标数据
- **AND** 用户 SHALL 能够修改标题、描述、年份、季度、周数、关联季度目标、权重、标签
- **AND** 保存后系统 SHALL 更新目标数据
- **AND** 系统 SHALL 保存到 LocalStorage 并触发服务器备份

#### Scenario: 修改关联的季度目标
- **WHEN** 用户修改周目标关联的季度目标
- **THEN** 系统 SHALL 触发原关联季度目标的进度重新计算（移除该周目标的权重）
- **AND** 系统 SHALL 触发新关联季度目标的进度重新计算（加入该周目标的权重）
- **AND** 系统 SHALL 更新两个季度目标的数据
- **AND** 如果季度目标关联了年度目标，系统 SHALL 触发年度目标进度重新计算

#### Scenario: 解除季度目标关联
- **WHEN** 用户将关联的季度目标设置为"无"
- **THEN** 系统 SHALL 清除 quarterlyGoalId 和 weight 字段
- **AND** 系统 SHALL 触发原关联季度目标的进度重新计算
- **AND** 周目标 SHALL 作为独立目标显示

#### Scenario: 取消编辑
- **WHEN** 用户在编辑过程中点击取消
- **THEN** 系统 SHALL 放弃所有未保存的更改
- **AND** 系统 SHALL 返回到周目标列表视图

### Requirement: 周目标删除功能
用户 SHALL 能够删除不再需要的周目标，删除后自动更新关联的季度目标进度。

#### Scenario: 删除周目标
- **WHEN** 用户点击删除按钮
- **THEN** 系统 SHOULD 显示确认提示
- **AND** 如果周目标关联了季度目标，提示 SHALL 说明会影响季度目标进度
- **AND** 用户确认后，系统 SHALL 从 weeklyGoals 数组中移除目标
- **AND** 系统 SHALL 更新 LocalStorage
- **AND** 系统 SHALL 触发服务器备份
- **AND** 如果关联了季度目标，系统 SHALL 触发季度目标进度重新计算
- **AND** 如果季度目标关联了年度目标，系统 SHALL 触发年度目标进度重新计算

#### Scenario: 取消删除
- **WHEN** 用户点击删除后选择取消
- **THEN** 系统 SHALL 不删除目标
- **AND** 系统 SHALL 保持周目标列表不变

### Requirement: 季度目标自动进度计算
系统 SHALL 根据关联的周目标自动计算季度目标的进度，使用加权平均算法。

#### Scenario: 计算单个关联周目标的进度
- **WHEN** 季度目标只关联了一个周目标
- **THEN** 系统 SHALL 将季度目标进度设置为该周目标的进度
- **AND** 系统 SHALL 忽略权重设置（权重视为 100%）

#### Scenario: 计算多个关联周目标的加权平均进度
- **WHEN** 季度目标关联了多个周目标
- **THEN** 系统 SHALL 根据每个周目标的权重和进度计算加权平均值
- **AND** 公式为：`季度进度 = Σ(周目标进度 × 权重) / Σ(权重)`
- **AND** 系统 SHALL 将计算结果设置为季度目标的 progress

#### Scenario: 权重归一化处理
- **WHEN** 关联周目标的权重总和不等于 100
- **THEN** 系统 SHALL 自动归一化权重（每个权重除以总和再乘以 100）
- **AND** 系统 SHALL 使用归一化后的权重进行计算
- **AND** 系统 SHOULD 在 UI 中提示用户权重已归一化

#### Scenario: 没有关联周目标时使用手动进度
- **WHEN** 季度目标没有关联任何周目标
- **THEN** 系统 SHALL 使用用户手动设置的进度
- **AND** 系统 SHALL 允许用户编辑进度
- **AND** autoCalculated 标志 SHALL 为 false

#### Scenario: 有关联周目标时禁用手动进度
- **WHEN** 季度目标关联了至少一个周目标
- **THEN** 系统 SHALL 禁用手动进度编辑
- **AND** 系统 SHALL 显示"自动计算"标识
- **AND** autoCalculated 标志 SHALL 为 true
- **AND** 系统 SHALL 在 UI 中显示进度来源（关联的周目标）

#### Scenario: 级联更新到年度目标
- **WHEN** 季度目标进度因周目标变化而更新
- **AND** 季度目标关联了年度目标
- **THEN** 系统 SHALL 触发年度目标进度重新计算
- **AND** 年度目标进度 SHALL 根据关联的所有季度目标的加权平均值更新

### Requirement: 周目标数据持久化和同步
周目标数据 SHALL 通过现有的 DataStorage 系统进行持久化和同步。

#### Scenario: LocalStorage 存储
- **WHEN** 周目标数据发生变化
- **THEN** 系统 SHALL 在 1 秒防抖延迟后保存到 LocalStorage（键名：`weeklyGoals`）
- **AND** 系统 SHALL 触发服务器备份

#### Scenario: 服务器备份
- **WHEN** LocalStorage 数据更新后
- **THEN** 系统 SHALL 自动备份到服务器 `/app/data/backups/priospace_user/weeklyGoals.json`
- **AND** 备份 SHALL 包含完整的 weeklyGoals 数组和时间戳

#### Scenario: 数据恢复
- **WHEN** 用户在新会话或新设备上打开应用
- **THEN** 系统 SHALL 从服务器恢复 weeklyGoals 数据
- **AND** 系统 SHALL 使用智能合并策略处理本地和服务器数据冲突

#### Scenario: 数据合并
- **WHEN** 本地和服务器都有周目标数据
- **THEN** 系统 SHALL 合并两边的数据：
  - 按目标 ID 匹配
  - 新目标直接添加
  - 冲突目标以进度更高或更新时间更晚的为准
  - 删除操作以服务器数据为准

### Requirement: 周目标数据导出和导入
周目标数据 SHALL 包含在应用的数据导出和导入功能中。

#### Scenario: 导出数据包含周目标
- **WHEN** 用户导出应用数据
- **THEN** 导出的 JSON 文件 SHALL 包含 `weeklyGoals` 字段
- **AND** 数据格式 SHALL 与 LocalStorage 中的格式一致

#### Scenario: 导入数据恢复周目标
- **WHEN** 用户导入包含 weeklyGoals 的备份文件
- **THEN** 系统 SHALL 恢复所有周目标
- **AND** 系统 SHALL 保存到 LocalStorage
- **AND** 系统 SHALL 触发服务器备份
- **AND** 系统 SHALL 重新计算所有关联季度目标和年度目标的进度

#### Scenario: 向后兼容
- **WHEN** 导入不包含 weeklyGoals 的旧版本备份
- **THEN** 系统 SHALL 将 weeklyGoals 初始化为空数组
- **AND** 系统 SHALL 不影响其他数据的恢复

### Requirement: 周目标 UI 组件集成
周目标追踪器 SHALL 作为独立模态框组件集成到主应用。

#### Scenario: 打开周目标追踪器
- **WHEN** 用户点击导航栏或设置中的"周目标"入口
- **THEN** 系统 SHALL 显示全屏模态框（底部抽屉式）
- **AND** 模态框 SHALL 使用 Framer Motion 动画显示
- **AND** 样式 SHALL 与现有季度目标追踪器保持一致

#### Scenario: 关闭周目标追踪器
- **WHEN** 用户点击关闭按钮或按 ESC 键
- **THEN** 系统 SHALL 隐藏模态框
- **AND** 系统 SHALL 保存所有未保存的更改

#### Scenario: 键盘快捷键
- **WHEN** 用户按下预定义的快捷键（如 Ctrl/Cmd + W）
- **THEN** 系统 SHALL 打开周目标追踪器

### Requirement: 周目标主题和样式兼容性
周目标组件 SHALL 完全兼容现有的主题系统。

#### Scenario: 主题切换
- **WHEN** 用户切换主题（4 种主题之一）
- **THEN** 周目标组件 SHALL 应用相应的主题颜色
- **AND** 所有 UI 元素 SHALL 使用 CSS 变量和 Tailwind 类

#### Scenario: 深色/浅色模式
- **WHEN** 用户切换深色或浅色模式
- **THEN** 周目标组件 SHALL 正确显示对应模式的颜色
- **AND** 可读性 SHALL 在所有模式下保持良好

#### Scenario: 响应式设计
- **WHEN** 用户在不同设备上访问（移动端、平板、桌面）
- **THEN** 周目标组件 SHALL 适配屏幕尺寸
- **AND** 布局 SHALL 在所有尺寸下保持可用性

### Requirement: 周目标标签系统集成
周目标 SHALL 能够使用现有的自定义标签系统。

#### Scenario: 选择现有标签
- **WHEN** 用户创建或编辑周目标时
- **THEN** 系统 SHALL 显示所有可用的自定义标签
- **AND** 用户 SHALL 能够选择一个标签关联到目标

#### Scenario: 创建新标签
- **WHEN** 用户在周目标界面中创建新标签
- **THEN** 系统 SHALL 调用 onAddCustomTag 函数
- **AND** 新标签 SHALL 立即可用于当前目标
- **AND** 新标签 SHALL 在所有功能（任务、习惯、年度目标、季度目标、周目标）中可用

#### Scenario: 显示标签
- **WHEN** 周目标关联了标签
- **THEN** 系统 SHALL 在目标卡片上显示标签徽章
- **AND** 徽章 SHALL 使用标签定义的颜色
- **AND** 徽章 SHALL 显示标签名称

### Requirement: 周目标动画和音效
周目标功能 SHALL 提供流畅的动画和适当的音频反馈。

#### Scenario: 目标列表动画
- **WHEN** 周目标列表加载或更新时
- **THEN** 系统 SHALL 使用 Framer Motion 提供渐入动画
- **AND** 列表项 SHALL 有交错延迟动画效果

#### Scenario: 完成音效
- **WHEN** 用户标记周目标为完成或进度达到 100%
- **THEN** 系统 SHALL 播放完成音效（`/music/complete.mp3`）
- **AND** 音量 SHALL 与其他音效保持一致（0.3）

#### Scenario: 交互动画
- **WHEN** 用户与周目标卡片交互（点击、悬停）
- **THEN** 系统 SHALL 提供微妙的缩放或高亮动画
- **AND** 动画 SHALL 与现有任务列表动画风格一致


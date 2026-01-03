# Goal Management Capability

## ADDED Requirements

### Requirement: 年度目标数据模型
系统 SHALL 提供年度目标数据结构，包含目标的所有必要属性。

#### Scenario: 目标数据结构包含完整属性
- **WHEN** 创建或存储年度目标数据
- **THEN** 数据结构 SHALL 包含以下字段：
  - `id`: 唯一标识符（字符串，时间戳生成）
  - `title`: 目标标题（字符串，必填）
  - `description`: 目标描述（字符串，可选）
  - `year`: 目标年份（数字，必填）
  - `completed`: 完成状态（布尔值，默认 false）
  - `progress`: 完成进度（数字，0-100，默认 0）
  - `tag`: 标签 ID（字符串，可选，引用 customTags）
  - `createdAt`: 创建时间（Date 对象）

### Requirement: 目标创建功能
用户 SHALL 能够创建新的年度目标。

#### Scenario: 创建年度目标成功
- **WHEN** 用户填写目标标题和年份，点击"添加目标"按钮
- **THEN** 系统 SHALL 创建新目标，生成唯一 ID，设置当前时间为创建时间
- **AND** 系统 SHALL 将目标添加到 yearlyGoals 数组
- **AND** 系统 SHALL 保存到 LocalStorage
- **AND** 系统 SHALL 触发服务器备份

#### Scenario: 创建目标时标题为空
- **WHEN** 用户未填写目标标题就尝试添加
- **THEN** 系统 SHALL 不创建目标
- **AND** 系统 SHOULD 提示用户输入标题

#### Scenario: 创建目标时可选择标签
- **WHEN** 用户选择标签后创建目标
- **THEN** 系统 SHALL 将标签 ID 关联到目标
- **AND** 目标显示时 SHALL 显示对应的标签颜色和名称

### Requirement: 目标列表显示
系统 SHALL 以列表形式显示所有年度目标。

#### Scenario: 显示目标列表
- **WHEN** 用户打开年度目标追踪器
- **THEN** 系统 SHALL 显示所有年度目标的列表
- **AND** 每个目标 SHALL 显示标题、描述、进度、标签、年份
- **AND** 目标 SHALL 按年份分组或可按年份筛选
- **AND** 完成的目标 SHALL 有明显的视觉区分（如透明度、删除线等）

#### Scenario: 年份筛选
- **WHEN** 用户选择特定年份
- **THEN** 系统 SHALL 只显示该年份的目标
- **AND** 系统 SHALL 显示年份切换控件

#### Scenario: 空状态显示
- **WHEN** 当前年份没有任何目标
- **THEN** 系统 SHALL 显示空状态提示
- **AND** 系统 SHALL 引导用户创建第一个目标

### Requirement: 目标进度更新
用户 SHALL 能够手动更新目标的完成进度。

#### Scenario: 更新进度百分比
- **WHEN** 用户调整进度滑块或输入进度值（0-100）
- **THEN** 系统 SHALL 更新目标的 progress 字段
- **AND** 系统 SHALL 立即保存更改到 LocalStorage
- **AND** 系统 SHALL 触发服务器备份

#### Scenario: 进度达到 100%
- **WHEN** 用户将进度设置为 100%
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


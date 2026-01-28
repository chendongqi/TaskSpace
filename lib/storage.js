// 数据持久化工具类
export class DataStorage {
  constructor() {
    // 启用智能服务器备份
    this.serverBackupEnabled = typeof window !== 'undefined' ? 
      (process.env.NEXT_PUBLIC_ENABLE_SERVER_BACKUP !== 'false') : true;
    this.initialized = false;
    this.debug = true; // 启用调试日志以监控智能合并
    
    // 防抖机制：避免频繁备份
    this.backupQueue = new Map(); // key -> timeout ID
    this.backupDelay = 1000; // 1秒防抖延迟
    
    // 用户 ID 提供者（用于从 React Context 获取用户信息）
    this.userIdProvider = null;
    
    console.log('DataStorage initialized:', {
      serverBackupEnabled: this.serverBackupEnabled,
      environment: typeof window !== 'undefined' ? 'browser' : 'server'
    });
  }

  // 设置用户 ID 提供者（从 React Context 注入）
  setUserIdProvider(provider) {
    this.userIdProvider = provider;
    if (this.debug) {
      console.log('📌 User ID provider set');
    }
  }

  // 初始化存储，尝试从服务器恢复数据
  async initializeStorage(options = {}) {
    // ⭐ 如果已初始化且没有强制重新初始化的选项，直接返回
    if (this.initialized && !options.forceReinit) {
      console.log('⏭️  Storage already initialized, skipping...');
      return;
    }
    
    // 等待浏览器环境准备就绪
    if (typeof window === 'undefined') return;
    
    try {
      // ⭐ 检测是否有匿名数据需要处理
      const hasAnonymous = this.hasAnonymousData();
      let anonymousBackup = null;
      
      if (hasAnonymous && !options.skipAnonymousCheck) {
        // 保存匿名数据副本
        anonymousBackup = this.saveAnonymousDataBackup();
        
        // ⭐ 标记为已初始化，但需要用户确认
        this.initialized = true;
        
        // 返回特殊标志，告诉调用者需要用户确认
        return {
          needsAnonymousDataMerge: true,
          anonymousData: anonymousBackup
        };
      }
      
      // ⭐ 检测用户切换（但不是从匿名切换到登录的情况）
      if (this.checkUserSwitch() && !hasAnonymous) {
        console.warn('⚠️  User switched! Clearing local data to prevent data leakage.');
        this.clearAllData();
      }
      
      // 更新当前用户 ID 标记
      this.updateCurrentUserId();
      
      // 检查用户是否已登录
      if (!this.isAuthenticated()) {
        console.log('📱 User not authenticated, using localStorage only (no server sync)');
        
        // ⭐ 确保设置 _current_user_id 为 'anonymous'
        this.updateCurrentUserId();
        
        this.initialized = true;
        return null;
      }
      
      // 尝试从服务器恢复所有数据
      const keys = ['darkMode', 'theme', 'dailyTasks', 'backlogTasks', 'customTags', 'habits', 'yearlyGoals', 'quarterlyGoals', 'weeklyGoals'];
      const restoredData = {};
      let hasServerData = false;
      
      // 如果有匿名数据且用户选择合并，则与服务器数据合并
      if (options.mergeAnonymousData) {
        console.log('🔄 Merging anonymous data with server data...');
        
        // ⭐ 从 sessionStorage 获取匿名数据备份
        const anonymousDataBackup = this.getAnonymousDataBackup();
        
        if (!anonymousDataBackup) {
          console.error('❌ No anonymous data backup found in sessionStorage!');
          // 降级为正常同步
          options.mergeAnonymousData = false;
        } else {
          // 先清空本地数据
          this.clearAllData();
          
          // 从服务器拉取数据
          for (const key of keys) {
            const serverData = await this.restoreFromServer(key);
            let finalData = null;
            
            if (serverData && serverData.data) {
              // 服务器有数据，合并匿名数据
              if (anonymousDataBackup[key]) {
                finalData = await this.mergeData(key, anonymousDataBackup[key], serverData.data);
                console.log(`✅ Merged anonymous data with server data for ${key}`);
              } else {
                finalData = serverData.data;
              }
            } else if (anonymousDataBackup[key]) {
              // 服务器没有数据，直接使用匿名数据
              finalData = anonymousDataBackup[key];
              console.log(`➕ Using anonymous data for ${key}`);
            }
            
            if (finalData) {
              // 保存合并后的数据到 localStorage
              localStorage.setItem(key, JSON.stringify(finalData));
              localStorage.setItem(`${key}_timestamp`, new Date().toISOString());
              restoredData[key] = finalData;
              hasServerData = true;
              
              // 立即备份到服务器
              await this.backupToServer(key, finalData);
            }
          }
          
          // 清除匿名数据备份
          this.clearAnonymousDataBackup();
        }
        
      } else if (options.discardAnonymousData) {
        // 用户选择丢弃匿名数据
        console.log('🗑️  Discarding anonymous data, using server data only...');

        // 清空本地数据（包括匿名数据）
        this.clearAllData();

        // 从服务器恢复数据
        for (const key of keys) {
          const serverData = await this.restoreFromServer(key);

          if (serverData && serverData.data) {
            localStorage.setItem(key, JSON.stringify(serverData.data));
            localStorage.setItem(`${key}_timestamp`, serverData.timestamp);
            restoredData[key] = serverData.data;
            hasServerData = true;
            console.log(`📥 Restored ${key} from server`);
          } else {
            // ✅ 修复：显式设置为 null
            restoredData[key] = null;
            console.log(`📭 No server data for ${key}, set to null`);
          }
        }

        // 清除匿名数据备份
        this.clearAnonymousDataBackup();
        
      } else {
        // ✅ 修改：正常同步流程 - 默认优先服务器数据
        for (const key of keys) {
          console.log(`🔄 Syncing ${key} data from server...`);
          const serverData = await this.restoreFromServer(key);

          if (serverData && serverData.data) {
            // ✅ 直接使用服务器数据，不进行时间戳比较和合并
            // 这样可以确保刷新页面时总是显示最新的服务器数据
            localStorage.setItem(key, JSON.stringify(serverData.data));
            localStorage.setItem(`${key}_timestamp`, serverData.timestamp);
            restoredData[key] = serverData.data;
            hasServerData = true;
            console.log(`📥 Using latest server data for ${key}`);
          } else {
            // 服务器无数据，保留本地数据
            const localData = this.getLocalData(key);
            restoredData[key] = localData;
            console.log(`📭 No server data for ${key}, keeping local data`);
          }
        }
      }
      
      this.initialized = true;
      
      // 返回恢复的数据，让调用者可以直接使用
      return hasServerData ? restoredData : null;
    } catch (error) {
      console.warn('Storage initialization failed:', error);
      this.initialized = true;
      return null;
    }
  }

  // 检查本地是否有比服务器更新的更改
  async hasRecentLocalChanges(key, serverTimestamp) {
    if (typeof window === 'undefined') return false;
    
    try {
      // 检查localStorage中是否有时间戳标记
      const localTimestamp = localStorage.getItem(`${key}_timestamp`);
      if (!localTimestamp) return false;
      
      const localTime = new Date(localTimestamp);
      const serverTime = new Date(serverTimestamp);
      
      // 如果本地时间戳更新，说明有未同步的本地更改
      const hasRecentChanges = localTime > serverTime;
      
      if (this.debug) {
        console.log(`⏰ Timestamp check for ${key}:`, {
          local: localTimestamp,
          server: serverTimestamp,
          hasRecentChanges
        });
      }
      
      return hasRecentChanges;
    } catch (error) {
      console.warn(`Error checking timestamps for ${key}:`, error);
      return false;
    }
  }

  // 智能数据合并
  async mergeData(key, localData, serverData) {
    if (!serverData) return localData;
    if (!localData) return serverData;
    
    switch (key) {
      case 'dailyTasks':
        return this.mergeDailyTasks(localData, serverData);
      case 'backlogTasks':
        return this.mergeBacklogTasks(localData, serverData);
      case 'habits':
        return this.mergeHabits(localData, serverData);
      case 'customTags':
        return this.mergeCustomTags(localData, serverData);
      case 'yearlyGoals':
        return this.mergeYearlyGoals(localData, serverData);
      case 'quarterlyGoals':
        return this.mergeQuarterlyGoals(localData, serverData);
      case 'weeklyGoals':
        return this.mergeWeeklyGoals(localData, serverData);
      case 'darkMode':
      case 'theme':
        // 简单值，以服务器数据为准
        return serverData;
      default:
        return serverData;
    }
  }

  // 合并日常任务
  mergeDailyTasks(localTasks, serverTasks) {
    if (!localTasks && !serverTasks) return {};
    if (!localTasks) return serverTasks;
    if (!serverTasks) return localTasks;
    
    const merged = { ...serverTasks };
    
    Object.keys(localTasks || {}).forEach(dateKey => {
      if (!merged[dateKey]) {
        // 本地有这个日期的任务，服务器没有，直接添加
        merged[dateKey] = localTasks[dateKey];
        console.log(`📅 Adding local date ${dateKey} to merged data`);
      } else {
        // 合并同一天的任务
        const localDayTasks = localTasks[dateKey] || [];
        const serverDayTasks = merged[dateKey] || [];
        const mergedDayTasks = [...serverDayTasks];
        
        localDayTasks.forEach(localTask => {
          const existingIndex = mergedDayTasks.findIndex(t => t.id === localTask.id);
          if (existingIndex === -1) {
            // 新任务，直接添加
            mergedDayTasks.push(localTask);
            console.log(`➕ Adding new local task: ${localTask.title}`);
          } else {
            // 存在冲突，比较时间戳和内容
            const existing = mergedDayTasks[existingIndex];
            
            // 比较完成状态、时间消耗等，选择更完整的数据
            const localScore = this.calculateTaskCompleteness(localTask);
            const existingScore = this.calculateTaskCompleteness(existing);
            
            if (localScore > existingScore) {
              mergedDayTasks[existingIndex] = localTask;
              console.log(`🔄 Updated task with local version: ${localTask.title}`);
            }
          }
        });
        
        merged[dateKey] = mergedDayTasks;
      }
    });
    
    return merged;
  }

  // 计算任务完整性得分（用于冲突解决）
  calculateTaskCompleteness(task) {
    let score = 0;
    if (task.completed) score += 10;
    if (task.timeSpent > 0) score += 5;
    if (task.focusTime > 0) score += 5;
    if (task.subtasks && task.subtasks.length > 0) score += 3;
    // 更新的任务优先级更高
    score += new Date(task.createdAt).getTime() / 1000000; // 微调值
    return score;
  }

  // 合并 Backlog 任务
  mergeBacklogTasks(localTasks, serverTasks) {
    if (!localTasks && !serverTasks) return [];
    if (!localTasks) return serverTasks;
    if (!serverTasks) return localTasks;
    
    const taskMap = new Map();
    
    // 先添加服务器任务
    serverTasks.forEach(task => {
      taskMap.set(task.id, task);
    });
    
    // 合并本地任务
    localTasks.forEach(task => {
      if (taskMap.has(task.id)) {
        // 任务已存在，合并属性（以最新的为准）
        const serverTask = taskMap.get(task.id);
        const localTime = new Date(task.createdAt).getTime();
        const serverTime = new Date(serverTask.createdAt).getTime();
        
        if (localTime > serverTime) {
          taskMap.set(task.id, task);
        }
      } else {
        // 新任务，直接添加
        taskMap.set(task.id, task);
      }
    });
    
    return Array.from(taskMap.values());
  }

  // 合并习惯
  mergeHabits(localHabits, serverHabits) {
    if (!localHabits && !serverHabits) return [];
    if (!localHabits) return serverHabits;
    if (!serverHabits) return localHabits;
    
    const merged = [...serverHabits];
    
    localHabits.forEach(localHabit => {
      const existingIndex = merged.findIndex(h => h.name.toLowerCase() === localHabit.name.toLowerCase());
      if (existingIndex === -1) {
        // 新习惯，直接添加
        merged.push(localHabit);
        console.log(`🎯 Adding new local habit: ${localHabit.name}`);
      } else {
        // 合并完成日期
        const existing = merged[existingIndex];
        const mergedDates = [...new Set([
          ...(existing.completedDates || []),
          ...(localHabit.completedDates || [])
        ])];
        
        const updatedHabit = {
          ...existing,
          ...localHabit, // 以本地设置为准（如标签等）
          completedDates: mergedDates // 但合并完成日期
        };
        
        merged[existingIndex] = updatedHabit;
        console.log(`🔄 Merged habit completion dates: ${localHabit.name}`);
      }
    });
    
    return merged;
  }

  // 合并自定义标签
  mergeCustomTags(localTags, serverTags) {
    const merged = [...serverTags];
    
    localTags.forEach(localTag => {
      const exists = merged.find(t => t.name.toLowerCase() === localTag.name.toLowerCase());
      if (!exists) {
        merged.push(localTag);
      }
    });
    
    return merged;
  }

  // 合并年度目标
  mergeYearlyGoals(localGoals, serverGoals) {
    if (!localGoals && !serverGoals) return [];
    if (!localGoals) return serverGoals;
    if (!serverGoals) return localGoals;
    
    const merged = [...serverGoals];
    
    localGoals.forEach(localGoal => {
      const existingIndex = merged.findIndex(g => g.id === localGoal.id);
      if (existingIndex === -1) {
        // 新目标，直接添加
        merged.push(localGoal);
        console.log(`🎯 Adding new local goal: ${localGoal.title}`);
      } else {
        // 存在冲突，比较进度和更新时间
        const existing = merged[existingIndex];
        
        // 以进度更高或创建时间更新的为准
        const localProgress = localGoal.progress || 0;
        const existingProgress = existing.progress || 0;
        const localTime = new Date(localGoal.createdAt).getTime();
        const existingTime = new Date(existing.createdAt).getTime();
        
        if (localProgress > existingProgress || 
            (localProgress === existingProgress && localTime > existingTime)) {
          merged[existingIndex] = localGoal;
          console.log(`🔄 Updated goal with local version: ${localGoal.title}`);
        }
      }
    });
    
    return merged;
  }

  // 合并季度目标
  mergeQuarterlyGoals(localGoals, serverGoals) {
    if (!localGoals && !serverGoals) return [];
    if (!localGoals) return serverGoals;
    if (!serverGoals) return localGoals;
    
    const merged = [...serverGoals];
    
    localGoals.forEach(localGoal => {
      const existingIndex = merged.findIndex(g => g.id === localGoal.id);
      if (existingIndex === -1) {
        // 新季度目标，直接添加
        merged.push(localGoal);
        console.log(`📊 Adding new local quarterly goal: ${localGoal.title}`);
      } else {
        // 存在冲突，比较进度和更新时间
        const existing = merged[existingIndex];
        
        // 以进度更高或创建时间更新的为准
        const localProgress = localGoal.progress || 0;
        const existingProgress = existing.progress || 0;
        const localTime = new Date(localGoal.createdAt).getTime();
        const existingTime = new Date(existing.createdAt).getTime();
        
        if (localProgress > existingProgress || 
            (localProgress === existingProgress && localTime > existingTime)) {
          merged[existingIndex] = localGoal;
          console.log(`🔄 Updated quarterly goal with local version: ${localGoal.title}`);
        }
      }
    });
    
    return merged;
  }

  // 合并周目标
  mergeWeeklyGoals(localGoals, serverGoals) {
    if (!localGoals && !serverGoals) return [];
    if (!localGoals) return serverGoals;
    if (!serverGoals) return localGoals;
    
    const merged = [...serverGoals];
    
    localGoals.forEach(localGoal => {
      const existingIndex = merged.findIndex(g => g.id === localGoal.id);
      if (existingIndex === -1) {
        // 新周目标，直接添加
        merged.push(localGoal);
        console.log(`📅 Adding new local weekly goal: ${localGoal.title}`);
      } else {
        // 存在冲突，比较进度和更新时间
        const existing = merged[existingIndex];
        
        // 以进度更高或创建时间更新的为准
        const localProgress = localGoal.progress || 0;
        const existingProgress = existing.progress || 0;
        const localTime = new Date(localGoal.createdAt).getTime();
        const existingTime = new Date(existing.createdAt).getTime();
        
        if (localProgress > existingProgress || 
            (localProgress === existingProgress && localTime > existingTime)) {
          merged[existingIndex] = localGoal;
          console.log(`🔄 Updated weekly goal with local version: ${localGoal.title}`);
        }
      }
    });
    
    return merged;
  }

  // 从 localStorage 获取数据
  getLocalData(key) {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error reading localStorage key ${key}:`, error);
      return null;
    }
  }

  // 保存数据到 localStorage
  setLocalData(key, data) {
    if (typeof window === 'undefined') return;
    try {
      // 只跳过真正的null或undefined，允许false、空数组、空对象
      if (data === null || data === undefined) {
        if (this.debug) {
          console.log(`⚠️  Skipping backup for null/undefined data:`, { key });
        }
        return;
      }
      
      if (this.debug) {
        console.log(`✅ Backing up ${key}:`, { 
          type: typeof data, 
          value: data,
          isArray: Array.isArray(data),
          length: Array.isArray(data) ? data.length : undefined
        });
      }

      const dataString = JSON.stringify(data);
      const timestamp = new Date().toISOString();
      
      localStorage.setItem(key, dataString);
      localStorage.setItem(`${key}_timestamp`, timestamp);
      
      if (this.debug) {
        console.log(`📝 Saved to localStorage:`, { 
          key, 
          dataSize: dataString.length,
          timestamp 
        });
      }
      
      // 同时触发服务器备份（异步，带防抖机制）
      if (this.serverBackupEnabled) {
        this.debouncedBackup(key, data);
      } else {
        if (this.debug) {
          console.log('⚠️  Server backup disabled');
        }
      }
    } catch (error) {
      console.error(`Error writing localStorage key ${key}:`, error);
    }
  }

  // 防抖备份：智能版本
  debouncedBackup(key, data) {
    // 未登录时跳过服务端备份
    if (!this.isAuthenticated()) {
      if (this.debug) {
        console.log(`📱 Skipping server backup for ${key} (user not authenticated)`);
      }
      return;
    }
    
    // 清除之前的备份计时器
    if (this.backupQueue.has(key)) {
      clearTimeout(this.backupQueue.get(key));
    }

    if (this.debug) {
      console.log(`⏱️  Scheduled direct backup for key: ${key} (${this.backupDelay}ms delay)`);
    }

    // 设置新的备份计时器
    const timeoutId = setTimeout(() => {
      this.backupToServer(key, data).catch(error => {
        console.warn(`Direct backup failed for key ${key}:`, error);
      }).finally(() => {
        this.backupQueue.delete(key);
      });
    }, this.backupDelay);

    this.backupQueue.set(key, timeoutId);
  }

  // 备份到服务器：直接覆盖版本
  async backupToServer(key, data) {
    // 未登录时不备份到服务器
    if (!this.isAuthenticated()) {
      if (this.debug) {
        console.log(`📱 Skipping server backup for ${key} (user not authenticated)`);
      }
      return;
    }
    
    const userId = this.getUserId();
    const timestamp = new Date().toISOString();
    
    if (this.debug) {
      console.log(`🚀 Starting direct backup for key: ${key}`);
    }
    
    try {
      // 备份时直接使用当前数据，不再合并
      // 这确保删除操作、更新操作都能正确同步
      if (this.debug) {
        console.log(`💾 Direct backup for ${key} (no merge to preserve deletions)`);
      }
      
      const requestBody = {
        key,
        data, // 直接使用当前数据
        timestamp,
        userId
      };
      
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        if (this.debug) {
          console.log(`✅ Direct backup successful for key: ${key}`);
        }
      } else {
        console.warn(`❌ Direct backup failed for key ${key}:`, {
          status: response.status,
          statusText: response.statusText
        });
        
        const errorText = await response.text();
        console.warn('Error response:', errorText);
      }
    } catch (error) {
      console.warn(`🔥 Direct backup error for key ${key}:`, error);
    }
  }

  // 从服务器恢复数据
  async restoreFromServer(key) {
    if (!this.serverBackupEnabled) return null;
    
    // 未登录时不从服务器恢复
    if (!this.isAuthenticated()) {
      if (this.debug) {
        console.log(`📱 Skipping server restore for ${key} (user not authenticated)`);
      }
      return null;
    }
    
    try {
      const response = await fetch(`/api/backup?key=${key}&userId=${this.getUserId()}`);
      if (response.ok) {
        const backup = await response.json();
        // 返回完整的备份对象，包含时间戳
        return backup;
      }
    } catch (error) {
      console.warn('Server restore failed:', error);
    }
    return null;
  }

  // 获取用户ID（仅当用户登录时返回）
  getUserId() {
    // 如果设置了用户 ID 提供者（用户已登录），使用真实用户 ID
    if (this.userIdProvider) {
      const userId = this.userIdProvider();
      if (userId) {
        if (this.debug) {
          console.log(`👤 Using authenticated user ID: ${userId}`);
        }
        return userId;
      }
    }
    
    // 未登录时返回 null，表示不使用服务端备份
    if (this.debug) {
      console.log(`👤 No authenticated user, using local storage only`);
    }
    
    return null;
  }

  // 检查用户是否已登录
  isAuthenticated() {
    return this.getUserId() !== null;
  }

  // 检查当前登录用户是否与 localStorage 中的用户匹配
  checkUserSwitch() {
    if (typeof window === 'undefined') return false;
    
    const currentUserId = this.getUserId();
    const storedUserId = localStorage.getItem('_current_user_id');
    
    // 将 null 转换为 'anonymous' 字符串进行比较
    const currentUserIdStr = currentUserId ? String(currentUserId) : 'anonymous';
    
    // 如果用户切换了（包括从登录到未登录，或从未登录到登录，或从用户A到用户B）
    if (storedUserId && storedUserId !== currentUserIdStr) {
      console.warn('🔄 User switch detected:', {
        previous: storedUserId,
        current: currentUserIdStr
      });
      return true;
    }
    
    return false;
  }

  // 清空所有应用数据（用户切换时调用）
  clearAllData() {
    if (typeof window === 'undefined') return;
    
    const keys = [
      'darkMode', 'darkMode_timestamp',
      'theme', 'theme_timestamp',
      'dailyTasks', 'dailyTasks_timestamp',
      'backlogTasks', 'backlogTasks_timestamp',
      'customTags', 'customTags_timestamp',
      'habits', 'habits_timestamp',
      'yearlyGoals', 'yearlyGoals_timestamp',
      'quarterlyGoals', 'quarterlyGoals_timestamp',
      'weeklyGoals', 'weeklyGoals_timestamp',
      '_current_user_id' // 也清空用户 ID 标记
    ];
    
    console.warn('🗑️  Clearing all localStorage data due to user switch');
    
    keys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // 重置初始化状态，以便重新初始化
    this.initialized = false;
    
    if (this.debug) {
      console.log('✅ All localStorage data cleared');
    }
  }

  // 更新当前用户 ID 标记
  updateCurrentUserId() {
    if (typeof window === 'undefined') return;
    
    const userId = this.getUserId();
    const userIdStr = userId ? String(userId) : 'anonymous';
    
    localStorage.setItem('_current_user_id', userIdStr);
    
    if (this.debug) {
      console.log('📝 Updated current user ID:', userIdStr);
    }
  }

  // 检查是否应该显示匿名使用风险提醒
  shouldShowAnonymousWarning() {
    if (typeof window === 'undefined') return false;
    
    // 如果已登录，不显示提醒
    if (this.isAuthenticated()) {
      return false;
    }
    
    // 检查是否已经显示过提醒（用户点击过"我知道了"）
    const hasSeenWarning = localStorage.getItem('_anonymous_warning_seen');
    if (hasSeenWarning === 'true') {
      return false;
    }
    
    // 检查是否有数据（如果没有数据，不需要提醒）
    const keys = ['dailyTasks', 'backlogTasks', 'habits', 'yearlyGoals', 'quarterlyGoals', 'weeklyGoals'];
    const hasData = keys.some(key => {
      const data = this.getLocalData(key);
      if (!data) return false;
      
      if (Array.isArray(data)) {
        return data.length > 0;
      } else if (typeof data === 'object') {
        return Object.keys(data).length > 0;
      }
      return false;
    });
    
    return hasData;
  }

  // 标记用户已看过匿名使用风险提醒
  markAnonymousWarningSeen() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('_anonymous_warning_seen', 'true');
    if (this.debug) {
      console.log('✓ Marked anonymous warning as seen');
    }
  }

  // 清除匿名使用风险提醒标记（用于测试或重置）
  clearAnonymousWarningFlag() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('_anonymous_warning_seen');
    if (this.debug) {
      console.log('🗑️  Cleared anonymous warning flag');
    }
  }

  // 检测是否有匿名数据（从匿名切换到登录时）
  hasAnonymousData() {
    if (typeof window === 'undefined') return false;
    
    const storedUserId = localStorage.getItem('_current_user_id');
    const currentUserId = this.getUserId();
    
    console.log('🔍 Checking for anonymous data:', {
      storedUserId,
      currentUserId,
      currentUserIdType: typeof currentUserId
    });
    
    // 只有从 anonymous 切换到登录状态时才返回 true
    if (storedUserId === 'anonymous' && currentUserId && currentUserId !== 'anonymous') {
      // 检查是否真的有数据
      const keys = ['dailyTasks', 'backlogTasks', 'habits', 'yearlyGoals', 'quarterlyGoals', 'weeklyGoals'];
      const hasData = keys.some(key => {
        const data = this.getLocalData(key);
        if (!data) return false;
        
        // 检查数据是否为空
        if (Array.isArray(data)) {
          const hasItems = data.length > 0;
          console.log(`  - ${key}: Array with ${data.length} items`, hasItems ? '✓' : '✗');
          return hasItems;
        } else if (typeof data === 'object') {
          const keyCount = Object.keys(data).length;
          const hasItems = keyCount > 0;
          console.log(`  - ${key}: Object with ${keyCount} keys`, hasItems ? '✓' : '✗');
          return hasItems;
        }
        return false;
      });
      
      if (hasData) {
        console.log('📋 Detected anonymous data in localStorage ✓');
        return true;
      } else {
        console.log('📭 No anonymous data found in localStorage');
      }
    } else {
      console.log('⏭️  Not switching from anonymous to logged in');
    }
    
    return false;
  }

  // 保存匿名数据的副本（用于后续合并或丢弃）
  saveAnonymousDataBackup() {
    if (typeof window === 'undefined') return null;
    
    const keys = ['dailyTasks', 'backlogTasks', 'customTags', 'habits', 'yearlyGoals', 'quarterlyGoals', 'weeklyGoals'];
    const backup = {};
    
    keys.forEach(key => {
      const data = this.getLocalData(key);
      if (data) {
        backup[key] = JSON.parse(JSON.stringify(data)); // 深拷贝
      }
    });
    
    // 临时保存到 sessionStorage（页面关闭时自动清除）
    sessionStorage.setItem('_anonymous_data_backup', JSON.stringify(backup));
    
    if (this.debug) {
      console.log('💾 Saved anonymous data backup:', Object.keys(backup));
    }
    
    return backup;
  }

  // 获取匿名数据备份
  getAnonymousDataBackup() {
    if (typeof window === 'undefined') return null;
    
    const backupStr = sessionStorage.getItem('_anonymous_data_backup');
    if (backupStr) {
      try {
        return JSON.parse(backupStr);
      } catch (error) {
        console.error('Failed to parse anonymous data backup:', error);
        return null;
      }
    }
    return null;
  }

  // 清除匿名数据备份
  clearAnonymousDataBackup() {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('_anonymous_data_backup');
    if (this.debug) {
      console.log('🗑️  Cleared anonymous data backup');
    }
  }

  // 合并匿名数据到当前用户数据
  async mergeAnonymousData(anonymousData, serverData) {
    if (!anonymousData) return serverData;
    
    const merged = { ...serverData };
    
    // 合并每个数据类型
    const keys = ['dailyTasks', 'backlogTasks', 'customTags', 'habits', 'yearlyGoals', 'quarterlyGoals', 'weeklyGoals'];
    
    for (const key of keys) {
      if (anonymousData[key]) {
        if (merged[key]) {
          // 使用现有的合并逻辑
          merged[key] = await this.mergeData(key, anonymousData[key], merged[key]);
          console.log(`✅ Merged anonymous data for ${key}`);
        } else {
          // 服务器没有数据，直接使用匿名数据
          merged[key] = anonymousData[key];
          console.log(`➕ Added anonymous data for ${key}`);
        }
      }
    }
    
    return merged;
  }

  // 导出所有数据
  exportAllData() {
    const allData = {
      darkMode: this.getLocalData('darkMode'),
      theme: this.getLocalData('theme'),
      dailyTasks: this.getLocalData('dailyTasks'),
      backlogTasks: this.getLocalData('backlogTasks'),
      customTags: this.getLocalData('customTags'),
      habits: this.getLocalData('habits'),
      yearlyGoals: this.getLocalData('yearlyGoals'),
      quarterlyGoals: this.getLocalData('quarterlyGoals'),
      weeklyGoals: this.getLocalData('weeklyGoals'),
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `A计划_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 导入数据
  async importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          // 验证数据格式
          if (data.exportDate) {
            // 恢复所有数据
            Object.keys(data).forEach(key => {
              if (key !== 'exportDate') {
                this.setLocalData(key, data[key]);
              }
            });
            resolve(data);
          } else {
            reject(new Error('Invalid backup file format'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  }

}

// 创建全局实例
export const dataStorage = new DataStorage();
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
    
    console.log('DataStorage initialized:', {
      serverBackupEnabled: this.serverBackupEnabled,
      environment: typeof window !== 'undefined' ? 'browser' : 'server'
    });
  }

  // 初始化存储，尝试从服务器恢复数据
  async initializeStorage() {
    if (this.initialized) return;
    
    // 等待浏览器环境准备就绪
    if (typeof window === 'undefined') return;
    
    try {
      // 尝试从服务器恢复所有数据
      const keys = ['darkMode', 'theme', 'dailyTasks', 'customTags', 'habits', 'yearlyGoals', 'quarterlyGoals', 'weeklyGoals'];
      const restoredData = {};
      let hasServerData = false;
      
      for (const key of keys) {
        const localData = this.getLocalData(key);
        
        // 总是尝试从服务器获取最新数据进行同步
        console.log(`🔄 Syncing ${key} data from server...`);
        const serverData = await this.restoreFromServer(key);
        
        if (serverData) {
          // 获取服务器备份的时间戳
          const serverTimestamp = serverData.timestamp || '1970-01-01T00:00:00.000Z';
          
          // 检查本地是否有更新的未同步数据
          const hasRecentLocalChanges = await this.hasRecentLocalChanges(key, serverTimestamp);
          
          let finalData;
          if (hasRecentLocalChanges) {
            // 本地有更新的更改，合并到服务器数据
            finalData = await this.mergeData(key, localData, serverData.data);
            console.log(`🔄 Merged local changes for ${key}`);
          } else {
            // 服务器数据更新，直接使用（包括删除操作）
            finalData = serverData.data;
            console.log(`📥 Using server data for ${key} (may include deletions)`);
          }
          
          // 检查最终数据是否与本地数据不同
          const currentDataString = JSON.stringify(localData);
          const finalDataString = JSON.stringify(finalData);
          
          if (currentDataString !== finalDataString) {
            localStorage.setItem(key, finalDataString);
            restoredData[key] = finalData;
            hasServerData = true;
            console.log(`✅ Synced and updated ${key} from server`);
          } else {
            console.log(`✨ ${key} data already up to date`);
          }
        } else if (!localData || (Array.isArray(localData) && localData.length === 0) || 
                   (typeof localData === 'object' && Object.keys(localData).length === 0)) {
          // 服务器没有数据，但本地也没有数据，跳过
          console.log(`📭 No data found for ${key} on server or locally`);
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

  // 获取用户ID（使用固定ID，所有设备共享）
  getUserId() {
    // 使用固定的用户ID，这样所有设备和会话都能共享数据
    const fixedUserId = 'priospace_user';
    
    // 仍然在 localStorage 中记录，便于调试
    if (typeof window !== 'undefined') {
      localStorage.setItem('userId', fixedUserId);
    }
    
    if (this.debug) {
      console.log(`👤 Using fixed user ID: ${fixedUserId}`);
    }
    
    return fixedUserId;
  }

  // 导出所有数据
  exportAllData() {
    const allData = {
      darkMode: this.getLocalData('darkMode'),
      theme: this.getLocalData('theme'),
      dailyTasks: this.getLocalData('dailyTasks'),
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
    a.download = `priospace_backup_${new Date().toISOString().slice(0, 10)}.json`;
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
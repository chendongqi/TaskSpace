// 数据持久化工具类
//
// ⚠️ 本文件已从"localStorage + 猜测式双向合并"模式迁移为
// "localStorage 作为本地缓存 + Supabase 作为唯一真源 + outbox 写队列 + 墓碑删除"模式。
// 具体的表结构转换、写队列、增量拉取逻辑都放在 lib/supabase-sync.js 里，
// 本文件只保留：本地读写（getLocalData/setLocalData）、用户态管理、
// 匿名数据提醒、导出/导入 JSON 的 UI 功能，并把"写入后要同步到服务器"这件事
// 委托给 supabase-sync 的 diffAndQueue。
import {
  setSupabaseClientProvider as syncSetSupabaseClientProvider,
  setCachedUserId as syncSetCachedUserId,
  queueMutation as syncQueueMutation,
  flushMutationQueue as syncFlushMutationQueue,
  pullChanges as syncPullChanges,
  getLastPulledAt as syncGetLastPulledAt,
  setLastPulledAt as syncSetLastPulledAt,
  registerBeforeUnloadFlush as syncRegisterBeforeUnloadFlush,
  diffAndQueue,
} from "./supabase-sync";

export class DataStorage {
  constructor() {
    this.initialized = false;
    this.debug = true; // 启用调试日志

    // 用户 ID 提供者（用于从 React Context 获取用户信息）
    this.userIdProvider = null;

    // 当从服务器拉取数据后写回 localStorage/React state 时，
    // 用这个标记临时抑制 setLocalData 的 diffAndQueue，避免把刚拉取下来的服务器数据
    // 当作"本地新变更"又推回写队列（虽然是幂等操作不会导致数据错误，但会产生多余的网络请求）。
    this._suppressSync = false;

    console.log('DataStorage initialized:', {
      environment: typeof window !== 'undefined' ? 'browser' : 'server'
    });
  }

  // 设置用户 ID 提供者（从 React Context 注入）
  setUserIdProvider(provider) {
    this.userIdProvider = provider;
    // 同步给 supabase-sync 层，供写队列 flush / 拉取使用
    syncSetCachedUserId(this.getUserId());
    if (this.debug) {
      console.log('📌 User ID provider set');
    }
  }

  // 注入与认证共享的 Supabase client（由 app/page.js 通过 useSupabaseClient() 获取后传入）
  // provider 是一个返回 SupabaseClient 实例的函数，而不是直接传实例，
  // 这样可以兼容 client 尚未就绪时的惰性获取。
  setSupabaseClientProvider(provider) {
    syncSetSupabaseClientProvider(provider);
    if (this.debug) {
      console.log('🔌 Supabase client provider set');
    }
  }

  // 加入一条 mutation 到本地写队列（outbox），会在 debounce 后自动 flush。
  // table: 逻辑表名，见 lib/supabase-sync.js 的 REAL_TABLE
  // op: 'upsert' | 'delete'
  queueMutation(table, op, id, payload) {
    syncQueueMutation(table, op, id, payload);
  }

  // 立即 flush 写队列（例如页面导入大批数据后，或需要确保落库后再做下一步操作时）
  async flushMutationQueue() {
    return syncFlushMutationQueue();
  }

  // 从 Supabase 拉取某逻辑表自 lastPulledAt 之后的增量变更（含墓碑行）
  async pullChanges(table, lastPulledAt) {
    return syncPullChanges(table, lastPulledAt);
  }

  getLastPulledAt(table) {
    return syncGetLastPulledAt(table);
  }

  setLastPulledAt(table, ts) {
    syncSetLastPulledAt(table, ts);
  }

  // 注册 beforeunload / visibilitychange 兜底 flush（只需调用一次，内部会去重）
  registerBeforeUnloadFlush() {
    syncRegisterBeforeUnloadFlush();
  }

  // 在 fn 执行期间抑制 setLocalData 对写队列的入队（用于把 pullChanges 的结果写回本地时）
  async withSyncSuppressed(fn) {
    this._suppressSync = true;
    try {
      return await fn();
    } finally {
      this._suppressSync = false;
    }
  }

  // ✅ 保留：检查数据是否为空
  isDataEmpty(data) {
    if (data === null || data === undefined) {
      return true;
    }

    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        return data.length === 0;
      }
      // 对象类型，检查是否有任何键
      return Object.keys(data).length === 0;
    }

    return false;
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

  // 保存数据到 localStorage，并把变更 diff 后加入 Supabase 写队列
  setLocalData(key, data) {
    if (typeof window === 'undefined') return;
    try {
      // 只跳过真正的null或undefined，允许false、空数组、空对象
      if (data === null || data === undefined) {
        if (this.debug) {
          console.log(`⚠️  Skipping save for null/undefined data:`, { key });
        }
        return;
      }

      // 在覆盖之前先取出旧值，用于 diff 出本次变更涉及的具体行
      const oldData = this.getLocalData(key);

      if (this.debug) {
        console.log(`✅ Saving ${key}:`, {
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

      // 未登录时只写本地，不进入写队列（避免产生无主数据）
      // _suppressSync 为 true 时（正在应用从服务器拉取下来的数据），跳过 diff/入队
      if (this._suppressSync) {
        if (this.debug) {
          console.log(`⏭️  Sync suppressed for ${key} (applying pulled data)`);
        }
      } else if (this.isAuthenticated()) {
        diffAndQueue(key, data, oldData);
      } else if (this.debug) {
        console.log(`📱 Not authenticated, skip queueing ${key} for remote sync`);
      }
    } catch (error) {
      console.error(`Error writing localStorage key ${key}:`, error);
    }
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

    // 未登录时返回 null，表示不使用服务端同步
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
      '_current_user_id', // 也清空用户 ID 标记
      '_ts_outbox', // 清空写队列，避免把属于旧用户的变更同步给新用户
      '_ts_remote_id_map', // 清空本地 ID -> 远端 UUID 映射
      '_ts_last_pulled_dailyTasks',
      '_ts_last_pulled_backlogTasks',
      '_ts_last_pulled_customTags',
      '_ts_last_pulled_habits',
      '_ts_last_pulled_habitCompletions',
      '_ts_last_pulled_yearlyGoals',
      '_ts_last_pulled_quarterlyGoals',
      '_ts_last_pulled_weeklyGoals',
      '_ts_last_pulled_settings',
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
    syncSetCachedUserId(userId || null);

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
  //
  // ⚠️ 新模型下，匿名数据不再走"特殊合并分支"：匿名状态下产生的数据本来就只停留在
  // localStorage，一旦用户登录，这些 key 的下一次 setLocalData 调用（或首次 pull 后的
  // 对比）会把它们当作"待推送的本地变更"自然地进入写队列（outbox），不需要调用方做特殊处理。
  // 这个方法保留下来仅用于向用户展示一次性提醒 ("检测到你有未关联账号的本地数据，登录后将自动同步")，
  // 不再驱动任何合并/丢弃分支逻辑。
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

  // 保存匿名数据的副本（用于后续展示提醒；不再用于驱动合并分支）
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

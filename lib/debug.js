// 全局调试工具
import { dataStorage } from './storage';

// 创建全局调试函数
export const debugDataFlow = async () => {
  console.log('🚀 开始调试数据存储流程...');
  
  try {
    // 1. 检查存储系统状态
    console.log('📋 步骤1: 检查存储系统状态');
    await dataStorage.initializeStorage();
    
    const userId = dataStorage.getUserId();
    console.log(`👤 当前用户ID: ${userId}`);
    
    // 2. 创建测试数据
    const testData = {
      testMessage: '调试测试数据',
      timestamp: new Date().toISOString(),
      randomValue: Math.random()
    };
    
    console.log('💾 步骤2: 保存测试数据');
    dataStorage.setLocalData('debugTest', testData);
    
    // 3. 验证本地存储
    const savedData = dataStorage.getLocalData('debugTest');
    if (savedData) {
      console.log('✅ 本地存储成功:', savedData);
    } else {
      console.error('❌ 本地存储失败');
    }
    
    // 4. 等待服务器备份
    console.log('⏳ 等待服务器备份...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. 测试服务器恢复
    console.log('🔄 步骤3: 测试服务器数据恢复');
    const serverData = await dataStorage.restoreFromServer('debugTest');
    
    if (serverData) {
      console.log('✅ 服务器数据恢复成功:', serverData);
    } else {
      console.error('❌ 服务器数据恢复失败');
    }
    
    // 6. 检查系统状态
    try {
      const response = await fetch('/api/status');
      const status = await response.json();
      console.log('📊 系统状态:', status);
    } catch (error) {
      console.error('❌ 无法获取系统状态:', error);
    }
    
    console.log('🏁 调试完成！');
    
    return {
      success: true,
      userId,
      localStorageWorking: !!savedData,
      serverBackupWorking: !!serverData
    };
    
  } catch (error) {
    console.error('🔥 调试过程出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 将调试函数挂载到全局对象
if (typeof window !== 'undefined') {
  window.debugDataFlow = debugDataFlow;
  window.dataStorage = dataStorage;
  
  console.log('🔧 调试工具已准备就绪！');
  console.log('使用方法:');
  console.log('1. 在控制台输入: debugDataFlow()');
  console.log('2. 或直接访问: window.dataStorage');
}
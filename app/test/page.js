"use client";

import { useState, useEffect } from 'react';
import { dataStorage } from '@/lib/storage';

export default function TestPage() {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { message, type, timestamp }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testStorageFlow = async () => {
    setIsRunning(true);
    clearResults();
    
    try {
      addResult('🚀 开始测试数据存储流程', 'info');
      
      // 1. 测试数据存储初始化
      addResult('📝 步骤1: 初始化数据存储', 'info');
      await dataStorage.initializeStorage();
      
      // 2. 获取用户ID
      const userId = dataStorage.getUserId();
      addResult(`👤 用户ID: ${userId}`, 'success');
      
      // 3. 测试数据保存
      const testData = {
        testField: '测试数据',
        timestamp: new Date().toISOString(),
        randomValue: Math.random()
      };
      
      addResult('💾 步骤2: 保存测试数据到 localStorage', 'info');
      dataStorage.setLocalData('testData', testData);
      
      // 4. 验证 localStorage 保存
      const savedData = dataStorage.getLocalData('testData');
      if (savedData) {
        addResult('✅ localStorage 保存成功', 'success');
      } else {
        addResult('❌ localStorage 保存失败', 'error');
      }
      
      // 5. 等待服务器备份
      addResult('⏳ 等待服务器备份完成 (3秒)...', 'info');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 6. 测试数据恢复
      addResult('🔄 步骤3: 测试从服务器恢复数据', 'info');
      const restoredData = await dataStorage.restoreFromServer('testData');
      
      if (restoredData) {
        addResult('✅ 服务器数据恢复成功', 'success');
        addResult(`📄 恢复的数据: ${JSON.stringify(restoredData.data)}`, 'info');
      } else {
        addResult('❌ 服务器数据恢复失败', 'error');
      }
      
      // 7. 测试跨会话数据同步
      addResult('🌐 步骤4: 清除 localStorage 模拟新会话', 'info');
      localStorage.removeItem('testData');
      
      // 重新初始化存储，应该从服务器恢复数据
      await dataStorage.initializeStorage();
      const reInitData = dataStorage.getLocalData('testData');
      
      if (reInitData) {
        addResult('✅ 跨会话数据同步成功', 'success');
      } else {
        addResult('❌ 跨会话数据同步失败', 'error');
      }
      
      addResult('🏁 测试完成', 'info');
      
    } catch (error) {
      addResult(`🔥 测试出错: ${error.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const testQuickSave = () => {
    const quickData = {
      quickTest: true,
      time: new Date().toISOString()
    };
    dataStorage.setLocalData('quickTest', quickData);
    addResult(`⚡ 快速保存测试数据: ${JSON.stringify(quickData)}`, 'info');
  };

  const checkDataDirectory = async () => {
    try {
      const response = await fetch('/api/status');
      const status = await response.json();
      addResult(`📊 系统状态: ${JSON.stringify(status.dataStatus, null, 2)}`, 'info');
    } catch (error) {
      addResult(`❌ 无法获取系统状态: ${error.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          🧪 数据存储测试页面
        </h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            测试控制面板
          </h2>
          
          <div className="space-x-4 mb-4">
            <button
              onClick={testStorageFlow}
              disabled={isRunning}
              className={`px-4 py-2 rounded text-white ${
                isRunning 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isRunning ? '🔄 测试进行中...' : '🚀 完整存储流程测试'}
            </button>
            
            <button
              onClick={testQuickSave}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              ⚡ 快速保存测试
            </button>
            
            <button
              onClick={checkDataDirectory}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              📊 检查数据状态
            </button>
            
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              🗑️ 清除日志
            </button>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>💡 提示: 打开浏览器控制台查看详细的调试日志</p>
            <p>🔍 测试步骤: 保存数据 → 服务器备份 → 数据恢复 → 跨会话同步</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            📋 测试结果日志
          </h2>
          
          <div className="h-96 overflow-y-auto border rounded p-4 bg-gray-50 dark:bg-gray-900 font-mono text-sm">
            {testResults.length === 0 ? (
              <div className="text-gray-500">暂无测试结果...</div>
            ) : (
              testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`mb-1 ${
                    result.type === 'error' ? 'text-red-600' : 
                    result.type === 'success' ? 'text-green-600' : 
                    'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-gray-500">[{result.timestamp}]</span> {result.message}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            🔍 调试指南
          </h3>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>• 打开浏览器开发者工具的控制台查看详细日志</li>
            <li>• 检查主机 <code>./data/backups/</code> 目录是否创建了用户文件夹</li>
            <li>• 在隐身模式下测试数据是否能正确恢复</li>
            <li>• 查看 Docker 容器日志: <code>docker-compose logs -f</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
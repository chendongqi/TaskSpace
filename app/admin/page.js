"use client";

import { useState, useEffect } from 'react';
import { dataStorage } from '@/lib/storage';

export default function AdminPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    loadStatus();
    loadUserData();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    await dataStorage.initializeStorage();
    const userId = dataStorage.getUserId();
    const allData = {
      userId,
      darkMode: dataStorage.getLocalData('darkMode'),
      theme: dataStorage.getLocalData('theme'),
      dailyTasks: dataStorage.getLocalData('dailyTasks'),
      customTags: dataStorage.getLocalData('customTags'),
      habits: dataStorage.getLocalData('habits')
    };
    setUserData(allData);
  };

  const testBackup = async () => {
    try {
      // 手动备份所有数据
      const keys = ['darkMode', 'theme', 'dailyTasks', 'customTags', 'habits'];
      for (const key of keys) {
        const data = dataStorage.getLocalData(key);
        // 只跳过null/undefined，允许false、空数组、空对象
        if (data !== null && data !== undefined) {
          await dataStorage.backupToServer(key, data);
        }
      }
      alert('Backup test completed! Check console for details.');
      loadStatus(); // Refresh status
    } catch (error) {
      alert('Backup test failed: ' + error.message);
    }
  };

  const exportData = () => {
    dataStorage.exportAllData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">System Admin</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          System Admin
        </h1>

        {/* System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            System Status
          </h2>
          {status && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Status:</span> 
                <span className={`ml-2 ${status.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                  {status.status}
                </span>
              </div>
              <div>
                <span className="font-medium">Environment:</span> 
                <span className="ml-2">{status.environment}</span>
              </div>
              <div>
                <span className="font-medium">Backup Dir:</span> 
                <span className="ml-2 text-xs">{status.backupDir}</span>
              </div>
              <div>
                <span className="font-medium">Timestamp:</span> 
                <span className="ml-2 text-xs">{new Date(status.timestamp).toLocaleString()}</span>
              </div>
            </div>
          )}
          
          {status?.dataStatus && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <h3 className="font-medium mb-2">Data Status</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Backup Dir Exists: 
                  <span className={status.dataStatus.backupDirExists ? 'text-green-600' : 'text-red-600'}>
                    {status.dataStatus.backupDirExists ? ' ✓' : ' ✗'}
                  </span>
                </div>
                <div>Dir Writable: 
                  <span className={status.dataStatus.backupDirWritable ? 'text-green-600' : 'text-red-600'}>
                    {status.dataStatus.backupDirWritable ? ' ✓' : ' ✗'}
                  </span>
                </div>
                <div>Users: {status.dataStatus.userCount}</div>
                <div>Total Backups: {status.dataStatus.totalBackups}</div>
              </div>
            </div>
          )}
        </div>

        {/* User Data */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Current User Data
          </h2>
          {userData && (
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">User ID:</span> {userData.userId}</div>
              <div><span className="font-medium">Dark Mode:</span> {String(userData.darkMode)}</div>
              <div><span className="font-medium">Theme:</span> {userData.theme}</div>
              <div><span className="font-medium">Tasks:</span> {Object.keys(userData.dailyTasks || {}).length} dates</div>
              <div><span className="font-medium">Custom Tags:</span> {userData.customTags?.length || 0}</div>
              <div><span className="font-medium">Habits:</span> {userData.habits?.length || 0}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Actions
          </h2>
          <div className="space-x-4">
            <button
              onClick={testBackup}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test Backup
            </button>
            <button
              onClick={exportData}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Export Data
            </button>
            <button
              onClick={loadStatus}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
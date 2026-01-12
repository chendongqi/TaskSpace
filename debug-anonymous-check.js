// 临时调试脚本 - 检查匿名数据检测逻辑
console.log('=== 调试匿名数据检测 ===');

if (typeof window !== 'undefined' && window.localStorage) {
  console.log('1. _current_user_id:', localStorage.getItem('_current_user_id'));
  console.log('2. dailyTasks:', localStorage.getItem('dailyTasks') ? '有数据' : '无数据');
  
  const dailyTasks = localStorage.getItem('dailyTasks');
  if (dailyTasks) {
    try {
      const parsed = JSON.parse(dailyTasks);
      console.log('3. dailyTasks 内容:', parsed);
      console.log('4. 是否为对象:', typeof parsed === 'object');
      console.log('5. keys 数量:', Object.keys(parsed).length);
    } catch (e) {
      console.error('解析失败:', e);
    }
  }
}

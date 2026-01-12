import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// 根据环境选择备份目录
// 开发环境：项目本地的 data 目录
// 生产环境（Docker）：容器内的 /app/data 目录
const BACKUP_DIR = process.env.BACKUP_DIR || 
  (process.env.NODE_ENV === 'production' 
    ? '/app/data/backups' 
    : path.join(process.cwd(), 'data', 'backups'));

// GET - 获取系统状态
export async function GET() {
  try {
    let dataStatus = {
      backupDirExists: false,
      backupDirWritable: false,
      userCount: 0,
      totalBackups: 0
    };

    try {
      // 检查备份目录是否存在
      await fs.access(BACKUP_DIR);
      dataStatus.backupDirExists = true;

      // 检查是否可写
      const testFile = path.join(BACKUP_DIR, 'test_write.tmp');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      dataStatus.backupDirWritable = true;

      // 统计用户数量和备份数量
      const users = await fs.readdir(BACKUP_DIR);
      dataStatus.userCount = users.length;

      let totalBackups = 0;
      for (const user of users) {
        const userDir = path.join(BACKUP_DIR, user);
        try {
          const backups = await fs.readdir(userDir);
          totalBackups += backups.length;
        } catch (error) {
          // 忽略无法读取的目录
        }
      }
      dataStatus.totalBackups = totalBackups;

    } catch (error) {
      console.error('Data directory check failed:', error);
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      dataStatus,
      backupDir: BACKUP_DIR
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: error.message,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}
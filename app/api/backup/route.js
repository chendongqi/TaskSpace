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

// 确保备份目录存在
async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
}

// POST - 备份数据
export async function POST(request) {
  console.log('🔄 Direct Backup API called');
  
  try {
    const requestData = await request.json();
    const { key, data, timestamp, userId } = requestData;
    
    console.log('📦 Direct backup request data:', { 
      key, 
      userId, 
      timestamp,
      dataType: typeof data,
      hasData: !!data
    });
    
    if (!key || data === undefined || !userId) {
      console.error('❌ Missing required fields:', { key: !!key, data: data !== undefined, userId: !!userId });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`📁 Ensuring backup directory: ${BACKUP_DIR}`);
    await ensureBackupDir();
    
    const userDir = path.join(BACKUP_DIR, userId);
    console.log(`👤 Creating user directory: ${userDir}`);
    await fs.mkdir(userDir, { recursive: true });
    
    const backupFile = path.join(userDir, `${key}.json`);
    const backupData = {
      key,
      data,
      timestamp,
      userId
    };
    
    console.log(`💾 Writing backup file: ${backupFile}`);
    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
    
    console.log('✅ Backup successful');
    return NextResponse.json({ success: true, timestamp });
  } catch (error) {
    console.error('🔥 Backup error:', error);
    return NextResponse.json({ 
      error: 'Backup failed', 
      details: error.message 
    }, { status: 500 });
  }
}

// GET - 恢复数据
export async function GET(request) {
  console.log('🔍 Restore API called');
  
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const userId = searchParams.get('userId');
    
    console.log('📋 Restore request params:', { key, userId });
    
    if (!key || !userId) {
      console.error('❌ Missing parameters:', { key: !!key, userId: !!userId });
      return NextResponse.json({ error: 'Missing key or userId' }, { status: 400 });
    }

    const backupFile = path.join(BACKUP_DIR, userId, `${key}.json`);
    console.log(`🔎 Looking for backup file: ${backupFile}`);
    
    try {
      const backupData = await fs.readFile(backupFile, 'utf8');
      const parsedData = JSON.parse(backupData);
      console.log(`✅ Restore successful for key: ${key}`);
      return NextResponse.json(parsedData);
    } catch (error) {
      console.log(`📂 Backup file not found: ${backupFile}`, error.message);
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('🔥 Restore error:', error);
    return NextResponse.json({ 
      error: 'Restore failed', 
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE - 清除用户所有备份
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const userDir = path.join(BACKUP_DIR, userId);
    await fs.rm(userDir, { recursive: true, force: true });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete backup error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
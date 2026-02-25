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

// 安全验证：防止路径遍历攻击
function sanitizePathComponent(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }
  // 只允许字母、数字、下划线、连字符、点（但不能以点开头）
  // 禁止 .. / \ 等路径遍历字符
  const sanitized = input.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  // 防止隐藏文件和路径遍历
  if (sanitized.startsWith('.') || sanitized.includes('..')) {
    return null;
  }
  // 限制长度
  if (sanitized.length > 100 || sanitized.length === 0) {
    return null;
  }
  return sanitized;
}

// 验证路径是否在允许的目录内
function isPathSafe(targetPath, baseDir) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(baseDir);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}

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

    // 安全验证：防止路径遍历攻击
    const sanitizedUserId = sanitizePathComponent(userId);
    const sanitizedKey = sanitizePathComponent(key);

    if (!sanitizedUserId || !sanitizedKey) {
      console.error('❌ Invalid userId or key (path traversal attempt blocked):', { userId, key });
      return NextResponse.json({ error: 'Invalid userId or key' }, { status: 400 });
    }

    console.log(`📁 Ensuring backup directory: ${BACKUP_DIR}`);
    await ensureBackupDir();

    const userDir = path.join(BACKUP_DIR, sanitizedUserId);

    // 二次验证：确保路径在允许的目录内
    if (!isPathSafe(userDir, BACKUP_DIR)) {
      console.error('❌ Path traversal attempt blocked:', { userDir, BACKUP_DIR });
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    console.log(`👤 Creating user directory: ${userDir}`);
    await fs.mkdir(userDir, { recursive: true });

    const backupFile = path.join(userDir, `${sanitizedKey}.json`);

    // 再次验证文件路径
    if (!isPathSafe(backupFile, BACKUP_DIR)) {
      console.error('❌ File path traversal attempt blocked:', { backupFile, BACKUP_DIR });
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const backupData = {
      key: sanitizedKey,
      data,
      timestamp,
      userId: sanitizedUserId
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

    // 安全验证：防止路径遍历攻击
    const sanitizedUserId = sanitizePathComponent(userId);
    const sanitizedKey = sanitizePathComponent(key);

    if (!sanitizedUserId || !sanitizedKey) {
      console.error('❌ Invalid userId or key (path traversal attempt blocked):', { userId, key });
      return NextResponse.json({ error: 'Invalid userId or key' }, { status: 400 });
    }

    const backupFile = path.join(BACKUP_DIR, sanitizedUserId, `${sanitizedKey}.json`);

    // 二次验证：确保路径在允许的目录内
    if (!isPathSafe(backupFile, BACKUP_DIR)) {
      console.error('❌ Path traversal attempt blocked:', { backupFile, BACKUP_DIR });
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    console.log(`🔎 Looking for backup file: ${backupFile}`);

    try {
      const backupData = await fs.readFile(backupFile, 'utf8');
      const parsedData = JSON.parse(backupData);
      console.log(`✅ Restore successful for key: ${sanitizedKey}`);
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
  console.log('🗑️ Delete backup API called');

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // 安全验证：防止路径遍历攻击
    const sanitizedUserId = sanitizePathComponent(userId);

    if (!sanitizedUserId) {
      console.error('❌ Invalid userId (path traversal attempt blocked):', { userId });
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    const userDir = path.join(BACKUP_DIR, sanitizedUserId);

    // 二次验证：确保路径在允许的目录内
    if (!isPathSafe(userDir, BACKUP_DIR)) {
      console.error('❌ Path traversal attempt blocked:', { userDir, BACKUP_DIR });
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    console.log(`🗑️ Deleting user backup directory: ${userDir}`);
    await fs.rm(userDir, { recursive: true, force: true });

    console.log('✅ Delete successful');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('🔥 Delete backup error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
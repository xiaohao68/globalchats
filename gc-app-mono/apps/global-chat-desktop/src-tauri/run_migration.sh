#!/usr/bin/env bash
# Global Chats - 数据库迁移脚本
# 用法: bash run_migration.sh [up|reset]

set -e

DB_NAME="globalchats"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
MIGRATION_DIR="$(dirname "$0")/migrations"

export PGPASSWORD="lxh2580lxh"

echo "=== Global Chats 数据库迁移工具 ==="

case "${1:-up}" in
  up)
    echo "执行迁移: 创建数据库和表..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null || true
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_DIR/001_init_schema.sql"
    echo "迁移完成！"
    ;;
  reset)
    echo "重置数据库..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_DIR/001_init_schema.sql"
    echo "重置完成！"
    ;;
  status)
    echo "检查表数量..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt" | head -20
    ;;
  *)
    echo "用法: bash run_migration.sh [up|reset|status]"
    exit 1
    ;;
esac

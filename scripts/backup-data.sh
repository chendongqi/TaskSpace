#!/bin/bash

# Priospace Data Backup Script
# This script helps backup and restore user data

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"
BACKUP_DIR="$PROJECT_DIR/backups"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to create backup
backup() {
    echo "Creating backup of Priospace data..."
    
    if [ ! -d "$DATA_DIR" ]; then
        echo "❌ Data directory not found: $DATA_DIR"
        exit 1
    fi
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/priospace_backup_$TIMESTAMP.tar.gz"
    
    echo "📦 Backing up data to: $BACKUP_FILE"
    tar -czf "$BACKUP_FILE" -C "$PROJECT_DIR" data/
    
    echo "✅ Backup completed successfully!"
    echo "📁 Backup location: $BACKUP_FILE"
    echo "📊 Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
}

# Function to restore backup
restore() {
    if [ -z "$1" ]; then
        echo "❌ Please specify backup file to restore"
        echo "Usage: $0 restore <backup_file.tar.gz>"
        list_backups
        exit 1
    fi
    
    BACKUP_FILE="$1"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "❌ Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    echo "🔄 Restoring backup from: $BACKUP_FILE"
    
    # Create backup of current data
    if [ -d "$DATA_DIR" ]; then
        echo "📋 Creating backup of current data before restore..."
        CURRENT_BACKUP="$BACKUP_DIR/current_data_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
        tar -czf "$CURRENT_BACKUP" -C "$PROJECT_DIR" data/
        echo "💾 Current data backed up to: $CURRENT_BACKUP"
    fi
    
    # Restore backup
    echo "📂 Extracting backup..."
    tar -xzf "$BACKUP_FILE" -C "$PROJECT_DIR"
    
    echo "✅ Restore completed successfully!"
}

# Function to list available backups
list_backups() {
    echo ""
    echo "📋 Available backups in $BACKUP_DIR:"
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null | awk '{print $9, "(" $5 ")", $6, $7, $8}' || echo "No backup files found"
    else
        echo "No backups found"
    fi
}

# Function to show data status
status() {
    echo "📊 Priospace Data Status"
    echo "========================="
    echo "📁 Project Directory: $PROJECT_DIR"
    echo "💾 Data Directory: $DATA_DIR"
    echo "📦 Backup Directory: $BACKUP_DIR"
    echo ""
    
    if [ -d "$DATA_DIR" ]; then
        echo "✅ Data directory exists"
        echo "📂 Data size: $(du -sh "$DATA_DIR" 2>/dev/null | cut -f1 || echo "Unable to calculate")"
        
        if [ -d "$DATA_DIR/backups" ]; then
            USER_COUNT=$(find "$DATA_DIR/backups" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
            echo "👥 Number of users: $USER_COUNT"
        fi
    else
        echo "❌ Data directory not found"
    fi
    
    echo ""
    list_backups
}

# Function to clean old backups
clean() {
    DAYS=${1:-30}  # Default: keep backups for 30 days
    
    echo "🧹 Cleaning backups older than $DAYS days..."
    
    if [ -d "$BACKUP_DIR" ]; then
        DELETED=$(find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$DAYS -delete -print 2>/dev/null | wc -l)
        echo "🗑️  Deleted $DELETED old backup files"
    else
        echo "📂 Backup directory doesn't exist"
    fi
}

# Main script logic
case "$1" in
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    list)
        list_backups
        ;;
    status)
        status
        ;;
    clean)
        clean "$2"
        ;;
    *)
        echo "🎯 Priospace Data Management Tool"
        echo ""
        echo "Usage: $0 {backup|restore|list|status|clean}"
        echo ""
        echo "Commands:"
        echo "  backup           Create a new backup of all data"
        echo "  restore <file>   Restore data from a backup file"
        echo "  list             List all available backups"
        echo "  status           Show current data status"
        echo "  clean [days]     Clean backups older than specified days (default: 30)"
        echo ""
        echo "Examples:"
        echo "  $0 backup"
        echo "  $0 restore backups/priospace_backup_20241228_143022.tar.gz"
        echo "  $0 clean 7    # Delete backups older than 7 days"
        exit 1
        ;;
esac
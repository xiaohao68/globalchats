// 清除 WhatsApp 的所有本地存储数据
// 包括 localStorage, sessionStorage, IndexedDB, Cookies 等

(function() {
  'use strict';

  console.log('[GC] Clearing all WhatsApp local data...');

  try {
    // 1. 清除 localStorage
    if (window.localStorage) {
      const keysToRemove = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        window.localStorage.removeItem(key);
        console.log(`[GC] Removed localStorage key: ${key}`);
      });
    }

    // 2. 清除 sessionStorage
    if (window.sessionStorage) {
      window.sessionStorage.clear();
      console.log('[GC] Cleared sessionStorage');
    }

    // 3. 清除 IndexedDB 数据库
    if (window.indexedDB) {
      // 获取所有数据库名称（这个 API 可能不被所有浏览器支持）
      if (window.indexedDB.databases) {
        window.indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name);
              console.log(`[GC] Deleted IndexedDB: ${db.name}`);
            }
          });
        }).catch(err => {
          console.log('[GC] Could not enumerate IndexedDB databases:', err);
        });
      }

      // 尝试删除已知的 WhatsApp 数据库
      const knownDatabases = ['wawc', 'model-storage', 'signal'];
      knownDatabases.forEach(dbName => {
        try {
          window.indexedDB.deleteDatabase(dbName);
          console.log(`[GC] Attempted to delete IndexedDB: ${dbName}`);
        } catch (err) {
          console.log(`[GC] Could not delete IndexedDB ${dbName}:`, err);
        }
      });
    }

    // 4. 清除 Cookies（通过设置过期时间）
    if (document.cookie) {
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        console.log(`[GC] Cleared cookie: ${name}`);
      });
    }

    console.log('[GC] All WhatsApp local data has been cleared');
  } catch (error) {
    console.error('[GC] Error clearing WhatsApp data:', error);
  }
})();

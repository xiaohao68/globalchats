// 禁用 Web Crypto API 的钥匙串访问
// 这个脚本会在 WebView 加载任何内容之前执行

(function() {
  'use strict';

  // 保存原始的 SubtleCrypto 方法
  const originalGenerateKey = window.crypto.subtle.generateKey;
  const originalImportKey = window.crypto.subtle.importKey;
  const originalExportKey = window.crypto.subtle.exportKey;

  // 重写 generateKey 方法，禁用 extractable 密钥（这些密钥会尝试存储到钥匙串）
  window.crypto.subtle.generateKey = function(algorithm, extractable, keyUsages) {
    // 强制设置 extractable 为 false，防止密钥被导出到钥匙串
    return originalGenerateKey.call(this, algorithm, false, keyUsages);
  };

  // 重写 importKey 方法
  window.crypto.subtle.importKey = function(format, keyData, algorithm, extractable, keyUsages) {
    // 强制设置 extractable 为 false
    return originalImportKey.call(this, format, keyData, algorithm, false, keyUsages);
  };

  // 重写 exportKey 方法，直接拒绝导出
  window.crypto.subtle.exportKey = function(format, key) {
    console.log('[GC] Blocked crypto.subtle.exportKey to prevent keychain access');
    return Promise.reject(new DOMException('exportKey is disabled', 'NotSupportedError'));
  };

  console.log('[GC] Web Crypto API keychain access has been disabled');
})();

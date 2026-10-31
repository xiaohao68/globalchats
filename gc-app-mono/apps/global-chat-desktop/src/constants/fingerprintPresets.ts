export interface FingerprintPreset {
  id: string;
  name: string;
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
}

export const FINGERPRINT_PRESETS: FingerprintPreset[] = [
  // Windows 浏览器
  {
    id: "chrome-win",
    name: "Chrome Windows",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    platform: "Win32",
    screenWidth: 1920,
    screenHeight: 1080,
  },
  {
    id: "chrome-win-4k",
    name: "Chrome Windows 4K",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    platform: "Win32",
    screenWidth: 3840,
    screenHeight: 2160,
  },
  {
    id: "edge-win",
    name: "Edge Windows",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    platform: "Win32",
    screenWidth: 1920,
    screenHeight: 1080,
  },
  {
    id: "firefox-win",
    name: "Firefox Windows",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    platform: "Win32",
    screenWidth: 1920,
    screenHeight: 1080,
  },
  // macOS 浏览器
  {
    id: "chrome-mac",
    name: "Chrome macOS",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    platform: "MacIntel",
    screenWidth: 1440,
    screenHeight: 900,
  },
  {
    id: "chrome-mac-retina",
    name: "Chrome macOS Retina",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    platform: "MacIntel",
    screenWidth: 2560,
    screenHeight: 1600,
  },
  {
    id: "safari-mac",
    name: "Safari macOS",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    platform: "MacIntel",
    screenWidth: 1440,
    screenHeight: 900,
  },
  {
    id: "firefox-mac",
    name: "Firefox macOS",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
    platform: "MacIntel",
    screenWidth: 1440,
    screenHeight: 900,
  },
  // Linux 浏览器
  {
    id: "chrome-linux",
    name: "Chrome Linux",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    platform: "Linux x86_64",
    screenWidth: 1920,
    screenHeight: 1080,
  },
  {
    id: "firefox-linux",
    name: "Firefox Linux",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
    platform: "Linux x86_64",
    screenWidth: 1920,
    screenHeight: 1080,
  },
  // 移动设备
  {
    id: "chrome-android",
    name: "Chrome Android",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    screenWidth: 1080,
    screenHeight: 2400,
  },
  {
    id: "safari-iphone",
    name: "Safari iPhone",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    screenWidth: 390,
    screenHeight: 844,
  },
  {
    id: "safari-ipad",
    name: "Safari iPad",
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    platform: "iPad",
    screenWidth: 1024,
    screenHeight: 1366,
  },
];

export const DEFAULT_FINGERPRINT = FINGERPRINT_PRESETS[0];

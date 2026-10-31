export const ContentTypeToExtension: Record<string, string> = {
  // Text Formats
  "text/html": ".html",
  "text/css": ".css",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "text/markdown": ".md",
  "text/calendar": ".ics",
  "text/javascript": ".js", // Legacy

  // Application Formats
  "application/javascript": ".js",
  "application/json": ".json",
  "application/ld+json": ".jsonld",
  "application/xml": ".xml",
  "application/pdf": ".pdf",
  "application/zip": ".zip",
  "application/x-rar-compressed": ".rar",
  "application/x-tar": ".tar",
  "application/x-7z-compressed": ".7z",
  "application/x-bzip2": ".bz2",
  "application/x-xz": ".xz",
  "application/gzip": ".gz",
  "application/wasm": ".wasm",
  "application/octet-stream": ".bin",

  // Office Documents
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    ".pptx",

  // Images
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/tiff": ".tiff",
  "image/bmp": ".bmp",
  "image/x-icon": ".ico",
  "image/heic": ".heic",
  "image/heif": ".heif",

  // Audio
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/aac": ".aac",
  "audio/webm": ".weba",
  "audio/flac": ".flac",
  "audio/midi": ".mid",

  // Video
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/ogg": ".ogv",
  "video/x-msvideo": ".avi",
  "video/quicktime": ".mov",
  "video/mpeg": ".mpeg",
  "video/3gpp": ".3gp",

  // Fonts
  "font/woff": ".woff",
  "font/woff2": ".woff2",
  "font/ttf": ".ttf",
  "font/otf": ".otf",
  "application/vnd.ms-fontobject": ".eot",

  // System/Executables
  "application/x-shockwave-flash": ".swf",
  "application/x-msdownload": ".exe",
  "application/x-debian-package": ".deb",
  "application/x-rpm": ".rpm",
  "application/vnd.android.package-archive": ".apk",

  // Database/Data Formats
  "application/sql": ".sql",
  "application/x-sqlite3": ".sqlite",
  "application/x-netcdf": ".nc",

  // Configuration
  "application/yaml": ".yaml",
  "application/x-yaml": ".yml",
  "application/x-toml": ".toml",

  // Ebook Formats
  "application/epub+zip": ".epub",
  "application/vnd.amazon.ebook": ".azw",
  "application/x-mobipocket-ebook": ".mobi",
};

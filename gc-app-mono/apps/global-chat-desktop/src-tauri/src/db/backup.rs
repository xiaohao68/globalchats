//! 本地数据库自动备份。
//!
//! 为什么要有它：换成 SQLite 后，业务员一整天的客户来信都在
//! `%APPDATA%/GlobalChats/gc.db` 这一个文件里。文件坏了 / 误删了就全没了。
//! 备份策略刻意做得非常轻：
//!   · **每次启动备份一次**（一天最多一份，同一天覆盖写）；
//!   · 只保留最近 7 份，超出自动删最老的；
//!   · 用 SQLite 自带的 `VACUUM INTO` —— 它顺带把碎片整理掉，
//!     产出的文件是**一致的快照**（不用担心复制到一半被写入打断）。
//!
//! 不做 Excel 导出：老板明确说过不要，导出文件反而容易被业务员改坏。

use crate::db::get_pool;
use anyhow::Result;
use chrono::NaiveDate;

/// 备份目录：`%APPDATA%/GlobalChats/backups/`
pub fn backup_dir() -> std::path::PathBuf {
  super::data_dir().join("backups")
}

/// 只保留最近多少份
const KEEP: usize = 7;

/// 备份一次。失败只记日志，绝不阻断启动 —— 备份挂了也得让人先用上软件。
pub async fn backup_now() {
  if let Err(err) = try_backup().await {
    log::warn!("[db] 备份失败（不影响使用）: {:#}", err);
  }
}

async fn try_backup() -> Result<()> {
  let pool = get_pool()?;
  let dir = backup_dir();
  std::fs::create_dir_all(&dir)?;

  let today = chrono::Utc::now().date_naive();
  let target = dir.join(format!("gc-{}.db", today.format("%Y-%m-%d")));

  // 同一天已经备过就跳过：一天一份足够，重复备只会白占磁盘
  if target.exists() {
    prune(&dir)?;
    return Ok(());
  }

  // VACUUM INTO 的目标必须不存在，且路径里的目录要已存在
  let path = target.to_string_lossy().replace('\\', "/");
  sqlx::query(&format!("VACUUM INTO '{path}'"))
    .execute(pool)
    .await?;

  let size = std::fs::metadata(&target).map(|m| m.len()).unwrap_or(0);
  log::info!(
    "[db] 已备份到 {:?}（{} KB）",
    target,
    size / 1024
  );

  prune(&dir)?;
  Ok(())
}

/// 删掉超出保留份数的老备份（按文件名里的日期排序，不依赖文件 mtime）。
fn prune(dir: &std::path::Path) -> Result<()> {
  let mut entries: Vec<(NaiveDate, std::path::PathBuf)> = Vec::new();
  for entry in std::fs::read_dir(dir)?.flatten() {
    let name = entry.file_name().to_string_lossy().to_string();
    if !name.starts_with("gc-") || !name.ends_with(".db") {
      continue;
    }
    let date = name.trim_start_matches("gc-").trim_end_matches(".db");
    if let Ok(d) = NaiveDate::parse_from_str(date, "%Y-%m-%d") {
      entries.push((d, entry.path()));
    }
  }

  if entries.len() <= KEEP {
    return Ok(());
  }

  entries.sort_by(|a, b| a.0.cmp(&b.0));
  let remove_count = entries.len() - KEEP;
  for (_date, path) in entries.into_iter().take(remove_count) {
    log::info!("[db] 删除过期备份: {:?}", path);
    let _ = std::fs::remove_file(path);
  }
  Ok(())
}

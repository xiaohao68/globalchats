use std::path::{Path, PathBuf};

pub fn get_unique_filename(path: &Path) -> PathBuf {
  if !path.exists() {
    return path.to_path_buf();
  }
  let file_stem = path.file_stem().unwrap().to_str().unwrap();
  let extension = path.extension().map_or("".to_string(), |ext| format!(".{}", ext.to_str().unwrap()));
  let parent = path.parent().unwrap();
  let mut counter = 1;
  loop {
    let new_filename = format!("{} ({}){}", file_stem, counter, extension);
    let new_path = parent.join(new_filename);
    if !new_path.exists() {
      return new_path;
    }
    counter += 1;
  }
}

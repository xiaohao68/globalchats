use log::warn;
use serde::Deserialize;
use tauri::{LogicalPosition, LogicalSize};

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebviewLayoutOptions {
  #[serde(default)]
  pub top: f32,
  #[serde(default)]
  pub left: f32,
  pub right: Option<f32>,
  pub bottom: Option<f32>,
  pub height: Option<f32>,
  pub width: Option<f32>,
}

impl WebviewLayoutOptions {
  pub fn to_size(&self, parent_size: &LogicalSize<f32>) -> LogicalSize<f32> {
    match (self.right, self.bottom, self.height, self.width) {
      (Some(right), Some(bottom), _, _) => LogicalSize::new(parent_size.width - self.left - right, parent_size.height - self.top - bottom),
      (_, _, Some(height), Some(width)) => LogicalSize::new(width, height),
      _ => {
        warn!("无效的布局参数: {:?}", self);
        LogicalSize::new(30., 30.)
      }
    }
  }
  pub fn to_position(&self, parent_position: &LogicalPosition<f32>) -> LogicalPosition<f32> {
    LogicalPosition::new(parent_position.x + self.left, parent_position.y + self.top)
  }
  pub fn to_sideview_size(&self, parent_size: &LogicalSize<f32>) -> LogicalSize<f32> {
    match (self.right, self.bottom, self.height, self.width) {
      (Some(_right), Some(bottom), _, Some(width)) => LogicalSize::new(width, parent_size.height - self.top - bottom),
      // (Some(right), Some(bottom), _, _) => LogicalSize::new(parent_size.width - self.left - right, parent_size.height - self.top - bottom),
      _ => {
        warn!("无效的布局参数: {:?}", self);
        LogicalSize::new(30., 30.)
      }
    }
  }
  pub fn to_sideview_position(&self, parent_size: &LogicalSize<f32>, parent_position: &LogicalPosition<f32>) -> LogicalPosition<f32> {
    if let (Some(right), Some(width)) = (self.right, self.width) {
      LogicalPosition::new(parent_size.width + parent_position.x - right - width, parent_position.y + self.top)
    } else {
      LogicalPosition::new(30., 30.)
    }
  }
}

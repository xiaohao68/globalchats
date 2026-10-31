use crate::cao::proxy::svc_proxy::SvcProxy;
use serde::Serialize;

#[derive(Serialize)]
pub struct CaoProxyStartRsp {
  url: String,
}

#[tauri::command]
pub async fn cao_proxy_start() -> Result<CaoProxyStartRsp, String> {
  let url = SvcProxy::instance().start().await.map_err(|x| x.to_string())?;

  Ok(CaoProxyStartRsp { url })
}

#[tauri::command]
pub async fn cao_proxy_stop() -> Result<(), String> {
  SvcProxy::instance().stop().await.map_err(|x| x.to_string())?;

  Ok(())
}

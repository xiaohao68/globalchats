use cao_proxy::certificate_authority::OpensslAuthority;
use cao_proxy::hyper::{Request, Response};
use cao_proxy::rustls::crypto::aws_lc_rs;
use cao_proxy::tokio_tungstenite::tungstenite::Message;
use cao_proxy::{Body, HttpContext, HttpHandler, Proxy, RequestOrResponse, WebSocketContext, WebSocketHandler};
use log::{error, info};
use once_cell::sync::OnceCell;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use tokio::sync::oneshot;
use tokio::sync::Mutex;

static S: OnceCell<SvcProxy> = OnceCell::new();

struct Server {
  shutdown_tx: oneshot::Sender<()>,
  proxy_url: String,
}

struct Inner {
  server: Option<Server>,
}

impl Default for Inner {
  fn default() -> Self {
    Self { server: None }
  }
}

pub struct SvcProxy {
  inner: Mutex<Inner>,
}

impl SvcProxy {
  pub fn instance() -> &'static SvcProxy {
    S.get_or_init(|| SvcProxy { inner: Mutex::new(Inner::default()) })
  }

  //noinspection HttpUrlsUsage
  pub async fn start(&self) -> anyhow::Result<String> {
    let mut inner = self.inner.lock().await;

    if let Some(x) = &inner.server {
      return Ok(x.proxy_url.clone());
    };

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
    let graceful_shutdown = async move {
      shutdown_rx.await.expect("Failed to install graceful shutdown");
    };

    let addr: SocketAddr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9999);
    let ca = OpensslAuthority::build_default_ca(1_000);
    let proxy = Proxy::builder()
      .with_addr(addr)
      .with_ca(ca)
      .with_rustls_client(aws_lc_rs::default_provider())
      .with_http_handler(LogHandler)
      .with_graceful_shutdown(graceful_shutdown)
      .build()?;

    let proxy_url = format!("http://{}", addr.to_string());

    inner.server = Some(Server {
      shutdown_tx,
      proxy_url: proxy_url.clone(),
    });

    tokio::spawn(async move {
      if let Err(e) = proxy.start().await {
        error!("{}", e);
      }
    });

    Ok(proxy_url)
  }

  pub async fn stop(&self) -> anyhow::Result<()> {
    {
      let mut inner = self.inner.lock().await;

      if let Some(x) = inner.server.take() {
        x.shutdown_tx.send(()).map_err(|_| anyhow::anyhow!("shutdown tx.send() failed"))?;
      }
    }

    Ok(())
  }
}

#[derive(Clone)]
struct LogHandler;

impl HttpHandler for LogHandler {
  async fn handle_request(&mut self, _ctx: &HttpContext, req0: Request<Body>) -> RequestOrResponse {
    info!("{:?}", req0);

    let mut req = req0.map(|x| x);
    *req.uri_mut() = "http://127.0.0.1:7897".parse().unwrap();

    info!("{:?}", req);

    req.into()
  }

  async fn handle_response(&mut self, _ctx: &HttpContext, res: Response<Body>) -> Response<Body> {
    info!("{:?}", res);
    res
  }
}

impl WebSocketHandler for LogHandler {
  async fn handle_message(&mut self, _ctx: &WebSocketContext, message: Message) -> Option<Message> {
    info!("{:?}", message);
    Some(message)
  }
}

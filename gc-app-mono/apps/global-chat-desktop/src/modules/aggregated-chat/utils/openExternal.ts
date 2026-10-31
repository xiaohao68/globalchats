let openerPromise: Promise<((url: string) => Promise<void>) | null> | null =
  null;

async function getOpener(): Promise<((url: string) => Promise<void>) | null> {
  if (!openerPromise) {
    openerPromise = import("@tauri-apps/plugin-opener")
      .then((mod) => (typeof mod.open === "function" ? mod.open : null))
      .catch(() => null);
  }

  return openerPromise;
}

export function toSafeExternalUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const normalized = trimmed.startsWith("www.")
    ? `https://${trimmed}`
    : trimmed;

  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function openExternalUrl(rawUrl: string): Promise<void> {
  const safeUrl = toSafeExternalUrl(rawUrl);
  if (!safeUrl) return;

  try {
    const open = await getOpener();
    if (open) {
      await open(safeUrl);
      return;
    }
  } catch {
    // fallthrough
  }

  window.open(safeUrl, "_blank", "noopener,noreferrer");
}

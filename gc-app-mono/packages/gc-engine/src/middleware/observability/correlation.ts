export function generateCorrelationId(): string {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject && typeof cryptoObject.randomUUID === "function") {
    return cryptoObject.randomUUID();
  }

  const rand = Math.random().toString(16).slice(2);
  const now = Date.now().toString(16);
  return `corr_${now}_${rand}`;
}

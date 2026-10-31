const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const SHARDING_KEY_LENGTH = 8;

export function createShardingKey(): string {
  const buffer = crypto.getRandomValues(new Uint8Array(SHARDING_KEY_LENGTH));
  return Array.from(buffer, (value) => ALPHABET[value % ALPHABET.length]).join("");
}

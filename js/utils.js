async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function isMatchLocked(matchDate) {
  const kickoff = new Date(matchDate).getTime();
  const lockTime = kickoff - (PRONOSTIX_CONFIG.lockMinutesBeforeMatch * 60 * 1000);
  return Date.now() >= lockTime;
}

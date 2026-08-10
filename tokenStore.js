// Armazena o token OAuth (access + refresh) em disco.
// Simples de propósito: é uso pessoal (um usuário só), não multi-tenant.
// ATENÇÃO: no Render (plano free), o disco NÃO é persistente entre deploys/restarts.
// Isso significa que se o servidor reiniciar, você pode precisar refazer o login.
// Se isso incomodar no futuro, migramos para um banco externo (ex: Render Postgres free tier).

const fs = require("fs");
const path = require("path");

const TOKEN_FILE = path.join(__dirname, "..", "data", "token.json");

function ensureDataDir() {
  const dir = path.dirname(TOKEN_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveToken(tokenData) {
  ensureDataDir();
  const payload = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: Date.now() + (tokenData.expires_in || 86400) * 1000,
    installed_app_id: tokenData.installed_app_id || null,
    location_id: tokenData.location_id || null,
  };
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(payload, null, 2));
  return payload;
}

function loadToken() {
  ensureDataDir();
  if (!fs.existsSync(TOKEN_FILE)) return null;
  try {
    const raw = fs.readFileSync(TOKEN_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Erro ao ler token salvo:", err.message);
    return null;
  }
}

function isExpired(tokenData) {
  if (!tokenData || !tokenData.expires_at) return true;
  // Considera expirado 5 minutos antes do prazo real, por segurança
  return Date.now() > tokenData.expires_at - 5 * 60 * 1000;
}

function clearToken() {
  if (fs.existsSync(TOKEN_FILE)) {
    fs.unlinkSync(TOKEN_FILE);
  }
}

module.exports = { saveToken, loadToken, isExpired, clearToken };

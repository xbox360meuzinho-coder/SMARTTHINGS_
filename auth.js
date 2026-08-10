const axios = require("axios");
const { saveToken, loadToken, isExpired } = require("./tokenStore");

const ST_AUTH_URL = "https://api.smartthings.com/oauth/authorize";
const ST_TOKEN_URL = "https://api.smartthings.com/oauth/token";

const CLIENT_ID = process.env.ST_CLIENT_ID;
const CLIENT_SECRET = process.env.ST_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL;
const REDIRECT_URI = `${BASE_URL}/oauth/callback`;

// Escopos que pedimos: ler e controlar dispositivos, ler localizações
const SCOPES = ["r:devices:*", "x:devices:*", "r:locations:*"].join(" ");

function getAuthorizationUrl(state) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state: state || "smartthings-mcp",
  });
  return `${ST_AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const response = await axios.post(
    ST_TOKEN_URL,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
    {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const saved = saveToken(response.data);
  console.log("Token OAuth salvo com sucesso.");
  return saved;
}

async function refreshAccessToken(refreshToken) {
  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const response = await axios.post(
    ST_TOKEN_URL,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const saved = saveToken(response.data);
  console.log("Token OAuth renovado com sucesso.");
  return saved;
}

// Retorna um access_token válido, renovando automaticamente se necessário.
// Lança erro se não houver login ainda.
async function getValidAccessToken() {
  let token = loadToken();

  if (!token) {
    throw new Error(
      "Nenhum token encontrado. É necessário fazer login primeiro em /oauth/login"
    );
  }

  if (isExpired(token)) {
    if (!token.refresh_token) {
      throw new Error(
        "Token expirado e sem refresh_token disponível. Faça login novamente em /oauth/login"
      );
    }
    token = await refreshAccessToken(token.refresh_token);
  }

  return token.access_token;
}

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getValidAccessToken,
  REDIRECT_URI,
};

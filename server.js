require("dotenv").config();
const express = require("express");
const {
  getAuthorizationUrl,
  exchangeCodeForToken,
  REDIRECT_URI,
} = require("./auth");
const st = require("./smartthingsClient");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Rota de saúde simples, pra confirmar que o servidor está no ar
// ---------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "smartthings-mcp",
    time: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// FLUXO OAUTH — login manual (você acessa isso pelo navegador uma vez)
// ---------------------------------------------------------------------------

// Passo 1: inicia o login, redireciona pro SmartThings
app.get("/oauth/login", (req, res) => {
  const url = getAuthorizationUrl();
  res.redirect(url);
});

// Passo 2: SmartThings redireciona de volta pra cá com o código
app.get("/oauth/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`Erro na autorização: ${error}`);
  }

  if (!code) {
    return res.status(400).send("Código de autorização ausente.");
  }

  try {
    await exchangeCodeForToken(code);
    res.send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 60px 20px; background: #1a0f2e; color: #fff;">
          <h1 style="color: #c9a961;">✅ Conectado com sucesso!</h1>
          <p>Seu servidor já pode controlar seus dispositivos SmartThings.</p>
          <p>Pode fechar essa aba e voltar pro Claude.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Erro ao trocar código por token:", err.response?.data || err.message);
    res.status(500).send("Erro ao completar login. Verifique os logs do servidor.");
  }
});

// ---------------------------------------------------------------------------
// LIFECYCLE DO SMARTAPP — endpoint que o SmartThings chama para
// verificar se o app existe (PING) e confirmar a instalação (CONFIRMATION).
// Precisa responder nesse formato específico ou o registro do app falha.
// ---------------------------------------------------------------------------
app.post("/smartapp", async (req, res) => {
  const { lifecycle } = req.body;

  console.log("Lifecycle recebido:", lifecycle);

  switch (lifecycle) {
    case "PING": {
      const challenge = req.body.pingData?.challenge;
      return res.json({ pingData: { challenge } });
    }

    case "CONFIRMATION": {
      const confirmationUrl = req.body.confirmationData?.confirmationUrl;
      console.log("URL de confirmação:", confirmationUrl);
      // O SmartThings espera que a gente confirme visitando essa URL,
      // mas normalmente ele mesmo já faz essa checagem. Retornamos 200.
      return res.json({});
    }

    case "CONFIGURATION":
      return res.json({
        configurationData: {
          initialize: {
            name: "Claude SmartThings",
            description: "Controle de dispositivos via Claude",
            id: "app",
            permissions: ["r:devices:*", "x:devices:*"],
            firstPageId: "1",
          },
        },
      });

    case "INSTALL":
    case "UPDATE":
      return res.json({ installData: {} });

    case "UNINSTALL":
      return res.json({ uninstallData: {} });

    case "EVENT":
      return res.json({ eventData: {} });

    default:
      return res.json({});
  }
});

// ---------------------------------------------------------------------------
// ENDPOINTS MCP — usados pelo Claude para controlar dispositivos.
// ---------------------------------------------------------------------------

app.get("/mcp/devices", async (req, res) => {
  try {
    const devices = await st.listDevices();
    res.json({ devices });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/mcp/devices/:id/status", async (req, res) => {
  try {
    const status = await st.getDeviceStatus(req.params.id);
    res.json(status);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/mcp/devices/:id/on", async (req, res) => {
  try {
    const result = await st.turnOn(req.params.id);
    res.json(result);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/mcp/devices/:id/off", async (req, res) => {
  try {
    const result = await st.turnOff(req.params.id);
    res.json(result);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/mcp/devices/:id/command", async (req, res) => {
  try {
    const { capability, command, args } = req.body;
    const result = await st.sendCommand(req.params.id, capability, command, args || []);
    res.json(result);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/mcp/rooms", async (req, res) => {
  try {
    const rooms = await st.listRooms();
    res.json({ rooms });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Redirect URI configurada: ${REDIRECT_URI}`);
});

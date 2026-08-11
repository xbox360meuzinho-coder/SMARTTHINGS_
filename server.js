require("dotenv").config();
const express = require("express");
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
    auth: "PAT",
    time: new Date().toISOString(),
  });
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
  console.log(`Autenticação: PAT (ST_PAT)`);
});

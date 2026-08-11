require("dotenv").config();
const express = require("express");
const { TOOLS, callTool } = require("./tools");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PROTOCOL_VERSION = "2025-06-18";

// ---------------------------------------------------------------------------
// Rota de saúde simples
// ---------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "smartthings-mcp",
    protocol: "MCP (JSON-RPC over HTTP)",
    time: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// ENDPOINT MCP — único endpoint que fala JSON-RPC 2.0.
// O Claude manda POST aqui com métodos como "initialize", "tools/list",
// "tools/call", etc, e a gente responde no formato esperado.
// ---------------------------------------------------------------------------
app.post("/mcp", async (req, res) => {
  const { jsonrpc, id, method, params } = req.body;

  console.log(`MCP request: ${method}`, JSON.stringify(params || {}));

  try {
    let result;

    switch (method) {
      case "initialize":
        result = {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "smartthings-mcp",
            version: "3.0.0",
          },
        };
        break;

      case "notifications/initialized":
        // Notificação, não espera resposta com corpo
        return res.status(202).end();

      case "tools/list":
        result = { tools: TOOLS };
        break;

      case "tools/call": {
        const { name, arguments: args } = params;
        result = await callTool(name, args || {});
        break;
      }

      case "ping":
        result = {};
        break;

      default:
        return res.status(200).json({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Método não suportado: ${method}`,
          },
        });
    }

    res.status(200).json({
      jsonrpc: "2.0",
      id,
      result,
    });
  } catch (err) {
    console.error("Erro ao processar requisição MCP:", err.response?.data || err.message);
    res.status(200).json({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32000,
        message: err.message || "Erro interno do servidor",
      },
    });
  }
});

// GET no endpoint MCP não é usado nesse modo simples (sem SSE stream longo)
app.get("/mcp", (req, res) => {
  res.status(405).json({ error: "Method not allowed. Use POST." });
});

// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Servidor MCP rodando na porta ${PORT}`);
  console.log(`Endpoint MCP: /mcp`);
});

const axios = require("axios");

const API_BASE = "https://api.smartthings.com/v1";

// PAT (Personal Access Token) vindo da variável de ambiente.
// Gerado em https://account.smartthings.com/tokens
function getToken() {
  const token = process.env.ST_PAT;
  if (!token) {
    throw new Error(
      "ST_PAT não configurado. Defina a variável de ambiente ST_PAT no Render com seu Personal Access Token do SmartThings."
    );
  }
  return token;
}

async function apiRequest(method, endpoint, data) {
  const token = getToken();
  const response = await axios({
    method,
    url: `${API_BASE}${endpoint}`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data,
  });
  return response.data;
}

async function listDevices() {
  const result = await apiRequest("GET", "/devices");
  return (result.items || []).map((d) => ({
    deviceId: d.deviceId,
    name: d.label || d.name,
    type: d.type,
    roomId: d.roomId || null,
    capabilities: (d.components?.[0]?.capabilities || []).map((c) => c.id),
  }));
}

async function getDeviceStatus(deviceId) {
  return apiRequest("GET", `/devices/${deviceId}/status`);
}

async function sendCommand(deviceId, capability, command, args = []) {
  const body = {
    commands: [
      {
        component: "main",
        capability,
        command,
        arguments: args,
      },
    ],
  };
  return apiRequest("POST", `/devices/${deviceId}/commands`, body);
}

async function turnOn(deviceId) {
  return sendCommand(deviceId, "switch", "on");
}

async function turnOff(deviceId) {
  return sendCommand(deviceId, "switch", "off");
}

async function setVolume(deviceId, level) {
  return sendCommand(deviceId, "audioVolume", "setVolume", [level]);
}

async function listRooms() {
  const locations = await apiRequest("GET", "/locations");
  const location = locations.items?.[0];
  if (!location) return [];
  const rooms = await apiRequest("GET", `/locations/${location.locationId}/rooms`);
  return rooms.items || [];
}

module.exports = {
  listDevices,
  getDeviceStatus,
  sendCommand,
  turnOn,
  turnOff,
  setVolume,
  listRooms,
};

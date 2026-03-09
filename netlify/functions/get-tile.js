const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const RPC_URL = process.env.RPC_URL;
const CONTRACT_ADDRESS = process.env.DOTTIC_CONTRACT_ADDRESS;

const ABI = [
  "function pixelOpened(uint256) view returns (bool)",
  "function solvedByGuess() view returns (bool)",
  "function gameEnded() view returns (bool)"
];

function bad(statusCode, message) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: message }),
  };
}

exports.handler = async (event) => {
  try {
    const imageId = event.queryStringParameters?.imageId;
    const tileIdRaw = event.queryStringParameters?.tileId;

    if (!imageId) {
      return bad(400, "Missing imageId");
    }

    if (tileIdRaw === undefined) {
      return bad(400, "Missing tileId");
    }

    const tileId = Number(tileIdRaw);

    if (!Number.isInteger(tileId) || tileId < 0 || tileId > 99) {
      return bad(400, "Invalid tileId");
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(imageId)) {
      return bad(400, "Invalid imageId");
    }

    if (!RPC_URL) {
      return bad(500, "Missing RPC_URL");
    }

    if (!CONTRACT_ADDRESS) {
      return bad(500, "Missing DOTTIC_CONTRACT_ADDRESS");
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    let solvedByGuess = false;
    let gameEnded = false;

    try {
      solvedByGuess = await contract.solvedByGuess();
    } catch {
      solvedByGuess = false;
    }

    try {
      gameEnded = await contract.gameEnded();
    } catch {
      gameEnded = false;
    }

    const isOpened = solvedByGuess || gameEnded || (await contract.pixelOpened(tileId));

    const filePath = isOpened
      ? path.join(process.cwd(), "private", "tiles", imageId, `tile-${tileId}.webp`)
      : path.join(process.cwd(), "private", "placeholders", "hidden.webp");

    if (!fs.existsSync(filePath)) {
      return bad(404, "Tile file not found");
    }

    const fileBuffer = fs.readFileSync(filePath);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": isOpened
          ? "public, max-age=31536000, immutable"
          : "no-store",
      },
      body: fileBuffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    return bad(500, err.message || "Internal error");
  }
};

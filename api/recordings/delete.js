const { kv } = require("@vercel/kv");

const DELETE_PASSWORD = process.env.DELETE_PASSWORD || "piano2026";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, password } = req.body || {};

    if (!id || !id.startsWith("r_")) {
      return res.status(400).json({ error: "Valid recording ID required" });
    }
    if (password !== DELETE_PASSWORD) {
      return res.status(403).json({ error: "Wrong password" });
    }

    const exists = await kv.get("rec:" + id);
    if (!exists) {
      return res.status(404).json({ error: "Recording not found" });
    }

    await kv.del("rec:" + id);
    await kv.zrem("rec:list", id);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

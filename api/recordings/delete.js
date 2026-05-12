const { kv } = require("@vercel/kv");

const DELETE_PASSWORD = process.env.DELETE_PASSWORD || null;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!req.headers["content-type"] || !req.headers["content-type"].includes("application/json")) {
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }

  try {
    const { id, password } = req.body || {};

    if (!id || !id.startsWith("r_")) {
      return res.status(400).json({ error: "Valid recording ID required" });
    }

    const raw = await kv.get("rec:" + id);
    if (!raw) {
      return res.status(404).json({ error: "Recording not found" });
    }

    const recording = typeof raw === "string" ? JSON.parse(raw) : raw;

    const expectedPw = recording.pw || recording.title;
    if (password !== expectedPw && !(DELETE_PASSWORD && password === DELETE_PASSWORD)) {
      return res.status(403).json({ error: "Wrong password" });
    }

    await kv.del("rec:" + id);
    await kv.zrem("rec:list", id);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

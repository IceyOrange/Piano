const { kv } = require("@vercel/kv");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    if (!id || !id.startsWith("r_")) {
      return res.status(400).json({ error: "Valid recording ID required" });
    }

    const raw = await kv.get("rec:" + id);
    if (!raw) {
      return res.status(404).json({ error: "Recording not found" });
    }

    var recording;
    try {
      recording = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      return res.status(500).json({ error: "Data error" });
    }

    // Increment play count (fire-and-forget, non-blocking)
    kv.incr("plays:" + id).catch(function () {});

    var safe = { id: recording.id, name: recording.name, title: recording.title, ts: recording.ts, dur: recording.dur, ev: recording.ev };
    return res.status(200).json(safe);
  } catch (err) {
    console.error("Get error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

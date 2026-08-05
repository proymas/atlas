const UPSTREAM = "https://atlas-validator.vercel.app/api/analyze";

const MODE_BY_STAGE = {
  screen: "questions",
  report: "report",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = { ...req.body };

    // The browser application uses `stage`; the analysis engine uses `mode`.
    // Keep the public API stable and translate at the proxy boundary.
    if (!body.mode && body.stage) {
      body.mode = MODE_BY_STAGE[body.stage];
    }
    delete body.stage;

    if (!body.mode) {
      return res.status(400).json({ error: "Modo inválido" });
    }

    if (body.language === "en") {
      body.language = "English";
    }

    const upstreamResponse = await fetch(UPSTREAM, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await upstreamResponse.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "Invalid response from analysis engine" });
    }

    return res.status(upstreamResponse.status).json(data);
  } catch {
    return res.status(502).json({
      error: "Atlas could not complete the analysis. Please try again.",
    });
  }
}

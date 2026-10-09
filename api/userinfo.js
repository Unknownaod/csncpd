
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { access_token } = req.body || {};

  if (
    typeof access_token !== "string" ||
    access_token.length === 0 ||
    access_token.length > 4096
  ) {
    return res.status(400).json({ error: "invalid_request" });
  }

  const issuer = (
    process.env.OAUTH_ISSUER || "https://api.fades.lol"
  ).replace(/\/+$/, "");

  try {
    const upstream = await fetch(`${issuer}/oauth/userinfo`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await upstream.json();

    return res.status(upstream.status).json(data);
  } catch (error) {
    console.error("Fades UserInfo failed:", error.message);

    return res.status(502).json({
      error: "upstream_unavailable",
    });
  }
}

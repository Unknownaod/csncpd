
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  const issuer = (
    process.env.OAUTH_ISSUER || "https://api.fades.lol"
  ).replace(/\/+$/, "");

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: "server_configuration_error",
    });
  }

  const { access_token, refresh_token } = req.body || {};

  if (
    (access_token != null && typeof access_token !== "string") ||
    (refresh_token != null && typeof refresh_token !== "string")
  ) {
    return res.status(400).json({ error: "invalid_request" });
  }

  try {
    const tokens = [...new Set(
      [access_token, refresh_token]
        .filter((token) => typeof token === "string" && token.length > 0)
    )];

    const results = await Promise.all(
      tokens.map(async (token) => {
        const response = await fetch(`${issuer}/oauth/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            token,
          }),
        });

        return response.ok;
      })
    );

    return res.status(200).json({
      success: true,
      revoked: results.every(Boolean),
    });
  } catch (error) {
    console.error("Fades token revocation failed:", error.message);

    return res.status(502).json({
      error: "revocation_unavailable",
    });
  }
}

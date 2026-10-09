
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  const redirectUri = "https://cpdswat.xyz/api/auth/callback";
  const issuer = (
    process.env.OAUTH_ISSUER || "https://api.fades.lol"
  ).replace(/\/+$/, "");

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: "server_configuration_error",
    });
  }

  const {
    code,
    code_verifier,
    client_id,
    redirect_uri,
  } = req.body || {};

  if (
    typeof code !== "string" ||
    typeof code_verifier !== "string" ||
    client_id !== clientId ||
    redirect_uri !== redirectUri
  ) {
    return res.status(400).json({
      error: "invalid_request",
    });
  }

  // RFC 7636: a valid S256 PKCE verifier is 43–128 characters.
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(code_verifier)) {
    return res.status(400).json({
      error: "invalid_code_verifier",
    });
  }

  try {
    const upstream = await fetch(`${issuer}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        code_verifier,
      }),
    });

    const data = await upstream.json();

    return res.status(upstream.status).json(data);
  } catch (error) {
    console.error("Fades token exchange failed:", error.message);

    return res.status(502).json({
      error: "upstream_unavailable",
    });
  }
}

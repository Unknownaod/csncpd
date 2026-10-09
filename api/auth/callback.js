
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const { code, state, error, error_description } = req.query;

  const validSingle = (value) =>
    typeof value === "string" && value.length > 0;

  const params = new URLSearchParams();

  if (validSingle(code)) {
    params.set("code", code);
  }

  if (validSingle(state)) {
    params.set("state", state);
  }

  if (validSingle(error)) {
    params.set("error", error);
  }

  if (validSingle(error_description)) {
    params.set("error_description", error_description);
  }

  if (
    (!validSingle(code) && !validSingle(error)) ||
    !validSingle(state)
  ) {
    return res.status(400).send("Invalid OAuth callback.");
  }

  return res.redirect(303, `/?${params.toString()}`);
}

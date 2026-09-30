import "server-only";

/**
 * Headers sent on every request to Magento (REST, settings files, media, widgets):
 * - MAGENTO_USER_AGENT: production's firewall rejects unknown User-Agents.
 * - MAGENTO_ACCESS_HEADER_NAME / _VALUE: a secret header the hosting team can allow in
 *   the AWS WAF, so this server isn't served the bot check (cloud hosts like Vercel
 *   are challenged by default and have no fixed IP addresses to allowlist).
 */
export function backendHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const userAgent = process.env.MAGENTO_USER_AGENT;
  if (userAgent) headers["User-Agent"] = userAgent;
  const name = process.env.MAGENTO_ACCESS_HEADER_NAME?.trim();
  const value = process.env.MAGENTO_ACCESS_HEADER_VALUE?.trim();
  if (name && value) headers[name] = value;
  return headers;
}

/** The AWS WAF "Human Verification" page, served instead of the response to suspected bots. */
export const isWafChallenge = (body: string) =>
  /awsWafCookieDomainList|gokuProps|<title>Human Verification<\/title>/i.test(body);

export const WAF_MESSAGE =
  "Blocked by the website firewall (AWS WAF bot check): ask the hosting team to allow this server";

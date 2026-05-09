import { verifyMedhubSsoToken } from "@/lib/medhub-sso";
import { MedhubSsoClient } from "./sso-client";

export default async function MedhubSsoPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const tokenRaw =
    typeof sp.token === "string" ? sp.token.trim() : "";

  let jwtPrecheck: "missing" | "invalid" | "valid" = "missing";
  if (tokenRaw) {
    const payload = await verifyMedhubSsoToken(tokenRaw);
    jwtPrecheck = payload ? "valid" : "invalid";
  }

  return (
    <MedhubSsoClient token={tokenRaw || undefined} jwtPrecheck={jwtPrecheck} />
  );
}

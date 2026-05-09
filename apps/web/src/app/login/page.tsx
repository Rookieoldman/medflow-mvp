import { LoginClient } from "./login-client";

export default function LoginPage() {
  const allowPasswordLogin =
    process.env.ALLOW_MEDFLOW_PASSWORD_LOGIN === "true";

  return <LoginClient allowPasswordLogin={allowPasswordLogin} />;
}

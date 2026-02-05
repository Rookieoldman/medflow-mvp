import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  switch (session.user.role) {
    case "TECNICO":
      redirect("/tecnico");

    case "CELADOR":
      redirect("/celador");

    case "ADMIN":
      redirect("/admin");

    default:
      redirect("/login");
  }
}

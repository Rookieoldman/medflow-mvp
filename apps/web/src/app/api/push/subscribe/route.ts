import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const body   = await req.json();
  const { endpoint, keys } = body ?? {};

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return new NextResponse("Payload inválido", { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where:  { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId },
  });

  return NextResponse.json({ ok: true });
}

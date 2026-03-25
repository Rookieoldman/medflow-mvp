import { prisma } from "./prisma";
import { TransferStatus } from "@prisma/client";

export async function recordEvent(
  transferId: string,
  actorId:    string,
  toStatus:   TransferStatus,
  fromStatus?: TransferStatus | null,
  note?:      string
) {
  await prisma.transferEvent.create({
    data: {
      transferId,
      actorId,
      toStatus,
      fromStatus: fromStatus ?? undefined,
      note:       note ?? undefined,
    },
  });
}

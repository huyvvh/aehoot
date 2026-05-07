import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import { folderSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const existing = await prisma.folder.findFirst({
    where: { id, userId: user.userId },
  });
  if (!existing) return apiError("Folder không tồn tại", "NOT_FOUND", 404);

  const body = await req.json();
  const parsed = folderSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR");
  }

  const folder = await prisma.folder.update({
    where: { id },
    data: {
      name: parsed.data.name,
      color: parsed.data.color,
    },
  });

  return apiResponse(folder);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const existing = await prisma.folder.findFirst({
    where: { id, userId: user.userId },
  });
  if (!existing) return apiError("Folder không tồn tại", "NOT_FOUND", 404);

  await prisma.folder.delete({ where: { id } });
  return apiResponse({ deleted: true });
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import { folderSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const folders = await prisma.folder.findMany({
    where: { userId: user.userId },
    include: {
      _count: { select: { questionSets: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiResponse(folders);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const body = await req.json();
  const parsed = folderSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
  }

  const folder = await prisma.folder.create({
    data: {
      name: parsed.data.name,
      color: parsed.data.color,
      userId: user.userId,
    },
  });

  return apiResponse(folder, 201);
}

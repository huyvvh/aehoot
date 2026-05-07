import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import { questionSetSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const sets = await prisma.questionSet.findMany({
    where: { authorId: user.userId },
    include: {
      _count: { select: { questions: true } },
      folder: { select: { id: true, name: true, color: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return apiResponse(sets);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const body = await req.json();
  const parsed = questionSetSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR");
  }

  const { title, description, coverImage, isPublic, folderId, questions } =
    parsed.data;

  if (folderId) {
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId: user.userId },
    });
    if (!folder) return apiError("Folder không tồn tại", "FOLDER_NOT_FOUND", 404);
  }

  const set = await prisma.questionSet.create({
    data: {
      title,
      description,
      coverImage,
      isPublic,
      authorId: user.userId,
      folderId,
      questions: {
        create: questions.map((q, qi) => ({
          text: q.text,
          imageUrl: q.imageUrl,
          timeLimit: q.timeLimit,
          points: q.points,
          order: qi,
          answers: {
            create: q.answers.map((a, ai) => ({
              text: a.text,
              isCorrect: a.isCorrect,
              order: ai,
            })),
          },
        })),
      },
    },
    include: {
      questions: { include: { answers: true }, orderBy: { order: "asc" } },
    },
  });

  return apiResponse(set, 201);
}

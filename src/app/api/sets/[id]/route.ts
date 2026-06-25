import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import { questionSetSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = getUserFromRequest(req);

  const set = await prisma.questionSet.findFirst({
    where: {
      id,
      OR: [
        { isPublic: true },
        ...(user ? [{ authorId: user.userId }] : []),
      ],
    },
    include: {
      questions: {
        include: { answers: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
      folder: { select: { id: true, name: true, color: true } },
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      ...(user
        ? { favorites: { where: { userId: user.userId }, select: { id: true } } }
        : {}),
    },
  });

  if (!set) return apiError("Set không tồn tại", "NOT_FOUND", 404);

  const result = {
    ...set,
    isFavorited: user ? (set as any).favorites?.length > 0 : false,
    isOwner: user ? set.authorId === user.userId : false,
    favorites: undefined,
  };

  return apiResponse(result);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const existing = await prisma.questionSet.findFirst({
    where: { id, authorId: user.userId },
  });
  if (!existing) return apiError("Set không tồn tại", "NOT_FOUND", 404);

  const body = await req.json();
  const parsed = questionSetSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
  }

  const { title, description, coverImage, isPublic, folderId, questions } =
    parsed.data;

  if (folderId) {
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId: user.userId },
    });
    if (!folder) return apiError("Folder không tồn tại", "FOLDER_NOT_FOUND", 404);
  }

  await prisma.question.deleteMany({ where: { questionSetId: id } });

  const set = await prisma.questionSet.update({
    where: { id },
    data: {
      title,
      description,
      coverImage,
      isPublic,
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
      questions: {
        include: { answers: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  });

  return apiResponse(set);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const existing = await prisma.questionSet.findFirst({
    where: { id, authorId: user.userId },
  });
  if (!existing) return apiError("Set không tồn tại", "NOT_FOUND", 404);

  await prisma.questionSet.delete({ where: { id } });
  return apiResponse({ deleted: true });
}

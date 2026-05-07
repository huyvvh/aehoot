"use client";

import { use } from "react";
import { SetCreatorForm } from "@/components/sets/set-creator-form";

export default function EditSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SetCreatorForm editId={id} />;
}

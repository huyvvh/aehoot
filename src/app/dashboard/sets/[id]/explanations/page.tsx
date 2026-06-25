"use client";

import { use, useEffect, useState } from "react";
import { ExplanationReviewer } from "@/components/sets/explanation-reviewer";

export default function ExplanationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [title, setTitle] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/sets/${id}`);
        const data = await res.json();
        if (data.success) setTitle(data.data.title);
      } catch {
        /* ignore */
      }
    })();
  }, [id]);

  return <ExplanationReviewer questionSetId={id} setTitle={title} />;
}

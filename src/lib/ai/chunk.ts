/**
 * Tách văn bản thành các đoạn (~maxChars), ưu tiên cắt theo ranh giới đoạn/dòng
 * để giữ ngữ cảnh điều khoản. Có overlap nhỏ để không mất ngữ cảnh giữa 2 chunk.
 *
 * Dùng ký tự thay vì token cho đơn giản & ổn định; ~1 token ≈ 3-4 ký tự,
 * nên maxChars 6000 ≈ 1.5-2k token mỗi chunk.
 */
export function chunkText(
  text: string,
  { maxChars = 6000, overlap = 300 }: { maxChars?: number; overlap?: number } = {}
): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  // Tách theo đoạn (2 newline), rồi gộp lại đến gần maxChars.
  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
  };

  for (const para of paragraphs) {
    // Đoạn quá dài: cắt cứng theo maxChars.
    if (para.length > maxChars) {
      pushCurrent();
      current = "";
      for (let i = 0; i < para.length; i += maxChars - overlap) {
        chunks.push(para.slice(i, i + maxChars).trim());
      }
      continue;
    }

    if (current.length + para.length + 2 > maxChars) {
      pushCurrent();
      const tail = current.slice(-overlap);
      current = tail ? `${tail}\n\n${para}` : para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }

  pushCurrent();
  return chunks;
}

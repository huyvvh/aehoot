import mammoth from "mammoth";
import ExcelJS from "exceljs";

export type SupportedMime =
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // .docx
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" // .xlsx
  | "application/vnd.ms-excel"; // .xls (legacy, best-effort)

export const SUPPORTED_EXTENSIONS = [".docx", ".xlsx", ".xls"] as const;

export function isSupportedFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Trích text từ tài liệu nghiệp vụ. Hỗ trợ DOCX (mammoth) và Excel (exceljs).
 * Excel được chuyển thành bảng phân tách bằng " | " kèm header để GLM hiểu
 * ngữ cảnh cột (vd bảng sản phẩm tài chính).
 */
export async function extractText(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value.trim();
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return extractExcel(buffer);
  }

  throw new Error(`Định dạng không hỗ trợ: ${filename}`);
}

async function extractExcel(buffer: Buffer): Promise<string> {
  const wb = new ExcelJS.Workbook();
  // exceljs chấp nhận ArrayBuffer/Buffer cho .xlsx
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);

  const parts: string[] = [];

  wb.eachSheet((sheet) => {
    const rows: string[] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        cells.push(cellToString(cell.value));
      });
      const line = cells.join(" | ").trim();
      if (line.replace(/\|/g, "").trim()) rows.push(line);
    });

    if (rows.length) {
      parts.push(`## Sheet: ${sheet.name}\n${rows.join("\n")}`);
    }
  });

  return parts.join("\n\n").trim();
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if ("text" in value && typeof value.text === "string") return value.text; // rich text / hyperlink
    if ("result" in value) return String(value.result ?? ""); // formula
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("");
    }
    return "";
  }
  return String(value);
}

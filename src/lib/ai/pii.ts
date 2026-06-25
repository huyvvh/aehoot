/**
 * Che PII trước khi gửi tài liệu lên LLM (Z.ai cloud).
 * Quan trọng với tài liệu nghiệp vụ tài chính nội bộ: không để lộ thông tin
 * định danh khách hàng/nhân sự ra dịch vụ ngoài.
 *
 * Chiến lược: thay bằng placeholder để giữ ngữ cảnh câu hỏi mà không lộ dữ liệu.
 */

export interface RedactionResult {
  text: string;
  count: number;
}

const PATTERNS: { re: RegExp; tag: string }[] = [
  // Email
  { re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, tag: "[EMAIL]" },
  // Số điện thoại VN: 0xxxxxxxxx hoặc +84xxxxxxxxx
  { re: /(?:\+84|0)\d{9,10}\b/g, tag: "[SĐT]" },
  // CCCD/CMND: 9 hoặc 12 chữ số đứng độc lập
  { re: /\b\d{12}\b/g, tag: "[CCCD]" },
  { re: /\b\d{9}\b/g, tag: "[CMND]" },
  // Số tài khoản / thẻ: chuỗi 13-19 chữ số (có thể có dấu cách/gạch)
  { re: /\b(?:\d[ -]?){13,19}\b/g, tag: "[SỐ_TK]" },
];

export function redactPII(text: string): RedactionResult {
  let count = 0;
  let out = text;
  for (const { re, tag } of PATTERNS) {
    out = out.replace(re, (m) => {
      // Bỏ qua chuỗi quá ngắn sau khi loại ký tự ngăn cách (tránh false positive).
      if (tag === "[SỐ_TK]" && m.replace(/[ -]/g, "").length < 13) return m;
      count++;
      return tag;
    });
  }
  return { text: out, count };
}

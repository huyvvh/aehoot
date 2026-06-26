import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkText } from "./chunk";
import { redactPII } from "./pii";
import { overlapRatio, checkGrounding } from "./validate";
import { splitSentences, diffSentences, chunkIdsWithChanges } from "./docdiff";

test("chunkText: trả về 1 chunk khi text ngắn", () => {
  const chunks = chunkText("Một đoạn ngắn.");
  assert.equal(chunks.length, 1);
});

test("chunkText: chuỗi rỗng trả về mảng rỗng", () => {
  assert.deepEqual(chunkText("   "), []);
});

test("chunkText: text dài bị tách thành nhiều chunk", () => {
  const long = "Điều khoản.\n\n".repeat(2000); // ~26k ký tự
  const chunks = chunkText(long, { maxChars: 6000 });
  assert.ok(chunks.length > 1);
  for (const c of chunks) assert.ok(c.length <= 6000);
});

test("redactPII: che email", () => {
  const { text, count } = redactPII("Liên hệ a.nguyen@bank.vn để biết thêm");
  assert.ok(text.includes("[EMAIL]"));
  assert.ok(!text.includes("a.nguyen@bank.vn"));
  assert.equal(count, 1);
});

test("redactPII: che số điện thoại VN", () => {
  const { text } = redactPII("Gọi 0912345678 hoặc +84987654321");
  assert.ok(!/0912345678/.test(text));
  assert.ok(text.includes("[SĐT]"));
});

test("redactPII: che CCCD 12 số và số tài khoản dài", () => {
  const { text } = redactPII("CCCD 012345678901, STK 19001234567890");
  assert.ok(text.includes("[CCCD]"));
  assert.ok(!text.includes("012345678901"));
});

test("redactPII: text sạch không bị đổi", () => {
  const clean = "Quy định cho vay tiêu dùng áp dụng từ năm 2026.";
  const { text, count } = redactPII(clean);
  assert.equal(text, clean);
  assert.equal(count, 0);
});

test("overlapRatio: trùng nguyên cụm = 1", () => {
  const chunk = "Khách hàng phải cung cấp giấy tờ tùy thân khi mở tài khoản.";
  const quote = "phải cung cấp giấy tờ tùy thân";
  assert.equal(overlapRatio(quote, chunk), 1);
});

test("overlapRatio: hoàn toàn lệch ~ 0", () => {
  const chunk = "Quy định về lãi suất tiết kiệm.";
  const quote = "điều kiện thành lập chi nhánh nước ngoài xyz";
  assert.ok(overlapRatio(quote, chunk) < 0.3);
});

test("checkGrounding: quote khớp tài liệu → grounded", () => {
  const chunk = "Hạn mức rút tiền mặt tối đa mỗi ngày là 100 triệu đồng.";
  const r = checkGrounding("Hạn mức rút tiền mặt tối đa mỗi ngày", chunk);
  assert.equal(r.grounded, true);
});

test("splitSentences: tách câu và bỏ câu quá ngắn", () => {
  const s = splitSentences("Điều khoản một về lãi suất.\nĐiều khoản hai về phí.");
  assert.equal(s.length, 2);
});

test("diffSentences: phát hiện câu mới và câu giữ nguyên", () => {
  const oldText = "Lãi suất cho vay tối đa là 20 phần trăm mỗi năm.";
  const newText =
    "Lãi suất cho vay tối đa là 20 phần trăm mỗi năm. Phí trả nợ trước hạn là 2 phần trăm.";
  const d = diffSentences(oldText, newText);
  assert.equal(d.unchanged, 1);
  assert.equal(d.added.length, 1);
});

test("chunkIdsWithChanges: chunk nội dung mới bị coi là đã đổi", () => {
  const chunks = [
    { id: "a", content: "Lãi suất cho vay tối đa là 20 phần trăm mỗi năm." },
    { id: "b", content: "Quy định hoàn toàn mới về bảo hiểm khoản vay tín chấp." },
  ];
  const oldText = "Lãi suất cho vay tối đa là 20 phần trăm mỗi năm.";
  const changed = chunkIdsWithChanges(chunks, oldText);
  assert.ok(changed.includes("b"));
  assert.ok(!changed.includes("a"));
});

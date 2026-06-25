# Agent Giải thích & Cập nhật kiến thức

> Tính năng AI tự động **giải thích vì sao mỗi đáp án đúng**, **trích dẫn nguồn từ tài
> liệu nội bộ**, và **tự cập nhật khi quy định thay đổi** — giúp người học không chỉ
> biết đáp án mà còn hiểu căn cứ, theo đúng quy định đang hiệu lực.

---

## Mục lục
- [Dành cho mọi người: tính năng này làm gì?](#dành-cho-mọi-người-tính-năng-này-làm-gì)
- [Các tính năng đã xây dựng](#các-tính-năng-đã-xây-dựng)
- [Luồng hoạt động](#luồng-hoạt-động)
- [Ba cơ chế đảm bảo độ tin cậy](#ba-cơ-chế-đảm-bảo-độ-tin-cậy)
- [Công nghệ sử dụng & ưu điểm](#công-nghệ-sử-dụng--ưu-điểm)
- [Hướng dẫn sử dụng (cho người dùng)](#hướng-dẫn-sử-dụng-cho-người-dùng)
- [Tham chiếu kỹ thuật](#tham-chiếu-kỹ-thuật)

---

## Dành cho mọi người: tính năng này làm gì?

Hãy hình dung một **giáo viên kèm riêng** cho mỗi câu hỏi trắc nghiệm:

- Sau khi bạn trả lời, giáo viên này **giải thích vì sao đáp án đúng là đúng** (và vì sao
  các đáp án khác sai).
- Mỗi lời giải thích đều **kèm trích dẫn nguyên văn từ tài liệu gốc** — không phải "AI tự
  nghĩ ra", mà có căn cứ rõ ràng để đối chiếu.
- Khi công ty ban hành **quy định mới thay thế quy định cũ**, giáo viên này **tự biết lời
  giải nào đã lỗi thời**, tạm ẩn nó đi, và **viết lại theo quy định mới**.

Điểm mấu chốt: AI **không được tự ý đăng** bất cứ lời giải nào. Mọi nội dung đều phải qua
**một người duyệt** trước khi hiển thị cho người chơi — vì đây là lĩnh vực tài chính, sai
một con số hay một điều khoản là có hậu quả thật.

> **Tóm gọn:** Học viên hiểu sâu hơn (không học vẹt), nội dung luôn đúng quy định hiện
> hành, và tổ chức luôn kiểm soát được chất lượng.

---

## Các tính năng đã xây dựng

| # | Tính năng | Giải thích ngắn gọn |
|---|-----------|---------------------|
| **1** | **Sinh giải thích có trích dẫn** | AI đọc câu hỏi + đáp án + tài liệu nguồn, viết lời giải thích kèm câu trích dẫn nguyên văn làm bằng chứng. |
| **2** | **Cổng duyệt bắt buộc** | Lời giải ở trạng thái *nháp* cho đến khi một người chỉnh sửa và bấm *Duyệt*. Chưa duyệt thì không bao giờ hiện trong game. |
| **3** | **Hiển thị trong game** | Sau khi lộ đáp án, người chơi thấy ngay panel **"💡 Vì sao?"** kèm nguồn trích dẫn. |
| **4** | **Phiên bản hóa quy định** | Mỗi tài liệu có *mã văn bản* + *ngày hiệu lực*. Đánh dấu một bản "đã bị thay thế" → mọi lời giải dựa trên nó tự bị gắn cờ **lỗi thời** và **ẩn khỏi game**. |
| **5** | **Agent bảo trì tự động** | Quét các lời giải lỗi thời → tìm tài liệu mới nhất → **viết lại** → đưa về hàng chờ duyệt. Chạy theo lịch (cron) hoặc bấm tay. |

**Trạng thái của một lời giải** đi qua các bước:
`DRAFT (nháp)` → `NEEDS_REVIEW (cần soát kỹ)` → `CURRENT (đang hiệu lực)` → `STALE (lỗi thời)` → *(sinh lại)* → quay về nháp.

Chỉ trạng thái **`CURRENT`** mới được hiển thị cho người chơi.

---

## Luồng hoạt động

```
   Tài liệu nghiệp vụ           Bộ câu hỏi (đã có)
   (quy định, sản phẩm)               │
          │                           ▼
          │                  ┌───────────────────┐
          └─────────────────▶│  AGENT GIẢI THÍCH │  ① sinh lời giải + trích dẫn
                             │   (GLM 5.2 / Z.ai) │     (che PII, đối chiếu nguồn)
                             └─────────┬─────────┘
                                       ▼
                          Lời giải DRAFT + nguồn
                                       │
                                       ▼
                          ┌───────────────────────┐
                          │  NGƯỜI DUYỆT (bắt buộc)│  ② sửa & bấm Duyệt → CURRENT
                          └───────────┬───────────┘
                                       ▼
                          Hiện panel "💡 Vì sao?" trong game   ③
                                       │
        Quy định mới thay thế ─────────┤
                                       ▼
                          Lời giải cũ → STALE (ẩn khỏi game)   ④
                                       │
                          ┌───────────────────────┐
                          │  AGENT BẢO TRÌ (cron)  │  ⑤ tìm tài liệu mới → viết lại
                          └───────────┬───────────┘     → quay về hàng chờ duyệt
                                       ▼
                              (lặp lại từ bước ②)
```

---

## Ba cơ chế đảm bảo độ tin cậy

Đây là phần quan trọng nhất với lĩnh vực tài chính — và là điểm khác biệt so với việc "hỏi
ChatGPT cho nhanh".

### 1. Grounding (chống bịa đặt)
Mỗi lời giải phải kèm một **câu trích dẫn nguyên văn** từ tài liệu. Hệ thống tự đo mức độ
trùng khớp giữa trích dẫn và tài liệu gốc:
- Khớp đủ → gắn nhãn **"Có nguồn"** (màu xanh).
- Không khớp / thiếu nguồn → gắn nhãn **"Cần đối chiếu nguồn"** (màu vàng) để người duyệt
  soát kỹ.

> *Dễ hiểu:* AI bị bắt buộc "chỉ ra trang nào, dòng nào" — nếu chỉ không đúng, hệ thống cảnh
> báo ngay.

### 2. Che thông tin nhạy cảm (PII)
Trước khi gửi nội dung lên dịch vụ AI bên ngoài, hệ thống **tự động che** email, số điện
thoại, CCCD/CMND, số tài khoản… → không rò rỉ dữ liệu định danh khách hàng/nhân sự.

### 3. Cổng duyệt của con người
AI **chỉ đề xuất** — quyết định cuối cùng là của người duyệt. Không có nội dung nào tự động
lên sóng. Đúng tinh thần "AI hỗ trợ, con người chịu trách nhiệm".

---

## Công nghệ sử dụng & ưu điểm

| Công nghệ | Dùng để làm gì | Ưu điểm (vì sao chọn) |
|-----------|----------------|------------------------|
| **GLM 5.2** (qua Z.ai, chuẩn OpenAI) | Bộ não AI viết lời giải | Hỗ trợ *function calling* → trả về dữ liệu có cấu trúc ổn định thay vì văn bản tự do; tiếng Việt tốt; chi phí hợp lý. |
| **Function calling + tắt "thinking"** | Ép AI trả đúng định dạng `{ giải thích, trích dẫn }` | Kết quả nhất quán, dễ kiểm tra bằng máy, nhanh và rẻ hơn (không tốn token suy luận thừa). |
| **Thuật toán đối chiếu nguồn (token overlap)** | Kiểm tra trích dẫn có thật trong tài liệu | Chạy cục bộ, tức thời, **miễn phí** — không cần gọi AI lần hai để "tự chấm điểm". |
| **Next.js 16 (App Router)** | Khung web + API | Một codebase cho cả giao diện và API; render nhanh; routing theo thư mục rõ ràng. |
| **Custom server (Node + tsx)** | Chạy nền tác vụ AI dài | Tiến trình dài hạn nên job sinh lời giải chạy nền được, người dùng không phải chờ treo màn hình. |
| **Prisma 7 + PostgreSQL** | Lưu trữ dữ liệu | Kiểu dữ liệu an toàn (type-safe), *migration* có lịch sử rõ ràng, quan hệ phức tạp (lời giải ↔ câu hỏi ↔ tài liệu) dễ mô hình hóa. |
| **Socket.IO** | Hiển thị lời giải realtime trong game | Đẩy lời giải tới người chơi ngay khi lộ đáp án, không cần tải lại trang. |
| **Cron + secret-protected endpoint** | Lịch bảo trì tự động | Tách lịch chạy ra khỏi app → linh hoạt (đổi tần suất không cần sửa code), bảo mật bằng khóa bí mật. |
| **Zod** | Kiểm tra dữ liệu đầu vào | Chặn dữ liệu sai ngay tại cửa, thông báo lỗi rõ ràng bằng tiếng Việt. |
| **TypeScript** | Toàn bộ mã nguồn | Bắt lỗi ngay khi gõ, giảm bug khi mở rộng tính năng. |

**Ưu điểm tổng thể của kiến trúc này:**
- **Chi phí gần như cố định:** sinh lời giải một lần, tái sử dụng mãi; chỉ tốn AI thêm khi
  quy định đổi.
- **Kiểm soát & truy vết được:** mọi lời giải có nguồn, có người duyệt, có phiên bản — phù
  hợp yêu cầu tuân thủ.
- **Tự bảo trì:** không cần ai nhớ "câu nào cần cập nhật" — hệ thống tự phát hiện và đề xuất.

---

## Hướng dẫn sử dụng (cho người dùng)

**A. Tạo lời giải cho một bộ đề**
1. Vào bộ đề bạn sở hữu → bấm **"Giải thích AI"**.
2. Bấm **Sinh giải thích** → chờ thanh tiến độ.
3. Ở màn review: chỉnh lại nội dung nếu cần, xem nhãn *Có nguồn / Cần đối chiếu nguồn* và
   trích dẫn → bấm **Duyệt & áp dụng**.

**B. Xem trong game**
- Host bộ đề → khi lộ đáp án, người chơi thấy panel **"💡 Vì sao?"** kèm nguồn.

**C. Khi có quy định mới (mục Tài liệu ở thanh bên)**
1. Gắn **mã văn bản** + **ngày hiệu lực** cho tài liệu.
2. Chọn **bản thay thế** → bấm **Đánh dấu thay thế** → các lời giải liên quan tự thành *lỗi
   thời* và ẩn khỏi game.
3. Bấm **Cập nhật giải thích lỗi thời** để AI viết lại → vào bộ đề duyệt lại.

> *Lưu ý:* trích dẫn chỉ khớp tốt khi bộ đề được tạo bằng **AI sinh đề** (có liên kết tài
> liệu nguồn). Bộ đề nhập tay vẫn sinh được lời giải, nhưng sẽ gắn nhãn *Cần đối chiếu nguồn*.

---

## Tham chiếu kỹ thuật

### API
| Phương thức & đường dẫn | Chức năng |
|--------------------------|-----------|
| `POST /api/explanations` | Tạo job sinh lời giải cho cả bộ đề (chạy nền) |
| `GET /api/explanations/:id` | Lấy tiến độ job + dữ liệu để dựng màn review |
| `PATCH /api/explanations/:id` | Lưu nội dung đã chỉnh (khi đang chờ duyệt) |
| `POST /api/explanations/:id/approve` | Duyệt → chuyển lời giải sang `CURRENT` |
| `GET /api/explanations/status?questionSetId=` | Tóm tắt số câu CURRENT / STALE / chờ duyệt |
| `PATCH /api/documents/:id` | Gán mã văn bản + ngày hiệu lực |
| `POST /api/documents/:id/supersede` | Đánh dấu tài liệu bị thay thế (gắn cờ STALE) |
| `POST /api/explanations/maintenance` | Người dùng tự sinh lại lời giải lỗi thời của mình |
| `POST /api/cron/maintenance` | Bảo trì toàn hệ thống (bảo vệ bằng header `x-cron-secret`) |

### Mô hình dữ liệu (Prisma)
- `QuestionExplanation` — lời giải (1–1 với `Question`): `body`, `status`, `grounded`,
  `basedOnDocumentId`, `reviewedAt/By`.
- `ExplanationCitation` — trích dẫn: `quote`, `chunkId`, `documentId`.
- `ExplanationJob` — job sinh/bảo trì: `status`, `progress`, `total`, `done`.
- `SourceDocument` (mở rộng) — `regulationCode`, `effectiveDate`, `regStatus`
  (`EFFECTIVE`/`SUPERSEDED`), `supersededById`.
- `Question` (mở rộng) — `sourceQuote`, `sourceChunkId` (liên kết về tài liệu nguồn).

### Các file chính
- `src/lib/ai/explainer.ts` — agent sinh lời giải (GLM function-calling, che PII, grounding).
- `src/lib/ai/maintenance.ts` — agent bảo trì (quét STALE → viết lại → hàng chờ duyệt).
- `src/lib/ai/validate.ts` — thuật toán đối chiếu nguồn (grounding).
- `src/components/sets/explanation-reviewer.tsx` — giao diện review/duyệt.
- `src/app/dashboard/documents/page.tsx` — quản lý tài liệu & phiên bản hóa quy định.
- `src/socket/handlers.ts`, `src/app/play/[code]/page.tsx` — hiển thị trong game.

### Cấu hình lịch bảo trì (cron)
Trỏ một cron bên ngoài tới endpoint hệ thống, ví dụ chạy 2h sáng hằng ngày:

```bash
0 2 * * * curl -s -X POST https://<domain>/api/cron/maintenance \
  -H "x-cron-secret: $CRON_SECRET"
```

Đặt biến môi trường `CRON_SECRET` (xem `.env.example`). Lịch chạy không nhúng trong ứng dụng
để dễ đổi tần suất mà không cần triển khai lại.

### Biến môi trường liên quan
| Biến | Ý nghĩa |
|------|---------|
| `ZAI_API_KEY`, `ZAI_BASE_URL`, `ZAI_MODEL` | Kết nối GLM 5.2 (Z.ai) |
| `CRON_SECRET` | Khóa bảo vệ endpoint bảo trì tự động |

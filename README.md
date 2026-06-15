## 1. Mục tiêu hệ thống

Web sẽ giải quyết 5 vấn đề chính:

1. **Nhân viên tự đăng ký lịch nguyện vọng**

   * Không cần nhắn tin riêng.
   * Mỗi nhân viên chỉ thấy phần của mình.
   * Có hạn chót đăng ký.
   * Sau hạn chót, quản lý khóa đăng ký.

2. **Quản lý xem toàn bộ nguyện vọng theo tuần**

   * Xem ai đăng ký ngày nào, ca nào.
   * Lọc theo kỹ năng: BOH, FOH, Bar, Boy, Tạp vụ…
   * Biết ai nghỉ, ai rảnh, ai muốn làm ca nào.

3. **Quản lý xếp lịch chính thức**

   * Kéo thả nhân viên vào ca.
   * Đổi vị trí linh hoạt trong một ca.
   * Một nhân viên có thể được xếp nhiều kỹ năng nếu có khả năng.
   * Có cảnh báo nếu xếp người không có kỹ năng phù hợp.

4. **So sánh với dự trù hệ thống chuỗi**

   * Nhập hoặc import dự trù theo từng ngày, từng khung giờ, từng bộ phận.
   * Khi xếp lịch, hệ thống tự tính số người đang xếp.
   * Hiện cảnh báo: thiếu người, đủ người, thừa người.

5. **Nhân viên xem lịch đã công bố**

   * Xem lịch tuần tới trên điện thoại.
   * Có thể lọc “lịch của tôi”.
   * Nhận thông báo khi lịch được công bố hoặc có thay đổi.

---

# 2. Quy trình chuẩn của một tuần

Nên thiết kế lịch theo trạng thái như sau:

| Trạng thái      | Ai thao tác         | Ý nghĩa                               |
| --------------- | ------------------- | ------------------------------------- |
| Chưa mở đăng ký | Quản lý             | Tạo tuần mới, cấu hình hạn đăng ký    |
| Đang mở đăng ký | Nhân viên           | Nhân viên vào chọn nguyện vọng đi làm |
| Đã khóa đăng ký | Quản lý             | Nhân viên không sửa được nữa          |
| Đang xếp lịch   | Quản lý             | Quản lý bắt đầu xếp lịch chính thức   |
| Đã công bố      | Quản lý + nhân viên | Nhân viên xem lịch chính thức         |
| Đã lưu trữ      | Hệ thống            | Tuần cũ để tra cứu, thống kê          |

Ví dụ flow thực tế:

**Thứ 2 hoặc thứ 3:** quản lý mở đăng ký lịch tuần sau.
**Thứ 5:** nhân viên hết hạn đăng ký.
**Thứ 6:** quản lý khóa đăng ký, nhập dự trù hệ thống, xếp lịch.
**Thứ 7 hoặc Chủ nhật:** công bố lịch tuần sau cho nhân viên.

---

# 3. Các vai trò trong hệ thống

## 3.1. Nhân viên

Nhân viên có thể:

* Đăng nhập bằng điện thoại/email/mã nhân viên.
* Xem thông tin cá nhân.
* Đăng ký nguyện vọng làm việc theo tuần.
* Chọn ngày có thể làm.
* Chọn ca mong muốn.
* Ghi chú, ví dụ: “Em chỉ làm tối”, “Em bận đến 17h”, “Em xin off Chủ nhật”.
* Xem lịch chính thức sau khi quản lý công bố.
* Gửi yêu cầu đổi ca hoặc xin sửa lịch nếu quản lý cho phép.

## 3.2. Quản lý

Quản lý có thể:

* Quản lý danh sách nhân viên.
* Thêm/sửa/xóa nhân viên.
* Gán kỹ năng cho nhân viên.
* Cấu hình mã ca.
* Mở/khóa đăng ký lịch.
* Nhập dự trù hệ thống.
* Xếp lịch chính thức.
* Công bố lịch.
* Sửa lịch sau khi công bố.
* Xuất lịch ra Excel/PDF/ảnh để gửi nhóm Zalo nếu cần.

---

# 4. Các module chính cần có

## Module 1: Quản lý nhân viên

Thông tin nhân viên nên gồm:

| Trường        | Ví dụ                      |
| ------------- | -------------------------- |
| Mã nhân viên  | 0198393                    |
| Họ tên        | Nguyễn Văn Hân             |
| SĐT           | 0357.xxx.xxx               |
| Vai trò       | Nhân viên / Quản lý        |
| Bộ phận chính | FOH / BOH / Bar / Tạp vụ   |
| Level         | QLC / RM / S1 / Part-time  |
| Trạng thái    | Đang làm / Nghỉ / Tạm khóa |
| Ghi chú       | Sinh viên, chỉ làm tối…    |

Phần quan trọng nhất là **kỹ năng**.

Ví dụ kỹ năng:

| Nhân viên | Order | Phục vụ |   Bar |   Boy | Bếp thịt | Bếp salad | Bếp nóng | Tạp vụ |
| --------- | ----: | ------: | ----: | ----: | -------: | --------: | -------: | -----: |
| A         |    Có |      Có | Không | Không |    Không |     Không |    Không |  Không |
| B         | Không |   Không | Không |    Có |    Không |     Không |    Không |  Không |
| C         | Không |   Không | Không | Không |       Có |        Có |       Có |  Không |

Nên cho phép gán mức độ kỹ năng:

* **Chưa biết**
* **Biết cơ bản**
* **Làm độc lập**
* **Đào tạo người khác**

Như vậy khi xếp lịch, hệ thống có thể ưu tiên người phù hợp hơn.

---

## Module 2: Cấu hình mã ca

Hiện tại file của bạn có nhiều mã như `NPL`, `P22`, `P30`, `P45`, `S20`, `F45`, `M13`, `P29`, `P54`, `MA6`…

Không nên hard-code. Quản lý cần tự cấu hình.

Mỗi mã ca nên có:

| Trường              | Ví dụ                  |
| ------------------- | ---------------------- |
| Mã ca               | P22                    |
| Tên ca              | Ca tối 17h-22h         |
| Giờ bắt đầu         | 17:00                  |
| Giờ kết thúc        | 22:00                  |
| Nghỉ giữa ca        | 0 phút / 30 phút       |
| Loại ca             | Làm việc / Nghỉ / Phép |
| Áp dụng cho bộ phận | FOH, BOH, Bar…         |
| Màu hiển thị        | Hồng / vàng / xanh…    |
| Ghi chú             | Ca part-time tối       |

Các mã đặc biệt:

| Mã     | Ý nghĩa gợi ý              |
| ------ | -------------------------- |
| NPL    | Nghỉ phép / nghỉ không làm |
| OFF    | Nghỉ thường                |
| AM     | Ca sáng                    |
| PM     | Ca tối                     |
| FULL   | Làm cả ngày                |
| CUSTOM | Ca tùy chỉnh               |

Vì nhà hàng của bạn có mã ca riêng, hệ thống nên cho phép **tự tạo, sửa, ẩn mã ca**.

---

## Module 3: Đăng ký nguyện vọng của nhân viên

Giao diện cho nhân viên nên cực kỳ đơn giản, nhất là trên điện thoại.

### Màn hình nhân viên đăng ký lịch

Ví dụ:

| Ngày     | Tôi có thể làm | Ca mong muốn | Ghi chú        |
| -------- | -------------- | ------------ | -------------- |
| Thứ 2    | Có             | P22          | Em chỉ làm tối |
| Thứ 3    | Không          | NPL          | Bận học        |
| Thứ 4    | Có             | P30          |                |
| Thứ 5    | Có             | P22 hoặc P45 |                |
| Thứ 6    | Có             | Full tối     |                |
| Thứ 7    | Có             | Bất kỳ       |                |
| Chủ nhật | Không          | NPL          |                |

Nên có 3 kiểu chọn nhanh:

* **Tôi rảnh cả tuần**
* **Tôi chỉ làm tối**
* **Tôi muốn nghỉ các ngày đã chọn**

Sau khi gửi, nhân viên thấy trạng thái:

* Đã gửi đăng ký.
* Còn được sửa đến ngày/giờ nào.
* Sau khi quản lý khóa thì không sửa được nữa.

---

## Module 4: Khóa đăng ký

Đây là phần rất quan trọng.

Quản lý cần có nút:

> **Khóa đăng ký tuần này**

Sau khi khóa:

* Nhân viên không thể sửa nguyện vọng.
* Quản lý vẫn xem được toàn bộ nguyện vọng.
* Nếu nhân viên muốn sửa, phải gửi yêu cầu hoặc nhắn quản lý.
* Quản lý có quyền mở khóa tạm thời nếu cần.

Nên có log:

| Thời gian   | Người thao tác | Hành động               |
| ----------- | -------------- | ----------------------- |
| 20:00 Thứ 5 | Quản lý A      | Khóa đăng ký tuần 17-21 |
| 21:10 Thứ 5 | Quản lý A      | Mở khóa cho nhân viên B |
| 21:20 Thứ 5 | Nhân viên B    | Sửa đăng ký Thứ 7       |

---

# 5. Module xếp lịch chính thức

Đây là phần lõi của web.

## 5.1. Giao diện nên giống Excel nhưng thông minh hơn

Nên có màn hình dạng bảng:

* Cột ngang là các ngày: Thứ 2 → Chủ nhật.
* Dòng dọc là bộ phận: Quản lý, Order + Phục vụ, Boy, BOH, Tạp vụ, Bar.
* Trong từng ô là nhân viên được xếp.
* Mỗi nhân viên là một “card” nhỏ, có màu theo ca hoặc kỹ năng.

Ví dụ:

| Bộ phận         | Thứ 2          | Thứ 3          | Thứ 4         |
| --------------- | -------------- | -------------- | ------------- |
| Order + Phục vụ | Nguyễn A - P22 | Trần B - P30   | Lê C - NPL    |
| Bar             | Hoàng D - P22  | Hoàng D - NPL  | Hoàng D - P22 |
| Bếp nóng        | Phạm E - P45   | Nguyễn F - S20 | Phạm E - P45  |

Nhưng thay vì nhập tay từng ô như Excel, quản lý có thể:

* Kéo thả nhân viên vào ngày.
* Chọn mã ca từ dropdown.
* Đổi vị trí bằng dropdown.
* Bấm vào một ô để xem nhân viên phù hợp.
* Lọc nhân viên theo kỹ năng.
* Xem nguyện vọng của nhân viên ngay bên cạnh.

---

## 5.2. Khi xếp lịch, hệ thống phải hiện nguyện vọng

Ví dụ khi bạn bấm vào ô **Thứ 6 - Bar - Ca tối**, hệ thống nên hiện:

| Nhân viên phù hợp | Kỹ năng     | Nguyện vọng  | Trạng thái    |
| ----------------- | ----------- | ------------ | ------------- |
| Hoàng A           | Bar         | Muốn làm P22 | Phù hợp       |
| Nguyễn B          | Bar + Order | Rảnh cả ngày | Phù hợp       |
| Trần C            | Bar         | Xin nghỉ     | Không nên xếp |

Như vậy quản lý không phải nhớ ai đăng ký gì.

---

## 5.3. Linh hoạt đổi vị trí trong một ca

Bạn có nói một điểm rất quan trọng:

> Trong một ca có thể đổi linh hoạt nhân sự các vị trí hoặc một nhân sự đổi được linh hoạt các kỹ năng.

Vì vậy không nên thiết kế kiểu “mỗi người chỉ có một vị trí cố định trong cả ca”.

Nên thiết kế mỗi lịch làm việc gồm:

* Nhân viên
* Ngày
* Mã ca
* Vị trí chính
* Vị trí phụ
* Phân đoạn trong ca nếu cần

Ví dụ:

| Nhân viên | Ca  | 17:00-19:00 | 19:00-21:00 | 21:00-22:00    |
| --------- | --- | ----------- | ----------- | -------------- |
| Nguyễn A  | P22 | Order       | Phục vụ     | Bar hỗ trợ     |
| Trần B    | P22 | Bar         | Bar         | Phục vụ hỗ trợ |
| Lê C      | P22 | Bếp thịt    | Bếp nóng    | Bếp nóng       |

Ban đầu MVP có thể làm đơn giản:

* Một nhân viên có **vị trí chính** trong ca.
* Có thể thêm **vị trí phụ**.

Sau này nâng cấp:

* Chia nhỏ theo khung giờ trong ca.

---

# 6. Module dự trù hệ thống chuỗi

Ảnh thứ 2 của bạn có dạng dự trù theo:

* Ngày
* Ca
* TC
* BOH: Bếp nóng, Bếp salad, Bếp thịt, Tạp vụ
* FOH: Phục vụ, Tiếp thực, Bar

Phần này nên được nhập vào web dưới dạng bảng.

## 6.1. Cấu trúc dự trù

Ví dụ:

| Ngày  | Khung giờ     | Bếp nóng | Bếp salad | Bếp thịt | Tạp vụ | Phục vụ | Tiếp thực | Bar |
| ----- | ------------- | -------: | --------: | -------: | -----: | ------: | --------: | --: |
| Thứ 4 | Mở ca         |        1 |         1 |        1 |      0 |       1 |         1 |   1 |
| Thứ 4 | Vận hành sáng |        1 |         1 |        1 |      1 |       2 |         1 |   1 |
| Thứ 4 | Vận hành tối  |        1 |         1 |        1 |      1 |       3 |         1 |   1 |
| Thứ 4 | Đóng ca       |        1 |         1 |        1 |      1 |       2 |         1 |   1 |

Quản lý có thể nhập thủ công hoặc paste từ Excel.

Giai đoạn đầu nên làm:

> Copy bảng từ hệ thống chuỗi → paste vào web → hệ thống tự đọc dạng bảng.

Giai đoạn sau mới làm import Excel hoặc OCR ảnh.

---

## 6.2. So sánh lịch đã xếp với dự trù

Đây là tính năng quan trọng nhất để thay thế Excel.

Hệ thống phải tự tính:

> Số người đã xếp theo từng ngày, từng khung giờ, từng vị trí.

Sau đó so với dự trù:

| Vị trí   | Dự trù | Đã xếp | Chênh lệch | Trạng thái |
| -------- | -----: | -----: | ---------: | ---------- |
| Phục vụ  |      3 |      2 |         -1 | Thiếu      |
| Bar      |      1 |      1 |          0 | Đủ         |
| Bếp nóng |      1 |      2 |         +1 | Thừa       |

Màu gợi ý:

* Đỏ: thiếu người
* Xanh: đủ
* Vàng/cam: thừa người
* Xám: chưa có dữ liệu dự trù

---

# 7. Các màn hình nên có

## 7.1. Màn hình cho nhân viên

### Trang chính

* Lịch tuần này
* Lịch tuần sau nếu đã công bố
* Nút “Đăng ký lịch tuần sau”
* Trạng thái đăng ký: chưa gửi / đã gửi / đã khóa

### Trang đăng ký lịch

* Chọn từng ngày
* Chọn ca mong muốn
* Chọn không đi làm
* Thêm ghi chú
* Nút gửi đăng ký

### Trang lịch của tôi

* Hiển thị dạng card dễ nhìn trên điện thoại
* Ví dụ:

```text
Thứ 2 - 17/06
Ca: P22
Giờ: 17:00 - 22:00
Vị trí: Phục vụ
Ghi chú: Hỗ trợ Bar sau 21h
```

---

## 7.2. Màn hình cho quản lý

### Dashboard tuần

Hiển thị nhanh:

* Bao nhiêu nhân viên đã đăng ký.
* Bao nhiêu nhân viên chưa đăng ký.
* Tuần đang mở hay đã khóa.
* Lịch đã công bố chưa.
* Có bao nhiêu ca đang thiếu người.
* Có bao nhiêu vị trí đang vượt dự trù.

### Màn hình nguyện vọng

Bảng xem toàn bộ đăng ký:

| Nhân viên | T2  | T3  | T4  | T5  | T6  | T7  | CN  |
| --------- | --- | --- | --- | --- | --- | --- | --- |
| A         | P22 | NPL | P30 | P22 | P45 | P22 | NPL |
| B         | NPL | P22 | P22 | NPL | P30 | P45 | P22 |

Có bộ lọc:

* Theo bộ phận
* Theo kỹ năng
* Theo người chưa đăng ký
* Theo người xin nghỉ
* Theo người rảnh ca tối
* Theo người rảnh cuối tuần

### Màn hình xếp lịch

Đây là màn hình chính của quản lý.

Nên chia làm 3 vùng:

```text
[ Bảng lịch chính ]   [ Danh sách nhân viên phù hợp ]
[ Dự trù vs đã xếp ] [ Cảnh báo / ghi chú ]
```

Các thao tác cần có:

* Thêm nhân viên vào ca
* Xóa nhân viên khỏi ca
* Đổi mã ca
* Đổi vị trí
* Copy lịch từ ngày này sang ngày khác
* Copy lịch từ tuần trước
* Tự động gợi ý người phù hợp
* Kiểm tra lỗi trước khi công bố

### Màn hình dự trù

* Nhập dự trù theo ngày.
* Paste bảng từ hệ thống.
* Xem dự trù dạng BOH/FOH.
* So sánh với lịch đã xếp.

### Màn hình nhân viên

* CRUD nhân viên.
* Gán kỹ năng.
* Gán mã nhân viên.
* Trạng thái đang làm/nghỉ.
* Lịch sử làm việc.

### Màn hình cấu hình

* Cấu hình mã ca.
* Cấu hình kỹ năng.
* Cấu hình bộ phận.
* Cấu hình deadline đăng ký.
* Cấu hình quyền.

---

# 8. Database nên thiết kế như thế nào

Dưới đây là mô hình dữ liệu lõi.

## 8.1. Bảng `employees`

Lưu nhân viên.

```text
id
employee_code
full_name
phone
email
role
level
main_department
status
note
created_at
updated_at
```

## 8.2. Bảng `skills`

Lưu kỹ năng.

```text
id
name
department
description
```

Ví dụ:

* Order
* Phục vụ
* Bar
* Boy
* Tạp vụ
* Bếp thịt
* Bếp salad
* Bếp nóng
* All kỹ năng

## 8.3. Bảng `employee_skills`

Lưu nhân viên có kỹ năng nào.

```text
id
employee_id
skill_id
level
is_primary
```

## 8.4. Bảng `shift_codes`

Lưu mã ca.

```text
id
code
name
start_time
end_time
break_minutes
type
color
is_active
```

Ví dụ:

```text
P22 | Ca tối | 17:00 | 22:00
P30 | Ca tối dài | 17:00 | 23:00
NPL | Nghỉ | null | null
```

Giờ cụ thể bạn tự cấu hình theo mã ca thật của nhà hàng.

## 8.5. Bảng `schedule_weeks`

Lưu từng tuần lịch.

```text
id
week_start_date
week_end_date
status
registration_deadline
created_by
published_at
```

Status:

```text
draft
registration_open
registration_locked
scheduling
published
archived
```

## 8.6. Bảng `availability_requests`

Lưu nguyện vọng nhân viên.

```text
id
week_id
employee_id
date
preferred_shift_code_id
can_work
note
submitted_at
updated_at
```

## 8.7. Bảng `schedule_assignments`

Lưu lịch chính thức.

```text
id
week_id
employee_id
date
shift_code_id
main_skill_id
department
note
created_by
updated_by
```

## 8.8. Bảng `assignment_segments`

Dành cho trường hợp một người đổi vị trí trong ca.

```text
id
assignment_id
start_time
end_time
skill_id
note
```

Ví dụ:

```text
Nguyễn A | P22 | 17:00-20:00 | Phục vụ
Nguyễn A | P22 | 20:00-22:00 | Bar hỗ trợ
```

## 8.9. Bảng `demand_forecasts`

Lưu dự trù hệ thống.

```text
id
week_id
date
time_block
skill_id
required_count
source
```

Ví dụ:

```text
17/06 | 17:00-22:00 | Phục vụ | 3
17/06 | 17:00-22:00 | Bar | 1
17/06 | 17:00-22:00 | Bếp nóng | 1
```

## 8.10. Bảng `audit_logs`

Lưu lịch sử thao tác.

```text
id
user_id
action
entity_type
entity_id
old_value
new_value
created_at
```

Rất cần bảng này vì lịch làm việc dễ phát sinh tranh cãi: ai sửa, sửa lúc nào, sửa từ gì sang gì.

---

# 9. Logic kiểm tra khi xếp lịch

Hệ thống nên có 2 loại kiểm tra: **lỗi cứng** và **cảnh báo mềm**.

## 9.1. Lỗi cứng

Những lỗi này nên chặn hoặc bắt quản lý xác nhận override:

* Nhân viên đã xin nghỉ nhưng vẫn bị xếp.
* Nhân viên không có kỹ năng nhưng bị xếp vào vị trí đó.
* Một nhân viên bị xếp trùng giờ ở 2 vị trí.
* Mã ca không hợp lệ.
* Tuần đã công bố nhưng người không có quyền vẫn sửa.
* Nhân viên đã nghỉ việc nhưng vẫn bị xếp lịch.

## 9.2. Cảnh báo mềm

Những lỗi này không chặn, nhưng nên cảnh báo:

* Xếp quá dự trù hệ thống.
* Thiếu người so với dự trù.
* Một nhân viên làm quá nhiều ngày liên tiếp.
* Một nhân viên bị xếp ca tối quá nhiều.
* Không công bằng giữa các nhân viên part-time.
* Nhân viên đăng ký ca khác nhưng bị xếp ca không mong muốn.
* Cuối tuần thiếu người có kỹ năng chính.

---

# 10. Tính năng gợi ý xếp lịch

Không nên làm AI tự xếp lịch hoàn toàn ngay từ đầu. Dễ sai và khó kiểm soát.

Nên làm theo từng mức:

## Giai đoạn 1: Gợi ý người phù hợp

Khi quản lý chọn một ô, hệ thống gợi ý:

* Người có kỹ năng phù hợp.
* Người có đăng ký đi làm hôm đó.
* Người chưa bị xếp lịch hôm đó.
* Người chưa làm quá nhiều giờ.
* Người ưu tiên bộ phận đó.

## Giai đoạn 2: Cảnh báo thông minh

Ví dụ:

```text
Thứ 7 ca tối đang thiếu:
- 1 Phục vụ
- 1 Bar
- 1 Bếp nóng
```

Hoặc:

```text
Nguyễn A được xếp 6 ngày liên tiếp.
Trần B bị xếp Bar nhưng chưa có kỹ năng Bar.
Thứ 6 ca tối đang vượt dự trù Phục vụ +2.
```

# 11. Giao diện responsive trên điện thoại

Nên thiết kế theo hướng **PWA mobile-first**.

Nhân viên chủ yếu dùng điện thoại, nên không cần app native ngay. Web có thể “Add to Home Screen” như app.

## Mobile cho nhân viên

Nên là dạng card, không dùng bảng quá rộng.

Ví dụ:

```text
Tuần 17/06 - 23/06

Thứ 2
Ca: P22
Vị trí: Phục vụ
Giờ: 17:00 - 22:00

Thứ 3
Nghỉ

Thứ 4
Ca: P30
Vị trí: Bar
Giờ: 17:00 - 23:00
```

## Desktop cho quản lý

Quản lý cần màn rộng, nên dùng bảng gần giống Excel:

* Cột ngày
* Dòng bộ phận
* Màu ca
* Tổng AM/PM
* Timeline
* Dự trù vs đã xếp

---

# 12. Import/export Excel

Vì bạn đang dùng Excel lâu rồi, nên không nên bỏ Excel ngay lập tức.

Nên có:

## Import

* Import danh sách nhân viên từ Excel.
* Import mã ca từ Excel.
* Import dự trù từ Excel/copy-paste.
* Import lịch tuần cũ nếu cần.

## Export

* Xuất lịch chính thức ra Excel.
* Xuất ảnh lịch để gửi Zalo.
* Xuất PDF để in.
* Xuất bảng công/thống kê giờ làm.

Đặc biệt nên có nút:

> **Xuất lịch theo format giống file hiện tại**

Như vậy giai đoạn chuyển đổi sẽ nhẹ hơn.


```text
Dashboard
├── Tuần hiện tại
├── Đăng ký lịch
├── Xếp lịch
├── Dự trù hệ thống
├── Nhân viên
├── Kỹ năng
├── Mã ca
├── Báo cáo
└── Cài đặt
```

Với nhân viên thì menu đơn giản hơn:

```text
Lịch của tôi
Đăng ký lịch
Thông tin cá nhân
```

---

# 18. Điểm quan trọng nhất khi làm UI

Đừng làm giao diện “app quản lý chung chung”. App này phải bám sát nghiệp vụ nhà hàng.

Nên giữ các nhóm như file hiện tại:

* Ban quản lý
* Order + Phục vụ
* Boy + Than + Vỷ
* BOH/Bếp
* Tạp vụ
* Bar

Và giữ logic tổng:

* Tổng AM
* Tổng PM
* Timeline theo khung giờ
* Tổng nhân sự vận hành ca

Nhưng thay vì nhập tay từng ô, hệ thống tự tính.

---

# 19. Công thức lõi của hệ thống

Hệ thống phải xoay quanh 3 lớp dữ liệu:

```text
Nguyện vọng nhân viên
        ↓
Lịch quản lý xếp
        ↓
So sánh với dự trù hệ thống
```

Tức là:

1. Nhân viên nói họ **muốn/có thể làm gì**.
2. Quản lý quyết định họ **thực sự làm gì**.
3. Hệ thống kiểm tra lịch đó **có khớp nhu cầu vận hành không**.

Nếu làm đúng 3 lớp này, web sẽ thay được Excel.

---

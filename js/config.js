'use strict';

/**
 * CẤU HÌNH — file duy nhất cần sửa khi backend đổi.
 *
 * ⚠️ Đây là lớp đệm giúp tem QR dán ngoài kho sống vĩnh viễn:
 *    QR trỏ vào trang này, KHÔNG trỏ thẳng vào Apps Script.
 *    Mai kia deployment Apps Script đổi ID → chỉ sửa API_URL dưới đây,
 *    commit lại repo là xong, KHÔNG phải bóc tem in lại.
 */

var CONFIG = {

  // URL web app Apps Script (đuôi /exec). Lấy ở: Deploy → Manage deployments.
  // KHÔNG được chứa đoạn /u/<số>/ — xem README mục 9.
  // ⚠️ CHƯA ĐIỀN. Deploy Apps Script của CỤM HN02 + DƯƠNG XÁ xong (bước B6 trong
  //    HUONG_DAN_TUNG_BUOC.md) thì dán URL /exec vào đây rồi mới push repo.
  //    TUYỆT ĐỐI không dán URL của HY01 vào — biên bản 2 kho mới sẽ chạy vào
  //    Sheet và nhóm Telegram của HY01 mà KHÔNG báo lỗi gì.
  API_URL: 'https://script.google.com/a/macros/ghn.vn/s/AKfycbwJoMRU3u0k0R9Pwn9iKtsxJN-Cd-t9BKxdl8MMo6zR8xd310gba4QzPaxYIBGLMlpS/exec',

  // Dùng khi không gọi được danh mục từ Sheet (mất mạng giữa chừng, backend lỗi).
  FALLBACK: {

    // Danh sách kho của cụm — giữ khớp ĐÚNG CHUỖI với OPT_KHO trong Code.gs.
    // Lệch một chữ thì lúc backend hỏng, form cho chọn giá trị mà server từ chối.
    khoList: ['Hà Nội 02', 'Dương Xá'],

    // Cụm này KHÔNG khai danh mục khu vực — nhân viên gõ tự do (user chốt 10/08).
    // Để mảng rỗng chứ đừng bê danh mục HY01 sang.
    locations: [],
    options: {
      seal: ['Nguyên seal', 'Sai seal'],
      xe: ['Xe nguyên', 'Xe tai nạn', 'Xe bị mưa ướt thùng'],
      hh: ['Nhận thừa kiện', 'Nhận thiếu kiện (kiện treo app)',
           'Kiện bể vỡ hư hỏng', 'Kiện mất ruột']
    },
    sealOk: 'Nguyên seal',
    xeOk: 'Xe nguyên',
    maxPhotos: 0        // 0 = không giới hạn số ảnh (giữ khớp MAX_PHOTOS trong Code.gs)
  },

  MAX_EDGE: 1600,   // px — cạnh dài nhất của ảnh sau khi nén
  JPEG_Q: 0.72
};

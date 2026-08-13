'use strict';

/** Trạng thái dùng chung giữa các file — không chứa DOM. */
var BOOT = null;      // dữ liệu khởi động (danh mục khu vực + lựa chọn)
var LOC = '';         // mã khu vực đọc từ ?loc= trên URL

/**
 * Kho đọc từ ?kho= trên URL — KHÁC bản HY01.
 *
 * Cụm này có HAI kho (Hà Nội 02, Dương Xá) dùng CHUNG một Google Sheet và một
 * nhóm Telegram. Không có trường này thì hai kho trộn vào nhau, mở Sheet ra
 * không tách nổi kho nào là kho nào — mà lỗi đó KHÔNG báo gì cả, chỉ lộ khi đi
 * làm báo cáo. Tem QR mỗi kho mang sẵn ?kho= nên nhân viên không phải chọn.
 */
var KHO = '';

function $(id) {
  return document.getElementById(id);
}

function escHtml(v) {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(v) {
  return escHtml(v).replace(/"/g, '&quot;');
}

function qs(name) {
  var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
  return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
}

function show(el, on) {
  el.hidden = !on;
}

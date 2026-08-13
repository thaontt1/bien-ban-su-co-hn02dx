'use strict';

/**
 * Điểm khởi động: lấy danh mục từ Apps Script → dựng form → gắn sự kiện.
 *
 * Ghi chú CORS: Apps Script không xử lý được preflight OPTIONS, nên mọi request
 * ở đây phải là "simple request":
 *   - GET không thêm header lạ
 *   - POST body chuỗi, để fetch tự đặt Content-Type: text/plain (KHÔNG set
 *     application/json — sẽ kích hoạt preflight và hỏng).
 * Phía Apps Script tự JSON.parse nội dung body.
 */

/**
 * ⚠️ KHÔNG nhớ lại ô nào giữa các lượt khai (bỏ 31/07 theo yêu cầu user).
 *
 * Trước đây 3 ô Bên nhận (bDonVi/bDaiDien/bBoPhan) được lưu localStorage và tự
 * điền lại, nghĩ là tiện cho người khai nhiều chuyến trong ca. Thực tế nguy hiểm:
 * biên bản là chứng từ có chữ ký, ô đã điền sẵn dễ bị bấm gửi luôn mà không đọc
 * ⇒ ghi nhầm tên người nhận của lượt trước. Bên A trắng mà Bên B có sẵn còn gây
 * hiểu nhầm là hệ thống "biết" ai đang trực.
 * ⇒ Mọi ô đều để trắng, bắt điền lại như nhau. Đừng thêm lại "tiện ích" này.
 */

(function boot() {
  LOC = qs('loc').trim();
  KHO = qs('kho').trim();   // cụm HN02 + Dương Xá: tem QR mỗi kho mang sẵn tham số này

  fetch(CONFIG.API_URL + '?action=bootstrap', { method: 'GET' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.ok) throw new Error('Backend trả dữ liệu không hợp lệ.');
      start(data, '');
    })
    .catch(function (err) {
      // Vẫn cho khai báo bằng danh mục dự phòng — mất mạng lúc lấy danh mục
      // không nên chặn người ở kho lập biên bản.
      start(CONFIG.FALLBACK,
        'Không tải được danh mục khu vực từ máy chủ (' + err.message + ').\n' +
        'Đang dùng danh sách dự phòng — dữ liệu gửi đi vẫn được lưu bình thường.');
    });
})();

function start(data, warnMsg) {
  BOOT = data;

  show($('boot'), false);
  show($('frm'), true);
  // maxPhotos = 0 ⇒ không giới hạn. Câu chữ đổi hẳn chứ không in số 0 ra màn hình.
  $('maxPhotoTxt').textContent = BOOT.maxPhotos
    ? 'Tối đa ' + BOOT.maxPhotos + ' ảnh.'
    : 'Không giới hạn số ảnh.';

  if (warnMsg) {
    $('bootErr').textContent = warnMsg;
    show($('bootErr'), true);
  }

  renderKho();
  renderLocation();
  bindKhuVucToKho();
  initScan();
  renderRadios('sealChoices', 'seal', BOOT.options.seal, onSealChange);
  renderRadios('xeChoices', 'xe', BOOT.options.xe, onXeChange);
  renderHangHoa();
  initSign();

  $('photoCam').addEventListener('change', onPickPhotos);
  $('photoLib').addEventListener('change', onPickPhotos);
  $('frm').addEventListener('submit', onSubmit);
  $('btnAgain').addEventListener('click', function () { location.reload(); });

  ['maChuyenDi', 'bienKiemSoat', 'aDonVi', 'aBoPhan', 'bDonVi', 'bBoPhan']
    .forEach(function (id) {
      $(id).addEventListener('input', function () { this.value = this.value.toUpperCase(); });
    });
}

function onSubmit(ev) {
  ev.preventDefault();
  var p = collect();
  var errs = validateClient(p);
  var box = $('errBox');

  if (errs.length) {
    box.textContent = '• ' + errs.join('\n• ');
    show(box, true);
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  show(box, false);

  $('btnSubmit').disabled = true;
  show($('overlay'), true);
  $('overlayTxt').textContent = photos.length
    ? 'Đang tải ' + photos.length + ' ảnh và gửi biên bản…'
    : 'Đang gửi biên bản…';

  fetch(CONFIG.API_URL, { method: 'POST', body: JSON.stringify(p) })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (!res || !res.ok) throw new Error((res && res.error) || 'Máy chủ từ chối dữ liệu.');
      onOk(res);
    })
    .catch(onFail);
}

function onOk(res) {
  show($('overlay'), false);
  show($('frm'), false);
  show($('bootErr'), false);
  $('doneCode').textContent = 'Mã biên bản: ' + res.maBienBan;

  if (res.telegramUrl) {
    $('donePdf').href = res.telegramUrl;
    show($('donePdf'), true);
  }
  if (res.warnings && res.warnings.length) {
    $('doneWarn').textContent = '⚠️ Dữ liệu đã lưu, nhưng:\n• ' + res.warnings.join('\n• ');
    show($('doneWarn'), true);
  }
  show($('done'), true);
  window.scrollTo(0, 0);
}

function onFail(err) {
  show($('overlay'), false);
  $('btnSubmit').disabled = false;
  var box = $('errBox');
  box.textContent = 'Gửi thất bại:\n' + (err && err.message ? err.message : err) +
    '\n\nKiểm tra kết nối mạng rồi bấm gửi lại. Dữ liệu bạn đã nhập vẫn còn.';
  show(box, true);
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

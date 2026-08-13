'use strict';

// ------------------------------------------------------------------ render

/**
 * Ô "Kho" — chỉ có ở cụm HN02 + Dương Xá, bản HY01 KHÔNG có.
 *
 * Danh sách kho lấy từ backend (BOOT.khoList) để chỉ phải khai một chỗ trong
 * Code.gs. Backend hỏng thì rơi về CONFIG.FALLBACK.khoList.
 *
 * ⚠️ KHÔNG tự chọn sẵn kho đầu danh sách. Quét nhầm tem / mở link trần mà form
 *    lẳng lặng chọn "Hà Nội 02" thì biên bản ghi sai kho mà không ai biết —
 *    kiểu lỗi âm thầm. Để trống, bắt người khai chọn.
 */
function renderKho() {
  var sel = $('kho');
  var list = (BOOT && BOOT.khoList && BOOT.khoList.length)
    ? BOOT.khoList
    : CONFIG.FALLBACK.khoList;

  list.forEach(function (v) {
    var o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    sel.appendChild(o);
  });

  // Tem QR mang sẵn ?kho= → điền luôn. So không phân biệt hoa/thường vì giá trị
  // này đi qua URL, người dựng tem dễ gõ lệch kiểu chữ.
  if (KHO) {
    var hit = '';
    list.forEach(function (v) {
      if (v.toLowerCase() === KHO.toLowerCase()) hit = v;
    });
    if (hit) {
      sel.value = hit;
      $('khoHint').textContent = 'Đã nhận kho từ tem QR — sai thì chọn lại.';
    } else {
      $('khoHint').textContent = '⚠️ Tem QR ghi kho "' + KHO + '" không có trong danh sách — chọn tay giúp mình.';
    }
  }
}

/**
 * Khu vực là ô gõ tự do — nhân viên tự ghi vị trí.
 * QR có kèm ?loc= thì điền sẵn cho đỡ gõ, vẫn sửa được.
 * Tra được kho theo khu vực thì mồi luôn vào ô "Đơn vị" của Bên B.
 */
function renderLocation() {
  if (LOC) {
    var found = null;
    BOOT.locations.forEach(function (l) {
      if (l.ma.toLowerCase() === String(LOC).toLowerCase()) found = l;
    });
    $('maKhuVuc').value = found ? found.ten : LOC;
    if (found && found.kho) $('bDonVi').value = found.kho;
  }
  $('hdrLoc').textContent = 'Khai báo sự cố giao nhận';
}

/**
 * Gõ khu vực xong thì mồi "Đơn vị / Kho" của Bên B theo danh mục.
 * Chỉ mồi khi ô còn trống hoặc đang giữ giá trị do chính hàm này điền —
 * người dùng đã tự sửa thì tôn trọng, không ghi đè.
 */
function bindKhuVucToKho() {
  var auto = $('bDonVi').value.trim();
  $('maKhuVuc').addEventListener('change', function () {
    var q = this.value.trim().toLowerCase();
    var hit = null;
    BOOT.locations.forEach(function (l) {
      if (l.ma.toLowerCase() === q || l.ten.toLowerCase() === q) hit = l;
    });
    if (!hit || !hit.kho) return;

    var cur = $('bDonVi').value.trim();
    if (cur === '' || cur === auto) {
      $('bDonVi').value = hit.kho;
      auto = hit.kho;
    }
  });
}

function renderRadios(hostId, name, opts, onChange) {
  var host = $(hostId);
  host.innerHTML = '';
  opts.forEach(function (v, i) {
    var lab = document.createElement('label');
    lab.className = 'opt' + (i === 0 ? ' on' : '');
    lab.innerHTML = '<input type="radio" name="' + name + '" value="' + escAttr(v) + '"' +
                    (i === 0 ? ' checked' : '') + '><span>' + escHtml(v) + '</span>';
    lab.querySelector('input').addEventListener('change', function () {
      Array.prototype.forEach.call(host.children, function (c) { c.classList.remove('on'); });
      lab.classList.add('on');
      onChange(v);
    });
    host.appendChild(lab);
  });
}

function onSealChange(v) {
  var need = v !== BOOT.sealOk;
  show($('sealDgWrap'), need);
  if (!need) $('dienGiaiSeal').value = '';
}

function onXeChange(v) {
  var need = v !== BOOT.xeOk;
  show($('xeDgWrap'), need);
  if (!need) $('dienGiaiXe').value = '';
}

function renderHangHoa() {
  var host = $('hhChoices');
  host.innerHTML = '';
  BOOT.options.hh.forEach(function (v, i) {
    var box = document.createElement('div');
    box.className = 'hh-item';
    box.innerHTML =
      '<label class="opt"><input type="checkbox" data-hh="' + i + '" value="' + escAttr(v) + '">' +
      '<span>' + escHtml(v) + '</span></label>' +
      '<div class="hh-detail" data-detail="' + i + '" hidden>' +
        '<label>Diễn giải <span class="req">*</span></label>' +
        '<textarea rows="2" data-dg="' + i + '" placeholder="Mô tả cụ thể: số kiện, biểu hiện…"></textarea>' +
        '<label style="margin-top:8px">Mã kiện / mã đơn liên quan</label>' +
        '<div class="scan-row">' +
          '<input type="text" id="md-' + i + '" data-md="' + i + '" ' +
                 'autocapitalize="characters" placeholder="Cách nhau bởi dấu phẩy">' +
          '<button type="button" class="btn-scan" data-scan="md-' + i + '" ' +
                  'data-scan-mode="append" aria-label="Quét mã kiện">📷</button>' +
        '</div>' +
        '<p class="hint">Bấm 📷 quét liên tiếp nhiều mã kiện — mã tự nối vào danh sách.</p>' +
      '</div>';

    // Máy không có camera: khoá luôn nút vừa sinh (initScan chỉ quét được nút
    // đã tồn tại lúc khởi động).
    if (!scanSupported()) disableScanBtn(box.querySelector('[data-scan]'));

    var cb = box.querySelector('input[type=checkbox]');
    cb.addEventListener('change', function () {
      show(box.querySelector('[data-detail]'), cb.checked);
      cb.closest('.opt').classList.toggle('on', cb.checked);
      if (!cb.checked) {
        var dg = box.querySelector('[data-dg]');
        dg.value = '';
        dg.classList.remove('invalid');
        box.querySelector('[data-md]').value = '';
      }
    });
    host.appendChild(box);
  });
}

// ------------------------------------------------------- thu thập & kiểm

function collect() {
  var hh = [];
  document.querySelectorAll('#hhChoices input[type=checkbox]').forEach(function (cb) {
    if (!cb.checked) return;
    var i = cb.getAttribute('data-hh');
    hh.push({
      loai: cb.value,
      dienGiai: document.querySelector('[data-dg="' + i + '"]').value.trim(),
      maDon: document.querySelector('[data-md="' + i + '"]').value.trim()
    });
  });
  return {
    kho: $('kho').value.trim(),
    maKhuVuc: $('maKhuVuc').value.trim(),

    // Bên A — giao hàng
    aDonVi: $('aDonVi').value.trim(),
    aDaiDien: $('aDaiDien').value.trim(),
    aBoPhan: $('aBoPhan').value.trim(),
    aSdt: $('aSdt').value.trim(),
    bienKiemSoat: $('bienKiemSoat').value.trim(),
    maChuyenDi: $('maChuyenDi').value.trim(),

    // Bên B — nhận hàng
    bDonVi: $('bDonVi').value.trim(),
    bDaiDien: $('bDaiDien').value.trim(),
    bBoPhan: $('bBoPhan').value.trim(),

    tinhTrangSeal: document.querySelector('input[name=seal]:checked').value,
    dienGiaiSeal: $('dienGiaiSeal').value.trim(),
    suCoXe: document.querySelector('input[name=xe]:checked').value,
    dienGiaiXe: $('dienGiaiXe').value.trim(),
    hangHoa: hh,
    ghiChu: $('ghiChu').value.trim(),

    chuKyGiao: signData('Giao'),
    chuKyNhan: signData('Nhan'),

    photos: photos.map(function (p) {
      return { name: p.name, mimeType: p.mimeType, data: p.data };
    })
  };
}

function validateClient(p) {
  var errs = [];
  document.querySelectorAll('.invalid').forEach(function (el) { el.classList.remove('invalid'); });

  function need(id, msg) {
    var el = $(id);
    if (!el.value.trim()) { errs.push(msg); el.classList.add('invalid'); }
  }
  need('kho', 'Chưa chọn Kho.');
  need('maKhuVuc', 'Chưa nhập Khu vực.');

  need('aDonVi', 'Bên giao: chưa nhập Đơn vị.');
  need('aDaiDien', 'Bên giao: chưa nhập Đại diện.');
  need('aBoPhan', 'Bên giao: chưa nhập Bộ phận.');
  need('bienKiemSoat', 'Chưa nhập Biển kiểm soát.');
  need('maChuyenDi', 'Chưa nhập Mã chuyến đi.');

  need('bDonVi', 'Bên nhận: chưa nhập Đơn vị / Kho.');
  need('bDaiDien', 'Bên nhận: chưa nhập Đại diện.');
  need('bBoPhan', 'Bên nhận: chưa nhập Bộ phận.');

  if (p.tinhTrangSeal !== BOOT.sealOk && !p.dienGiaiSeal) {
    errs.push('Seal "' + p.tinhTrangSeal + '" — cần ghi diễn giải seal.');
    $('dienGiaiSeal').classList.add('invalid');
  }
  if (p.suCoXe !== BOOT.xeOk && !p.dienGiaiXe) {
    errs.push('Xe "' + p.suCoXe + '" — cần ghi diễn giải tình trạng xe.');
    $('dienGiaiXe').classList.add('invalid');
  }
  document.querySelectorAll('#hhChoices input[type=checkbox]').forEach(function (cb) {
    if (!cb.checked) return;
    var dg = document.querySelector('[data-dg="' + cb.getAttribute('data-hh') + '"]');
    if (!dg.value.trim()) {
      errs.push('Chưa ghi diễn giải cho: ' + cb.value);
      dg.classList.add('invalid');
    }
  });
  if (p.tinhTrangSeal === BOOT.sealOk && p.suCoXe === BOOT.xeOk && !p.hangHoa.length) {
    errs.push('Không có sự cố nào được chọn — không cần lập biên bản.');
  }

  // Chữ ký: thiếu một bên là chặn hẳn, theo yêu cầu nghiệp vụ.
  if (!p.chuKyGiao) {
    errs.push('Bên giao hàng chưa ký.');
    $('padGiao').classList.add('invalid');
  }
  if (!p.chuKyNhan) {
    errs.push('Bên nhận hàng chưa ký.');
    $('padNhan').classList.add('invalid');
  }
  return errs;
}

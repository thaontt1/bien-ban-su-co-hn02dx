'use strict';

/**
 * Ký tay bằng ngón tay trên <canvas>. Hai khung: Giao + Nhận.
 *
 * Vài quyết định đáng ghi lại:
 * - Dùng Pointer Events (không phải touch/mouse riêng) → một nhánh code chạy
 *   cả ngón tay, bút cảm ứng lẫn chuột.
 * - Canvas có kích thước TRONG (600x200) cố định, CSS co giãn theo màn hình.
 *   Toạ độ chạm phải nhân tỉ lệ, nếu không nét vẽ lệch khỏi đầu ngón tay.
 * - Nền tô TRẮNG ĐẶC (không để trong suốt): PNG có alpha nhúng vào PDF của
 *   Apps Script hay ra nền đen. Trắng đặc là chắc ăn.
 * - Nét vẽ làm mượt bằng đường cong bậc 2 qua trung điểm — nối thẳng
 *   từng điểm một sẽ ra chữ ký gãy khúc như răng cưa.
 */

var SIGN_KEYS = ['Giao', 'Nhan'];
var signPads = {};   // { Giao: {cv, ctx, dirty, pts}, Nhan: {...} }

function initSign() {
  SIGN_KEYS.forEach(function (key) {
    var cv = $('pad' + key);
    if (!cv) return;

    // last = điểm thô vừa chạm; mid = trung điểm kết thúc đoạn cong trước đó,
    // cũng là điểm BẮT ĐẦU của đoạn kế — giữ nó thì nét mới liền.
    var pad = { cv: cv, ctx: cv.getContext('2d'), dirty: false, last: null, mid: null };
    signPads[key] = pad;
    resetPad(pad);

    cv.addEventListener('pointerdown', function (ev) { startStroke(pad, ev); });
    cv.addEventListener('pointermove', function (ev) { moveStroke(pad, ev); });
    ['pointerup', 'pointercancel'].forEach(function (t) {
      cv.addEventListener(t, function () { endStroke(pad); });
    });
    // KHÔNG bắt 'pointerleave' để kết nét: ngón tay lỡ ra mép khung là chữ ký
    // đứt ngang. Thay vào đó nghe pointerup ở cấp window — nhả tay ngoài khung
    // vẫn kết nét sạch, không để lại nét thừa khi quay vào.
    window.addEventListener('pointerup', function () { endStroke(pad); });
  });

  document.querySelectorAll('[data-clear]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-clear');
      if (!signPads[key]) return;
      resetPad(signPads[key]);
      signPads[key].dirty = false;
      $('pad' + key).classList.remove('invalid');
      syncSignNames();
    });
  });

  // Tên in dưới khung ký chạy theo ô "Đại diện" của đúng bên đó.
  [['aDaiDien', 'Giao'], ['bDaiDien', 'Nhan']].forEach(function (x) {
    var el = $(x[0]);
    if (el) el.addEventListener('input', syncSignNames);
  });
  syncSignNames();
}

/** Xoá sạch và tô lại nền trắng + dòng gợi ý. */
function resetPad(pad) {
  var ctx = pad.ctx;
  var w = pad.cv.width;
  var h = pad.cv.height;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // Dòng kẻ chân chữ ký cho giống chỗ ký trên giấy.
  ctx.strokeStyle = '#D8DEE6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, h - 42);
  ctx.lineTo(w - 28, h - 42);
  ctx.stroke();

  ctx.fillStyle = '#C3CBD6';
  ctx.font = '17px "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Ký vào đây', w / 2, h - 58);

  ctx.strokeStyle = '#14213D';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/** Đổi toạ độ màn hình → toạ độ trong canvas (canvas bị CSS co giãn). */
function padPoint(pad, ev) {
  var r = pad.cv.getBoundingClientRect();
  return {
    x: (ev.clientX - r.left) * (pad.cv.width / r.width),
    y: (ev.clientY - r.top) * (pad.cv.height / r.height)
  };
}

function startStroke(pad, ev) {
  ev.preventDefault();
  if (pad.cv.setPointerCapture) {
    try { pad.cv.setPointerCapture(ev.pointerId); } catch (e) { /* không bắt được thì thôi */ }
  }

  // Lần đặt bút đầu tiên: xoá chữ "Ký vào đây" đi cho sạch.
  if (!pad.dirty) {
    var ctx = pad.ctx;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, pad.cv.width, pad.cv.height);
    ctx.strokeStyle = '#14213D';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    pad.dirty = true;
    pad.cv.classList.remove('invalid');
    syncSignNames();
  }

  var p = padPoint(pad, ev);
  pad.last = p;
  pad.mid = p;

  // Chấm tròn để cú chạm nhanh (dấu chấm, nét cụt) vẫn hiện ra.
  pad.ctx.beginPath();
  pad.ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
  pad.ctx.fillStyle = '#14213D';
  pad.ctx.fill();
}

/**
 * Mỗi đoạn cong đi từ TRUNG ĐIỂM TRƯỚC → trung điểm mới, lấy điểm thô ở giữa
 * làm điểm điều khiển. Nhờ vậy đoạn sau nối đúng chỗ đoạn trước dừng, nét liền.
 *
 * 🪤 Bản đầu vẽ từ điểm thô tới trung điểm rồi nhảy thẳng sang điểm kế → đoạn
 *    từ trung điểm về điểm thô không ai vẽ, chữ ký ra NÉT ĐỨT như kẻ chấm.
 *    Test tự động không thấy (vẫn ra dataURL hợp lệ) — phải nhìn ảnh mới lộ.
 */
function moveStroke(pad, ev) {
  if (!pad.last) return;
  ev.preventDefault();

  var p = padPoint(pad, ev);
  var mid = { x: (pad.last.x + p.x) / 2, y: (pad.last.y + p.y) / 2 };

  pad.ctx.beginPath();
  pad.ctx.moveTo(pad.mid.x, pad.mid.y);
  pad.ctx.quadraticCurveTo(pad.last.x, pad.last.y, mid.x, mid.y);
  pad.ctx.stroke();

  pad.mid = mid;
  pad.last = p;
}

/** Nối nốt đoạn cuối (trung điểm cuối → điểm nhấc tay) rồi đóng nét. */
function endStroke(pad) {
  if (pad.last && pad.mid) {
    pad.ctx.beginPath();
    pad.ctx.moveTo(pad.mid.x, pad.mid.y);
    pad.ctx.lineTo(pad.last.x, pad.last.y);
    pad.ctx.stroke();
  }
  pad.last = null;
  pad.mid = null;
}

/** Ảnh chữ ký dạng dataURL PNG; chưa ký thì trả chuỗi rỗng. */
function signData(key) {
  var pad = signPads[key];
  return (pad && pad.dirty) ? pad.cv.toDataURL('image/png') : '';
}

function hasSign(key) {
  return !!(signPads[key] && signPads[key].dirty);
}

/** Dòng tên dưới khung ký: in hoa theo mẫu biên bản giấy. */
function syncSignNames() {
  [['Giao', 'aDaiDien'], ['Nhan', 'bDaiDien']].forEach(function (x) {
    var el = $('name' + x[0]);
    if (!el) return;
    var ten = ($(x[1]) ? $(x[1]).value.trim() : '').toUpperCase();
    if (!hasSign(x[0])) {
      el.textContent = 'Chưa ký';
      el.className = 'sign-name';
    } else {
      el.textContent = ten || '(chưa điền tên đại diện)';
      el.className = 'sign-name done';
    }
  });
}

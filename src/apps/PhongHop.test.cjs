const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PhongHop, ideas, clean, defaultAsk, ORDER } = require('../../desktop/apps/phong-hop.cjs');
function fixture(t, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'AI phong-hop-'));
  const calls = [], events = [], reports = [];
  const service = new PhongHop({ directory, now: () => Date.UTC(2026, 10, 7, 12),
    ask: async (p, text) => { calls.push([p.id, text]); return text.startsWith('Đặt cho mình') ? `Tên ${p.id}` : JSON.stringify([{ loai: 'ý mới', noiDung: `${p.id} góp ý`, traLoi: 1 }]); },
    onChange: d => events.push(d), report: async (ai, e) => reports.push([ai, e?.message]), ...options });
  const room = service.start('Chia tài nguyên AI', 'Làm video tự động');
  t.after(async () => { await Promise.allSettled([...service.jobs.values(), ...service.cards.values()]); fs.rmSync(directory, { recursive: true, force: true }); });
  return { service, room, calls, events, reports, directory };
}
async function round(service, id) { service.next(id); await service.jobs.get(id); }

test('giải tán PASS cả ghi chú, OK vào bảng việc mọi cuộc họp, tick lưu riêng bền', async t => {
  const { service, room, directory } = fixture(t);
  service.add(room, 'claude', { noiDung: 'Dựng MV', quyetDinh: 'ok' });
  service.add(room, 'codex', { noiDung: 'Đợi quyết định', quyetDinh: 'cho' });
  service.add(room, 'gemini', { noiDung: 'Còn ghi chú', quyetDinh: 'ghi-chu' });
  await service.request({ action: 'ket-thuc', id: room.id });
  await service.cards.get(room.id);
  assert.deepEqual(room.dong.slice(1).map(l => l.quyetDinh), ['ok', 'pass', 'pass']);
  const saved = JSON.parse(fs.readFileSync(service.file(room.id), 'utf8'));
  assert.equal(saved.trangThai, 'ket-thuc');
  assert.match(fs.readFileSync(service.file(room.id, 'md'), 'utf8'), /Dựng MV/);
  assert.match(fs.readFileSync(service.file(room.id, 'md'), 'utf8'), /Trạng thái: ĐÃ CHỐT/);
  service.start('Cuộc khác', 'Bàn tiếp');
  const task = service.view().bangViec.find(t => t.noiDung === 'Dựng MV');
  assert.equal(task.xong, false);
  await service.request({ action: 'viec-xong', viec: task.id, xong: true });
  const fresh = new PhongHop({ directory });
  assert.equal(fresh.view().bangViec.find(t => t.id === task.id).xong, true);
  assert.equal(fresh.list().some(m => m.id === 'phong-hop-viec'), false);
  assert.equal(fs.existsSync(path.join(directory, 'HOAN-THANH.md')), false);
  await assert.rejects(service.request({ action: 'viec-xong', viec: '__proto__', xong: true }), /không hợp lệ/);
});

test('bảng việc đọc bảng + thẻ, trạng thái thẻ ưu tiên, fs.watch giả cập nhật và đóng watcher', async t => {
  const { service, directory, events } = fixture(t);
  service.taskDirectory = path.join(directory, 'giao-viec');
  const dir = path.join(service.taskDirectory, 'viec'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(service.taskDirectory, 'BANG-VIEC.md'), '| cl-1 | Tên trong bảng | codex | cho | 12:00 |\n| cl-2 | Chỉ trong bảng | claude | dang-lam | 12:01 |');
  const card = path.join(dir, 'cl-1.md');
  fs.writeFileSync(card, '---\nma: cl-1\nnguoi: codex\ntrang_thai: dang-lam\n---\n# Làm video');
  const callbacks = [], closed = [];
  service.watch((dir, opts, cb) => { callbacks.push(cb); return { close: () => closed.push(dir) }; });
  t.after(() => service.close());
  const before = fs.readFileSync(path.join(service.taskDirectory, 'BANG-VIEC.md'), 'utf8');
  assert.equal(service.view().bangViec.find(t => t.ma === 'cl-1').xong, false);
  assert.equal(service.view().bangViec.filter(t => t.ma).length, 2);
  fs.writeFileSync(card, '---\nma: cl-1\nnguoi_lam: copilot\ntrang_thai: xong-tho\n---\n# Làm video');
  callbacks[1]('change', 'cl-1.md');
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(events.at(-1).bangViec.find(t => t.ma === 'cl-1').xong, true);
  assert.equal(events.at(-1).bangViec.find(t => t.ma === 'cl-1').ai, 'copilot');
  assert.equal(fs.readFileSync(path.join(service.taskDirectory, 'BANG-VIEC.md'), 'utf8'), before);
  service.close(); assert.equal(closed.length, 2);
});

test('chat Tiên Nhỏ: mở họp gọi đúng IPC và phát thẻ mở phòng, câu khác vẫn gửi trợ lý', async () => {
  const vm = require('node:vm'), { EventEmitter } = require('node:events');
  const ipcRenderer = new EventEmitter(), calls = [], bridges = {};
  ipcRenderer.invoke = async (...args) => { calls.push(args); return true; };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../desktop/preload.cjs'), 'utf8'), {
    require: id => { assert.equal(id, 'electron'); return { ipcRenderer, contextBridge: { exposeInMainWorld: (name, api) => { bridges[name] = api; } } }; },
  });
  const events = [], off = bridges.manorAssistant.onEvent(e => events.push(e));
  await bridges.manorAssistant.ask('mở họp về Kế hoạch MV');
  assert.equal(calls[0][0], 'apps:phong-hop');
  assert.equal(calls[0][1].action, 'mo'); assert.equal(calls[0][1].noiDung, 'Kế hoạch MV');
  assert.match(events[0].text, /\[\[mo:phong-hop\]\]/); assert.equal(events[1].kind, 'done');
  await bridges.manorAssistant.ask('lấy bài nhạc');
  assert.equal(calls.at(-1)[0], 'tro-ly:ask'); off();
});

test('thứ tự mỗi vòng, tự đặt tên một lần và Claude tóm tắt cuối vòng', async t => {
  const { service, room, calls, events, directory } = fixture(t);
  await round(service, room.id);
  assert.deepEqual(calls.filter(([,p]) => !p.startsWith('Đặt')).map(([ai]) => ai), ORDER);
  assert.equal(calls.filter(([,p]) => p.startsWith('Đặt')).length, 5);
  assert.match(calls.at(-1)[1], /Tóm tắt cuối vòng/);
  assert.equal(room.trangThai, 'cho-chu-tich');
  assert.ok(events.some(e => e.cuocHop?.dangNoi?.ai === 'codex'));
  assert.ok(events.some(e => e.cuocHop?.dong.some(l => l.ai === 'muse')));
  assert.ok(fs.existsSync(service.file(room.id, 'md')));
  assert.ok(fs.existsSync(service.file(room.id)));
  assert.equal(fs.readdirSync(directory).some(f => f.endsWith('.tmp')), false);
  await round(service, room.id);
  assert.equal(calls.filter(([,p]) => p.startsWith('Đặt')).length, 5);
});

test('JSON có code fence; JSON hỏng rơi về gạch đầu dòng, tối đa 6 ý', () => {
  assert.deepEqual(ideas('```json\n[{"loai":"phản đối","noiDung":"Chưa đủ RAM","traLoi":2}]\n```'), [{ loai: 'phản đối', noiDung: 'Chưa đủ RAM', traLoi: 2 }]);
  assert.equal(ideas('- Một\n* Hai\n• Ba')[1].noiDung, 'Hai');
  assert.equal(ideas('[hỏng]\n- A\n- B').length, 2);
  assert.equal(ideas(Array.from({ length: 10 }, (_, i) => `- Ý ${i}`).join('\n')).length, 6);
  assert.equal(ideas('[]').length, 0);
  assert.equal(ideas('').length, 0);
});

test('OK không vào đề sau; ghi chú bắt buộc có; chưa quyết thành PASS', async t => {
  const { service, room, calls } = fixture(t);
  await round(service, room.id);
  room.dong[1].noiDung = 'Ý xanh độc nhất';
  room.dong[2].noiDung = 'Ý vàng độc nhất';
  room.dong[3].noiDung = 'Ý xám độc nhất';
  await service.request({ action: 'quyet-dinh', id: room.id, dong: 2, quyetDinh: 'ok' });
  await service.request({ action: 'quyet-dinh', id: room.id, dong: 3, quyetDinh: 'ghi-chu', ghiChu: 'Cần chi phí chính xác' });
  const n = calls.length; await round(service, room.id);
  const prompts = calls.slice(n).map(([,p]) => p);
  for (const p of prompts) {
    assert.doesNotMatch(p, /Ý xanh độc nhất|Ý xám độc nhất/);
    assert.match(p, /Ý vàng độc nhất/); assert.match(p, /Cần chi phí chính xác/);
  }
  assert.equal(room.dong[3].quyetDinh, 'pass');
  await service.request({ action: 'ket-thuc', id: room.id });
  assert.equal(room.dong.some(l => l.quyetDinh === 'cho'), false);
  assert.match(fs.readFileSync(service.file(room.id, 'md'), 'utf8'), /- \[ \] #2: Ý xanh độc nhất/);
});

test('Chủ tịch chen ý trong lúc đang nói; người kế tiếp đọc được', async t => {
  let resolveCall; let first = true;
  const { service, room } = fixture(t, { ask: async (p, text) => {
    if (text.startsWith('Đặt')) return 'Thanh Trà';
    if (first) { first = false; return new Promise(resolve => { resolveCall = resolve; }); }
    assert.match(text, /Ưu tiên Shorts/); return '- Ý tiếp theo';
  } });
  service.next(room.id);
  while (!resolveCall) await new Promise(resolve => setImmediate(resolve));
  await service.request({ action: 'noi', id: room.id, noiDung: 'Ưu tiên Shorts' });
  resolveCall('- Ý mở vòng'); await service.jobs.get(room.id);
  assert.equal(room.dong.filter(l => l.ai === 'chu-tich').length, 2);
});

test('thành viên lỗi thành vắng, báo Tổng đài và vẫn tới Claude tóm tắt', async t => {
  const order = [], report = [];
  const { service, room } = fixture(t, { ask: async (p, text) => {
    if (text.startsWith('Đặt')) return 'Bạch Vân';
    order.push(p.id); if (p.id === 'gemini') throw Error('429 hết lượt'); return '- Đề xuất';
  }, report: async (ai, err) => { report.push([ai, err?.message]); } });
  await round(service, room.id);
  assert.deepEqual(order, ORDER);
  assert.match(room.vang.gemini, /429/);
  assert.ok(room.dong.some(l => l.vang && l.ai === 'gemini'));
  assert.ok(report.some(([ai, e]) => ai === 'gemini' && /429/.test(e)));
  assert.equal(room.trangThai, 'cho-chu-tich');
});

test('pause hoàn tất lượt hiện tại, resume đúng người, cấm chạy trùng', async t => {
  let finish; const order = [];
  const { service, room } = fixture(t, { ask: async (p, text) => {
    if (text.startsWith('Đặt')) return 'Tùng';
    order.push(p.id);
    if (order.length === 1) return new Promise(resolve => { finish = resolve; });
    return '- Sau khi tiếp tục';
  } });
  service.next(room.id);
  assert.throws(() => service.next(room.id), /đang chạy/);
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  await service.request({ action: 'tam-dung', id: room.id });
  finish('- Xong lượt hiện tại'); await service.jobs.get(room.id);
  assert.deepEqual(order, ['claude']); assert.equal(room.luot, 1);
  await round(service, room.id); assert.deepEqual(order, ORDER); assert.equal(room.vong, 1);
});

test('kết thúc trong khi đang đợi không nhận ý trả về muộn', async t => {
  let finish;
  const { service, room } = fixture(t, { ask: async (p, text) => text.startsWith('Đặt') ? 'Tùng' : new Promise(resolve => { finish = resolve; }) });
  service.next(room.id);
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  await service.request({ action: 'ket-thuc', id: room.id }); finish('- Trả muộn'); await service.jobs.get(room.id);
  assert.equal(room.dong.length, 1); assert.equal(room.trangThai, 'ket-thuc');
  await service.request({ action: 'xem', id: room.id });
});

test('đọc lại JSON, MD cũ chỉ đọc, không tự gọi AI khi mở lại', async t => {
  const { service, room, directory } = fixture(t);
  await round(service, room.id);
  const old = path.join(directory, '2026-11-06-thu-gon.md'); fs.writeFileSync(old, '# Họp cũ\nNội dung');
  const fresh = new PhongHop({ directory, ask: () => { throw Error('Không được gọi'); } });
  assert.equal(fresh.get(room.id).dong.length, room.dong.length);
  assert.equal(fresh.get('2026-11-06-thu-gon').cu, true);
  await assert.rejects(fresh.request({ action: 'vong', id: '2026-11-06-thu-gon' }), /chỉ đọc/);
  assert.equal(fs.readFileSync(old, 'utf8'), '# Họp cũ\nNội dung');
  assert.throws(() => fresh.get('../ngoai'), /không hợp lệ/);
  assert.equal(fresh.view().cuocHop.id, room.id);
});

test('lọc bí mật ở yêu cầu, phản hồi, lỗi, ghi chú và Markdown', async t => {
  const sensitive = 'secret.person@example.test API_KEY=abcdefghi';
  const { service, room } = fixture(t, { ask: async (p, text) => text.startsWith('Đặt') ? 'Thanh' : `- ${sensitive}` });
  await service.request({ action: 'noi', id: room.id, noiDung: sensitive });
  await round(service, room.id);
  await service.request({ action: 'quyet-dinh', id: room.id, dong: 3, quyetDinh: 'ghi-chu', ghiChu: sensitive });
  for (const ext of ['json', 'md']) {
    const stored = fs.readFileSync(service.file(room.id, ext), 'utf8');
    assert.doesNotMatch(stored, /secret.person|example.test|abcdefghi/);
    if (ext === 'json') assert.equal(JSON.parse(stored).id, room.id);
  }
  assert.doesNotMatch(clean('Bearer opaque-secret-value'), /opaque-secret-value/);
});

test('cấu hình đổi tên/thứ tự lưu bền, ảnh lưu trong dữ liệu app', async t => {
  const { service, room, directory, calls } = fixture(t);
  const config = structuredClone(service.config); config.thanhVien[1].ten = 'Mặc Trúc';
  config.thuTu = ['claude', 'muse', 'gemini', 'codex', 'copilot', 'claude'];
  service.configure(config);
  const png = path.join(directory, 'avatar.png'); fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB', 'base64'));
  service.avatar('chu-tich', png);
  assert.ok(fs.existsSync(path.join(directory, 'phong-hop-anh', 'chu-tich.png')));
  const fresh = new PhongHop({ directory }); assert.equal(fresh.config.thanhVien[1].ten, 'Mặc Trúc');
  assert.match(fresh.config.thanhVien[0].anh, /^data:image\/png/);
  await round(service, room.id);
  assert.equal(calls.some(([ai, text]) => ai === 'claude' && text.startsWith('Đặt')), false);
  assert.deepEqual(calls.filter(([,text]) => !text.startsWith('Đặt')).map(([ai]) => ai), config.thuTu);
  assert.throws(() => service.configure({ thuTu: ['muse'] }), /Thứ tự/);
});

test('Claude chỉ viết nháp thẻ từ dòng đã chốt và lưu vào biên bản', async t => {
  const { service, room, calls } = fixture(t);
  await round(service, room.id);
  await service.request({ action: 'quyet-dinh', id: room.id, dong: 2, quyetDinh: 'ok' });
  await service.request({ action: 'ket-thuc', id: room.id });
  await service.request({ action: 'viet-the', id: room.id });
  assert.equal(calls.at(-1)[0], 'claude'); assert.match(calls.at(-1)[1], /DANH SÁCH ĐÃ CHỐT/);
  assert.doesNotMatch(calls.at(-1)[1], /codex góp ý/);
  assert.match(fs.readFileSync(service.file(room.id, 'md'), 'utf8'), /Claude viết thẻ/);
});

test('Claude tối đa sáu dòng cả vòng và vẫn dành dòng cho tóm tắt', async t => {
  const { service, room } = fixture(t, { ask: async (p, text) => text.startsWith('Đặt') ? 'Trúc' : JSON.stringify(Array.from({ length: 6 }, (_, i) => ({ loai: 'ý mới', noiDung: `${text.includes('Tóm tắt cuối vòng') ? 'Tóm tắt' : 'Ý'} ${i}` }))) });
  await round(service, room.id);
  assert.equal(room.dong.filter(l => l.ai === 'claude').length, 6);
  assert.ok(room.dong.some(l => l.ai === 'claude' && l.noiDung.startsWith('Tóm tắt')));
});

test('Codex chỉ home Business, mức medium và model không nhận thì ghi rõ dùng mặc định', async t => {
  const tho = require('../../tools/giao-viec/tho.cjs'), original = { chayCodex: tho.chayCodex, chay: tho.chay };
  t.after(() => Object.assign(tho, original));
  const calls = [], commands = [];
  tho.chay = async (...args) => { commands.push(args); return 'test'; };
  tho.chayCodex = async (text, options) => {
    calls.push(options); assert.equal(options.codexHome, 'business'); assert.equal(options.chiDoc, true);
    await options.chayFn('codex', ['exec', '-m', 'Astra 6', '-'], 'prompt');
    if (options.moHinh) throw Error('model is not supported');
    return '- Kỹ thuật';
  };
  const member = { id: 'codex', model: 'Astra 6' };
  assert.equal(await defaultAsk(member, 'Đề'), '- Kỹ thuật');
  assert.equal(calls.length, 2); assert.equal(calls[1].moHinh, null);
  assert.match(member.ghiChu, /không nhận Astra 6.*mặc định.*Business/);
  assert.ok(commands[0][1].includes('model_reasoning_effort=medium'));
  assert.ok(commands[0][1].includes('"Astra 6"'));
  tho.chayCodex = async () => { throw Error('429 quota'); };
  await assert.rejects(defaultAsk({ id: 'codex', model: 'Astra 6' }, 'Đề'), /429 quota/);
});

test('Claude ưu tiên cửa đúng cấu hình, Opus medium, công cụ chỉ đọc và báo Tổng đài', async t => {
  const tho = require('../../tools/giao-viec/tho.cjs'), td = require('../../desktop/tong-dai/tong-dai.cjs');
  const oldTho = { chay: tho.chay, claudeEnv: tho.claudeEnv, claudeExe: tho.claudeExe };
  const oldTd = { bangTrangThai: td.bangTrangThai, chonCua: td.chonCua, baoXong: td.baoXong };
  t.after(() => { Object.assign(tho, oldTho); Object.assign(td, oldTd); });
  const selected = { id: 'claude-code-preferred', loai: 'claude-code', tinhTrang: 'san', chungThuc: { CLAUDE_CONFIG_DIR: 'AI claude-tai-khoan-a' } };
  td.bangTrangThai = () => ({ cua: [selected] });
  td.chonCua = () => { throw Error('Đã có cửa ưu tiên'); };
  let reported; td.baoXong = id => { reported = id; };
  tho.claudeEnv = c => { assert.equal(c, selected); return { CLAUDE_CONFIG_DIR: 'test' }; };
  tho.claudeExe = () => 'claude-test';
  tho.chay = async (command, args) => {
    assert.ok(args.includes('medium')); assert.ok(args.includes('"Read Glob Grep"'));
    assert.ok(args.includes('"opus"')); assert.equal(args.includes('acceptEdits'), false); return '- Mở vòng';
  };
  assert.equal(await defaultAsk({ id: 'claude', model: 'opus' }, 'Đề'), '- Mở vòng');
  assert.equal(reported, selected.id);
});

test('CLI giữ y/chot, nhập Markdown cũ khi có lệnh ghi, sinh JSON chung', async t => {
  const { directory } = fixture(t), { main } = require('../../tools/giao-viec/phong-hop.cjs');
  const file = path.join(directory, '2026-11-06-cu.md'); fs.writeFileSync(file, '# Nội dung cũ');
  await main(['y', file, 'chu-tich', 'Ý mới của Chủ tịch']);
  const m = JSON.parse(fs.readFileSync(file.replace(/\.md$/, '.json'), 'utf8'));
  assert.equal(m.dong.length, 2); assert.match(m.dong[0].noiDung, /Nội dung cũ/);
  await main(['chot', file, 'Kết luận']);
  assert.equal(JSON.parse(fs.readFileSync(file.replace(/\.md$/, '.json'), 'utf8')).trangThai, 'ket-thuc');
});

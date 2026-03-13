/**
 * ag-renamer.js — Antigravity 会话自定义命名 v2.0.0
 * VERSION: 2.0.0
 * REPO: https://github.com/Neonbe/ag-renamer
 *
 * 功能：
 * 1. 新会话首次出现时，自动截取前 20 个字符作为稳定名称（冻结）
 * 2. 【双击】会话行文字区域 → 弹出改名小框
 * 3. 【隐藏】注入到 more_vert 下拉菜单，隐藏后移出列表视野
 * 4. 侧边栏底部注入「已隐藏 (N)」角标，点击可显示/恢复隐藏会话
 *
 * SELECTOR: span[data-testid^="convo-pill-"]
 */

// ── 常量 ──────────────────────────────────────────────────────────────────────

const AUTO_KEY   = 'ag-auto-names';
const CUSTOM_KEY = 'ag-custom-names';
const HIDDEN_KEY = 'ag-hidden-ids';
const AUTO_MAX   = 20;
const PILL_SEL   = 'span[data-testid^="convo-pill-"]';
const MOREV_SEL  = 'button[aria-haspopup="listbox"]';

// 颜色（深色主题，参考 Antigravity 设计语言）
const C = {
  text:         '#cdd6f4',   // 主文字
  textMuted:    '#a6adc8',   // 次要/中性操作（隐藏选项）
  textDimmed:   '#6c7086',   // 已隐藏角标
  bg:           '#1e1e2e',   // 弹框/选项背景
  bgHover:      '#313244',   // 悬停背景
  border:       '#3a3a5c',   // 边框
  accent:       '#89b4fa',   // 确认按钮
  accentText:   '#1e1e2e',   // 确认按钮文字
};

// ── 存储 ──────────────────────────────────────────────────────────────────────

const store = {
  get:  (key)        => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } },
  set:  (key, id, v) => { const m = store.get(key); if (v !== null && v !== undefined) m[id] = v; else delete m[id]; localStorage.setItem(key, JSON.stringify(m)); },
  read: (key, id)    => store.get(key)[id] ?? null,
};

const getHiddenIds = ()     => store.get(HIDDEN_KEY);
const isHidden    = (id)    => !!store.read(HIDDEN_KEY, id);
const setHidden   = (id, v) => store.set(HIDDEN_KEY, id, v || null);

// ── DOM 工具 ──────────────────────────────────────────────────────────────────

const extractId = el => {
  const t = el?.dataset?.testid || '';
  return t.startsWith('convo-pill-') ? t.slice(11) : null;
};

const getDisplayName = id =>
  store.read(CUSTOM_KEY, id) || store.read(AUTO_KEY, id) || null;

/** 向上找会话外层 button */
const findRowBtn = el => el?.closest?.('button') || null;

/** 向上找 convo-pill span（从 button 或其子节点出发均可） */
const findPillSpan = el => {
  if (!el) return null;
  if (el.matches?.(PILL_SEL)) return el;
  const found = el.querySelector?.(PILL_SEL);
  if (found) return found;
  const btn = el.closest?.('button');
  return btn?.querySelector?.(PILL_SEL) || null;
};

// ── 改名应用 ─────────────────────────────────────────────────────────────────

function applyRename(spanEl) {
  const id = extractId(spanEl);
  if (!id) return;

  // 自动命名：首次见到，截取前 AUTO_MAX 字
  if (!store.read(AUTO_KEY, id) && !store.read(CUSTOM_KEY, id)) {
    const text = spanEl.textContent.trim().slice(0, AUTO_MAX);
    if (text) store.set(AUTO_KEY, id, text);
  }

  const name = getDisplayName(id);
  if (!name) return;
  if (spanEl.textContent !== name) spanEl.textContent = name;

  const btn = findRowBtn(spanEl);
  if (btn && btn.title !== name) { btn.title = name; btn.dataset.agTooltip = '1'; }
}

// ── 隐藏 & 显示 ───────────────────────────────────────────────────────────────

/** 对 button 行应用/取消 display:none */
function applyHideVisibility(spanEl) {
  const id = extractId(spanEl);
  if (!id) return;
  const btn = findRowBtn(spanEl);
  if (!btn) return;
  const hidden = isHidden(id);
  btn.style.display = hidden && !btn.dataset.agShowHidden ? 'none' : '';
}

function hideConversation(id, spanEl) {
  setHidden(id, true);
  applyHideVisibility(spanEl);
  updateArchivedBadge();
}

function unhideConversation(id, spanEl) {
  setHidden(id, null);
  const btn = findRowBtn(spanEl);
  if (btn) { btn.style.display = ''; delete btn.dataset.agShowHidden; }
  updateArchivedBadge();
}

// ── 改名弹框（锚定在行下方）─────────────────────────────────────────────────

function showRenameDialog(anchorEl, defaultVal, onConfirm) {
  document.getElementById('ag-dialog')?.remove();

  const r = anchorEl.getBoundingClientRect();
  const W = Math.max(r.width, 200);
  const spaceBelow = window.innerHeight - r.bottom - 8;
  const top  = spaceBelow > 120 ? r.bottom + 4 : r.top - 124;
  const left = Math.min(r.left, window.innerWidth - W - 8);

  const box = mk('div', { id: 'ag-dialog' }, {
    position: 'fixed', top: `${top}px`, left: `${left}px`, width: `${W}px`,
    zIndex: '99999', background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: '8px', padding: '12px', boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
    display: 'flex', flexDirection: 'column', gap: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  });

  const label = mk('div', { textContent: '重命名' }, { color: C.textMuted, fontSize: '12px', fontWeight: '600' });
  const input = mk('input', { type: 'text', value: defaultVal }, {
    background: '#313244', border: `1px solid ${C.border}`, borderRadius: '5px',
    padding: '6px 8px', color: C.text, fontSize: '13px', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  });
  const hint = mk('div', { textContent: '留空确认 → 恢复自动名称' }, { color: C.textDimmed, fontSize: '10px' });
  const row  = mk('div', {}, { display: 'flex', gap: '6px', justifyContent: 'flex-end' });

  const btnCancel = mk('button', { textContent: '取消' }, {
    background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '5px',
    padding: '4px 12px', color: C.text, fontSize: '12px', cursor: 'pointer',
  });
  const btnOk = mk('button', { textContent: '确认' }, {
    background: C.accent, border: 'none', borderRadius: '5px',
    padding: '4px 12px', color: C.accentText, fontSize: '12px', fontWeight: '600', cursor: 'pointer',
  });

  const close = () => box.remove();
  btnCancel.onclick = close;
  btnOk.onclick = () => { close(); onConfirm(input.value); };
  input.onkeydown = e => {
    if (e.key === 'Enter') { close(); onConfirm(input.value); }
    if (e.key === 'Escape') close();
    e.stopPropagation();
  };
  const outside = e => { if (!box.contains(e.target)) { close(); document.removeEventListener('mousedown', outside, true); } };
  setTimeout(() => document.addEventListener('mousedown', outside, true), 0);

  row.append(btnCancel, btnOk);
  box.append(label, input, hint, row);
  document.body.appendChild(box);
  setTimeout(() => { input.focus(); input.select(); }, 20);
}

// ── 双击改名 ─────────────────────────────────────────────────────────────────

function setupDoubleClick() {
  document.addEventListener('dblclick', e => {
    const span = findPillSpan(e.target);
    if (!span) return;
    const id = extractId(span);
    if (!id) return;

    e.preventDefault();
    e.stopPropagation();

    const current = getDisplayName(id) || '';
    const btn = findRowBtn(span);
    showRenameDialog(btn || span, current, newName => {
      store.set(CUSTOM_KEY, id, newName.trim());
      applyRename(span);
    });
  }, true);
}

// ── 下拉菜单注入（more_vert → 隐藏选项）────────────────────────────────────

/**
 * 当 more_vert 按钮的 listbox 展开时，找到 listbox DOM 并注入「隐藏」选项。
 * 策略：aria-expanded 变为 "true" 后等一帧，然后搜索最近出现的 role=option/listbox。
 */
function injectIntoDropdown(moreVertBtn) {
  // 找到这个 more_vert 对应的 convo-pill span
  const span = moreVertBtn.closest('button[class]')?.querySelector?.(PILL_SEL)
    || moreVertBtn.closest('[data-ag-row]')?.querySelector?.(PILL_SEL)
    || findPillViaParent(moreVertBtn);
  if (!span) return;

  const id = extractId(span);
  if (!id) return;

  // 等一帧让 React 渲染 listbox
  requestAnimationFrame(() => {
    setTimeout(() => {
      // 查找最近出现的 listbox 或 menu（Antigravity 可能用 portal 渲染到 body）
      const listbox = findLatestListbox();
      if (!listbox) return;
      if (listbox.dataset.agInjected) return; // 已注入过
      listbox.dataset.agInjected = '1';

      const hidden = isHidden(id);

      // 注入「隐藏/取消隐藏」选项
      const opt = mk('div', {
        textContent: hidden ? '✦ 取消隐藏' : '隐藏',
        role: 'option',
      }, {
        padding: '6px 16px',
        fontSize: '13px',
        color: C.textMuted,
        cursor: 'pointer',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
      });

      opt.addEventListener('mouseover',  () => { opt.style.background = C.bgHover; opt.style.color = C.text; });
      opt.addEventListener('mouseout',   () => { opt.style.background = ''; opt.style.color = C.textMuted; });
      opt.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        if (hidden) {
          unhideConversation(id, span);
        } else {
          hideConversation(id, span);
        }
        // 关闭 dropdown：模拟点击 moreVertBtn
        moreVertBtn.click();
      });

      // 追加到 listbox 末尾（Delete Conversation 之后）
      listbox.appendChild(opt);
    }, 30); // 30ms 给 React 渲染时间
  });
}

/** 找到会话行中的 more_vert 按钮 → 找到对应 convo-pill span */
function findPillViaParent(moreVertBtn) {
  // more_vert button 的 DOM 结构：
  // button[row] > div > div > div[inset] > button[more_vert]
  // 我们需要往上找到 row button，再向下找 pill
  let el = moreVertBtn;
  for (let i = 0; i < 6; i++) {
    el = el.parentElement;
    if (!el) break;
    const pill = el.querySelector?.(PILL_SEL);
    if (pill) return pill;
  }
  return null;
}

/** 找到最近出现的 listbox（React 可能 portal 到 body） */
function findLatestListbox() {
  // 优先找 role=listbox，备选 role=menu
  const candidates = [
    ...document.querySelectorAll('[role="listbox"]'),
    ...document.querySelectorAll('[role="menu"]'),
  ];
  if (!candidates.length) return null;
  // 返回 DOM 中最后一个（通常是最近打开的那个）
  return candidates[candidates.length - 1];
}

// ── 「已隐藏 (N)」角标 ────────────────────────────────────────────────────────

let showingHidden = false;

function updateArchivedBadge() {
  const hiddenCount = Object.keys(getHiddenIds()).length;
  const existing = document.getElementById('ag-archived-badge');

  if (hiddenCount === 0) {
    existing?.remove();
    return;
  }

  const badge = existing || createArchivedBadge();
  badge.querySelector('#ag-badge-label').textContent =
    showingHidden ? `▲ 隐藏 (${hiddenCount})` : `▼ 已隐藏 (${hiddenCount})`;
}

function createArchivedBadge() {
  const badge = mk('div', { id: 'ag-archived-badge' }, {
    padding: '6px 12px',
    color: C.textDimmed,
    fontSize: '11px',
    cursor: 'pointer',
    userSelect: 'none',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    borderTop: `1px solid ${C.border}`,
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  });

  const label = mk('span', { id: 'ag-badge-label' });
  badge.appendChild(label);

  badge.addEventListener('mouseover', () => { badge.style.color = C.textMuted; });
  badge.addEventListener('mouseout',  () => { badge.style.color = C.textDimmed; });

  badge.addEventListener('click', () => {
    showingHidden = !showingHidden;
    // 切换隐藏元素的可见性
    document.querySelectorAll(PILL_SEL).forEach(span => {
      const id = extractId(span);
      if (!id || !isHidden(id)) return;
      const btn = findRowBtn(span);
      if (!btn) return;
      btn.style.display = showingHidden ? '' : 'none';
      if (showingHidden) btn.dataset.agShowHidden = '1';
      else delete btn.dataset.agShowHidden;
    });
    updateArchivedBadge();
  });

  // 把 badge 插到侧边栏列表容器的末尾
  // 找一个稳定的侧边栏容器
  const attachBadge = () => {
    const pills = document.querySelectorAll(PILL_SEL);
    if (!pills.length) return;
    // 找到最近公共祖先容器
    let container = pills[0].closest('button')?.parentElement;
    for (let i = 0; i < 6 && container; i++) {
      if (container.querySelectorAll(PILL_SEL).length > 1) break;
      container = container.parentElement;
    }
    if (container && !document.getElementById('ag-archived-badge')) {
      container.appendChild(badge);
    }
  };

  setTimeout(attachBadge, 100);
  return badge;
}

// ── MutationObserver ──────────────────────────────────────────────────────────

function startObserver() {
  new MutationObserver(mutations => {
    const toRename = new Set();

    for (const m of mutations) {
      // 新增节点（新会话出现、React 重渲染）
      m.addedNodes.forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (node.matches?.(PILL_SEL)) toRename.add(node);
        node.querySelectorAll?.(PILL_SEL).forEach(el => toRename.add(el));
      });

      // React 覆盖文字内容
      if (m.type === 'characterData') {
        const p = m.target.parentElement;
        if (p?.matches?.(PILL_SEL)) toRename.add(p);
      }

      // aria-expanded 从 false → true：more_vert 打开了
      if (m.type === 'attributes'
          && m.attributeName === 'aria-expanded'
          && m.target.getAttribute('aria-expanded') === 'true'
          && m.target.matches?.(MOREV_SEL)) {
        injectIntoDropdown(m.target);
      }
    }

    toRename.forEach(span => {
      applyRename(span);
      applyHideVisibility(span);
    });

    updateArchivedBadge();
  }).observe(document.body, {
    childList:      true,
    subtree:        true,
    characterData:  true,
    attributes:     true,
    attributeFilter: ['aria-expanded'],
  });
}

// ── 工具：简化 DOM 创建 ───────────────────────────────────────────────────────

function mk(tag, props = {}, styles = {}) {
  const el = document.createElement(tag);
  Object.assign(el, props);
  Object.assign(el.style, styles);
  return el;
}

// ── 初始化 ────────────────────────────────────────────────────────────────────

function init() {
  // 扫描初始存量会话
  document.querySelectorAll(PILL_SEL).forEach(span => {
    applyRename(span);
    applyHideVisibility(span);
  });

  startObserver();
  setupDoubleClick();
  updateArchivedBadge();

  console.log('[ag-renamer] ✅ v2.0.0 运行中 — 双击改名 | more_vert 可隐藏会话');
}

setTimeout(init, 800);

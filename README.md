# antigravity-convo-name-optimize

> Antigravity Agent Manager 会话管理增强补丁 — by [@neonbe](https://github.com/Neonbe)

## 痛点

Antigravity 的侧边栏有三个体验问题：

1. **名字被 AI 改来改去** — 聊着聊着名字就变了，找不到之前的会话
2. **名字显示不全** — 侧边栏宽度固定，长名称直接截断
3. **会话太多太乱** — 几十个窗口堆在一起，分不清哪个是哪个

## 功能

| 功能 | 说明 |
|------|------|
| 🔒 **自动冻结** | 会话首次出现时截取前 20 字符，锁定不变 |
| ✏️ **双击改名** | 双击会话行 → 弹框输入 → 支持中文 / Emoji / 任意语言 |
| 🙈 **隐藏会话** | 点 ⋮ 菜单 → 隐藏会话 → 从列表移出 |
| 👀 **查看已隐藏** | 侧边栏底部「已隐藏 (N)」角标 → 点击展开（🙈 + 半透明标记） |
| 💬 **Hover 预览** | 鼠标悬停显示完整名称 tooltip |
| 💾 **数据不丢** | 所有数据存在 localStorage，Antigravity 更新后修复即可恢复 |

## 安装

### 方式 A — 通过 Antigravity SKILL（推荐）

1. 把 `SKILL.md` 和 `scripts/` 文件夹放到：
   ```
   ~/.gemini/antigravity/skills/antigravity-convo-name-optimize/
   ```

2. 在 Antigravity 中说：
   ```
   帮我安装 antigravity-convo-name-optimize
   ```

3. AI 自动完成注入，重启 Agent Manager 窗口即可。

### 方式 B — 手动安装

```bash
APP_WORKBENCH="/Applications/Antigravity.app/Contents/Resources/app/out/vs/code/electron-browser/workbench"

# 1. 复制脚本
curl -o "$APP_WORKBENCH/ag-renamer.js" \
  https://raw.githubusercontent.com/Neonbe/antigravity-convo-name-optimize/main/scripts/ag-renamer.js

# 2. 注入 HTML（在 jetskiAgent.js 后添加）
python3 - "$APP_WORKBENCH/workbench-jetski-agent.html" << 'EOF'
import sys
html_path = sys.argv[1]
ANCHOR = '<script src="./jetskiAgent.js" type="module"></script>'
INJECTION = ANCHOR + '\n<!-- ag-renamer -->\n<script src="./ag-renamer.js" type="module"></script>'
with open(html_path, 'r') as f: content = f.read()
if 'ag-renamer.js' in content: print('Already patched.')
elif ANCHOR not in content: print('ERROR: anchor not found'); exit(1)
else:
    with open(html_path, 'w') as f: f.write(content.replace(ANCHOR, INJECTION, 1))
    print('Patched!')
EOF

# 3. 清除 macOS 隔离标记
xattr -cr /Applications/Antigravity.app

# 4. 重启 Agent Manager 窗口
```

> ⚠️ macOS 首次重启后会弹出安全提示，点「仍然打开」即可。

## 卸载

```bash
APP_WORKBENCH="/Applications/Antigravity.app/Contents/Resources/app/out/vs/code/electron-browser/workbench"

rm -f "$APP_WORKBENCH/ag-renamer.js"

python3 - "$APP_WORKBENCH/workbench-jetski-agent.html" << 'EOF'
import sys
with open(sys.argv[1], 'r') as f: lines = f.readlines()
cleaned = [l for l in lines if 'ag-renamer.js' not in l and '<!-- ag-renamer' not in l]
with open(sys.argv[1], 'w') as f: f.writelines(cleaned)
print(f'Removed {len(lines)-len(cleaned)} lines')
EOF
```

清除数据（可选）：
```javascript
// 在 Agent Manager DevTools Console 中执行
localStorage.removeItem('ag-custom-names');
localStorage.removeItem('ag-auto-names');
localStorage.removeItem('ag-hidden-ids');
```

## Antigravity 更新后

每次 Antigravity 更新都会覆盖注入文件，但 **localStorage 里的数据不会丢失**。

修复方法：说「ag-renamer 修复」或重新执行安装步骤。

## 技术细节

- **注入方式**：`<script>` 标签注入到 `workbench-jetski-agent.html`
- **DOM 选择器**：`span[data-testid^="convo-pill-"]`
- **存储**：`localStorage`（`ag-auto-names` / `ag-custom-names` / `ag-hidden-ids`）
- **React 安全**：所有注入 DOM 挂到 `document.body`（`position: fixed`），不碰 React 容器
- **MutationObserver**：监听 `childList`、`characterData`、`aria-expanded` 属性变化

## DOM 兼容性

脚本依赖 `data-testid="convo-pill-*"` 选择器。如果 Antigravity 更新改变了 DOM 结构，可验证：

```bash
grep -q "convo-pill-" "/Applications/Antigravity.app/Contents/Resources/app/out/jetskiAgent/main.js" \
  && echo "✅ 选择器有效" || echo "⚠️ 选择器可能失效"
```

## 反馈

遇到问题？请提 [Issue](https://github.com/Neonbe/antigravity-convo-name-optimize/issues)

---

Made with ☕ by [@neonbe](https://github.com/Neonbe)

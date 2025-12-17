// Dinox Sync Plugin for flyMD
// 将 flyMD 文档同步到 Dinox 笔记软件

const DINOX_API_BASE = 'https://aisdk.chatgo.pro';

/**
 * 从文档中提取标题
 * 优先级: Front Matter title > 第一个 # 标题 > 默认名称
 */
function extractTitle(content, meta) {
  // 1. 尝试从 Front Matter 获取
  if (meta && meta.title) {
    return meta.title;
  }

  // 2. 尝试从正文第一个 # 标题获取
  const match = content.match(/^#\s+(.+)$/m);
  if (match && match[1]) {
    return match[1].trim();
  }

  // 3. 默认标题
  return '来自 flyMD 的笔记';
}

/**
 * 从 Front Matter 提取标签
 */
function extractTags(meta) {
  if (!meta) return [];

  // 支持 tags 或 keywords 字段
  const tags = meta.tags || meta.keywords || [];

  // 确保返回数组
  if (Array.isArray(tags)) {
    return tags.map(t => String(t).trim()).filter(t => t.length > 0);
  }

  // 如果是字符串，按逗号分割
  if (typeof tags === 'string') {
    return tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }

  return [];
}

/**
 * 同步到 Dinox
 */
async function syncToDinox(context) {
  // 获取 API Token
  const apiToken = await context.storage.get('apiToken');
  if (!apiToken) {
    context.ui.notice('请先配置 Dinox API Token', 'err', 3000);
    return;
  }

  // 获取文档内容
  const content = context.getEditorValue();
  if (!content || content.trim().length === 0) {
    context.ui.notice('文档内容为空', 'err', 2000);
    return;
  }

  // 获取元数据
  const meta = context.getDocMeta();
  const body = context.getDocBody();

  // 提取标题和标签
  const title = extractTitle(body, meta);
  const tags = extractTags(meta);

  // 显示进度
  const notificationId = context.ui.showNotification('正在同步到 Dinox...', {
    type: 'info',
    duration: 0
  });

  try {
    // 调用 Dinox API 创建笔记
    const response = await context.http.fetch(`${DINOX_API_BASE}/api/openapi/createNote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken
      },
      body: JSON.stringify({
        title: title,
        content: body,
        tags: tags
      })
    });

    const result = await response.json();

    // 关闭进度提示
    context.ui.hideNotification(notificationId);

    // 处理响应
    if (result.code === '200' || result.code === 200 || response.ok) {
      context.ui.showNotification(`✅ 已同步到 Dinox: ${title}`, {
        type: 'success',
        duration: 3000
      });

      // 保存 noteId 供后续更新使用
      if (result.data && result.data.noteId) {
        await context.storage.set('lastNoteId', result.data.noteId);
      }
    } else {
      context.ui.showNotification(`❌ 同步失败: ${result.msg || '未知错误'}`, {
        type: 'error',
        duration: 5000
      });
    }
  } catch (error) {
    context.ui.hideNotification(notificationId);
    context.ui.showNotification(`❌ 同步失败: ${error.message}`, {
      type: 'error',
      duration: 5000
    });
    console.error('[Dinox Sync] Error:', error);
  }
}

/**
 * 使用 Markdown 格式同步（flomo 兼容模式）
 */
async function syncAsMarkdown(context) {
  const apiToken = await context.storage.get('apiToken');
  if (!apiToken) {
    context.ui.notice('请先配置 Dinox API Token', 'err', 3000);
    return;
  }

  const content = context.getEditorValue();
  if (!content || content.trim().length === 0) {
    context.ui.notice('文档内容为空', 'err', 2000);
    return;
  }

  const notificationId = context.ui.showNotification('正在同步到 Dinox...', {
    type: 'info',
    duration: 0
  });

  try {
    const response = await context.http.fetch(`${DINOX_API_BASE}/api/openapi/markdown/import/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken
      },
      body: JSON.stringify({
        content: content
      })
    });

    const result = await response.json();
    context.ui.hideNotification(notificationId);

    if (result.code === '200' || result.code === 200 || response.ok) {
      context.ui.showNotification('✅ 已同步到 Dinox (Markdown 模式)', {
        type: 'success',
        duration: 3000
      });
    } else {
      context.ui.showNotification(`❌ 同步失败: ${result.msg || '未知错误'}`, {
        type: 'error',
        duration: 5000
      });
    }
  } catch (error) {
    context.ui.hideNotification(notificationId);
    context.ui.showNotification(`❌ 同步失败: ${error.message}`, {
      type: 'error',
      duration: 5000
    });
    console.error('[Dinox Sync] Error:', error);
  }
}

/**
 * 插件激活入口
 */
export function activate(context) {
  context.ui.notice('Dinox 同步插件已加载', 'ok', 1500);

  // 添加菜单
  context.addMenuItem({
    label: 'Dinox 同步',
    title: '将文档同步到 Dinox 笔记',
    children: [
      {
        type: 'group',
        label: '同步'
      },
      {
        label: '📤 同步到 Dinox',
        note: '含标题和标签',
        onClick: () => syncToDinox(context)
      },
      {
        label: '📝 Markdown 模式',
        note: 'flomo 兼容',
        onClick: () => syncAsMarkdown(context)
      },
      {
        type: 'divider'
      },
      {
        label: '⚙️ 设置',
        onClick: () => showSettingsDialog(context)
      }
    ]
  });
}

/**
 * 显示设置对话框 - 使用自定义 HTML 对话框
 */
async function showSettingsDialog(context) {
  const currentToken = await context.storage.get('apiToken') || '';

  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.id = 'dinox-settings-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999998;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // 创建对话框
  const dialog = document.createElement('div');
  dialog.id = 'dinox-settings-dialog';
  dialog.style.cssText = `
    background: var(--bg, #fff);
    color: var(--fg, #333);
    border-radius: 12px;
    padding: 24px;
    min-width: 360px;
    max-width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  dialog.innerHTML = `
    <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Dinox 同步设置</h3>
    <p style="margin: 0 0 12px 0; font-size: 14px; opacity: 0.8;">
      请输入你的 Dinox API Token（可在 Dinox App 设置中获取）
    </p>
    <input 
      type="text" 
      id="dinox-api-token-input"
      value="${currentToken.replace(/"/g, '&quot;')}"
      placeholder="输入 API Token..."
      style="
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--border, #ddd);
        border-radius: 8px;
        font-size: 14px;
        background: var(--input-bg, #f5f5f5);
        color: var(--fg, #333);
        box-sizing: border-box;
        outline: none;
      "
    />
    <div style="display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;">
      <button id="dinox-cancel-btn" style="
        padding: 8px 20px;
        border: 1px solid var(--border, #ddd);
        border-radius: 6px;
        background: transparent;
        color: var(--fg, #333);
        cursor: pointer;
        font-size: 14px;
      ">取消</button>
      <button id="dinox-save-btn" style="
        padding: 8px 20px;
        border: none;
        border-radius: 6px;
        background: #4f46e5;
        color: white;
        cursor: pointer;
        font-size: 14px;
      ">保存</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // 聚焦输入框
  const input = document.getElementById('dinox-api-token-input');
  input.focus();
  input.select();

  // 关闭对话框函数
  const closeDialog = () => {
    overlay.remove();
  };

  // 保存并关闭
  const saveAndClose = async () => {
    const token = input.value.trim();
    await context.storage.set('apiToken', token);
    closeDialog();
    context.ui.notice('API Token 已保存', 'ok', 2000);
  };

  // 绑定事件
  document.getElementById('dinox-cancel-btn').onclick = closeDialog;
  document.getElementById('dinox-save-btn').onclick = saveAndClose;

  // ESC 关闭
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', handleKeydown);
    } else if (e.key === 'Enter') {
      saveAndClose();
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);

  // 点击遮罩关闭
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeDialog();
    }
  };
}

/**
 * 插件设置入口（点击扩展设置按钮时调用）
 */
export function openSettings(context) {
  showSettingsDialog(context);
}

/**
 * 插件停用
 */
export function deactivate() {
  console.log('[Dinox Sync] Plugin deactivated');
}

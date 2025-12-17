# Dinox Sync for flyMD

将 flyMD 文档同步到 Dinox 笔记软件的扩展插件。

## 功能

- 📤 **一键同步** - 将当前文档同步到 Dinox
- 🏷️ **自动提取标题和标签** - 从 Front Matter 解析 `title` 和 `tags`
- 📝 **Markdown 模式** - 兼容 flomo 的纯 Markdown 导入

## 安装

在 flyMD 中：

1. 点击菜单栏「扩展」按钮
2. 输入：`saimax/dinox-sync`
3. 点击「安装」

## 配置

首次使用需要配置 Dinox API Token：

1. 打开 Dinox App → 设置 → 获取 API Token
2. 在 flyMD 中点击「Dinox 同步」→「⚙️ 设置」
3. 粘贴 Token 并保存

## 使用

### 方式一：完整同步（推荐）

点击「Dinox 同步」→「📤 同步到 Dinox」

会自动提取：
- **标题**：优先从 Front Matter 的 `title` 字段，否则取第一个 `# 标题`
- **标签**：从 Front Matter 的 `tags` 或 `keywords` 字段

示例文档：

```markdown
---
title: 我的笔记标题
tags: [日记, 想法]
---

# 正文内容

这里是笔记正文...
```

### 方式二：Markdown 模式

点击「Dinox 同步」→「📝 Markdown 模式」

直接将整个文档内容作为 Markdown 发送，兼容 flomo 格式。

## 许可

MIT License

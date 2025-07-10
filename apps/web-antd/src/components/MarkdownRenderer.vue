<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

interface Props {
  content: string;
  enableHighlight?: boolean;
  enableTyping?: boolean;
  typingSpeed?: number;
  streamMode?: boolean; // 新增：流式渲染模式
  isStreaming?: boolean; // 新增：是否正在流式接收
}

const props = withDefaults(defineProps<Props>(), {
  enableHighlight: true,
  enableTyping: false,
  typingSpeed: 30,
  streamMode: false,
  isStreaming: false,
});

const displayContent = ref('');
const isTyping = ref(false);

// 配置 markdown-it
const md: any = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: props.enableHighlight
    ? (str: string, lang: string) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
          } catch (__) {}
        }
        return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
      }
    : undefined,
});

// 流式渲染的HTML内容
const renderedHtml = computed(() => {
  if (!displayContent.value) return '';

  // 流式模式下的智能渲染
  if (props.streamMode && props.isStreaming) {
    return renderStreamContent(displayContent.value);
  }

  return md.render(displayContent.value);
});

// 流式内容渲染函数
const renderStreamContent = (content: string) => {
  if (!content) return '';

  // 尝试找到完整的markdown块
  const lines = content.split('\n');
  let completeContent = '';
  let incompleteContent = '';

  // 检查是否有未完成的代码块
  let inCodeBlock = false;
  let codeBlockStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检测代码块开始/结束
    if (line && line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockStart = i;
      } else {
        inCodeBlock = false;
        codeBlockStart = -1;
      }
    }
  }

  // 如果在代码块中且是最后几行，暂时不渲染代码块
  if (inCodeBlock && codeBlockStart >= 0) {
    // 渲染代码块之前的内容
    const beforeCodeBlock = lines.slice(0, codeBlockStart).join('\n');
    const codeBlockContent = lines.slice(codeBlockStart).join('\n');

    completeContent = beforeCodeBlock;
    incompleteContent = codeBlockContent;
  } else {
    completeContent = content;
  }

  // 渲染完整部分
  let html = completeContent ? md.render(completeContent) : '';

  // 添加未完成部分（以普通文本形式）
  if (incompleteContent) {
    html += `<div class="incomplete-content">${md.utils.escapeHtml(incompleteContent)}</div>`;
  }

  return html;
};

// 打字机效果
const startTyping = async () => {
  if (!props.enableTyping || !props.content) {
    displayContent.value = props.content;
    return;
  }

  isTyping.value = true;
  displayContent.value = '';

  const content = props.content;
  let currentIndex = 0;

  const typeNextChar = () => {
    if (currentIndex < content.length) {
      displayContent.value += content[currentIndex];
      currentIndex++;
      setTimeout(typeNextChar, props.typingSpeed);
    } else {
      isTyping.value = false;
    }
  };

  typeNextChar();
};

// 监听内容变化
watch(
  () => props.content,
  (newContent) => {
    if (props.streamMode) {
      // 流式模式直接更新内容
      displayContent.value = newContent;
    } else {
      // 非流式模式使用打字机效果
      startTyping();
    }
  },
  { immediate: true },
);

// 监听流式状态变化
watch(
  () => props.isStreaming,
  (isStreaming) => {
    if (props.streamMode && !isStreaming) {
      // 流式结束时，确保内容完整渲染
      displayContent.value = props.content;
    }
  },
);

onMounted(() => {
  if (props.streamMode) {
    // 流式模式直接显示内容
    displayContent.value = props.content;
  } else {
    // 非流式模式使用打字机效果
    startTyping();
  }
});
</script>

<template>
  <div class="markdown-renderer">
    <div class="markdown-content" v-html="renderedHtml" />
    <span v-if="isTyping" class="typing-cursor">|</span>
  </div>
</template>

<style lang="scss" scoped>
.markdown-renderer {
  position: relative;

  .typing-cursor {
    animation: blink 1s infinite;
    font-weight: bold;
    margin-left: 2px;
  }
}

:deep(.markdown-content) {
  line-height: 1.6;
  color: inherit;

  // 标题样式
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 1em 0 0.5em 0;
    font-weight: 600;
    line-height: 1.3;
  }

  h1 {
    font-size: 1.5em;
  }
  h2 {
    font-size: 1.3em;
  }
  h3 {
    font-size: 1.2em;
  }
  h4 {
    font-size: 1.1em;
  }
  h5 {
    font-size: 1em;
  }
  h6 {
    font-size: 0.9em;
  }

  // 段落样式
  p {
    margin: 0.8em 0;
  }

  // 列表样式
  ul,
  ol {
    margin: 0.8em 0;
    padding-left: 2em;
  }

  li {
    margin: 0.3em 0;
  }

  // 代码样式
  code {
    background: #f5f5f5;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
  }

  pre {
    background: #f8f9fa;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    padding: 1em;
    margin: 1em 0;
    overflow-x: auto;

    code {
      background: none;
      padding: 0;
      border-radius: 0;
      font-size: 0.85em;
    }
  }

  // 引用样式
  blockquote {
    border-left: 4px solid #dfe2e5;
    padding-left: 1em;
    margin: 1em 0;
    color: #6a737d;
    font-style: italic;
  }

  // 链接样式
  a {
    color: #1890ff;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  // 表格样式
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }

  th,
  td {
    border: 1px solid #dfe2e5;
    padding: 0.5em 1em;
    text-align: left;
  }

  th {
    background: #f6f8fa;
    font-weight: 600;
  }

  // 分割线样式
  hr {
    border: none;
    border-top: 1px solid #e1e4e8;
    margin: 2em 0;
  }

  // 图片样式
  img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }

  // 未完成内容样式（流式渲染时使用）
  .incomplete-content {
    background: rgba(255, 193, 7, 0.1);
    border-left: 3px solid #ffc107;
    padding: 0.5em;
    margin: 0.5em 0;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
    color: #856404;
    white-space: pre-wrap;
    border-radius: 0 4px 4px 0;
  }
}

// 深色模式适配
.dark :deep(.markdown-content) {
  code {
    background: #2d3748;
    color: #e2e8f0;
  }

  pre {
    background: #1a202c;
    border-color: #4a5568;
    code {
      color: #e2e8f0;
    }
  }

  blockquote {
    border-left-color: #4a5568;
    color: #a0aec0;
  }

  table {
    th,
    td {
      border-color: #4a5568;
    }

    th {
      background: #2d3748;
    }
  }

  hr {
    border-top-color: #4a5568;
  }

  // 深色模式下的未完成内容样式
  .incomplete-content {
    background: rgba(255, 193, 7, 0.15);
    border-left-color: #d69e2e;
    color: #d69e2e;
  }
  .hljs {
    color: rgb(197, 133, 133);
    code {
      color: inherit;
      .hljs-string {
        color: red !important;
      }
    }
  }
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}
</style>

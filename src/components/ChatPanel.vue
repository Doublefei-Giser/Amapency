<template>
  <div class="panel" ref="panelRef" :style="panelStyle">
    <div class="handle" ref="handleRef" @mousedown="startDragging" @touchstart="startDragging">
      <div class="bar"></div>
    </div>
    <div class="chat-container">
      <div class="chat-body" ref="chatWindowRef">
        <div v-for="(message, index) in messages" :key="index" 
             :class="['chat-message', message.type]">
          <div class="bubble" v-if="message.type === 'right'">{{ message.content }}</div>
          <div class="bubble markdown-body" v-else v-html="renderMarkdown(message.content)"></div>
        </div>
      </div>
      <div class="chat-footer">
        <input 
          type="text" 
          class="chat-input" 
          v-model="inputMessage" 
          placeholder="输入消息..."
          @keyup.enter="sendMessage"
        >
        <button 
          class="chat-send-btn" 
          :class="{ loading: isLoading }" 
          @click="sendMessage"
          :disabled="isLoading || !inputMessage.trim()"
        >
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { marked } from 'marked';
import 'highlight.js/styles/github.css';

interface Props {
  initialMessage?: string;
  panelHeight?: number;
  minTransform?: number;
  maxTransform?: number;
}

interface Message {
  type: 'left' | 'right';
  content: string;
}

const props = withDefaults(defineProps<Props>(), {
  initialMessage: '',
  panelHeight: 60,
  minTransform: 0,
  maxTransform: 55
});

// 状态管理
const messages = ref<Message[]>([]);
const inputMessage = ref('');
const isLoading = ref(false);
const transform = ref(0);

// DOM 引用
const panelRef = ref<HTMLElement | null>(null);
const handleRef = ref<HTMLElement | null>(null);
const chatWindowRef = ref<HTMLElement | null>(null);

// 拖拽状态
const isDragging = ref(false);
const startY = ref(0);
const startTransform = ref(0);

// 计算样式
const panelStyle = computed(() => ({
  height: `${props.panelHeight}vh`,
  transform: `translateY(${transform.value}vh)`
}));

// 监听初始消息
watch(() => props.initialMessage, (newMessage) => {
  if (newMessage) {
    messages.value.push({
      type: 'right',
      content: newMessage
    });
    handleResponse(newMessage);
  }
});

// 拖拽处理函数
const startDragging = (e: MouseEvent | TouchEvent) => {
  if (e.target !== handleRef.value) return;
  isDragging.value = true;
  startY.value = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
  startTransform.value = transform.value;
  e.preventDefault();
};

const handleDragging = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return;
  const currentY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
  const dy = currentY - startY.value;

  if (Math.abs(dy) > 10) {
    transform.value = Math.min(
      props.maxTransform,
      Math.max(props.minTransform, startTransform.value + dy / 5)
    );
  }
};

const stopDragging = () => {
  isDragging.value = false;
};

// 消息处理
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return;

  const message = inputMessage.value;
  inputMessage.value = '';
  
  messages.value.push({
    type: 'right',
    content: message
  });

  await handleResponse(message);
};

const handleResponse = async (message: string) => {
  isLoading.value = true;
  transform.value = props.minTransform;

  try {
    // 这里添加与 AI 服务器的通信逻辑
    // 模拟 AI 响应
    await new Promise(resolve => setTimeout(resolve, 1000));
    messages.value.push({
      type: 'left',
      content: `收到消息：${message}`
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};

const scrollToBottom = () => {
  if (chatWindowRef.value) {
    chatWindowRef.value.scrollTop = chatWindowRef.value.scrollHeight;
  }
};

// 生命周期钩子
onMounted(() => {
  document.addEventListener('mousemove', handleDragging);
  document.addEventListener('mouseup', stopDragging);
  document.addEventListener('touchmove', handleDragging);
  document.addEventListener('touchend', stopDragging);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleDragging);
  document.removeEventListener('mouseup', stopDragging);
  document.removeEventListener('touchmove', handleDragging);
  document.removeEventListener('touchend', stopDragging);
});

// 配置 marked
marked.setOptions({
  breaks: true,    // 允许换行
  gfm: true,       // 启用 GitHub 风格的 Markdown 
});

// 添加 Markdown 渲染函数
const renderMarkdown = (content: string) => {
  // 处理换行符，确保正确渲染
  const processedContent = content.replace(/\\n/g, '\n').replace(/\n/g, '  \n');
  return marked.parse(processedContent, { breaks: true });
};
</script>

<style scoped>
.panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: white;
  border-radius: 25px 25px 0 0;
  padding: 0 20px 20px 20px;
  box-shadow: 
    0 -4px 6px -1px rgba(0, 0, 0, 0.1),
    0 -2px 4px -1px rgba(0, 0, 0, 0.06),
    0 -10px 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: transform 0.2s;
  isolation: isolate;  /* 添加这一行 */
}

.handle {
  width: 100%;
  height: 20px;
  background-color: white;
  border-radius: 10px 10px 0 0;
  margin: 0;
  cursor: pointer;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.bar {
  width: 40px;
  height: 5px;
  background-color: #ccc;
  border-radius: 5px;
  margin: 0 auto;
}

.chat-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  margin-top: 20px;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding-top: 30px;
}

.chat-message {
  margin-bottom: 10px;
}

.chat-message.right {
  text-align: right;
}

.chat-message.left {
  text-align: left;
}

.chat-message .bubble {
  color: #000000;
  display: inline-block;
  padding: 8px 12px;
  border-radius: 5px;
  max-width: 70%;
  word-wrap: break-word;
  background-color: #e5e5e5;
}

.chat-message.right .bubble {
  background-color: #a0e75a;
}

.chat-footer {
  border-top: 1px solid #ddd;
  padding-top: 8px;
  padding-bottom: 8px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.chat-input {
  background: #ffffff;
  -webkit-appearance: none;
  appearance: none;
  color: #000000;
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  outline: none;
}

.chat-send-btn {
  padding: 5px 15px;
  border: none;
  background-color: #1773ec;
  color: #fff;
  border-radius: 5px;
  cursor: pointer;
}

.chat-send-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.chat-send-btn.loading {
  position: relative;
  color: transparent;
}

.chat-send-btn.loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: button-loading-spinner 1s linear infinite;
}

@keyframes button-loading-spinner {
  from {
    transform: rotate(0turn);
  }
  to {
    transform: rotate(1turn);
  }
}

.markdown-body {
  text-align: left;
}

.markdown-body :deep(p) {
  margin: 0;
}

.markdown-body :deep(pre) {
  margin: 8px 0;
  padding: 8px;
  background-color: #f6f8fa;
  border-radius: 4px;
  overflow-x: auto;
}

.markdown-body :deep(code) {
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 0.9em;
}

.markdown-body :deep(a) {
  color: #0366d6;
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #ddd;
  padding: 6px;
}

.markdown-body :deep(blockquote) {
  margin: 8px 0;
  padding-left: 1em;
  border-left: 4px solid #ddd;
  color: #666;
}

.markdown-body :deep(br) {
  display: block;
  content: "";
  margin: 8px 0;
}
</style>
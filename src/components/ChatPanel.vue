<template>
  <div class="panel" ref="panelRef" :style="panelStyle">
    <div class="handle" ref="handleRef" @mousedown="startDragging" @touchstart="startDragging">
      <div class="sidebar-toggle" @click.stop="toggleSidebar">
        <i class="fas fa-bars"></i>
      </div>
      <div class="bar"></div>
      <div 
      v-if="isSidebarOpen" 
      class="sidebar-overlay" 
      @click="toggleSidebar"
    ></div>
    <Sidebar 
      :is-open="isSidebarOpen" 
      :conversations="conversations"
      @select="loadConversation"
    />
      <div class="handle-title">地百通</div>
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
    <Sidebar 
      :is-open="isSidebarOpen" 
      :conversations="conversations"
      @select="loadConversation"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { marked } from 'marked';
import { v4 as uuidv4 } from 'uuid';
import BaiduAgentClient from '../api';
import Sidebar from './Sidebar.vue';

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
  panelHeight: 70,
  minTransform: 0,
  maxTransform: 66
});

// 状态管理
const messages = ref<Message[]>([]);
const inputMessage = ref('');
const isLoading = ref(false);
const transform = ref(0);
const threadId = ref<string | undefined>(undefined); // 添加 threadId 状态

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

// 创建 BaiduAgentClient 实例
const client = new BaiduAgentClient('4fANRoEUmLWNNLdCKygrk5lb4M4rqgi6', 'ET5SUAjipQC3XGYTcSR5x06N60kj6yAB');

// 添加侧边栏状态
const isSidebarOpen = ref(false);
const conversations = ref<Array<{
  id: string;
  messages: Message[];
  timestamp: number;
}>>([]);

// 加载历史对话
onMounted(() => {
  // 添加现有的事件监听器
  document.addEventListener('mousemove', handleDragging);
  document.addEventListener('mouseup', stopDragging);
  document.addEventListener('touchmove', handleDragging);
  document.addEventListener('touchend', stopDragging);
  // 从本地存储加载对话
  const savedConversations = localStorage.getItem('conversations');
  if (savedConversations) {
    conversations.value = JSON.parse(savedConversations);
  }
});

// 切换侧边栏
const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

const saveConversation = () => {
  if (messages.value.length > 0) {
    const conversation = {
      id: uuidv4(),
      messages: [...messages.value],
      timestamp: Date.now()
    };
    conversations.value = [conversation, ...conversations.value];
    localStorage.setItem('conversations', JSON.stringify(conversations.value));
  }
};

// 加载选中的对话
const loadConversation = (conversation: {
  id: string;
  messages: Message[];
  timestamp: number;
}) => {
  messages.value = [...conversation.messages];
  isSidebarOpen.value = false;
};

// 修改 handleResponse 函数
const handleResponse = async (message: string) => {
  isLoading.value = true;
  transform.value = props.minTransform;

  try {
    const request = {
      threadId: threadId.value,
      message: {
        content: {
          type: 'text' as const,
          value: {
            showText: message
          }
        }
      },
      source: 'your_appId',
      from: 'openapi' as const,  
      openId: 'user_123'
    };

    let responseText = '';
    for await (const response of client.conversationStream(request)) {
      if (response.status === 0) {
        if (response.data.message.threadId) {
          threadId.value = response.data.message.threadId;
        }
        
        for (const content of response.data.message.content) {
          if (content.dataType === 'markdown') {
            responseText += content.data.text;
            if (messages.value.length > 0 && messages.value[messages.value.length - 1].type === 'left') {
              messages.value[messages.value.length - 1].content = responseText;
            } else {
              messages.value.push({
                type: 'left',
                content: responseText
              });
            }
            scrollToBottom();
          }
        }
      } else {
        console.error(`Error: ${response.message}`);
        messages.value.push({
          type: 'left',
          content: '抱歉，发生了一些错误，请稍后重试。'
        });
      }
    }
    // 在对话完成后保存对话
    saveConversation();
  } catch (error) {
    console.error('Error:', error);
    messages.value.push({
      type: 'left',
      content: '抱歉，发生了一些错误，请稍后重试。'
    });
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
};</script>

<style scoped>
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 999;
}
/* 添加新的样式 */
.sidebar-toggle {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  font-size: 1.2rem;
  color: #333;
  padding: 5px;
}

.sidebar-toggle:hover {
  color: #1773ec;
}
.handle {
  width: 100%;
  height: 4.5vh;
  background-image: linear-gradient(to bottom, rgb(178, 202, 252), white);
  border-radius: 15px 15px 0 0;
  margin: 0;
  cursor: pointer;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 
    0 -9px 10px -2px rgba(0, 0, 0, 0.1),
    0 -4px 8px -2px rgba(0, 0, 0, 0.06);
}
.bar {
  width: 40px;
  height: 5px;
  background-color: #ccc;
  border-radius: 5px;
  margin: 5px auto 2px;
}
.handle-title {
  font-size: 0.9rem;
  color: #333;
  font-weight: 500;
  margin-bottom: 3px;
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
  display: flex;
}

.chat-message.right {
  justify-content: flex-end;
}

.chat-message.left {
  justify-content: flex-start;
}

.chat-message .bubble {
  color: #000000;
  display: inline-block;
  padding: 8px 12px;
  border-radius: 5px;
  max-width: 85%;
  word-wrap: break-word;
  background-color: #e5e5e5;
  font-size: 0.8rem;
  text-align: left;  /* 添加这行确保文本左对齐 */
}
.chat-message.right .bubble {
  background-color: #a0e75a;
}
.chat-footer {
  border-top: 1px solid #ddd;
  padding-top: 4px;          /* 从 6px 减小到 4px */
  padding-bottom: 4px;       /* 从 6px 减小到 4px */
  display: flex;
  justify-content: space-between;
  gap: 6px;                  /* 从 8px 减小到 6px */
}

.chat-input {
  background: #ffffff;
  -webkit-appearance: none;
  appearance: none;
  color: #000000;
  flex: 1;
  padding: 6px;              /* 从 8px 减小到 6px */
  border: 1px solid #ddd;
  border-radius: 5px;
  outline: none;
  font-size: 0.9rem;         /* 添加字体大小缩小 */
}

.chat-send-btn {
  padding: 4px 8px;          /* 从 5px 10px 减小到 4px 8px */
  border: none;
  background-color: #1773ec;
  color: #fff;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;         /* 添加字体大小缩小 */
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

.markdown-body :deep(h3) {
  margin: 0;
}
.markdown-body :deep(p) {
  margin: 0;
}
.markdown-body :deep(ul) {
  margin: 0;
  padding-left: 15px;
}
.markdown-body :deep(pre) {
  margin: 8px 0;
  padding: 8px;
  background-color: #f6f8fa;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;  /* 添加这行以确保长代码可以换行 */
  word-break: break-all;  /* 添加这行以确保长单词可以换行 */
}

.markdown-body :deep(code) {
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 0.9em;
  background-color: #f6f8fa;  /* 添加这行为内联代码提供背景色 */
  padding: 2px 4px;          /* 添加这行为内联代码提供内边距 */
  border-radius: 3px;        /* 添加这行为内联代码提供圆角 */
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
  border-collapse: separate;  /* 改为 separate 以支持圆角 */
  border-spacing: 0;         /* 确保单元格之间没有间隔 */
  width: 100%;
  margin: 8px 0;
  border-radius: 8px;        /* 添加整体圆角 */
  overflow: hidden; 
  border: 1px solid #3c3b3b;         /* 确保内容不会超出圆角 */
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #6c6b6b;
  padding: 6px;
}

/* 处理第一行的圆角 */
.markdown-body :deep(tr:first-child th:first-child) {
  border-top-left-radius: 8px;
}
.markdown-body :deep(tr:first-child th:last-child) {
  border-top-right-radius: 8px;
}

/* 处理最后一行的圆角 */
.markdown-body :deep(tr:last-child td:first-child) {
  border-bottom-left-radius: 8px;
}
.markdown-body :deep(tr:last-child td:last-child) {
  border-bottom-right-radius: 8px;
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
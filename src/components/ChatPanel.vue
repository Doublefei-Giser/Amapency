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
      @delete="deleteConversation"
    />
      <div class="handle-title">地百通</div>
    </div>
    <ConfirmDialog
      :is-visible="showConfirmDialog"
      title="切换模式"
      message="切换模式将清空当前对话内容，是否继续？"
      @confirm="confirmModeSwitch"
      @cancel="cancelModeSwitch"
    />
    <div class="chat-container">
      <div class="chat-body" ref="chatWindowRef">
        <div v-for="(message, index) in messages" :key="index" 
             :class="['chat-message', message.type]">
          <div class="bubble" v-if="message.type === 'right'">{{ message.content }}</div>
          <div v-else>
            <!-- 修改思考标签显示方式 -->
            <div class="thinking-header" v-if="message.isThinking || message.hasReasoning">
              <div class="thinking-label-bubble">
                {{ message.isThinking ? '思考中' : '思考过程' }}
                <i class="fas fa-angle-down" 
                   @click="toggleReasoning(index)" 
                   :class="{ 'fa-rotate-180': !reasoningVisible[index] }"></i>
              </div>
            </div>
            <div class="bubble markdown-body" v-html="renderMarkdown(getDisplayContent(message, index))"></div>
          </div>
        </div>
      </div>
      <ChatFooter 
        :is-loading="isLoading"
        :is-deep-thinking-active="isDeepThinkingActive"
        @send="sendMessage"
        @new-conversation="startNewConversation"
        @deep-thinking="startDeepThinking"
        @stop-response="stopResponse"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { marked } from 'marked';
import { v4 as uuidv4 } from 'uuid';
import { normalClient, deepThinkingClient, } from '../api';
import Sidebar from './Sidebar.vue';
import ChatFooter from './ChatFooter.vue';
import ConfirmDialog from './ConfirmDialog.vue';

interface Props {
  initialMessage?: string;
  panelHeight?: number;
  minTransform?: number;
  maxTransform?: number;
}

interface Message {
  type: 'left' | 'right';
  content: string;
  isThinking?: boolean;
  hasReasoning?: boolean;
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
const reasoningVisible = ref<Record<number, boolean>>({}); // 添加控制思考内容显示的状态
const toggleReasoning = (index: number) => {
  reasoningVisible.value[index] = !reasoningVisible.value[index];
};

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
  
  // 移除最小移动距离判断，直接计算transform值
  const windowHeight = window.innerHeight;
  const movePercent = (dy / windowHeight) * 100*1.2;
  transform.value = Math.min(
    props.maxTransform,
    Math.max(props.minTransform, startTransform.value + movePercent)
  );
};

const stopDragging = () => {
  isDragging.value = false;
};

// 消息处理
const sendMessage = async (message: string) => {
  if (!message.trim() || isLoading.value) return;
  
  messages.value.push({
    type: 'right',
    content: message
  });
  scrollToBottom();
  await handleResponse(message);
};

let client = normalClient;
// 添加侧边栏状态
const isSidebarOpen = ref(false);
const conversations = ref<Array<{
  id: string;
  messages: Message[];
  threadId?: string;
  isDeepThinking?: boolean;
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
    // 如果是现有会话，更新它
    if (currentConversationId.value) {
      const index = conversations.value.findIndex(c => c.id === currentConversationId.value);
      if (index !== -1) {
        conversations.value[index].messages = [...messages.value];
        conversations.value[index].timestamp = Date.now();
        conversations.value[index].threadId = threadId.value; // 确保更新threadId
        conversations.value[index].isDeepThinking = isDeepThinkingActive.value; // 保存当前模式状态
        // 将更新的会话移到顶部
        const updatedConversation = conversations.value.splice(index, 1)[0];
        conversations.value.unshift(updatedConversation);
      }
    } else {
      // 创建新会话
      const conversation = {
        id: uuidv4(),
        messages: [...messages.value],
        threadId: threadId.value, // 保存threadId
        isDeepThinking: isDeepThinkingActive.value, // 保存当前模式状态
        timestamp: Date.now()
      };
      currentConversationId.value = conversation.id;
      conversations.value = [conversation, ...conversations.value];
    }
    
    localStorage.setItem('conversations', JSON.stringify(conversations.value));
  }
};
const loadConversation = (conversation: {
  id: string;
  messages: Message[];
  threadId?: string; // 添加可选的threadId
  isDeepThinking?: boolean; // 添加可选的模式状态
  timestamp: number;
}) => {
  messages.value = [...conversation.messages];
  threadId.value = conversation.threadId; // 恢复threadId
  currentConversationId.value = conversation.id; // 设置当前会话ID
  
  // 恢复对话模式
  if (conversation.isDeepThinking !== undefined) {
    // 只有当需要切换模式时才执行
    if (isDeepThinkingActive.value !== conversation.isDeepThinking) {
      isDeepThinkingActive.value = conversation.isDeepThinking;
      client = isDeepThinkingActive.value ? deepThinkingClient : normalClient;
      console.log(isDeepThinkingActive.value ? '已切换到深度思考模式' : '已切换到普通模式');
    }
  }
  
  isSidebarOpen.value = false;
};

// 修改新建对话函数
const startNewConversation = () => {
  // 如果当前有对话且有变化，先保存
  if (currentConversationId.value && messages.value.length > 0) {
    saveConversation();
  }
  
  // 清空当前消息
  messages.value = [];
  // 重置输入框
  inputMessage.value = '';
  // 重置线程ID
  threadId.value = undefined;
  // 重置当前会话ID
  currentConversationId.value = undefined;
  // 滚动到底部
  scrollToBottom();
};
const isDeepThinkingActive = ref(false);


const showConfirmDialog = ref(false);

const startDeepThinking = () => {
  // 如果当前有消息，显示自定义确认弹窗
  if (messages.value.length > 0) {
    showConfirmDialog.value = true;
  } else {
    // 如果没有消息，直接切换模式
    toggleDeepThinkingMode();
  }
};

// 确认切换模式
const confirmModeSwitch = () => {
  showConfirmDialog.value = false;
  toggleDeepThinkingMode();
  startNewConversation();
};
// 取消切换模式，仅关闭确认对话框
const cancelModeSwitch = () => {
  showConfirmDialog.value = false;
};

// 抽取切换模式的逻辑为单独函数
const toggleDeepThinkingMode = () => {
  isDeepThinkingActive.value = !isDeepThinkingActive.value;
  // 直接切换客户端实例
  client = isDeepThinkingActive.value ? deepThinkingClient : normalClient;
  console.log(isDeepThinkingActive.value ? '已切换到深度思考模式' : '已切换到普通模式');
};
const abortController = ref<AbortController | null>(null);

// 修改停止响应的方法
const stopResponse = () => {
  if (abortController.value) {
    abortController.value.abort();
    abortController.value = null;
    isLoading.value = false;
    
    // 添加一条消息表示响应已被中断
    if (messages.value.length > 0 && messages.value[messages.value.length - 1].type === 'left') {
      messages.value[messages.value.length - 1].content += '\n\n*回复已被中断*';
    }
    
    // 确保保存当前对话状态
    saveConversation();
  }
};

// 修改 handleResponse 函数
const handleResponse = async (message: string) => {
  isLoading.value = true;
  transform.value = props.minTransform;
  
  // 确保创建新的 AbortController 实例
  abortController.value = new AbortController();
  
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
      openId: 'user_123',
      signal: abortController.value.signal  // 确保信号被正确传递
    };

    let responseText = '';
    let reasoningText = '';
    
    // 使用 try-catch 包裹循环，以便正确处理中断异常
    try {
      for await (const response of client.conversationStream(request)) {
        // 检查是否已中断
        if (abortController.value === null) {
          break;
        }
        
        if (response.status === 0) {
          if (response.data.message.threadId) {
            threadId.value = response.data.message.threadId;
          }
          
          for (const content of response.data.message.content) {
            if (content.dataType === 'markdown') {
              responseText += content.data.text;
              // 如果有推理内容，将其添加为引用块
              if (reasoningText) {
                const formattedResponse = `> ${reasoningText.replace(/\n/g, '\n> ')}\n\n${responseText}`;
                updateOrAddMessage('left', formattedResponse, false, true);
                // 默认设置该消息的推理内容为可见
                if (messages.value.length > 0) {
                  reasoningVisible.value[messages.value.length - 1] = true;
                }
              } else {
                updateOrAddMessage('left', responseText);
              }
              scrollToBottom();
            } else if (content.dataType === 'reasoning') {
              // 收集推理内容
              if (content.data.value) {
                reasoningText += content.data.value;
                // 如果只有推理内容，先显示出来
                if (!responseText) {
                  const formattedReasoning = `> ${reasoningText.replace(/\n/g, '\n> ')}`;
                  updateOrAddMessage('left', formattedReasoning, true, false);
                  // 默认设置该消息的推理内容为可见
                  if (messages.value.length > 0) {
                    reasoningVisible.value[messages.value.length - 1] = true;
                  }
                  scrollToBottom();
                }
              }
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
    } catch (err) {
      // 检查是否是中断导致的错误
      if ((err as Error).name === 'AbortError') {
        console.log('请求已被用户中断');
      } else {
        throw err; // 重新抛出非中断错误
      }
    }
    
    // 在对话完成后保存对话
    if (abortController.value !== null) { // 只有在非中断情况下才保存
      saveConversation();
    }
  } catch (error) {
    console.error('Error:', error);
    messages.value.push({
      type: 'left',
      content: '抱歉，发生了一些错误，请稍后重试。'
    });
  } finally {
    isLoading.value = false;
    scrollToBottom();
    // 确保清理 abortController
    abortController.value = null;
  }
};

// 修改 updateOrAddMessage 函数
const updateOrAddMessage = (type: 'left' | 'right', content: string, isThinking = false, hasReasoning = false) => {
  if (messages.value.length > 0 && messages.value[messages.value.length - 1].type === type) {
    // 使用 setTimeout 逐步显示内容
    let currentContent = messages.value[messages.value.length - 1].content;
    const newContent = content;
    const interval = 20; 
    let index = currentContent.length;

    const showNextChar = () => {
      if (index < newContent.length) {
        currentContent += newContent[index];
        messages.value[messages.value.length - 1].content = currentContent;
        index++;
        setTimeout(showNextChar, interval);
      } else {
        messages.value[messages.value.length - 1].isThinking = isThinking;
        messages.value[messages.value.length - 1].hasReasoning = hasReasoning;
      }
    };

    showNextChar();
  } else {
    messages.value.push({
      type,
      content,
      isThinking,
      hasReasoning
    });
  }
};
// 添加处理显示内容的方法
const getDisplayContent = (message: Message, index: number) => {
  if (!message.hasReasoning || !message.content.includes('\n\n')) {
    return message.content;
  }
  
  // 如果是推理内容且需要折叠
  if (!reasoningVisible.value[index]) {
    // 分离引用块和正常回答
    const parts = message.content.split('\n\n');
    // 只返回非引用块部分
    return parts.slice(1).join('\n\n');
  }
  
  return message.content;
};

const scrollToBottom = () => {
  if (chatWindowRef.value) {
    chatWindowRef.value.scrollTop = chatWindowRef.value.scrollHeight;
  }
};
const currentConversationId = ref<string | undefined>(undefined);

// 生命周期钩子
onMounted(() => {
  document.addEventListener('mousemove', handleDragging);
  document.addEventListener('mouseup', stopDragging);
  document.addEventListener('touchmove', handleDragging);
  document.addEventListener('touchend', stopDragging);
  const savedConversations = localStorage.getItem('conversations');
  if (savedConversations) {
    conversations.value = JSON.parse(savedConversations);
  }
  
  // 创建新会话
  startNewConversation();
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

const deleteConversation = (conversationId: string) => {
  // 从conversations数组中删除对话
  conversations.value = conversations.value.filter(c => c.id !== conversationId);
  
  // 如果删除的是当前对话，清空当前对话
  if (currentConversationId.value === conversationId) {
    startNewConversation();
  }
  
  // 更新本地存储
  localStorage.setItem('conversations', JSON.stringify(conversations.value));
};
</script>

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
  font-size: 0.9rem;
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
  -webkit-tap-highlight-color: transparent; /* 添加这行，禁用移动端点击时的高亮效果 */
  user-select: none; /* 添加这行，防止文本被选中 */
}

/* 添加这些样式来处理触摸状态 */
.handle:active,
.handle:hover {
  background-image: linear-gradient(to bottom, rgb(178, 202, 252), white);
}

/* 添加媒体查询，专门处理移动端 */
@media (hover: none) and (pointer: coarse) {
  .handle {
    -webkit-touch-callout: none; /* 禁用iOS长按菜单 */
  }
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
  max-width: 100%;
  word-wrap: break-word;
  background-color: #e5e5e5;
  font-size: 0.8rem;
  text-align: left;  /* 添加这行确保文本左对齐 */
}
.chat-message.right .bubble {
  background-color: #a0e75a;
}
.thinking-label {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 4px;
  font-weight: 500;
}
.markdown-body {
  text-align: left;
}
.markdown-body :deep(h1) {
  margin: 0;
  font-size: 1rem;  /* 调整 h1 的大小 */
  line-height: 1.4;
}

.markdown-body :deep(h2) {
  margin: 0;
  font-size: 0.9rem;  /* 调整 h2 的大小 */
  line-height: 1.3;
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
.markdown-body :deep(ol) {
  margin: 0;
  padding-left: 15px;
}
.markdown-body :deep(blockquote) {
  font-size: 0.7rem;
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


.thinking-header {
  margin-bottom: 4px;
}

.thinking-label-bubble {
  display: inline-flex;
  align-items: center;
  background-color: #f0f0f0;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.75rem;
  color: #666;
  font-weight: 500;
  margin-bottom: 4px;
}

.thinking-label-bubble i {
  margin-left: 4px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.thinking-label-bubble i:hover {
  color: #1773ec;
}
</style>
<template>
  <div class="sidebar" :class="{ 'sidebar-open': isOpen }">
    <div class="sidebar-header">
      <h3>历史对话</h3>
    </div>
    <div class="sidebar-content">
      <div v-if="conversations.length === 0" class="empty-state">
        暂无历史对话
      </div>
      <div 
        v-else 
        v-for="(conversation, index) in conversations" 
        :key="index"
        class="conversation-item"
      >
        <div class="conversation-content" @click="selectConversation(conversation)">
          <div class="conversation-preview">
            {{ getConversationPreview(conversation) }}
          </div>
          <div class="conversation-time">
            {{ formatTime(conversation.timestamp) }}
          </div>
        </div>
        <i 
          class="fa-regular fa-trash-can delete-icon"
          @click="confirmDelete(conversation)"
        ></i>
      </div>
    </div>
    
    <ConfirmDialog
      :is-visible="showDeleteConfirm"
      title="删除对话"
      message="确定要删除这条对话吗？此操作不可恢复。"
      @confirm="handleDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ConfirmDialog from './ConfirmDialog.vue';

import { defineProps, defineEmits } from 'vue';

interface Conversation {
  id: string;
  messages: Array<{
    type: 'left' | 'right';
    content: string;
  }>;
  threadId?: string; // 添加可选的threadId
  isDeepThinking?: boolean; // 添加可选的模式状态
  timestamp: number;
}

defineProps<{
  isOpen: boolean;
  conversations: Conversation[];
}>();

const emit = defineEmits<{
  (e: 'select', conversation: Conversation): void;
  (e: 'delete', conversationId: string): void;
}>();

const selectConversation = (conversation: Conversation) => {
  emit('select', conversation);
};

const getConversationPreview = (conversation: Conversation) => {
  const firstUserMessage = conversation.messages.find(msg => msg.type === 'right');
  return firstUserMessage ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '') : '';
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const showDeleteConfirm = ref(false);
const pendingDeleteConversation = ref<Conversation | null>(null);

const confirmDelete = (conversation: Conversation) => {
  pendingDeleteConversation.value = conversation;
  showDeleteConfirm.value = true;
};

const handleDelete = () => {
  if (pendingDeleteConversation.value) {
    emit('delete', pendingDeleteConversation.value.id);
  }
  showDeleteConfirm.value = false;
  pendingDeleteConversation.value = null;
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
  pendingDeleteConversation.value = null;
};
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: -300px;
  width: 300px;
  height: 100vh;
  background-color: #fff;
  box-shadow: 
    0 -9px 10px -2px rgba(0, 0, 0, 0.1),
    0 -4px 8px -2px rgba(0, 0, 0, 0.06);
  transition: left 0.3s ease;
  z-index: 1001;
  border-radius: 15px 0 0 15px; /* 添加圆角效果 */
}

.sidebar-open {
  left: 0;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.sidebar-content {
  padding: 16px;
  overflow-y: auto;
  height: calc(100vh - 60px);
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 20px;
}

.conversation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s;
}

.conversation-content {
  flex: 1;
  cursor: pointer;
  margin-right: 8px; /* 添加右边距，与删除图标保持间距 */
}

.conversation-preview {
  font-size: 0.9rem;
  color: #333;
  margin-bottom: 4px;
  word-break: break-all;
}

.conversation-time {
  font-size: 0.8rem;
  color: #666;
}

.conversation-item:hover {
  background-color: #f5f5f5;
}

.delete-icon {
  color: #999;
  cursor: pointer;
  padding: 8px;
  transition: color 0.2s;
  font-size: 0.9rem; /* 调整图标大小 */
}

.delete-icon:hover {
  color: #ff4d4f;
}
</style>
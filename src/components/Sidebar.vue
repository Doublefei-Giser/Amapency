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
        @click="selectConversation(conversation)"
      >
        <div class="conversation-preview">
          {{ getConversationPreview(conversation) }}
        </div>
        <div class="conversation-time">
          {{ formatTime(conversation.timestamp) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

interface Conversation {
  id: string;
  messages: Array<{
    type: 'left' | 'right';
    content: string;
  }>;
  timestamp: number;
}

defineProps<{
  isOpen: boolean;
  conversations: Conversation[];
}>();

const emit = defineEmits<{
  (e: 'select', conversation: Conversation): void;
}>();

const selectConversation = (conversation: Conversation) => {
  emit('select', conversation);
};

const getConversationPreview = (conversation: Conversation) => {
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  return lastMessage ? lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? '...' : '') : '';
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
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
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  transition: left 0.3s ease;
  z-index: 1001; /* 增加 z-index 确保在遮罩层之上 */
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
  padding: 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
}

.conversation-item:hover {
  background-color: #f5f5f5;
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
</style>
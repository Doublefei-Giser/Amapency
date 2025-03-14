<template>
  <div class="chat-footer">
    <div class="new-chat-container">
      <button class="new-chat-btn" @click="handleNewConversation">
        <i class="fa-regular fa-message"></i>
        <span>新建对话</span>
      </button>
      <button class="new-chat-btn" 
        :class="{ 'deep-thinking-active': isDeepThinkingActive }"  
        @click="handleDeepThinking">
        <i class="fa-solid fa-hexagon-nodes"></i>
        <span>深度思考（R1）</span>
      </button>
    </div>
    <div class="input-container">
      <input 
        type="text" 
        class="chat-input" 
        v-model="inputMessage" 
        placeholder="输入消息..."
        @keyup.enter="handleSend"
      >
      <button 
        class="chat-send-btn" 
        :class="{ loading: isLoading }" 
        @click="isLoading ? handleStop() : handleSend()"
        :disabled="!isLoading && !inputMessage.trim()"
      >
        <span v-if="!isLoading">发送</span>
        <i v-else class="fa-regular fa-circle-stop"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  isLoading: boolean;
  isDeepThinkingActive: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'send', message: string): void;
  (e: 'newConversation'): void;
  (e: 'deepThinking'): void;
  (e: 'stopResponse'): void;
}>();

const inputMessage = ref('');

const handleSend = () => {
  if (!inputMessage.value.trim() || props.isLoading) return;
  emit('send', inputMessage.value);
  inputMessage.value = '';
};

const handleNewConversation = () => {
  emit('newConversation');
};

const handleDeepThinking = () => {
  emit('deepThinking');
};

const handleStop = () => {
  emit('stopResponse');
};
</script>

<style scoped>
.chat-footer {
  border-top: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-container {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 6px;
}

.new-chat-container {
  position: relative;
  display: flex;
  gap: 8px;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 1px 4px;
  border: 1px solid #cbcbcb;
  border-radius: 5px;
  background-color: #ffffff;
  color: #000000;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.7rem;
  height: 25px;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.new-chat-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  color: #1773ec;
}

.new-chat-btn i {
  font-size: 0.9rem;
  color: #373737;
}

.new-chat-btn.deep-thinking-active {
  background-color: #1773ec;
  color: #fff;
}

.new-chat-btn.deep-thinking-active i {
  color: #fff;
}

.chat-input {
  background: #ffffff;
  -webkit-appearance: none;
  appearance: none;
  color: #000000;
  flex: 1;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 5px;
  outline: none;
  font-size: 0.9rem;
}

.chat-send-btn {
  padding: 4px 8px;
  border: none;
  background-color: #1773ec;
  color: #fff;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
}

.chat-send-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.chat-send-btn.loading {
  position: relative;
  color: transparent;
}

.chat-send-btn.loading::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(23, 115, 236, 0.8);
  border-radius: 5px;
  z-index: 1;
}
</style>
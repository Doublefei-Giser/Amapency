<template>
  <div class="app">
    <AMapContainer @send-message="handleMapMessage" />
    <ChatPanel 
      ref="chatPanel" 
      :initial-message="initialMessage"
      :panel-height="panelHeight"
      :min-transform="minTransform"
      :max-transform="maxTransform"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
// @ts-ignore 暂时忽略类型检查错误
import AMapContainer from './components/AMapContainer.vue';
import ChatPanel from './components/ChatPanel.vue';

const chatPanel = ref<InstanceType<typeof ChatPanel> | null>(null);
const initialMessage = ref<string>('');

// 面板配置
const panelHeight = ref<number>(70);
const minTransform = ref<number>(0);
const maxTransform = ref<number>(66);

const handleMapMessage = (message: string) => {
  initialMessage.value = message;
};
</script>

<style>
html, body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  box-sizing: border-box;
}

* {
  box-sizing: inherit;
}

.app {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

/* 地图容器样式 */
.map {
  width: 100%;
  height: 96vh;
}

/* 聊天面板样式 */
.panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: white;
  border-radius: 20px 20px 0 0;
  padding: 0 20px 20px 20px;
  box-shadow: 0 -2px 8px rgba(26, 25, 25, 0.1);
  z-index: 1000;
  transform: translateY(0);
  transition: transform 0.2s;
}
</style>

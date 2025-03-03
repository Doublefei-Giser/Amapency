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
  background-color: rgb(255, 255, 255);
  border-radius: 35px 35px 0 0;
  padding: 0 20px 20px 20px;
  box-shadow: 
    0 -4px 6px -1px rgba(0, 0, 0, 0.1),
    0 -2px 4px -1px rgba(0, 0, 0, 0.06),
    0 -10px 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transform: translateY(0);
  transition: transform 0.2s;
  isolation: isolate;
}

/* 高德地图信息窗体样式 */
.info-content img {
  float: left;
  margin: 3px;
}

.amap-info-combo .keyword-input {
  height: auto;
}

.amap-info-content .info-title {
  font-weight: bolder;
  color: #111010;
  font-size: 14px;
  width: 250px;
  line-height: 26px;
  padding: 0 0 0 6px;
}

.amap-info-content .info-content {
  width: 250px;
  padding: 4px;
  color: #000000;
  line-height: 20px;
  font: 12px Helvetica, 'Hiragino Sans GB', 'Microsoft Yahei', '微软雅黑', Arial;
  background-color: #ffffff;
}

.amap-info-content {
  background-color: #ffffff;
  color: #000000;
}
</style>

<template>
  <div v-if="isVisible" class="confirm-dialog-overlay">
    <div class="confirm-dialog">
      <div class="confirm-dialog-header">
        <span>{{ title }}</span>
      </div>
      <div class="confirm-dialog-body">
        {{ message }}
      </div>
      <div class="confirm-dialog-footer">
        <button class="confirm-dialog-btn cancel" @click="onCancel">{{ cancelText }}</button>
        <button class="confirm-dialog-btn confirm" @click="onConfirm">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  isVisible: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    default: '确认'
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: '确定'
  },
  cancelText: {
    type: String,
    default: '取消'
  }
});

const emit = defineEmits(['confirm', 'cancel']);

const onConfirm = () => {
  emit('confirm');
};

const onCancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.confirm-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.confirm-dialog {
  background-color: white;
  border-radius: 8px;
  width: 300px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.confirm-dialog-header {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  font-weight: 500;
  color: #333;
}

.confirm-dialog-body {
  padding: 16px;
  color: #666;
}

.confirm-dialog-footer {
  padding: 12px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #eee;
}

.confirm-dialog-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.confirm-dialog-btn.cancel {
  background-color: #f5f5f5;
  color: #666;
}

.confirm-dialog-btn.cancel:hover {
  background-color: #e8e8e8;
}

.confirm-dialog-btn.confirm {
  background-color: #1773ec;
  color: white;
}

.confirm-dialog-btn.confirm:hover {
  background-color: #1366d6;
}
</style>
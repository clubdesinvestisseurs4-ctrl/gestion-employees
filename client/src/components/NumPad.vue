<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  maxLength: { type: Number, default: 4 },
  masked: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'complete']);

function appendDigit(d) {
  if (props.modelValue.length >= props.maxLength) return;
  const next = props.modelValue + d;
  emit('update:modelValue', next);
  if (next.length === props.maxLength) emit('complete', next);
}

function backspace() {
  emit('update:modelValue', props.modelValue.slice(0, -1));
}

function clear() {
  emit('update:modelValue', '');
}
</script>

<template>
  <div class="numpad">
    <div class="numpad-display">
      <span v-for="i in maxLength" :key="i" class="numpad-cell" :class="{ filled: i <= modelValue.length }">
        {{ i <= modelValue.length ? (masked ? '●' : modelValue[i - 1]) : '' }}
      </span>
    </div>

    <div class="numpad-grid">
      <button v-for="d in [1,2,3,4,5,6,7,8,9]" :key="d" type="button" class="numpad-btn" @click="appendDigit(String(d))">{{ d }}</button>
      <button type="button" class="numpad-btn numpad-btn-action" @click="clear">C</button>
      <button type="button" class="numpad-btn" @click="appendDigit('0')">0</button>
      <button type="button" class="numpad-btn numpad-btn-action" @click="backspace">⌫</button>
    </div>
  </div>
</template>

<style scoped>
.numpad {
  max-width: 320px;
  margin: 0 auto;
}
.numpad-display {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
}
.numpad-cell {
  width: 44px;
  height: 56px;
  border: 2px solid var(--border);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
}
.numpad-cell.filled {
  border-color: var(--color-primary);
  background: #f0f7f2;
}
.numpad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.numpad-btn {
  height: 64px;
  font-size: 24px;
  font-weight: 700;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
}
.numpad-btn:active {
  background: #f0f7f2;
}
.numpad-btn-action {
  font-size: 18px;
  color: var(--text-muted);
}
</style>

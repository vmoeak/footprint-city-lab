<template>
  <section class="fate-card" :style="{ backgroundImage: `url(${bgImage})` }">
    <header class="card-header" :style="{ marginTop: headerMarginTop }">
      <p>{{ subtitle }}</p>
    </header>
    <div class="card-body">
      <slot></slot>
    </div>
    <p class="description" :style="{ width: descWidth }">{{ description }}</p>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    icon: string;
    subtitle: string;
    description: string;
    bgImage: string;
    headerMarginTop?: string;
    descWidth?: string;
  }>(),
  {
    headerMarginTop: '0.7rem',
    descWidth: '6.3rem',
  },
);
</script>

<style lang="less" scoped>
.fate-card {
  width: 7.12rem;
  display: flex;
  flex-direction: column;
  border-radius: 0.2rem;
  background-size: 100% auto;
  background-repeat: no-repeat;
}
.card-header {
  display: flex;
  justify-content: center;
}

.card-header p {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.26rem;
  line-height: 0.5rem;
}

.card-body {
  flex: 1;
}

.description {
  align-self: center;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.26rem;
  line-height: 0.34rem;
  margin-bottom: 0.4rem;
}
</style>

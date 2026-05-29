<template>
  <div>
    <header class="app-header">
      <div class="logo">月度线索数据统计</div>
      <nav>
        <router-link to="/">首页</router-link>
        <router-link to="/history">历史数据</router-link>
        <router-link to="/compare">月度对比</router-link>
      </nav>
      <div class="header-actions">
        <span class="win-ctrl" title="最小化" @click="winMinimize">&#x2014;</span>
        <span class="win-ctrl" title="最大化" @click="winMaximize">&#x25A1;</span>
        <span class="win-ctrl win-ctrl-close" title="关闭" @click="winClose">&#x2715;</span>
      </div>
    </header>
    <router-view />
  </div>
</template>

<script setup lang="ts">
function winMinimize() { window.api.minimizeWindow() }
function winMaximize() { window.api.maximizeWindow() }
function winClose() { window.api.closeWindow() }
</script>

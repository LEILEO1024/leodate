<template>
  <div class="page" style="display:flex;align-items:center;justify-content:center;min-height:70vh">
    <div style="text-align:center">
      <div style="font-size:48px;margin-bottom:12px">📊</div>
      <h2 style="font-size:20px;color:var(--color-text);margin-bottom:24px">月度线索数据统计</h2>
      <button class="btn btn-primary" style="font-size:16px;padding:14px 40px" @click="showModal = true">
        + 新建报告
      </button>
    </div>

    <!-- New Report Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <h3 style="font-size:18px;margin-bottom:20px">新建报告</h3>

        <div class="form-group">
          <label class="form-label">所在地区</label>
          <div style="display:flex;gap:10px">
            <select v-model="selProvince" class="form-input" style="flex:1" @change="selCity = ''">
              <option value="">请选择省份</option>
              <option v-for="p in PROVINCE_DATA" :key="p.name" :value="p.name">{{ p.name }}</option>
            </select>
            <select v-model="selCity" class="form-input" style="flex:1" :disabled="!cities.length">
              <option value="">{{ cities.length ? '请选择城市' : '—' }}</option>
              <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">报告月份</label>
          <div style="display:flex;gap:10px">
            <select v-model="selYear" class="form-input" style="flex:1">
              <option v-for="y in years" :key="y" :value="y">{{ y }} 年</option>
            </select>
            <select v-model="selMonth" class="form-input" style="flex:1">
              <option v-for="m in 12" :key="m" :value="m">{{ m }} 月</option>
            </select>
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px">
          <button class="btn btn-outline" @click="showModal = false">取消</button>
          <button class="btn btn-primary" @click="createReport" :disabled="!canCreate">创建报告</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { PROVINCE_DATA } from '@/data/regions'

const router = useRouter()
const now = new Date()

const showModal = ref(false)
const selProvince = ref('')
const selCity = ref('')
const selYear = ref(now.getFullYear())
const selMonth = ref(now.getMonth() + 1)

const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

const cities = computed(() => {
  const p = PROVINCE_DATA.find(p => p.name === selProvince.value)
  return p ? p.cities : []
})

const canCreate = computed(() => {
  if (!selProvince.value) return false
  if (cities.value.length === 0) return true
  return !!selCity.value
})

function createReport() {
  let region = selProvince.value
  if (selCity.value) region += selCity.value
  router.push(`/report/${selYear.value}/${selMonth.value}?region=${encodeURIComponent(region)}`)
}
</script>

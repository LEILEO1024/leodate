import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue')
    },
    {
      path: '/report/:year/:month',
      name: 'report-edit',
      component: () => import('@/views/ReportEditView.vue'),
      props: (route) => ({
        year: Number(route.params.year),
        month: Number(route.params.month)
      })
    },
    {
      path: '/report/:year/:month/preview',
      name: 'report-preview',
      component: () => import('@/views/ReportPreviewView.vue'),
      props: (route) => ({
        year: Number(route.params.year),
        month: Number(route.params.month)
      })
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/HistoryView.vue')
    },
    {
      path: '/compare',
      name: 'compare',
      component: () => import('@/views/CompareView.vue')
    }
  ]
})

export default router

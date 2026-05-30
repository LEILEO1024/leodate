# 月度线索数据统计 (LeoDate)

一个基于 Electron + Vue 3 的桌面应用，用于月度线索数据录入、统计、分析与报告导出。

## 功能

- **4 步数据录入**：账号运营情况 → 投流情况 → 其他渠道 → 订单数据
- **自动计算**：线索成本、成交率、汇总数据实时自动计算
- **报告预览**：KPI 卡片、渠道占比、趋势图表
- **PDF 导出**：一键导出格式化报告
- **Excel 导入**：批量导入订单数据
- **历史管理**：月度报告历史查看与删除
- **月度对比**：选择两个月份对比核心指标

## 技术栈

| 技术 | 用途 |
|------|------|
| Electron 33 | 桌面应用框架 |
| Vue 3 + TypeScript | 前端 UI |
| electron-vite | 构建工具（三段式构建） |
| Pinia | 状态管理 |
| Vue Router 4 | 页面路由 |
| better-sqlite3 | 本地数据库 |
| Chart.js 4 | 数据图表 |
| electron-builder | 应用打包 |

## 开始使用

### 环境要求

- Node.js 20+
- npm 10+

### 安装

```bash
npm install
```

### 开发

```bash
npm run dev
```

### 纯前端预览

```bash
npm run dev:web
# 浏览器打开 http://localhost:1420
```

### 打包

```bash
npm run build:win    # Windows 安装包
```

产物输出至 `release/` 目录。

## 项目结构

```
LeoDate/
├── electron/                # Electron 主进程
│   ├── main.ts             # 主进程入口
│   ├── preload.ts          # contextBridge 预加载
│   ├── database.ts         # 数据库操作（better-sqlite3）
│   ├── ipc-handlers.ts     # IPC 通信处理
│   └── pdf-generator.ts    # PDF 报告生成
├── src/                    # 前端 Vue 应用
│   ├── main.ts             # Vue 入口
│   ├── App.vue             # 根组件
│   ├── router/             # 路由配置
│   ├── stores/             # Pinia 状态管理
│   ├── services/           # IPC 通信封装
│   ├── views/              # 5 个页面组件
│   ├── components/charts/  # Chart.js 图表组件
│   └── assets/             # 全局样式
├── resources/              # 应用图标
├── electron.vite.config.ts # electron-vite 配置
└── package.json
```

## 许可证

MIT

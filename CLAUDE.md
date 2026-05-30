# 月度线索数据统计 (LeoDate) — 项目配置说明

## 技术栈
- **桌面框架**: Electron 33（跨平台 Win/Mac/Linux）
- **前端**: Vue 3 + TypeScript + Vite 6
- **构建工具**: electron-vite ^5.0（三段式构建：main / preload / renderer）
- **状态管理**: Pinia
- **路由**: Vue Router 4（Hash 模式）
- **数据库**: better-sqlite3（原生 SQLite，同步 API，自动持久化）
- **图表**: Chart.js 4
- **Excel**: xlsx（主进程解析）
- **PDF**: Electron printToPDF
- **打包**: electron-builder（NSIS 安装包 + 便携版）
- **样式**: 纯 CSS Variables，无第三方 UI 库

## 项目结构
```
LeoDate/
├── electron/               # Electron 主进程（Node.js 环境）
│   ├── main.ts            # 窗口创建、生命周期
│   ├── preload.ts         # contextBridge 安全 API 暴露
│   ├── database.ts        # SQLite CRUD 封装（sql.js）
│   ├── ipc-handlers.ts    # IPC 通道处理器
│   └── pdf-generator.ts   # PDF 报告生成
├── src/                    # Vue 渲染进程
│   ├── main.ts            # 应用入口
│   ├── App.vue            # 根组件（多根元素，无包裹 div）
│   ├── env.d.ts           # window.api 类型声明
│   ├── types/index.ts     # 全部 TS 类型定义
│   ├── router/index.ts    # 路由配置
│   ├── stores/            # Pinia Store
│   ├── services/          # IPC 通信封装
│   ├── utils/             # 工具函数
│   ├── data/regions.ts    # 中国省市静态数据
│   ├── views/             # 5 个页面组件
│   ├── components/charts/ # Chart.js 图表组件
│   └── assets/styles/     # 全局 CSS
├── resources/              # 应用图标（.ico）
├── package.json
├── vite.config.ts
├── tsconfig.json / tsconfig.node.json
├── electron-builder.yml
└── index.html
```

## 编码规范

### 数据流
- 渲染进程通过 `ipcService.ts` 调用 `window.api.*` → preload 暴露 → 主进程 `ipc-handlers.ts` 处理
- 所有数据操作走 Pinia Store（`reportStore.ts`），不在组件内直接调 IPC
- Store 中的 `save()` 方法负责数据清洗、排序、自动计算，再调用 IPC

### 自动计算规则
- **保存时计算**（在 Store 的 `save()` 中执行，不在组件中）：
  - 抖音/小红书投流线索成本 = 消耗金额 ÷ 线索数
  - 其他来源线索成本 = 消耗金额 ÷ 线索数
  - 其他来源成交率 = 成交数 ÷ 线索数 × 100
  - 新线索总计 = 所有模块线索数之和
  - 总投流消耗 = 所有模块消耗金额之和
  - 总成交率 = 总订单数 ÷ 总线索数 × 100
- **模板中实时预览**：灰色只读 input 用 `:value` + `disabled` 实时显示计算结果
- **排序**：线索渠道只在点击"下一步"离开步骤2时排序，编辑过程中保持添加顺序

### 样式规范
- CSS Variables 定义在 `:root`（`main.css`），统一管理颜色/圆角/阴影
- 无第三方 UI 库，全部组件手写
- `.page` 必须设置 `flex: 1; overflow-y: auto; min-height: 0;`
- `App.vue` 使用多根元素（Vue 3 Fragment），**不要**用 `<div>` 包裹 header + router-view，否则 flex 布局链会断裂

### 数据库
- 文件路径：`C:\Users\<用户名>\LeoDate\data.db`（Windows）/ `~/LeoDate/data.db`（其他平台）
- 首次运行时自动创建目录和数据库文件
- sql.js 需要在 `vite.config.ts` 中标记为 `external: ['sql.js']`
- 主表 `reports` 的 UNIQUE 约束为 `(region, year, month)`
- 保存时先查是否存在同地区+年月记录，存在则 UPDATE，不存在则 INSERT

### 打包
- 执行 `npm run build:win` 构建并打包 Windows 安装包
- `electron-builder.yml` 中 `signAndEditExecutable: false`（无代码签名证书）
- 输出：`release/月度线索数据统计 Setup x.x.x.exe`（安装包）+ `release/win-unpacked/`（便携版）

## 常用命令
```bash
npm run dev          # 开发模式（Electron + Vite 热更新）
npm run build:win    # 构建 + 打包 Windows 安装包
```

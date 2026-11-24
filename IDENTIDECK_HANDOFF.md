# IdentiDeck（身份卡包）· 项目交接文档 (`IDENTIDECK_HANDOFF.md`)

> **项目目录**：`identideck/`（本仓库根目录）  
> **定位**：原创 MIT 协议、Apple Wallet 拟物质感账号身份与关系图谱 PWA（零密码存储，离线可用，端到端加密同步）

---

## 1. 系统架构与目录总览

```text
Projects/Web/identideck/
├── index.html                        # iOS PWA 安全区 meta + 防深色闪烁脚本 + Inter/JetBrains Mono/Noto Sans SC
├── netlify.toml                      # SPA 重写规则 + sw.js/manifest 缓存控制 + 安全响应头
├── vite.config.ts                    # Vite 6 + Tailwind v4 + vite-plugin-pwa (Workbox 离线缓存)
├── public/
│   ├── icons/                        # icon.svg / icon-192.png / icon-512.png / apple-touch-icon.png
│   ├── bank-logos/                   # 52 家银行本地 128×128 App Store 官方高清 WebP Logo（离线零 404）
│   ├── bank-cards/                   # 46 张银行真实实体卡面 520×328 高清 WebP 卡图（Apple Wallet 满版呈现）
│   └── identity-logos/               # 21 家邮箱(10)与 SIM 运营商(11)本地 128×128 App Store 官方高清 WebP Logo
└── src/
    ├── types/vault.ts                # 核心数据模型 + ZeroPasswordPolicyError 运行时禁存密码守卫
    ├── data/
    │   ├── serviceCatalog.ts         # 154 个三栖服务库（马来西亚本地 / AI开发 / 国际 / 中文生态）+ 自定义域名识别
    │   ├── brandIcons.ts             # 73 个本地官方高清 Logo（52 银行 + 10 邮箱 + 11 SIM）+ 92+ simple-icons SVG + 域名全彩源
    │   ├── bankCatalog.ts            # 52 家真实银行与数字银行预设（30 家大马含全部 5 家 BNM 数字银行 + 13 家国际/新加坡 + 9 家中国主流银行）
    │   ├── bankCardSkins.ts          # 52 张 1:1 真实实体银行卡面（46 真实卡图 + 52 专属配色/缺口/彩边）+ 11 家实体运营商 SIM 卡面引擎
    │   └── demoSeed.ts               # 首次打开示例数据（2 邮箱卡 + 1 Maxis 5G SIM 卡 + 2 张 1:1 实体银行卡 + 10 绑定）
    ├── db/storage.ts                 # IndexedDB (`idb`) 异步持久化 + localStorage 自动降级 + 拉取前本地快照
    ├── crypto/vaultCrypto.ts         # Web Crypto API: PBKDF2-SHA256 (250k) + AES-256-GCM 认证加解密 + 口令强度评估
    ├── sync/gistSync.ts              # GitHub Private Gist / Gitee Private Gist 双向加密同步 + 时间戳冲突检测
    ├── utils/mask.ts & renewal.ts    # 隐私模式智能脱敏 + 续费相对倒计时、年化支出与按银行卡分账汇总
    ├── i18n/translations.ts          # 简体中文 (`zh`) / 英文 (`en`) 完整双语字典与 `useT()` Hook
    ├── store/useVaultStore.ts        # Zustand 全局状态（CRUD / 银行卡双链路扣款 / 拖拽重排 / 6秒撤销栈 / 防重守卫 / 迁移统计 / 同步）
    ├── components/
    │   ├── TopBar.tsx                # 液态玻璃浮岛顶栏 + 右上角设置齿轮菜单 + 隐私切换图标微动效 + iPhone 底部悬浮导航栏
    │   ├── MotionPrimitives.tsx      # GPU 通用微动效原语（`AnimatedNumber` 数字递增、`ScrambleText` 隐私解码、`MagneticButtonWrapper` 磁吸按钮、`usePrefersReducedMotion`）
    │   ├── ServiceBadge.tsx          # 统一真实官方 Logo 徽标（`ServiceBadge` + 全站通用 `IdentityLogoBadge`）
    │   ├── BankCardArtwork.tsx       # 52 家银行专属 1:1 实体卡矢量花纹层（Maybank MAE、GXBank 紫红边黑卡、CIMB 棱面、Wise 盲文缺口等）
    │   ├── SimCardArtwork.tsx        # 11 家运营商 1:1 实体三合一 5G USIM 塑料卡面层（含 Standard/Micro/Nano 冲切凹槽与各家品牌丝印/珍珠白PVC卡体）
    │   ├── IdentityCardVisual.tsx    # 1:1 真实实体银行卡（满版卡图+3D倾斜+高光+防遮挡底栏）+ 1:1 三合一实体运营商 SIM 卡（含公开 ICCID 前缀）+ 真实邮箱卡
    │   ├── WalletDeck.tsx            # 卡包分类筛选与横向滑动 + @dnd-kit 拖拽重排 + 动态环境氛围光 + 续费倒计时进度条
    │   ├── IdentityEditorModal.tsx   # 新增/编辑身份卡（52 银行含独立「数字银行」Tab + 10 邮箱 + 11 SIM 全真实 Logo 选卡器与实时预览）
    │   ├── QuickPickModal.tsx        # 154 服务点选批量绑定 + 扣款银行卡关联 + 重复绑定防买错提醒
    │   ├── SubscriptionOverviewModal.tsx # 订阅支出与续费总览（月/年支出、按银行卡分布占比条、近期扣款倒计时）
    │   ├── RelationshipGraph.tsx     # 双链路关系图谱（真实官方 Logo 节点 + 登录银色曲线 + 银行扣款金绿曲线 + 链路切换与分类筛选）
    │   ├── MigrationDrawer.tsx       # 换号/换卡/挂失解绑 Checklist 抽屉 + 进度环 + 一键复制 Markdown
    │   ├── SyncBackupModal.tsx       # 云端加密 Gist 同步中心 + 本地明文/加密 JSON 导入导出 + 数据重置
    │   ├── CommandSearchModal.tsx    # Cmd/Ctrl + K 全局极速反查弹窗（支持 App / 邮箱 / 手机 / 银行 / 卡尾号）
    │   └── UndoToast.tsx             # 6 秒倒计时撤销删除悬浮提示条
    ├── App.tsx & main.tsx            # 应用主壳、IndexedDB 水合、全局快捷键、PWA Service Worker 注册
    └── __tests__/vault.test.ts       # Vitest 34 项全量单元测试（加解密/零密码禁存/73 官方Logo磁盘校验/46 实体卡图/双链路计费/续费倒计时/微动效与减少动态降级）
```

---

## 2. 关键工程决策与安全边界

1. **严格零密码边界（Zero-Password Policy）**：
   - 任何写入 Store、导出 JSON 或加密上传的数据均经过 `assertNoForbiddenSecretFields` 校验，拒绝 `password / pin / secret / mnemonic / cvv` 等字段。
   - E2EE 同步口令仅保留在 `SyncBackupModal` 内存 state 中，页面刷新即释放，不落盘不上传。
2. **端到端加密规范（`identideck-e2ee-v1`）**：
   - 随机 16-byte `salt` + `PBKDF2-SHA256`（`250,000` iterations）派生 `AES-GCM-256` 密钥 + 随机 12-byte `IV`。
   - 同步文件名固定为私有 Gist 内的 `identideck-vault.enc.json`；拉取前通过 `savePrePullSnapshot` 留存本地快照，双向同步内置时间戳冲突检测。
3. **跨视图交互与快捷键**：
   - `Cmd/Ctrl + K` 全局唤醒 Spotlight 搜索；`Escape` 逐层关闭弹窗/抽屉或取消图谱聚焦。
   - 搜索结果支持「回车跳转卡包」或点击右侧图谱图标「直接隔离聚焦该身份或 App 链路」。
4. **视觉与无障碍规范**：
   - Tailwind CSS v4 配置 `@custom-variant dark (&:where(.dark, .dark *));`，严禁廉价 AI 紫粉渐变与原生 Emoji 充当 UI 图标。
   - 完整适配 **桌面端 (`1440×900`)** 与 **iPhone 17 Pro Max (`430×932`)** 安全区，支持 `prefers-reduced-motion`。

---

## 3. 常用开发、验证与部署命令

```powershell
# 在仓库根目录执行
npm run dev         # 启动本地热更新开发服务
npm run typecheck   # TypeScript 严格类型校验 (tsc --noEmit)
npm run test        # 运行 Vitest 全量单元测试
npm run build       # 构建生产包 + 生成 dist/sw.js 与 dist/manifest.webmanifest
npm run preview     # 启动生产包本地预览 (http://localhost:4173)
```

### 部署至 Netlify（免费 HTTPS 供 iPhone PWA 安装）
- 项目根目录已预置 `netlify.toml`（`publish = "dist"`、SPA 回退、PWA 缓存头）。
- 可通过 Netlify CLI 一键部署：`npx netlify-cli deploy --prod --dir=dist`，或将 `dist/` 文件夹直接拖入 [Netlify Drop](https://app.netlify.com/drop)。

---

## 4. iPhone 17 Pro Max 真机 PWA 安装指引

1. 在 iPhone Safari 打开已部署的 `https://*.netlify.app` 链接。
2. 点击底部 **分享** → **添加到主屏幕** → **添加**。
3. 打开主屏幕 **IdentiDeck** 图标即可享受全屏离线体验；在顶栏打开「加密同步」，粘贴 GitHub `gist` Token 与本地加密口令，即可在手机与电脑间安全双向同步。

---

## 5. 后续可扩展方向

- 如需上架 App Store，可直接接入 **Capacitor** 包装现有 `dist/`，无需重写业务逻辑。
- 可按需在 `src/data/serviceCatalog.ts` 中追加更多马来西亚/本地小众服务，图标与检索别名会自动同步至点选弹窗、关系图谱与 `Cmd+K` 搜索。

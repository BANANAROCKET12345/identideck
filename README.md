# IdentiDeck（身份卡包）

> **Apple Wallet 极简拟物账号身份与关系图谱 PWA** · 零密码存储 · 离线可用 · 端到端 `AES-256-GCM` 私有 Gist 同步  
> **Apple-Wallet-style Account Identity & Relationship Graph PWA** · Zero Passwords Stored · Local-First Offline PWA · End-to-End Encrypted GitHub/Gitee Gist Sync

---

## 核心解决什么痛点？ / What Problem Does It Solve?

传统密码管理器帮你存密码，但很难 1 秒回答这三个高频问题：
1. **「我的某个邮箱 / 马来西亚 `+60` 手机号到底注册了哪些 App？」**
2. **「这个 App 当初是邮箱直注，还是 `Sign in with Google` / `Apple ID` 授权登录？」**
3. **「ChatGPT Plus / Claude Pro / Spotify 到底绑在哪张银行卡自动扣款？换卡/挂失时有哪些订阅必须改绑？」**

**IdentiDeck** 专注记录「**身份（邮箱 / SIM 卡） ↔ 扣款银行卡 ↔ App 服务 ↔ OAuth 登录链路 ↔ 付费订阅**」的清晰双链路图谱，在类型层与运行时严格禁止保存任何密码、完整卡号或 CVV/PIN（Zero-Password & Zero-Card-Secret Policy）。

---

## 核心亮点 / Key Features

- **1:1 真实实体卡片与官方高清 Logo 体系**：
  - **52 家银行 & 数字银行**（覆盖马来西亚 30 家含全部 5 家 BNM 持牌数字银行 `GXBank / AEON Bank / Boost Bank / Ryt Bank / KAF Digital Bank` + 13 家国际/新加坡银行 + 9 家中国主流银行），内置 **52 个本地 128×128 App Store 官方高清 Logo** 与 **46 张真实实体银行卡面**，支持 3D 倾斜反光、Wise/KAF/Bank Rakyat 盲文缺口、GXBank 紫红彩边与隐私防遮挡底栏。
  - **11 家实体三合一 5G USIM 手机卡**（Maxis、Hotlink、CelcomDigi、U Mobile、Unifi、Yes 5G、Tune Talk、Singtel、中国移动、中国联通、中国电信）：1:1 还原实体 PVC 卡体（含珍珠白卡体与品牌丝印）、三合一冲切凹槽、金色 ISO-7816 芯片、公开 ICCID 前缀与官方高清运营商 Logo。
  - **10 家主流邮箱官方 Logo**（Gmail、iCloud、Outlook、Proton、QQ 邮箱、163 邮箱、Yahoo、Zoho、Fastmail、Tuta），支持邮箱域名智能识别、拖拽重排（`@dnd-kit`）与 6 秒撤销删除恢复栈。
- **双链路实时关系图谱 (`RelationshipGraph`)**：左列邮箱 / SIM / 银行卡 ↔ 右列绑定服务，同步绘制「登录身份链路」与「银行卡自动扣款链路」光滑三次贝塞尔曲线；支持按「全部 / 登录身份 / 银行扣款」与分类筛选，点击任意节点瞬间隔离高亮完整链路。
- **154 个内置精选服务库 + 订阅雷达**：完整覆盖 **马来西亚本地**（TNG eWallet、Grab、Maybank MAE、CIMB OCTO、GXBank、Shopee MY、Boost、Setel、Maxis、CelcomDigi 等）、**AI 与开发**（ChatGPT、Claude、Gemini、GitHub、Cursor、Vercel、Netlify、Cloudflare 等）、**效率云服务**、**国际与中文生态**；内置月/年化多币种支出总览、按银行卡分账占比条与续费倒计时进度条。
- **防买错重复绑定守卫 & 换号/换卡迁移清单 (`MigrationDrawer`)**：点选绑定时实时提示其他身份上已开通的同类付费会员；换号、挂失或换银行卡时一键生成交互式解绑/改绑进度环清单并支持复制 Markdown。
- **极速 Spotlight 搜索 (`Cmd/Ctrl + K`)**：1 秒反查 App、邮箱、手机号、银行卡及尾号，支持回车跳转卡包或一键聚焦关系图。
- **一键隐私打码 + 圆形扩散深浅色切换 + 右上角快捷设置 + 中英双语**：基于 `View Transitions API` 的平滑主题切换（遵循 `prefers-reduced-motion`）；完整适配桌面端与 **iPhone 17 Pro Max (`430×932`)** 安全区。
- **零信任端到端加密同步**：本地 `IndexedDB` 优先存储 + Workbox 全量本地 Logo/卡图离线缓存；浏览器原生 `Web Crypto API` 执行随机 16-byte Salt + `PBKDF2-SHA256`（250,000 次迭代）+ 随机 12-byte IV + `AES-256-GCM` 认证加密，直连同步至个人 **GitHub Private Gist** 或 **Gitee Private Gist**，并支持明文 / `.identideck.json` 加密本地备份导入导出。

---

## 技术栈 / Tech Stack

| 层级 | 选型 |
| :--- | :--- |
| 前端框架 | React 19 + TypeScript (Strict) + Vite 6 |
| 样式与动效 | Tailwind CSS v4 (`@tailwindcss/vite`) + Framer Motion + `lucide-react` |
| 状态与离线存储 | Zustand + `idb` (IndexedDB, 自动降级 `localStorage`) + `vite-plugin-pwa` (Workbox) |
| 拖拽交互 | `@dnd-kit/core` + `@dnd-kit/sortable` |
| 加密与同步 | Native Web Crypto API (`PBKDF2-SHA256` + `AES-256-GCM`) + GitHub/Gitee Gist REST API |
| 测试与部署 | Vitest + Testing Library + Netlify (`netlify.toml` SPA & PWA 标头预置) |

---

## 本地开发与校验 / Local Development

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发服务器
npm run dev

# 3. 严格类型检查 + 单元测试 + 生产构建（含 Service Worker & Manifest）
npm run typecheck
npm run test
npm run build

# 4. 本地预览生产 PWA 构建
npm run preview
```

---

## iPhone 17 Pro Max 安装原生全屏 PWA / Install on iPhone

1. 使用 **iPhone Safari** 打开部署后的 HTTPS 网址（例如 Netlify 站点链接）。
2. 点击底部工具栏 **「分享 (Share)」** 图标。
3. 向下滑动并点击 **「添加到主屏幕 (Add to Home Screen)」** → **「添加 (Add)」**。
4. 从桌面启动 **IdentiDeck**：全屏无浏览器地址栏（`display: standalone` + `viewport-fit=cover` 安全区适配），无网状态下依然毫秒级打开本地卡包。

---

## 零密码安全边界 / Zero-Password Security Model

- `src/types/vault.ts` 在运行时强制拦截 `password`、`passcode`、`pin`、`secret`、`private_key`、`cvv`、`seed_phrase`、`mnemonic` 等 20+ 敏感字段，发现即抛出 `ZeroPasswordPolicyError`。
- 端到端加密口令仅驻留于内存 React 状态中，**永不写入 `localStorage` / `IndexedDB` 或上传云端**。
- 所有网络请求仅在用户主动点击同步时直连 `api.github.com` 或 `gitee.com`，无任何第三方后端服务器中转。

## License

MIT — 100% original codebase, free for personal use and portfolio showcase.

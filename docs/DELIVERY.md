# roomAI 栖间 Demo 交付说明

项目目录：D:\code\Github\roomAI

访问地址：http://localhost:3100
API 文档：http://localhost:8010/docs

已生成三张原型，按其视觉实现工作台、编辑器和客户页；支持 2D 户型编辑、上传、产品选择、预置演示生成、方案版本、只读分享、客户预约及 PDF/SVG 导出。复用 Roomsmith 的 MIT 房间几何与绘图模块。默认不调用付费模型，真实生成需在服务器 .env 配置云端模型。

## Python 文件变化

| 文件 | 新建/参考方式 | 作用 |
|---|---|---|
| backend/app/__init__.py | 新建 | 后端包入口 |
| backend/app/main.py | 新建 | 项目、上传、生成、分享、客户咨询、PDF API |
| backend/app/db.py | 新建 | PostgreSQL/SQLite 持久化 |
| backend/app/catalog.py | 新建 | 示例品牌产品、风格与项目数据 |
| backend/app/geometry.py | 新建 | 复用 Roomsmith 几何模型，校验布局、导出平面图和模型参考图 |
| backend/app/storage.py | 新建 | MinIO/S3 与本地文件存储 |
| backend/app/providers.py | 新建 | 云端图像 API 适配及多参考图组装 |
| backend/app/jobs.py | 新建 | 异步生成和版本写回 |
| backend/app/worker.py | 新建 | Redis/RQ Worker 入口 |
| backend/app/vendor/__init__.py | 新建 | 第三方模块包声明 |
| backend/app/vendor/room.py | 从 Roomsmith 原样复制 | 房间、墙体、门窗、面积等几何结构 |
| backend/app/vendor/drawings.py | 从 Roomsmith 原样复制 | 尺寸图 SVG 绘制 |

## 启动与复查命令

启动全部服务（目前已运行）：

~~~powershell
cd D:\code\Github\roomAI
docker compose up -d --build
~~~

执行 19 项演示集成检查：

~~~powershell
pwsh -File .\scripts\smoke.ps1
~~~

停止本项目服务并保留持久化数据：

~~~powershell
docker compose down
~~~

## 验证与限制

生产构建、TypeScript 和 19 项 API/队列/存储集成检查通过。应用内浏览器已打开窄屏页面。桌面浏览器检查被自动安全检查停止，原因是无法可靠识别该窗口网址。未执行真实付费云端生成，也未部署到公网。详细记录见 docs/VERIFICATION.md。

## 全部源码与素材文件

以下路径相对于项目目录；运行时依赖、构建缓存不计入交付文件。另有本机 .env，内容由 .env.example 复制，未打入源码包。
- .dockerignore
- .env.example
- .gitignore
- backend\app\__init__.py
- backend\app\catalog.py
- backend\app\db.py
- backend\app\geometry.py
- backend\app\jobs.py
- backend\app\main.py
- backend\app\providers.py
- backend\app\storage.py
- backend\app\vendor\__init__.py
- backend\app\vendor\drawings.py
- backend\app\vendor\room.py
- backend\app\vendor\ROOMSMITH-LICENSE
- backend\app\worker.py
- backend\Dockerfile
- backend\requirements.txt
- compose.yaml
- docs\DESIGN.md
- docs\IMAGE-PROMPTS.md
- docs\prototypes\01-dashboard.png
- docs\prototypes\02-editor.png
- docs\prototypes\03-client-proposal.png
- docs\TECHNICAL-SPEC.md
- docs\VERIFICATION.md
- README.md
- scripts\smoke.ps1
- web\app\globals.css
- web\app\layout.tsx
- web\app\page.tsx
- web\app\products\page.tsx
- web\app\projects\[id]\page.tsx
- web\app\projects\page.tsx
- web\app\share\[token]\page.tsx
- web\components\dashboard.tsx
- web\components\editor.tsx
- web\components\floor-plan.tsx
- web\components\proposal.tsx
- web\components\ui.tsx
- web\Dockerfile
- web\lib\api.ts
- web\next-env.d.ts
- web\next.config.mjs
- web\package-lock.json
- web\package.json
- web\public\assets\bedroom.png
- web\public\assets\cabinet.png
- web\public\assets\living.png
- web\public\assets\sofa.png
- web\public\assets\study.jpg
- web\public\assets\table.png
- web\public\assets\vintage.jpg
- web\tsconfig.json


- docs\DELIVERY.md


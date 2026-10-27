# roomAI 栖间

基于 Roomsmith 几何模块构建的中文可视化家装方案 Demo。界面先由内置 ImageGen 生成三张原型，再按原型实现。支持工作台、2D 户型、照片上传、产品搭配、方案版本、云端图像生成适配、客户分享和预约、PDF 导出。

## 启动

在本目录打开 PowerShell，复制配置并启动：

~~~powershell
Copy-Item .env.example .env
docker compose up -d --build
~~~

浏览器打开 http://localhost:3100 。API 文档为 http://localhost:8010/docs 。默认免费预置演示，无需模型密钥，无需 Claude Code。后台使用 PostgreSQL、Redis、MinIO；容器重启保留数据。

停止服务：

~~~powershell
docker compose down
~~~

查看生成任务日志：

~~~powershell
docker compose logs --tail 100 api worker
~~~

## 使用流程

1. 工作台选择示例项目，或创建新项目。
2. “空间资料”上传照片并填写客户需求；“户型与产品”调整尺寸与门窗、拖拽家具，确认尺寸。
3. “设计方案”挑选产品与风格，确认生成方式。预置演示使用固定示例图，不会重绘当前房间。
4. 保存后导出 PDF，或生成 7 天有效的只读分享链接；客户可提交咨询，链接可撤销。

Demo 以匿名会话 Cookie 隔离项目。清除 Cookie 或更换浏览器会进入新的演示空间；客户分享链接可跨浏览器打开。正式商用前需增加账号、企业隔离、账户级配额、数据迁移与备份，不应把匿名会话当作正式账号系统。

## 云端模型

修改服务器 .env 的 MODEL_PROVIDER、MODEL_BASE_URL、MODEL_API_KEY、IMAGE_MODEL 和 ENABLE_LIVE_GENERATION。

- openai：兼容 /images/edits 的 multipart 图像编辑接口，发送空间参考、几何参考和选定产品照片。
- openrouter：/chat/completions 图像输出协议，发送图像参考并读取 message.images。所选模型必须支持图片输入和输出。

IMAGE_MODEL 需按供应商当前可用型号填写。Demo 不代选模型、不产生隐式付费请求。TEXT_MODEL 为独立方案文案模型预留，当前方案文字为可编辑需求和预置风格说明。

图像编辑协议参考 OpenAI Docs：https://developers.openai.com/api/reference/resources/images/methods/edit 。模型须支持多参考图输入。真实云端调用需使用自己的服务端密钥，本次交付不包含付费生成结果。

修改配置后重建 API 与 Worker：

~~~powershell
docker compose up -d --build api worker
~~~

估算费用用于生成前确认与额度预留，实际账单取决于服务商；应同时在服务商控制台设置消费限额。云端图像可能与原房间/真实产品存在视觉偏差，需人工审阅。

## 开发环境

Python 3.11+、Node 22+。在 backend 下创建虚拟环境并安装 requirements.txt 后启动 API：

~~~sh
python -m uvicorn app.main:app --port 8010
~~~

在 web 下安装依赖并启动：

~~~sh
npm ci
npm run dev -- --port 3100
~~~

未设置 DATABASE_URL、REDIS_URL、STORAGE_BACKEND 时，使用本地 SQLite、FastAPI 后台任务和本地文件存储。前端开发默认后端地址为 http://127.0.0.1:8010 。

## 目录

- web/：Next.js、TypeScript、SVG 户型编辑器。
- backend/app/：FastAPI、数据存储、图像模型适配、异步任务和 PDF。
- backend/app/vendor/：Roomsmith 的 room.py 与 drawings.py，保留原 MIT 许可证。
- docs/prototypes/：三张原型图。
- docs/DESIGN.md：视觉分析与实现约定。
- docs/TECHNICAL-SPEC.md：讨论阶段技术方案；实际交付范围见本 README。
- docs/IMAGE-PROMPTS.md：原型和图像素材的提示词。

## 当前边界

产品与价格为示例数据，图片由 ImageGen 生成；书房及中古参考图来自 Roomsmith 的 MIT 仓库。户型支持矩形与固定比例 L 形、门窗添加/移除、家具拖拽与 90° 旋转；几何校验涵盖边界与碰撞，不替代完整建筑规范检查。PDF 为设计沟通报告，不是施工图。

当前没有企业工作区、员工权限、支付、库存和实时多人协作。compose.yaml 用于可复现本地/单机 Demo；正式发布建议采用托管数据库、对象存储及 HTTPS 入口。

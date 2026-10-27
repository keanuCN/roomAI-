# 验证记录

日期：2026-10-27

## 已通过

- Next.js 生产构建与 TypeScript 类型检查；Docker 内的前端构建也通过。
- Docker Compose 配置解析；web、api、worker、postgres、redis、minio 均已启动。
- scripts/smoke.ps1 的 19 项集成检查：健康状态、匿名示例初始化、产品目录、跨会话项目隔离、未确认尺寸阻止生成、尺寸保存、家具越界、上传至 MinIO、上传照片鉴权、跨会话照片隔离、请求幂等、Redis/Worker、方案版本保存、只读分享、咨询提交、所有者读取咨询、中文 PDF、Roomsmith SVG、分享撤销。
- 在应用内浏览器实际打开窄屏工作台、客厅编辑页和 2D 户型视图，页面可操作、图片可显示。

## 检查范围限制

- 原计划进一步检查桌面 Chrome 界面；Computer Use 因无法可靠识别窗口当前网址而自动停止。停止后未继续该浏览器操作，未完成桌面截图对照。
- 云端图像适配层已实现，未配置真实模型密钥，未执行付费模型请求。
- 尚未部署公网域名、HTTPS 或完整企业账号体系。
- PDF 的内容类型与服务端生成流程已验证；未执行逐页视觉审校。

## 复查

在项目根目录使用 PowerShell 7：

~~~powershell
pwsh -File .\scripts\smoke.ps1
~~~

该脚本只创建临时测试项目，完成后删除自己创建的测试项目；不会删除其他项目。默认目标 http://localhost:3100 。可用 BaseUrl 参数指定其他测试环境。

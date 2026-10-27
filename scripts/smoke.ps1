param([string]$BaseUrl = 'http://localhost:3100')
$ErrorActionPreference = 'Stop'
$roomSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$testProject = $null
$checks = [System.Collections.Generic.List[string]]::new()
function JsonBody($value) { return ($value | ConvertTo-Json -Depth 30 -Compress) }
function Assert-Check([bool]$condition, [string]$name) {
    if (-not $condition) { throw "未通过：$name" }
    $checks.Add($name)
}
function Expect-Status([scriptblock]$action, [int]$status, [string]$name) {
    $actual = 0
    try { & $action | Out-Null } catch { $actual = [int]$_.Exception.Response.StatusCode }
    Assert-Check ($actual -eq $status) $name
}
try {
    $health = Invoke-RestMethod "$BaseUrl/api/health" -WebSession $roomSession
    Assert-Check ($health.status -eq 'ok') 'API 健康检查'
    $projects = Invoke-RestMethod "$BaseUrl/api/projects" -WebSession $roomSession
    Assert-Check ($projects.Count -ge 3) '匿名会话初始化示例项目'
    $products = Invoke-RestMethod "$BaseUrl/api/products" -WebSession $roomSession
    Assert-Check ($products.Count -eq 4) '产品目录与数据'
    $testProject = Invoke-RestMethod "$BaseUrl/api/projects" -Method Post -ContentType 'application/json' -Body (JsonBody @{title='集成验证 · 临时空间';width=5.6;length=5;room_type='客厅'}) -WebSession $roomSession
    $id = $testProject.id
    $otherSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    Expect-Status { Invoke-RestMethod "$BaseUrl/api/projects/$id" -WebSession $otherSession } 404 '跨会话项目隔离'
    $renderBody = @{style='natural';mode='demo';confirm_cost=$true;request_id=[guid]::NewGuid().ToString()}
    Expect-Status { Invoke-RestMethod "$BaseUrl/api/projects/$id/renders" -Method Post -ContentType 'application/json' -Body (JsonBody $renderBody) -WebSession $roomSession } 400 '未确认尺寸时阻止生成'
    $testProject.room.confirmed = $true
    $testProject = Invoke-RestMethod "$BaseUrl/api/projects/$id" -Method Put -ContentType 'application/json' -Body (JsonBody $testProject) -WebSession $roomSession
    Assert-Check $testProject.room.confirmed '保存房间尺寸与确认状态'
    $invalid = JsonBody $testProject | ConvertFrom-Json
    $invalid.room.furniture = @(@{id='invalid';product_id='sofa';x=5;y=4;rotation=0})
    Expect-Status { Invoke-RestMethod "$BaseUrl/api/projects/$id" -Method Put -ContentType 'application/json' -Body (JsonBody $invalid) -WebSession $roomSession } 422 '家具越界校验'
    $picture = Get-Item -LiteralPath (Join-Path $PSScriptRoot '..\web\public\assets\living.png')
    $uploaded = Invoke-RestMethod "$BaseUrl/api/projects/$id/upload" -Method Post -Form @{file=$picture} -WebSession $roomSession
    Assert-Check ($uploaded.original.StartsWith('/files/')) '照片上传至对象存储'
    $privateImage = Invoke-WebRequest ($BaseUrl+$uploaded.original) -WebSession $roomSession
    Assert-Check ($privateImage.StatusCode -eq 200) '上传照片鉴权读取'
    Expect-Status { Invoke-WebRequest ($BaseUrl+$uploaded.original) -WebSession $otherSession } 404 '跨会话照片隔离'
    $job = Invoke-RestMethod "$BaseUrl/api/projects/$id/renders" -Method Post -ContentType 'application/json' -Body (JsonBody $renderBody) -WebSession $roomSession
    $same = Invoke-RestMethod "$BaseUrl/api/projects/$id/renders" -Method Post -ContentType 'application/json' -Body (JsonBody $renderBody) -WebSession $roomSession
    Assert-Check ($job.id -eq $same.id) '生成请求幂等'
    for ($i=0; $i -lt 40; $i++) {
        $job = Invoke-RestMethod "$BaseUrl/api/render-jobs/$($job.id)" -WebSession $roomSession
        if ($job.status -in @('completed','failed')) { break }
        Start-Sleep -Milliseconds 250
    }
    Assert-Check ($job.status -eq 'completed') 'Redis 与 Worker 完成演示任务'
    $project = Invoke-RestMethod "$BaseUrl/api/projects/$id" -WebSession $roomSession
    Assert-Check ($project.versions.Count -eq 1) '设计版本持久化'
    $share = Invoke-RestMethod "$BaseUrl/api/projects/$id/share-links" -Method Post -ContentType 'application/json' -Body '{"days":1}' -WebSession $roomSession
    $public = Invoke-RestMethod "$BaseUrl/api/share/$($share.token)" -WebSession $otherSession
    Assert-Check ($public.title -eq $project.title) '跨会话只读分享'
    $lead = Invoke-RestMethod "$BaseUrl/api/share/$($share.token)/leads" -Method Post -ContentType 'application/json' -Body (JsonBody @{name='演示访客';contact='demo@example.test';message='自动化集成验证';consent=$true}) -WebSession $otherSession
    Assert-Check $lead.ok '客户咨询提交'
    $leads = @(Invoke-RestMethod "$BaseUrl/api/projects/$id/leads" -WebSession $roomSession)
    Assert-Check ($leads.Count -eq 1) '项目所有者查看咨询'
    $pdf = Invoke-WebRequest "$BaseUrl/api/projects/$id/report" -WebSession $roomSession
    Assert-Check (($pdf.Headers['Content-Type'] -join ',') -match 'application/pdf') '中文 PDF 导出'
    $plan = Invoke-WebRequest "$BaseUrl/api/projects/$id/plan" -WebSession $roomSession
    Assert-Check (($plan.Headers['Content-Type'] -join ',') -match 'image/svg') 'Roomsmith 尺寸图导出'
    Invoke-RestMethod "$BaseUrl/api/share/$($share.token)" -Method Delete -WebSession $roomSession | Out-Null
    Expect-Status { Invoke-RestMethod "$BaseUrl/api/share/$($share.token)" -WebSession $otherSession } 404 '撤销分享立即失效'
    Write-Output ("通过 "+$checks.Count+" 项集成检查。")
    $checks | ForEach-Object { Write-Output ("[通过] "+$_) }
} finally {
    if ($testProject) {
        Invoke-RestMethod "$BaseUrl/api/projects/$($testProject.id)" -Method Delete -WebSession $roomSession | Out-Null
    }
}

[CmdletBinding()]
param(
    [string]$TaskName = 'Codex Reset Radar AI Review'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$reviewerScript = Join-Path $PSScriptRoot 'Invoke-CodexResetReview.ps1'
if (-not (Test-Path -LiteralPath $reviewerScript)) {
    throw "未找到复核脚本：$reviewerScript"
}

$pwshPath = (Get-Command pwsh.exe -ErrorAction Stop).Source
$escapedScript = $reviewerScript.Replace('"', '""')
$action = New-ScheduledTaskAction -Execute $pwshPath -Argument "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$escapedScript`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 15)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 14)
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "已注册 Windows 定时任务：$TaskName（每 15 分钟）"

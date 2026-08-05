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
$trigger = New-ScheduledTaskTrigger -Daily -At '00:00'
$trigger.Repetition.Interval = 'PT15M'
$trigger.Repetition.Duration = 'P1D'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "已注册 Windows 定时任务：$TaskName（每 15 分钟）"

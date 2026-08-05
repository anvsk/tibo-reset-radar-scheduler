[CmdletBinding()]
param(
    [string]$SiteUrl = 'https://tibo-reset-radar-anvsk.anvskyi.chatgpt.site',
    [SecureString]$ReviewKey,
    [string]$ConfigPath = (Join-Path $env:LOCALAPPDATA 'CodexResetRadar\reviewer-config.json')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $ReviewKey) {
    $ReviewKey = Read-Host '请输入站点 AI_REVIEW_KEY' -AsSecureString
}

$normalizedSiteUrl = $SiteUrl.TrimEnd('/')
if (-not [Uri]::IsWellFormedUriString($normalizedSiteUrl, [UriKind]::Absolute)) {
    throw 'SiteUrl 必须是有效的绝对 URL。'
}

$configDirectory = Split-Path -Parent $ConfigPath
New-Item -ItemType Directory -Path $configDirectory -Force | Out-Null
$config = [ordered]@{
    siteUrl = $normalizedSiteUrl
    encryptedReviewKey = ConvertFrom-SecureString -SecureString $ReviewKey
}
$config | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $ConfigPath -Encoding utf8

Write-Host "本机复核配置已保存：$ConfigPath"
Write-Host '密钥由 Windows DPAPI 绑定到当前用户，未写入 Git 仓库。'

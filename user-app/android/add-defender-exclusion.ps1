# 以管理员身份运行此脚本，为 Android 构建目录添加 Windows Defender 排除项
# 右键 -> 使用 PowerShell 运行，或在“以管理员身份运行”的 PowerShell 中执行：
#   Set-Location "D:\ModyByCursor\user-app\android"; .\add-defender-exclusion.ps1

$path = "D:\ModyByCursor\user-app\android"
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "需要管理员权限。请右键 PowerShell 选择“以管理员身份运行”，再执行此脚本。" -ForegroundColor Yellow
    exit 1
}
Add-MpPreference -ExclusionPath $path
Write-Host "已添加排除路径: $path" -ForegroundColor Green

@echo off
chcp 65001 >nul
:: 请求管理员权限后添加 Defender 排除并构建
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 正在请求管理员权限...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo [1/3] 添加 Windows Defender 排除项...
powershell -Command "Add-MpPreference -ExclusionPath 'D:\ModyByCursor\user-app\android'"
if %errorLevel% neq 0 (
    echo 添加排除项失败。
    pause
    exit /b 1
)
echo 已添加排除项。

echo [2/3] 停止 Gradle 并清理缓存...
cd /d D:\ModyByCursor\user-app\android
call gradlew.bat --stop 2>nul
if exist .gradle rmdir /s /q .gradle

echo [3/3] 执行 Android 构建...
cd /d D:\ModyByCursor\user-app
call npm run android

echo.
pause

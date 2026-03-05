@echo off
chcp 65001 >nul
echo ========================================
echo 清理未使用的文件和页面
echo ========================================
echo.

echo 正在清理未在app.json中注册的页面...
echo.

REM 删除未使用的页面目录
if exist "miniprogram\pages\ai-custom-plan" (
    rmdir /s /q "miniprogram\pages\ai-custom-plan"
    echo ✓ 已删除 ai-custom-plan
)

if exist "miniprogram\pages\index" (
    rmdir /s /q "miniprogram\pages\index"
    echo ✓ 已删除 index
)

if exist "miniprogram\pages\mindfulness-14" (
    rmdir /s /q "miniprogram\pages\mindfulness-14"
    echo ✓ 已删除 mindfulness-14
)

if exist "miniprogram\pages\sleep-emotion" (
    rmdir /s /q "miniprogram\pages\sleep-emotion"
    echo ✓ 已删除 sleep-emotion
)

echo.
echo 正在清理临时文档和脚本...
echo.

REM 删除临时文档
if exist "AI_AGENT_DEPLOYMENT.md" del /q "AI_AGENT_DEPLOYMENT.md" && echo ✓ 已删除 AI_AGENT_DEPLOYMENT.md
if exist "AI_CUSTOM_PLAN_GUIDE.md" del /q "AI_CUSTOM_PLAN_GUIDE.md" && echo ✓ 已删除 AI_CUSTOM_PLAN_GUIDE.md
if exist "AI_INTEGRATION_SUMMARY.md" del /q "AI_INTEGRATION_SUMMARY.md" && echo ✓ 已删除 AI_INTEGRATION_SUMMARY.md
if exist "CLOUD_FUNCTION_DEBUG.md" del /q "CLOUD_FUNCTION_DEBUG.md" && echo ✓ 已删除 CLOUD_FUNCTION_DEBUG.md
if exist "CONTINUE_SUBPACKAGE_MIGRATION.md" del /q "CONTINUE_SUBPACKAGE_MIGRATION.md" && echo ✓ 已删除 CONTINUE_SUBPACKAGE_MIGRATION.md
if exist "DELETE_OLD_PAGES_GUIDE.md" del /q "DELETE_OLD_PAGES_GUIDE.md" && echo ✓ 已删除 DELETE_OLD_PAGES_GUIDE.md
if exist "EMERGENCY_FIX.md" del /q "EMERGENCY_FIX.md" && echo ✓ 已删除 EMERGENCY_FIX.md
if exist "FINAL_FIX_COMPILATION_ERROR.md" del /q "FINAL_FIX_COMPILATION_ERROR.md" && echo ✓ 已删除 FINAL_FIX_COMPILATION_ERROR.md
if exist "FINAL_OPTIMIZATION_STEPS.md" del /q "FINAL_OPTIMIZATION_STEPS.md" && echo ✓ 已删除 FINAL_OPTIMIZATION_STEPS.md
if exist "FIX_REQUIRE_PATHS.md" del /q "FIX_REQUIRE_PATHS.md" && echo ✓ 已删除 FIX_REQUIRE_PATHS.md
if exist "FIX_SUBPACKAGE_PATHS.md" del /q "FIX_SUBPACKAGE_PATHS.md" && echo ✓ 已删除 FIX_SUBPACKAGE_PATHS.md
if exist "PATH_FIX_COMPLETE.md" del /q "PATH_FIX_COMPLETE.md" && echo ✓ 已删除 PATH_FIX_COMPLETE.md
if exist "SUBPACKAGE_MIGRATION_COMPLETE.md" del /q "SUBPACKAGE_MIGRATION_COMPLETE.md" && echo ✓ 已删除 SUBPACKAGE_MIGRATION_COMPLETE.md
if exist "TESTING_GUIDE.md" del /q "TESTING_GUIDE.md" && echo ✓ 已删除 TESTING_GUIDE.md
if exist "TIMEOUT_FIX.md" del /q "TIMEOUT_FIX.md" && echo ✓ 已删除 TIMEOUT_FIX.md
if exist "URGENT_FIX_PATHS.md" del /q "URGENT_FIX_PATHS.md" && echo ✓ 已删除 URGENT_FIX_PATHS.md

REM 删除临时脚本
if exist "delete-old-pages.cmd" del /q "delete-old-pages.cmd" && echo ✓ 已删除 delete-old-pages.cmd
if exist "fix-all-paths.ps1" del /q "fix-all-paths.ps1" && echo ✓ 已删除 fix-all-paths.ps1
if exist "force-recompile.cmd" del /q "force-recompile.cmd" && echo ✓ 已删除 force-recompile.cmd
if exist "move-remaining-pages.cmd" del /q "move-remaining-pages.cmd" && echo ✓ 已删除 move-remaining-pages.cmd
if exist "restore-from-github.md" del /q "restore-from-github.md" && echo ✓ 已删除 restore-from-github.md
if exist "restore-project.cmd" del /q "restore-project.cmd" && echo ✓ 已删除 restore-project.cmd
if exist "restore-project.ps1" del /q "restore-project.ps1" && echo ✓ 已删除 restore-project.ps1

echo.
echo 正在清理.kiro目录中的测试文件...
echo.

if exist ".kiro\specs\test" (
    rmdir /s /q ".kiro\specs\test"
    echo ✓ 已删除 .kiro/specs/test
)

if exist ".kiro\specs\healing-homepage" (
    rmdir /s /q ".kiro\specs\healing-homepage"
    echo ✓ 已删除 .kiro/specs/healing-homepage
)

if exist ".kiro\specs\user-auth" (
    rmdir /s /q ".kiro\specs\user-auth"
    echo ✓ 已删除 .kiro/specs/user-auth
)

echo.
echo ========================================
echo 清理完成！
echo ========================================
echo.
echo 已删除的内容：
echo - 未使用的页面目录（ai-custom-plan, index, mindfulness-14, sleep-emotion）
echo - 临时文档和调试文件
echo - 临时脚本文件
echo - 测试spec文件
echo.
echo 保留的内容：
echo - 所有在app.json中注册的页面
echo - AI定制计划功能（plan-custom页面和planGenerator云函数）
echo - 核心云函数
echo - README.md
echo.
pause

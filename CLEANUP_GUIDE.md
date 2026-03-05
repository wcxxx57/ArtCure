# 项目清理指南

## 清理内容

### 1. 未使用的页面（不在app.json中）
以下页面目录将被删除：
- `miniprogram/pages/ai-custom-plan/` - 空目录
- `miniprogram/pages/index/` - 旧的首页（已被page1替代）
- `miniprogram/pages/mindfulness-14/` - 未使用的模板页面
- `miniprogram/pages/sleep-emotion/` - 未使用的模板页面

### 2. 临时文档和调试文件
以下临时文档将被删除：
- `AI_AGENT_DEPLOYMENT.md`
- `AI_CUSTOM_PLAN_GUIDE.md`
- `AI_INTEGRATION_SUMMARY.md`
- `CLOUD_FUNCTION_DEBUG.md`
- `CONTINUE_SUBPACKAGE_MIGRATION.md`
- `DELETE_OLD_PAGES_GUIDE.md`
- `EMERGENCY_FIX.md`
- `FINAL_FIX_COMPILATION_ERROR.md`
- `FINAL_OPTIMIZATION_STEPS.md`
- `FIX_REQUIRE_PATHS.md`
- `FIX_SUBPACKAGE_PATHS.md`
- `PATH_FIX_COMPLETE.md`
- `SUBPACKAGE_MIGRATION_COMPLETE.md`
- `TESTING_GUIDE.md`
- `TIMEOUT_FIX.md`
- `URGENT_FIX_PATHS.md`

### 3. 临时脚本文件
以下脚本将被删除：
- `delete-old-pages.cmd`
- `fix-all-paths.ps1`
- `force-recompile.cmd`
- `move-remaining-pages.cmd`
- `restore-from-github.md`
- `restore-project.cmd`
- `restore-project.ps1`

### 4. 测试Spec文件
以下测试文件将被删除：
- `.kiro/specs/test/`
- `.kiro/specs/healing-homepage/`
- `.kiro/specs/user-auth/`

## 保留的内容

### 核心页面（在app.json中注册）
- `pages/page1/` - 首页（小屋）
- `pages/ai-chat/` - AI对话
- `pages/user_login/` - 登录
- `pages/user_register/` - 注册
- `pages/user-info/` - 个人信息
- `pages/healing-hall/` - 疗愈馆
- `pages/healing-plan/` - 计划列表
- `pages/my-plans/` - 我的计划
- `pages/plan-detail/` - 计划详情
- `pages/plan-template/` - 计划模板
- `pages/plan-edit/` - 编辑计划
- `pages/plan-custom/` - **AI定制计划（新功能）**
- `pages/profile/` - 个人中心
- `pages/example/` - 示例页面

### 云函数
- `cloudfunctions/login/` - 登录
- `cloudfunctions/register/` - 注册
- `cloudfunctions/changePassword/` - 修改密码
- `cloudfunctions/updateUserInfo/` - 更新用户信息
- `cloudfunctions/sendVerificationCode/` - 发送验证码
- `cloudfunctions/planManagement/` - 计划管理
- `cloudfunctions/planGenerator/` - **AI计划生成（新功能）**
- `cloudfunctions/askAI/` - AI咨询
- `cloudfunctions/quickstartFunctions/` - 快速开始

### 核心文件
- `README.md` - 项目说明
- `project.config.json` - 项目配置
- `miniprogram/app.js` - 应用入口
- `miniprogram/app.json` - 应用配置
- `miniprogram/app.wxss` - 全局样式
- `miniprogram/utils/` - 工具函数
- `miniprogram/components/` - 组件
- `miniprogram/images/` - 图片资源

## 执行清理

### 方法1：使用清理脚本（推荐）
直接双击运行：
```
cleanup-unused-files.cmd
```

### 方法2：手动清理
按照上面的列表，手动删除对应的文件和目录。

## 清理后的验证

1. 在微信开发者工具中重新编译项目
2. 检查所有TabBar页面是否正常
3. 测试以下功能：
   - ✅ 登录注册
   - ✅ 个人信息管理
   - ✅ 计划列表和详情
   - ✅ AI定制计划（新功能）
   - ✅ AI对话
   - ✅ 疗愈馆

## 注意事项

1. **备份**：清理前建议先备份项目
2. **AI功能**：plan-custom页面和planGenerator云函数是新开发的AI定制计划功能，已保留
3. **云函数**：清理后需要确保所有云函数都已上传到云端
4. **测试**：清理后务必全面测试所有功能

## 清理后的项目结构

```
miniprogram-1/
├── cloudfunctions/          # 云函数
│   ├── login/
│   ├── register/
│   ├── planManagement/
│   ├── planGenerator/      # AI计划生成（新）
│   └── ...
├── miniprogram/            # 小程序代码
│   ├── pages/             # 页面（仅保留使用的）
│   │   ├── page1/         # 首页
│   │   ├── plan-custom/   # AI定制计划（新）
│   │   └── ...
│   ├── utils/             # 工具函数
│   ├── components/        # 组件
│   ├── images/            # 图片
│   ├── app.js
│   ├── app.json
│   └── app.wxss
├── README.md
└── project.config.json
```

## 清理完成后

删除以下文件：
- `cleanup-unused-files.cmd` - 清理脚本本身
- `CLEANUP_GUIDE.md` - 本指南文档

保持项目整洁！

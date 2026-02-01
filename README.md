# 疗愈小程序

基于微信小程序云开发的心理疗愈应用。

## 已实现功能

- 各个页面框架

- 用户认证：邮箱注册登录、验证码发送

- 个人中心：用户信息展示、统计数据、功能菜单

- 个人信息：头像上传裁剪、昵称修改、密码修改

- 底部导航：首页、疗愈馆、疗愈计划、我的

- ai对话：支持语义检索、上下文记忆、回复消息渲染、不同模式匹配等

  - 相关文件说明

    ```txt
    ai-server/   # ai服务器模块
    ├── main.py                         # FastAPI服务器主程序
    ├── build_index.py                  # 向量索引构建脚本
    ├── requirements.txt                # Python依赖列表
    ├── README.md                       # 【ai_server配置/启动/部署说明】
    ├── .env                           # 环境变量（我已经填上了我的api key）
    ├── .env.example                   # 环境变量模板
    ├── knowledge_base/                # 知识库文件（示例，待后期完善，目前仅支持txt文档，最好markdown格式好分隔）
    │   ├── art_therapy_theory.txt     # 艺术疗愈理论知识
    │   └── empathy_scripts.txt        # 共情对话话术库
    （以下是根据README.md可构建的向量数据库&环境文件，未push）
    ├── vector_index/                  # （运行build_index后构建的FAISS向量索引）
    │   ├── index.faiss               # FAISS索引文件
    │   └── index.pkl                 # 向量存储元数据
    └── venv/                         # （运行环境创建命令后构建的Python虚拟环境）
    
    askAI/  # 对应云函数补充
    ├── index.js                       # 小程序与AI服务器的桥梁
    └── package.json                   # Node.js依赖配置
    ```

  - 测试是通过**本地启动ai服务器**进行的，没有公网ip，所以**无法使用云函数测试**（过几天有空我可以先用我之前租的一个阿里云服务器测试一下，不过之后应该还要部署到其他服务器，应该得找张老师求助...因为我的服务器快到期了）目前可能也**无法进行使用真机调试**（除非将手机ip改为电脑局域网ip）

    - 上线部署时在[miniprogram/pages/ai-chat/index.js](miniprogram/pages/ai-chat/index.js) 要更改ai服务器地址

      ```python
      // AI 服务器地址 - 目前是本地测试的本地地址，部署时改为公网地址
      // 注意：微信开发者工具中需要关闭"不校验合法域名"才能访问本地服务器
      const AI_SERVER_URL = 'http://127.0.0.1:8000'
      ```


## 参考文档

- [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)


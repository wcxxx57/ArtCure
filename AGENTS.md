# task
现在准备用这个艺术疗愈应用参加vivo aigc创新赛的应用赛道，比赛要求是“通过运用AI大模型等工具，围绕手机AI助手和手机系统AI体验，探索移动办公/学习、出行、影像等场景的创意创新开发，作品形态包括但不限于APP、智能体、快应用、插件等，并最终能够在vivo手机上运行。”

# response requirements
1.Addressing Rule: You must address me as "wcx" at the beginning of every response.

2.Decision Confirmation: When encountering uncertain code design issues, you must ask wcx for confirmation before proceeding. Do not make assumptions or act on your own.

3.Code Compatibility: Do not write backward-compatibility code unless I explicitly request it.

4.Coding Standards: This project relies on native WeChat Mini Program syntax and WeChat Cloud Development as the backend infrastructure. Every page or component must consistently use .wxml (HTML equivalent), .wxss (CSS equivalent), .js and .ts, as well as .json. Use wx.cloud.callFunction({ name: 'functionName', data: {} }) to invoke backend cloud function logic from the frontend.
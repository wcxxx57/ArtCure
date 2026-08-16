一、环境搭建
1.python>=3.6 
windows环境建议前往python官网 https://www.python.org/downloads/windows/ 下载安装包并双击安装包安装，选中ADD TO PATH。安装完成后可以在终端确认：

PS D:\users\tmp_user> python
Python 3.10.3 (tags/v3.10.3:a342a49, Mar 16 2022, 13:07:40) [MSC v.1929 64 bit (AMD64)] on win32
Type "help", "copyright", "credits" or "license" for more information.
>>>
如果没识别到指令，到控制面板--系统和安全--系统--高级系统设置，在弹出的系统属性面板选择高级，点击环境变量，将python的安装目录添加到path。可参考https://zhuanlan.zhihu.com/p/263000046

linux环境建议前往anaconda官网 https://repo.anaconda.com/archive/ 下载安装包并安装，可参考网址https://blog.csdn.net/wyf2017/article/details/118676765 进行安装。安装完成后可以在终端确认：

$ python
Python 3.6.4 |Anaconda, Inc.| (default, Jan 16 2018, 18:10:19)
[GCC 7.2.0] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>>

2.安装运行程序需要的python三方包
进入到终端，执行安装第三方包指令
pip install websocket-client
pip install gevent
pip install soundfile
pip install numpy
pip install requests

二、语音识别
1.实时短语音识别
进入到实时短语音识别python接入demo目录下，执行命令：
python ai_speech_input_client.py audio.conf
说明：支持的音频格式为16k/16b 单声道的PCM编码格式音频

2.长语句听写
进入到长语句听写python接入demo目录下，执行命令：
python ai_speech_client.py audio.conf
说明：支持的音频为16k/16b 单声道的PCM编码格式音频


3.长语音转写
进入到长语音转写python接入demo目录下，执行命令：
python ai_fileasr_client.py audio.conf
说明：支持的音频格式有wav，pcm，m4a，mp3，acc，ogg，ogg_opus。
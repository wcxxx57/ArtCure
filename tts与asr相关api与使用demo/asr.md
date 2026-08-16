# 实时短语音识别

更新时间：2026-03-13 10:48:12

服务简介
本文主要描述基于websocket协议之上的实时ASR交互接口协议， 基于该接口协议，客户端可以选择合适的语言进行客户端的开发，短语音指单轮识别时长在60s之内。

接口说明
实时ASR服务是基于WebSocket协议实现数据的传输。 主要是包含两个阶段：握手阶段和实时通信阶段 。

注意
说明：支持的音频格式为16k/16b 单声道的PCM编码格式音频

API
WebSocket 握手阶段主要是用于客户端和服务端建立WebSocket通信通道

请求地址
域名：api-ai.vivo.com.cn

握手参数
Headers

参数	类型	是否必须	值
Authorization	string	是	Bearer AppKey
URL参数通过key1=val1&key2=val2…&keyn=valn 方式拼接 ， 并附加在url后面 ， 例如 ：

ws://api-ai.vivo.com.cn/asr/v2?key1=val1&key2=val2..&keyn=valn
字段	类型	说明	是否必选	是否要urlencode	备注
model	string	手机型号	否	是	
system_version	string	手机系统版本号	否	是	
client_version	string	应用版本号	是	是	可写默认值"unknown"
package	string	应用包名	是	是	可写默认值"unknown"
sdk_version	string	sdk版本号	是	是	可写默认值"unknown"
user_id	string	用户id(32位字符串，包括数字和小写字母)	是	是	唯一标志符
android_version	string	android版本号	是	是	可写默认值"unknown"
system_time	string	系统时间	是	是	Unix timestamp, 单位:毫秒
net_type	string	网络状态	是	是	0数据网络，1 wifi环境
engineid	string	能力id，如shortasrinput	是	是	短语音根据所需的模型类别选择能力id，一般选通用模型：shortasrinput
requestId	uuid	追踪链路	是		
发送语音请求
语音请求text参数
1） websocket连接建立成功之后，调用端首先向服务端发送一个opcode为text的报文
2） 这个报文的payload是一个json字符串

参数名	类型	说明	是否必选	备注
type	string	text包的类型	是	started
request_id	string	uuid，标识一次请求，32字符	是	
asr_info.end_vad_time	int	后端检测时间	是	单位：毫秒
asr_info.audio_type	string	音频类型	是	pcm/opus
asr_info.chinese2digital	int	是否打开汉字转数字	是	0关闭，1打开
asr_info.punctuation	int	是否打开标点符号	是	0：无标点 1：带标点
business_info	string	扩展字段，可用于透传信息	否	
语音请求binary数据
1） 调用端发送完opcode为text的报文之后，接着发送语音数据，opcode为binary, payload是语音数据
2） 语音数据建议分帧发送，每帧包含的语音时长是40毫秒，单句不超过60s
3） 语音数据发送完毕之后，再发送一个opcode为binary，payload是’ --end –- ‘，表示语音数据发送完毕
4） 需要关闭时，发送一个opcode为binary，payload是’ --close-- '，服务端收到后退出连接

接收数据格式
握手返回包
成功:

{
    "action":"started",
    "code":0,
    "data":"",
    "desc":"success",
    "sid":"5e094340-31be-47e7-83ad-7c6f27cd4f74"
}
失败:

{
    "action":"error",
    "code":1001,
    "data":"",
    "desc":"time out",
    "sid":"5e094340-31be-47e7-83ad-7c6f27cd4f74"
}
识别结果返回包:

{
    "sid":"e831d141-34e0-4617-a1b9-4ba43811453c@91",
    "is_finish":false,
    "data":{
        "result_id":91,
        "reformation":1,
        "is_last":true,
        "text":"气场中的场的部首共是多少笔。"
    },
    "action":"result",
    "request_id":"req_id",
    "code":0,
    "desc":"success",
    "type":"asr"
}
返回字段
参数	类型	说明
action	string	返回类型(started-握手成功, result-结果, error-出错)
type	string	业务类型(asr-语音识别, nlu-语义理解，common-通用返回)
code	int	返回码， 成功为0， 详细见2.4
data	object	结果数据
desc	string	描述
sid	string	会话id
data字段说明

参数	类型	说明
text	string	asr识别结果
result_id	int	结果序列号
reformation	int	asr识别返回， 1代表修正 0代表追加
business_info	stirng	透传，由业务方和应用决定
is_last	bool	是否为本次会话最后一条结果
is_finish	bool	是否为本次连接最后一条结果
识别错误码
错误码	描述
10000	参数校验失败
10002	引擎服务异常
10003	获取中间识别结果失败
10004	获取最终识别结果失败
10005	解析引擎数据异常
10006	引擎内部错误
10007	请求nlu出错
10008	音频超长
调用示例
python调用demo：实时短语音识别demo

使用说明见：demo使用说明

# 长语音听写

更新时间：2026-03-13 10:43:17

服务简介
本文主要描述基于websocket协议之上的实时长语音转文本交互接口协议， 基于该接口协议，客户端可以选择合适的语言进行客户端的开发，长语句指单轮识别不限制时长。

更新说明：
2025/04/09：更新调用示例中的python调用demo，修复调用时出现小概率性异常的bug
接口说明
实时ASR服务是基于WebSocket协议实现数据的传输。 主要是包含两个阶段：握手阶段和实时通信阶段 。

注意
说明：支持的音频为16k/16b 单声道的PCM编码格式音频

API
WebSocket 握手阶段主要是用于客户端和服务端建立WebSocket通信通道

请求地址
域名：api-ai.vivo.com.cn

握手参数
Headers

参数	类型	是否必须	值
Authorization	String	是	Bearer AppKey
URL参数

握手参数通过key1=val1&key2=val2…&keyn=valn 方式拼接 ， 并附加在url后面，例如： ws://asr-test-v2.vivo.com.cn/asr/v2?key1=val1&key2=val2…&keyn=valn

字段	类型	说明	是否必选	是否要urlencode	备注
model	string	手机外部型号	否	是	
system_version	string	手机系统版本号	否	是	
client_version	string	应用版本号	是	是	可写默认值"unknown"
product	string	内部机型名	否	是	
package	string	应用包名	是	是	可写默认值"unknown"
sdk_version	string	sdk版本号	是	是	可写默认值"unknown"
user_id	string	用户id(32位字符串，包括数字和小写字母)	是	是	唯一标志符
android_version	string	android版本号	是	是	可写默认值"unknown"
system_time	string	手机时间	是	是	Unix timestamp, 单位:毫秒
net_type	string	网络状态	是	是	0数据网络，1 wifi环境
engineid	string	能力id，如longasrlisten	是	是	根据所需的长语音模型类别选择能力id，一般选通用模型：longasrlisten；
requestId	uuid	追踪链路	是		
发送语音请求
语音请求text参数
1） websocket连接建立成功之后，调用端首先向服务端发送一个opcode为text的报文
2） 这个报文的payload是一个json字符串

参数名	类型	说明	是否必选	备注
type	string	text包的类型	是	started
request_id	string	uuid，标识一次请求，32字符	是	
asr_info.audio_type	string	音频类型	是	pcm/opus
asr_info.lang	string	语言	否	cn/en
asr_info.punctuation	int	是否开启标点	否	1：开启， 0：关闭
asr_info.eng_pgsnum	int	控制中间结果长度(取值为正整数(大于 0))。一 般建议设置为 40	否	40
business_info	string	扩展字段，可用于透传信息	否	
语音请求binary数据
1） 调用端发送完opcode为text的报文之后，接着发送语音数据，opcode为binary, payload是语音数据
2） 语音数据建议分帧发送，每帧包含的语音时长是40毫秒，云端会对连续的音频流进行实时识别，内置断句功能
3） 语音数据发送完毕之后，再发送一个opcode为binary，payload是’ --end–- ‘，表示语音数据发送完毕
4） 需要关闭时，发送一个opcode为binary，payload是’ --close-- '，服务端收到后退出连接

接收听写结果
接收握手返回包
成功:

{
    "action":"started",
    "code":0,
    "data":"",
    "desc":"success",
    "sid":"5e094340-31be-47e7-83ad-7c6f27cd4f74"
}
失败:

{
    "action":"error",
    "code":1001,
    "data":"",
    "desc":"time out",
    "sid":"5e094340-31be-47e7-83ad-7c6f27cd4f74"
}
接收听写结果
消息内容：

当action = result，code = 9时，表示为客户端发完语音数据后的最后一句，客户端可以断开链接。
当action = result，code = 8时，表示本次返回为识别中间var结果，即一句话的中间结果。
当action = result，code = 0时，表示本次返回为识别中间rec结果，即一句话的完整结果，整个过程就是一句话中间结果，一句话完整结果…结束
获取中间var结果
{
    "sid":"b1998631-035d-403b-868f-bf68d32637ad@7380",
    "action":"result",
    "data":{
        "speaker":0,
        "bg":289820,
        "recvid":"103e721b63014ffd92b5669c6d2c1ae2",
        "var":"政协委员姚明凝视天空时的表情还有一位记者"
    },
    "code":8,
    "desc":"success",
    "type":"asr"
}
获取中间rec结果
{
    "sid":"b1998631-035d-403b-868f-bf68d32637ad@7396",
    "action":"result",
    "data":{
        "bg":289820,
        "speaker":0,
        "onebest":"政协委员姚明凝视天空时的表情，还有一位记者的发型。",
        "recvid":"103e721b63014ffd92b5669c6d2c1ae2",
        "ed":295060
    },
    "code":0,
    "desc":"success",
    "type":"asr"
}
获取最后一句结果
{
    "sid":"b1998631-035d-403b-868f-bf68d32637ad@8331",
    "action":"result",
    "data":{
        "bg":331400,
        "speaker":0,
        "onebest":"有一定的下降，",
        "recvid":"103e721b63014ffd92b5669c6d2c1ae2",
        "ed":333230
    },
    "code":9,
    "desc":"success",
    "type":"asr"
}
返回字段
参数	类型	说明
action	string	返回类型(started-握手成功, result-结果, error-出错)
type	string	业务类型(asr-语音识别)
code	int	action为result 见2.3.2
data	object	结果数据
desc	string	描述
sid	string	会话id
data字段说明:

参数	类型	说明
var	string	识别中间var结果即一句话中间结果
onebest	string	识别中间rec结果即完整一句话或者最后一句结果
bg	int	开始时间，单位毫秒
ed	int	结束时间，单位毫秒
speaker	int	当有角色分离时返回0表示当前说话人， 非0表示角色id，有角色变化
错误码
错误码	描述
10000	参数校验失败
10001	签名校验失败
10002	引擎服务异常
10003	获取中间识别结果失败
10004	获取最终识别结果失败
10005	解析引擎数据异常
10006	引擎内部错误
50001	使用超量
调用示例
python调用demo：长语音听写调用demo

使用说明见：demo使用说明

# 长语音转写

更新时间：2026-03-13 10:38:53

服务简介
本文主要描述基于http协议之上的录音文件长语音转写（单次转写文件限制5个小时且小于500M）交互接口协议， 基于该接口协议，客户端可以选择合适的语言进行客户端的开发

接口说明
注意
说明：支持的音频格式有wav，pcm，m4a，mp3，acc，ogg，ogg_opus。
录音文件长语音转写，主要是包含以下5个阶段：

1.创建音频

2.文件分片上传

3.创建任务并开始转写

4.查询转写进度

5.查询转写结果

API
请求地址
域名：api-ai.vivo.com.cn

公共参数
Header

请求头鉴权参数用于服务鉴权

参数名称	类型	是否必须	参数值
Authorization	String	是	Bearer AppKey
URL参数

url参数通过key1=val1&key2=val2…&keyn=valn 方式拼接 ， 并附加在url后面

例如：http://api-ai.vivo.com.cn/lasr/create?key1=val1&key2=val2…&keyn=valn

字段	类型	说明	是否必选	是否要urlencode	备注
client_version	string	应用版本号	是	是	
package	string	应用包名	是	是	
user_id	string	用户id(32位字符串，包括数字和小写字母)	是	是	唯一标志符
system_time	string	请求时间	是	是	Unix timestamp, 单位:毫秒
engineid	string	能力id，如fileasrrecorder	是	是	根据所需的长语音转写模型类别选择能力id，普通录音文件转写模型：fileasrrecorder
requestId	uuid	追踪链路	是	是	
【注意事项】

1.header和url参数1-5阶段都需要带上

创建音频
【地址】：/lasr/create

【方式】：POST

【头部】：“Content-Type”: “application/json; charset=UTF-8”

请求body
参数名	类型	位置	说明	是否必选	备注
audio_type	string	body	音频类型	是	pcm格式传pcm
其他wav，ogg(speex)，ogg_opus，mp3，aac，m4a格式传auto
x-sessionId	string	body	请求端生成uuid，且必须保证创建音频和文件分片上传时使用相同的x-sessionId	是	
slice_num	int	body	音频分片总数，用于最后的分片上传数量检查	是	slice_num = ceil((file_size)/(slice_size)),slice_size 为文件分片的大小， 目前为5Mfile_size 为录音文件的大小ceil() 表示向上取整，因单次转写限制500M，slice_num取值小于等于100
响应结果
{
	"sid": "81303be6-c015-4aa3-9191-f1234cdf0a6e",
	"action": "result",
	"data": {
		"audio_id": "5fb63a82bbb2a462d7bae7dd"  // 音频ID，分片上传和创建任务的API都会用到
	},
	"code": 0,
	"desc": "success",
	"type": "asr"
}
文件分片上传
【地址】：/lasr/upload

【方式】：POST

【头部】：“Content-Type”: "multipart/form-data“

URL请求参数
参数名	类型	位置	说明	是否必选	备注
audio_id	string	query string	创建任务时，服务器返回的audio_id，URL参数。	是	
x-sessionId	string	query string	请求端生成uuid，且必须保证创建音频和文件分片上传时使用相同的x-sessionId，URL参数	是	
slice_index	int	query string	本次上传的分片索引编号，从0开始，URL参数	是	
示例:

curl -i -X POST -H "Content-Type: multipart/form-data" -F file=@slice_path /lasr/upload?{公参}&audio_id={audio_id}&slice_index={slice_index}&x-sessionId={x-sessionId}
响应结果
分片未上传完：

{
    "sid":"6b5e969e-7a53-415c-8ce1-859043731982",
    "action":"result",
    "data":{
        "total":3,
        "slices":1, // 1 ～ slices_num, 服务器已成功保存的分片总数
        "audio_id":"5fb63a82bbb2a462d7bae7dd"
    },
    "code":0,
    "desc":"success",
    "type":"asr"
}
分片上传完：

{
    "sid":"f55e388d-f2fa-48b1-9f84-310d74bf4879",
    "action":"result",
    "data":{
        "url":"",
        "total":3,
        "slices":3,
        "audio_id":"5fb63a82bbb2a462d7bae7dd"
    },
    "code":0,
    "desc":"success",
    "type":"asr"
}
【注意事项】

1.为了更好的保障大文件的传输稳定性和效率，分片大小为5M， 5M之内的无需分片（slices_num = 1, slice_index = 0）

创建任务并开始转写
【地址】：/lasr/run

【方式】：POST

【头部】：“Content-Type”: “application/json; charset=UTF-8”

请求body
参数名	类型	位置	说明	是否必选	备注
audio_id	string	body	创建任务时，服务器返回的audio_id	是	
x-sessionId	string	body	请求端生成uuid，且必须保证创建音频和文件分片上传时使用相同的x-sessionId	是	
响应结果
{
    "sid":"64b26906-c491-4664-b6fd-68b3aa4e84b1",
    "action":"result",
    "data":{
        "task_id":"5fb621c3bb14f77daecb9224"
    },
    "code":0,
    "desc":"success",
    "type":"asr"
}
查询转写进度
【地址】：/lasr/progress

【方式】：POST

【头部】：“Content-Type”: “application/json; charset=UTF-8”

请求body
参数名	类型	位置	说明	是否必选	备注
task_id	string	body	创建转写任务返回的任务ID	是	
x-sessionId	string	body	请求端生成uuid，且必须保证创建音频和文件分片上传时使用相同的x-sessionId	是	
响应结果
{
    "sid":"13d8bfdb-7f2f-46c3-b854-dbf86df52361",
    "action":"result",
    "data":{
        "progress":100 //0 ～ 100，100表示转写完成
    },
    "code":0,
    "desc":"success",
    "type":"asr"
}
查询转写结果
【地址】：/lasr/result

【方式】：POST

【头部】：“Content-Type”: “application/json; charset=UTF-8”

请求body
参数名	类型	位置	说明	是否必选	备注
task_id	string	body	创建转写任务返回的任务ID	是	
x-sessionId	string	body	请求端生成uuid，且必须保证创建音频和文件分片上传时使用相同的x-sessionId	是	
响应结果
{
    "sid":"dbfeac3d-d931-4bde-99a1-dcff713fdb2b",
    "action":"result",
    "data":{
        "result":[
            {
                "onebest":"播放歌曲摇篮曲。 ",
                "bg":0,
                "ed":2190,
                "speaker":1
            }
        ]
    },
    "code":0,
    "desc":"success",
    "type":"asr"
}
错误码
创建音频
业务层错误码	错误原因
10000	客户端传公共参数校验失败
10001	客户端传创建音频相关参数校验失败
10002	客户端请求body参数音频分片数slice_num大于100
10003	服务端创建音频失败
文件上传
业务层错误码	错误原因
10100	客户端传公共参数校验失败
10101	客户端传音频上传相关参数校验失败
10102	服务端创建读音频对象失败
10103	服务端读取音频失败
10104	服务端获取缓存的音频分片数量失败
10105	服务端上传音频到数据库失败
10106	最后一个分片上传完成时服务端状态流转失败
开始转写
业务层错误码	错误原因
10200	客户端传公共参数校验失败
10201	客户端传转写相关参数校验失败
10202	服务端创建转写任务失败
10203	开始转写时服务端状态流转失败
####查询进度

业务层错误码	错误原因
10300	客户端传公共参数校验失败
10301	客户端传查询进度相关参数校验失败
10302	服务端获取进度失败
查询结果
业务层错误码	错误原因
10400	客户端传公共参数校验失败
10401	客户端传查询结果相关参数校验失败
10402	服务端获取结果失败
调用示例
python调用demo：长语音转写调用demo

# 方言自由说

更新时间：2026-03-13 10:31:23

简介
本文主要描述基于websocket协议之上的实时短语音转文本交互接口协议， 基于该接口协议，客户端可以选择合适的语言进行客户端的开发

支持语种：济南话，河南话，四川话，武汉话

接口说明
实时短语音转文本服务是基于WebSocket协议实现数据的传输。 主要是包含两个阶段：握手阶段和实时通信阶段 。

注意
说明：支持的音频格式为16k/16b 单声道的PCM编码格式音频

API
WebSocket 握手阶段主要是用于客户端和服务端建立WebSocket通信通道

请求地址
域名： api-ai.vivo.com.cn

握手参数
headers

参数	类型	是否必须	值
Authorization	String	是	Bearer AppKey
URL参数

URL参数通过key1=val1&key2=val2…&keyn=valn 方式拼接 ， 并附加在url后面 ， 例如 ：

ws://api-ai.vivo.com.cn/asr/v2?key1=val1&key2=val2..&keyn=valn
字段	类型	说明	是否必选	是否要urlencode	备注
model	string	手机型号	否	是	
system_version	string	手机系统版本号	否	是	
client_version	string	应用版本号	是	是	可写默认值"unknown"
package	string	应用包名	是	是	可写默认值"unknown"
sdk_version	string	sdk版本号	是	是	可写默认值"unknown"
user_id	string	用户id(32位字符串，包括数字和小写字母)	是	是	唯一标志符
android_version	string	android版本号	是	是	可写默认值"unknown"
system_time	string	系统时间	是	是	Unix timestamp, 单位:毫秒
net_type	string	网络状态	是	是	0数据网络，1 wifi环境
engineid	string	能力id，如shortasrinput	是	是	shortasrinput
user_info	string	用户体验开关	是	是	0用户体验开关关闭，1用户体验开关打开
requestId	uuid	追踪请求	是		
发送语音请求
语音请求text参数
1） websocket连接建立成功之后，调用端首先向服务端发送一个opcode为text的报文
2） 这个报文的payload是一个json字符串

参数名	类型	说明	是否必选	备注
type	string	text包的类型	是	started
request_id	string	uuid，标识一次请求，32字符	是	
asr_info.end_vad_time	int	静音检测时长，单位是ms，默认1440ms	否	最小说话时长和静音检测时长共同决定断句
asr_info.mini_speech_time	int	最小说话时长，单位是ms，默认300ms	否	
asr_info.audio_type	string	音频类型	是	起到后端vad的作用pcm/opus
asr_info.chinese2digital	int	是否打开汉字转数字	是	0关闭，1打开
asr_info.punctuation	int	是否打开标点符号	是	0：无标点 1：带标点
business_info	string	扩展字段，可用于透传信息	否	
asr_info.lang	string	语种，默认是中文	否	dialect：方言自由说
语音请求binary数据
1） 调用端发送完opcode为text的报文之后，接着发送语音数据，opcode为binary, payload是语音数据
2） 语音数据建议分帧发送，每帧包含的语音时长是40毫秒，单句不超过60s
3） 语音数据发送完毕之后，再发送一个opcode为binary，payload是’ --end–- ‘，表示语音数据发送完毕
4） 需要关闭时，发送一个opcode为binary，payload是’ --close-- '，服务端收到后退出连接

接收数据格式
握手返回包
成功:

{
    "action":"started",
    "code":0,
    "data":"",
    "desc":"success",
    "sid":"5e094340-31be-47e7-83ad-7c6f27cd4f74"
}
失败:

{
    "action":"error",
    "code":1001,
    "data":"",
    "desc":"time out",
    "sid":"5e094340-31be-47e7-83ad-7c6f27cd4f74"
}
识别结果返回包:

{
    "sid":"e831d141-34e0-4617-a1b9-4ba43811453c@91",
    "is_finish":false,
    "data":{
        "result_id":91,
        "reformation":1,
        "is_last":true,
        "text":"气场中的场的部首共是多少笔。"
    },
    "action":"result",
    "request_id":"req_id",
    "code":0,
    "desc":"success",
    "type":"asr"
返回字段
参数	类型	说明
action	string	返回类型(started-握手成功, result-结果, error-出错)
type	string	业务类型(asr-语音识别, nlu-语义理解，common-通用返回)
code	int	返回码， 成功为0， 详细见2.4
data	object	结果数据
desc	string	描述
sid	string	会话id
data字段说明

参数	类型	说明
text	string	asr识别结果
result_id	int	结果序列号
reformation	int	asr识别返回， 1代表修正 0代表追加
business_info	stirng	透传，由业务方和应用决定
is_last	bool	是否为本次会话最后一条结果
is_finish	bool	是否为本次连接最后一条结果
识别错误码
错误码	描述
10000	参数校验失败
10002	引擎服务异常
10003	获取中间识别结果失败
10004	获取最终识别结果失败
10005	解析引擎数据异常
10006	引擎内部错误
10007	请求nlu出错
10008	音频超长
调用示例
python调用demo：方言自由说demo

使用说明见：demo使用说明 （同实时语音识别）

# 同声音传译

更新时间：2026-03-13 10:00:23

简介
本文主要描述基于websocket协议之上的实时ASR交互接口协议， 基于该接口协议，客户端可以选择合适的语言进行客户端的开发

接口说明
实时ASR服务是基于WebSocket协议实现数据的传输。 主要是包含两个阶段：握手阶段和实时通信阶段 。

API
WebSocket 握手阶段主要是用于客户端和服务端建立WebSocket通信通道

请求地址
域名： api-ai.vivo.com.cn

握手参数
headers

参数	类型	是否必须	值
Authorization	String	是	Bearer AppKey
URL参数

URL参数通过key1=val1&key2=val2…&keyn=valn 方式拼接 ， 并附加在url后面 ， 例如 ：

ws://api-ai.vivo.com.cn/asr/v2?key1=val1&key2=val2..&keyn=valn
字段	类型	说明	是否必选	是否要urlencode	备注
user_id	string	用户id(32位字符串，包括数字和小写字母)	是	是	唯一标志符
product	string	手机型号	否	是	
package	string	应用包名	是	是	可写默认值"unknown"
client_version	string	应用版本号	是	是	可写默认值"unknown"
system_version	string	手机系统版本号	否	是	
sdk_version	string	sdk版本号	是	是	可写默认值"unknown"
android_version	string	android版本号	是	是	可写默认值"unknown"
system_time	string	系统时间	是	是	Unix timestamp, 单位:毫秒
net_type	string	网络状态	是	是	0数据网络，1 wifi环境
engineid	string	能力id，如longasrsubtitle	是	是	longasrsubtitle
requestId	uuid	用于问题追踪	是	是	
发送语音请求
语音请求text参数
1） websocket连接建立成功之后，调用端首先向服务端发送一个opcode为text的报文
2） 这个报文的payload是一个json字符串

参数名	类型	说明	是否必选	备注
type	string	text包的类型	是	started
request_id	string	uuid，标识一次请求，32字符	是	
asr_info.audio_type	string	音频类型	是	起到后端vad的作用pcm/opus
asr_info.lang	string	语言	是	中英自识别：cn
中文：cn
英文：en
日文：ja
韩文：ko
asr_info.target_lang	string	目标翻译语言，默认是""空字符串，如果开启翻译，必传参数	是	英译中：en_cn
日译中：ja_cn
韩译中：ko_cn
asr_info.punctuation	int	是否打开标点符号	否	0：无标点 1：带标点
asr_info.eng_pgsnum	int	控制中间结果长度(取值为正整数(大于 0))。一 般建议设置为 40	否	40
asr_info.scene	string	区分场景类型，如会议场景为meet	否	适配会议助手新增，会议场景关闭语气词，其他场景开启语气词
asr_info.audio_source	int	区分系统音和麦克风音	否	1：系统音，2：麦克风音
asr_info.roletype	int	是否需要分角色	否	0：不需要，1：需要，默认是需要
asr_info.tc	int	同声传译开关，默认是0：关闭	否	1：开启， 0：关闭
asr_info.end_vad_time	int	静音检测时长，单位是ms，默认1440ms	是	单位：毫秒
tts_info.selftts	int	同声纹复刻开关，默认是0：关闭	否	1：开启， 0：关闭
tts_info.speed	int	语速	否	范围[0,100]，默认50
tts_info.speaker	string	音色，开启同声纹复刻时，为同声纹复刻音色	否	参照下方发音人列表
tts_info.audio_code	string	音频编码	否	音频的编码格式，支持raw/speex/speex-wb,默认raw
tts_info.volume	string	音量	否	可选值：[1-100]，默认50
tts_info.engineid	string	TTS能力id	否	tts_replica/short_audio_synthesis_customization，默认tts_replica
business_info	string	扩展字段，可用于透传信息	否	
上传会话级热词包

参数名	类型	说明	是否必选	备注
type	string	text包的类型	是	hotword
hotword_info.business.hotWord	string	多个热词以英文逗号","分隔，其总长度最大 10000 个字节。一次会话中支持热词个数最大上限 3000 个。	是	{ “business”: { “hotWord”: “示例热词一,示例热词二” } }
语音请求binary数据
1） 调用端发送完opcode为text的报文之后，接着发送语音数据，opcode为binary, payload是语音数据
2） 语音数据建议分帧发送，每帧包含的语音时长是40毫秒，单句不超过60s
3） 语音数据发送完毕之后，再发送一个opcode为binary，payload是’ --end–- ‘，表示语音数据发送完毕
4） 需要关闭时，发送一个opcode为binary，payload是’ --close-- '，服务端收到后退出连接

接收数据格式
握手返回包
成功:

{
    "action":"started",
    "code":0,
    "data":"",
    "desc":"success",
    "sid":"5e094340-31be-47e7-83ad-7c6f27cd4f74"
}
失败:

{
    "action":"error",
    "code":1001,
    "data":"",
    "desc":"time out",
    "sid":"5e094340-31be-47e7-83ad-7c6f27cd4f74"
}
接收转写结果
【消息内容】：

当action = result，code = 9时，表示为客户端发完语音数据后的最后一句，客户端可以断开链接。
当action = result，code = 8时，表示本次返回为识别中间var结果，即一句话的中间结果。
当action = result，code = 0时，表示本次返回为识别中间rec结果，即一句话的完整结果，整个过程就是一句话中间结果，一句话完整结果...结束
获取中间var结果
{
"sid": "b1998631-035d-403b-868f-bf68d32637ad@7380",
"action": "result",
"data": {
"speaker": 0,
"bg": 289820,
"recvid": "103e721b63014ffd92b5669c6d2c1ae2",
"var": "政协委员姚明凝视天空时的表情还有一位记者"
},
"code": 8,
"desc": "success",
"type": "asr"
}
获取中间rec结果
{
"sid": "b1998631-035d-403b-868f-bf68d32637ad@7396",
"action": "result",
"data": {
"bg": 289820,
"speaker": 0,
"onebest": "政协委员姚明凝视天空时的表情，还有一位记者的发型。",
"recvid": "103e721b63014ffd92b5669c6d2c1ae2",
"ed": 295060
},
"code": 0,
"desc": "success",
"type": "asr"
}
获取最后一句结果
{
"sid": "b1998631-035d-403b-868f-bf68d32637ad@8331",
"action": "result",
"data": {
"bg": 331400,
"speaker": 0,
"onebest": "有一定的下降，",
"recvid": "103e721b63014ffd92b5669c6d2c1ae2",
"ed": 333230
},
"code": 9,
"desc": "success",
"type": "asr"
}
返回字段
参数	类型	说明
action	string	返回类型(started-握手成功, result-结果, error-出错)
type	string	业务类型(asr-语音识别, nlu-语义理解，common-通用返回)
code	int	返回码， 成功为0，
data	object	结果数据
desc	string	描述
sid	string	会话id
data字段说明

参数	类型	说明
var	string	识别中间var结果
onebest	string	识别中间rec结果或者最后一句结果
bg	int	开始时间，单位毫秒
ed	int	结束时间，单位毫秒
recvid	string	引擎为三方时填写三方的会话id
segId	int	标记返回的消息编号
isseg	int	字幕3.0引入，为1表示分段展示，为0表示不分段，日韩转写不支持分段
speaker	int	当有角色分离时返回，表示角色id，第一个角色id从1开始，返回-1表示该字段值失效
src	string	当用户开启翻译时，该字段返回翻译的源语言，如用户选择英文翻译为中文，则该字段返回识别的英文
audio	string	当用户开启同声传译时，返回同声传译的音频
错误码
错误码	描述
10000	参数校验失败
10002	引擎服务异常
10003	获取中间识别结果失败
10004	获取最终识别结果失败
10005	解析引擎数据异常
10006	引擎内部错误
10007	请求nlu出错
10008	音频超长
调用示例
python调用demo：同声传译demo

使用说明见：demo使用说明

发音人列表

语种 发音人
中文 cn xiaopei,xiaoyan,yiyi,xiaofang,chaoge,yifei
英文 en Lindsay,Catherine
法语 fr Mariane
俄语 ru Allabent
日语 ja xiaolin
韩语 ko zhimin
西班牙语 es Gabriela
德语 de Leonie
阿拉伯语 ar Ahmed
泰语 th suparut
越南语 vi xiaoyun
维语 cn_uyghur patiguli
藏语 cn_tibetan sgron
粤语 cn_cantonese xiaomei
中英混合 cnen xiaopei
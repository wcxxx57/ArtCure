import soundfile
import gevent
from gevent import monkey

monkey.patch_all()
import struct
import json
import sys
import uuid
import time
from urllib import parse

from websocket import create_connection

NUM = 1


def read_wave_data(wav_path):
    wav_data, sample_rate = soundfile.read(wav_path, dtype='int16')
    return wav_data, sample_rate


def send_process(ws, wav_path):
    try:
        start_data = {
            "type": "started",
            "request_id": str(uuid.uuid1()).replace('-', ''),
            "asr_info": {
                "audio_type": "pcm",
                "lang": "en",
                "target_lang": "cn",
                "punctuation": 1,
                "eng_pgsnum": 800,
                "roletype": 1,
                "front_vad_time": 6000,
                "end_vad_time": 1000,
                "tc": 1,
            },
            "tts_info": {
                "speed": 50,
                "speaker": "Lindsay",
                "audio_code": "speex",
                "volume": 100,
            },
            "business_info": ""
        }

        start_data_json_str = json.dumps(start_data)
        ws.send(start_data_json_str)

        wav_data, sample_rate = read_wave_data(wav_path)

        nlen = len(wav_data)
        nframes = nlen * 2
        pack_data = struct.pack('%dh' % nlen, *wav_data)
        wav_data_c = list(struct.unpack('B' * nframes, pack_data))

        cur_frames = 0
        sample_frames = 1280

        while (cur_frames < nframes):
            samp_remaining = nframes - cur_frames
            num_samp = sample_frames if sample_frames < samp_remaining else samp_remaining

            list_tmp = [None] * num_samp

            for i in range(num_samp):
                list_tmp[i] = wav_data_c[cur_frames + i]

            pack_data_2 = struct.pack('%dB' % num_samp, *list_tmp)
            cur_frames += num_samp

            if (len(pack_data_2) < 1280):
                break

            ws.send_binary(pack_data_2)
            time.sleep(0.04)

        enddata = b'--end--'
        ws.send_binary(enddata)

        enddata = b'--close--'
        ws.send_binary(enddata)

    except Exception as e:
        print(e)
        return


def recv_process(ws, tbegin, wav_path):
    index = 1
    cnt = 1
    first_world = 1
    first_world_time = 0

    while True:
        try:
            r = ws.recv()
            # print(r)
            tmpobj = json.loads(r)

            if tmpobj["action"] == "started":
                print(r)

            if tmpobj["action"] == "error":
                print(r)
                path = wav_path
                sid = tmpobj["sid"]
                code = tmpobj["code"]
                t3 = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

            if tmpobj["action"] == "result":
                if tmpobj["type"] == "asr":
                    print(r)
                    errno = tmpobj["code"]
                    if (errno == 8 or errno == 0 or errno == 9):
                        data = tmpobj["data"]
                        tend = int(round(time.time() * 1000))
                        path = wav_path
                        text = data.get("onebest", None)
                        sid = tmpobj["sid"]
                        rid = tmpobj.get("request_id", "NULL")
                        code = tmpobj["code"]
                        t2 = tend - tbegin
                        t3 = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
                        if text:
                            print("{}#{}#{}#{}#{}#{}#{} ".format(path, text, rid, sid, code, t2, t3))
                        if errno == 9:
                            return

                if tmpobj["type"] == "tts":
                    errno = tmpobj["code"]

                    if (errno == 8 or errno == 0 or errno == 9):
                        data = tmpobj["data"]
                        tend = int(round(time.time() * 1000))
                        path = wav_path
                        sid = tmpobj["sid"]
                        code = tmpobj["code"]
                        segId = data.get("segId", 0)
                        t2 = tend - tbegin
                        t3 = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
                        audio = data.get("audio", "")
                        print("{}#{}#{}#{}#{}#{}#{}".format("tts", sid, code, "audioLen:" + str(len(audio)),
                                                            "segId:" + str(segId), t2, t3))

                        if errno == 9:
                            print(r)
                            return

        except Exception as e:
            print(repr(e))
            path = wav_path
            err = "exception"
            t3 = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
            print("{} {} {}".format(path, err, t3))
            return


def control_process(wav_path):
    t = int(round(time.time() * 1000))

    params = {}
    params['user_id'] = parse.quote('2addc42b7ae689dfdf1c63e220df52a2')
    params['product'] = parse.quote('x')
    params['model'] = parse.quote('z')
    params['package'] = parse.quote('pack')
    params['client_version'] = parse.quote('2.0')
    params['system_version'] = parse.quote('2.0')
    params['sdk_version'] = parse.quote('3.0')
    params['android_version'] = parse.quote('28')
    params['engineid'] = parse.quote("longasrsubtitle")
    params['system_time'] = parse.quote(str(t))
    params['net_type'] = 1
    params['requestId'] = parse.quote(str(uuid.uuid4()))

    # your_AppId, your_AppKey
    AppID = 'your_AppId'
    AppKey = 'your_AppKey'

    uri = '/asr/v2'
    domain = 'api-ai.vivo.com.cn'

    headers = {
        "Authorization": f"Bearer {AppKey}",
        "Content-type": "application/json",
    }
    param_str = ''
    seq = ''

    for key, value in params.items():
        value = str(value)
        param_str = param_str + seq + key + '=' + value
        seq = '&'

    ws = create_connection('ws://' + domain + '/asr/v2?' + param_str, header=headers)

    co1 = gevent.spawn(send_process, ws, wav_path)
    co2 = gevent.spawn(recv_process, ws, t, wav_path)
    gevent.joinall([co2])
    time.sleep(0.04)


def main():
    if (len(sys.argv) < 2):
        print('usage :  python %s conf' % sys.argv[0])
        print('example: python %s %s' % (sys.argv[0], 'audio.conf'))
        sys.exit(1)
    else:
        config = sys.argv[1]

    count = 0
    for i in range(1):
        with open(config, 'rt') as f:
            coro = []
            for line in f:
                line = line.strip('\n')
                t = gevent.spawn(control_process, line)
                coro.append(t)
                count += 1
                if count % 1 == 0:
                    gevent.joinall(coro)
                    coro = []

            if (len(coro) > 0):
                gevent.joinall(coro)
                coro = []


if __name__ == "__main__":
    main()

#!/usr/bin/env python
# -*- coding:utf-8 -*-
import socket
import base64
import hashlib
import threading
import struct



import serialTest

def get_headers(data):
    """
    将请求头格式化成字典
    :param data:
    :return:
    """
    header_dict = {}
    data = str(data)

    header, body = data.split('\r\n\r\n', 1)
    header_list = header.split('\r\n')
    for i in range(0, len(header_list)):
        if i == 0:
            if len(header_list[i].split(' ')) == 3:
                header_dict['method'], header_dict['url'], header_dict['protocol'] = header_list[i].split(' ')
        else:
            k, v = header_list[i].split(':', 1)
            header_dict[k] = v.strip()
    return header_dict


def send_msg(conn, data):
    if data:
        data = str(data)
    else:
        return False
    token = "\x81"
    length = len(data)
    if length < 126:
        token += struct.pack("B", length)    # struct为Python中处理二进制数的模块，二进制流为C，或网络流的形式。
    elif length <= 0xFFFF:
        token += struct.pack("!BH", 126, length)
    else:
        token += struct.pack("!BQ", 127, length)
    data = '%s%s' % (token, data)
    conn.send(data)
    return True


def handshake(conn):

    data = conn.recv(1024)
    headers = get_headers(data)
    response_tpl = "HTTP/1.1 101 Switching Protocols\r\n" \
                   "Upgrade:websocket\r\n" \
                   "Connection:Upgrade\r\n" \
                   "Sec-WebSocket-Accept:%s\r\n" \
                   "WebSocket-Location:ws://%s%s\r\n\r\n"
    value = headers['Sec-WebSocket-Key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
    ac = base64.b64encode(hashlib.sha1(value.encode('utf-8')).digest())
    response_str = response_tpl % (ac.decode('utf-8'), headers['Host'], headers['url'])
    conn.send(response_str)


def dojob(conn):

    handshake(conn)

    while True:
        try:
            info = conn.recv(2048)
        except Exception as e:
            info = None

        if not info:
            break
        
        code_len = ord(info[1]) & 127
        if code_len == 126:
            masks = info[4:8]
            data = info[8:]
        elif code_len == 127:
            masks = info[10:14]
            data = info[14:]
        else:
            masks = info[2:6]
            data = info[6:]
        raw_str = ""
        i = 0
        for d in data:
            raw_str += chr(ord(d) ^ ord(masks[i % 4]))
            i += 1

        print raw_str
        send_msg(conn,raw_str)
        # payload_len = ord(info[1]) & 127
        # if payload_len == 126:
        #     extend_payload_len = info[2:4]
        #     mask = info[4:8]
        #     decoded = info[8:]
        # elif payload_len == 127:
        #     extend_payload_len = info[2:10]
        #     mask = info[10:14]
        #     decoded = info[14:]
        # else:
        #     extend_payload_len = None
        #     mask = info[2:6]
        #     decoded = info[6:]
            
        # bytes_list = bytearray()
        # for i in range(len(decoded)):
        #     chunk = decoded[i] ^ mask[i % 4]
        #     bytes_list.append(chunk)
        # body = str(bytes_list)
        # print(body)

    return False


def run():

    index = 1
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(('127.0.0.1', 8003))
    sock.listen(20)
    print('\r\n\r\nWebsocket server start, wait for connect!')
    print('- - - - - - - - - -- - - - - - - - - -- - - - - - -')

    while True:

        conn, address = sock.accept()
        thread_name = 'thread_%s' % index
        print('%s : Connection from %s:%s' % (thread_name, address[0], address[1]))
        t = threading.Thread(target=dojob(conn))
        t.start()
        index += 1


if __name__ == '__main__':
    run()
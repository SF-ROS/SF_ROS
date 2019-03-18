#!/usr/bin/python
#encoding:utf-8

'''
client
'''

import socket, sys, os
import time, json
import urllib,urllib2
import uuid
import fcntl
import struct


def get_mac_address():
    mac=uuid.UUID(int = uuid.getnode()).hex[-12:]
    return ":".join([mac[e:e+2] for e in range(0,11,2)])


def get_host_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    finally:
        s.close()

    return ip

remote_ip = '192.168.1.102'  # maybe change
port = 7878
BUF_SIZE = 4096
mac = get_mac_address()
ip = get_host_ip()

try:
    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
except socket.error, e:
    print "Error creating socket: %s" % e
    sys.exit()

try:
    client.connect((remote_ip, port))
    client.setblocking(0)   # set the socket is not blocking
    print "Socket connected to ip %s" % (remote_ip)
except socket.gaierror, e:  #address related error
    print "connected to server error%s" % e
    sys.exit()


# beat_count = 0

#send heart_beat
while True:
    # beat_count += 1 #heart_beat time

    host_name = socket.gethostname()
    # data_to_server = "ip: "+str(socket.gethostbyname(host_name))+",    stats: alive,   "+"pid: "+str(os.getpid())
    data_to_server = {'mac':mac, 'ip': ip, 'status': 'ON', 'pid': os.getpid()}
    data_dumped = json.dumps(data_to_server)
    try:
        client.sendall(data_dumped)
    except socket.error:
        print "Send failed!!"
        sys.exit()

    print 'I - ', os.getpid(), '- am alive.'
    time.sleep(60)
client.close()


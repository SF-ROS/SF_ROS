#!/usr/bin/python
#encoding:utf-8

'''
server
'''
import socket, sys, json
from thread import *
BUF_SIZE = 4096

HOST = socket.gethostname()
print(HOST)
PORT = 7878
try:
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
except socket.error, e:
    print "Error creating socket: %s" %e
    sys.exit()
try:
    server.bind(('192.168.1.102', PORT))
except socket.error:
    print "Bind failed!"
    sys.exit()
print "Socket bind complete"

server.listen(100)
print "Socket now listening"


def clientthread(coon):
    coon.send("Welcome to the server!")
    while True:
        try:
            data = coon.recv(BUF_SIZE)
            data_loaded = json.loads(data)
            print "mac: "+str(data_loaded['mac'])+"|ip: "+str(data_loaded['ip'])+" |status: "+data_loaded['status']+" |pid: "+str(data_loaded['pid'])
        except socket.error:
            print "One Client (IP: %s) Connected over!" % data_loaded['ip']
            break
    coon.close()


while True:
    coon, addr = server.accept()
    print "Connected with %s: %s " % (addr[0], str(addr[1]))
    start_new_thread(clientthread, (coon,))

server.close()


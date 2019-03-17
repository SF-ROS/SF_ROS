# !/usr/bin/env python
# -*- coding: utf-8 -*-

import serial
import time
import sys
import signal
import tty, termios

if __name__ == '__main__':

    # 等待串口连接
    while True:
        try:
            ser = serial.Serial("/dev/center_control", 9600, timeout=0.5)
            if ser:
                break
        except:
            print("串口未打开")
            time.sleep(1)

    while True:
        # 等待接收到串口发出的'1'后继续
        test = True
        if not ser.isOpen():
            ser.open()
        print(ser.port+'开始')
        s = None
        time.sleep(1)

        while True:

            fd = sys.stdin.fileno()
            old_settings = termios.tcgetattr(fd)
            try:
                tty.setraw(fd)
                ch = sys.stdin.read(1)
            finally:
                termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)

            if ch == 'q':
                ser.write('\x03')
            if ch == 'w':
                s = None
            elif ord(ch)==0x3:
                break

            ser.flushInput()
            while s != '1':

                ser.write('\x03')
                print('send 3')
                print('-----------------')
                time.sleep(0.5)

                s = ser.read(1)
                ser.flushInput()
                print('wait for 1')
                print('receive ' + s.strip())
                print('-----------------')
                s = s.strip()

            print(s=='1')
            s = None

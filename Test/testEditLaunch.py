# !/usr/bin/env python
# -*- coding: utf-8 -*-
import roslaunch
import rospy
import sys
import signal
import tty, termios


init_x = 0.8
init_y = 0.8
init_a = 0.8
launch_nav = None
nav_running = None

def quit(signum,frame):

    print('stop serialTest.py')
    sys.exit()

def setLaunchFile():

    with open('/home/sf/catkin_ws/src/arbotix_ros/mbot_navigation/launch/test.launch', 'r') as f:
        newText = f.read().replace('px__', str(init_x))
        newText = newText.replace('py__', str(init_y))
        newText = newText.replace('pa__', str(init_a))
    rospy.sleep(0.5)
    with open('/home/sf/catkin_ws/src/arbotix_ros/mbot_navigation/launch/amcl.launch', 'w') as f:
        f.write(newText)

def launch_nav_start():
    global launch_nav,nav_running
    if not nav_running:
        uuid_nav = roslaunch.rlutil.get_or_generate_uuid(None, False)
        roslaunch.configure_logging(uuid_nav)
        launch_nav = roslaunch.parent.ROSLaunchParent(uuid_nav, ["/home/sf/catkin_ws/src/arbotix_ros/mbot_navigation/launch/nav_cloister_demo.launch"])
        launch_nav.start()
        nav_running = True

def launch_nav_shutdown():
    global launch_nav, nav_running
    if nav_running:
        # save_pose()
        launch_nav.shutdown()
        nav_running = False

if __name__ == '__main__':

    signal.signal(signal.SIGINT, quit)
    signal.signal(signal.SIGTERM, quit)

    while True:
        signal.signal(signal.SIGINT, quit)
        signal.signal(signal.SIGTERM, quit)
        launch_nav_start()
        rospy.sleep(10)
        print('change launch File finished')
        # print('waiting for Q')
        #
        # fd = sys.stdin.fileno()
        # old_settings = termios.tcgetattr(fd)
        # try:
        #     tty.setraw(fd)
        #     ch = sys.stdin.read(1)
        # finally:
        #     termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)


        # if ch == 'q':
        # launch_nav_shutdown()
        setLaunchFile()
        rospy.sleep(0.5)
        print('try to restart nav')
        launch_nav.start()
        print('restart')
        rospy.sleep(1000)
        break
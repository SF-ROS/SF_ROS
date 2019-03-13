#!/usr/bin/env python
'''process_switch ROS Node'''
import rospy
from std_msgs.msg import String
import roslaunch
from geometry_msgs.msg import Pose
import tf
import os

state = 'idle'

init_x = 0.0
init_y = 0.0
init_a = 0.0
pose_locked = False
state_locked = False
mapping_running = False
launch_mapping = None

nav_running = False
launch_nav = None

track_running = False
launch_tracking = None

saving = False

LED_RED = '0'
LED_YELLOW = '1'
LED_GREEN = '2'
LED_CYAN = '3'
LED_BLUE = '4'
LED_PURPLE = '5'
LED_WHITE = '6'

def save_pose():
    global init_a, init_x, init_y, pose_locked

    while pose_locked:
        pass

    # print('test')
    pose_locked = True
    # print('init_x: {}'.format(init_x))
    # print('init_y: {}'.format(init_y))
    # print('init_a: {}'.format(init_a))
    newText = ''
    with open('/home/sf/caktin_ws/src/pkgser/launch/nav__.launch', 'r') as f:
        newText = f.read().replace('px__', str(init_x))
        newText = newText.replace('py__', str(init_y))
        newText = newText.replace('pa__', str(init_a))
    with open('/home/sf/caktin_ws/src/pkgser/launch/nav.launch', 'w') as f:
        f.write(newText)
    pose_locked = False

def launch_mapping_start():
    global launch_mapping, mapping_running
    if not mapping_running:
        uuid_mapping = roslaunch.rlutil.get_or_generate_uuid(None, False)
        launch_mapping = roslaunch.parent.ROSLaunchParent(uuid_mapping, ["/home/sf/caktin_ws/src/pkgser/launch/gmapping.launch"])
        launch_mapping.start()
        mapping_running = True

def launch_nav_start():
    global launch_nav, nav_running
    if not nav_running:
        uuid_nav = roslaunch.rlutil.get_or_generate_uuid(None, False)
        launch_nav = roslaunch.parent.ROSLaunchParent(uuid_nav, ["/home/sf/caktin_ws/src/pkgser/launch/nav.launch"])
        launch_nav.start()
        nav_running = True

def launch_tracking_start():
    global launch_tracking, track_running
    if not track_running:
        uuid_mapping = roslaunch.rlutil.get_or_generate_uuid(None, False)
        launch_tracking = roslaunch.parent.ROSLaunchParent(uuid_mapping, ["/home/sf/caktin_ws/src/pkgser/launch/track_people.launch"])
        launch_tracking.start()
        track_running = True

def launch_mapping_shutdown():
    global launch_mapping, mapping_running
    if mapping_running:
        save_pose()
        launch_mapping.shutdown()
        mapping_running = False

def launch_tracking_shutdown():
    global launch_tracking, track_running
    if track_running:
        save_pose()
        launch_tracking.shutdown()
        track_running = False
        
def launch_nav_shutdown():
    global launch_nav, nav_running
    if nav_running:
        save_pose()
        launch_nav.shutdown()
        nav_running = False


def callback(data):
    # rospy.loginfo(rospy.get_caller_id() + "I heard %s", data.data)
    # print(data.data)
    global state, state_locked
    while state_locked:
        pass
    state_locked = True

    state = data.data
    print('callback: {}'.format(state))
    state_locked = False

def callback_pose(pose):
    global init_x, init_y, init_a, pose_locked
    if not pose_locked:
        pose_locked = True
        init_x = pose.position.x
        init_y = pose.position.y
        (_, _, init_a) = tf.transformations.euler_from_quaternion([pose.orientation.x, pose.orientation.y, pose.orientation.z, pose.orientation.w])
        pose_locked = False


def listener():
    rospy.init_node('process_switch')
    rospy.Subscriber("/chatter", String, callback)

    rospy.Subscriber("/robot_pose", Pose, callback_pose)
    global state, mapping_running, saving, nav_running, track_running, state_locked

    while not rospy.is_shutdown():
        # continue
        state_locked = False
        rospy.sleep(0.1)
        while state_locked:
            pass
        state_locked = True
        # print('state is: {}'.format(state))

        if state == 'mapping':
            rospy.set_param('led_color',50)
            while saving:
                pass
            
            launch_nav_shutdown()
            launch_tracking_shutdown()

            launch_mapping_start()
            print('run mapping')

            print('\n##############################')
            print('state is {}'.format(state))
            print('nav_running is {}'.format(nav_running))
            print('mapping_running is {}'.format(mapping_running))
            print('track_running is {}'.format(track_running))
            print('##############################\n')
            state = 'idle'
        elif state == 'nav':
            rospy.set_param('led_color',49)
            while saving:
                pass
            
            launch_mapping_shutdown()
            launch_tracking_shutdown()

            launch_nav_start()
            print('run nav')

            print('\n##############################')
            print('state is {}'.format(state))
            print('nav_running is {}'.format(nav_running))
            print('mapping_running is {}'.format(mapping_running))
            print('track_running is {}'.format(track_running))
            print('##############################\n')
            state = 'idle'

        elif state == 'save':
            saving = True
            if mapping_running:
                os.system('rosrun map_server map_saver -f /home/sf/caktin_ws/src/pkgser/maps/maplocal')
            else:
                pass
            saving = False

            launch_mapping_shutdown()
            print('shutdown mapping')

            launch_nav_shutdown()
            print('shutdown nav')

            launch_tracking_shutdown()
            print('shutdown tracking')

            print('\n##############################')
            print('state is {}'.format(state))
            print('nav_running is {}'.format(nav_running))
            print('mapping_running is {}'.format(mapping_running))
            print('track_running is {}'.format(track_running))
            print('##############################\n')
            state = 'idle'

        elif state == 'stop':
            rospy.set_param('led_color',48)
            while saving:
                pass
            
            launch_mapping_shutdown()
            print('shutdown mapping')

            launch_nav_shutdown()
            print('shutdown nav')

            launch_tracking_shutdown()
            print('shutdown tracking')

            print('\n##############################')
            print('state is {}'.format(state))
            print('nav_running is {}'.format(nav_running))
            print('mapping_running is {}'.format(mapping_running))
            print('track_running is {}'.format(track_running))
            print('##############################\n')
            state = 'idle'

        elif state == 'shutdown':
            rospy.set_param('led_color',52)
            os.system('shutdown now -h')
            
        elif state == 'track_____':
            rospy.set_param('led_color',53)
            while saving:
                pass
            launch_mapping_shutdown()
            launch_nav_start()
            launch_tracking_start()

            print('\n##############################')
            print('state is {}'.format(state))
            print('nav_running is {}'.format(nav_running))
            print('mapping_running is {}'.format(mapping_running))
            print('track_running is {}'.format(track_running))
            print('##############################\n')
            state = 'idle'
    # spin() simply keeps python from exiting until this node is stopped
    # rospy.spin()
    print('process switch shutdown')


if __name__ == '__main__':
    try:
        listener()
    except rospy.ROSInterruptException:
        pass

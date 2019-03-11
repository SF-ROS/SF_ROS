# !/usr/bin/env python
# -*- coding: utf-8 -*-

import serial
import time
import roslib
import rospy
import actionlib
from std_msgs.msg import String
from actionlib_msgs.msg import *
from geometry_msgs.msg import Pose, PoseWithCovarianceStamped, Point, Quaternion, Twist
from move_base_msgs.msg import MoveBaseAction, MoveBaseGoal
from random import sample
from math import pow, sqrt
import json


class NavTest():

    def sendPose_callback(self, data):
        pose_list = json.loads(data.data)
        for index, pose in enumerate(pose_list):
            position = pose[1]['position']
            orientation = pose[1]['orientation']
            poseName = pose[0]
            self.locations[index] = Pose(Point(position['x'], position['y'], position['z']),
                                         Quaternion(orientation['x'], orientation['y'], orientation['z'], orientation['w']))
            self.pose_name[index] = poseName

    def sendTask_callback(self,data):
        self.task_list = json.loads(data.data)
        self.is_newTask = True
        print(self.task_list)


    def __init__(self):

        self.locations = dict()
        self.pose_name = dict()
        self.task_list = []
        self.current_task = 0
        self.is_newTask = True
        self.n_taskList = 0

        #等待串口连接
        while True:
            try:
                ser = serial.Serial("/dev/ttyUSB0", 9600, timeout=0.5)
                if ser:
                    break
            except:
                print("串口未打开")
                rospy.sleep(1)

        rospy.init_node('exploring_slam', anonymous=True)
        rospy.on_shutdown(self.shutdown)
        rospy.Subscriber("/sendPose", String, self.sendPose_callback)
        rospy.Subscriber("/sendTask",String,self.sendTask_callback)

        #速度0.2米每秒
        linear_speed = 0.2


        # 在每个目标位置暂停的时间 (单位：s)
        self.rest_time = rospy.get_param("~rest_time", 2)

        # 是否仿真？
        self.fake_test = rospy.get_param("~fake_test", True)

        # 到达目标的状态
        goal_states = ['PENDING', 'ACTIVE', 'PREEMPTED',
                       'SUCCEEDED', 'ABORTED', 'REJECTED',
                       'PREEMPTING', 'RECALLING', 'RECALLED',
                       'LOST']

        # 设置目标点的位置
        # 在rviz中点击 2D Nav Goal 按键，然后单击地图中一点
        # 在终端中就会看到该点的坐标信息

        # 发布控制机器人的消息
        self.cmd_vel_pub = rospy.Publisher('cmd_vel', Twist, queue_size=5)

        # 订阅move_base服务器的消息
        self.move_base = actionlib.SimpleActionClient("move_base", MoveBaseAction)

        rospy.loginfo("Waiting for move_base action server...")

        # 60s等待时间限制
        self.move_base.wait_for_server(rospy.Duration(60))
        rospy.loginfo("Connected to move base server")

        #当话题收到任务列表后继续
        while not self.task_list:
            rospy.sleep(1)

        #确保已经收到了坐标点
        while len(self.locations)<1:
            rospy.sleep(1)

        # 保存机器人的在rviz中的初始位置
        initial_pose = PoseWithCovarianceStamped()

        # 确保有初始位置
        while initial_pose.header.stamp == "":
            rospy.sleep(1)

        # #保存成功率、运行时间、和距离的变量
        # n_locations = len(self.locations)
        # n_goals = 0
        # n_successes = 0
        # i = n_locations
        # distance_traveled = 0
        # start_time = rospy.Time.now()
        # running_time = 0
        # location = ""
        # last_location = ""


        rospy.loginfo("Starting navigation task")

        #开始循环任务列表中的坐标点
        while not rospy.is_shutdown():

            if self.is_newTask:

                self.current_task = 0
                self.n_taskList = len(self.task_list)
                self.is_newTask = False

            if self.current_task == self.n_taskList:
                self.current_task = 0

            #等待接收到串口发出的'1'后继续
            test = True
            if not ser.isOpen():
                ser.open()
            print(ser.port)
            s = None
            rospy.sleep(1)
            # ser.flushInput()
            while s != '1':
                ser.write('\x03')
                print('send 3')
                print('-----------------')
                time.sleep(0.5)

                s = ser.read(10)
                print('wait for 1')
                print('receive ' + s.strip())
                print('-----------------')
                s = s.strip()
            print(s == '1')
            s = None


            # 设定下一个目标点
            self.goal = MoveBaseGoal()
            self.goal.target_pose.pose = self.locations[self.task_list[self.current_task]]
            self.goal.target_pose.header.frame_id = 'map'
            self.goal.target_pose.header.stamp = rospy.Time.now()

            rospy.loginfo("Going to: " + self.pose_name[self.task_list[self.current_task]])

            self.move_base.send_goal(self.goal)

            # 五分钟时间限制
            finished_within_time = self.move_base.wait_for_result(rospy.Duration(300))

            # 查看是否成功到达
            if not finished_within_time:
                self.move_base.cancel_goal()
                rospy.loginfo("Timed out achieving goal")
            else:
                rospy.loginfo("Arrived at: " + self.pose_name[self.task_list[self.current_task]])
                # ser.write('\x03')
                # print('send 3')

                if self.pose_name[self.task_list[self.current_task]] == 'C点':
                    move_cmd = Twist()
                    move_cmd.linear.x = -linear_speed
                    self.cmd_vel_pub.publish(move_cmd)
                    rospy.loginfo('开始后退')
                    rospy.sleep(5)

                    move_cmd.linear.x = 0
                    self.cmd_vel_pub.publish(move_cmd)
                    rospy.loginfo('开始充电')
                    rospy.sleep(5)

                    move_cmd.linear.x = linear_speed
                    self.cmd_vel_pub.publish(move_cmd)
                    rospy.loginfo('充电完成,开始复位')
                    rospy.sleep(5)

                    move_cmd.linear.x = 0
                    self.cmd_vel_pub.publish(move_cmd)
                    rospy.loginfo('恢复导航,闲置10秒')
                    rospy.sleep(10)


                self.current_task +=1

            rospy.sleep(self.rest_time)


        # # 开始主循环，随机导航
        # while not rospy.is_shutdown():
        #     # 如果已经走完了所有点，再重新开始排序
        #     if i == n_locations:
        #         i = 0
        #         sequence = sample(self.locations, n_locations)
        #
        #         # 如果最后一个点和第一个点相同，则跳过
        #         if sequence[0] == last_location:
        #             i = 1
        #
        #             # 在当前的排序中获取下一个目标点
        #     location = sequence[i]
        #
        #     # 跟踪行驶距离
        #     # 使用更新的初始位置
        #     if initial_pose.header.stamp == "":
        #         distance = sqrt(pow(self.locations[location].position.x -
        #                             self.locations[last_location].position.x, 2) +
        #                         pow(self.locations[location].position.y -
        #                             self.locations[last_location].position.y, 2))
        #     else:
        #         rospy.loginfo("Updating current pose.")
        #         distance = sqrt(pow(self.locations[location].position.x -
        #                             initial_pose.pose.pose.position.x, 2) +
        #                         pow(self.locations[location].position.y -
        #                             initial_pose.pose.pose.position.y, 2))
        #         initial_pose.header.stamp = ""
        #
        #         # 存储上一次的位置，计算距离
        #     last_location = location
        #
        #     # 计数器加1
        #     i += 1
        #     n_goals += 1
        #
        #     #等待接收到串口发出的'1'后继续
        #     test = True
        #     if not ser.isOpen():
        #         ser.open()
        #     print(ser.port)
        #     s = ''
        #     while s != '1':
        #         s = ser.read(10)
        #         time.sleep(1)
        #         print('wait for 1')
        #         s = s.strip()
        #     print(s == '1')
        #     s = ''
        #
        #     # 设定下一个目标点
        #     self.goal = MoveBaseGoal()
        #     self.goal.target_pose.pose = self.locations[location]
        #     self.goal.target_pose.header.frame_id = 'map'
        #     self.goal.target_pose.header.stamp = rospy.Time.now()
        #
        #     # 让用户知道下一个位置
        #     rospy.loginfo("Going to: " + str(location))
        #
        #     # 向下一个位置进发
        #     self.move_base.send_goal(self.goal)
        #
        #     # 五分钟时间限制
        #     finished_within_time = self.move_base.wait_for_result(rospy.Duration(300))
        #
        #     # 查看是否成功到达
        #     if not finished_within_time:
        #         self.move_base.cancel_goal()
        #         rospy.loginfo("Timed out achieving goal")
        #     else:
        #         state = self.move_base.get_state()
        #         if state == GoalStatus.SUCCEEDED:
        #             rospy.loginfo("Goal succeeded!")
        #             n_successes += 1
        #             distance_traveled += distance
        #             rospy.loginfo("State:" + str(state))
        #         else:
        #             rospy.loginfo("Goal failed with error code: " + str(goal_states[state]))
        #
        #             # 运行所用时间
        #     running_time = rospy.Time.now() - start_time
        #     running_time = running_time.secs / 60.0
        #
        #     # 输出本次导航的所有信息
        #     rospy.loginfo("Success so far: " + str(n_successes) + "/" +
        #                   str(n_goals) + " = " +
        #                   str(100 * n_successes / n_goals) + "%")
        #
        #     rospy.loginfo("Running time: " + str(trunc(running_time, 1)) +
        #                   " min Distance: " + str(trunc(distance_traveled, 1)) + " m")
        #
        #     rospy.sleep(self.rest_time)

    def update_initial_pose(self, initial_pose):
        self.initial_pose = initial_pose

    def shutdown(self):
        rospy.loginfo("Stopping the robot...")
        self.move_base.cancel_goal()
        rospy.sleep(2)
        self.cmd_vel_pub.publish(Twist())
        rospy.sleep(1)


def trunc(f, n):
    slen = len('%.*f' % (n, f))

    return float(str(f)[:slen])


if __name__ == '__main__':
    try:
        # 先开web服务 http 或者 socket 皆可，
        # 检测到有客户端连接，再构造NavTest
        
        NavTest()
        rospy.spin()

    except rospy.ROSInterruptException:
        rospy.loginfo("Exploring SLAM finished.")

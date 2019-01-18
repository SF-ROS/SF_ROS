#include "ros/ros.h"
#include <spencer_tracking_msgs/TrackedPersons.h>
#include <geometry_msgs/PoseStamped.h>
#include "std_msgs/String.h"
#include <iostream>
#include <tf/transform_datatypes.h>
#include <tf/tf.h>
#include <tf/transform_listener.h>
geometry_msgs::PoseStamped goal_pose;
geometry_msgs::PoseStamped goal_pose_last_in_map;

int tracked_id = 0;

bool id_inited = false;
bool update_flag = false;

bool dxy_init = false;
geometry_msgs::PoseStamped person_init_pose_in_map;
geometry_msgs::PoseStamped person_init_pose;
bool person_init_pose_flag = false;

geometry_msgs::Pose robot_init_pose;
geometry_msgs::Pose robot_current_pose;
double init_dx = 0;
double init_dy = 0;
double init_dtheta = 0;

void chatterCallback(const spencer_tracking_msgs::TrackedPersons& persons){
	goal_pose.header = persons.header;
	for(int i=0; i<persons.tracks.size(); i++){
		spencer_tracking_msgs::TrackedPerson track_i = persons.tracks[i];
		if(id_inited == false){
			tracked_id = track_i.track_id;
			std::cout << "tracking: " << tracked_id << std::endl;

			person_init_pose.pose = track_i.pose.pose;
			person_init_pose.header = persons.header;
			person_init_pose_flag = true;

			id_inited = true;
			dxy_init = true;
		}else{
			if(track_i.track_id == tracked_id && track_i.is_matched){
				goal_pose.pose = track_i.pose.pose;
				update_flag = true;
				break;
			}
		}
	}
}

void cb_pose(const geometry_msgs::Pose& pose){
	if(dxy_init){
		robot_init_pose = pose;
		dxy_init = false;
	}
	robot_current_pose = pose;
}

void re_init_cb(const std_msgs::String::ConstPtr& msg){
	if(msg->data == "retrack"){
		ROS_INFO("retrack");
		id_inited = false;
	}
}

int main(int argc, char *argv[])
{
	ros::init(argc, argv, "track");
	ros::NodeHandle n;

	ros::Subscriber sub = n.subscribe("/spencer/perception/tracked_persons_confirmed_by_HOG_or_upper_body", 1, chatterCallback);
	ros::Subscriber sub1 = n.subscribe("/robot_pose", 1, cb_pose);
	ros::Subscriber sub22 = n.subscribe("/chatter", 1, re_init_cb);

	ros::Publisher chatter_pub = n.advertise<geometry_msgs::PoseStamped>("/move_base_simple/goal", 1);

    tf::TransformListener listener;
	


	ros::Rate loop_rate(10); // 100ms
	int goal_time_count = 0;
	int goal_times = 10; // 1s
	while (ros::ok())
	{
		ros::spinOnce();

		goal_time_count++;
		if(goal_time_count >= goal_times){
			if(update_flag){
				if(person_init_pose_flag){
					listener.transformPose("map", person_init_pose, person_init_pose_in_map);
					person_init_pose_flag = false;
				}


				geometry_msgs::PoseStamped goal_pose_in_map;
				listener.transformPose("map", goal_pose, goal_pose_in_map);

				double dx = goal_pose_in_map.pose.position.x - 
							person_init_pose_in_map.pose.position.x;
				double dy = goal_pose_in_map.pose.position.y - 
							person_init_pose_in_map.pose.position.y;

				tf::Quaternion q1(robot_init_pose.orientation.x, robot_init_pose.orientation.y, 
				robot_init_pose.orientation.z, robot_init_pose.orientation.w);
				tf::Matrix3x3 m(q1);
				double roll, pitch, robot_init_yaw;
				m.getRPY(roll, pitch, robot_init_yaw);

				double init_dyaw = 0;
				double init_dx = person_init_pose_in_map.pose.position.x - robot_init_pose.position.x;
				double init_dy = person_init_pose_in_map.pose.position.y - robot_init_pose.position.y;
				init_dyaw = std::atan(init_dx/init_dy);

				double current_dyaw = 0;
				double current_dx = goal_pose_in_map.pose.position.x - robot_current_pose.position.x;
				double current_dy = goal_pose_in_map.pose.position.y - robot_current_pose.position.y;
				current_dyaw = std::atan(current_dx/current_dy);

				double target_yaw = robot_init_yaw - init_dyaw + current_dyaw;
				// if(target_yaw < 0) target_yaw += 2*3.14159;
				if(target_yaw > 3.14159) target_yaw -= 2*3.14159;

				// std::cout << "dx: " << dx << std::endl;
				// std::cout << "dy: " << dy << std::endl;
				// std::cout << "robot_init_yaw: " << robot_init_yaw << std::endl;
				// std::cout << "target_yaw: " << target_yaw << std::endl;

				tf::Quaternion q = tf::createQuaternionFromRPY(roll, pitch, target_yaw);
				goal_pose_in_map.pose.orientation.x = q[0];
				goal_pose_in_map.pose.orientation.y = q[1];
				goal_pose_in_map.pose.orientation.z = q[2];
				goal_pose_in_map.pose.orientation.w = q[3];

				goal_pose_in_map.pose.position.x = robot_init_pose.position.x + dx;
				goal_pose_in_map.pose.position.y = robot_init_pose.position.y + dy;

				double delta = 
				(goal_pose_in_map.pose.position.x - goal_pose_last_in_map.pose.position.x)*
				(goal_pose_in_map.pose.position.x - goal_pose_last_in_map.pose.position.x) +
				(goal_pose_in_map.pose.position.y - goal_pose_last_in_map.pose.position.y)*
				(goal_pose_in_map.pose.position.y - goal_pose_last_in_map.pose.position.y);
				delta = std::sqrt(delta);
				if( delta > 0.1){
					chatter_pub.publish(goal_pose_in_map);
					goal_pose_last_in_map = goal_pose_in_map;
					ROS_INFO("delta: %f", delta);
				}
				update_flag = false;
			}
			goal_time_count = 0;
		}
		loop_rate.sleep();
	}

	return 0;
}
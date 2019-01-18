#include <ros/ros.h>
#include <serial/serial.h> //ROS已经内置了的串口包
#include "pkgser/CRC.h"
#include "geometry_msgs/Twist.h"
#include "nav_msgs/Odometry.h"
#include "tf/transform_broadcaster.h"

#define LEN 0.482
#define K (1 / 0.127 / 3.1415926 * 60 * 15 * 10 / 20.0 * 10 )
using namespace std;

class MySerial{
    private:
    serial::Serial ser; //声明串口对象

    double posX , posY , posYaw;

    string port;

    int baud_rate;  //波特率

    int vel_int;

    short vel;

    double control_rate;

    ros::NodeHandle& nh_;

    ros::Subscriber sub;

    ros::Timer timer;

    ros::Publisher pub;

    tf::TransformBroadcaster br;

    double readLower(unsigned char addr){
        unsigned char data[8] = {addr , 0x03 , 0x00 , 0x22 , 0x00 , 0x01 , 0x00 , 0x00};
        unsigned char uchCRCHi=0xFF, uchCRCLo=0xFF;
        CRC16(data, 6, uchCRCHi, uchCRCLo);
        data[7] = uchCRCHi; data[6] = uchCRCLo; 
        ser.write(data , 8);
        ser.waitReadable();
        // ROS_INFO("available\t%d" , ser.available());
        unsigned char buff[7];
        ser.read(buff , ser.available());
        // ROS_INFO("ADD\t%d" , buff[2]);
        short d = 0;
        d = d | buff[3];
        d = d << 8;
        d = d | buff[4];
        double v = d / K;
        return v;



    }
    void sendVW(double v , double omega){
        short velRight = -(v + 0.5*omega*LEN) * K;   //This minus is caused by right wheel mounting
        short velLeft =  (v - 0.5*omega*LEN) * K;
        ROS_INFO("velRight\t%d" , int(velRight));
        ROS_INFO("velLeft\t%d" , int(velLeft));
        

        unsigned char uchCRCHi=0xFF, uchCRCLo=0xFF;
        unsigned char data1[8] = {0x03, 0x06, 0x00, 0x43, 0x00, 0x00, 0x00, 0x00};
        data1[4] = (unsigned char)(velRight >> 8);
        data1[5] = (unsigned char)(velRight & 0xff);
        CRC16(data1, 6, uchCRCHi, uchCRCLo);
        data1[7] = uchCRCHi; data1[6] = uchCRCLo; 

        uchCRCHi=0xFF; uchCRCLo=0xFF;
        unsigned char data2[8] = {0x02, 0x06, 0x00, 0x43, 0x00, 0x00, 0x00, 0x00};
        data2[4] = (unsigned char)(velLeft >> 8);
        data2[5] = (unsigned char)(velLeft & 0xff);
        CRC16(data2, 6, uchCRCHi, uchCRCLo);
        data2[7] = uchCRCHi; data2[6] = uchCRCLo; 

    
        ser.write(data1, 8);
        ser.waitReadable();
        // ROS_INFO("available\t%d" , ser.available());
        if(ser.available()) ser.read(ser.available());

        ser.write(data2, 8);
        ser.waitReadable();
        // ROS_INFO("available\t%d" , ser.available());
        if(ser.available()) ser.read(ser.available());
        
    }

    void controlCallBack(const geometry_msgs::Twist& cmd_vel){
        double v = cmd_vel.linear.x;
        double omega = cmd_vel.angular.z;
        // ROS_INFO("V\t%f" , v);
        // ROS_INFO("Omega\t%f" , omega);
        sendVW(v , omega);
        // unsigned char* d;
        // ser.read(d , ser.available());
    }

    void readCallback(const ros::TimerEvent& event){
        // double DT = 0.1;   //Important Error source, not accurate 0.１
        ros::Duration d = event.current_real - event.last_real;
        double DT = d.toSec();
        if(DT > 10) return;
        
        ROS_INFO("DT\t%f" , DT);

        double vr =  - readLower(0x03);
        double vl =  readLower(0x02);
        // double vr =  0;
        // double vl = 0;


        double velRobot = (vr + vl) / 2;
        double omegaRobor = (vr - vl) / LEN;
        ROS_INFO("V\t%f" , velRobot);
        ROS_INFO("Omega\t%f" , omegaRobor);
        
        nav_msgs::Odometry odom;
        odom.twist.twist.linear.x = velRobot;
        odom.twist.twist.angular.z = omegaRobor;
        posX += velRobot * cos(posYaw) * DT;
        posY += velRobot * sin(posYaw) * DT;
        posYaw += omegaRobor * DT;

        odom.child_frame_id = "base_footprint";
        odom.header.frame_id = "odom";
        odom.header.stamp = ros::Time::now();
        odom.pose.pose.position.x = posX;
        odom.pose.pose.position.y = posY;
        
        odom.pose.pose.orientation.x = tf::createQuaternionFromYaw(posYaw).getX();
        odom.pose.pose.orientation.y = tf::createQuaternionFromYaw(posYaw).getY();
        odom.pose.pose.orientation.z = tf::createQuaternionFromYaw(posYaw).getZ();
        odom.pose.pose.orientation.w = tf::createQuaternionFromYaw(posYaw).getW();
        
        pub.publish(odom);

        tf::Transform transform;
        transform.setOrigin(tf::Vector3(posX , posY , 0));
        tf::Quaternion q;
        q.setRPY(0, 0, posYaw);
        transform.setRotation(q);
        br.sendTransform(tf::StampedTransform(transform , ros::Time::now() , "odom" , "base_footprint"));

        
        
        

        // ROS_INFO("vr\t%f" , vr);
        // ROS_INFO("vl\t%f" , vl);
        

    }

    public:
    MySerial(ros::NodeHandle nh) : nh_(nh){
        posX = 0.0;  posY = 0.0;  posYaw = 0.0; 
        ros::NodeHandle private_nh("motor");
        private_nh.param("port", port, string("/dev/ttyUSB0"));
        private_nh.param("baud_rate", baud_rate, 9600);
        private_nh.param("control_rate", control_rate, 10.0);
        sub = nh_.subscribe("/cmd_vel" , 10 , &MySerial::controlCallBack , this);
        timer = nh_.createTimer(ros::Duration(0.01), &MySerial::readCallback , this);
        pub = nh_.advertise<nav_msgs::Odometry>("/odom" , 1);
    }

    int init(){
        try
        {
            //设置串口属性，并打开串口
            ser.setPort(port);
            ser.setParity(serial::parity_odd);
            ser.setBaudrate(baud_rate);
            serial::Timeout to = serial::Timeout::simpleTimeout(1000);
            ser.setTimeout(to);
            ser.open();
        }
        catch (serial::IOException &e)
        {
            ROS_INFO(e.what());
            ROS_ERROR("Unable to open port ");
            return -1;
        }

        //检测串口是否已经打开，并给出提示信息
        if (ser.isOpen())
        {
            ROS_INFO("Serial Port initialized");
        }
        else
        {
            return -1;
        }
    }

};





int main(int argc, char **argv)
{
    ros::init(argc, argv, "serial_motor");
    ros::NodeHandle nh;
    MySerial ms(nh);
    if(ms.init() == -1){
        ROS_ERROR("SERIAL INIT FAIL");
        return -1;
    } 
        
    ros::spin();
    
    return 1;
}
#include <ros/ros.h>
#include <serial/serial.h> //ROS已经内置了的串口包
#include <iostream>
#include "std_msgs/Float64.h"

#define LED_RED '0'
#define LED_YELLOW '1'
#define LED_GREEN '2'
#define LED_CYAN '3'
#define LED_BLUE '4'
#define LED_PURPLE '5'
#define LED_WHITE '6'



using namespace std;

class MyLED{
    private:
    serial::Serial ser; //声明串口对象
    
    ros::NodeHandle& nh_;
    
    int baud_rate;
    
    string port;

    // ros::Timer timer_read;

    ros::Timer timer_send;

    ros::Publisher pub_vol;


    void readVoltage(const ros::TimerEvent& event){
        //data size 6
        

        unsigned char buff[7];
        ser.waitReadable();
        if(ser.available() < 6){
            if(ser.available()) ser.read(ser.available());
        }else{
            ser.read(buff , ser.available());
            string str = string((char*)buff);
            double v = atof((char*)buff);
            std_msgs::Float64 vol;
            vol.data = v;
            pub_vol.publish(vol);

            // cout << v;



        }
        // ROS_INFO("available\t%d" , ser.available());
    }

    void sendColor(const ros::TimerEvent& event){
        // unsigned char color = LED_GREEN;
        int color;
        nh_.param("led_color", color, int(LED_PURPLE));

        // unsigned char color = LED_GREEN;
        unsigned char col_un = color;
        ser.write(&col_un , 1);
        // ser.waitReadable();
        // if(ser.available()) ser.read(ser.available());
    }



    public:
    MyLED(ros::NodeHandle nh) : nh_(nh){
        port = "/dev/led";
        baud_rate = 9600;
        // timer_read = nh_.createTimer(ros::Duration(0.5), &MyLED::readVoltage , this);
        timer_send = nh_.createTimer(ros::Duration(0.5), &MyLED::sendColor , this);
        pub_vol = nh_.advertise<std_msgs::Float64>("/voltage" , 1);

    }

    int init(){
        try
        {
            //设置串口属性，并打开串口
            ser.setPort(port);
            ser.setParity(serial::parity_none);
            // ser.setParity(serial:);

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
    ros::init(argc, argv, "serial_led");
    ros::NodeHandle nh;
    MyLED led(nh);
    if(led.init() == -1){
        ROS_ERROR("SERIAL INIT FAIL");
        return -1;
    } 
        
    ros::spin();
    
    return 1;
}
cmake_minimum_required(VERSION 2.8.3)
project(pkgser)

## Compile as C++11, supported in ROS Kinetic and newer
# add_compile_options(-std=c++11)

## Find catkin macros and libraries
## if COMPONENTS list like find_package(catkin REQUIRED COMPONENTS xyz)
## is used, also find other catkin packages
find_package(catkin REQUIRED COMPONENTS
  roscpp
  serial
  std_msgs
  sensor_msgs
  tf
)


catkin_package(
#  INCLUDE_DIRS include
#  LIBRARIES pkgser
#  CATKIN_DEPENDS roscpp serial std_msgs
#  DEPENDS system_lib
)

include_directories(
  include ${catkin_INCLUDE_DIRS}
  src
  include
  ${catkin_INCLUDE_DIRS}
)

add_executable(motor 
  src/motor.cpp
  src/CRC.cpp
)
target_link_libraries(motor
  ${catkin_LIBRARIES}
)

add_executable(led 
  src/led.cpp
)
target_link_libraries(led
  ${catkin_LIBRARIES}
)


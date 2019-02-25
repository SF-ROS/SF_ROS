/**
 * @author Russell Toris - rctoris@wpi.edu
 * @author Lars Kunze - l.kunze@cs.bham.ac.uk
 * @author Raffaello Bonghi - raffaello.bonghi@officinerobotiche.it
 */
var NAV2D = NAV2D || {
    REVISION: '0.3.0'
};

NAV2D.ImageMapClientNav = function(options) {
  var that = this;
  options = options || {};
  var ros = options.ros;	
  var tfClient = options.tfClient || null;
  var topic = options.topic || '/map_metadata';
  var robot_pose = options.robot_pose || '/robot_pose';
  var image_map = options.image_map;
  var image = options.image || false;
  var serverName = options.serverName || '/move_base';
  var actionName = options.actionName || 'move_base_msgs/MoveBaseAction';
  var rootObject = options.rootObject || new createjs.Container();
  var viewer = options.viewer;
  var withOrientation = options.withOrientation || false;
  var old_state = null;

  // setup a client to get the map
  var client = new ROS2D.ImageMapClient({
    ros : ros,
    rootObject : rootObject,
    topic : topic,
    image : image_map
  });

  this.navigator = new NAV2D.Navigator({
    ros: ros,
    tfClient: tfClient,
    serverName: serverName,
    actionName: actionName,
    robot_pose : robot_pose,
    rootObject: rootObject,
    withOrientation: withOrientation,
    image: image,
  });

  client.on('change', function() {
    // scale the viewer to fit the map
    old_state = NAV2D.resizeMap(old_state, viewer, client.currentGrid);
  });
};


/**
 * A navigator can be used to add click-to-navigate options to an object. If
 * withOrientation is set to true, the user can also specify the orientation of
 * the robot by clicking at the goal position and pointing into the desired
 * direction (while holding the button pressed).
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * tfClient (optional) - the TF client
 *   * robot_pose (optional) - the robot topic or TF to listen position
 *   * serverName (optional) - the action server name to use for navigation, like '/move_base'
 *   * actionName (optional) - the navigation action name, like 'move_base_msgs/MoveBaseAction'
 *   * rootObject (optional) - the root object to add the click listeners to and render robot markers to
 *   * withOrientation (optional) - if the Navigator should consider the robot orientation (default: false)
 */
NAV2D.Navigator = function(options) {
  var that = this;
  options = options || {};
  var ros = options.ros;
  var tfClient = options.tfClient || null;
  var robot_pose = options.robot_pose || '/robot_pose';
  var serverName = options.serverName || '/move_base';
  var actionName = options.actionName || 'move_base_msgs/MoveBaseAction';
  var withOrientation = options.withOrientation || false;
  var use_image = options.image;
  this.rootObject = options.rootObject || new createjs.Container();
  
  this.goalMarker = null;
  var currentGoal;

  // setup the actionlib client
  var actionClient = new ROSLIB.ActionClient({
    ros : ros,
    actionName : actionName,
    serverName : serverName
  });

  var sendGoalTopic = new ROSLIB.Topic({
    ros : ros,
    name : '/sendGoal',
    messageType : 'std_msgs/String'
  });

  this.sendMessage = function(dataObj) {
    var msg = new ROSLIB.Message({
      data: JSON.stringify(dataObj)
    })
    console.log(JSON.stringify(dataObj))
    sendGoalTopic.publish(msg)
  }

  /**
   * Send a goal to the navigation stack with the given pose.
   *
   * @param pose - the goal pose
   * @param callback - the callback function
   * 
   */

  this.createGoal = function(pose, callback) {
    // create a goal
    var goal = new ROSLIB.Goal({
      actionClient : actionClient,
      goalMessage : {
        target_pose : {
          header : {
            frame_id : '/map'
          },
          pose : pose
        }
      }
    });
    goal.on('result', callback);
    return goal
  }

  this.showPose = function(pose, i) {

    // create a marker for the goal
    var goalMarker = new ROS2D.NavigationArrow({
        size: 15,
        strokeSize: 1,
        fillColor: createjs.Graphics.getRGB(0, 255, 0, 0.66),
        pulse: false
    });
    goalMarker.x = pose.position.x;
    goalMarker.y = -pose.position.y;
    goalMarker.rotation = stage.rosQuaternionToGlobalTheta(pose.orientation);
    goalMarker.scaleX = 1.0 / stage.scaleX;
    goalMarker.scaleY = 1.0 / stage.scaleY;

    if (i == null){
      i="";
    }
    var tt = new createjs.Text(i,"10px Arial","#000000");
    tt.x = pose.position.x-0.1;
    tt.y = -pose.position.y-0.1;
    tt.scaleX = 1.0 / stage.scaleX;
    tt.scaleY = 1.0 / stage.scaleY;

    that.rootObject.addChild(goalMarker);
    that.rootObject.addChild(tt);
  }


  /**
   * Cancel the currently active goal.
   */
  this.cancelGoal = function () {
    if (typeof that.currentGoal !== 'undefined') {
      that.currentGoal.cancel();
    }
  };

  // get a handle to the stage
  var stage;
  if (that.rootObject instanceof createjs.Stage) {
    stage = that.rootObject;
  } else {
    stage = that.rootObject.getStage();
  }

  // marker for the robot
  var robotMarker = null;
  if (use_image && ROS2D.hasOwnProperty('ImageNavigator')) {
    robotMarker = new ROS2D.ImageNavigator({
      size: 2.5,
      image: use_image,
      pulse: true
    });
  } else {
    robotMarker = new ROS2D.NavigationArrow({
      size : 20,
      strokeSize : 1,
      fillColor : createjs.Graphics.getRGB(255, 128, 0, 0.66),
      pulse : true
    });
  }

  // wait for a pose to come in first
  robotMarker.visible = false;
  this.rootObject.addChild(robotMarker);
  var initScaleSet = false;

  var updateRobotPosition = function(pose, orientation) {
    // update the robots position on the map
    robotMarker.x = pose.x;
    robotMarker.y = -pose.y;
    if (!initScaleSet) {
      robotMarker.scaleX = 1.0 / stage.scaleX;
      robotMarker.scaleY = 1.0 / stage.scaleY;
      initScaleSet = true;
    }
    // change the angle
    robotMarker.rotation = stage.rosQuaternionToGlobalTheta(orientation);
    // Set visible
    robotMarker.visible = true;
  };

  if(tfClient !== null) {
    tfClient.subscribe(robot_pose, function(tf) {
      updateRobotPosition(tf.translation,tf.rotation);
    });
  } else {
    // setup a listener for the robot pose
    var poseListener = new ROSLIB.Topic({
      ros: ros,
      name: robot_pose,
      messageType: 'geometry_msgs/Pose',
      throttle_rate: 100
    });
    poseListener.subscribe(function(pose) {
      updateRobotPosition(pose.position,pose.orientation);
    });
  }
  
  if (withOrientation === false){
    // setup a double click listener (no orientation)
    this.rootObject.addEventListener('dblclick', function(event) {
      // convert to ROS coordinates
      var coords = stage.globalToRos(event.stageX, event.stageY);
      var pose = new ROSLIB.Pose({
        position : new ROSLIB.Vector3(coords)
      });

      that.showPose(pose);
    });
  } else { // withOrientation === true
    // setup a click-and-point listener (with orientation)
    var position = null;
    var positionVec3 = null;
    var thetaRadians = 0;
    var thetaDegrees = 0;
    var orientationMarker = null;
    var mouseDown = false;
    var xDelta = 0;
    var yDelta = 0;

    var mouseEventHandler = function(event, mouseState) {

      if (mouseState === 'down'){
        // get position when mouse button is pressed down
        position = stage.globalToRos(event.stageX, event.stageY);
        positionVec3 = new ROSLIB.Vector3(position);
        mouseDown = true;
      }
      else if (mouseState === 'move'){
        // remove obsolete orientation marker
        that.rootObject.removeChild(orientationMarker);

        if ( mouseDown === true) {
          // if mouse button is held down:
          // - get current mouse position
          // - calulate direction between stored <position> and current position
          // - place orientation marker
          var currentPos = stage.globalToRos(event.stageX, event.stageY);
          var currentPosVec3 = new ROSLIB.Vector3(currentPos);

          if (use_image && ROS2D.hasOwnProperty('ImageNavigator')) {
            orientationMarker = new ROS2D.ImageNavigator({
              size: 2.5,
              image: use_image,
              alpha: 0.7,
              pulse: false
            });
          } else {
            orientationMarker = new ROS2D.NavigationArrow({
              size : 25,
              strokeSize : 1,
              fillColor : createjs.Graphics.getRGB(0, 255, 0, 0.66),
              pulse : false
            });
          }

          xDelta =  currentPosVec3.x - positionVec3.x;
          yDelta =  currentPosVec3.y - positionVec3.y;

          thetaRadians  = Math.atan2(xDelta,yDelta);

          thetaDegrees = thetaRadians * (180.0 / Math.PI);

          if (thetaDegrees >= 0 && thetaDegrees <= 180) {
            thetaDegrees += 270;
          } else {
            thetaDegrees -= 90;
          }

          orientationMarker.x =  positionVec3.x;
          orientationMarker.y = -positionVec3.y;
          orientationMarker.rotation = thetaDegrees;
          orientationMarker.scaleX = 1.0 / stage.scaleX;
          orientationMarker.scaleY = 1.0 / stage.scaleY;

          that.rootObject.addChild(orientationMarker);
        }
      } else if (mouseDown) { // mouseState === 'up'
        // if mouse button is released
        // - get current mouse position (goalPos)
        // - calulate direction between stored <position> and goal position
        // - set pose with orientation
        // - send goal
        mouseDown = false;

        var goalPos = stage.globalToRos(event.stageX, event.stageY);

        var goalPosVec3 = new ROSLIB.Vector3(goalPos);

        xDelta =  goalPosVec3.x - positionVec3.x;
        yDelta =  goalPosVec3.y - positionVec3.y;

        thetaRadians  = Math.atan2(xDelta,yDelta);

        if (thetaRadians >= 0 && thetaRadians <= Math.PI) {
          thetaRadians += (3 * Math.PI / 2);
        } else {
          thetaRadians -= (Math.PI/2);
        }

        var qz =  Math.sin(-thetaRadians/2.0);
        var qw =  Math.cos(-thetaRadians/2.0);

        var orientation = new ROSLIB.Quaternion({x:0, y:0, z:qz, w:qw});

        var pose = new ROSLIB.Pose({
          position :    positionVec3,
          orientation : orientation
        });

        //加入app的data中
        app.temp_pose_list.push(['',pose]);

        // send the goal
        that.showPose(pose);
      }
    };

    this.rootObject.addEventListener('stagemousedown', function(event) {
      mouseEventHandler(event,'down');
    });

    this.rootObject.addEventListener('stagemousemove', function(event) {
      mouseEventHandler(event,'move');
    });

    this.rootObject.addEventListener('stagemouseup', function(event) {
      mouseEventHandler(event,'up');
    });
  }
};




NAV2D.OccupancyGridClientNav = function (options) {
    var that = this;
    options = options || {};
    state = options.state || {}
    this.ros = options.ros;
    var topic = options.topic || '/map';
    var continuous = options.continuous;
    this.serverName = options.serverName || '/move_base';
    this.actionName = options.actionName || 'move_base_msgs/MoveBaseAction';
    this.rootObject = options.rootObject || new createjs.Container();
    this.viewer = options.viewer;
    this.withOrientation = options.withOrientation || false;
    
    this.navigator = null;
     // ��Ӧ�ƶ��˵��޸� ��ʼ
    // setup a client to get the map
    var client = new ROS2D.OccupancyGridClient({
        ros: this.ros,
        rootObject: this.rootObject,
        continuous: continuous,
        topic: topic
    });

    client.on('change', function () {
        that.navigator = new NAV2D.Navigator({
            ros: that.ros,
            serverName: that.serverName,
            actionName: that.actionName,
            rootObject: that.rootObject,
            withOrientation: that.withOrientation
        });
        
        state.navigator = that.navigator
        // scale the viewer to fit the map
        that.viewer.scaleToDimensions(client.currentGrid.width, client.currentGrid.height);
        that.viewer.shift(client.currentGrid.pose.position.x, client.currentGrid.pose.position.y);
    });
};

function isatpc() {
    var userAgentInfo = navigator.userAgent;
    var Agents = ["Android", "iPhone",
        "SymbianOS", "Windows Phone",
        "iPad", "iPod"];
    var flag = true;
    for (var v = 0; v < Agents.length; v++) {
        if (userAgentInfo.indexOf(Agents[v]) > 0) {
            flag = false;
            break;
        }
    }
    return flag;
}

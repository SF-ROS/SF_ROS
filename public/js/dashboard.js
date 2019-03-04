var showmodechange = false;
var velocity = 0.2; // 小车的直线速度
var omega = 0.4; // 小车的角速度
// var moveinterval = 200;
var mainviewrnum = 3;
var robostate = 4; // 下位机模式
var droped = 0;
var ismapping = false;
var firsttrace = true;

var sight_x = 0;
var sight_y = 0;

var ros = new ROSLIB.Ros({
    url: 'ws://192.168.1.102:9090' //'ws://172.20.10.4:9090' // 10.161.192.175 // 192.168.1.3
}); // websocket下位机IP地址
var cmdVel = new ROSLIB.Topic({
    ros: ros,
    name: '/cmd_vel',
    messageType: 'geometry_msgs/Twist'
});
var twist = new ROSLIB.Message({
    linear: {
        x: 0.0,
        y: 0.0,
        z: 0.0
    },
    angular: {
        x: 0.0,
        y: 0.0,
        z: 0.0
    }
});
var chatter = new ROSLIB.Topic({
    ros: ros,
    name: '/chatter',
    messageType: 'std_msgs/String'
}); // 模式topic
var str_map = new ROSLIB.Message({
    data: 'mapping'
});
var str_nav = new ROSLIB.Message({
    data: 'nav'
});
var str_save = new ROSLIB.Message({
    data: 'save'
});
var str_stop = new ROSLIB.Message({
    data: 'stop'
});
var str_track = new ROSLIB.Message({
    data: 'track'
});
var str_retrack = new ROSLIB.Message({
    data: 'retrack'
});
var str_poweroff = new ROSLIB.Message({
    data: 'shutdown'
});
var listener = new ROSLIB.Topic({
    ros: ros,
    name: '/odom',
    messageType: 'nav_msgs/Odometry'
});
var listener_simplegoal = new ROSLIB.Topic({
    ros: ros,
    name: '/move_base_simple/goal',
    messageType: 'geometry_msgs/PoseStamped'
});
var listener_robotpose = new ROSLIB.Topic({
    ros: ros,
    name: '/robot_pose',
    messageType: 'geometry_msgs/Pose'
});
$(document).ready(function () {
    var titleofpj = $("#navtopheadtitle");
    var sidemenuitems = $(".nav-sidebar > li > a");
    var sidemenuactiveitem = $(".nav-sidebar > .active > a");
    var table_tr_odd = $(".table-striped tbody > tr:nth-of-type(odd)");
    var table_tr = $(".table-hover tbody > tr");
    var dropmenuitems = $("#navdrop > li > a");
    var dropmenuactiveitem = $("#navdrop > .active > a");
    var dropbtn = $("#navbtn");
    var dropmenu = $("#navdrop");

    var table_actvel = $("#tb_vel");
    var table_actdir = $("#tb_dir");
    var table_actxy = $("#tb_xy");

    var div_map = $("#map_map");
    var div_nav = $("#nav_map");

    var btn_emergencystop = $("#embtn");
    var dropmenu_motion = $("#drop_motion");
    var dropmenu_map = $("#drop_map");
    var dropmenu_nav = $("#drop_nav");
    var dropmenu_trace = $("#drop_trace");
    var dropmenu_params = $("#drop_params");

    var sidemenu_motion = $("#sidebar_motion");
    var sidemenu_map = $("#sidebar_map");
    var sidemenu_nav = $("#sidebar_nav");
    var sidemenu_trace = $("#sidebar_trace");
    var sidemenu_params = $("#sidebar_params");

    var motionbtn_forward = $("#motion_moveforward");
    var motionbtn_back = $("#motion_moveback");
    var motionbtn_left = $("#motion_turnleft");
    var motionbtn_right = $("#motion_turnright");
    var motionbtn_softstop = $("#motion_softstop");
    var motionbtn_forwardC = $("#motion_moveforwardcontainer");
    var motionbtn_backC = $("#motion_movebackcontainer");
    var motionbtn_leftC = $("#motion_turnleftcontainer");
    var motionbtn_rightC = $("#motion_turnrightcontainer");
    var motionbtn_softstopC = $("#motion_softstopcontainer");

    var mapbtn_forward = $("#map_moveforward");
    var mapbtn_back = $("#map_moveback");
    var mapbtn_left = $("#map_turnleft");
    var mapbtn_right = $("#map_turnright");
    var mapbtn_softstop = $("#map_softstop");
    var mapbtn_choosemapping = $("#map_mapping");
    var mapbtn_choosemappingstop = $("#map_mapping_stop");

    var shut_down = $("#poweroff");
    var retrackbtn = $("#retrack");
    var tracepic = $("#trace_pic");


    listener.subscribe(function (message) {
        var act_vel = message.twist.twist.linear.x;
        var act_ang = message.twist.twist.angular.z;
        var act_dir_sin = message.pose.pose.orientation.z;
        var act_dir_cos = message.pose.pose.orientation.w;
        var act_dir = Math.atan2(act_dir_sin, act_dir_cos) / Math.PI * 360.0;
        var act_x = message.pose.pose.position.x;
        var act_y = message.pose.pose.position.y;
        table_actvel.html("(" + act_vel.toFixed(2) + ", " + act_ang.toFixed(2) + ")");
        table_actdir.html(act_dir.toFixed(2));
        table_actxy.html("(" + act_x.toFixed(2) + ", " + act_y.toFixed(2) + ")");
    });

    listener_simplegoal.subscribe(function (message) {
        sight_x = message.pose.position.x;
        sight_y = message.pose.position.y;
    });
    listener_robotpose.subscribe(function (message) {
        var delta_x = sight_x - message.position.x;
        var delta_y = sight_y - message.position.y;
        $("#trace_distx").html(delta_x.toFixed(2));
        $("#trace_disty").html(delta_y.toFixed(2));
    });

    // ROS websocket connecting
    ros.on('connection', function () {
        console.log('Connected to websocket server.');
    });

    ros.on('error', function (error) {
        console.log('Error connecting to websocket server: ', error);
    });

    ros.on('close', function () {
        console.log('Connection to websocket server closed.');
    });

    //设置桌面端的布局样式
    if (ispc()) { // 桌面端 or 移动端
        titleofpj.hover(function () {
            this.style.color = '#f2473d';
        }, function () {
            this.style.color = '#e5483c';
        });
        sidemenuitems.hover(function () {
            this.style.backgroundColor = '#ffdebe';
        }, function () {
            if (document.activeElement !== this) {
                this.style.backgroundColor = '#fff0cd';
            }
        });
        sidemenuitems.focus(function () {
            sidemenuitems.css("background-color", '#fff0cd');
            sidemenuactiveitem.css("background-color", '#ffa676');
            this.style.backgroundColor = '#ffdebe';
        });
        sidemenuactiveitem.hover(function () {
            this.style.color = '#fffa08';
            this.style.backgroundColor = '#ffa676';
        });
        sidemenuactiveitem.focus(function () {
            sidemenuitems.css("background-color", '#fff0cd');
            sidemenuactiveitem.css("background-color", '#ffa676');
        });
        motionbtn_softstop.hover(function () {
            this.style.color = '#f90000';
        }, function () {
            this.style.color = '#dc0000';
        });
        mapbtn_softstop.hover(function () {
            this.style.color = '#f90000';
        }, function () {
            this.style.color = '#dc0000';
        });
        motionbtn_left.hover(function () {
            this.style.color = '#6cd56f';
        }, function () {
            this.style.color = '#4e9a50';
        });
        motionbtn_right.hover(function () {
            this.style.color = '#6cd56f';
        }, function () {
            this.style.color = '#4e9a50';
        });
        mapbtn_left.hover(function () {
            this.style.color = '#6cd56f';
        }, function () {
            this.style.color = '#4e9a50';
        });
        motionbtn_forward.hover(function () {
            this.style.color = '#3887c9';
        }, function () {
            this.style.color = '#3176b0';
        });
        motionbtn_back.hover(function () {
            this.style.color = '#3887c9';
        }, function () {
            this.style.color = '#3176b0';
        });
        mapbtn_forward.hover(function () {
            this.style.color = '#3887c9';
        }, function () {
            this.style.color = '#3176b0';
        });
        mapbtn_back.hover(function () {
            this.style.color = '#15e2cc';
        }, function () {
            this.style.color = '#13c8b4';
        });
        mapbtn_right.hover(function () {
            this.style.color = '#ebe90e';
        }, function () {
            this.style.color = '#d9d70e';
        });
        table_tr.hover(function () {
            this.style.backgroundColor = "#fbf2e8";
        }, function () {
            this.style.backgroundColor = "#FAFAFA";
        });
        table_tr_odd.hover(function () {
            this.style.backgroundColor = "#fbf2e8";
        }, function () {
            this.style.backgroundColor = "#faf6f1";
        });
        dropmenuitems.hover(function () {
            this.style.backgroundColor = '#ffdebe';
        }, function () {
            if (document.activeElement !== this) {
                this.style.backgroundColor = '#fff0cd';
            }
        });
        dropmenuitems.focus(function () {
            dropmenuitems.css("background-color", '#fff0cd');
            dropmenuactiveitem.css("background-color", '#ffa676');
            this.style.backgroundColor = '#ffdebe';
        });
        dropmenuactiveitem.hover(function () {
            this.style.color = '#fffa08';
            this.style.backgroundColor = '#ffa676';
        });
        dropmenuactiveitem.focus(function () {
            dropmenuitems.css("background-color", '#fff0cd');
            dropmenuactiveitem.css("background-color", '#ffa676');
        });
        mapbtn_choosemapping.hover(function () {
            this.style.color = '#f0960e';
        }, function () {
            if (!ismapping) {
                this.style.color = '#d9880d';
            }
        });
        mapbtn_choosemapping.on("click", function () {
            ismapping = true;
            this.style.display = "none";
            mapbtn_choosemappingstop.css("display", "block");
            sendmode(1);
            robostate = 1;
        });
        mapbtn_choosemappingstop.hover(function () {
            this.style.color = '#df28f4';
        }, function () {
            if (ismapping) {
                this.style.color = '#b420c5';
            }
        });
        mapbtn_choosemappingstop.on("click", function () {
            ismapping = false;
            this.style.display = "none";
            mapbtn_choosemapping.css("display", "block");
            sendmode(3);
            robostate = 4;
        });

        btn_emergencystop.on("click", emergencystop);
        dropmenu_motion.on("click", main_motion_clicked);
        dropmenu_map.on("click", main_map_clicked);
        dropmenu_nav.on("click", main_nav_clicked);
        dropmenu_trace.on("click", main_trace_clicked);
        dropmenu_params.on("click", main_params_clicked);

        sidemenu_motion.on("click", main_motion_clicked);
        sidemenu_map.on("click", main_map_clicked);
        sidemenu_nav.on("click", main_nav_clicked);
        sidemenu_trace.on("click", main_trace_clicked);
        sidemenu_params.on("click", main_params_clicked);

        motionbtn_forward.on("mousedown", function () {
            controltomove(velocity, 0.0);
        });
        motionbtn_back.on("mousedown", function () {
            controltomove(-velocity, 0.0);
        });
        motionbtn_left.on("mousedown", function () {
            controltomove(velocity, omega);
        });
        motionbtn_right.on("mousedown", function () {
            controltomove(velocity, -omega);
        });

        motionbtn_forward.on("mouseup", softstop);
        motionbtn_back.on("mouseup", softstop);
        motionbtn_left.on("mouseup", softstop);
        motionbtn_right.on("mouseup", softstop);
        motionbtn_softstop.on("click", softstop);

        mapbtn_forward.on("mousedown", function () {
            controltomove(velocity, 0.0);
        });
        mapbtn_back.on("mousedown", function () {
            controltomove(-velocity, 0.0);
        });
        mapbtn_left.on("mousedown", function () {
            controltomove(0.0, omega);
        });
        mapbtn_right.on("mousedown", function () {
            controltomove(0.0, -omega);
        });

        mapbtn_forward.on("mouseup", softstop);
        mapbtn_back.on("mouseup", softstop);
        mapbtn_left.on("mouseup", softstop);
        mapbtn_right.on("mouseup", softstop);
        mapbtn_softstop.on("click", softstop);

        shut_down.hover(function () {
            this.style.color = "#ff1b0e";
            this.style.borderColor = "#ff1b0e";
            this.style.cursor = "pointer";
        }, function () {
            this.style.color = "#e5483c";
            this.style.borderColor = "#e5483c";
            this.style.cursor = "default";
        });
        shut_down.on("click", powerdown);

        retrackbtn.hover(function () {
            this.style.color = "#f0960e";
            this.style.borderColor = "#f0960e";
            this.style.cursor = "pointer";
        }, function () {
            this.style.color = "#d9880d";
            this.style.borderColor = "#d9880d";
            this.style.cursor = "default";
        });
        retrackbtn.on("click", function () {
            sendmode(6);
        });

        div_map.css({
            "text-align": "center",
            "width": "100%",
            "height": "650px",
            "padding": "0",
            "margin-left": "0",
            "margin-right": "0",
        });

        // var viewer_map = new ROS2D.Viewer({
        //     divID: 'map_map',
        //     width: 700,
        //     height: 700
        // }); // 显示地图 canvas easeljs
        //
        // var map_map_image = new NAV2D.OccupancyGridClientNav({
        //     ros: ros,
        //     rootObject: viewer_map.scene,
        //     viewer: viewer_map,
        //     serverName: '/move_base',
        //     withOrientation: true,
        //     continuous: true
        // });

        div_nav.css({
            "text-align": "center",
            "width": "100%",
            "height": "700px",
            "padding": "0",
            "margin-left": "0",
            "margin-right": "0"
        });
        var viewer_nav = new ROS2D.Viewer({
            divID: 'nav_map',
            width: 700,
            height: 700
        });
        var nav_map_image = new NAV2D.OccupancyGridClientNav({
            ros: ros,
            rootObject: viewer_nav.scene,
            viewer: viewer_nav,
            serverName: '/move_base',
            withOrientation: true,
            continuous: true,
            state: app
        });

        tracepic.css({
            "text-align": "center",
            "width": "100%",
            "height": "480px",
            "padding": "0",
            "margin-left": "0",
            "margin-right": "0"
        });

        $("#main_trace").css("padding-top", "10px");
    }
    //设置移动端的布局样式
    else {
        $("body").on("touchstart", function () {
            if (droped === 1) {
                dropmenu.css("display", "none");
                droped = 0;
            }
        });
        btn_emergencystop.on("touchend", function (e) {
            e.preventDefault();
            emergencystop();
        });
        dropbtn.on("touchstart", function (e) {
            e.preventDefault();
            this.style.backgroundColor = '#FFF0CD';
            dropmenuitems.css("background-color", "#fff0cd");
            dropmenuactiveitem.css("background-color", "#ffa676");
            if (mainviewrnum === 2) {
                dropmenu_map.css("background-color", "#ffdebe");
            }
            else if (mainviewrnum === 3) {
                dropmenu_nav.css("background-color", "#ffdebe");
            }
            else if (mainviewrnum === 4) {
                dropmenu_trace.css("background-color", "#ffdebe");
            }
            else if (mainviewrnum === 5) {
                dropmenu_params.css("background-color", "#ffdebe");
            }
            dropmenu.css("display", "block");
        });
        dropbtn.on("touchend", function (e) {
            e.preventDefault();
            this.style.backgroundColor = '#FDF2E2';

            if (dropmenu.css("display") === "block") {
                droped = 1;
            }
        });
        dropmenu_motion.on("touchstart", function (e) {
            e.preventDefault();
            droped = 2;
            this.style.color = '#fffa08';
            this.style.backgroundColor = '#ffa676';
        });
        dropmenu_motion.on("touchend", function (e) {
            e.preventDefault();
            droped = 0;
            this.style.color = '#fffa08';
            this.style.backgroundColor = '#ffa676';
            main_motion_clicked();
            dropmenu.css("display", "none");
        });
        dropmenu_map.on("touchstart", function (e) {
            e.preventDefault();
            droped = 2;
            this.style.backgroundColor = '#ffdebe';
        });
        dropmenu_map.on("touchend", function (e) {
            e.preventDefault();
            droped = 0;
            this.style.backgroundColor = '#fff0cd';
            main_map_clicked();
            dropmenu.css("display", "none");
        });
        dropmenu_nav.on("touchstart", function (e) {
            e.preventDefault();
            droped = 2;
            this.style.backgroundColor = '#ffdebe';
        });
        dropmenu_nav.on("touchend", function (e) {
            e.preventDefault();
            droped = 0;
            this.style.backgroundColor = '#fff0cd';
            main_nav_clicked();
            dropmenu.css("display", "none");
        });
        dropmenu_trace.on("touchstart", function (e) {
            e.preventDefault();
            droped = 2;
            this.style.backgroundColor = '#ffdebe';
        });
        dropmenu_trace.on("touchend", function (e) {
            e.preventDefault();
            droped = 0;
            this.style.backgroundColor = '#fff0cd';
            main_trace_clicked();
            dropmenu.css("display", "none");
        });
        dropmenu_params.on("touchstart", function (e) {
            e.preventDefault();
            droped = 2;
            this.style.backgroundColor = '#ffdebe';
        });
        dropmenu_params.on("touchend", function (e) {
            e.preventDefault();
            droped = 0;
            this.style.backgroundColor = '#fff0cd';
            main_params_clicked();
            dropmenu.css("display", "none");
        });
        motionbtn_softstopC.on("touchstart", function (e) {
            e.preventDefault();
            motionbtn_softstop.css("color", "#f90000");
            softstop();
        });
        motionbtn_softstopC.on("touchend", function (e) {
            e.preventDefault();
            motionbtn_softstop.css("color", "#dc0000");
        });
        mapbtn_softstop.on("touchstart", function (e) {
            e.preventDefault();
            this.style.color = '#f90000';
            softstop();
        });
        mapbtn_softstop.on("touchend", function (e) {
            e.preventDefault();
            this.style.color = '#dc0000';
        });
        motionbtn_leftC.on("touchstart", function (e) {
            e.preventDefault();
            motionbtn_left.css("color", "#6cd56f");
            controltomove(velocity, omega);
        });
        motionbtn_leftC.on("touchend", function (e) {
            e.preventDefault();
            motionbtn_left.css("color", "#4e9a50");
            softstop();
        });
        motionbtn_rightC.on("touchstart", function (e) {
            e.preventDefault();
            motionbtn_right.css("color", "#6cd56f");
            controltomove(velocity, -omega);
        });
        motionbtn_rightC.on("touchend", function (e) {
            e.preventDefault();
            motionbtn_right.css("color", "#4e9a50");
            softstop();
        });
        mapbtn_left.on("touchstart", function (e) {
            e.preventDefault();
            this.style.color = '#6cd56f';
            controltomove(0.0, omega);
        });
        mapbtn_left.on("touchend", function (e) {
            e.preventDefault();
            this.style.color = '#4e9a50';
            softstop();
        });
        motionbtn_forwardC.on("touchstart", function (e) {
            e.preventDefault();
            motionbtn_forward.css("color", "#3887c9");
            controltomove(velocity, 0.0);
        });
        motionbtn_forwardC.on("touchend", function (e) {
            e.preventDefault();
            motionbtn_forward.css("color", "#3176b0");
            softstop();
        });
        motionbtn_backC.on("touchstart", function (e) {
            e.preventDefault();
            motionbtn_back.css("color", "#3887c9");
            controltomove(-velocity, 0.0);
        });
        motionbtn_backC.on("touchend", function (e) {
            e.preventDefault();
            motionbtn_back.css("color", "#3176b0");
            softstop();
        });
        mapbtn_forward.on("touchstart", function (e) {
            e.preventDefault();
            this.style.color = '#3887c9';
            controltomove(velocity, 0.0);
        });
        mapbtn_forward.on("touchend", function (e) {
            e.preventDefault();
            this.style.color = '#3176b0';
            softstop();
        });
        mapbtn_back.on("touchstart", function (e) {
            e.preventDefault();
            this.style.color = '#15e2cc';
            controltomove(-velocity, 0.0);
        });
        mapbtn_back.on("touchend", function (e) {
            e.preventDefault();
            this.style.color = '#13c8b4';
            softstop();
        });
        mapbtn_right.on("touchstart", function (e) {
            e.preventDefault();
            this.style.color = '#ebe90e';
            controltomove(0.0, -omega);
        });
        mapbtn_right.on("touchend", function (e) {
            e.preventDefault();
            this.style.color = '#d9d70e';
            softstop();
        });
        mapbtn_choosemapping.on("touchstart", function (e) {
            e.preventDefault();
            this.style.color = '#f0960e';
        });
        mapbtn_choosemapping.on("touchend", function (e) {
            e.preventDefault();
            ismapping = true;
            this.style.color = '#d9880d';
            this.style.display = "none";
            mapbtn_choosemappingstop.css("display", "block");
            sendmode(1);
            robostate = 1;
        });
        mapbtn_choosemappingstop.on("touchstart", function (e) {
            e.preventDefault();
            this.style.color = '#df28f4';
        });
        mapbtn_choosemappingstop.on("touchend", function (e) {
            e.preventDefault();
            ismapping = false;
            this.style.color = '#b420c5';
            this.style.display = "none";
            mapbtn_choosemapping.css("display", "block");
            sendmode(3);
            robostate = 4;
        });
        shut_down.on("touchstart", function (e) {
            e.preventDefault();
            this.style.color = "#ff1b0e";
            this.style.borderColor = "#ff1b0e";
        });
        shut_down.on("touchend", function (e) {
            e.preventDefault();
            this.style.color = "#e5483c";
            this.style.borderColor = "#e5483c";
            powerdown();
        });

        retrackbtn.on("touchstart", function (e) {
            e.preventDefault();
            this.style.color = "#f0960e";
            this.style.borderColor = "#f0960e";
        });
        retrackbtn.on("touchend", function (e) {
            e.preventDefault();
            this.style.color = "#d9880d";
            this.style.borderColor = "#d9880d";
            sendmode(6);
        });

        div_map.css({
            "text-align": "center",
            "width": "100%",
            "height": "270px",
            "padding": "0",
            "margin-left": "0",
            "margin-right": "0"
        });
        var viewer_map_mb = new ROS2D.Viewer({
            divID: 'map_map',
            width: 270,
            height: 270
        });
        var map_map_image_mb = new NAV2D.OccupancyGridClientNav({
            ros: ros,
            rootObject: viewer_map_mb.scene,
            viewer: viewer_map_mb,
            serverName: '/move_base',
            withOrientation: true,
            continuous: true
        });

        div_nav.css({
            "text-align": "center",
            "width": "100%",
            "height": "280px",
            "padding": "0",
            "margin-left": "0",
            "margin-right": "0"
        });
        var viewer_nav_mb = new ROS2D.Viewer({
            divID: 'nav_map',
            width: 280,
            height: 280
        });
        var nav_map_image_mb = new NAV2D.OccupancyGridClientNav({
            ros: ros,
            rootObject: viewer_nav_mb.scene,
            viewer: viewer_nav_mb,
            serverName: '/move_base',
            withOrientation: true,
            continuous: true,
            state: app
        });

        tracepic.css({
            "text-align": "center",
            "width": "100%",
            "height": "210px",
            "padding": "0",
            "margin-left": "0",
            "margin-right": "0"
        });


        $("#nav_row2").css("display", "block");
        $("#trace_row1").css("margin-top", "0");
        $("#trace_row2").css("display", "block");
        $("#trace_table").css("height", "110px");
        $("#trace_row3").css("margin-top", "0");
    }

    //滑块设置AGV直线速度
    $("#setvel").slider({
        orientation: "horizontal",
        range: "min",
        min: 10,
        max: 120,
        value: 20,
        slide: refreshSettingVel,
        change: refreshSettingVel
    });

    //滑块设置AGV角速度
    $("#setang").slider({
        orientation: "horizontal",
        range: "min",
        min: 10,
        max: 150,
        value: 40,
        slide: refreshSettingAng,
        change: refreshSettingAng
    });

    // setInterval(sendmotion, moveinterval);
    // $("#trace_img").on("click", sendmode(6));
});
// 控件jquery-mobile 移动端

//显示运动界面
function main_motion_clicked() {
    $("#main_motion").css('display', 'block');
    $("#main_map").css('display', 'none');
    $("#main_nav").css('display', 'none');
    $("#main_trace").css('display', 'none');
    $("#main_params").css('display', 'none');
    mainviewrnum = 1;
    sendmode(4);
    robostate = 4;
    // location.reload();
}

var is_map_viewer = false
//显示建图界面
function main_map_clicked() {
    $("#main_motion").css('display', 'none');
    $("#main_map").css('display', 'block');
    $("#main_nav").css('display', 'none');
    $("#main_trace").css('display', 'none');
    $("#main_params").css('display', 'none');

    if(!is_map_viewer&&ispc()){

        is_map_viewer = true;

        var viewer_map = new ROS2D.Viewer({
            divID: 'map_map',
            width: 650,
            height: 650
        }); // 显示地图 canvas easeljs

        var map_map_image = new NAV2D.OccupancyGridClientNav({
            ros: ros,
            rootObject: viewer_map.scene,
            viewer: viewer_map,
            serverName: '/move_base',
            withOrientation: true,
            continuous: true
        });
    }


    mainviewrnum = 2;
    if (robostate === 4) {
        var r = confirm("请确认是否使用上次的地图...");
        if (r === true) {
            sendmode(2);
            robostate = 2;
        }
        else {
            alert("请重新建图...");
            sendmode(4);
            robostate = 4;
        }
    }
}

//显示导航界面
function main_nav_clicked() {
    // $("#main_motion").css('display', 'none');
    // $("#main_map").css('display', 'none');
    // $("#main_nav").css('display', 'block');
    // $("#main_trace").css('display', 'none');
    // $("#main_params").css('display', 'none');
    mainviewrnum = 3;
    sendmode(2);
    robostate = 2;
    location.reload();
}

//显示跟踪界面
function main_trace_clicked() {
    if (robostate !== 5) {
        sendmode(5);
        robostate = 5;
    }

    $("#main_motion").css('display', 'none');
    $("#main_map").css('display', 'none');
    $("#main_nav").css('display', 'none');
    $("#main_params").css('display', 'none');

    // http 8080
    // websocket 9090
    // realsense 8181
    if (firsttrace)
    {
        pic_canvas = $("#trace_pic canvas");
        if (pic_canvas.length > 0) {
            pic_canvas.remove();
        }

        firsttrace = false;
        var tracepic = $("#trace_pic");
        setTimeout(function () {
            $("#main_trace").css('display', 'block');
            mainviewrnum = 4;
            if (ispc()) {
                var img_viewer = new MJPEGCANVAS.Viewer({
                    divID : 'trace_pic',
                    host : '192.168.1.102',
                    port : '8181',
                    width : 640,
                    height : 480,
                    topic : '/spencer/perception_internal/people_detection/rgbd_front_top/upper_body_detector/image'
                });
            }
            else {
                var img_viewer_mb = new MJPEGCANVAS.Viewer({
                    divID : 'trace_pic',
                    host : '192.168.1.102',
                    port : '8181',
                    width : 280,
                    height : 210,
                    topic : '/spencer/perception_internal/people_detection/rgbd_front_top/upper_body_detector/image'
                });
            }
        }, 2000);
    }
    else {
        $("#main_trace").css('display', 'block');
        mainviewrnum = 4;
    }
}

//显示参数界面
function main_params_clicked() {
    $("#main_motion").css('display', 'none');
    $("#main_map").css('display', 'none');
    $("#main_nav").css('display', 'none');
    $("#main_trace").css('display', 'none');
    $("#main_params").css('display', 'block');
    mainviewrnum = 5;
}

function controltomove(vel, omg) {
    twist.linear.x = vel;
    twist.angular.z = omg;
    sendmotion();
}

function emergencystop() {
    sendmode(4);
    twist.linear.x = 0.0;
    twist.angular.z = 0.0;
    sendmotion();
}

function softstop() {
    twist.linear.x = 0.0;
    twist.angular.z = 0.0;
    sendmotion();
}

function sendmotion() {
    cmdVel.publish(twist);
}

//定义运动模式方法
function sendmode(modenum) {
    switch (modenum) {
        case 1:
            chatter.publish(str_map);
            firsttrace = true;
            break;
        case 2:
            chatter.publish(str_nav);
            firsttrace = true;
            break;
        case 3:
            chatter.publish(str_save);
            break;
        case 4:
            chatter.publish(str_stop);
            firsttrace = true;
            break;
        case 5:
            chatter.publish(str_track);
            if (showmodechange) {
                alert("track");
            }
            break;
        case 6:
            chatter.publish(str_retrack);
            if (showmodechange) {
                alert("retrack");
            }
            break;
        case -1:
            chatter.publish(str_poweroff);
            break;
        default:
            break;
    }
}

function refreshSettingVel() {
    var settingvel = $("#setvel").slider("value");
    velocity = settingvel / 100;
    $("#setvellabel").html(velocity);
    $("#patbvel").html(velocity);
}

function refreshSettingAng() {
    var settingang = $("#setang").slider("value");
    omega = settingang / 100;
    $("#setanglabel").html(omega);
    $("#patbang").html(omega);

}

function powerdown() {
    sendmode(-1);
    robostate = -1;
    alert("power off");
}

//判断用户端是否为PC电脑
function ispc() {
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

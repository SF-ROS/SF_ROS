var Component = Vue.extend({
  props: ['text'],
  template: '<button class="btn btn-success">{{text}}</button>'
})

var Component2 = Vue.extend({
  props: ['text'],
  template: '<button class="btn btn-warning">{{text}}</button>'
})

var Component3 = Vue.extend({
  props: ['text'],
  template: '<button class="btn btn-info">{{text}}</button>'
})


var app = new Vue({
  el: '#app',
  components:{
    'component':Component,
    'component2':Component2,
    'component3':Component3
  },
  data: {
    items:[],//导航任务点的容器
    currentTask:0, //当前导航任务点
    message: 'Hello Vue!',
    init_pose: null, //初始点坐标
    temp_pose_list: [], //标记点列表
    pose_name_list:["11","22","33","44","55"],  //标记点名称列表
    pose_list:[],
    task_list: [], //导航任务列表
    is_task:false,  //是否在执行任务导航
    is_pause:false,  //是否暂停了
    is_set_init:false,//是否正在设置初始位置
    navigator: null, //导航器对象
    showExportSucc: false,
    showExportFail: false,
    showSaveSucc: false,
    position_str: "x: {0}, y: {1} | z: {2}, w:{3}",
  },
  mounted: function() {
    this.init()
  },
  methods: {

    /**
     * 初始化, 加载保存的标记点
     */
    init: function() {
      if(localStorage.init_pose){
        this.init_pose = JSON.parse(localStorage.init_pose)
      }
      this.temp_pose_list = JSON.parse(localStorage.pose_list)
      this.task_list = JSON.parse((localStorage.task_list))
      that = this
      setTimeout(function() {
        if (!that.navigator) {
          that.init()
        } else {
          if(that.init_pose){
            that.navigator.showInitPose(that.init_pose)
          }
          that.createGoalsFromPoseList()
          for (i=0;i<that.task_list.length;i++){
            that.add_task_icon('component',that.task_list[i])
          }
          //把所有标记点发送到机器人端
          // that.navigator.sendPose(that.temp_pose_list)
        }
      }, 50)
    },

    /**
     * 根据temp_pose_list生成 goal_list，并显示在地图上
     */
    createGoalsFromPoseList: function() {
      var len2 = this.temp_pose_list.length;
      for (var j = 0; j < len2; j++) {
        this.navigator.showPose(this.temp_pose_list[j][1], j+1);
      }
    },


    /**
     * 刷新按钮
     */
    refresh: function(){
      location.reload();
    },

    /**
     * 导出所有标记点按钮
     */
    exportPoseList: function() {
      pose_list_json = JSON.stringify(this.temp_pose_list)
      try {
        this.saveAsFile(pose_list_json, 'pose_list.data')
        this.showExportSucc = true
      } catch(e) {
        this.showExportFail = true
      }
    },
    
    save: function() {
      localStorage.pose_list = JSON.stringify(this.temp_pose_list)
      //把所有标记点发送到机器人端
      // this.navigator.sendPose(this.temp_pose_list)
      location.reload()
    },


    /**
     * 设置机器人地图初始点
     */
    set_init:function(){
      document.body.style.cursor = 'crosshair'
      this.is_set_init = true
    },

    /**
     * 保存初始点
     */
    save_init:function(){
      localStorage.init_pose = JSON.stringify(this.init_pose)
      //将初始点坐标通过话题发送到process_switch.py处理
      this.navigator.sendInitPose(this.init_pose)
      setTimeout(function () {
        location.reload()
      },2000)
    },

    /**
     * 
     * @param {保存的内容} t 
     * @param {文件名} f 
     * @param {格式} m 
     */
    saveAsFile: function(t, f, m="text/plain;charset=utf-8") {
      try {
        var b = new Blob([t],{type:m});
        saveAs(b, f);
      } catch (e) {
        console.log(e)
        throw e
      }
    },

    /**
     * 弹出windows选择文件对话框
     */
    loadPoseList: function() {
      // Check for the various File API support.
      if (window.File && window.FileReader && window.FileList && window.Blob) {
        $('#input_pose_list').trigger('click');
      } else {
        alert('The File APIs are not fully supported in this browser.');
      }
    },

    /**
     * 选择文件后加载此文件
     */
    loadFile: function(opts) {
      var that = this;
      var files = opts.target.files;
      if (files.length > 0) {
        var file = files[0];
        var reader = new FileReader();
        reader.onload = (function (theFile) {
          return function (e) {
            that.temp_pose_list = JSON.parse(e.target.result)
            //把所有标记点发送到机器人端
            // that.navigator.sendPose(that.temp_pose_list)
            localStorage.pose_list = JSON.stringify(that.temp_pose_list)
          };
        })(file);
        reader.readAsText(file);
        location.reload()
      }
    },




    /**
     * 删除标记点
     * @param index
     */
    delete_pose:function (index) {
      if (confirm("你确定删除该标记点吗？")) {
        this.temp_pose_list.splice(index,1);
        this.save();
      }
      else {
      }
    },

    /**
     * 删除所有标记点
     */
    delete_allPose:function(){
      if (confirm("你确定删除所有标记点吗？")) {
        this.temp_pose_list = [];
        this.save();
      }
      else {
      }
    },
    
    /**
     * 添加标记点到任务列表
     */
    add_task:function (component,index) {
      this.task_list.push(index);
      this.add_task_icon(component,index)
    },

    /**
     * 添加导航任务图标
     * @param component
     * @param index
     */
    add_task_icon:function(component,index){
      this.items.push({
        'component': component,
        'text':index + 1 ,
      })
    },

    /**
     * 修改pose名称
     * @param index
     */
    edit_posename:function(index){
      var name = prompt("请输入该标记点的名称",this.temp_pose_list[index][0])
      if (name){
        this.temp_pose_list[index][0] = name;
        this.save();
      }
    },


    /**
     * 清空导航任务列表
     */
    taskClean:function(){
      this.items = [];
      this.task_list = [];
    },

    /**
     * 保存导航任务列表
     */
    taskSave:function(){
      localStorage.task_list = JSON.stringify(this.task_list)
    },

    /**
     * 暂停当前导航任务
     */
    taskPause: function() {
      this.is_pause = true;
      console.log('goal paused!');
      goal.cancel();
    },

    /**
     * 急停
     */
    mergeStop:function(){
      pose = {"position":{"x":1,"y":1,"z":0},"orientation":{"x":0,"y":0,"z":1,"w":1}}
      goal = this.navigator.createGoal(pose, this.stopFinished)
      goal.send()
      goal.cancel()
    },
    stopFinished:function(){
      console.log("急停完成")
    },


    /**
     * 改变导航任务方块的颜色
     * @param index  方块的索引
     * @param component 方块的组件
     */
    changeColor:function(index,component){
      that = this;
      var tt = that.items[index].text;
      that.items.splice(index,1);
      that.items.splice(index,0,{
        'component': component,
        'text':tt ,
      });
    },

    /**
     * 开始导航任务
     */
    taskStart:function () {
      if(this.task_list.length > 0 && !this.is_task){
        if (this.currentTask == this.task_list.length){
          this.currentTask = 0;
        }

        //恢复前一个导航点的颜色为绿色
        if(this.currentTask == 0){
          this.changeColor(this.task_list.length-1,'component')
        }else {
          this.changeColor(this.currentTask-1,'component')
        }

        //将当前目标点的颜色变为橙色
        this.changeColor(this.currentTask,'component2')

        that = this
        poseIndex = this.task_list[this.currentTask]
        pose = this.temp_pose_list[poseIndex][1]
        goal = this.navigator.createGoal(pose, this.goal_result_callback)

        this.is_task = true;
        goal.send();
        console.log('goal start!')

      }
    },



    /**
     * 标记点完成或者取消时，额外的回调函数
     */
    goal_result_callback: function() {
      if (this.is_task&&!this.is_pause){
        //到达目标点后变为蓝色
        this.changeColor(this.currentTask,'component3');

        this.currentTask++;
        console.log('goal completed!')
      }

      this.is_task = false;
      this.is_pause = false;
    },

    /**
     * 将任务列表发送到机器人端
     */
    taskSend:function () {
      //把所有标记点发送到机器人端
      this.navigator.sendPose(this.temp_pose_list)
      this.navigator.sendTask(this.task_list)
    }

  },

});


/**
 * str的格式化函数
 */
String.prototype.format = function () {
  var values = arguments;
  return this.replace(/\{(\d+)\}/g, function (match, index) {
    if (values.length > index) {
        return values[index];
    } else {
        return "";
    }
  });
};　　


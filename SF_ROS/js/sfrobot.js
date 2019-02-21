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
    temp_pose_list: [], //标记点列表
    task_list: [], //导航任务列表
    is_task:false,  //是否在执行任务导航
    is_pause:false,  //是否暂停了
    navigator: null, //导航器对象
    showExportSucc: false,
    showExportFail: false,
    showSaveSucc: false,
    position_str: "x: {0}, y: {1}, z: {2}",
  },
  mounted: function() {
    this.init()
  },
  methods: {

    /**
     * 初始化, 加载保存的标记点
     */
    init: function() {
      this.temp_pose_list = JSON.parse(localStorage.pose_list)
      that = this
      setTimeout(function() {
        if (!that.navigator) {
          that.init()
        } else {
          that.createGoalsFromPoseList()
        }
      }, 50)
    },

    /**
     * 根据temp_pose_list生成 goal_list，并显示在地图上
     */
    createGoalsFromPoseList: function() {
      var len2 = this.temp_pose_list.length;
      for (var j = 0; j < len2; j++) {
        this.navigator.showPose(this.temp_pose_list[j], j+1);
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
      location.reload()
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
            localStorage.pose_list = JSON.stringify(that.temp_pose_list)
          };
        })(file);
        reader.readAsText(file);
        location.reload()
      }
    },



    /**
     * 打开串口
     */
    open_port:function () {

    },


    /**
     * 删除标记点
     * @param index
     */
    delete_pose:function (index) {
      this.temp_pose_list.splice(index,1);
      this.save();
    },

    /**
     * 删除所有标记点
     */
    delete_allPose:function(){
      this.temp_pose_list = [];
      this.save();
    },
    
    /**
     * 添加标记点到任务列表
     */
    add_task:function (component,index) {
      this.task_list.push(index);
      this.items.push({
        'component': component,
        'text':index + 1 ,
      })
    },


    /**
     * 清空导航任务列表
     */
    taskClean:function(){
      this.items = [];
      this.task_list = [];
    },

    /**
     * 暂停当前任务
     */
    taskPause: function() {
      this.is_pause = true;
      console.log('goal paused!');
      goal.cancel();
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
          var tt = this.items[this.task_list.length-1].text;
          this.items.splice(this.task_list.length-1,1);
          this.items.splice(this.task_list.length-1,0,{
            'component': 'component',
            'text':tt ,
          });
        }else {
          var tt1 = this.items[this.currentTask-1].text;
          this.items.splice(this.currentTask-1,1);
          this.items.splice(this.currentTask-1,0,{
            'component': 'component',
            'text':tt1 ,
          });
        }

        //将当前目标点的颜色变为橙色
        var tt2 = this.items[this.currentTask].text;
        this.items.splice(this.currentTask,1);
        this.items.splice(this.currentTask,0,{
          'component': 'component2',
          'text':tt2 ,
        });

        that = this
        poseIndex = this.task_list[this.currentTask];
        this.is_task = true;
        pose = this.temp_pose_list[poseIndex]
        goal = this.navigator.createGoal(pose, this.goal_result_callback)
        goal.send();
        console.log('goal start!')
      }
    },



    /**
     * 标记点完成或者取消时，额外的回调函数
     */
    goal_result_callback: function() {

      //到达目标点后变为蓝色
      if (this.is_task&&!this.is_pause){
        var tt3 = this.items[this.currentTask].text;
        this.items.splice(this.currentTask,1);
        this.items.splice(this.currentTask,0,{
          'component': 'component3',
          'text':tt3 ,
        });

        this.currentTask++;
        console.log('goal completed!')
      }

      this.is_task = false;
      this.is_pause = false;
    },

  }
})


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


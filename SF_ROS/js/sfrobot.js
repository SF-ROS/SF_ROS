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
    temp_pose_list: [],
    task_list: [], //导航任务列表
    is_naving: false, //正在导航
    is_cancel: false, // 是否取消
    is_task:false,  //是否在执行任务导航
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
     * 取消最后目标按钮
     */
    cancel_last: function(){
      if (this.goal_list.length>0){
          goal = this.goal_list[this.goal_list.length-1];
          this.navigator.cancelGoal = goal;
          this.goal_list.unshift('1');
          this.goal_list.pop();
          this.temp_pose_list.unshift('1');
          this.temp_pose_list.pop();
          goal.send();
          goal.cancel();
      }
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
      this.showSaveSucc = true
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
            that.cancelAllGoal()
            that.createGoalsFromPoseList();
          };
        })(file);
        reader.readAsText(file);
      }
      // alert(file);
    },


    /**
     * 取消所有标记点的具体逻辑
     */
    cancelAllGoal: function () {
      var len = this.goal_list.length;
      for (var i = 0;i < len; i++){
        goal = this.goal_list[i];
        goal.send();
        goal.cancel();
      }
    },

    /**
     * 标记点完成或者取消时，额外的回调函数
     */
    goal_result_callback: function() {
      this.is_naving = false;
      this.is_arrow = false;
      this.goal_list.shift();

      //到达目标点后变为蓝色
      if (this.is_task){
        var tt3 = this.items[this.currentTask].text;
        this.items.splice(this.currentTask,1);
        this.items.splice(this.currentTask,0,{
          'component': 'component3',
          'text':tt3 ,
        });
        this.currentTask++;
      }

      if(!this.is_cancel&&!this.is_task) {
        this.temp_pose_list.shift();
      }
      if (this.goal_list.length == 0){
        this.is_cancel = false;
      }
      this.is_task = false;
    },

    test:function () {
      swal("hello world");
    },

    open_port:function () {
      this.is_cancel = true;
      this.cancelAllGoal();
      this.createGoalsFromPoseList()
    },


    /**
     * 删除标记点
     * @param index
     */
    delete_pose:function (index) {
      this.temp_pose_list.splice(index,1);
      localStorage.pose_list = JSON.stringify(this.temp_pose_list);
      location.reload();
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

    taskPause: function() {
      this.task_list[this.currentTask].cancel()
      //TODO :createGoal
      //TODO: goal.send
    },

    /**
     * 开始导航任务
     */
    taskStart:function () {
      if(this.task_list.length > 0){
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
        goal = this.navigator.createGoal(pose, function() {
          that.currentTask += 1
          console.log('goal completed!')
        })
        goal.send();
      }
    }

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


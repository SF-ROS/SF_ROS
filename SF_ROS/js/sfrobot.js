
var app = new Vue({
  el: '#app',
  data: {
    message: 'Hello Vue!',
    goal_list: [],
    temp_pose_list: [],
    is_naving: false, //正在导航
    is_cancel: false, // 是否取消
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
     * 开始导航按钮
     */
    start: function () {
      if (this.goal_list.length > 0) {
        if(!this.is_naving){
          goal = this.goal_list[0];
          this.navigator.currentGoal = goal;
          goal.send();
          this.is_naving = true;
        }
        this.is_cancel = false;
      }
    },

    /**
     * 暂停按钮
     */
    pause: function () {
      this.is_cancel = true;
      this.cancelAllGoal();
      this.createGoalsFromPoseList()
    },

    /**
     * 根据temp_pose_list生成 goal_list，并显示在地图上
     */
    createGoalsFromPoseList: function() {
      var len2 = this.temp_pose_list.length;
      for (var j = 0; j < len2; j++) {
        this.navigator.sendGoal(this.temp_pose_list[j]);
      }
    },

    /**
     * 取消所有目标按钮
     */
    cancel_all: function () {
      if (this.goal_list.length > 0) {
        this.cancelAllGoal();
      }
      this.temp_pose_list = [];
    },

    /**
     * 取消当前目标按钮
     */
    cancel_current: function () {
      this.is_cancel = false;
      if (typeof this.currentGoal !== 'undefined'){
        this.navigator.currentGoal.cancel();
      }
      else if(this.goal_list.length>0){
        goal = this.goal_list[0];
        this.navigator.currentGoal = goal;
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
      if(!this.is_cancel) {
        this.temp_pose_list.shift();
      }
      if (this.goal_list.length == 0){
        this.is_cancel = false;
      }
    },

    test:function () {
      swal("hello world");
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
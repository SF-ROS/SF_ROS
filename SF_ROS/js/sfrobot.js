var app = new Vue({
  el: '#app',
  data: {
    message: 'Hello Vue!',
    is_naving: false,
    goal_list: [],
    temp_pose_list: [],
    is_naving: false, //正在导航
    is_cancel: false, //
    navigator: null, //导航器对象
    position_str: "x: {0}, y: {1}, z: {2}",
  },
  
  methods: {

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

    pause: function () {
      this.is_cancel = true;
      this.CancelAll();
      var len2 = this.temp_pose_list.length;
      for (var j = 0; j < len2; j++) {
        this.navigator.sendGoal(this.temp_pose_list[j]);
      }
    },

    cancel_all: function () {
      if (this.goal_list.length > 0) {
        this.CancelAll();
      }
      this.temp_pose_list = [];
    },

    cancel_current: function () {
      this.navigator.currentGoal.cancel();
    },

    save: function() {

    },

    CancelAll: function CancelAll() {
      var len = this.goal_list.length;
      for (var i = 0;i < len; i++){
        goal = this.goal_list[i];
        goal.send();
        goal.cancel();
      }
    },

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
    }
  }
})



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
// index.js
Page({
  data: {
    highScore: 0,
    showRulesModal: false
  },
  
  onLoad: function() {
    // 获取全局数据
    const app = getApp();
    this.setData({
      highScore: app.globalData.highScore
    });
  },
  
  onShow: function() {
    // 每次显示页面时更新最高分
    const app = getApp();
    this.setData({
      highScore: app.globalData.highScore
    });
  },
  
  startGame: function() {
    // 跳转到游戏页面
    wx.navigateTo({
      url: '../game/game'
    });
  },
  
  showRules: function() {
    this.setData({
      showRulesModal: true
    });
  },
  
  hideRules: function() {
    this.setData({
      showRulesModal: false
    });
  }
});
// app.js
const audioManager = require('./utils/audio');

App({
  globalData: {
    userInfo: null,
    highScore: 0
  },

  onLaunch: function() {
    // 初始化游戏数据
    const highScore = wx.getStorageSync('highScore') || 0;
    this.globalData.highScore = highScore;
    
    // 初始化音频
    audioManager.init();
  },
  
  playSound: function(type) {
    audioManager.playSound(type);
  },
  
  updateHighScore: function(score) {
    if (score > this.globalData.highScore) {
      this.globalData.highScore = score;
      wx.setStorageSync('highScore', score);
      return true;
    }
    return false;
  }
})
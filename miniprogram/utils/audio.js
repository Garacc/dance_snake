// audio.js
// 音频管理工具类

const audioManager = {
  // 背景音乐
  bgm: null,
  
  // 音效
  soundEffects: {
    collect: null,    // 收集色块音效
    obstacle: null,   // 碰撞障碍物音效
    colorChange: null // 颜色变换音效
  },
  
  // 初始化音频资源
  init: function() {
    // 初始化背景音乐
    this.bgm = wx.createInnerAudioContext();
    this.bgm.loop = true;
    this.bgm.src = '/miniprogram/audio/bgm.mp3';
    
    // 初始化音效
    this.soundEffects.collect = wx.createInnerAudioContext();
    this.soundEffects.collect.src = '/miniprogram/audio/collect.mp3';
    
    this.soundEffects.obstacle = wx.createInnerAudioContext();
    this.soundEffects.obstacle.src = '/miniprogram/audio/obstacle.mp3';
    
    this.soundEffects.colorChange = wx.createInnerAudioContext();
    this.soundEffects.colorChange.src = '/miniprogram/audio/color_change.mp3';
  },
  
  // 播放背景音乐
  playBGM: function() {
    if (this.bgm) {
      this.bgm.play();
    }
  },
  
  // 暂停背景音乐
  pauseBGM: function() {
    if (this.bgm) {
      this.bgm.pause();
    }
  },
  
  // 停止背景音乐
  stopBGM: function() {
    if (this.bgm) {
      this.bgm.stop();
    }
  },
  
  // 播放音效
  playSound: function(type) {
    const sound = this.soundEffects[type];
    if (sound) {
      sound.stop();
      sound.play();
    }
  }
};

module.exports = audioManager;
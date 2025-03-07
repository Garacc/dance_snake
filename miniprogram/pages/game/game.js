// game.js
Page({
  data: {
    score: 0,
    gameOver: false,
    isPaused: false,
    isNewHighScore: false,
    snakeColor: '#00ff00', // 初始蛇的颜色为绿色
    canvasWidth: 0,
    canvasHeight: 0,
    snake: null,
    blocks: [],
    colorChangeZones: [],
    availableColors: ['#00ff00', '#ff0000', '#0000ff', '#ffff00', '#ff00ff'],
    gameSpeed: 2, // 初始游戏速度
    blockGenerationRate: 0.02, // 色块生成概率
    colorChangeRate: 0.005, // 颜色转换区域生成概率
    lastFrameTime: 0,
    animationFrameId: null
  },

  onLoad: function() {
    // 获取系统信息，设置画布大小
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      canvasWidth: systemInfo.windowWidth,
      canvasHeight: systemInfo.windowHeight
    });

    // 初始化游戏
    this.initGame();
  },

  onUnload: function() {
    // 页面卸载时取消动画
    if (this.data.animationFrameId) {
      cancelAnimationFrame(this.data.animationFrameId);
    }
  },

  initGame: function() {
    // 初始化蛇
    const snake = {
      x: this.data.canvasWidth / 2, // 蛇的初始X坐标（屏幕中央）
      y: this.data.canvasHeight - 100, // 蛇的初始Y坐标（屏幕底部上方）
      width: 30, // 蛇的宽度
      height: 30, // 蛇的高度
      speedX: 0, // 蛇的水平速度
      speedY: -this.data.gameSpeed // 蛇的垂直速度（向上移动）
    };

    // 重置游戏状态
    this.setData({
      score: 0,
      gameOver: false,
      isPaused: false,
      isNewHighScore: false,
      snake: snake,
      blocks: [],
      colorChangeZones: [],
      snakeColor: this.data.availableColors[0],
      lastFrameTime: Date.now()
    });

    // 获取画布上下文
    const query = wx.createSelectorQuery();
    query.select('.game-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        // 设置画布大小
        canvas.width = this.data.canvasWidth;
        canvas.height = this.data.canvasHeight;
        
        // 保存画布上下文
        this.canvas = canvas;
        this.ctx = ctx;
        
        // 开始游戏循环
        this.gameLoop();
      });
  },

  gameLoop: function() {
    if (this.data.gameOver || this.data.isPaused) {
      return;
    }

    const now = Date.now();
    const deltaTime = now - this.data.lastFrameTime;
    
    // 更新游戏状态
    this.updateGame(deltaTime);
    
    // 渲染游戏
    this.renderGame();
    
    // 更新时间
    this.setData({
      lastFrameTime: now
    });
    
    // 请求下一帧
    this.data.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  },

  updateGame: function(deltaTime) {
    // 更新蛇的位置
    const snake = this.data.snake;
    snake.x += snake.speedX;
    snake.y += snake.speedY;
    
    // 检查边界碰撞
    if (snake.x < 0 || snake.x + snake.width > this.data.canvasWidth) {
      this.gameOver();
      return;
    }
    
    // 生成色块
    if (Math.random() < this.data.blockGenerationRate) {
      this.generateBlock();
    }
    
    // 生成颜色转换区域
    if (Math.random() < this.data.colorChangeRate) {
      this.generateColorChangeZone();
    }
    
    // 更新色块位置（相对于蛇向下移动）
    const blocks = this.data.blocks.map(block => {
      block.y -= snake.speedY; // 色块相对于蛇向下移动
      return block;
    }).filter(block => block.y < this.data.canvasHeight); // 移除已经超出屏幕的色块
    
    // 更新颜色转换区域位置
    const colorChangeZones = this.data.colorChangeZones.map(zone => {
      zone.y -= snake.speedY; // 颜色转换区域相对于蛇向下移动
      return zone;
    }).filter(zone => zone.y < this.data.canvasHeight); // 移除已经超出屏幕的颜色转换区域
    
    // 检查碰撞
    this.checkCollisions();
    
    // 增加分数（随时间缓慢增加）
    this.setData({
      score: this.data.score + 0.1,
      blocks: blocks,
      colorChangeZones: colorChangeZones
    });
    
    // 根据分数增加游戏难度
    this.adjustDifficulty();
  },

  renderGame: function() {
    if (!this.ctx) return;
    
    // 清空画布
    this.ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制蛇
    this.ctx.fillStyle = this.data.snakeColor;
    this.ctx.fillRect(
      this.data.snake.x,
      this.data.snake.y,
      this.data.snake.width,
      this.data.snake.height
    );
    
    // 绘制色块
    this.data.blocks.forEach(block => {
      this.ctx.fillStyle = block.color;
      this.ctx.fillRect(block.x, block.y, block.width, block.height);
    });
    
    // 绘制颜色转换区域
    this.data.colorChangeZones.forEach(zone => {
      // 绘制彩色的颜色转换区域
      const gradient = this.ctx.createLinearGradient(zone.x, zone.y, zone.x + zone.width, zone.y);
      this.data.availableColors.forEach((color, index) => {
        gradient.addColorStop(index / (this.data.availableColors.length - 1), color);
      });
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
    });
  },

  generateBlock: function() {
    // 随机选择一个颜色
    const colorIndex = Math.floor(Math.random() * this.data.availableColors.length);
    const color = this.data.availableColors[colorIndex];
    
    // 创建新的色块
    const block = {
      x: Math.random() * (this.data.canvasWidth - 30), // 随机X坐标
      y: 0, // 从屏幕顶部生成
      width: 30, // 色块宽度
      height: 30, // 色块高度
      color: color // 色块颜色
    };
    
    // 添加到色块数组
    const blocks = this.data.blocks.concat(block);
    this.setData({
      blocks: blocks
    });
  },

  generateColorChangeZone: function() {
    // 创建新的颜色转换区域
    const zone = {
      x: 0, // 从屏幕左侧开始
      y: 0, // 从屏幕顶部生成
      width: this.data.canvasWidth, // 宽度为屏幕宽度
      height: 10 // 高度
    };
    
    // 添加到颜色转换区域数组
    const colorChangeZones = this.data.colorChangeZones.concat(zone);
    this.setData({
      colorChangeZones: colorChangeZones
    });
  },

  checkCollisions: function() {
    const snake = this.data.snake;
    const app = getApp();
    
    // 检查与色块的碰撞
    for (let i = 0; i < this.data.blocks.length; i++) {
      const block = this.data.blocks[i];
      
      // 检查是否碰撞
      if (this.isColliding(snake, block)) {
        // 如果颜色相同，获得积分并移除色块
        if (block.color === this.data.snakeColor) {
          // 播放收集音效
          app.playSound('collect');
          
          // 增加积分
          const newScore = this.data.score + 100;
          
          // 更新色块数组（移除被碰撞的色块）
          const blocks = this.data.blocks.filter((_, index) => index !== i);
          
          this.setData({
            score: newScore,
            blocks: blocks
          });
        } else {
          // 如果颜色不同，游戏结束
          this.gameOver();
          return;
        }
      }
    }
    
    // 检查与颜色转换区域的碰撞
    for (let i = 0; i < this.data.colorChangeZones.length; i++) {
      const zone = this.data.colorChangeZones[i];
      
      // 检查是否碰撞
      if (this.isColliding(snake, zone)) {
        // 播放颜色变化音效
        app.playSound('colorChange');
        
        // 随机选择一个新颜色（不同于当前颜色）
        let newColorIndex;
        do {
          newColorIndex = Math.floor(Math.random() * this.data.availableColors.length);
        } while (this.data.availableColors[newColorIndex] === this.data.snakeColor);
        
        // 更新蛇的颜色
        this.setData({
          snakeColor: this.data.availableColors[newColorIndex]
        });
        
        // 更新颜色转换区域数组（移除被碰撞的区域）
        const colorChangeZones = this.data.colorChangeZones.filter((_, index) => index !== i);
        this.setData({
          colorChangeZones: colorChangeZones
        });
        
        break; // 一次只处理一个颜色转换
      }
    }
  },

  isColliding: function(obj1, obj2) {
    return (
      obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y
    );
  },

  adjustDifficulty: function() {
    // 根据分数调整游戏难度
    const score = Math.floor(this.data.score);
    
    // 每1000分增加游戏速度和色块生成率
    const speedMultiplier = 1 + Math.floor(score / 1000) * 0.1;
    const blockRateMultiplier = 1 + Math.floor(score / 1000) * 0.2;
    
    const snake = this.data.snake;
    snake.speedY = -this.data.gameSpeed * speedMultiplier;
    
    this.setData({
      blockGenerationRate: 0.02 * blockRateMultiplier,
      snake: snake
    });
  },

  gameOver: function() {
    // 播放障碍物碰撞音效
    const app = getApp();
    app.playSound('obstacle');
    
    // 检查是否是新的最高分
    const isNewHighScore = app.updateHighScore(Math.floor(this.data.score));
    
    // 更新游戏状态
    this.setData({
      gameOver: true,
      isNewHighScore: isNewHighScore
    });
    
    // 取消动画
    if (this.data.animationFrameId) {
      cancelAnimationFrame(this.data.animationFrameId);
    }
  },

  restartGame: function() {
    // 重新开始游戏
    this.initGame();
  },

  goToHome: function() {
    // 返回主页
    wx.navigateBack();
  },

  togglePause: function() {
    // 切换暂停状态
    const isPaused = !this.data.isPaused;
    this.setData({
      isPaused: isPaused
    });
    
    // 如果恢复游戏，继续游戏循环
    if (!isPaused) {
      this.setData({
        lastFrameTime: Date.now()
      });
      this.gameLoop();
    }
  },

  handleTouchStart: function(e) {
    // 如果游戏结束或暂停，不处理触摸事件
    if (this.data.gameOver || this.data.isPaused) {
      return;
    }
    
    // 获取触摸点的X坐标
    const touchX = e.touches[0].clientX;
    
    // 判断触摸点在屏幕的左侧还是右侧
    if (touchX < this.data.canvasWidth / 2) {
      this.moveLeft();
    } else {
      this.moveRight();
    }
  },
  
  moveLeft: function() {
    // 如果游戏结束或暂停，不处理移动
    if (this.data.gameOver || this.data.isPaused) {
      return;
    }
    
    // 更新蛇的水平速度（向左移动）
    const snake = this.data.snake;
    snake.speedX = -3;
    
    // 短暂移动后恢复垂直移动
    setTimeout(() => {
      if (!this.data.gameOver && !this.data.isPaused) {
        const snake = this.data.snake;
        snake.speedX = 0;
        this.setData({
          snake: snake
        });
      }
    }, 100);
    
    this.setData({
      snake: snake
    });
  },
  
  moveRight: function() {
    // 如果游戏结束或暂停，不处理移动
    if (this.data.gameOver || this.data.isPaused) {
      return;
    }
    
    // 更新蛇的水平速度（向右移动）
    const snake = this.data.snake;
    snake.speedX = 3;
    
    // 短暂移动后恢复垂直移动
    setTimeout(() => {
      if (!this.data.gameOver && !this.data.isPaused) {
        const snake = this.data.snake;
        snake.speedX = 0;
        this.setData({
          snake: snake
        });
      }
    }, 100);
    
    this.setData({
      snake: snake
    });
  }
});

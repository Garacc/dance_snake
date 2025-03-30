// game.js
Page({
  data: {
    score: 0,
    gameOver: false,
    isPaused: false,
    isNewHighScore: false,
    gameStarted: false, // 添加游戏是否已开始的状态
    snakeColor: '#00ff00', // 初始蛇的颜色为绿色
    canvasWidth: 0,
    canvasHeight: 0,
    snake: null,
    blocks: [],
    colorChangeZones: [],
    availableColors: ['#00ff00', '#0000ff', '#ff0000', '#ffff00', '#ff00ff'],
    colorMapping: {
      '#00ff00': 'green',
      '#0000ff': 'blue',
      '#ff0000': 'red',
      '#ffff00': 'yellow',
      '#ff00ff': 'purple'
    },
    gameSpeed: 4, // 增加初始游戏速度，让游戏更有前进感
    blockGenerationRate: 0.03, // 降低色块生成概率，减少障碍物
    colorChangeRate: 0.01, // 提高颜色转换区域生成概率
    lastFrameTime: 0,
    animationFrameId: null,
    snakePositions: [], // 存储蛇的历史位置，用于绘制蛇身
    backgroundLines: [], // 存储背景线条，用于增强前进感
    showGameOverModal: false, // 新增游戏结束弹窗控制
    finalScore: 0, // 存储最终得分
    touchStartX: 0, // 触摸开始的X坐标
    touchStartY: 0, // 触摸开始的Y坐标
    touchTimer: null, // 触摸计时器
    isTouching: false, // 新增触摸状态
    currentDirection: null, // 新增当前方向状态
  },

  onLoad: function() {
    // 获取系统信息，设置画布大小
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      canvasWidth: systemInfo.windowWidth,
      canvasHeight: systemInfo.windowHeight
    });
  },

  onReady: function() {
    // 在页面渲染完成后初始化游戏
    this.initGame();
    // 自动开始游戏
    this.startGame();
  },

  onUnload: function() {
    // 页面卸载时清除定时器
    if (this.data.animationFrameId) {
      clearTimeout(this.data.animationFrameId);
    }
  },

  initGame: function() {
    // 初始化蛇
    const snake = {
      x: this.data.canvasWidth / 2,
      y: this.data.canvasHeight - 100,
      width: 30,
      height: 30,
      speedX: 0,
      speedY: 0,
      rotation: 0
    };

    // 初始化蛇的历史位置
    const snakePositions = [];
    for (let i = 0; i < 5; i++) {
      snakePositions.push({
        x: snake.x,
        y: snake.y + (i * 20)
      });
    }
    
    // 初始化背景线条
    const backgroundLines = [];
    for (let i = 0; i < 20; i++) {
      backgroundLines.push({
        x: Math.random() * this.data.canvasWidth,
        y: Math.random() * this.data.canvasHeight,
        length: 5 + Math.random() * 15,
        speed: 3 + Math.random() * 3
      });
    }

    // 重置游戏状态
    this.setData({
      score: 0,
      gameOver: false,
      isPaused: false,
      isNewHighScore: false,
      gameStarted: false,
      snake: snake,
      blocks: [],
      colorChangeZones: [],
      snakeColor: this.data.availableColors[0],
      lastFrameTime: Date.now(),
      snakePositions: snakePositions,
      backgroundLines: backgroundLines
    });

    console.log('初始化游戏状态完成，开始获取Canvas节点');
    
    // 获取画布上下文
    const query = wx.createSelectorQuery();
    query.select('.game-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        console.log('Canvas节点查询结果:', res);
        if (res && res[0] && res[0].node) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          console.log('成功获取Canvas节点和上下文');
          
          // 设置画布大小
          canvas.width = this.data.canvasWidth;
          canvas.height = this.data.canvasHeight;
          
          console.log(`设置Canvas尺寸: ${canvas.width} x ${canvas.height}`);
          
          // 保存画布上下文
          this.canvas = canvas;
          this.ctx = ctx;
          
          // 加载图片资源
          this.loadImages();
          
          // 开始游戏循环
          this.gameLoop();
        } else {
          console.error('获取Canvas节点失败，将在1秒后重试');
          // 确保在页面完全加载后再次尝试获取Canvas节点
          setTimeout(() => {
            this.initGame();
          }, 1000);
        }
      });
  },

  startGame: function() {
    if (this.data.gameOver) {
      this.initGame();
    }
    this.setData({
      gameStarted: true,
      lastFrameTime: Date.now()
    });
  },

  handleTouchStart: function(e) {
    // 如果游戏未开始，则开始游戏
    if (!this.data.gameStarted) {
      this.startGame();
      return;
    }
    
    // 如果游戏结束或暂停，不处理触摸事件
    if (this.data.gameOver || this.data.isPaused) {
      return;
    }
    
    // 获取触摸点的X坐标和蛇的当前位置
    const touchX = e.touches[0].clientX;
    const snakeX = this.data.snake.x;

    // 根据蛇的位置判断左右
    if (touchX < snakeX) {
      this.moveLeft();
    } else {
      this.moveRight();
    }
  },
  
  handleTouchMove: function(e) {
    // 如果游戏结束或暂停，不处理触摸事件
    if (this.data.gameOver || this.data.isPaused) {
      return;
    }
    
    // 获取触摸点的X坐标和蛇的实时位置
    const touchX = e.touches[0].clientX;
    const snakeX = this.data.snake.x;

    // 根据蛇的实时位置判断左右
    if (touchX < snakeX) {
      this.moveLeft();
    } else {
      this.moveRight();
    }
  },
  
  moveLeft: function() {
    // Add null check for snake
    if (this.data.gameOver || this.data.isPaused || !this.data.snake) {
      return;
    }
    
    // 更新蛇的水平速度（向左移动）
    const snake = this.data.snake;
    snake.speedX = -3;
    
    // 更新蛇对象
    this.setData({
      snake: snake
    });
    
    // 短暂移动后恢复静止
    setTimeout(() => {
      if (!this.data.gameOver && !this.data.isPaused) {
        snake.speedX = 0;
        this.setData({
          snake: snake
        });
      }
    }, 100);
  },
  
  moveRight: function() {
    // Add null check for snake
    if (this.data.gameOver || this.data.isPaused || !this.data.snake) {
      return;
    }
    
    // 更新蛇的水平速度（向右移动）
    const snake = this.data.snake;
    snake.speedX = 3;
    
    // 更新蛇对象
    this.setData({
      snake: snake
    });
    
    // 短暂移动后恢复静止
    setTimeout(() => {
      if (!this.data.gameOver && !this.data.isPaused) {
        snake.speedX = 0;
        this.setData({
          snake: snake
        });
      }
    }, 100);
  },

  // 在Page对象中添加触摸事件处理方法
  onTouchStart(e) {
    if (this.data.gameOver || this.data.isPaused) return;

    const touch = e.touches[0];
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY,
      isTouching: true
    });

    // 立即触发第一次操作
    this.handleMove(this.data.currentDirection);
    
    // 缩短间隔时间到50ms实现高频触发
    this.data.touchTimer = setInterval(() => {
      if (this.data.isTouching) {
        this.handleMove(this.data.currentDirection);
      }
    }, 50); // 从100ms调整为50ms
  },

  onTouchMove(e) {
    if (!this.data.isTouching) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - this.data.touchStartX;
    const deltaY = touch.clientY - this.data.touchStartY;

    // 实时更新方向判断阈值
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        this.setData({
          currentDirection: deltaX > 0 ? 'right' : 'left'
        });
      } else {
        this.setData({
          currentDirection: deltaY > 0 ? 'down' : 'up'
        });
      }
    }
  },

  onTouchEnd() {
    this.setData({ isTouching: false });
    clearInterval(this.data.touchTimer);
    this.data.touchTimer = null;
  },

  handleMove(direction) {
    if (this.data.gameOver || this.data.isPaused || !this.data.snake) return;

    const speed = 8;
    switch(direction) {
      case 'left':
        this.data.snake.speedX = -speed;
        this.data.snake.speedY = 0;
        break;
      case 'right':
        this.data.snake.speedX = speed;
        this.data.snake.speedY = 0;
        break;
      case 'up':
        this.data.snake.speedY = -speed;
        this.data.snake.speedX = 0;
        break;
      case 'down':
        this.data.snake.speedY = speed;
        this.data.snake.speedX = 0;
        break;
    }
    this.setData({ snake: this.data.snake });
  },

  updateGame: function(deltaTime) {
    // 如果游戏未开始、已结束或暂停，不再更新游戏状态
    if (!this.data.gameStarted || this.data.gameOver || this.data.isPaused) {
      // 确保在游戏结束状态下不执行任何更新
      return;
    }
    
    // 更新蛇的位置（只有水平移动，垂直方向保持静止）
    const snake = this.data.snake;
    snake.x += snake.speedX;
    
    // 更新背景线条位置
    const backgroundLines = this.data.backgroundLines.map(line => {
      line.y += line.speed;
      if (line.y > this.data.canvasHeight) {
        line.y = 0;
        line.x = Math.random() * this.data.canvasWidth;
      }
      return line;
    });
    
    // 更新蛇的历史位置
    const snakePositions = this.data.snakePositions;
    snakePositions.forEach(pos => pos.y += 20);
    snakePositions.unshift({ x: snake.x, y: snake.y });
    if (snakePositions.length > 5) {
      snakePositions.pop();
    }
    
    // 检查蛇是否碰到屏幕左右边缘
    if (snake.x < 0 || snake.x + snake.width > this.data.canvasWidth) {
      console.log('蛇碰到屏幕边缘，游戏结束');
      // 使用setData设置游戏状态，确保UI更新
      this.setData({
        gameStarted: false,
        isPaused: true,
        showGameOverModal: true  // 添加弹窗状态更新
      }, () => {
        // 在状态更新完成后调用gameOver函数
        this.gameOver();
      });
      return;
    }
    
    // 更新色块位置（向下移动）
    const blocks = this.data.blocks.map(block => {
      block.y += this.data.gameSpeed;
      return block;
    });
    
    // 移除已经超出屏幕底部的色块
    const filteredBlocks = blocks.filter(block => block.y < this.data.canvasHeight);
    
    // 更新颜色转换区域位置（向下移动）
    const colorChangeZones = this.data.colorChangeZones.map(zone => {
      zone.y += this.data.gameSpeed;
      return zone;
    });
    
    // 移除已经超出屏幕底部的颜色转换区域
    const filteredColorChangeZones = colorChangeZones.filter(zone => zone.y < this.data.canvasHeight);
    
    // 检查碰撞
    this.checkCollisions();
    
    // 再次检查游戏状态，如果游戏已经结束，不再继续更新
    if (this.data.gameOver) {
      console.log('游戏已结束，不再生成新的色块和颜色转换区域');
      return;
    }
    
    // 只有在游戏正式开始且未结束时才生成新的色块和颜色转换区域
    let newZone = null;
    if (Math.random() < this.data.colorChangeRate) {
      newZone = this.generateColorChangeZone();
    }
    if (newZone) {
      filteredColorChangeZones.push(newZone);
    }
 
    let newBlock = null;
    if (Math.random() < this.data.blockGenerationRate) {
      newBlock = this.generateBlock();
    }
    if (newBlock) {
      filteredBlocks.push(newBlock);
    }
    
    // 更新积分（随时间缓慢增加）和游戏状态
    this.setData({
      score: this.data.score + 1,
      snake: snake,
      snakePositions: snakePositions,
      blocks: filteredBlocks,
      colorChangeZones: filteredColorChangeZones,
      backgroundLines: backgroundLines
    });
  },

  generateBlock: function() {
    // 如果游戏未开始、已结束或暂停，不生成新色块
    if (!this.data.gameStarted || this.data.gameOver || this.data.isPaused) {
      console.log('游戏未开始、已结束或暂停，不生成新色块');
      return null;
    }
    
    console.log("generateBlock() 被调用")

    // 检查当前高度范围内障碍色块数量（允许少量共存）
    const zoneCount = this.data.colorChangeZones.filter(zone => 
      zone.y < 50 && zone.y + zone.height > 0
    ).length;
    
    if (zoneCount > 1) {
      console.log(`当前高度已有${zoneCount}个颜色转换区域，不生成障碍色块`);
      return null;
    }

    // 随机选择一个颜色
    const colorIndex = Math.floor(Math.random() * this.data.availableColors.length);
    const colorValue = this.data.availableColors[colorIndex];
    
    // 创建新色块
    const block = {
      x: Math.random() * (this.data.canvasWidth - 30),
      y: 0,
      width: 30,
      height: 30,
      color: colorValue
    };
    
    // // 将新色块添加到色块数组中
    // const blocks = this.data.blocks.concat(block);
    // this.setData({
    //   blocks: blocks
    // });
    
    // 返回新生成的色块
    return block;
  },

  generateColorChangeZone: function() {
    if (!this.data.gameStarted || this.data.gameOver || this.data.isPaused) return null;

    // 检查现有颜色转换区域数量
    if (this.data.colorChangeZones.length >= 1) return null;

    // 从可用颜色中选择与当前不同的颜色
    const colorIndex = Math.floor(Math.random() * this.data.availableColors.length);
    let newColor = this.data.availableColors[colorIndex];
    if (newColor === this.data.snakeColor) {
      newColor = this.data.availableColors[(colorIndex + 1) % this.data.availableColors.length];
    }

    if (!newColor) newColor = this.data.availableColors[0];

    return {
      x: 0,
      y: 0,
      width: this.data.canvasWidth,
      height: 30,
      color: newColor, // 直接使用选择的颜色
      borderColor: '#FFFFFF',
      borderWidth: 3,
      dash: [10, 5]
    };
  },

  checkCollisions: function() {
    // 如果游戏已经结束或暂停，不再检查碰撞
    if (this.data.gameOver || !this.data.gameStarted || this.data.isPaused) {
      return;
    }
    
    const snake = this.data.snake;
    
    // 检查与颜色转换区域的碰撞
    for (let i = 0; i < this.data.colorChangeZones.length; i++) {
      const zone = this.data.colorChangeZones[i];
      
      // 检查是否碰撞
      if (this.isColliding(snake, zone)) {
        // 播放颜色转换音效
        const app = getApp();
        app.playSound('color_change');
        
        console.log(`蛇与颜色转换区域碰撞，颜色转换为 ${zone.color}`);
        // 直接使用区域颜色更新蛇身颜色
        this.setData({
          snakeColor: zone.color
        });
        
        // 更新颜色转换区域数组（移除被碰撞的区域）
        const colorChangeZones = this.data.colorChangeZones.filter((_, index) => index !== i);
        this.setData({
          colorChangeZones: colorChangeZones
        });
        
        break;
      }
    }

    // 然后检查色块的碰撞
    for (let i = 0; i < this.data.blocks.length; i++) {
      const block = this.data.blocks[i];
      
      // 检查是否碰撞
      if (this.isColliding(snake, block)) {
        // 如果颜色相同，获得积分并移除色块
        if (block.color === this.data.snakeColor) {
          // 播放收集音效
          const app = getApp();
          app.playSound('collect');
          
          // 增加积分
          const newScore = this.data.score + 100;
          
          // 更新色块数组（移除被碰撞的色块）
          const blocks = this.data.blocks.filter((_, index) => index !== i);
          
          this.setData({
            score: newScore,
            blocks: blocks
          });
          
          // 碰撞处理完成后立即返回，避免检查其他碰撞
          return;
        } else {
          // 如果颜色不同，游戏结束
          console.log('碰撞到不同颜色的色块，游戏结束');
          // 先更新游戏状态，再调用gameOver函数
          this.setData({
            gameStarted: false,
            isPaused: true,
            showGameOverModal: true
          }, () => {
            this.gameOver();
          });
          // 游戏结束后立即返回，不再执行后续逻辑
          return;
        }
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
    
    // 每500分增加游戏速度和色块生成率
    const speedMultiplier = 1 + Math.floor(score / 500) * 0.1;
    const blockRateMultiplier = 1 + Math.floor(score / 500) * 0.2;
    
    // 更新游戏速度和色块生成率
    this.setData({
      gameSpeed: 4 * speedMultiplier,
      blockGenerationRate: 0.15 * blockRateMultiplier,
      colorChangeRate: 0.1 * (1 + Math.floor(score / 1000) * 0.1)
    });
  },
  
  loadImages: function() {
      // 创建蛇头和蛇身图片对象
      const snakeHeadImages = {};
      const snakeBodyImages = {};
      const blockImages = {};
      // 从colorMapping获取颜色映射关系
      const colorEntries = Object.entries(this.data.colorMapping);
      
      console.log('开始加载图片资源，颜色映射:', colorEntries);
      
      // 加载所有颜色的蛇头和蛇身图片
      for (const [colorValue, colorName] of colorEntries) {
        console.log(`加载颜色 ${colorName} 对应的值 ${colorValue}`);
        
        // 创建蛇头图片对象
        const snakeHeadImg = this.canvas.createImage();
        snakeHeadImg.onload = () => {
          console.log(`Snake head image ${colorName} loaded`);
        };
        snakeHeadImg.onerror = (err) => {
          console.error(`Failed to load snake head image ${colorName}:`, err);
        };
        snakeHeadImg.src = `../../images/snake_head_${colorName}.svg`;
        snakeHeadImages[colorValue] = snakeHeadImg;
        
        // 创建蛇身图片对象
        const snakeBodyImg = this.canvas.createImage();
        snakeBodyImg.onload = () => {
          console.log(`Snake body image ${colorName} loaded`);
        };
        snakeBodyImg.onerror = (err) => {
          console.error(`Failed to load snake body image ${colorName}:`, err);
        };
        snakeBodyImg.src = `../../images/snake_body_${colorName}.svg`;
        snakeBodyImages[colorValue] = snakeBodyImg;
        
        // 创建色块图片对象
        const blockImg = this.canvas.createImage();
        blockImg.onload = () => {
          console.log(`Block image ${colorName} loaded for color value ${colorValue}`);
        };
        blockImg.onerror = (err) => {
          console.error(`Failed to load block image ${colorName} for color value ${colorValue}:`, err);
        };
        blockImg.src = `../../images/block_${colorName}.svg`;
        blockImages[colorValue] = blockImg;
      }
      
      console.log('图片资源加载完成，blockImages:', Object.keys(blockImages));
      
      this.snakeHeadImages = snakeHeadImages;
      this.snakeBodyImages = snakeBodyImages;
      this.blockImages = blockImages;
    },
  
  renderGame: function() {
    if (!this.ctx) {
      console.error('渲染上下文不存在，无法绘制游戏画面');
      return;
    }
    
    // 清空画布
    this.ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制背景
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制分数
    this.ctx.font = '30px Arial';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`分数: ${Math.floor(this.data.score)}`, this.data.canvasWidth / 2, 40);
    
    // 绘制背景线条，增强前进感
    this.ctx.strokeStyle = '#333333';
    this.ctx.lineWidth = 2;
    this.data.backgroundLines.forEach(line => {
      this.ctx.beginPath();
      this.ctx.moveTo(line.x, line.y);
      this.ctx.lineTo(line.x, line.y - line.length);
      this.ctx.stroke();
    });
    
    const snakeColor = this.data.snakeColor;
    const snakePositions = this.data.snakePositions;
    
    // 绘制蛇身体（从尾部到头部）
    if (this.snakeBodyImages && this.snakeBodyImages[snakeColor]) {
      // 从第二个位置开始绘制身体（第一个位置是头部）
      // console.log(snakePositions)
      for (let i = 1; i < snakePositions.length; i++) {
        const bodyPos = snakePositions[i];
        // 添加动态偏移量（根据移动方向调整）
        // const offsetX = this.data.snake.speedX * (i * 2); 
        // const offsetY = this.data.snake.speedY * (i * 2);
        
        try {
          this.ctx.drawImage(
            this.snakeBodyImages[snakeColor],
            bodyPos.x,
            bodyPos.y,
            this.data.snake.width,
            this.data.snake.height
          );
          // console.log('index: ', i, '绘制蛇身体: ', bodyPos, '颜色: ', snakeColor, '图片: ');
        } catch (err) {
          console.error('绘制蛇身体失败:', err);
          // 使用颜色填充作为备选
          this.ctx.fillStyle = snakeColor;
          this.ctx.fillRect(
            bodyPos.x,
            bodyPos.y,
            this.data.snake.width,
            this.data.snake.height
          );
        }
      }
    } else {
      // 如果图片未加载，使用颜色填充
      for (let i = 1; i < snakePositions.length; i++) {
        const bodyPos = snakePositions[i];
        this.ctx.fillStyle = snakeColor;
        this.ctx.fillRect(
          bodyPos.x,
          bodyPos.y,
          this.data.snake.width,
          this.data.snake.height
        );
      }
    }
    
    // 绘制蛇头（在第一个位置）
    if (this.snakeHeadImages && this.snakeHeadImages[snakeColor] && snakePositions.length > 0) {
      const headPos = snakePositions[0];
      
      try {
        this.ctx.drawImage(
          this.snakeHeadImages[snakeColor],
          headPos.x,
          headPos.y,
          this.data.snake.width,
          this.data.snake.height
        );
      } catch (err) {
        console.error('绘制蛇头失败:', err);
        // 使用颜色填充作为备选
        this.ctx.fillStyle = snakeColor;
        this.ctx.fillRect(
          headPos.x,
          headPos.y,
          this.data.snake.width,
          this.data.snake.height
        );
      }
    } else if (snakePositions.length > 0) {
      // 如果图片未加载，使用颜色填充
      this.ctx.fillStyle = snakeColor;
      this.ctx.fillRect(
        snakePositions[0].x,
        snakePositions[0].y,
        this.data.snake.width,
        this.data.snake.height
      );
    }
    
    // 绘制色块
    // console.log('准备绘制色块，数量:', this.data.blocks.length);
    if (this.data.blocks && this.data.blocks.length > 0) {
      this.data.blocks.forEach((block, index) => {
        if (!block) {
          console.log(`第${index}个色块为空，跳过绘制`);
          return;
        }
        // console.log(`绘制第${index+1}个色块:`, block);
        
        // 使用颜色填充绘制色块
        this.ctx.fillStyle = block.color;
        this.ctx.fillRect(block.x, block.y, block.width, block.height);
        
        // 添加边框使其更明显
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(block.x, block.y, block.width, block.height);
        
        // 在色块上显示颜色名称，便于调试
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px Arial';
        const colorName = this.data.colorMapping[block.color] || 'unknown';
        this.ctx.fillText(colorName, block.x + 2, block.y + 15);
      });
    } else {
      console.log('没有色块需要绘制');
    }
    
    // 绘制颜色转换区域
    this.data.colorChangeZones.forEach(zone => {
      this.ctx.fillStyle = zone.color;
      this.ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      this.ctx.strokeStyle = zone.borderColor;
      this.ctx.setLineDash(zone.dash);
      this.ctx.lineWidth = zone.borderWidth;
      this.ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    });
    
    // 不需要更新颜色指示器，因为WXML中没有定义该组件
    // 在controls中直接显示当前颜色
    // 注意：这里不再使用selectComponent，避免因组件不存在而导致错误
  },
  
  gameLoop: function() {
    // 如果游戏已结束，不再继续游戏循环
    if (this.data.gameOver) {
      console.log('游戏已结束，停止游戏循环');
      // 清除之前的定时器
      if (this.data.animationFrameId) {
        clearTimeout(this.data.animationFrameId);
        this.data.animationFrameId = null;
      }
      // 不在这里设置gameOver状态，避免与gameOver函数冲突
      // 只渲染最终游戏画面
      this.renderGame();
      return;
    }
    
    // 检查上下文是否存在
    if (!this.ctx) {
      console.error('游戏循环中发现上下文不存在，尝试重新初始化');
      // 尝试重新获取上下文
      const query = wx.createSelectorQuery();
      query.select('.game-canvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res && res[0] && res[0].node) {
            const canvas = res[0].node;
            this.ctx = canvas.getContext('2d');
            this.canvas = canvas;
            console.log('重新获取上下文成功');
            // 设置画布大小
            canvas.width = this.data.canvasWidth;
            canvas.height = this.data.canvasHeight;
            // 加载图片资源
            this.loadImages();
          } else {
            console.error('重新获取Canvas节点失败');
          }
        });
      
      // 如果游戏未结束，继续游戏循环
      if (!this.data.gameOver) {
        this.data.animationFrameId = setTimeout(() => {
          this.gameLoop();
        }, 16);
      }
      return;
    }
    
    const currentTime = Date.now();
    const deltaTime = currentTime - this.data.lastFrameTime;
    
    try {
      // 更新游戏状态
      this.updateGame(deltaTime);
      
      // 渲染游戏画面
      this.renderGame();
      
      // 更新上一帧时间
      this.setData({
        lastFrameTime: currentTime
      });
    } catch (err) {
      console.error('游戏循环中发生错误:', err);
    }
    
    // 只有在游戏未结束的情况下才继续游戏循环
    if (!this.data.gameOver) {
      // 使用setTimeout替代requestAnimationFrame，因为某些版本的微信小程序不支持wx.requestAnimationFrame
      this.data.animationFrameId = setTimeout(() => {
        this.gameLoop();
      }, 16); // 约60fps的刷新率
    }
  },
  
  gameOver: function() {
    const app = getApp();
    // 清除定时器
    if (this.data.animationFrameId) {
      clearTimeout(this.data.animationFrameId);
      this.data.animationFrameId = null;
    }
  
    // 更新状态
    console.log('触发gameOver', this.data.showGameOverModal); // 确认状态更新
    this.setData({
      gameOver: true,
      gameStarted: false,
      isPaused: false,
      finalScore: Math.floor(this.data.score),
      showGameOverModal: true, // 显示结束弹窗
      isNewHighScore: app.updateHighScore(Math.floor(this.data.score))
    }, () => {
      this.renderGame(); // 确保渲染最终画面
    });
  },
  
  restartGame: function() {
    this.setData({
      showGameOverModal: false
    }, () => {
      this.initGame();
      this.startGame();
    });
  },
  
  goToHome: function() {
    wx.navigateBack();
  }
});

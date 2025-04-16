App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);

  },
  globalData: {
    userInfo: null,
    userId: null,
    userName: null,
    jwtToken: null,
    status: null,
    dietStatus: null,
    sportStatus:null,
    socketTask: null,
    msgList: [],
    fullConversation:""
  },
  linkWebSocket(){
    
    if (!this.globalData.socketTask || this.globalData.socketTask.readyState === wx.connectSocket.CLOSED) {
      const jwtToken = this.globalData.jwtToken || wx.getStorageSync('jwtToken');
      if (!jwtToken) {
          console.error('未获取到 JWT Token，无法请求用户信息');
          return;
      }
      // 连接 WebSocket
      this.globalData.socketTask = wx.connectSocket({
         url: 'ws://localhost:9202/ws',
         header: {
           'content-type': 'application/json',
           'Authorization': `Bearer ${jwtToken}`
         },
         success: function (res) {
           console.log('WebSocket连接创建成功');
         },
         fail: function (err) {
           console.log('WebSocket连接创建失败', err);
         }
     });}
  },
  getUserInfo() {
    const jwtToken = this.globalData.jwtToken || wx.getStorageSync('jwtToken');
    if (!jwtToken) {
        console.error('未获取到 JWT Token，无法请求用户信息');
        return;
    }
    wx.request({
        url: 'http://localhost:8080/user/getInfo',
        method: 'GET',
        header: {
            'Authorization': `Bearer ${jwtToken}`
        },
        success: (res) => {
            if (res.statusCode === 200) {
                const { code, message, data } = res.data;
                if (code === 200) {
                    const {userId,userName,status,dietStatus,sportStatus} = data;
                    this.globalData.userId = userId;
                    this.globalData.userName = userName;
                    this.globalData.status = status;
                    this.globalData.dietStatus = dietStatus;
                    this.globalData.sportStatus = sportStatus;
                    wx.setStorageSync('userId', userId);
                    wx.setStorageSync('userName', userName);
                    wx.setStorageSync('status', status);
                    wx.setStorageSync('dietStatus', dietStatus);
                    wx.setStorageSync('sportStatus', sportStatus);
                    console.log('成功获取并缓存用户信息');
                } else {
                    console.error('业务处理失败，消息:', message);
                }
            } else {
                console.error('获取用户信息失败，状态码:', res.statusCode);
            }
        },
        fail: (err) => {
            console.error('请求接口失败:', err);
        }
    });
},

  // 获取 userId 的方法
  getUserId() {
    if (!this.globalData.userId) {
      this.globalData.userId = wx.getStorageSync('userId');
    }
    return this.globalData.userId;
  },
  // 获取 userName 的方法
  getUserName() {
    if (!this.globalData.userName) {
      this.globalData.userName = wx.getStorageSync('userName');
    }
    return this.globalData.userName;
  },
  getJwtToken(){
    if (!this.globalData.jwtToken) {
      this.globalData.jwtToken = wx.getStorageSync('jwtToken');
    }
    return this.globalData.jwtToken;
  },
  getStatus() {
    if (!this.globalData.status) {
      this.globalData.status = wx.getStorageSync('status');
    }
    return this.globalData.status;
  },
  setStatus(status) {
    this.globalData.status = status;
    // 可以在这里添加一些额外的逻辑，比如保存状态到本地存储
    wx.setStorageSync('status', status);
  },
  getDietStatus() {
    if (!this.globalData.dietStatus) {
      this.globalData.dietStatus = wx.getStorageSync('dietStatus');
    }
    return this.globalData.dietStatus;
  },
  setStatus(dietStatus) {
    this.globalData.dietStatus = dietStatus;
    // 可以在这里添加一些额外的逻辑，比如保存状态到本地存储
    wx.setStorageSync('dietStatus', dietStatus);
  },
  getSocketTask(){
    return this.globalData.socketTask;
  },
  closeWebSocket() {
    const socketTask = this.globalData.socketTask;
    if (socketTask && (socketTask.readyState === wx.CONNECTING || socketTask.readyState === wx.OPEN)) {
      socketTask.close();
      console.log('WebSocket 连接已关闭');
    }
  }
});
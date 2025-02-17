const app = getApp();
var inputVal = '';
var msgList = [];
var windowWidth = wx.getSystemInfoSync().windowWidth;
var windowHeight = wx.getSystemInfoSync().windowHeight;
var keyHeight = 0;

let lineCount = Math.floor(windowWidth / 16) - 6;
let curAnsCount = 0;
function initData(that) {
  const app = getApp();
  const jwtToken = app.getJwtToken();
  // 验证 JWT Token
  if (!jwtToken) {
    console.error('未获取到 JWT Token，无法请求新建健康档案');
    wx.showToast({
    icon: 'none',
    title: '未获取到 JWT Token，无法请求新建健康档案',
    duration: 2500
  });
  return;
    }
  inputVal = '';
  // 调用后端接口获取健康小贴士
  wx.request({
    
    url: 'http://localhost:8080/bigModule/healthTips', // 替换为实际的后端接口地址
    method: 'GET',
    header: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
  },
    success: function (res) {
      if (res.statusCode === 200 && res.data.code === 200) { // 假设 CommonResult 的成功码是 0
        msgList = [{
          speaker: 'server',
          contentType: 'text',
          content: res.data.data // 获取返回的健康小贴士文本
        }];
        that.setData({
          msgList,
          inputVal
        });
      } else {
        console.error('获取健康小贴士失败:', res.data);
        // 可以设置默认提示信息
        msgList = [{
          speaker: 'server',
          contentType: 'text',
          content: '你好，我是健康助手，请问有什么可以帮你？'
        }];
        that.setData({
          msgList,
          inputVal
        });
      }
    },
    fail: function (err) {
      console.error('请求失败:', err);
      // 设置默认提示信息
      msgList = [{
        speaker: 'server',
        contentType: 'text',
        content: '你好，我是健康助手，请问有什么可以帮你？'
      }];
      that.setData({
        msgList,
        inputVal
      });
    }
  });
}

/**
 * 发送 HTTP 请求到后端接口
 */
function sendHttpMessage(msg, that) {
  let isHttpRequestComplete = false; // 标记 HTTP 请求是否完成
  let socketTask;
  const app = getApp();
  const jwtToken = app.getJwtToken();

  // 发起 HTTP 请求
  wx.request({
      url: 'http://127.0.0.1:8080/bigModule/chat',
      method: 'GET',
      data: {
          text: msg
      },
      success: (res) => {
          if (res.statusCode === 200 && res.data) {
              console.log('HTTP 请求成功');
          } else {
              console.error('聊天请求失败:', res);
          }
      },
      fail: (err) => {
          console.error('HTTP 请求失败:', err);
      }
  });

  // 连接 WebSocket
  socketTask = wx.connectSocket({
    url: 'ws://localhost:9202/ws',
    header: { 'content-type': 'application/json' ,
  },
    success: function (res) {
        console.log('WebSocket连接创建成功');
        // 这里添加订阅逻辑
        // 假设可以通过发送特定格式的消息进行订阅
        socketTask.send({
            data: JSON.stringify({
                command: 'SUBSCRIBE',
                destination: '/topic/chat'
            })
        });
    },
    fail: function (err) {
        console.log('WebSocket连接创建失败', err);
    }
});

  // 监听 WebSocket 消息
  socketTask.onMessage((res) => {

      const data = JSON.parse(res.data);
      let fullResponse = '';
      if (Array.isArray(data)) {
          data.forEach(chunk => {
              if (chunk && chunk.choices && chunk.choices[0].message) {
                  fullResponse += chunk.choices[0].message.content;
              }
          });
      } else if (data && data.choices && data.choices[0].message) {
          fullResponse = data.choices[0].message.content;
      }

      // 更新 msgList 以显示拼接后的完整回复
      msgList.push({
          speaker: 'server',
          contentType: 'text',
          content: ''
      });
      curAnsCount++;
      if (curAnsCount % lineCount === 0) {
          wx.createSelectorQuery().select('#chatPage').boundingClientRect(function (rect) {
              wx.pageScrollTo({
                  scrollTop: rect.bottom
              });
          }).exec();
      }
      // 在 onMessage 中判断结束条件
      if (data.isEnd) { // 假设服务端返回结束标志
        socketTask.close();
      }
      // 逐字显示
      showTextCharacterByCharacter(fullResponse, that);
      
  });

  // 监听 WebSocket 关闭事件
  socketTask.onClose(() => {
      console.log('WebSocket 连接关闭');
  });

  // 监听 WebSocket 错误事件
  socketTask.onError((err) => {
      console.error('WebSocket 发生错误:', err);
  });
}

/* function sendHttpMessage(msg, that) {
  wx.request({
      url: 'http://127.0.0.1:8080/bigModule/chat', // 后端的 chat 接口 URL
      method: 'GET', // 使用 GET 请求
      data: {
          text: msg // 将用户输入的消息作为查询参数发送给后端
      },
      success: (res) => {
          if (res.statusCode === 200 && res.data) {
              // 后端返回的是一个字符串，直接使用
              const fullResponse = res.data;
              
              // 更新 msgList 以显示完整回复
              msgList.push({
                  speaker: 'server',
                  contentType: 'text',
                  content: fullResponse // 直接将完整的回复内容显示
              });

              curAnsCount++;
              if (curAnsCount % lineCount === 0) {
                  wx.createSelectorQuery().select('#chatPage').boundingClientRect(function (rect) {
                      wx.pageScrollTo({
                          scrollTop: rect.bottom
                      });
                  }).exec();
              }
          } else {
              console.error('聊天请求失败:', res);
          }
      },
      fail: (err) => {
          console.error('请求失败:', err);
      }
  });
} */


/**
 * 逐字显示内容
 * @param {string} text - 要显示的内容
 * @param {object} that - 当前页面的上下文
 */
function showTextCharacterByCharacter(text, that) {
  let currentContent = ''; // 用于存储当前显示的内容
  let index = 0; // 当前字符的索引

  // 每隔 100 毫秒显示一个字符
  let intervalId = setInterval(() => {
    if (index < text.length) {
      currentContent += text.charAt(index);
      msgList[msgList.length - 1].content = currentContent; // 更新当前消息的内容
      that.setData({
        msgList
      });
      index++;
    } else {
      clearInterval(intervalId); // 如果已经显示完所有字符，清除定时器
    }
  }, 20); // 100ms 后显示下一个字符，可以调整时间控制显示速度
}

Page({
  /**
   * 页面的初始数据
   */
  data: {
    scrollHeight: '100vh',
    inputBottom: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    initData(this);
    this.setData({
      cusHeadIcon: "/images/春日野穹.png",
    });
  },

  /**
   * 页面显示
   */
  onShow: function () {
    if (wx.getStorageSync('expireTime') == null || wx.getStorageSync('expireTime') < Date.now()) {
      wx.removeStorageSync('expireTime')
      let username = wx.getStorageSync('username')
      wx.removeStorageSync('username')
      wx.request({
        url: 'http://127.0.0.1:80/user/logout',
        method: "get",
        data: {
          "username": username,
        },
        success: ({ data }) => {
          wx.showToast({
            icon: 'none',
            title: '身份验证到期，请重新登录',
            duration: 2500
          });
        }
      });
    }
    wx.request({
      url: 'http://127.0.0.1:80/user/checkUserKey',
      method: "get",
      data: {
        "username": wx.getStorageSync('username'),
        "key": wx.getStorageSync('key')
      },
      success: ({ data }) => {
        if (data.code === 500) {
          wx.showToast({
            icon: 'none',
            title: data.message,
            duration: 2500
          });
          wx.removeStorageSync('username');
          wx.removeStorageSync('key');
          wx.redirectTo({
            url: '/pages/login/login',
          });/*  */
        }
      }
    });
    if (wx.getStorageSync('username') == null || wx.getStorageSync('username') === '') {
      wx.redirectTo({
        url: '/pages/login/login',
      });
    }
  },

  /**
   * 获取聚焦
   */
  focus: function (e) {
    let res = wx.getSystemInfoSync();
    let navBarHeight = res.statusBarHeight + 44; //顶部状态栏+顶部导航，大部分机型默认44px
    keyHeight = e.detail.height - navBarHeight;
    if (keyHeight < 0) {
      keyHeight = 0;
    }
    this.setData({
      scrollHeight: (windowHeight - keyHeight) + 'px'
    });
    this.setData({
      toView: 'msg-' + (msgList.length - 1),
      inputBottom: (keyHeight) + 'px'
    });
  },

  //失去聚焦(软键盘消失)
  blur: function (e) {
    this.setData({
      scrollHeight: '100vh',
      inputBottom: 0
    });
    this.setData({
      toView: 'msg-' + (msgList.length - 1)
    });
  },

  /**
   * 发送点击监听
   */
  sendClick: function (e) {
    const userInput = e.detail.value;
    msgList.push({
      speaker: 'customer',
      contentType: 'text',
      content: userInput
    });
    msgList.push({
      speaker: 'server',
      contentType: 'text',
      content: ''
    });
    inputVal = '';
    this.setData({
      msgList,
      inputVal
    });

    // 发送 HTTP 请求给后端
    sendHttpMessage(userInput, this);
  },

  /**
   * 退回上一页
   */
  toBackClick: function () {
    wx.navigateBack({});
  }
});

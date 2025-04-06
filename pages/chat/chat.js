const app = getApp();
var inputVal = '';
var msgList = [];
var windowWidth = wx.getSystemInfoSync().windowWidth;
var windowHeight = wx.getSystemInfoSync().windowHeight;
var keyHeight = 0;

let lineCount = Math.floor(windowWidth / 16) - 6;
let curAnsCount = 0;
let socketTask = null; // 定义全局的socketTask变量
let idleTimeoutId = null; // 定义空闲超时的定时器ID
const IDLE_TIMEOUT = 5 * 60 * 1000; // 空闲超时时间，这里设置为5分钟
let isMessageListenerBound = false; // 用于标记是否已经绑定了 onMessage 监听器

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
  const app = getApp();
  const jwtToken = app.getJwtToken();

  // 发起 HTTP 请求
  wx.request({
    url: 'http://127.0.0.1:8080/bigModule/chat',
    method: 'GET',
    header: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
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

  // 存储完整对话内容
  let fullConversation = '';
  // 当前正在处理的服务器消息在 msgList 中的索引
  let currentMsgIndex = -1;
  // 缓冲区，用于临时存储接收到的消息片段
  let buffer = '';
  // 定时器 ID
  let intervalId = null;
  // 逐字显示的时间间隔（毫秒）
  const displayInterval = 20;
  socketTask = app.getSocketTask();
  if (socketTask === null) {
    console.log(1);
    app.linkWebSocket();
    socketTask = app.getSocketTask();
  }

  // 只绑定一次 onMessage 监听器
  if (!isMessageListenerBound) {
    socketTask.onMessage((res) => {
      const receivedWord = res.data;
      // 过滤结束符
      if (receivedWord === '$$$') {
        // 如果缓冲区还有剩余字符，先处理这些字符
        if (buffer) {
          handleBufferedMessage();
        }
        handleCompleteMessage();
        return;
      }

      // 将接收到的消息添加到缓冲区
      buffer += receivedWord;
      // 拼接完整对话内容
      fullConversation += receivedWord;

      // 如果缓冲区字符数量达到 10 个，开始逐字显示
      if (buffer.length >= 10) {
        const displayText = buffer.slice(0, 10);
        buffer = buffer.slice(10);

        // 如果当前没有正在处理的服务器消息，创建新消息
        if (currentMsgIndex === -1 || msgList[currentMsgIndex].speaker!== 'server') {
          msgList.push({
            speaker: 'server',
            contentType: 'text',
            content: ''
          });
          currentMsgIndex = msgList.length - 1;
        }

        // 停止之前的定时器
        if (intervalId) {
          clearInterval(intervalId);
        }

        // 开始逐字显示新消息
        startCharacterByCharacterDisplay(displayText);
      }

      curAnsCount++;
      if (curAnsCount % lineCount === 0) {
        wx.createSelectorQuery().select('#chatPage').boundingClientRect(rect => {
          wx.pageScrollTo({
            scrollTop: rect.bottom
          });
        }).exec();
      }
    });
    isMessageListenerBound = true;
  }

  // 开始逐字显示的函数
  function startCharacterByCharacterDisplay(text) {
    let index = 0;
    intervalId = setInterval(() => {
      if (index < text.length) {
        const newContent = fullConversation.slice(0, fullConversation.length - buffer.length - text.length + index + 1);
        if (msgList[currentMsgIndex].content!== newContent) {
          msgList[currentMsgIndex].content = newContent;
          that.setData({
            msgList
          });
        }
        index++;
      } else {
        clearInterval(intervalId);
        // 如果缓冲区还有字符，继续处理
        if (buffer.length >= 10) {
          const nextDisplayText = buffer.slice(0, 10);
          buffer = buffer.slice(10);
          startCharacterByCharacterDisplay(nextDisplayText);
        }
      }
    }, displayInterval);
  }

  // 处理缓冲区剩余消息的函数
  function handleBufferedMessage() {
    if (buffer) {
      // 如果当前没有正在处理的服务器消息，创建新消息
      if (currentMsgIndex === -1 || msgList[currentMsgIndex].speaker!== 'server') {
        msgList.push({
          speaker: 'server',
          contentType: 'text',
          content: ''
        });
        currentMsgIndex = msgList.length - 1;
      }

      // 停止之前的定时器
      if (intervalId) {
        clearInterval(intervalId);
      }

      // 开始逐字显示缓冲区剩余的消息
      startCharacterByCharacterDisplay(buffer);
      buffer = '';
    }
  }

  // 处理完整消息的函数
  function handleCompleteMessage() {
    if (intervalId) {
      clearInterval(intervalId);
    }
    msgList[currentMsgIndex].content = fullConversation;
    that.setData({
      msgList
    });
    // 重置相关变量
    currentMsgIndex = -1;
    buffer = '';
    fullConversation = '';
  }

  // 监听 WebSocket 关闭事件
  if (!socketTask.__onCloseBound) {
    socketTask.onClose(() => {
      console.log('WebSocket 连接关闭');
    });
    socketTask.__onCloseBound = true;
  }

  // 监听 WebSocket 错误事件
  if (!socketTask.__onErrorBound) {
    socketTask.onError((err) => {
      console.error('WebSocket 发生错误:', err);
    });
    socketTask.__onErrorBound = true;
  }

  // 重置空闲超时定时器
  if (idleTimeoutId) {
    clearTimeout(idleTimeoutId);
  }
  idleTimeoutId = setTimeout(() => {
    if (socketTask && socketTask.readyState === wx.CONNECTING || socketTask.readyState === wx.OPEN) {
      socketTask.close();
      console.log('WebSocket 连接因空闲超时关闭');
    }
  }, IDLE_TIMEOUT);
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
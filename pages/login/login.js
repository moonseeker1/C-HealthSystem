// index.js
// 获取应用实例
const app = getApp()

Page({
  data: {
    username: '',
    password: '',
    clientHeight: '',
    registerUsername: '',
    registerPassword: '',
    buttons: [{ text: '取消' }, { text: '确认' }],
    isRegisterModalShow: false // 将此属性移到 data 中
  },
  onLoad() {
    if (wx.getStorageSync('username')) {
      wx.switchTab({
        url: '/pages/index/index',
      })
    }
    this.getWindowHeight()
  },

  // 获取窗口高度
  getWindowHeight() {
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          clientHeight: res.windowHeight
        });
      }
    })
  },

  // 获取登录输入框内容
  handleUsernameInput(e) {
    this.setData({
      username: e.detail.value
    })
  },
  handlePasswordInput(e) {
    this.setData({
      password: e.detail.value
    })
  },

  // 验证登录输入
  validateLoginInput() {
    const { username, password } = this.data
    if (!username) {
      wx.showToast({
        icon: 'none',
        title: '账号不能为空',
      })
      return false
    }
    if (!password) {
      wx.showToast({
        icon: 'none',
        title: '密码不能为空',
      })
      return false
    }
    return true
  },

  // 登录事件
  goadmin() {
    if (!this.validateLoginInput()) {
      return
    }

    const { username, password } = this.data
    wx.request({
      url: 'http://127.0.0.1:8080/user/login',
      method: 'post',
      data: {
        "userName": username,
        "password": password
      },
      success: (res) => {
        const { data } = res
        console.log(data);
        if (data.code === 200) {
          wx.showToast({
            icon: 'none',
            title: '登陆成功',
            duration: 2500
          })
          wx.setStorageSync('fromLogin', true);
          wx.setStorageSync("username", username)
          wx.setStorageSync('expireTime', Date.now() + 60 * 60 * 24 * 1000);
          const jwtToken = data.data;
          wx.setStorageSync('jwtToken', jwtToken);
          app.globalData.jwtToken = jwtToken;
          console.log("到期时间" + wx.getStorageSync('expireTime'))

          // 登录成功后调用 app.js 中的 getUserInfo 方法
          app.getUserInfo();

          wx.switchTab({
            url: '/pages/chat/chat'
          })
        } else {
          wx.showToast({
            icon: 'none',
            title: data.message,
            duration: 2500
          })
        }
      },
      fail: (err) => {
        console.error('登录请求失败:', err)
        wx.showToast({
          icon: 'none',
          title: `登录请求失败: ${err.errMsg}`,
          duration: 2500
        })
      }
    })
  },

  // 显示注册模态框
  showRegisterModal() {
    this.setData({
      isRegisterModalShow: true
    });
  },

  // 处理注册用户名输入
  handleRegisterUsernameInput(e) {
    this.setData({
      registerUsername: e.detail.value
    });
  },

  // 处理注册密码输入
  handleRegisterPasswordInput(e) {
    this.setData({
      registerPassword: e.detail.value
    });
  },

  // 验证注册输入
  validateRegisterInput() {
    const { registerUsername, registerPassword } = this.data
    if (!registerUsername) {
      wx.showToast({
        icon: 'none',
        title: '注册用户名不能为空',
      })
      return false
    }
    if (!registerPassword) {
      wx.showToast({
        icon: 'none',
        title: '注册密码不能为空',
      })
      return false
    }
    return true
  },

  // 确认注册
  confirmRegister() {
    if (!this.validateRegisterInput()) {
      return
    }

    const { registerUsername, registerPassword } = this.data
    const user = {
      userName: registerUsername,
      password: registerPassword
    };
    wx.request({
      url: 'http://127.0.0.1:8080/user/register', // 根据实际情况修改接口地址
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(user),
      success: (res) => {
        if (res.statusCode === 200) {
          const { code, message } = res.data
          if (code === 200) {
            wx.showToast({
              icon: 'success',
              title: '注册成功',
              duration: 1500
            });
          } else {
            wx.showToast({
              icon: 'none',
              title: message,
              duration: 2500
            });
          }
        } else {
          console.error('注册失败，状态码:', res.statusCode);
          wx.showToast({
            icon: 'none',
            title: '注册失败',
            duration: 2500
          });
        }
      },
      fail: (err) => {
        console.error('请求接口失败:', err);
        wx.showToast({
          icon: 'none',
          title: '请求接口失败',
          duration: 2500
        });
      },
      complete: () => {
        this.clearRegisterModal();
      }
    });
  },

  // 取消注册
  cancelRegister() {
    this.clearRegisterModal();
  },

  // 防止点击模态框内容关闭模态框
  preventClose() {},

  // 清除注册模态框内容
  clearRegisterModal() {
    this.setData({
      isRegisterModalShow: false,
      registerUsername: '',
      registerPassword: ''
    });
  }
})
// 获取应用实例
const app = getApp()
let idleTimeoutId = null; // 定义空闲超时的定时器ID
const IDLE_TIMEOUT = 5 * 60 * 1000; // 空闲超时时间，这里设置为5分钟
Page({
    data: {
        buttons: [{ text: '取消' }, { text: '确认' }],
        isShow: false,
        // 新增健康档案模态框相关数据
        isHealthModalShow: false,
        isUpdateHealthModalShow: false, 
        healthData: {
            age: '',
            sexIndex: '0', // 0 表示男，1 表示女，默认选择男
            sex: 0, // 存储性别的数值
            height: '',
            weight: '',
            bloodPressure: '',
            bloodSugar: ''
        },
        isModalOpen: false, 
        intervalId: null ,
        isHealthSuggestionModalShow: false,
        healthSuggestion: '',
        sexOptions: ['男', '女'] // 性别选项
    },
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
                success: ({
                    data
                }) => {
                    wx.showToast({
                        icon: 'none',
                        title: '身份验证到期，请重新登录',
                        duration: 2500
                    })
                }
            })

        }
        wx.request({
            url: 'http://127.0.0.1:80/user/checkUserKey',
            method: "get",
            data: {
                "username": wx.getStorageSync('username'),
                "key": wx.getStorageSync('key')
            },
            success: ({
                data
            }) => {
                if (data.code === 500) {
                    wx.showToast({
                        icon: 'none',
                        title: data.message,
                        duration: 2500
                    })
                    wx.removeStorageSync('username')
                    wx.removeStorageSync('key')
                    wx.redirectTo({
                        url: '/pages/login/login',
                    })
                }
            }
        })
        if (wx.getStorageSync('username') == null || wx.getStorageSync('username') === '') {
            wx.redirectTo({
                url: '/pages/login/login',
            })
        }
    },
    logout(event) {
        this.setData({
            isShow: true
        })
    },
    confirmLogout({ detail }) {
        console.log(detail.index);
        if (detail.index == '1') {
            wx.removeStorageSync('expireTime')
            let username = wx.getStorageSync('username')
            wx.removeStorageSync('username')
            wx.request({
                url: 'http://127.0.0.1:80/user/logout',
                method: "get",
                data: {
                    "username": username,
                },
                success: ({
                    data
                }) => {
                    wx.showToast({
                        icon: 'none',
                        title: '退出成功',
                        duration: 1500
                    })
                }
            })
            wx.redirectTo({
                url: '/pages/login/login',
            })
        }
        this.setData({
            isShow: false
        })
    },
    
    // 健康档案格子点击事件处理函数
    showHealthModal() {
        const app = getApp();
        const userId = app.getUserId(); // 假设 app.js 中有 getUserId 方法获取 userId
        const jwtToken = app.getJwtToken();

        if (!jwtToken) {
            console.error('未获取到 JWT Token，无法请求健康档案数据');
            wx.showToast({
                icon: 'none',
                title: '未获取到 JWT Token，无法请求健康档案数据'
            });
            return;
        }

        if (userId) {
            wx.request({
                url: `http://127.0.0.1:8080/health/get/${userId}`,
                method: 'GET',
                header: {
                    'Authorization': `Bearer ${jwtToken}`
                },
                success: (res) => {
                    if (res.statusCode === 200) {
                        const { code, message, data } = res.data;
                        if (code === 200) { // 假设 200 表示请求成功
                            const { age, sex, height, weight, bloodPressure, bloodSugar } = data;
                            const sexIndex = sex === 0? 0 : 1; // 根据性别数值设置索引
                            console.log(sexIndex);
                            this.setData({
                                healthData: {
                                    age: age || '',
                                    sexIndex: sexIndex,
                                    sex: sex || '',
                                    height: height || '',
                                    weight: weight || '',
                                    bloodPressure: bloodPressure || '',
                                    bloodSugar: bloodSugar || ''
                                },
                                // 显示修改健康档案的模态框
                                isUpdateHealthModalShow: true 
                            });
                        } else {
                            console.error('业务处理失败，消息:', message);
                            wx.showToast({
                                icon: 'none',
                                title: message
                            });
                        }
                    } else {
                        console.error('获取健康档案数据失败，状态码:', res.statusCode);
                        wx.showToast({
                            icon: 'none',
                            title: `获取健康档案数据失败，状态码: ${res.statusCode}`
                        });
                    }
                },
                fail: (err) => {
                    console.error('请求接口失败:', err);
                    wx.showToast({
                        icon: 'none',
                        title: `请求接口失败: ${err.errMsg}`
                    });
                },
                complete: () => {
                    // 不在这里统一显示模态框，而是在请求成功时显示
                }
            });
        } else {
            console.error('未获取到 userId');
            wx.showToast({
                icon: 'none',
                title: '未获取到 userId'
            });
        }
    },
    // 新建健康档案按钮点击事件处理函数
    showNewHealthModal() {
        const app = getApp();
        const status = app.getStatus();
        console.log(status);
        if (status === 1) {
            wx.showToast({
                icon: 'none',
                title: '已建立档案，无法重复新建',
                duration: 2500
            });
            return;
        }
        // 清空健康档案数据
        this.setData({
            healthData: {
                age: '',
                sexIndex: '0',
                sex: 0,
                height: '',
                weight: '',
                bloodPressure: '',
                bloodSugar: ''
            },
            isHealthModalShow: true
        });
    },
    // 处理健康档案模态框输入框内容变化
    handleHealthInputChange(e) {
        const { field } = e.currentTarget.dataset;
        const { value } = e.detail;
        this.setData({
            [`healthData.${field}`]: value
        });
    },
    // 处理性别选择变化的方法
    handleSexChange: function(e) {
      const index = e.detail.value;
      console.log(index === '0'? '0' : '1');
      this.setData({
          "healthData.sexIndex": index,
          "healthData.sex": index === '0'? '0' : '1' // 根据选择更新对应的数值
      }, );
      console.log(this.data.healthData.sex);
  },
    // 处理健康档案模态框确认按钮点击事件
    confirmNewHealthData({ detail }) {
        const app = getApp();
        const userId = app.getUserId(); // 假设 app.js 中有 getUserId 方法获取 userId
        const jwtToken = app.getJwtToken();

        // 检查 detail.index 是否为 1，决定是否提交数据
        if (detail.index === 1) {
            // 解构健康数据
            const { age, sex, height, weight, bloodPressure, bloodSugar } = this.data.healthData;
            console.log(this.data.healthData.sex);
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

            // 构建要发送的数据对象
            const healthDataToSend = {
                age,
                sex,
                height,
                weight,
                bloodPressure,
                bloodSugar
            };

            // 发送请求到服务器
            wx.request({
                url: 'http://127.0.0.1:8080/health/create',
                method: 'POST',
                header: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(healthDataToSend),
                success: (res) => {
                    if (res.statusCode === 200) {
                        const { code, message } = res.data;
                        if (code === 200) {
                            wx.showToast({
                                icon: 'success',
                                title: '新建健康档案成功',
                                duration: 2500
                            });
                            // 更新应用状态，表示已建立档案
                            app.setStatus(1); 
                            // 关闭模态框并清空数据
                            this.setData({
                                isHealthModalShow: false,
                                healthData: {
                                    age: '',
                                    sexIndex: 0,
                                    sex: 0,
                                    height: '',
                                    weight: '',
                                    bloodPressure: '',
                                    bloodSugar: ''
                                }
                            });
                        } else {
                            wx.showToast({
                                icon: 'none',
                                title: message,
                                duration: 2500
                            });
                        }
                    } else {
                        console.error('新建健康档案失败，状态码:', res.statusCode);
                        wx.showToast({
                            icon: 'none',
                            title: `新建健康档案失败，状态码: ${res.statusCode}`,
                            duration: 2500
                        });
                    }
                },
                fail: (err) => {
                    console.error('请求接口失败:', err);
                    wx.showToast({
                        icon: 'none',
                        title: `请求接口失败: ${err.errMsg}`,
                        duration: 2500
                    });
                }
            });
        } else {
            // 如果用户取消，直接关闭模态框并清空数据
            this.setData({
                isHealthModalShow: false,
                healthData: {
                    age: '',
                    sexIndex: 0,
                    sex: 0,
                    height: '',
                    weight: '',
                    bloodPressure: '',
                    bloodSugar: ''
                }
            });
        }
    },
    showHealthSuggestionModal() {
      const app = getApp();
      const userId = app.getUserId();
      const jwtToken = app.getJwtToken();
      const that = this;
    
      if (!jwtToken) {
        console.error('未获取到 JWT Token，无法请求健康分析');
        wx.showToast({
          icon: 'none',
          title: '未获取到 JWT Token，无法请求健康分析'
        });
        return;
      }
    
      if (userId) {
        // 初始化建议内容为空
        that.setData({
          healthSuggestion: '',
          isHealthSuggestionModalShow: true,
          isModalOpen: true
        });
    
        wx.request({
          url: `http://127.0.0.1:8080/bigModule/analysis?userId=${userId}`,
          method: 'GET',
          header: {
            'Authorization': `Bearer ${jwtToken}`
          },
          success: (res) => {
            if (res.statusCode === 200 && res.data) {
              console.log('分析请求成功');
            } else {
              console.error('分析请求失败:', res);
            }
          },
          fail: (err) => {
            console.error('HTTP 请求失败:', err);
          },
        });
      } else {
        console.error('未获取到 userId');
        wx.showToast({
          icon: 'none',
          title: '未获取到 userId'
        });
        return;
      }
    
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
      let socketTask = app.getSocketTask();
      if (socketTask === null) {
        app.linkWebSocket();
        socketTask = app.getSocketTask();
      }
    
      // 监听 WebSocket 消息
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
    
          // 停止之前的定时器
          if (intervalId) {
            clearInterval(intervalId);
          }
    
          // 开始逐字显示新消息
          startCharacterByCharacterDisplay(displayText);
        }
      });
    
      // 开始逐字显示的函数
      function startCharacterByCharacterDisplay(text) {
        let index = 0;
        intervalId = setInterval(() => {
          if (index < text.length) {
            const newContent = fullConversation.slice(0, fullConversation.length - buffer.length - text.length + index + 1);
            that.setData({
              healthSuggestion: newContent
            });
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
        that.setData({
          healthSuggestion: fullConversation
        });
        // 重置相关变量
        currentMsgIndex = -1;
        buffer = '';
        fullConversation = '';
        // 隐藏加载提示
        wx.hideLoading();
      }
    
      // 监听 WebSocket 关闭事件
      socketTask.onClose(() => {
        console.log('WebSocket 连接关闭');
      });
    
      // 监听 WebSocket 错误事件
      socketTask.onError((err) => {
        console.error('WebSocket 发生错误:', err);
        // 隐藏加载提示
        wx.hideLoading();
      });
    },

    // 处理健康建议模态框确认按钮点击事件
    confirmHealthSuggestion({ detail }) {
        if (detail.index === 1) {
            // 这里可以添加确认后的逻辑，比如记录用户已查看建议等
        }
        this.setData({
            isHealthSuggestionModalShow: false
        });
    },
    // 处理健康档案模态框确认按钮点击事件，用于提交修改后的数据
    confirmUpdateHealthData({ detail }) {
        const app = getApp();
        const userId = app.getUserId();
        const jwtToken = app.getJwtToken();

        // 检查 detail.index 是否为 1，决定是否提交数据
        if (detail.index === 1) {
            const { age, sex, height, weight, bloodPressure, bloodSugar } = this.data.healthData;
            if (!jwtToken) {
                console.error('未获取到 JWT Token，无法请求更新健康档案');
                wx.showToast({
                    icon: 'none',
                    title: '未获取到 JWT Token，无法请求更新健康档案',
                    duration: 2500
                });
                return;
            }

            const healthDataToSend = {
                userId: userId,
                sex,
                age,
                height,
                weight,
                bloodPressure,
                bloodSugar
            };

            wx.request({
                url: 'http://127.0.0.1:8080/health/update',
                method: 'PUT',
                header: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(healthDataToSend),
                success: (res) => {
                    if (res.statusCode === 200) {
                        const { code, message } = res.data;
                        if (code === 200) {
                            wx.showToast({
                                icon: 'success',
                                title: '健康档案更新成功',
                                duration: 2500
                            });
                            // 使用新变量隐藏模态框
                            this.setData({
                                isUpdateHealthModalShow: false
                            });
                        } else {
                            wx.showToast({
                                icon: 'none',
                                title: message,
                                duration: 2500
                            });
                        }
                    } else {
                        console.error('更新健康档案失败，状态码:', res.statusCode);
                        wx.showToast({
                            icon: 'none',
                            title: `更新健康档案失败，状态码: ${res.statusCode}`,
                            duration: 2500
                        });
                    }
                },
                fail: (err) => {
                    console.error('请求接口失败:', err);
                    wx.showToast({
                        icon: 'none',
                        title: `请求接口失败: ${err.errMsg}`,
                        duration: 2500
                    });
                }
            });
        } else {
            // 如果用户取消，直接关闭模态框
            this.setData({
                isUpdateHealthModalShow: false
            });
        }
    }
})    
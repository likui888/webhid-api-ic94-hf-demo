import store from "@/store";
import {ab2Hex, str2Bytes} from "@/utils/utils";
import {CMD, HEAD, MessageTran} from "@/components/webhid/common";

export const HFContextHolder = {
    // 连接参数
    requestParams: null,
    // init options
    options: null,
    // 是否开启自动搜寻
    autoSearch: false,
    // 用于缓存并解析返回指令
    cachedData: [], // 累积缓存指令
    cacheExpire: 1000, // 缓存超时清空
    cacheTimestamp: 0, // 最新接收指令时间戳

    /**
     * 初始化
     */
    async init(requestParams, options) {
        this.requestParams = requestParams
        await this.logPrint('[info] 开始初始化...')
        // 检查环境
        await this.validateEnv()
            .then(() => {
                this.logPrint('[info] 检查结束')
                // 事件注册
                this.registerHidDeviceEvent();
                // 准备连接
                this.startPreConnect(options)
            })
            .catch((err) => {
                alert(err)
                this.logPrint('[error] ' + err)
            }).finally(() => {
                // 创建对象
                this.logPrint('[info] 初始化结束...')
            })
    },
    /**
     * 初始化前检查是否满足硬件要求
     */
    validateEnv() {
        return new Promise((resolve, reject) => {
            // 检查是否已经创建
            if (store.getters.HFContextHolder) {
                return reject('初始化失败，对象已存在....');
            }
            // 检查浏览器是否支持
            if (!"hid" in navigator) {
                return reject('您的浏览器不支持 WebHID，请更新浏览器或使用 Chrome 浏览器');
            }
            return resolve()
        })
    },

    /**
     * 注册 hid 设备 连接/断开 事件
     * 1.connect 开始检测是否插入了之前使用的串口 并做自动连接处理
     * 2.disconnect 检测是否拔掉了正在使用的串口 并作停止处理
     */
    async registerHidDeviceEvent() {
        await this.logPrint('[info] 注册设备连接/断开事件...')
        navigator.hid.addEventListener('connect', event => {
            this.logPrint("[registerHidDeviceEvent]  设备已连接  ", JSON.stringify(event?.device))
        });
        navigator.hid.addEventListener('disconnect', event => {
            this.logPrint("[registerHidDeviceEvent]  设备已断开  ", JSON.stringify(event?.device))
        });
    },
    /**
     * 连接 hid 设备
     */
    async doConnectHidDevice(device) {
        if (!device) {
            return alert('设备异常')
        }
        if (device.opened) {
            return alert('设备已经打开')
        }
        this.logPrint('[doConnectHidDevice]  开始连接设备...')
        // 打开设备
        device.open().then(async () => {
            this.logPrint('[doConnectHidDevice]  连接成功设备已打开')
            // 监听数据
            device.oninputreport = (e) => this.listener(e);
            // 设置全局 hid 设备
            await store.dispatch('HFStore/set_holder', device)
        })
    },
    /**
     * 数据发送
     * @param reportId 报告id
     * 参考
     * https://developer.chrome.com/articles/hid-examples/
     * https://github.com/WICG/webhid/blob/main/EXPLAINER.md#example
     * https://wicg.github.io/webhid/#sendreport-method
     * chrome://device-log/?refresh=%3Csec%3E
     * @param data 指令
     */
    doExecuteCommand(reportId, data) {
        if (!store.getters.holder && store.getters.holder.opened) {
            this.logPrint("[error] hid don`t connect ...")
            return alert('设备未连接')
        }
        this.logPrint("send data start ...")
        const bytes = new Uint8Array(data.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        return store.getters.holder.sendReport(reportId, bytes).then(() => {
            this.logPrint("sent data success ==>> " + ab2Hex(bytes).toUpperCase())
        }).catch(alert)
    },
    /**
     * 监听数据回调方法
     */
    listener(e) {
        if (!e || !e.data.buffer) {
            this.logPrint("[listener] [error]  receive data error")
            return alert('接收数据异常')
        }
        this.logPrint("[listener]  receive data")
        this.logPrint(ab2Hex(e.data.buffer).toUpperCase())
        this.handlerReceiveData(str2Bytes(ab2Hex(e.data.buffer)))
        // client -  0E7E550B010000001F16000000426500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
        // client -  1C7E5519010000001F1600040004F7DD913C00000000000008000057C00000000000000000000000000000000000000000000000000000000000000000000000
    },
    /**
     * 确定将要连接的hid设备
     * 此方法会弹出设备选择框 手动点击 注意：此方法只能由用户主动触发否则将提示无权限操作
     */
    determineSuitableHidEquipment(device) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!device) {
                    navigator.hid.requestDevice(this.requestParams).then(async (devices) => {
                        // 弹出设备不选择的情况下
                        if (devices.length === 0) {
                            alert('未选择设备')
                            return reject(null);
                        }
                        await this.logPrint(`[determineSuitableHidEquipment]  ${JSON.stringify(devices)}`)
                        return resolve(devices[0])
                        // 默认连接第一个设备
                    });
                } else {
                    await this.logPrint(`[determineSuitableHidEquipment]  ${JSON.stringify(devices)}`)
                    return resolve(device)
                }
            } catch (error) {
                await this.logPrint("[determineSuitableHidEquipment] 查找失败 ", JSON.stringify(error))
            }
        })
    },
    /**
     * 根据浏览器来选择设备
     * @return {Promise<unknown>}
     */
    startManualGetDevice() {
        try {
            navigator.hid.requestDevice(this.requestParams).then((devices) => {
                // 弹出设备不选择的情况下
                if (devices.length === 0) {
                    return alert('未选择设备')
                }
                this.logPrint(`[determineSuitableHidEquipment]  ${JSON.stringify(devices)}`)
                // 连接设备
                this.doConnectHidDevice(devices[0])
            });
        } catch (error) {
            this.logPrint("[determineSuitableHidEquipment] 查找失败 ", JSON.stringify(error))
        }
    },
    /**
     * 自动寻找 hid 设备
     */
    startAutoGetDevice(searchCycleTime) {
        if (this.autoSearchDeviceTimer) {
            this.logPrint('[info] 清空定时器')
            clearInterval(this.autoSearchDeviceTimer)
        }
        document.addEventListener('DOMContentLoaded', async () => {
            this.logPrint('[info] 开始自动寻找设备')
            this.autoSearchDeviceTimer = setInterval(async () => {
                try {
                    this.logPrint('[info] 设备寻找中...')
                    await navigator.hid.getDevices().then(devices => {
                        devices.forEach(device => {
                            if (device.vendorId === this.requestParams.filters[0].vendorId && device.productId === this.requestParams.filters[0].productId && !store.getters.holder) {
                                this.logPrint('[info] 已发现设备...')
                                // 清空定时器
                                clearInterval(this.autoSearchDeviceTimer)
                                // 开启连接
                                this.doConnectHidDevice(device)
                            }
                        });
                    })
                } catch (e) {
                    alert(e)
                    clearInterval(this.autoSearchDeviceTimer)
                }
            }, searchCycleTime)
        });
    },
    /**
     * 开始准备连接 判断连接模式
     */
    async startPreConnect(options) {
        switch (options?.connectType) {
            case 'auto':
                this.startAutoGetDevice(options?.searchCycleTime || 2000)
                break;
            case 'manual':
                //  don`t need do anything， user need call 【startManualGetDevice】 in page dom
                break;
            // .... other type
            default:
                await this.startAutoGetDevice(options?.searchCycleTime || 2000)
        }
    },
    /**
     * 销毁连接
     */
    destroy() {
        if (store.getters.holder && store.getters.holder?.opened) {
            this.logPrint('[info] 断开连接')
            try {
                store.getters.holder.close()
            } catch (e) {
                alert(e)
            }
            this.logPrint('[info] 断开连接')
            return
        }
        this.logPrint('[info] 销毁失败，实例不存在')
    },
    /**
     * 日志输出
     * @param logContent
     */
    async logPrint(logContent) {
        await store.dispatch('HFStore/append_logContent', logContent)
    },
    /**
     * 读取场内标签
     * @param mode 模式 0x00:读取空闲标签 0x01:读取所有标签
     * @return {Promise<unknown>}
     */
    readTag(mode = 0x00) {
        return new Promise((resolve, reject) => {
            let timer = setTimeout(() => {
                return reject('查询场内标签超时')
            }, 1000)
            this.on('read_tag', (result) => {
                clearTimeout(timer)
                // 结束方法回调
                this.initCallBackMethods('read_tag')
                if (result.success) {
                    if (result.data) {
                        let dataStr = ab2Hex(result.data.slice(3, 7))
                        this.logPrint('[readTag] 读取到场内标签', dataStr)
                        return resolve(dataStr)
                    } else {
                        return resolve()
                    }
                } else {
                    reject(result.error)
                }
            })
            let params = []
            params.push(mode)
            // 注意 0E 为此读卡器特殊处理
            this.explainCommand([0x0E], CMD.READ_TAG, params)
        })
    },
    /*
    * 监听事件
    * bind method 通过 bind method 来回调事件
    *
    * */
    on(event, listener) {
        if (listener instanceof Function) {
            this[event + '_callback'] = listener
        }
    },
    /**
     * 初始化回调方法
     */
    initCallBackMethods(event) {
        if (this[event + '_callback'] instanceof Function) {
            this[event + '_callback'] = () => {
            }
            return
        }
        this.read_tag_callback = () => {
        }
    },
    /**
     *指令解析
     */
    explainCommand(prefix, cmd, params) {
        // more explain methods
        let m = new MessageTran(prefix, cmd, params)
        // do execute
        this.doExecuteCommand(this.options?.reportId || 0, ab2Hex(m.data))
    },
    /**
     *处理接收到的数据
     * @param data
     */
    handlerReceiveData(data) {
        console.log("received raw data: " + ab2Hex(data).toUpperCase())
        let nCount = data.length
        let now = Date.now()
        if (now - this.cacheTimestamp > this.cacheExpire) {
            // 超时清空缓存
            // console.log('超时清空缓存')
            this.cachedData = []
        }
        this.cacheTimestamp = now
        for (let i = 0; i < nCount; i++) {
            let tmp = data[i]
            if (this.cachedData.length === 0 && tmp !== 0x7E) {
                // 不合法指令，跳过
                // console.log('不合法指令，跳过' + data.slice(i, i+1).toString('hex').toUpperCase())
                this.cachedData = []
                continue
            }
            if (this.cachedData.length === 1 && tmp !== 0x55) {
                // 不合法指令，跳过
                // console.log('不合法指令，跳过' + data.slice(i, i+1).toString('hex').toUpperCase())
                this.cachedData = []
                continue
            }
            this.cachedData.push(tmp)
            let length = this.cachedData.length
            // console.log('length:'+length)
            if (length > 10) {
                // +3表示包括Head位和Len位的总长度
                let commandLength = this.cachedData[2] + 3
                // console.log('commandLength:'+commandLength)
                if (commandLength === length) {
                    // console.log(Buffer.from(this.cachedData).toString('hex'))
                    this.distributionCallbackData(this.cachedData)
                    this.cachedData = []
                }
            }
            if (length > 100) {
                // 累积指令过长，清空
                this.cachedData = []
                // console.log("累积指令过长，清空")
            }
        }
    },
    /**
     * 反馈数据分发
     * @param data
     */
    distributionCallbackData(data) {
        let messageTran = MessageTran.convert(data)
        console.log(messageTran)
        if (messageTran.head[0] === HEAD.HEAD[0] && messageTran.head[1] === HEAD.HEAD[1]) {
            let cmd = messageTran.cmd
            switch (cmd) {
                case CMD.READ_TAG:
                    this.onReadTagCallback(messageTran)
                    break
                default:
                    alert('未知指令')
            }
        }
    },
    onReadTagCallback(messageTran) {
        console.log('onReadTagCallback')
        let params = messageTran.params
        let result = {}
        if (params.length <= 2) {
            result.success = true
            result.error = '场内无标签'
        } else if (params.length > 16) {
            result.success = false
            result.error = '场内存在多个标签'
        } else {
            result.success = true
            result.data = params.slice(0, 14)
        }
        this.read_tag_callback(result)
    }
}
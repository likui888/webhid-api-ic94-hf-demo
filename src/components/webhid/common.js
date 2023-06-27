import {crc16x25} from "@/utils/utils";

const HEAD = {
    HEAD: [0x7E, 0x55],
    SOURCE_ADDR: [0x00, 0x00],
    TARGET_ADDR: [],
    HEAD1: 0x7E,
    HEAD2: 0x55,
}

const CMD = {
    TAG_FEEDBACK: 0x15,
    READ_TAG: 0x16,
    READ_M1: 0x70,
    WRITE_M1: 0x71,
}

class MessageTran {
    constructor(prefix, cmd, params) {

        this.data = []

        // 帧头
        this.head = HEAD.HEAD
        this.head.forEach(h=>{
            this.data.push(h)
        })
        // 帧长度 从源地址开始到 CRC 结束(包含 CRC)的字节数
        this.length = 6 + params.length + 2
        this.data.push(this.length)
        // 源地址
        this.sourceAddr = [0x00,0x00]
        this.sourceAddr.forEach(a=>{
            this.data.push(a)
        })
        // 目标地址
        this.targetAddr = [0x01,0x00]
        this.targetAddr.forEach(a=>{
            this.data.push(a)
        })
        // 命令码
        this.cmd = cmd
        this.data.push(this.cmd)
        // 保留
        this.reserve = 0x00
        this.data.push(this.reserve)
        // 参数
        params.forEach(p=>{
            this.data.push(p)
        })
        // CRC 为从帧长度开始(含帧长度)到参数区结束(含参数区)的 CRC校验
        let checksum = crc16x25(this.data, 2)
        this.data.push(checksum&0x00FF)     // 低位
        this.data.push(checksum>>8)         // 高位

        this.prefix = prefix
        for (let i = prefix.length - 1; i >= 0 ; i--) {
            this.data.unshift(prefix[i])
        }
    }
    static convert(data) {
        // console.log('convert:', Buffer.from(data).toString('hex'))
        let o = {
            data: data
        }
        o.head = []
        o.head.push(data[0])
        o.head.push(data[1])

        o.length = data[2]

        o.sourceAddr = []
        o.sourceAddr.push(data[3])
        o.sourceAddr.push(data[4])

        o.targetAddr = []
        o.targetAddr.push(data[5])
        o.targetAddr.push(data[6])

        o.sign = data[7]

        o.cmd = data[8]

        o.reserve = data[9]

        o.params = []
        for (let i = 0; i < o.length - 9; i++) {
            o.params.push(data[i+10])
        }

        // console.log('o:', JSON.stringify(o))

        return o
    }
}

export {
    HEAD,
    CMD,
    MessageTran,
}

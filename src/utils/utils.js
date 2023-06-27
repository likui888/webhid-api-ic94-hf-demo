// ArrayBuffer转16进制字符串

function ab2Hex(buffer) {
    const hexArr = Array.prototype.map.call(new Uint8Array(buffer), function (bit) {
        return ('00' + bit.toString(16)).slice(-2)
    })
    return hexArr.join('')
}


/**
 * CRC16(x25)
 * 目前用于HID Reader
 * @param data
 * @param start
 * @param end
 * @return {*}
 */
function crc16x25(data, start, end) {
    data =  data.slice(start, end)
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
            if (crc & 1) {
                crc = (crc >> 1) ^ 0x8408;
            } else {
                crc >>= 1;
            }
        }
    }
    return ~crc;
}

/**
 * 校验和（目前用于RFID读写器指令）
 * @param data
 * @param start
 * @param len
 * @returns {number}
 */
function checkSum(data, start, len) {
    let btSum = 0x00;

    for (let i = start; i < start + len; i++ ) {
        btSum += data[i];
    }
    return (((~btSum) + 1) & 0xFF);
}


/**
 * 检查是否为16进制字符串
 * @param str
 * @returns {boolean}
 */
function checkHexStr(str) {
    let tmp = str.toUpperCase()
    const range = '0123456789ABCDEF'.split('')
    return tmp.split('').every(e => range.includes(e));
}

/**
 * 随机十六进制字符串
 * @param length
 * @returns {string}
 */
function randomHexStr(length) {
    if (isNaN(length) || length<=0) {
        return ''
    }
    let hex = '0123456789ABCDEF'.split('')
    let str = ''
    for (let i = 0; i < length; i++) {
        str = str + hex[Math.floor(Math.random()*16)]
    }
    return str
}
export const str2Bytes = (str) => {
    let len = str.length
    if (len % 2 != 0) {
        return null
    }
    let hexA = []
    for (let i = 0; i < len; i += 2) {
        let s = str.substr(i, 2)
        let v = parseInt(s, 16)
        hexA.push(v)
    }
    return hexA
}
export {
    crc16x25,
    checkSum,
    checkHexStr,
    randomHexStr,
    ab2Hex
}

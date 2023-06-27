import XEUtils from "xe-utils";
const state = {
    /**
     *  已经建立连接的 hid 对象
     */
    deviceHolder: null,
    /**
     * 日志内容
     */
    logContent: "",
}

// 存储到 Store 中
const mutations = {}
const actions = {
    /**
     * 设置日志内容
     * @param state
     * @param logContent
     */
    append_logContent: ({commit}, logContent) => {
        state.logContent += XEUtils.toDateString(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS') + "===>>" + logContent + "\n";
    },
    clear_logContent: ({commit}) => {
        state.logContent = "";
    },
    /**
     * 设置 holder 对象
     */
    set_holder: ({commit}, holder) => {
        state.deviceHolder = holder;
        console.log("set_holder", holder)
    },
}
export default {
    namespaced: true,
    state,
    mutations,
    actions
}


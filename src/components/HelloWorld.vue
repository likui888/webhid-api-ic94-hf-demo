<script setup>
import {onMounted, ref} from "vue";
import store from "@/store";
import {HFContextHolder} from "@/components/webhid/HFContextHolder";
defineProps({
  msg: {
    type: String,
    required: true
  }
})
onMounted(()=>{
    HFContextHolder.init({ filters: [ {vendorId: 0x0505, productId: 0x5050}]})
})
/**
 * 读取卡号
 * @return {Promise<void>}
 */
const getCardNo = async () => {
   HFContextHolder.readTag().then(value => {
       if (!value){
           console.log("场内无标签")
           return
       }
        alert(value)
    })
}
</script>

<template>
    <div>
        <div>
            <button  @click="store.dispatch('HFStore/clear_logContent')">清空日志</button>
            <button style="margin-left: 10px" @click="HFContextHolder.startManualGetDevice()">搜索设备</button>
            <button style="margin-left: 10px" :disabled="!store.getters.holder?.opened" @click="getCardNo">读取卡片</button>
            <button style="margin-left: 10px" :disabled="!store.getters.holder?.opened" @click="HFContextHolder.destroy()">断开连接</button>
        </div>
        <div style="margin-top: 5px">
            <textarea disabled style="height: 500px;width: 800px" :value="store.getters.logContent"/>
        </div>
    </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    display: block;
    text-align: left;
  }
}
</style>

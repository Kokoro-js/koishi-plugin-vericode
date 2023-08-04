# koishi-plugin-vericode

[![npm](https://img.shields.io/npm/v/koishi-plugin-vericode?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-vericode)

Koishi plugin generates verification code image with canvas for when new member joins

**使用前记得给予机器人对应的权限（管理员或者群主或者禁言人的权限）**

### 工作流程

 > 新加入成员  
 > 使用canvas生成验证码图片  
 > 发送图片和文字  
 > 等待新成员回复（直接发送图片内容）  
 > 验证不成功/超时则禁言15天  

### 效果
[![Htf2oEQ.md.png](https://iili.io/Htf2oEQ.md.png)](https://freeimage.host/i/Htf2oEQ)

 ## 鸣谢

 大佬 [ahdg](https://github.com/ahdg6)(直接把饭喂我嘴里了)  
 生成验证码部分 参考了开源库 [canvas-verification-code](https://github.com/levblanc/canvas-verification-code)
 以及开发群的各位佬
import { Bot, Context, h, Schema } from "koishi";
import { } from "koishi-plugin-skia-canvas";
export const name = "vericode";

export interface Config {
  type: any;
  codeLen: number;
  width: number;
  height: number;
  noise: number;
  groups: string[];
  groupPromptTime: number;
  groupMuteTime: number;
}

export const inject = ['canvas']

export const usage = `
<h2>如遇使用问题可以前往QQ群: 957500313 讨论<h2>
`

export const Config: Schema<Config> =
  Schema.intersect([
    Schema.object({
      type: Schema.union(["default", "number", "letter"])
        .default("default")
        .description("验证码类型"),
      codeLen: Schema.number().default(4).description("验证码字符数量"),
      width: Schema.number().default(200).description("验证码图片宽度"),
      height: Schema.number().default(40).description("验证码图片高度"),
      noise: Schema.number()
        .default(8)
        .min(0)
        .max(100)
        .description("验证码干扰级别(最高100，0为禁用)")
    }).description("验证码配置"),
    Schema.object({
      groupPromptTime: Schema.number().default(300000).description("验证等待时间 (ms)"),
      groupMuteTime: Schema.number().default(1296000000).description("验证失败禁言时间 (ms), 默认 15 天"),
      groups: Schema.array(Schema.string())
        .role("table")
        .description("启用的群组ID"),
    }).description("群组配置")
  ]).description("VeriCode")

// Function to add random noise dots to the canvas
const addNoiseDots = (context, count) => {
  const width = context.canvas.width;
  const height = context.canvas.height;
  for (let i = 0; i < count; i++) {
    const x = randomInt(0, width);
    const y = randomInt(0, height);
    context.beginPath();
    context.arc(x, y, 1, 0, 2 * Math.PI);
    context.fillStyle = randomColor(1, 100);
    context.fill();
  }
};

export function apply(ctx: Context, config: Config, bot: Bot) {
  ctx.command("vcode", { authority: 4 })
    .action(async ({ session }) => {
      const canvas = ctx.canvas.createCanvas(config.width, config.height);
      const { context, codeText } = drawImg(canvas);
      session.send(h.image(context.canvas.toBuffer("image/png"), "image/png"))
      return `上图的验证码是 ${codeText}。`
      // const message = h("figure");
      // message.children.push(
      //   h.image(context.canvas.toBuffer("image/png"), "image/png"),
      // );
      // message.children.push(h.text(`上图的验证码是 ${codeText}。`));
      // return message;
    });

  ctx.on("guild-member-added", async (session) => {
    if (!config.groups.includes(session.guildId)) return;
    const canvas = ctx.canvas.createCanvas(config.width, config.height);
    const { context, codeText } = drawImg(canvas);
    await session.send(h.image(context.canvas.toBuffer("image/png"), "image/png"))
    // const message = h("figure");
    // message.children.push(
    //   h.image(context.canvas.toBuffer("image/png"), "image/png"),
    // );
    // message.children.push(h.text("欢迎入群，请在五分钟内回复图片里的验证码。"));
    // await session.send(message);
    await session.send("欢迎入群，请在五分钟内回复图片里的验证码。")
    const code = await session.prompt(config.groupPromptTime);
    let muteTime = config.groupMuteTime;
    if (!code) {
      session.send("未输入验证码，已取消验证。请联系群主或管理员进行手动验证");
      await bot.internal.setGroupBanAsync(
        session.guildId,
        session.userId,
        muteTime,
      );
      return;
    }
    const codeLower = code.toLowerCase();
    if (code === codeText || codeLower === codeText.toLowerCase()) {
      return `验证成功，欢迎入群`;
    } else {
      session.send("验证码错误，已取消验证。请联系群主或管理员进行手动验证");
      await bot.internal.setGroupBanAsync(
        session.guildId,
        session.userId,
        muteTime,
      );
      return;
    }
  });

  function drawImg(canvas) {
    const context = canvas.getContext("2d");
    // define number and letters for generating the code
    // some of numbers and letters may look alike in sans-serif font
    // they are:
    // numbers: 0, 1
    // letters: i, l, o, I, L, O, Q, S
    // feel free to delete them from the string
    const numberArr = "0123456789".split("");
    const letterArr =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    let codeText = "";
    let targetArr = [];

    // define final characters set
    if (config.type === "default") {
      targetArr = numberArr.concat(letterArr);
    } else if (config.type === "number") {
      targetArr = numberArr;
    } else {
      targetArr = letterArr;
    }

    // set fill color for the canvas rectangle
    // color between RGB 180 ~ 255 is relatively light
    // so that it won't conflict with foreground chars
    context.fillStyle = randomColor(180, 255);
    // set background opacity
    context.globalAlpha = 0.7;
    // fill rectangle
    context.fillRect(0, 0, config.width, config.height);
    // reset alpha value for text
    context.globalAlpha = 1;
    // generation code chars
    for (let i = 0; i < config.codeLen; i++) {
      // randomly pick a character
      const textIndex = randomInt(0, targetArr.length - 1);
      const targetChar = targetArr[textIndex];

      // set style for the char
      context.font = "bold 38px serif";
      // set baseline alignment
      context.textBaseline = "middle";
      // fill the char
      // color between RGB 1 ~ 100 is relatively dark
      // so that your char stands out from the background
      context.fillStyle = randomColor(1, 100);

      // translate positions
      const transX = (config.width / config.codeLen) * (i + 0.2);
      const transY = config.height / 2;
      // random scale sizes
      const scaleX = randomArbitrary(0.8, 1);
      const scaleY = randomArbitrary(0.8, 1);
      // random rotate degree
      const deg = Math.PI / 180;
      const rotate = randomArbitrary(-60, 60);

      // DO NOT put rotate before translate
      // SEQUENCE DOES MATTER !!!
      context.translate(transX, transY);
      context.scale(scaleX, scaleY);
      context.rotate(deg * rotate);
      const count = config.width * config.height * config.noise * 0.01;
      addNoiseDots(context, count);

      // fill the char
      context.fillText(targetChar, 0, 0);
      // reset all transforms for next char
      context.setTransform(1, 0, 0, 1, 0, 0);

      // save the char into string
      codeText += targetChar;
    }

    return { context, codeText };
  }
}

/**
 * Get a random number between [min, max)
 * @param {number} min minimun value
 * @param {number} max maximun value
 */
const randomArbitrary = (min, max) => Math.random() * (max - min) + min;

/**
 * Get a random integer between  [min, max]
 * @param {number} min minimun value
 * @param {number} max maximun value
 */
const randomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
};

/**
 * Get a random color value between [min, max]
 * @param {number} min minimun value
 * @param {number} max maximun value
 */
const randomColor = (min, max) => {
  const r = randomInt(min, max);
  const g = randomInt(min, max);
  const b = randomInt(min, max);
  return `rgb(${r}, ${g}, ${b})`;
};

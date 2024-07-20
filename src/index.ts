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
  groupWelcomeMessage: string;
  timeOutMessage: string;
  failMessage: string;
  successMessage: string;
  groupPromptTime: number;
  actionOnFail: any;
  groupMuteTime: number;
  debug: boolean;
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
      width: Schema.number().default(250).description("验证码图片宽度"),
      height: Schema.number().default(40).description("验证码图片高度"),
      noise: Schema.number()
        .default(10)
        .min(0)
        .max(100)
        .description("验证码干扰级别(最高100，0为禁用)")
    }).description("验证码配置"),
    Schema.object({
      groupWelcomeMessage: Schema.string().default("欢迎入群，请在 五分钟 内回复图片里的验证码。").description("入群时提示信息"),
      timeOutMessage: Schema.string().default("验证超时，已取消验证。请联系群主或管理员进行手动验证").description("验证超时提示信息"),
      failMessage: Schema.string().default("验证码错误，已取消验证。请联系群主或管理员进行手动验证").description("验证失败提示信息"),
      successMessage: Schema.string().default("验证成功，欢迎入群").description("验证成功提示信息"),
      groupPromptTime: Schema.number().default(300000).description("验证等待时间 (ms)"),
      actionOnFail: Schema.union(["mute", "ban", "nothing"]).default("mute").description("验证失败后的操作, 默认禁言"),
      groupMuteTime: Schema.number().default(1296000000).description("验证失败禁言时间 (ms), 默认 15 天"),
      groups: Schema.array(Schema.string())
        .role("table")
        .description("启用的群组ID"),
    }).description("群组配置"),
    Schema.object({
      debug: Schema.boolean().default(false),
    }).description("其他")
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

  if (config.debug) {
    ctx.command("vcode", { authority: 4 })
      .action(async ({ session }) => {
        const canvas = ctx.canvas.createCanvas(config.width, config.height);
        const { context, codeText } = drawImg(canvas);
        await session.send(h.image(context.canvas.toBuffer("image/png"), "image/png"))
        return `上图的验证码是 ${codeText}。`
      });
  }

  ctx.on("guild-member-added", async (session) => {
    // ctx.command("popo")
    //  .action(async ({ session }) => {
    if (!config.groups.includes(session.guildId)) return;
    const canvas = ctx.canvas.createCanvas(config.width, config.height);
    const { context, codeText } = drawImg(canvas);
    await session.send(h.image(context.canvas.toBuffer("image/png"), "image/png"))

    await session.send(config.groupWelcomeMessage)
    const code = await session.prompt(config.groupPromptTime);
    let muteTime = config.groupMuteTime;
    if (!code) {
      await session.send(config.timeOutMessage);
      if (config.actionOnFail === "ban") {
        await session.bot.kickGuildMember(session.guildId, session.userId)
      } else if (config.actionOnFail === "mute") {
        await session.bot.muteGuildMember(session.guildId, session.userId, muteTime)
      } else {
        return
      }
      return;
    }
    const codeLower = code.toLowerCase();
    if (code === codeText || codeLower === codeText.toLowerCase()) {
      await session.send(config.successMessage);
      return
    } else {
      await session.send(config.failMessage);
      if (config.actionOnFail === "ban") {
        await session.bot.kickGuildMember(session.guildId, session.userId)
      } else if (config.actionOnFail === "mute") {
        await session.bot.muteGuildMember(session.guildId, session.userId, muteTime)
      } else {
        return
      }
      return;
    }
  });

  function drawImg(canvas) {
    const context = canvas.getContext("2d");

    // Define numbers and letters for generating the code
    // Exclude characters that look alike
    const numberArr = "23456789".split(""); // Exclude 0, 1
    const letterArr = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ".split(""); // Exclude i, l, o, I, L, O, Q, S

    let codeText = "";
    let targetArr = [];

    // Define final characters set
    if (config.type === "default") {
      targetArr = numberArr.concat(letterArr);
    } else if (config.type === "number") {
      targetArr = numberArr;
    } else {
      targetArr = letterArr;
    }

    // Set fill color for the canvas rectangle
    context.fillStyle = randomColor(180, 255);
    // Set background opacity
    context.globalAlpha = 0.7;
    // Fill rectangle
    context.fillRect(0, 0, config.width, config.height);
    // Reset alpha value for text
    context.globalAlpha = 1;

    // Generation code chars
    for (let i = 0; i < config.codeLen; i++) {
      // Randomly pick a character
      const textIndex = randomInt(0, targetArr.length - 1);
      const targetChar = targetArr[textIndex];

      // Set style for the char
      context.font = "bold 38px serif";
      // Set baseline alignment
      context.textBaseline = "middle";
      // Fill the char
      context.fillStyle = randomColor(1, 100);

      // Translate positions
      const transX = (config.width / config.codeLen) * (i + 0.5); // Center the char horizontally within its segment
      const transY = config.height / 2; // Center the char vertically

      // Random rotate degree
      const rotate = randomArbitrary(-30, 30); // Reduce the rotation angle to avoid overlap

      // Apply transformations
      context.save(); // Save the current state
      context.translate(transX, transY);
      context.rotate((Math.PI / 180) * rotate);

      // Fill the char
      context.fillText(targetChar, 0, 0);
      context.restore(); // Restore the state for the next char

      // Save the char into string
      codeText += targetChar;
    }

    // Add noise dots
    const count = config.width * config.height * config.noise * 0.01;
    addNoiseDots(context, count);

    return { context, codeText };
  }

  // Function to generate random colors within a given range
  function randomColor(min, max) {
    const r = randomInt(min, max);
    const g = randomInt(min, max);
    const b = randomInt(min, max);
    return `rgb(${r},${g},${b})`;
  }

  // Function to generate a random integer within a range
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Function to generate a random floating-point number within a range
  function randomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
  }

  // Function to add noise dots
  function addNoiseDots(context, count) {
    for (let i = 0; i < count; i++) {
      context.fillStyle = randomColor(0, 255);
      const x = randomInt(0, context.canvas.width);
      const y = randomInt(0, context.canvas.height);
      context.beginPath();
      context.arc(x, y, 1, 0, 2 * Math.PI);
      context.fill();
    }
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

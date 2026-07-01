import { Telegraf } from "telegraf";
import { registerCommandHandlers } from "./handlers/command-handlers";
import { registerTextHandlers } from "./handlers/text-handlers";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error(
    "TELEGRAM_BOT_TOKEN is not set. Please add it to your environment (e.g. .env).",
  );
}

export const bot = new Telegraf(token);

registerCommandHandlers(bot);
registerTextHandlers(bot);

export async function launchTelegramBot(): Promise<void> {
  await bot.telegram.setMyCommands([
    { command: "start", description: "Start" },
    { command: "rules", description: "List all 12 rules" },
    { command: "rule", description: "Get a rule by number" },
    { command: "help", description: "Help" },
  ]);

  await bot.launch();
  console.log("Telegram bot started and is now polling for updates");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

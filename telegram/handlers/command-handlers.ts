import { Telegraf } from "telegraf";

const START_MESSAGE =
  "RULE 1 Stand up straight with your shoulders back\n" +
  "  Lobsters—and Territory";

export function registerCommandHandlers(bot: Telegraf): void {
  bot.start(async (ctx) => {
    await ctx.reply(START_MESSAGE);
  });
}

import { Telegraf } from "telegraf";
import { loadRules } from "../content/rules";

export function registerCommandHandlers(bot: Telegraf): void {
  bot.start(async (ctx) => {
    await ctx.reply(
      "Hi! This bot helps you study «12 Rules for Life».\n\n" +
        "Use /rules to see the full list.",
    );
  });

  bot.command("rules", async (ctx) => {
    const rules = await loadRules();
    const list = rules.map((r) => `${r.number}. ${r.title}`).join("\n");
    await ctx.reply(`12 Rules for Life\n\n${list}`);
  });
}

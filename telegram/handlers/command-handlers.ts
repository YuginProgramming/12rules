import { Telegraf } from "telegraf";
import {
  getChapter,
  getRuleWithChapters,
  listRules,
} from "../../DB/queries/rules.js";
import { splitTelegramMessage } from "../core/split-message.js";

export function registerCommandHandlers(bot: Telegraf): void {
  bot.start(async (ctx) => {
    await ctx.reply(
      "Hi! This bot helps you study «12 Rules for Life».\n\n" +
        "Use /rules to see the full list.\n" +
        "Use /rule <n> to see chapters for a rule (e.g. /rule 1).\n" +
        "Use /chapter <rule> <n> to read a chapter (e.g. /chapter 1 1).",
    );
  });

  bot.command("rules", async (ctx) => {
    try {
      const rules = await listRules();
      if (rules.length === 0) {
        await ctx.reply("No rules in the database yet. Run npm run db:seed.");
        return;
      }
      const list = rules
        .map((r) => `${r.ruleNumber}. ${r.titleOriginal}`)
        .join("\n");
      await ctx.reply(`12 Rules for Life\n\n${list}`);
    } catch (err) {
      console.error("Error handling /rules:", err);
      await ctx.reply("Could not load rules from the database. Try again later.");
    }
  });

  bot.command("rule", async (ctx) => {
    try {
      const arg = ctx.message.text.split(/\s+/)[1];
      const n = Number(arg);
      if (!Number.isInteger(n) || n < 1) {
        await ctx.reply("Specify a rule number, e.g.: /rule 1");
        return;
      }

      const rule = await getRuleWithChapters(n);
      if (!rule) {
        await ctx.reply("No such rule. Use /rules to see the list (1–12).");
        return;
      }

      const chapters =
        rule.chapters.length === 0
          ? "(no chapters yet)"
          : rule.chapters
              .map((c) => `${c.chapterNumber}. ${c.titleOriginal}`)
              .join("\n");

      await ctx.reply(
        `Rule ${rule.ruleNumber}\n${rule.titleOriginal}\n\nChapters:\n${chapters}`,
      );
    } catch (err) {
      console.error("Error handling /rule:", err);
      await ctx.reply("Could not load that rule. Try again later.");
    }
  });

  bot.command("chapter", async (ctx) => {
    try {
      const parts = ctx.message.text.trim().split(/\s+/);
      const ruleNumber = Number(parts[1]);
      const chapterNumber = Number(parts[2]);
      if (
        !Number.isInteger(ruleNumber) ||
        ruleNumber < 1 ||
        !Number.isInteger(chapterNumber) ||
        chapterNumber < 1
      ) {
        await ctx.reply("Specify rule and chapter, e.g.: /chapter 1 1");
        return;
      }

      const chapter = await getChapter(ruleNumber, chapterNumber);
      if (!chapter) {
        await ctx.reply(
          "Chapter not found. Use /rule <n> to see chapters for that rule.",
        );
        return;
      }

      if (!chapter.contentOriginal.trim()) {
        await ctx.reply(
          `Rule ${chapter.ruleNumber} / Chapter ${chapter.chapterNumber}\n` +
            `${chapter.titleOriginal}\n\n` +
            "(No English text imported yet. Run npm run db:import-fb2.)",
        );
        return;
      }

      const header =
        `Rule ${chapter.ruleNumber}: ${chapter.ruleTitle}\n` +
        `Chapter ${chapter.chapterNumber}: ${chapter.titleOriginal}\n\n`;
      const chunks = splitTelegramMessage(header + chapter.contentOriginal);
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }
    } catch (err) {
      console.error("Error handling /chapter:", err);
      await ctx.reply("Could not load that chapter. Try again later.");
    }
  });
}

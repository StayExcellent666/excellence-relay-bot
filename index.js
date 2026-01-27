// ================== KEEP RENDER AWAKE ==================
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Bot is running"));
app.listen(PORT, () => {
  console.log(`🌐 Listening on port ${PORT}`);
});

// ================== DISCORD BOT ==================
const { Client, GatewayIntentBits, WebhookClient } = require("discord.js");

// ---- ENV VARS (trimmed to avoid hidden whitespace bugs)
const BOT_TOKEN = (process.env.BOT_TOKEN || "").trim();
const SOURCE_CHANNEL_ID = (process.env.SOURCE_CHANNEL_ID || "").trim();
const WEBHOOK_URL = (process.env.WEBHOOK_URL || "").trim();

// ---- ENV SANITY CHECK
console.log("ENV CHECK:", {
  BOT_TOKEN: BOT_TOKEN ? "set" : "MISSING",
  SOURCE_CHANNEL_ID: SOURCE_CHANNEL_ID ? "set" : "MISSING",
  WEBHOOK_URL: WEBHOOK_URL ? "set" : "MISSING",
});

if (!BOT_TOKEN || !SOURCE_CHANNEL_ID || !WEBHOOK_URL) {
  throw new Error("❌ Missing environment variables");
}

// ---- CLIENT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ---- WEBHOOK
const webhook = new WebhookClient({ url: WEBHOOK_URL });

// ---- LOGIN EVENTS
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("error", (e) => console.error("DISCORD ERROR:", e));
client.on("warn", (w) => console.warn("DISCORD WARN:", w));

// ---- MESSAGE HANDLER
client.on("messageCreate", async (message) => {
  console.log("SAW MESSAGE:", message.channelId, message.author.username);

  // Only forward from source channel
  if (message.channelId !== SOURCE_CHANNEL_ID) {
    console.log("SKIP: wrong channel");
    return;
  }

  try {
    const embeds = message.embeds.length
      ? message.embeds.map(e => e.toJSON())
      : undefined;

    const files = message.attachments.size
      ? [...message.attachments.values()].map(a => a.url)
      : undefined;

    await webhook.send({
      content: message.content || null,
      embeds,
      files,
      username: "Excellence",
      avatarURL:
        "https://cdn.discordapp.com/attachments/1091844470737227944/1465524732677062729/ChatGPT_Image_Jan_27_2026_02_04_53_AM.png",
      allowedMentions: { parse: [] },
    });

    console.log("SENT ✅");
  } catch (err) {
    console.error("WEBHOOK FAILED ❌", err);
  }
});

// ---- START BOT
client.login(BOT_TOKEN).catch(err => {
  console.error("LOGIN FAILED ❌", err);
});

// ---- SAFETY NET
process.on("unhandledRejection", err =>
  console.error("UNHANDLED REJECTION:", err)
);
process.on("uncaughtException", err =>
  console.error("UNCAUGHT EXCEPTION:", err)
);

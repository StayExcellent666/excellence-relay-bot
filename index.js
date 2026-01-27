
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Bot is running"));

app.listen(PORT, () => {
  console.log(`🌐 Listening on port ${PORT}`);
});

const { Client, GatewayIntentBits, WebhookClient } = require("discord.js");

// ====== CONFIG ======
const BOT_TOKEN = process.env.BOT_TOKEN;
const SOURCE_CHANNEL_ID = process.env.SOURCE_CHANNEL_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
// ====================
console.log("ENV CHECK:", {
  BOT_TOKEN: BOT_TOKEN ? "set" : "MISSING",
  SOURCE_CHANNEL_ID: SOURCE_CHANNEL_ID ? "set" : "MISSING",
  WEBHOOK_URL: WEBHOOK_URL ? "set" : "MISSING",
});

if (!BOT_TOKEN || !SOURCE_CHANNEL_ID || !WEBHOOK_URL) {
  throw new Error("Missing env vars. Check Render Environment Variables keys.");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const webhook = new WebhookClient({ url: WEBHOOK_URL });

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  console.log(
    "SAW MESSAGE:",
    message.channelId,
    message.author.username,
    message.content
  );

  if (message.channelId !== SOURCE_CHANNEL_ID) return;

  try {
    // Convert embeds properly
    const embeds = message.embeds?.map(e => e.toJSON()) ?? [];

    // Convert attachments (Collection → array)
    const files = [...message.attachments.values()].map(a => a.url);

    await webhook.send({
	content: message.content || null,
	embeds: embeds.length ? embeds : undefined,
	files: files.length ? files : undefined,

	username: "Excellence",
	avatarURL: "https://cdn.discordapp.com/attachments/1091844470737227944/1465524732677062729/ChatGPT_Image_Jan_27_2026_02_04_53_AM.png",

	allowedMentions: { parse: [] },
	});


    console.log("➡️ Forwarded message");
  } catch (err) {
    console.error("❌ Webhook error:", err);
  }
});

client.login(BOT_TOKEN);




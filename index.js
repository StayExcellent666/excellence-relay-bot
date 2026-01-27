const express = require("express");
const { Client, GatewayIntentBits, WebhookClient } = require("discord.js");

// ---- WEB SERVER (Render needs this) ----
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Bot is running"));
app.listen(PORT, () => {
  console.log(`🌐 Listening on port ${PORT}`);
});

// ---- CONFIG ----
const BOT_TOKEN = (process.env.BOT_TOKEN || "").trim();
const SOURCE_CHANNEL_ID = (process.env.SOURCE_CHANNEL_ID || "").trim();

// Collect all WEBHOOK_URL_* variables from env (WEBHOOK_URL_1, WEBHOOK_URL_2, ...)
const WEBHOOK_URLS = Object.entries(process.env)
  .filter(([key, val]) => key.startsWith("WEBHOOK_URL_") && val && val.trim())
  .sort((a, b) => a[0].localeCompare(b[0])) // keeps order: _1, _2, _3...
  .map(([, val]) => val.trim());

// ---- ENV SANITY CHECK ----
console.log("ENV CHECK:", {
  BOT_TOKEN: BOT_TOKEN ? "set" : "MISSING",
  SOURCE_CHANNEL_ID: SOURCE_CHANNEL_ID ? "set" : "MISSING",
  WEBHOOKS_FOUND: WEBHOOK_URLS.length,
});

if (!BOT_TOKEN || !SOURCE_CHANNEL_ID) {
  throw new Error("❌ Missing BOT_TOKEN or SOURCE_CHANNEL_ID");
}
if (WEBHOOK_URLS.length === 0) {
  throw new Error("❌ No WEBHOOK_URL_* environment variables found");
}

// Create webhook clients
const webhooks = WEBHOOK_URLS.map((url) => new WebhookClient({ url }));

// ---- DISCORD CLIENT ----
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ---- MESSAGE HANDLER ----
client.on("messageCreate", async (message) => {
  // Optional debug
  // console.log("SAW:", message.channelId, message.author.username);

  // Only forward from source channel
  if (message.channelId !== SOURCE_CHANNEL_ID) return;

  try {
    // ---- MODIFY STREAMCORD EMBEDS ----
    const embeds = message.embeds.length
      ? message.embeds.map((e) => {
          const embed = e.toJSON();
        
          // Replace "streamcord.io" -> "Excellence" in footer
          if (embed.footer?.text) {
            embed.footer.text = embed.footer.text.replace(
              /streamcord\.io/gi,
              "brought to you by your Excellency"
            );
          }

          return embed;
        })
      : undefined;

    const files = message.attachments.size
      ? [...message.attachments.values()].map((a) => a.url)
      : undefined;

    const payload = {
      content: message.content || null,
      embeds,
      files,
      username: message.member?.displayName || message.author.username,
      avatarURL: message.author.displayAvatarURL(),
      allowedMentions: { parse: [] },
    };

    // Send to all webhooks
    const results = await Promise.allSettled(webhooks.map((w) => w.send(payload)));

    // Log failures (if any)
    const failed = results
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.status === "rejected");

    if (failed.length) {
      console.error(
        `❌ ${failed.length}/${webhooks.length} webhook(s) failed:`,
        failed.map(({ i, r }) => ({ webhookIndex: i + 1, reason: String(r.reason) }))
      );
    } else {
      console.log(`SENT ✅ to ${webhooks.length} webhook(s)`);
    }
  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err);
  }
});

// ---- LOGIN ----
client.login(BOT_TOKEN).catch((err) => {
  console.error("LOGIN FAILED ❌", err);
});

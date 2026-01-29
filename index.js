const express = require("express");
const { Client, GatewayIntentBits, WebhookClient } = require("discord.js");

// ================== Render web server (keeps service "web" healthy) ==================
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Bot is running"));
app.listen(PORT, () => {
  console.log(`🌐 Listening on port ${PORT}`);
});

// ================== ENV ==================
const BOT_TOKEN = (process.env.BOT_TOKEN || "").trim();
const SOURCE_CHANNEL_ID = (process.env.SOURCE_CHANNEL_ID || "").trim();

// Collect WEBHOOK_URL_1, WEBHOOK_URL_2, ... from environment
const WEBHOOK_URLS = Object.entries(process.env)
  .filter(([k, v]) => k.startsWith("WEBHOOK_URL_") && v && v.trim())
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([, v]) => v.trim());

console.log("ENV CHECK:", {
  BOT_TOKEN: BOT_TOKEN ? "set" : "MISSING",
  SOURCE_CHANNEL_ID: SOURCE_CHANNEL_ID ? "set" : "MISSING",
  WEBHOOKS_FOUND: WEBHOOK_URLS.length,
});

if (!BOT_TOKEN || !SOURCE_CHANNEL_ID) {
  throw new Error("❌ Missing BOT_TOKEN or SOURCE_CHANNEL_ID");
}
if (WEBHOOK_URLS.length === 0) {
  throw new Error("❌ No WEBHOOK_URL_* variables found (e.g., WEBHOOK_URL_1)");
}

// Webhook clients
const webhooks = WEBHOOK_URLS.map((url) => new WebhookClient({ url }));

// ================== Discord client ==================
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

client.on("warn", (w) => console.warn("DISCORD WARN:", w));
client.on("error", (e) => console.error("DISCORD ERROR:", e));
process.on("unhandledRejection", (e) => console.error("UNHANDLED REJECTION:", e));
process.on("uncaughtException", (e) => console.error("UNCAUGHT EXCEPTION:", e));

// ================== Message handler ==================
client.on("messageCreate", async (message) => {
  // ---- Logging for ALL visible messages (including uptime messages)
  // Includes message content so you can see which uptime number it saw.
  console.log(
    `SAW: guild="${message.guild?.name || "DM"}" channel="#${message.channel?.name || "unknown"}" ` +
      `channelId=${message.channelId} author=${message.author.username} content="${(message.content || "").replace(/\s+/g, " ").slice(0, 200)}"`
  );

  // Only forward from the source channel
  if (message.channelId !== SOURCE_CHANNEL_ID) {
    console.log("SKIP: not source channel");
    return;
  }

  try {
    // ---- Force footer (rebrand Streamcord.io and ensure a footer exists)
    const embeds = message.embeds.length
      ? message.embeds.map((e) => {
          const embed = e.toJSON();

          if (embed.footer?.text) {
            embed.footer.text = embed.footer.text.replace(/streamcord\.io/gi, "Excellence");
          } else {
            embed.footer = { text: "Excellence" };
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
      // ---- Always branded as Excellence
      username: "Excellence",
      avatarURL:
        "https://cdn.discordapp.com/attachments/1091844470737227944/1465524732677062729/ChatGPT_Image_Jan_27_2026_02_04_53_AM.png",
      allowedMentions: { parse: [] },
    };

    // Send to all webhooks
    const results = await Promise.allSettled(webhooks.map((w) => w.send(payload)));

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

// ================== Login ==================
client.login(BOT_TOKEN).catch((err) => {
  console.error("LOGIN FAILED ❌", err);
});

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
const BOT_TOKEN = process.env.BOT_TOKEN;
const SOURCE_CHANNEL_ID = process.env.SOURCE_CHANNEL_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

const webhook = new WebhookClient({ url: WEBHOOK_URL });

// ---- DISCORD CLIENT ----
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ---- READY ----
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ---- MESSAGE HANDLER ----
client.on("messageCreate", async (message) => {
  console.log(
    "SAW:",
    message.guild?.name,
    "#"+message.channel?.name,
    message.author.username
  );

  // Only forward from source channel
  if (message.channelId !== SOURCE_CHANNEL_ID) {
    console.log("SKIP: wrong channel");
    return;
  }

  try {
    // ---- MODIFY STREAMCORD EMBEDS ----
    const embeds = message.embeds.length
      ? message.embeds.map(e => {
          const embed = e.toJSON();

          // Rename "Viewers" → "Gamers"
          if (Array.isArray(embed.fields)) {
            embed.fields = embed.fields.map(f => ({
              ...f,
              name: f.name === "Viewers" ? "Gamers" : f.name,
            }));
          }

          // Replace "streamcord.io" in footer
          if (embed.footer?.text) {
            embed.footer.text = embed.footer.text.replace(
              /streamcord\.io/gi,
              "Excellence"
            );
          }

          return embed;
        })
      : undefined;

    const files = message.attachments.size
      ? [...message.attachments.values()].map(a => a.url)
      : undefined;

    await webhook.send({
      content: message.content || null,
      embeds,
      files,
      username: message.member?.displayName || message.author.username,
      avatarURL: message.author.displayAvatarURL(),
      allowedMentions: { parse: [] },
    });

    console.log("SENT ✅");
  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err);
  }
});

// ---- LOGIN ----
client.login(BOT_TOKEN);

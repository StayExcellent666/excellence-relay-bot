const { Client, GatewayIntentBits, WebhookClient } = require("discord.js");

// ====== CONFIG ======
const BOT_TOKEN = process.env.BOT_TOKEN;
const SOURCE_CHANNEL_ID = process.env.SOURCE_CHANNEL_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
// ====================

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
  // Only forward from the chosen channel
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

const { Client, GatewayIntentBits, Events } = require("discord.js");
require("dotenv").config();
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection, generateDependencyReport } = require("@discordjs/voice");
const ytdl = require("@distube/ytdl-core");
const fs = require("fs");

const TOKEN =process.env.TOKEN;

const urls = fs.readFileSync("urls.txt", "utf-8").split("\n").filter(Boolean);
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const player = createAudioPlayer();
let connection = null;

// File de lecture mélangée
let queue = [];

// Cache des titres (évite de refaire la requête YouTube à chaque fois)
const titleCache = new Map();

// Mélanger (Fisher-Yates shuffle)
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Recharger la file si vide
function refillQueue() {
  if (queue.length === 0) {
    queue = shuffle([...urls]);
  }
}

// Fonction utilitaire pour récupérer le titre
async function getVideoTitle(url) {
  if (titleCache.has(url)) {
    return titleCache.get(url);
  }
  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title;
    titleCache.set(url, title);
    return title;
  } catch (err) {
    console.error("Erreur récupération titre:", err);
    return url; // fallback
  }
}

// Lire le prochain morceau
async function playNextSong(conn) {
  refillQueue();
  const url = queue.shift();
  const title = await getVideoTitle(url);

  console.log(`🎶 Lecture: ${title} (${url})`);

  const stream = ytdl(url, {
  filter: "audioonly",
  quality: "highestaudio",
  highWaterMark: 1 << 25,
  requestOptions: {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36"
    }
  }});
  const resource = createAudioResource(stream);

  player.play(resource);

  player.once(AudioPlayerStatus.Idle, () => {
    playNextSong(conn);
  });

  conn.subscribe(player);

  return { url, title };
}

client.once(Events.ClientReady, c => {
  console.log(`✅ Connecté en tant que ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "play") {
  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    return interaction.reply("❌ Tu dois être dans un salon vocal pour lancer la musique !");
  }

  // Rejoindre le salon vocal de l’utilisateur
  connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true,  // recommandé pour un bot musique
    selfMute: false,
  });

  // Lancer immédiatement la première chanson
  const song = await playNextSong(connection);
  await interaction.reply(`🎵 Lecture de **[${song.title}](${song.url})** !`);
  }

  if (interaction.commandName === "stop") {
    const conn = getVoiceConnection(interaction.guild.id);
    if (!conn) {
      return interaction.reply("❌ Je ne suis pas dans un salon vocal.");
    }

    player.stop();
    conn.destroy();
    connection = null;
    queue = [];

    await interaction.reply("⏹️ Musique arrêtée, je quitte le salon !");
  }

  if (interaction.commandName === "skip") {
    if (!connection) {
      return interaction.reply("❌ Je ne joue aucune musique pour l’instant.");
    }

    const song = await playNextSong(connection);
    await interaction.reply(`⏭️ Skipped ! Nouvelle chanson : **[${song.title}](${song.url})**`);
  }

  if (interaction.commandName === "queue") {
    if (queue.length === 0) {
      return interaction.reply("📭 La file est vide (elle se rechargera au prochain morceau).");
    }

    const preview = await Promise.all(
      queue.slice(0, 10).map(async (url, i) => {
        const title = await getVideoTitle(url);
        return `${i + 1}. [${title}](${url})`;
      })
    );

    await interaction.reply({
      content: `📋 Prochains morceaux (${queue.length} au total):\n${preview.join("\n")}${queue.length > 10 ? "\n... (et plus)" : ""}`,
      ephemeral: true
    });
  }
   if (interaction.commandName === "add") {
    const url = interaction.options.getString("url");

    // Vérifier que c'est bien un lien YouTube
    if (!/^https?:\/\/(www\.)?youtube\.com\/watch\?v=/.test(url)) {
      return interaction.reply("❌ Ce n'est pas un lien YouTube valide !");
    }

    // Ajouter à la file en mémoire
    queue.push(url);

    // Optionnel : ajouter aussi dans urls.txt pour persistance
    fs.appendFileSync("urls.txt", "\n" + url);

    await interaction.reply(`✅ Le lien a été ajouté à la liste : ${url}`);
  }
});

client.login(TOKEN);

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID =  process.env.GUILD_ID;

const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Joue de la musique aléatoire depuis la liste d'URLs"),
  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Arrête la musique et fait quitter le salon au bot"),
  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Passe à la chanson suivante"),
  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Affiche la file des morceaux restants"),
  new SlashCommandBuilder()
    .setName("add")
    .setDescription("Ajouter un lien YouTube à la liste de lecture")
    .addStringOption(option =>
      option.setName("url")
            .setDescription("Lien YouTube à ajouter")
            .setRequired(true)
    ),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("🚀 Déploiement des commandes slash...");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log("✅ Commandes enregistrées !");
  } catch (err) {
    console.error(err);
  }
})();

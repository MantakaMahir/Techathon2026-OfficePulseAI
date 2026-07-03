import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
  throw new Error("DISCORD_TOKEN, DISCORD_CLIENT_ID, and DISCORD_GUILD_ID are required to register slash commands.");
}

const commands = [
  new SlashCommandBuilder().setName("status").setDescription("Show live office device status"),
  new SlashCommandBuilder()
    .setName("room")
    .setDescription("Show one room status")
    .addStringOption((option) => option.setName("room").setDescription("drawing, work1, or work2").setRequired(true)),
  new SlashCommandBuilder().setName("usage").setDescription("Show live power usage"),
  new SlashCommandBuilder().setName("alerts").setDescription("Show active alerts"),
  new SlashCommandBuilder().setName("worst-room").setDescription("Show highest consuming room"),
  new SlashCommandBuilder().setName("summary").setDescription("Show friendly OfficePulse summary")
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(token);
await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
console.log("OfficePulse slash commands registered");

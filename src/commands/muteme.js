const { SlashCommandBuilder } = require('discord.js');
const { muteUser } = require('../utils');



module.exports = {
	data: new SlashCommandBuilder()
		.setName('muteme')
		.setDescription('Mutes you for 10 minutes...'),
	async execute(interaction) {
        muteUser(interaction.guild.id, interaction.user.id, interaction)
		await interaction.reply({content: "ok...you've been muted for 10 minutes.", ephemeral: true});
	},
};
const { SlashCommandBuilder } = require('discord.js');
const { muted_list } = require('../data');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('mutelist')
		.setDescription('Replies with list of currently muted users'),
	async execute(interaction) {

		if (!Object.keys(muted_list).length) {
			await interaction.reply("No users currently muted!");
			return false
		}
		
		let members = await interaction.guild.members.fetch({withPresences: true})


		await interaction.reply({content: "Currently muted users: \n" + Object.keys(muted_list[interaction.guild.id]).map(user => (members.find(member => member.user.id === user))).join(), ephemeral: true});
	},
};
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { unmuteUser } = require('../utils');



module.exports = {
	data: new SlashCommandBuilder()
		.setName('unmute')
		.setDescription('Unmutes a user')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to unmute')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers | PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageRoles),
	async execute(interaction) {
        const target = interaction.options.getUser('target')
        let unmuted = unmuteUser(interaction.guild.id, interaction.user.id, null)
		await interaction.reply( unmuted ? `Okay, hey ${target}, you can come out of timeout... but be nice...` : `Unable to unmute user that isn't muted.`);
	},
};
const { EmbedBuilder } = require("discord.js");
const setting = require("../../models/setting");

module.exports = {
    data: {
        name: "set",
        description: "Set a channel as announcement sender channel",
        options: [{
            name: "channel",
            type: 7,
            description: "Mention the channel",
            required: true,
            channel_types: [0]
        }],
    },
    timeout: 3000,

    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel("channel"),
            data = await setting.findOne({ guild: interaction.guildId }) || await setting.create({ guild: interaction.guildId });

        if (data.channel === channel.id) return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("❌ Already Selected")
            ]
        });

        await setting.findOneAndUpdate({ guild: interaction.guildId }, { channel: channel.id })

        interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("✅ Channel Selected")
            ]
        })
    }
}
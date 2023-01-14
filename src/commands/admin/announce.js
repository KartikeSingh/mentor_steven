const { getEmojiIdentifier, getEmojiString } = require('discord-emoji-utility');
const { EmbedBuilder } = require('discord.js');
const announcement = require('../../models/announcement');

module.exports = {
    data: {
        name: "announce",
        description: "Create a announcement",
        options: [{
            name: "text",
            type: 3,
            description: "The message for this announcement, type -- for changing the line",
            required: true,
        }, {
            name: "emoji",
            type: 3,
            description: "The emoji which will be used to access this announcement",
            required: true,
        }, {
            name: "count",
            type: 4,
            description: "The number of reactions needed to make the announcement visible",
            required: true,
        }, {
            name: "placeholder",
            type: 3,
            description: "The placeholder message for this announcement, you can use {count {emoji} for auto replacements",
        }],
    },
    timeout: 5000,

    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const
            text = interaction.options.getString("text"),
            emoji = getEmojiIdentifier(client, interaction.options.getString("emoji")),
            count = interaction.options.getInteger("count"),
            placeholder = interaction.options.getString("placeholder") || `You can read this message after this message gets **{count}** {emoji} reactions on this message`;

        if (!emoji) return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("❌ Invalid Emoji")
            ]
        });

        interaction.channel.send({
            embeds: [{
                description: `${placeholder.replace(/\{count\}/gi, count).replace(/\{emoji\}/gi, getEmojiString(client, emoji))}`
            }]
        }).then(async msg => {
            await announcement.create({
                count,
                emoji,
                id: msg.id,
                placeholder,
                text,
                channel:interaction.channel.id
            });

            interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Announcement Created")
                        .setDescription(`[Jump](${msg.url}) to the announcement.`)
                ]
            });
        }).catch(() => {
            interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ Announcement Creation Failed")
                ]
            });
        })
    }
}
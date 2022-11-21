const { getEmojiIdentifier, getEmojiString } = require('discord-emoji-utility');
const { EmbedBuilder } = require('discord.js');
const announcement = require('../../models/announcement');


module.exports = {
    data: {
        name: "edit",
        description: "Edit a announcement's data",
        options: [{
            name: "id",
            type: 3,
            description: "The message ID of the announcement",
            required: true,
        }, {
            name: "text",
            type: 3,
            description: "The message for this announcement, type -- for changing the line",
        }, {
            name: "emoji",
            type: 3,
            description: "The emoji which will be used to access this announcement",
        }, {
            name: "count",
            type: 4,
            description: "The number of reactions needed to make the announcement visible",
        }, {
            name: "placeholder",
            type: 3,
            description: "The placeholder message for this announcement",
        }],
    },
    timeout: 4000,

    run: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const
            id = interaction.options.getString("id"),
            data = await announcement.findOne({ id });

        if (!data) return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("❌ Invalid ID")
                    .setDescription("No announcement found with the provided ID")
            ]
        });

        const
            text = interaction.options.getString("text") || data.text,
            emoji = getEmojiIdentifier(client, interaction.options.getString("emoji")) || data.emoji,
            count = interaction.options.getInteger("count") || data.count,
            placeholder = interaction.options.getString("placeholder") || data.placeholder;

        const msg = await client.channels.cache.get(data.channel)?.messages?.fetch(data.id)?.catch(() => null);

        if (!msg) return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("❌ Message Not Found")
                    .setDescription("Announcement not found, it is probably deleted.\nPlease make a new one!")
            ]
        });

        await announcement.findOneAndUpdate({ id }, { text, emoji, count, placeholder, visible: false });

        msg.edit({
            embeds: [{
                description: `||${placeholder.replace(/\{count\}/gi, count).replace(/\{emoji\}/gi, getEmojiString(client, emoji))}||`
            }]
        }).then(() => {
            interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ Announcement Edited")
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
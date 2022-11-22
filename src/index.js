// Load enviroment variables
require('dotenv').config();

// Imports
const { GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const Client = require('./utility/Client');

// HTTP server setup
const app = (require('express'))();

app.get('/', (req, res) => res.sendStatus(200));

app.listen(process.env.PORT || 3001);

// Database setup
const mongoose = require('mongoose');
const setting = require('./models/setting');
const { getEmojiIdentifier, getEmojiString } = require('discord-emoji-utility');
const announcement = require('./models/announcement');
const { randomID } = require('create-random-id');

mongoose.connect(process.env.MONGO_URI).then(() => console.log("Database Connected")).catch(() => console.log("Database Connection Failed"))

// Discord Client Setup
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages], partials: [Partials.Message, Partials.Reaction] });

client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;

    const data = await setting.findOne({ guild: message.guild.id });

    if (data?.channel !== message.channel.id) return;

    const image = message.attachments.first()?.url;

    if (!image || !["png", "jpg", "jpeg"].some(v => image.endsWith(v))) return;

    const code = randomID(12);
    client.images.set(code, image)

    message.reply({
        embeds: [new EmbedBuilder({
            title: "❓What do you want to do",
        }).setColor("Yellow")],
        components: [new ActionRowBuilder({
            components: [
                new ButtonBuilder({
                    customId: `simple---${code}`,
                    label: "Announcement",
                    style: ButtonStyle.Secondary,
                }),
                new ButtonBuilder({
                    customId: `complex---${code}`,
                    label: "Hidden Announcement",
                    style: ButtonStyle.Primary,
                })
            ]
        })]
    })
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.customId) return;

    const [id, image] = interaction.customId.split("---");

    const modal = new ModalBuilder({
        title: "Announcement Builder",
        customId: `builderOne---${image}`,
        components: [
            new ActionRowBuilder({
                components: [
                    new TextInputBuilder({
                        label: "Channel ID",
                        style: TextInputStyle.Short,
                        required: true,
                        customId: "channel"
                    })
                ]
            }),
            new ActionRowBuilder({
                components: [
                    new TextInputBuilder({
                        label: "Text",
                        style: TextInputStyle.Paragraph,
                        required: true,
                        customId: "text"
                    })
                ]
            })
        ]
    });

    if (id === "simple") interaction.showModal(modal);
    else if (id === "complex") {
        modal.setCustomId(`builderTwo---${image}`);

        modal.addComponents(
            new ActionRowBuilder({
                components: [
                    new TextInputBuilder({
                        label: "Emoji",
                        style: TextInputStyle.Short,
                        required: true,
                        customId: "emoji"
                    })
                ]
            }),
            new ActionRowBuilder({
                components: [
                    new TextInputBuilder({
                        label: "Count",
                        style: TextInputStyle.Short,
                        required: true,
                        customId: "count"
                    })
                ]
            }),
            new ActionRowBuilder({
                components: [
                    new TextInputBuilder({
                        label: "Placeholder",
                        style: TextInputStyle.Paragraph,
                        customId: "placeholder",
                        required:false
                    })
                ]
            })
        );

        interaction.showModal(modal);
    } else if (id === "builderTwo") {
        const
            text = interaction.fields.getTextInputValue("text"),
            channel = client.channels.cache.get(interaction.fields.getTextInputValue("channel").match(/\d+/) + ""),
            emoji = getEmojiIdentifier(client, interaction.fields.getTextInputValue("emoji")),
            placeholder = interaction.fields.getTextInputValue("placeholder") || `You can read this message after this message gets **{count}** {emoji} reactions on this message`,
            count = parseInt(interaction.fields.getTextInputValue("count"));

        await interaction.deferReply({ ephemeral: true });

        if (!channel) return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("❌ Invalid Channel")
            ]
        })

        if (!emoji) return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("❌ Invalid Emoji")
            ]
        })

        if (!count || count < 1) return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("❌ Invalid Count")
            ]
        })
        channel.send({
            embeds: [{
                description: `||${placeholder.replace(/\{count\}/gi, count).replace(/\{emoji\}/gi, getEmojiString(client, emoji))}||`
            }]
        }).then(async msg => {
            await announcement.create({
                count,
                emoji,
                id: msg.id,
                placeholder,
                text,
                channel: interaction.channel.id,
                image
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
    } else if (id === "builderOne") {
        const
            text = interaction.fields.getTextInputValue("text"),
            channel = client.channels.cache.get(interaction.fields.getTextInputValue("channel").match(/\d+/) + "");

        await interaction.deferReply({ ephemeral: true });

        if (!channel) return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("❌ Invalid Channel")
            ]
        })

        channel.send({
            embeds: [{
                description: text,
                image: {
                    url: client.images.get(image)
                }
            }]
        }).then(async msg => {
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
})

client.login(process.env.TOKEN);
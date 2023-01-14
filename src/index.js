// Load enviroment variables
require('dotenv').config();

// Imports
const { GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, SelectMenuBuilder } = require('discord.js');
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
                        required: false
                    })
                ]
            })
        );

        interaction.showModal(modal);
    } else if (id === "builderTwo") {
        const
            text = interaction.fields.getTextInputValue("text"),
            emoji = getEmojiIdentifier(client, interaction.fields.getTextInputValue("emoji")),
            placeholder = interaction.fields.getTextInputValue("placeholder") || `You can read this message after this message gets **{count}** {emoji} reactions on this message`,
            count = parseInt(interaction.fields.getTextInputValue("count")),
            channels = interaction.guild.channels.cache.filter(v => v.type === ChannelType.GuildText).toJSON();

        const rows = [], columns = 25;

        for (let i = 0; i < channels.length; i++) {
            const ind = Math.floor(i / columns),
                option = {
                    label: channels[i].name,
                    value: channels[i].id,
                };

            rows[ind] ? rows[ind].components[0].addOptions(option) : rows[ind] = new ActionRowBuilder({
                components: [new SelectMenuBuilder({
                    customId: `c_${ind}`,
                    options: [option]
                })]
            });
        }

        const msg = await interaction.reply({
            fetchReply: true,
            embeds: [
                new EmbedBuilder()
                    .setColor("Yellow")
                    .setTitle("❓ Select The Channel")
            ],
            components: rows,
            ephemeral: true,
        });

        const col = msg.createMessageComponentCollector({
            time: 3600000,
            filter: i => i.user.id === interaction.user.id
        });

        col.on('collect', (x) => {
            x.deferUpdate();
            col.stop(x.values[0]);
        });

        col.on('end', async (x, r) => {
            if (r === "time") return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ You Took Too Long To Respond")
                ],
                components: [],
            });

            const channel = interaction.guild.channels.cache.get(r);

            if (!channel) return interaction.editReply({
                components: [],
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ Invalid Channel")
                ]
            })

            if (!emoji) return interaction.editReply({
                components: [],
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ Invalid Emoji")
                ]
            })

            if (!count || count < 1) return interaction.editReply({
                components: [],
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ Invalid Count")
                ]
            })
            channel.send({
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
                    channel: interaction.channel.id,
                    image
                });

                interaction.editReply({
                components: [],
                embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setTitle("✅ Announcement Created")
                            .setDescription(`[Jump](${msg.url}) to the announcement.`)
                    ]
                });
            }).catch(() => {
                interaction.editReply({
                components: [],
                embeds: [
                        new EmbedBuilder()
                            .setColor("Red")
                            .setTitle("❌ Announcement Creation Failed")
                    ]
                });
            })
        })
    } else if (id === "builderOne") {
        const text = interaction.fields.getTextInputValue("text"),
            channels = interaction.guild.channels.cache.filter(v => v.type === ChannelType.GuildText).toJSON();

        const rows = [], columns = 25;

        for (let i = 0; i < channels.length; i++) {
            const ind = Math.floor(i / columns),
                option = {
                    label: channels[i].name,
                    value: channels[i].id,
                };

            rows[ind] ? rows[ind].components[0].addOptions(option) : rows[ind] = new ActionRowBuilder({
                components: [new SelectMenuBuilder({
                    customId: `c_${ind}`,
                    options: [option]
                })]
            });
        }

        const msg = await interaction.reply({
            fetchReply: true,
            embeds: [
                new EmbedBuilder()
                    .setColor("Yellow")
                    .setTitle("❓ Select The Channel")
            ],
            components: rows,
            ephemeral: true,
        });

        const col = msg.createMessageComponentCollector({
            time: 3600000,
            filter: i => i.user.id === interaction.user.id
        });

        col.on('collect', (x) => {
            x.deferUpdate();
            col.stop(x.values[0]);
        });

        col.on('end', async (x, r) => {
            if (r === "time") return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ You Took Too Long To Respond")
                ],
                components: [],
            });

            const channel = interaction.guild.channels.cache.get(r);

            if (!channel) return interaction.editReply({
                components: [],
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ Invalid Channel")
                ]
            })

            if (!emoji) return interaction.editReply({
                components: [],
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ Invalid Emoji")
                ]
            })

            if (!count || count < 1) return interaction.editReply({
                components: [],
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ Invalid Count")
                ]
            })
            channel.send({
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
                    channel: interaction.channel.id,
                    image
                });

                interaction.editReply({
                components: [],
                embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setTitle("✅ Announcement Created")
                            .setDescription(`[Jump](${msg.url}) to the announcement.`)
                    ]
                });
            }).catch(() => {
                interaction.editReply({
                components: [],
                embeds: [
                        new EmbedBuilder()
                            .setColor("Red")
                            .setTitle("❌ Announcement Creation Failed")
                    ]
                });
            })
        })
    }
})

client.login(process.env.TOKEN);
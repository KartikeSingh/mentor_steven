const announcement = require("../models/announcement");

module.exports = async (client, reaction) => {
    const data = await announcement.findOne({ id: reaction.message.id, visible: false });

    if (!data) return;

    const msg = await reaction.message.fetch(true);

    if (msg.reactions.cache.filter(v => [v.emoji.id, v.emoji.name].includes(data.emoji)).toJSON()[0]?.count >= data.count) {
        msg.edit({
            embeds: [{
                description: data.text.replace(/\-\-/g, "\n"),
                image: {
                    url: client.images.get(data.image)
                }
            }]
        })
        await announcement.findOneAndUpdate({ id: reaction.message.id }, { visible: true })
    }
}
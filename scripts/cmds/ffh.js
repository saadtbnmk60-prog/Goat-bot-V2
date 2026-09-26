"use strict";

module.exports = {
	config: {
		name: "gif",
		aliases: ["g"],
		author: "Neoaz 🐊",
		category: "fun",
		cooldown: 3,
		role: 0,
		noPrefix: false,
		description: "Send GIF"
	},

	onStart: async function ({ message }) {
		try {
			const url = "https://i.yourimageshare.com/ZPrBsRj975.gif";

			const stream = await global.utils.getStreamFromURL(url);

			return message.reply({
				attachment: stream
			});

		} catch (err) {
			console.error("GIF ERROR:", err);
			return message.reply("❌ ماقدرتش نرسل الـGIF.");
		}
	}
};

"use strict";

const fs = require("fs-extra");
const path = require("path");
const https = require("https");

module.exports = {
	config: {
		name: "prefix",
		version: "2.0",
		author: "SHTOT",
		countDown: 5,
		role: 0,
		description: "Show bot prefix as image and change prefix",
		category: "config",
		guide: {
			en:
				"{pn} : show prefix image"
				+ "\n{pn} <new prefix> : change prefix"
				+ "\nExample: {pn} #"
				+ "\n\n{pn} <new prefix> -g : change global prefix"
				+ "\nExample: {pn} # -g"
				+ "\n\n{pn} reset : reset group prefix"
		}
	},

	langs: {
		en: {
			reset: "✅ Prefix reset to default: %1",
			onlyAdmin: "❌ Only bot admin can change global prefix.",
			confirmGlobal: "⚠️ React to confirm changing global prefix.",
			confirmThisThread: "⚠️ React to confirm changing group prefix.",
			successGlobal: "✅ Global prefix changed to: %1",
			successThisThread: "✅ Group prefix changed to: %1"
		}
	},

	onStart: async function ({
		message,
		role,
		args,
		commandName,
		event,
		threadsData,
		getLang
	}) {

		// إذا كتب prefix بوحدها
		if (!args[0]) {

			return message.reply({
				attachment: await downloadImage()
			});
		}

		// Reset
		if (args[0].toLowerCase() === "reset") {

			await threadsData.set(
				event.threadID,
				null,
				"data.prefix"
			);

			return message.reply(
				getLang(
					"reset",
					global.GoatBot.config.prefix
				)
			);
		}

		const newPrefix = args[0];

		const formSet = {
			commandName,
			author: event.senderID,
			newPrefix,
			setGlobal: false
		};

		// Global prefix
		if (args[1] === "-g") {

			if (role < 2) {
				return message.reply(
					getLang("onlyAdmin")
				);
			}

			formSet.setGlobal = true;
		}

		return message.reply(
			formSet.setGlobal
				? getLang("confirmGlobal")
				: getLang("confirmThisThread"),
			(err, info) => {

				if (err || !info)
					return;

				formSet.messageID = info.messageID;

				global.GoatBot.onReaction.set(
					info.messageID,
					formSet
				);
			}
		);
	},

	onReaction: async function ({
		message,
		threadsData,
		event,
		Reaction,
		getLang
	}) {

		const {
			author,
			newPrefix,
			setGlobal
		} = Reaction;

		if (event.userID !== author)
			return;

		// Global
		if (setGlobal) {

			global.GoatBot.config.prefix =
				newPrefix;

			fs.writeFileSync(
				global.client.dirConfig,
				JSON.stringify(
					global.GoatBot.config,
					null,
					2
				)
			);

			return message.reply(
				getLang(
					"successGlobal",
					newPrefix
				)
			);
		}

		// Group
		await threadsData.set(
			event.threadID,
			newPrefix,
			"data.prefix"
		);

		return message.reply(
			getLang(
				"successThisThread",
				newPrefix
			)
		);
	},

	onChat: async function ({
		event,
		message
	}) {

		// كلمة prefix بوحدها
		if (
			!event.body ||
			event.body.trim().toLowerCase() !== "prefix"
		)
			return;

		return message.reply({
			attachment: await downloadImage()
		});
	}
};


// ========================================
// تحميل صورة Prefix
// ========================================

function downloadImage() {

	return new Promise((resolve, reject) => {

		const url =
			"https://i.postimg.cc/WpG4fYbR/file-00000000ee8481f593fe458dfc0ca90c.png";

		https.get(url, response => {

			// إذا كان الرابط دار Redirect
			if (
				response.statusCode >= 300 &&
				response.statusCode < 400 &&
				response.headers.location
			) {

				return downloadFromUrl(
					response.headers.location,
					resolve,
					reject
				);
			}

			if (response.statusCode !== 200) {
				return reject(
					new Error(
						"Image download failed: " +
						response.statusCode
					)
				);
			}

			const chunks = [];

			response.on("data", chunk => {
				chunks.push(chunk);
			});

			response.on("end", () => {
				resolve(
					Buffer.concat(chunks)
				);
			});

			response.on("error", reject);

		}).on("error", reject);
	});
}


function downloadFromUrl(
	url,
	resolve,
	reject
) {

	https.get(url, response => {

		if (response.statusCode !== 200) {
			return reject(
				new Error(
					"Image redirect failed"
				)
			);
		}

		const chunks = [];

		response.on("data", chunk => {
			chunks.push(chunk);
		});

		response.on("end", () => {
			resolve(
				Buffer.concat(chunks)
			);
		});

		response.on("error", reject);

	}).on("error", reject);
			}

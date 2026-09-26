const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

module.exports = {
	config: {
		name: "help",
		version: "1.8",
		author: "MahMUD",
		countDown: 5,
		role: 0,
		shortDescription: {
			en: "View command usage and list all commands"
		},
		longDescription: {
			en: "Send a help GIF, then show commands when you reply to it"
		},
		category: "info",
		guide: {
			en: "{pn} [command name]"
		},
		priority: 1
	},

	onStart: async function ({ message, args, event, threadsData, role }) {
		const { threadID } = event;
		const threadData = await threadsData.get(threadID);
		const prefix = getPrefix(threadID);
		const langCode =
			threadData.data.lang ||
			global.GoatBot.config.language ||
			"en";

		// ==========================================
		// إذا كتب help بلا اسم أمر → يرسل GIF فقط
		// ==========================================
		if (args.length === 0) {
			try {
				const gifUrl = "https://yourimageshare.com/ib/ZPrBsRj975";

				const sentMessage = await message.reply({
					body: "╭────────────⭓\n" +
						"│ 🦋 SHTOT HELP 🦋\n" +
						"│\n" +
						"│ 💫 Reply to this GIF\n" +
						"│ 📚 to see all commands\n" +
						"╰────────────⭓",
					attachment: await global.utils.getStreamFromURL(gifUrl)
				});

				// نخلي البوت يتسنى الرد على نفس الـGIF
				global.GoatBot.onReply.set(sentMessage.messageID, {
					commandName: "help",
					author: event.senderID,
					type: "helpList"
				});

				// نحيد الرسالة من بعد 80 ثانية
				setTimeout(() => {
					try {
						message.unsend(sentMessage.messageID);
						global.GoatBot.onReply.delete(sentMessage.messageID);
					} catch (e) {}
				}, 80000);

			} catch (error) {
				console.error("Help GIF Error:", error);
				return message.reply(
					"❌ وقع مشكل فإرسال صورة الـGIF."
				);
			}

			return;
		}

		// ==========================================
		// شرح أمر معين: help command
		// ==========================================
		const commandName = args[0].toLowerCase();

		const command =
			commands.get(commandName) ||
			commands.get(aliases.get(commandName));

		if (!command) {
			const notFound =
				langCode === "bn"
					? `❌ | বেবি, "${commandName}" নামে কোনো কমান্ড নেই!`
					: langCode === "vi"
					? `❌ | Không tìm thấy lệnh "${commandName}".`
					: `❌ | Command "${commandName}" not found.`;

			return message.reply(notFound);
		}

		const config = command.config;
		const roleText = roleTextToString(config.role, langCode);

		const labels = {
			bn: {
				name: "নাম",
				alias: "ডাকনাম",
				info: "তথ্য",
				desc: "বর্ণনা",
				author: "লেখক",
				guide: "নির্দেশনা",
				usage: "ভার্সন ও পারমিশন",
				ver: "ভার্সন",
				role: "অনুমতি",
				none: "নেই",
				unknown: "অজানা"
			},
			vi: {
				name: "Tên",
				alias: "Tên khác",
				info: "Thông tin",
				desc: "Mô tả",
				author: "Tác giả",
				guide: "Hướng dẫn",
				usage: "Phiên bản & Quyền",
				ver: "Phiên bản",
				role: "Quyền hạn",
				none: "Không có",
				unknown: "Không xác định"
			},
			en: {
				name: "NAME",
				alias: "Aliases",
				info: "INFO",
				desc: "Description",
				author: "Author",
				guide: "Guide",
				usage: "Details",
				ver: "Version",
				role: "Role",
				none: "None",
				unknown: "Unknown"
			}
		};

		const lb = labels[langCode] || labels.en;

		const desc =
			config.description?.[langCode] ||
			config.description?.en ||
			config.longDescription?.[langCode] ||
			config.longDescription?.en ||
			"No description";

		const guideBody =
			config.guide?.[langCode] ||
			config.guide?.en ||
			"";

		const usage = guideBody
			.replace(/{pn}/g, prefix + config.name)
			.replace(/{p}/g, prefix)
			.replace(/{n}/g, config.name);

		const response =
			`╭─────────⭓\n` +
			`│ 🎀 ${lb.name}: ${config.name}\n` +
			`│ 📃 ${lb.alias}: ${
				config.aliases
					? config.aliases.join(", ")
					: lb.none
			}\n` +
			`├──‣ ${lb.info}\n` +
			`│ 📝 ${lb.desc}: ${desc}\n` +
			`│ 👑 ${lb.author}: ${
				config.author || lb.unknown
			}\n` +
			`│ 📚 ${lb.guide}: ${
				usage || prefix + config.name
			}\n` +
			`├──‣ ${lb.usage}\n` +
			`│ ⭐ ${lb.ver}: ${
				config.version || "1.0"
			}\n` +
			`│ ♻️ ${lb.role}: ${roleText}\n` +
			`╰────────────⭓`;

		const helpMessage = await message.reply(response);

		setTimeout(() => {
			try {
				message.unsend(helpMessage.messageID);
			} catch (e) {}
		}, 80000);
	},

	// ==========================================
	// ملي المستخدم يرد على GIF
	// ==========================================
	onReply: async function ({
		message,
		event,
		Reply,
		threadsData,
		role
	}) {
		if (Reply.type !== "helpList")
			return;

		const { threadID } = event;
		const prefix = getPrefix(threadID);

		// نبني لائحة الأوامر
		const categories = {};

		for (const [name, value] of commands) {
			if (
				value.config.role > 0 &&
				role < value.config.role
			)
				continue;

			const category =
				value.config.category ||
				"Uncategorized";

			if (!categories[category]) {
				categories[category] = {
					commands: []
				};
			}

			if (
				!categories[category].commands.includes(
					name
				)
			) {
				categories[category].commands.push(name);
			}
		}

		let msg = "";

		Object.keys(categories)
			.sort()
			.forEach(category => {
				msg +=
					`\n╭─────⭓ ${category.toUpperCase()}`;

				const names =
					categories[category].commands.sort();

				for (
					let i = 0;
					i < names.length;
					i += 3
				) {
					const cmds = names
						.slice(i, i + 3)
						.map(item => `✧${item}`);

					msg += `\n│ ${cmds.join("  ")}`;
				}

				msg += `\n╰────────────⭓\n`;
			});

		const totalCommands = commands.size;

		msg +=
			`\n╭────────────⭓\n` +
			`│ 🦋 SHTOT COMMANDS 🦋\n` +
			`│\n` +
			`│ ⭔ Total Commands: ${totalCommands}\n` +
			`│\n` +
			`│ 📚 ${prefix}help <command>\n` +
			`│ لمعرفة تفاصيل أي أمر\n` +
			`╰────────────⭓`;

		try {
			const sent = await message.reply(msg);

			setTimeout(() => {
				try {
					message.unsend(sent.messageID);
				} catch (e) {}
			}, 80000);

		} catch (error) {
			console.error("Help List Error:", error);
		}
	}
};

function roleTextToString(role, lang) {
	const roles = {
		bn: [
			"সব ইউজার",
			"গ্রুপ অ্যাডমিন",
			"বোট অ্যাডমিন",
			"ডেভেলপার (Dev)",
			"ভিআইপি (VIP)",
			"NSFW ইউজার"
		],
		en: [
			"All users",
			"Group Admin",
			"Bot Admin",
			"Developer",
			"VIP User",
			"NSFW User"
		],
		vi: [
			"Tất cả người dùng",
			"Quản trị viên nhóm",
			"Admin bot",
			"Người phát triển",
			"Người dùng VIP",
			"Người dùng NSFW"
		]
	};

	const r = roles[lang] || roles.en;

	if (role >= 0 && role <= 5) {
		return `${role} (${r[role]})`;
	}

	return `${role} (Unknown)`;
                }

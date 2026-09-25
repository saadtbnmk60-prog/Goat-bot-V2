"use strict";

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const https = require("https");
const { utils } = global;

module.exports = {
	config: {
		name: "prefix",
		version: "2.0",
		author: "SHTOT",
		countDown: 5,
		role: 0,
		description: "Change bot prefix and show prefix as an image",
		category: "config",
		guide: {
			en:
				"{pn} : show current prefix as image"
				+ "\n{pn} <new prefix>: change prefix in this group"
				+ "\nExample: {pn} #"
				+ "\n\n{pn} <new prefix> -g: change global bot prefix"
				+ "\nExample: {pn} # -g"
				+ "\n\n{pn} reset: reset group prefix"
		}
	},

	langs: {
		en: {
			reset: "✅ Prefix has been reset to default: %1",
			onlyAdmin: "❌ Only bot admin can change the global prefix.",
			confirmGlobal:
				"⚠️ React to this message to confirm changing the global prefix.",
			confirmThisThread:
				"⚠️ React to this message to confirm changing the prefix in this group.",
			successGlobal:
				"✅ Global prefix changed to: %1",
			successThisThread:
				"✅ Group prefix changed to: %1",
			imageError:
				"❌ An error occurred while creating the prefix image."
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
		if (!args[0])
			return message.SyntaxError();

		// Reset prefix
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
			messageID: null,
			setGlobal: false
		};

		// Global prefix
		if (args[1] === "-g") {
			if (role < 2)
				return message.reply(
					getLang("onlyAdmin")
				);

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

		// Change global prefix
		if (setGlobal) {
			global.GoatBot.config.prefix = newPrefix;

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

		// Change group prefix
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

		/*
			=========================================
			SHTOT PREFIX IMAGE SYSTEM
			=========================================
		*/

		if (
			!event.body ||
			event.body.trim().toLowerCase() !== "prefix"
		)
			return;

		try {

			// ========================================
			// رابط صورة SHTOT
			// ========================================

			const IMAGE_URL =
				"https://i.postimg.cc/0jBmM6wd/file-000000006e2481f5a55795b75561339e.png";


			// ========================================
			// Prefix الحالي ديال المجموعة
			// ========================================

			const currentPrefix =
				String(
					utils.getPrefix(event.threadID)
				);


			// ========================================
			// تحميل مكتبة Sharp
			// ========================================

			let sharp;

			try {
				sharp = require("sharp");
			}
			catch (err) {

				return message.reply(
					"❌ مكتبة sharp ناقصة.\n\n" +
					"ثبتها بهاد الأمر:\n" +
					"npm install sharp"
				);
			}


			// ========================================
			// المجلد المؤقت
			// ========================================

			const tempDir = path.join(
				os.tmpdir(),
				"shtot-prefix"
			);

			await fs.ensureDir(tempDir);


			// ========================================
			// أسماء الملفات
			// ========================================

			const templatePath = path.join(
				tempDir,
				"shtot_prefix_template.png"
			);

			const outputPath = path.join(
				tempDir,
				`shtot_prefix_${event.threadID}_${Date.now()}.png`
			);


			// ========================================
			// تحميل الصورة الأصلية
			// ========================================

			if (!fs.existsSync(templatePath)) {

				await new Promise((resolve, reject) => {

					const file = fs.createWriteStream(
						templatePath
					);

					https.get(
						IMAGE_URL,
						response => {

							if (
								response.statusCode >= 300 &&
								response.statusCode < 400 &&
								response.headers.location
							) {

								file.close();
								fs.unlinkSync(templatePath);

								return reject(
									new Error(
										"Image redirected"
									)
								);
							}

							if (
								response.statusCode !== 200
							) {

								file.close();
								fs.unlinkSync(templatePath);

								return reject(
									new Error(
										"Failed to download image: " +
										response.statusCode
									)
								);
							}

							response.pipe(file);

							file.on(
								"finish",
								() => {
									file.close(resolve);
								}
							);

						}
					).on(
						"error",
						err => {

							file.close();

							if (
								fs.existsSync(
									templatePath
								)
							) {
								fs.unlinkSync(
									templatePath
								);
							}

							reject(err);
						}
					);

				});
			}


			// ========================================
			// حماية النص من XML
			// ========================================

			const safePrefix =
				currentPrefix
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;")
					.replace(/"/g, "&quot;")
					.replace(/'/g, "&apos;");


			// ========================================
			// SVG ديال Prefix
			// ========================================

			const svg = `
			<svg
				width="1536"
				height="1024"
				xmlns="http://www.w3.org/2000/svg"
			>

				<defs>

					<filter
						id="glow"
						x="-100%"
						y="-100%"
						width="300%"
						height="300%"
					>

						<feGaussianBlur
							stdDeviation="8"
							result="blur"
						/>

						<feMerge>

							<feMergeNode
								in="blur"
							/>

							<feMergeNode
								in="SourceGraphic"
							/>

						</feMerge>

					</filter>

				</defs>


				<!-- Prefix -->

				<text
					x="850"
					y="790"
					text-anchor="middle"
					font-family="Arial, sans-serif"
					font-size="115"
					font-weight="900"
					fill="#00AFFF"
					stroke="#001827"
					stroke-width="4"
					filter="url(#glow)"
				>${safePrefix}</text>

			</svg>
			`;


			// ========================================
			// تركيب Prefix فوق الصورة
			// ========================================

			await sharp(templatePath)
				.composite([
					{
						input: Buffer.from(svg),
						top: 0,
						left: 0
					}
				])
				.png()
				.toFile(outputPath);


			// ========================================
			// إرسال الصورة
			// ========================================

			return message.reply(
				{
					attachment:
						fs.createReadStream(
							outputPath
						)
				},
				() => {

					// حذف الصورة المؤقتة
					setTimeout(
						() => {

							try {

								if (
									fs.existsSync(
										outputPath
									)
								) {
									fs.unlinkSync(
										outputPath
									);
								}

							}
							catch (e) {}

						},
						5000
					);

				}
			);

		}
		catch (error) {

			console.error(
				"[SHTOT PREFIX ERROR]",
				error
			);

			return message.reply(
				"❌ وقع مشكل فصناعة صورة الـ Prefix."
			);
		}
	}
};

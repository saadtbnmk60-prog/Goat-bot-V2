"use strict";

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const sharp = require("sharp");

module.exports.config = {
  name: "ستحقار",
  version: "1.0",
  role: 0,
  author: "Neoaz",
  category: "fun",
  cooldowns: 5
};

// الصورة اللي عطيتيني
const BACKGROUND_URL =
  "https://i.postimg.cc/vTQGdX2s/IMG-20260919-WA0061(1).jpg";

// تحميل صورة من رابط
async function downloadImage(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000
  });

  return Buffer.from(response.data);
}

// جلب صورة بروفايل المستخدم
async function getProfileUrl(api, userID) {
  return new Promise((resolve, reject) => {
    api.getUserInfo(userID, (err, info) => {
      if (err) return reject(err);

      const user = info && info[userID];

      if (!user) {
        return reject(new Error("User not found"));
      }

      if (user.profileUrl) {
        return resolve(user.profileUrl);
      }

      if (user.thumbSrc) {
        return resolve(user.thumbSrc);
      }

      reject(new Error("Profile picture not found"));
    });
  });
}

// تحويل البروفايل إلى دائرة
async function makeCircle(buffer, size = 280) {

  const mask = Buffer.from(`
    <svg width="${size}" height="${size}">
      <circle
        cx="${size / 2}"
        cy="${size / 2}"
        r="${size / 2 - 5}"
        fill="white"
      />
    </svg>
  `);

  const border = Buffer.from(`
    <svg width="${size}" height="${size}">
      <circle
        cx="${size / 2}"
        cy="${size / 2}"
        r="${size / 2 - 5}"
        fill="none"
        stroke="white"
        stroke-width="8"
      />
    </svg>
  `);

  return await sharp(buffer)
    .resize(size, size, {
      fit: "cover",
      position: "centre"
    })
    .composite([
      {
        input: mask,
        blend: "dest-in"
      },
      {
        input: border,
        blend: "over"
      }
    ])
    .png()
    .toBuffer();
}

module.exports.onStart = async ({ event, api }) => {

  try {

    const {
      threadID,
      messageID,
      senderID,
      messageReply
    } = event;

    // خاصك ترد على الشخص
    if (!messageReply) {

      return api.sendMessage(
        "❌ رد على رسالة الشخص وكتب: ستحقار",
        threadID,
        messageID
      );
    }

    // ID ديال الشخص اللي رديتي عليه
    const targetID = messageReply.senderID;

    if (!targetID) {

      return api.sendMessage(
        "❌ مقدرتش نحدد الشخص اللي رديتي عليه.",
        threadID,
        messageID
      );
    }

    // ==============================
    // 1. جلب البروفايلات
    // ==============================

    const targetProfileUrl =
      await getProfileUrl(api, targetID);

    const myProfileUrl =
      await getProfileUrl(api, senderID);

    // ==============================
    // 2. تحميل الصور
    // ==============================

    const background =
      await downloadImage(BACKGROUND_URL);

    const targetProfile =
      await downloadImage(targetProfileUrl);

    const myProfile =
      await downloadImage(myProfileUrl);

    // ==============================
    // 3. حجم البروفايلات
    // ==============================

    const profileSize = 280;

    const targetCircle =
      await makeCircle(targetProfile, profileSize);

    const myCircle =
      await makeCircle(myProfile, profileSize);

    // ==============================
    // 4. تركيب الصور
    // ==============================

    const result = await sharp(background)
      .composite([

        // بروفايل الشخص اللي رديتي عليه
        // الدائرة اليسرى فوق المرأة
        {
          input: targetCircle,
          left: 40,
          top: 150
        },

        // بروفايلك أنت
        // الدائرة اليمنى فوق الراجل
        {
          input: myCircle,
          left: 980,
          top: 130
        }

      ])
      .jpeg({
        quality: 95
      })
      .toBuffer();

    // ==============================
    // 5. إنشاء cache
    // ==============================

    const cacheDir =
      path.join(__dirname, "cache");

    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, {
        recursive: true
      });
    }

    const outputPath =
      path.join(
        cacheDir,
        `stehqar_${senderID}_${targetID}.jpg`
      );

    fs.writeFileSync(
      outputPath,
      result
    );

    // ==============================
    // 6. إرسال الصورة
    // ==============================

    api.sendMessage(
      {
        body: "😂🔥",
        attachment: fs.createReadStream(outputPath)
      },
      threadID,
      () => {

        try {
          fs.unlinkSync(outputPath);
        } catch (e) {}

      },
      messageID
    );

  } catch (error) {

    console.error(
      "STEHQAR ERROR:",
      error
    );

    api.sendMessage(
      "❌ وقع مشكل فصناعة الصورة.\n\nتأكد أن sharp مركبة فالبوت.",
      event.threadID,
      event.messageID
    );
  }
};

"use strict";

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const sharp = require("sharp");

module.exports.config = {
  name: "ستحقار",
  version: "2.0",
  role: 0,
  author: "Neoaz",
  category: "fun",
  cooldowns: 5
};

// ==============================
// صورة الخلفية
// ==============================

const BACKGROUND_URL =
  "https://i.postimg.cc/vTQGdX2s/IMG-20260919-WA0061(1).jpg";

// ==============================
// تحميل صورة
// ==============================

async function downloadImage(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  return Buffer.from(response.data);
}

// ==============================
// جلب صورة بروفايل Facebook
// ==============================

async function getProfileImage(api, userID) {
  return new Promise((resolve, reject) => {

    api.getUserInfo(userID, async (err, info) => {

      if (err) {
        return reject(err);
      }

      const user = info && info[userID];

      if (!user) {
        return reject(
          new Error("User information not found")
        );
      }

      // الصورة الحقيقية ديال البروفايل
      if (user.thumbSrc) {
        return resolve(user.thumbSrc);
      }

      // احتياط
      if (user.profileUrl) {
        return resolve(user.profileUrl);
      }

      reject(
        new Error("Profile image URL not found")
      );
    });
  });
}

// ==============================
// صنع صورة دائرية
// ==============================

async function makeCircle(buffer, size = 280) {

  const resized = await sharp(buffer)
    .resize(size, size, {
      fit: "cover",
      position: "centre"
    })
    .png()
    .toBuffer();

  // القناع الدائري
  const mask = Buffer.from(`
    <svg
      width="${size}"
      height="${size}"
      viewBox="0 0 ${size} ${size}"
    >
      <circle
        cx="${size / 2}"
        cy="${size / 2}"
        r="${size / 2 - 5}"
        fill="white"
      />
    </svg>
  `);

  // الإطار الأبيض
  const border = Buffer.from(`
    <svg
      width="${size}"
      height="${size}"
      viewBox="0 0 ${size} ${size}"
    >
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

  return await sharp(resized)
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

// ==============================
// الأمر
// ==============================

module.exports.onStart = async ({ event, api }) => {

  const {
    threadID,
    messageID,
    senderID,
    messageReply
  } = event;

  try {

    // --------------------------
    // خاص Reply
    // --------------------------

    if (!messageReply) {

      return api.sendMessage(
        "❌ خاصك ترد على رسالة الشخص اللي بغيتي تحط بروفايلو وكتب: ستحقار",
        threadID,
        messageID
      );
    }

    // --------------------------
    // ID ديال الشخص المردود عليه
    // --------------------------

    const targetID = messageReply.senderID;

    if (!targetID) {

      return api.sendMessage(
        "❌ مقدرتش نعرف صاحب الرسالة.",
        threadID,
        messageID
      );
    }

    // --------------------------
    // جلب روابط البروفايلات
    // --------------------------

    const targetImageURL =
      await getProfileImage(api, targetID);

    const myImageURL =
      await getProfileImage(api, senderID);

    // --------------------------
    // تحميل الصور
    // --------------------------

    const [
      background,
      targetImage,
      myImage
    ] = await Promise.all([

      downloadImage(BACKGROUND_URL),

      downloadImage(targetImageURL),

      downloadImage(myImageURL)

    ]);

    // --------------------------
    // حجم الدوائر
    // --------------------------

    const SIZE = 280;

    const targetCircle =
      await makeCircle(targetImage, SIZE);

    const myCircle =
      await makeCircle(myImage, SIZE);

    // --------------------------
    // تركيب البروفايلات
    // --------------------------

    const result = await sharp(background)
      .composite([

        // ======================
        // بروفايل الشخص الآخر
        // فوق المرأة - اليسار
        // ======================

        {
          input: targetCircle,
          left: 40,
          top: 150
        },

        // ======================
        // بروفايلك أنت
        // فوق الراجل - اليمين
        // ======================

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

    // --------------------------
    // إنشاء مجلد cache
    // --------------------------

    const cacheDir =
      path.join(__dirname, "cache");

    if (!fs.existsSync(cacheDir)) {

      fs.mkdirSync(cacheDir, {
        recursive: true
      });

    }

    // --------------------------
    // اسم الصورة
    // --------------------------

    const filePath =
      path.join(
        cacheDir,
        `stehqar_${senderID}_${targetID}.jpg`
      );

    // --------------------------
    // حفظ الصورة
    // --------------------------

    fs.writeFileSync(
      filePath,
      result
    );

    // --------------------------
    // إرسال الصورة
    // --------------------------

    api.sendMessage(
      {
        body: "😂🔥",
        attachment: fs.createReadStream(filePath)
      },
      threadID,
      () => {

        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.log(e);
        }

      },
      messageID
    );

  } catch (error) {

    console.error(
      "\n========== STEHQAR ERROR ==========\n",
      error,
      "\n====================================\n"
    );

    api.sendMessage(
      "❌ وقع مشكل فصناعة الصورة.\n\n" +
      "تأكد أن sharp و axios مركبين، ومن بعد دير Restart للبوت.",
      threadID,
      messageID
    );

  }

};

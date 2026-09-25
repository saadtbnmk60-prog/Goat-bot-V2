const fs = require("fs");
const axios = require("axios");

const baseApiUrl = async () => {
  const base = await axios.get(
    "https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json"
  );
  return base.data.mahmud;
};

module.exports.config = {
  name: "gff",
  version: "1.0",
  role: 0,
  author: "MahMUD",
  category: "fun",
  cooldowns: 5
};

module.exports.onStart = async ({ event, api }) => {
  try {
    const {
      threadID,
      messageID,
      senderID,
      messageReply
    } = event;

    if (!messageReply) {
      return api.sendMessage(
        "❌ رد على رسالة الشخص وكتب: gff",
        threadID,
        messageID
      );
    }

    // الشخص اللي رديتي عليه
    const user1 = messageReply.senderID;

    // نتا
    const user2 = senderID;

    const baseUrl = await baseApiUrl();

    const apiUrl =
      `${baseUrl}/api/stehqar?user1=${user1}&user2=${user2}`;

    const response = await axios.get(apiUrl, {
      responseType: "arraybuffer"
    });

    const imgPath =
      __dirname + `/cache/gff_${user1}_${user2}.jpg`;

    fs.writeFileSync(
      imgPath,
      Buffer.from(response.data)
    );

    api.sendMessage(
      {
        body: "😂🔥",
        attachment: fs.createReadStream(imgPath)
      },
      threadID,
      () => {
        try {
          fs.unlinkSync(imgPath);
        } catch (e) {}
      },
      messageID
    );

  } catch (error) {
    console.error(error);

    api.sendMessage(
      "❌ وقع مشكل فصناعة الصورة.",
      event.threadID,
      event.messageID
    );
  }
};

const axios = require("axios");

module.exports = {
  config: {
    name: "gpt",
    aliases: ["chatgpt", "ai"],
    version: "1.0",
    author: "nexo_here",
    countDown: 10, // Cooldown for API calls
    role: 0,
    shortDescription: "Chat with GPT-4o AI",
    longDescription: "Sends your question or an image to GPT-4o API for assistance. Supports conversational replies.",
    category: "ai",
    guide: "{pn}gpt <your question> or reply to an image.",
  },

  onStart: async function ({ api, event, args, message }) {
    const apikey = "0d3e6e99ec273d2c12c007e607766bb6563626541e39a16f9dd7fedcbf7246ed"; // Your API key
    let query;

    // Check if replying to an image
    const repliedMessage = event.messageReply;

    if (
      repliedMessage &&
      repliedMessage.attachments &&
      repliedMessage.attachments.length > 0 &&
      repliedMessage.attachments[0].type === "photo"
    ) {
      query = repliedMessage.attachments[0].url;
      console.log(`[GPT_DEBUG] onStart: Initial image query from reply: ${query}`);
    } else if (args.length > 0) {
      query = args.join(" ");
      console.log(`[GPT_DEBUG] onStart: Initial text query from command: "${query}"`);
    } else {
      console.log("[GPT_DEBUG] onStart: No query provided in command or image reply.");
      return message.reply("❌ Please provide a question or reply to an image.");
    }

    const url = `https://haji-mix-api.gleeze.com/api/gpt4o?ask=${encodeURIComponent(query)}&uid=&roleplay=&apikey=${apikey}`;
    console.log(`[GPT_DEBUG] onStart: API URL: ${url}`);

    try {
      const res = await axios.get(url);
      const responseText = res.data?.answer; // GPT API returns "answer" field
      if (!responseText) {
        console.error("[GPT_DEBUG] onStart: No 'answer' field in API data:", res.data);
        return message.reply("⚠️ No response received from GPT-4o.");
      }

      // Send the initial response and set up onReply context
      api.sendMessage({ body: responseText }, event.threadID, (err, info) => {
        if (err) {
          console.error("[GPT_DEBUG] onStart: Error sending message:", err);
          return message.reply("❌ Failed to send response message.");
        }
        
        // Set up the onReply context for this specific message
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name, // The command name
          messageID: info.messageID,     // The ID of the bot's sent message
          author: event.senderID,       // The ID of the user who started the conversation
        });
        console.log(`[GPT_DEBUG] onStart: Response sent. Context set for messageID: ${info.messageID}`);
      });
      
    } catch (err) {
      console.error("GPT API Error (onStart):", err.message);
      if (axios.isAxiosError(err) && err.response) {
          console.error("GPT API Response Data (Error - onStart):", err.response.data);
      }
      return message.reply("❌ Failed to contact GPT-4o API.");
    }
  },

  onReply: async function ({ api, event, message, Reply }) {
    console.log(`[GPT_DEBUG] onReply: Function triggered.`);
    console.log(`[GPT_DEBUG] onReply: Event body: "${event.body}"`);
    console.log(`[GPT_DEBUG] onReply: Event senderID: ${event.senderID}`);
    console.log(`[GPT_DEBUG] onReply: Reply context object:`, Reply);

    // Check if this reply is for the correct command and original author
    if (Reply.commandName !== this.config.name) {
      console.log(`[GPT_DEBUG] onReply: Ignoring reply for different command: ${Reply.commandName}`);
      return;
    }
    if (event.senderID !== Reply.author) { // Reply.author holds the original senderID
      console.log(`[GPT_DEBUG] onReply: Reply from unauthorized user: ${event.senderID}`);
      return message.reply("This conversation is only for the user who started it.");
    }

    let newQuery;
    const repliedWithAttachment = event.attachments && event.attachments.length > 0 && event.attachments[0].type === "photo";

    if (repliedWithAttachment) {
        newQuery = event.attachments[0].url;
        console.log(`[GPT_DEBUG] onReply: Follow-up image query: ${newQuery}`);
    } else if (event.body) {
        newQuery = event.body;
        console.log(`[GPT_DEBUG] onReply: Follow-up text query: "${newQuery}"`);
    } else {
        console.log("[GPT_DEBUG] onReply: No valid query found in follow-up message.");
        return message.reply("❌ Please provide a text question or reply with an image for follow-up.");
    }
    
    const apikey = "0d3e6e99ec273d2c12c007e607766bb6563626541e39a16f9dd7fedcbf7246ed"; // Your API key
    const url = `https://haji-mix-api.gleeze.com/api/gpt4o?ask=${encodeURIComponent(newQuery)}&uid=&roleplay=&apikey=${apikey}`;
    console.log(`[GPT_DEBUG] onReply: API URL: ${url}`);

    try {
      const res = await axios.get(url);
      const responseText = res.data?.answer; // GPT API returns "answer" field

      if (!responseText) {
        console.error("[GPT_DEBUG] onReply: No 'answer' field in API data:", res.data);
        return message.reply("⚠️ No response received from GPT-4o for your follow-up.");
      }

      // Send the follow-up response
      api.sendMessage({ body: responseText }, event.threadID, (err, info) => {
        if (err) {
          console.error("[GPT_DEBUG] onReply: Error sending follow-up message:", err);
          return message.reply("❌ Failed to send follow-up response.");
        }
        // Delete the old context and set new context for the latest message
        global.GoatBot.onReply.delete(Reply.messageID); // Delete old context
        global.GoatBot.onReply.set(info.messageID, { // Set new context
            commandName: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
        });
        console.log(`[GPT_DEBUG] onReply: Follow-up response sent. Context updated for messageID: ${info.messageID}`);
      });

    } catch (err) {
      console.error("GPT API Error (onReply):", err.message);
      if (axios.isAxiosError(err) && err.response) {
          console.error("GPT API Response Data (Error - onReply):", err.response.data);
      }
      return message.reply("❌ Failed to contact GPT-4o API for your follow-up.");
    }
  }
};

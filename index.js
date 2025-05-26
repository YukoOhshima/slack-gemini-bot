require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini API 初期化（モデル名を最新版に変更！）
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro-latest", // ✅ 修正ポイント！
  generationConfig: {
    temperature: 0.9
  }
});

// ExpressとBoltの統合
const customApp = express();

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
  endpoints: '/slack/events',
  app: customApp,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

// メンションを受け取ってGeminiで返信
app.event('app_mention', async ({ event, say }) => {
  const userMessage = event.text.replace(/<@[^>]+>\s*/, '');
  console.log('👂 メッセージ:', userMessage);

  try {
    const result = await model.generateContent([userMessage]);
    const reply = result.response.text();
    await say({ text: reply, thread_ts: event.ts });
  } catch (error) {
    console.error('Gemini API エラー:', error);
    await say({ text: 'ごめんなさい、エラーが発生しました🙏', thread_ts: event.ts });
  }
});

// アプリを起動
(async () => {
  const port = process.env.PORT || 3000;
  customApp.listen(port, () => {
    console.log(`⚡ Slack Gemini Bot is running on port ${port}!`);
  });
})();
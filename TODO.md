# Integration: Flask Emotion API → Gemini Chat

## Steps

### 1. ✅ Create updated src/lib/gemini.js
- Add `detectEmotions(text)` function
- Update `generateGeminiReply(messages)` to call emotions → enrich system prompt → Gemini

### 2. Test Integration
- `npm start`
- Chat: Send user message
- Verify: Network tab → localhost:5000/predict → enriched Gemini reply

### 3. Completion
- attempt_completion

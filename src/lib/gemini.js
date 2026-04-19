const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;
const geminiModel = process.env.REACT_APP_GEMINI_MODEL;
const flaskUrl = process.env.REACT_APP_FLASK_URL || 'https://reactor-eardrum-defame.ngrok-free.dev';

export const hasGeminiConfig = Boolean(geminiApiKey);

const THERAPIST_SYSTEM_PROMPT = `You are a supportive AI wellness companion inside a mental health app.
Keep responses empathetic, calm, practical, and concise.
Do not claim to be a licensed therapist.
Do not provide diagnosis.
Encourage professional or emergency help in india if the user mentions self-harm, suicide, or immediate danger.
Focus on listening, coping strategies, and helpful next steps.`;

function toGeminiContents(messages) {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.text }],
    }));
}

function extractGeminiText(data) {
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];

  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    const text = parts
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n\n')
      .trim();

    if (text) {
      return text;
    }
  }

  return '';
}

async function detectEmotions(text) {
  try {
    console.log('[Emotion] Starting detection', {
      flaskUrl,
      endpoint: `${flaskUrl}/predict`,
      textPreview: text.slice(0, 80),
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(`${flaskUrl}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[Emotion] Response received', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      throw new Error(`Flask API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Emotion] Payload', data);
    return data.predictions || {};
  } catch (error) {
    console.error('[Emotion] Detection failed', error);
    return {};
  }
}

export async function generateGeminiReply(messages) {
  if (!hasGeminiConfig) {
    throw new Error('Gemini API key is missing. Add REACT_APP_GEMINI_API_KEY to continue.');
  }
  if (!geminiModel) {
    throw new Error('Gemini model is missing. Add REACT_APP_GEMINI_MODEL to continue.');
  }

  console.log('[Gemini] Starting request', {
    hasApiKey: Boolean(geminiApiKey),
    geminiModel,
    messageCount: messages.length,
  });

  // Detect emotions from latest user message
  const lastUserMsg = messages.findLast((m) => m.role === 'user')?.text || '';
  const emotions = await detectEmotions(lastUserMsg);
  const topEmotions = Object.entries(emotions)
    .slice(0, 3)
    .map(([emotion, prob]) => `${emotion} (${prob})`)
    .join(', ') || 'neutral';
  const emotionContext = `Emotion analysis of latest user message: ${topEmotions}. Tailor your empathetic response to acknowledge these emotions if relevant.`;

  const enrichedSystemPrompt = [THERAPIST_SYSTEM_PROMPT, emotionContext].join('\n\n');
  console.log('[Gemini] Emotion context ready', { emotions, topEmotions });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: enrichedSystemPrompt }],
        },
        contents: toGeminiContents(messages),
        generationConfig: {
          temperature: 0.8,
          topP: 0.95,
          maxOutputTokens: 800,
        },
      }),
    }
  );

  console.log('[Gemini] Response received', {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
  });

  const data = await response.json();
  console.log('[Gemini] Payload', data);

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Gemini request failed.');
  }

  const text = extractGeminiText(data);

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  // Include emotions in metadata for debugging
  return {
    text,
    model: data?.modelVersion || geminiModel,
    emotions, // Bonus: propagate for UI logging if needed
  };
}

import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { generateGeminiReply, hasGeminiConfig } from './lib/gemini';
import { hasSupabaseConfig, supabase } from './lib/supabase';

function IconBase({ children }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {children}
    </svg>
  );
}

function ChatIcon() {
  return (
    <IconBase>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </IconBase>
  );
}

function PulseIcon() {
  return (
    <IconBase>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </IconBase>
  );
}

function BookIcon() {
  return (
    <IconBase>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </IconBase>
  );
}

function HeartIcon() {
  return (
    <IconBase>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </IconBase>
  );
}

function UserIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="7" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    </IconBase>
  );
}

function PlusIcon() {
  return (
    <IconBase>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

function TrashIcon() {
  return (
    <IconBase>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </IconBase>
  );
}

function MicIcon() {
  return (
    <IconBase>
      <path d="M12 15a4 4 0 0 0 4-4V7a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v4" />
      <path d="M8 22h8" />
    </IconBase>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3.4 20.4 21 12 3.4 3.6 3 10.1l12 1.9-12 1.9z" />
    </svg>
  );
}

const NAV_ITEMS = [
  { id: 'session', label: 'Session', icon: <ChatIcon /> },
  { id: 'mood', label: 'Mood', icon: <PulseIcon /> },
  { id: 'history', label: 'History', icon: <BookIcon /> },
  { id: 'exercises', label: 'Exercises', icon: <HeartIcon /> },
  { id: 'profile', label: 'Profile', icon: <UserIcon /> },
];

const MOODS = [
  { badge: 'Sad', label: 'Very Low', value: 1 },
  { badge: 'Low', label: 'Low', value: 2 },
  { badge: 'Okay', label: 'Neutral', value: 3 },
  { badge: 'Good', label: 'Good', value: 4 },
  { badge: 'Great', label: 'Great', value: 5 },
];

const TAGS = ['Hopeful', 'Anxious', 'Grateful', 'Tired', 'Stressed', 'Calm'];
const EXERCISES = [
  { id: 'box', icon: 'Air', title: 'Box Breathing', subtitle: 'Calm your nervous system', accent: 'green' },
  { id: 'grounding', icon: 'Anchor', title: 'Anchor Exercise', subtitle: 'Return to the present', accent: 'sand' },
  { id: 'thought', icon: 'CBT', title: 'CBT Journal', subtitle: 'Write and reframe', accent: 'clay' },
];
const BREATH_PHASES = [
  { label: 'Inhale', duration: 4, instruction: 'Breathe in slowly through your nose' },
  { label: 'Hold', duration: 4, instruction: 'Hold your breath gently' },
  { label: 'Exhale', duration: 4, instruction: 'Breathe out slowly through your mouth' },
  { label: 'Hold', duration: 4, instruction: 'Pause before the next breath' },
];
const GROUNDING_STEPS = [
  { count: 5, label: 'see', prompt: 'Name five things you can see around you.' },
  { count: 4, label: 'feel', prompt: 'Name four things you can feel right now.' },
  { count: 3, label: 'hear', prompt: 'Name three sounds you can hear.' },
  { count: 2, label: 'smell', prompt: 'Name two things you can smell.' },
  { count: 1, label: 'taste', prompt: 'Name one thing you can taste or would like to taste.' },
];
const CBT_FIELDS = [
  { key: 'situation', label: 'Situation' },
  { key: 'thought', label: 'Automatic thought' },
  { key: 'emotion', label: 'Emotion' },
  { key: 'evidence_for', label: 'Evidence for' },
  { key: 'evidence_against', label: 'Evidence against' },
  { key: 'balanced_thought', label: 'Balanced thought' },
];
const CHAT_TITLE_PATTERN = /^Chat (\d+)$/;
const CHAT_HEADER_PROMPT = 'How are you feeling today?';
const INITIAL_ASSISTANT_MESSAGE =
  'Hello, I am Serenity. This is a calm, judgment-free space. How are you feeling today?';
const DEMO_ENTRIES = [2, 3, 2, 4, 3, 3, 4, 3, 5, 4, 3, 4, 4, 4].map((value, index, values) => ({
  id: `demo-${index}`,
  mood_value: value,
  tags: [],
  created_at: new Date(Date.now() - (values.length - index - 1) * 86400000).toISOString(),
}));

function getDefaultChatTitle(chatNumber) {
  return `Chat ${chatNumber}`;
}

function normalizeChatTitle(title, fallback = '') {
  const normalized = `${title ?? ''}`.replace(/\s+/g, ' ').trim();
  return normalized || fallback;
}

function getFirstUserMessageText(messages) {
  return messages.find((message) => message.role === 'user')?.text ?? '';
}

function buildAutoChatTitle(messageText, fallbackTitle) {
  const normalizedFallback = normalizeChatTitle(fallbackTitle, 'Chat');
  const normalizedMessage = normalizeChatTitle(messageText);

  if (!normalizedMessage) {
    return normalizedFallback;
  }

  const cleanedMessage = normalizedMessage.replace(/[\r\n]+/g, ' ').replace(/[.!?,;:]+$/g, '').trim();
  const shortened = cleanedMessage.split(' ').filter(Boolean).slice(0, 8).join(' ');
  const candidateTitle = normalizeChatTitle(shortened, normalizedFallback);

  if (candidateTitle.length <= 52) {
    return candidateTitle;
  }

  return `${candidateTitle.slice(0, 49).trimEnd()}...`;
}

function isCustomSessionTitle(currentTitle, sessionMessages) {
  const normalizedTitle = normalizeChatTitle(currentTitle);

  if (!normalizedTitle || CHAT_TITLE_PATTERN.test(normalizedTitle)) {
    return false;
  }

  const firstUserMessage = getFirstUserMessageText(sessionMessages);

  if (!firstUserMessage) {
    return true;
  }

  return normalizedTitle !== buildAutoChatTitle(firstUserMessage, normalizedTitle);
}

function resolveSessionTitle(currentTitle, sessionMessages, fallbackTitle) {
  const normalizedCurrent = normalizeChatTitle(currentTitle);

  if (isCustomSessionTitle(normalizedCurrent, sessionMessages)) {
    return normalizedCurrent;
  }

  return buildAutoChatTitle(getFirstUserMessageText(sessionMessages), normalizedCurrent || fallbackTitle);
}

function getLocalDayKey(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildBlankJournalPage(pageNumber) {
  return {
    id: `local-page-${pageNumber}`,
    page_no: pageNumber,
    title: `Page ${pageNumber}`,
    content: {
      situation: '',
      thought: '',
      emotion: '',
      evidence_for: '',
      evidence_against: '',
      balanced_thought: '',
    },
  };
}

function getJournalPreviewText(content) {
  const orderedValues = CBT_FIELDS.map((field) => content?.[field.key] || '')
    .map((value) => `${value}`.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (orderedValues.length === 0) {
    return 'Start writing to preview this page.';
  }

  const preview = orderedValues.join(' ').slice(0, 120).trim();
  return preview.length < orderedValues.join(' ').length ? `${preview}...` : preview;
}

function App() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authStatus, setAuthStatus] = useState(
    hasSupabaseConfig ? 'Sign in to continue.' : 'Supabase env vars are missing. Add them before using auth.'
  );
  const [isAuthLoading, setIsAuthLoading] = useState(hasSupabaseConfig);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [activePage, setActivePage] = useState('session');
  const [trackerMood, setTrackerMood] = useState(4);
  const [selectedTags, setSelectedTags] = useState(['Hopeful', 'Grateful']);
  const [messages, setMessages] = useState([{ role: 'assistant', text: INITIAL_ASSISTANT_MESSAGE }]);
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [, setChatStatus] = useState(
    hasGeminiConfig
      ? 'Your conversations will be stored in Supabase.'
      : 'Gemini API key is missing. Add REACT_APP_GEMINI_API_KEY to enable replies.'
  );
  const [sessionList, setSessionList] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [isBreathingOpen, setIsBreathingOpen] = useState(false);
  const [breathRunning, setBreathRunning] = useState(false);
  const [breathPhase, setBreathPhase] = useState(0);
  const [breathTick, setBreathTick] = useState(0);
  const [breathCycle, setBreathCycle] = useState(1);
  const [breathingFinished, setBreathingFinished] = useState(false);
  const [tagMap, setTagMap] = useState({});
  const [moodEntries, setMoodEntries] = useState(DEMO_ENTRIES);
  const [moodStatus, setMoodStatus] = useState('Sign in to load your mood history.');
  const [isMoodSaving, setIsMoodSaving] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('Tap the mic to dictate.');
  const [isListening, setIsListening] = useState(false);
  const [isGroundingOpen, setIsGroundingOpen] = useState(false);
  const [groundingStepIndex, setGroundingStepIndex] = useState(0);
  const [groundingInput, setGroundingInput] = useState('');
  const [groundingResponses, setGroundingResponses] = useState([]);
  const [groundingFinished, setGroundingFinished] = useState(false);
  const [activeExerciseId, setActiveExerciseId] = useState(null);
  const [journalList, setJournalList] = useState([]);
  const [activeJournalId, setActiveJournalId] = useState(null);
  const [activeJournalPageId, setActiveJournalPageId] = useState(null);
  const [journalStatus, setJournalStatus] = useState('Choose a page to write.');
  const [isJournalLoading, setIsJournalLoading] = useState(false);
  const [isJournalSaving, setIsJournalSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const messagesRef = useRef(null);
  const recognitionRef = useRef(null);
  const activeSessionIdRef = useRef(null);

  const userId = session?.user?.id ?? null;
  const profileLabel = session?.user?.user_metadata?.display_name || session?.user?.email || 'Signed in user';
  const activeSession = useMemo(
    () => sessionList.find((item) => item.id === activeSessionId) ?? null,
    [sessionList, activeSessionId]
  );
  const nextChatNumber = useMemo(
    () =>
      sessionList.reduce((max, item) => {
        const match = item.title?.match(CHAT_TITLE_PATTERN);
        return Math.max(max, match ? Number(match[1]) : 0);
      }, 0) + 1,
    [sessionList]
  );
  const defaultChatTitle = useMemo(() => getDefaultChatTitle(nextChatNumber), [nextChatNumber]);
  const recentMoodEntries = useMemo(() => {
    const sorted = [...moodEntries].sort(
      (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    );
    return sorted.slice(-14);
  }, [moodEntries]);
  const moodAverage = useMemo(() => {
    if (!moodEntries.length) {
      return 0;
    }
    return moodEntries.reduce((sum, entry) => sum + Number(entry.mood_value || 0), 0) / moodEntries.length;
  }, [moodEntries]);
  const averageMood = useMemo(() => {
    const rounded = Math.max(1, Math.min(5, Math.round(moodAverage || trackerMood)));
    return MOODS.find((mood) => mood.value === rounded) ?? MOODS[0];
  }, [moodAverage, trackerMood]);
  const todayMoodCount = useMemo(() => {
    const todayKey = getLocalDayKey(new Date().toISOString());
    return moodEntries.filter((entry) => getLocalDayKey(entry.created_at) === todayKey).length;
  }, [moodEntries]);
  const canLogMoodToday = todayMoodCount < 3;
  const displayedChatTitle = useMemo(() => {
    const sourceMessages = activeSession?.messages?.length ? activeSession.messages : messages;
    const firstUserMessage = getFirstUserMessageText(sourceMessages);
    if (!firstUserMessage) {
      return 'New chat';
    }
    return resolveSessionTitle(activeSession?.title || '', sourceMessages, defaultChatTitle);
  }, [activeSession?.messages, activeSession?.title, defaultChatTitle, messages]);
  const speechRecognitionSupported = typeof window !== 'undefined'
    && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const activeJournal = useMemo(
    () => journalList.find((journal) => journal.id === activeJournalId) ?? null,
    [journalList, activeJournalId]
  );
  const activeJournalPage = useMemo(
    () => activeJournal?.pages.find((page) => page.id === activeJournalPageId) ?? null,
    [activeJournal, activeJournalPageId]
  );

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    if (!messagesRef.current) {
      return;
    }
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setIsAuthLoading(false);
      return undefined;
    }
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) {
        return;
      }
      if (error) {
        setAuthStatus(error.message);
        setIsAuthLoading(false);
        return;
      }
      setSession(data.session ?? null);
      setIsAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession ?? null);
      if (nextSession) {
        setAuthStatus('Signed in.');
        if (event === 'SIGNED_IN') {
          setActivePage('session');
          setActiveSessionId(null);
          setMessages([{ role: 'assistant', text: INITIAL_ASSISTANT_MESSAGE }]);
          setDraft('');
          setChatStatus(
            hasGeminiConfig
              ? 'New chat ready. Your next message will start a stored Gemini session.'
              : 'Gemini API key is missing. Add REACT_APP_GEMINI_API_KEY to enable replies.'
          );
        }
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!breathRunning || breathingFinished) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setBreathTick((currentTick) => {
        const phase = BREATH_PHASES[breathPhase];
        if (currentTick + 1 < phase.duration) {
          return currentTick + 1;
        }
        setBreathPhase((currentPhase) => {
          if (currentPhase + 1 < BREATH_PHASES.length) {
            return currentPhase + 1;
          }
          setBreathCycle((currentCycle) => {
            if (currentCycle >= 4) {
              window.clearInterval(timer);
              setBreathRunning(false);
              setBreathingFinished(true);
              return currentCycle;
            }
            return currentCycle + 1;
          });
          return 0;
        });
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [breathRunning, breathPhase, breathingFinished]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadMoodData() {
      if (!supabase || !userId) {
        setMoodEntries(DEMO_ENTRIES);
        setMoodStatus(hasSupabaseConfig ? 'Sign in to load your mood history.' : 'Using local demo mood data.');
        return;
      }
      setMoodStatus('Loading your mood history...');
      const [tagsResult, entriesResult] = await Promise.all([
        supabase.from('mood_tags').select('id, label'),
        supabase
          .from('mood_entries')
          .select(`
            id,
            mood_value,
            created_at,
            mood_entry_tags (
              mood_tags (
                label
              )
            )
          `)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (ignore) {
        return;
      }
      if (tagsResult.error) {
        setMoodStatus(`Failed to load mood tags: ${tagsResult.error.message}`);
        return;
      }
      const nextTagMap = {};
      (tagsResult.data ?? []).forEach((tag) => {
        nextTagMap[tag.label] = tag.id;
      });
      setTagMap(nextTagMap);
      if (entriesResult.error) {
        setMoodEntries([]);
        setMoodStatus(`Failed to load mood entries: ${entriesResult.error.message}`);
        return;
      }
      const normalized = (entriesResult.data ?? []).map((entry) => ({
        id: entry.id,
        mood_value: entry.mood_value,
        created_at: entry.created_at,
        tags: (entry.mood_entry_tags ?? []).map((item) => item.mood_tags?.label).filter(Boolean),
      }));
      setMoodEntries(normalized);
      if (normalized.length > 0) {
        setTrackerMood(normalized[0].mood_value);
        setSelectedTags(normalized[0].tags);
      }
      setMoodStatus(
        normalized.length > 0
          ? `Mood history loaded. ${Math.max(0, 3 - normalized.filter((entry) => getLocalDayKey(entry.created_at) === getLocalDayKey(new Date().toISOString())).length)} mood logs left today.`
          : 'No mood entries yet. You can log up to 3 moods today.'
      );
    }
    loadMoodData();
    return () => {
      ignore = true;
    };
  }, [userId]);

  useEffect(() => {
    let ignore = false;
    async function loadChatSessions() {
      if (!supabase || !userId) {
        setSessionList([]);
        setActiveSessionId(null);
        setMessages([{ role: 'assistant', text: INITIAL_ASSISTANT_MESSAGE }]);
        setChatStatus(
          hasGeminiConfig
            ? 'Sign in to start a Gemini-powered chat.'
            : 'Gemini API key is missing. Add REACT_APP_GEMINI_API_KEY to enable replies.'
        );
        return;
      }
      setIsSessionLoading(true);
      setChatStatus('Loading your conversation history...');
      const { data, error } = await supabase
        .from('therapy_sessions')
        .select(`
          id,
          title,
          summary,
          started_at,
          session_status,
          initial_mood_value,
          session_messages (
            id,
            sender_role,
            content,
            sequence_no,
            created_at
          )
        `)
        .order('started_at', { ascending: false })
        .order('sequence_no', { foreignTable: 'session_messages', ascending: true });
      if (ignore) {
        return;
      }
      if (error) {
        setSessionList([]);
        setMessages([{ role: 'assistant', text: INITIAL_ASSISTANT_MESSAGE }]);
        setChatStatus(`Failed to load chat history: ${error.message}`);
        setIsSessionLoading(false);
        return;
      }
      const normalizedSessions = (data ?? []).map((item) => {
        const sessionMessages = (item.session_messages ?? []).sort((left, right) => left.sequence_no - right.sequence_no);
        const normalizedMessages = sessionMessages.map((message) => ({
          id: message.id,
          role: message.sender_role === 'assistant' ? 'assistant' : message.sender_role,
          text: message.content,
          created_at: message.created_at,
          sequence_no: message.sequence_no,
        }));
        return {
          id: item.id,
          title: resolveSessionTitle(item.title || '', normalizedMessages, item.title || 'Chat'),
          summary: item.summary,
          started_at: item.started_at,
          session_status: item.session_status,
          initial_mood_value: item.initial_mood_value,
          messages: normalizedMessages,
        };
      });
      setSessionList(normalizedSessions);
      const currentActiveSessionId = activeSessionIdRef.current;
      const preservedSession = normalizedSessions.find((item) => item.id === currentActiveSessionId) ?? null;
      if (preservedSession) {
        setActiveSessionId(preservedSession.id);
        setMessages(
          preservedSession.messages.length ? preservedSession.messages : [{ role: 'assistant', text: INITIAL_ASSISTANT_MESSAGE }]
        );
        setChatStatus('Conversation history refreshed.');
      } else {
        setActiveSessionId(null);
        setMessages([{ role: 'assistant', text: INITIAL_ASSISTANT_MESSAGE }]);
        setChatStatus(
          normalizedSessions.length > 0
            ? 'New chat ready. Previous conversations are available in History.'
            : 'No sessions yet. Start a new conversation.'
        );
      }
      setIsSessionLoading(false);
    }
    loadChatSessions();
    return () => {
      ignore = true;
    };
  }, [userId]);

  useEffect(() => {
    let ignore = false;
    async function loadJournals() {
      if (!supabase || !userId) {
        setJournalList([
          {
            id: 'local-journal',
            title: 'Thought record',
            pages: [buildBlankJournalPage(1)],
          },
        ]);
        setActiveJournalId('local-journal');
        setActiveJournalPageId('local-page-1');
        setJournalStatus('Local journal ready.');
        return;
      }
      setIsJournalLoading(true);
      const { data, error } = await supabase
        .from('cbt_journals')
        .select(`
          id,
          title,
          created_at,
          cbt_journal_pages (
            id,
            title,
            page_no,
            content,
            created_at,
            updated_at
          )
        `)
        .order('created_at', { ascending: true })
        .order('page_no', { foreignTable: 'cbt_journal_pages', ascending: true });
      if (ignore) {
        return;
      }
      if (error) {
        setJournalStatus(`Failed to load journals: ${error.message}`);
        setIsJournalLoading(false);
        return;
      }
      const normalized = (data ?? []).map((journal) => ({
        ...journal,
        pages: (journal.cbt_journal_pages ?? [])
          .sort((left, right) => left.page_no - right.page_no)
          .map((page) => ({
            ...page,
            content: {
              situation: page.content?.situation || '',
              thought: page.content?.thought || '',
              emotion: page.content?.emotion || '',
              evidence_for: page.content?.evidence_for || '',
              evidence_against: page.content?.evidence_against || '',
              balanced_thought: page.content?.balanced_thought || '',
            },
          })),
      }));
      if (normalized.length === 0) {
        setJournalList([]);
        setActiveJournalId(null);
        setActiveJournalPageId(null);
        setJournalStatus('Create a journal page to begin.');
        setIsJournalLoading(false);
        return;
      }
      setJournalList(normalized);
      setActiveJournalId(normalized[0].id);
      setActiveJournalPageId(normalized[0].pages[0]?.id ?? null);
      setJournalStatus('Journal loaded from Supabase.');
      setIsJournalLoading(false);
    }
    loadJournals();
    return () => {
      ignore = true;
    };
  }, [userId]);

  const handleAuthChange = (field, value) => {
    setAuthForm((current) => ({ ...current, [field]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    if (!supabase || !hasSupabaseConfig) {
      setAuthStatus('Supabase env vars are missing. Add them before using auth.');
      return;
    }
    setIsAuthSubmitting(true);
    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: authForm.email,
        password: authForm.password,
      });
      setIsAuthSubmitting(false);
      setAuthStatus(error ? error.message : 'Signed in.');
      return;
    }
    const { error } = await supabase.auth.signUp({
      email: authForm.email,
      password: authForm.password,
      options: { data: { display_name: authForm.name } },
    });
    setIsAuthSubmitting(false);
    if (error) {
      setAuthStatus(error.message);
      return;
    }
    setAuthStatus('Account created. Check your email if confirmation is enabled, then sign in.');
    setAuthMode('login');
    setAuthForm((current) => ({ ...current, password: '' }));
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
    setMoodEntries(DEMO_ENTRIES);
    setMoodStatus('Signed out. Sign in to load your mood history.');
    setSessionList([]);
    setActiveSessionId(null);
    setMessages([{ role: 'assistant', text: INITIAL_ASSISTANT_MESSAGE }]);
    setDraft('');
    setJournalList([]);
    setActiveJournalId(null);
    setActiveJournalPageId(null);
  };

  const toggleTag = (tag) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((entry) => entry !== tag) : [...current, tag]
    );
  };

  const openBreathing = () => {
    setIsBreathingOpen(true);
    setBreathRunning(false);
    setBreathPhase(0);
    setBreathTick(0);
    setBreathCycle(1);
    setBreathingFinished(false);
  };

  const closeBreathing = () => {
    setIsBreathingOpen(false);
    setBreathRunning(false);
  };

  const toggleBreathing = () => {
    if (breathingFinished) {
      closeBreathing();
      return;
    }
    setBreathRunning((current) => !current);
  };

  const openGrounding = () => {
    setIsGroundingOpen(true);
    setGroundingStepIndex(0);
    setGroundingInput('');
    setGroundingResponses([]);
    setGroundingFinished(false);
  };

  const closeGrounding = () => {
    setIsGroundingOpen(false);
    setGroundingInput('');
  };

  const advanceGrounding = () => {
    const trimmed = groundingInput.trim();
    if (!trimmed) {
      return;
    }
    const nextResponses = [...groundingResponses, { ...GROUNDING_STEPS[groundingStepIndex], text: trimmed }];
    setGroundingResponses(nextResponses);
    if (groundingStepIndex === GROUNDING_STEPS.length - 1) {
      setGroundingFinished(true);
      setGroundingInput('');
      return;
    }
    setGroundingStepIndex((current) => current + 1);
    setGroundingInput('');
  };

  const updateSessionInState = (sessionId, nextMessages, nextTitle) => {
    setSessionList((current) => {
      const existing = current.find((item) => item.id === sessionId);
      const fallbackTitle = existing?.title || defaultChatTitle;
      const resolvedTitle = resolveSessionTitle(nextTitle || fallbackTitle, nextMessages, fallbackTitle);
      const updated = {
        ...(existing || {
          id: sessionId,
          title: resolvedTitle,
          summary: null,
          started_at: new Date().toISOString(),
          session_status: 'active',
          initial_mood_value: null,
        }),
        title: resolvedTitle,
        messages: nextMessages,
      };
      const withoutCurrent = current.filter((item) => item.id !== sessionId);
      return [updated, ...withoutCurrent];
    });
  };

  const loadSessionMessages = (sessionId) => {
    const selected = sessionList.find((item) => item.id === sessionId);
    setActiveSessionId(sessionId);
    setActivePage('session');
    setMessages(selected?.messages?.length ? selected.messages : [{ role: 'assistant', text: INITIAL_ASSISTANT_MESSAGE }]);
    setDraft('');
    setChatStatus('Loaded stored conversation.');
  };

  const createNewSession = async () => {
    if (!supabase || !userId) {
      setChatStatus('Sign in first to start a session.');
      return null;
    }
    const { data, error } = await supabase
      .from('therapy_sessions')
      .insert({
        user_id: userId,
        title: defaultChatTitle,
        initial_mood_value: null,
      })
      .select('id, title, summary, started_at, session_status, initial_mood_value')
      .single();
    if (error) {
      setChatStatus(`Failed to create session: ${error.message}`);
      return null;
    }
    const nextSession = { ...data, messages: [] };
    setSessionList((current) => [nextSession, ...current]);
    setActiveSessionId(data.id);
    setActivePage('session');
    setMessages([{ role: 'assistant', text: INITIAL_ASSISTANT_MESSAGE }]);
    setDraft('');
    setChatStatus('New session created. Your next message will be stored.');
    return nextSession;
  };

  const deleteSession = async (event, sessionId) => {
    event.stopPropagation();
    const wasActiveSession = activeSessionId === sessionId;

    if (supabase && userId) {
      const { error } = await supabase.from('therapy_sessions').delete().eq('id', sessionId).eq('user_id', userId);
      if (error) {
        setChatStatus(`Failed to delete chat: ${error.message}`);
        return;
      }
    }

    setSessionList((current) => current.filter((item) => item.id !== sessionId));

    if (wasActiveSession) {
      setActiveSessionId(null);
      setMessages([{ role: 'assistant', text: INITIAL_ASSISTANT_MESSAGE }]);
      setDraft('');
    }
  };

  const handleMicInput = () => {
    if (!speechRecognitionSupported) {
      setSpeechStatus('Speech recognition is not supported in this browser.');
      return;
    }

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      return;
    }

    if (!recognitionRef.current) {
      const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionApi();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechStatus('Listening...');
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript || '')
          .join(' ')
          .trim();

        if (!transcript) {
          return;
        }

        setDraft((current) => (current ? `${current} ${transcript}` : transcript));
      };

      recognition.onerror = (event) => {
        setSpeechStatus(event.error === 'not-allowed' ? 'Microphone permission was denied.' : 'Speech capture failed.');
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setSpeechStatus((current) => (current === 'Listening...' ? 'Speech captured.' : current));
      };

      recognitionRef.current = recognition;
    }

    recognitionRef.current.start();
  };

  const sendMessage = async () => {
    const value = draft.trim();
    if (!value || isTyping || !supabase || !userId) {
      return;
    }
    if (!hasGeminiConfig) {
      setChatStatus('Gemini API key is missing. Add REACT_APP_GEMINI_API_KEY to enable replies.');
      return;
    }
    setIsTyping(true);
    setChatStatus('Saving your message...');
    const createdSession = activeSessionId ? null : await createNewSession();
    const currentSessionId = activeSessionId || createdSession?.id;
    if (!currentSessionId) {
      setIsTyping(false);
      return;
    }
    const baseMessages =
      activeSessionId === currentSessionId
        ? messages.filter((message) => message.role === 'user' || message.role === 'assistant')
        : [];
    const userMessage = {
      role: 'user',
      text: value,
      sequence_no: baseMessages.length + 1,
      created_at: new Date().toISOString(),
    };
    const nextMessages = [...baseMessages, userMessage];
    const sessionTitle = resolveSessionTitle(
      activeSession?.title || createdSession?.title || defaultChatTitle,
      nextMessages,
      activeSession?.title || createdSession?.title || defaultChatTitle
    );
    setMessages(nextMessages);
    setDraft('');
    const { error: titleError } = await supabase
      .from('therapy_sessions')
      .update({ title: sessionTitle })
      .eq('id', currentSessionId)
      .eq('user_id', userId);
    if (titleError) {
      setChatStatus(`Session updated, but title save failed: ${titleError.message}`);
    }
    const { error: userMessageError } = await supabase.from('session_messages').insert({
      session_id: currentSessionId,
      user_id: userId,
      sender_role: 'user',
      content: value,
      sequence_no: userMessage.sequence_no,
      metadata: { provider: 'gemini' },
    });
    if (userMessageError) {
      setIsTyping(false);
      setChatStatus(`Failed to save your message: ${userMessageError.message}`);
      return;
    }
    updateSessionInState(currentSessionId, nextMessages, sessionTitle);
    setChatStatus('Generating Gemini reply...');
    try {
      const reply = await generateGeminiReply(nextMessages);
      const assistantMessage = {
        role: 'assistant',
        text: reply.text,
        sequence_no: nextMessages.length + 1,
        created_at: new Date().toISOString(),
      };
      const allMessages = [...nextMessages, assistantMessage];
      setMessages(allMessages);
      const { error: assistantMessageError } = await supabase.from('session_messages').insert({
        session_id: currentSessionId,
        user_id: userId,
        sender_role: 'assistant',
        content: reply.text,
        sequence_no: assistantMessage.sequence_no,
        metadata: { provider: 'gemini', model: reply.model },
      });
      if (assistantMessageError) {
        setChatStatus(`Gemini replied, but save failed: ${assistantMessageError.message}`);
        setIsTyping(false);
        return;
      }
      updateSessionInState(currentSessionId, allMessages, sessionTitle);
      setChatStatus(`Reply generated by ${reply.model} and saved to Supabase.`);
    } catch (error) {
      setChatStatus(error.message || 'Gemini request failed.');
    } finally {
      setIsTyping(false);
    }
  };

  const logMood = async () => {
    if (!supabase || !userId) {
      setMoodStatus('Sign in first to save mood entries to Supabase.');
      return;
    }
    if (!canLogMoodToday) {
      setMoodStatus('You have already logged 3 moods today. Come back tomorrow for the next check-in.');
      return;
    }
    setIsMoodSaving(true);
    const { data: moodEntry, error: moodError } = await supabase
      .from('mood_entries')
      .insert({
        user_id: userId,
        mood_value: trackerMood,
        source: 'manual',
      })
      .select('id, mood_value, created_at')
      .single();
    if (moodError) {
      setIsMoodSaving(false);
      setMoodStatus(`Save failed: ${moodError.message}`);
      return;
    }
    const selectedTagIds = selectedTags.map((label) => tagMap[label]).filter(Boolean);
    if (selectedTagIds.length) {
      const { error: tagError } = await supabase.from('mood_entry_tags').insert(
        selectedTagIds.map((tagId) => ({
          mood_entry_id: moodEntry.id,
          tag_id: tagId,
        }))
      );
      if (tagError) {
        setIsMoodSaving(false);
        setMoodStatus(`Mood saved, but tags failed: ${tagError.message}`);
        return;
      }
    }
    const nextEntries = [{ ...moodEntry, tags: selectedTags }, ...moodEntries];
    setMoodEntries(nextEntries);
    setIsMoodSaving(false);
    const remaining = Math.max(0, 3 - nextEntries.filter((entry) => getLocalDayKey(entry.created_at) === getLocalDayKey(new Date().toISOString())).length);
    setMoodStatus(remaining > 0 ? `Mood entry saved. ${remaining} mood logs left today.` : 'Mood entry saved. You have reached today\'s limit.');
  };

  const openExercise = (exerciseId) => {
    if (exerciseId === 'box') {
      openBreathing();
      return;
    }
    if (exerciseId === 'grounding') {
      openGrounding();
      return;
    }
    setActiveExerciseId(exerciseId);
  };

  const createJournal = async () => {
    const fallbackJournal = {
      id: `local-journal-${Date.now()}`,
      title: `Journal ${journalList.length + 1}`,
      pages: [buildBlankJournalPage(1)],
    };

    if (!supabase || !userId) {
      setJournalList((current) => [...current, fallbackJournal]);
      setActiveJournalId(fallbackJournal.id);
      setActiveJournalPageId(fallbackJournal.pages[0].id);
      setJournalStatus('Local journal created.');
      return fallbackJournal;
    }

    const { data: journal, error: journalError } = await supabase
      .from('cbt_journals')
      .insert({
        user_id: userId,
        title: `Journal ${journalList.length + 1}`,
      })
      .select('id, title')
      .single();
    if (journalError) {
      setJournalStatus(`Failed to create journal: ${journalError.message}`);
      return null;
    }
    const { data: page, error: pageError } = await supabase
      .from('cbt_journal_pages')
      .insert({
        journal_id: journal.id,
        user_id: userId,
        page_no: 1,
        title: 'Page 1',
        content: buildBlankJournalPage(1).content,
      })
      .select('id, page_no, title, content')
      .single();
    if (pageError) {
      setJournalStatus(`Journal created, but first page failed: ${pageError.message}`);
      return null;
    }
    const nextJournal = { ...journal, pages: [page] };
    setJournalList((current) => [...current, nextJournal]);
    setActiveJournalId(nextJournal.id);
    setActiveJournalPageId(page.id);
    setJournalStatus('Journal created.');
    return nextJournal;
  };

  const addJournalPage = async () => {
    let currentJournal = activeJournal;
    if (!currentJournal) {
      currentJournal = await createJournal();
      if (!currentJournal) {
        return;
      }
    }
    const pageNumber = (currentJournal.pages?.length || 0) + 1;
    const blankPage = buildBlankJournalPage(pageNumber);

    if (!supabase || !userId || currentJournal.id.startsWith('local-journal')) {
      const localPage = { ...blankPage, id: `local-page-${Date.now()}` };
      setJournalList((current) =>
        current.map((journal) =>
          journal.id === currentJournal.id ? { ...journal, pages: [...journal.pages, localPage] } : journal
        )
      );
      setActiveJournalId(currentJournal.id);
      setActiveJournalPageId(localPage.id);
      setJournalStatus('Page added.');
      return;
    }

    const { data: page, error } = await supabase
      .from('cbt_journal_pages')
      .insert({
        journal_id: currentJournal.id,
        user_id: userId,
        page_no: pageNumber,
        title: blankPage.title,
        content: blankPage.content,
      })
      .select('id, page_no, title, content')
      .single();
    if (error) {
      setJournalStatus(`Failed to add page: ${error.message}`);
      return;
    }
    setJournalList((current) =>
      current.map((journal) =>
        journal.id === currentJournal.id ? { ...journal, pages: [...journal.pages, page] } : journal
      )
    );
    setActiveJournalId(currentJournal.id);
    setActiveJournalPageId(page.id);
    setJournalStatus('Page added.');
  };

  const updateJournalPage = (field, value) => {
    if (!activeJournal || !activeJournalPage) {
      return;
    }
    setJournalList((current) =>
      current.map((journal) => {
        if (journal.id !== activeJournal.id) {
          return journal;
        }
        return {
          ...journal,
          pages: journal.pages.map((page) => {
            if (page.id !== activeJournalPage.id) {
              return page;
            }
            return {
              ...page,
              content: {
                ...page.content,
                [field]: value,
              },
            };
          }),
        };
      })
    );
  };

  const saveJournalPage = async () => {
    if (!activeJournal || !activeJournalPage) {
      return;
    }
    if (!supabase || !userId || activeJournal.id.startsWith('local-journal')) {
      setJournalStatus('Local journal updated.');
      return;
    }
    setIsJournalSaving(true);
    const { error } = await supabase
      .from('cbt_journal_pages')
      .update({
        title: activeJournalPage.title,
        content: activeJournalPage.content,
      })
      .eq('id', activeJournalPage.id)
      .eq('user_id', userId);
    setIsJournalSaving(false);
    if (error) {
      setJournalStatus(`Failed to save page: ${error.message}`);
      return;
    }
    setJournalStatus('Journal page saved.');
  };

  const phase = BREATH_PHASES[breathPhase];
  const countdown = breathingFinished ? 'Done' : phase.duration - breathTick;
  const progress = breathingFinished ? 1 : (breathTick + (breathRunning ? 1 : 0)) / phase.duration;
  const ringOffset = 439.8 * (1 - progress);
  const currentGroundingStep = GROUNDING_STEPS[groundingStepIndex];

  if (isAuthLoading) {
    return (
      <div className="auth-shell">
        <div className="auth-card auth-card-loading">
          <div className="auth-brand">Serenity</div>
          <p className="auth-status">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-shell">
        <div className="auth-layout">
          <section className="auth-hero">
            <div className="auth-badge">AI-supported mental wellness</div>
            <h1 className="auth-title">Continue with your calm space.</h1>
            <p className="auth-copy">
              Sign in to access your therapy sessions, mood history, and guided exercises backed by
              Supabase authentication.
            </p>
            <div className="auth-points">
              <div>Private account with Supabase Auth</div>
              <div>Mood history tied to your profile</div>
              <div>Stored therapy sessions and chat history</div>
            </div>
          </section>

          <section className="auth-card">
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </button>
            </div>

            <h2 className="auth-form-title">
              {authMode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="auth-form-copy">
              {authMode === 'login'
                ? 'Use your email and password to access the app.'
                : 'Create a Supabase-backed account for this application.'}
            </p>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'signup' && (
                <label className="auth-field">
                  <span>Name</span>
                  <input
                    value={authForm.name}
                    onChange={(event) => handleAuthChange('name', event.target.value)}
                    placeholder="Prerana"
                    disabled={!hasSupabaseConfig || isAuthSubmitting}
                  />
                </label>
              )}

              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) => handleAuthChange('email', event.target.value)}
                  placeholder="name@example.com"
                  disabled={!hasSupabaseConfig || isAuthSubmitting}
                />
              </label>

              <label className="auth-field">
                <span>Password</span>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) => handleAuthChange('password', event.target.value)}
                  placeholder="At least 6 characters"
                  disabled={!hasSupabaseConfig || isAuthSubmitting}
                />
              </label>

              <button className="auth-submit" type="submit" disabled={!hasSupabaseConfig || isAuthSubmitting}>
                {isAuthSubmitting ? 'Working...' : authMode === 'login' ? 'Login' : 'Create account'}
              </button>
            </form>

            <p className="auth-status">{authStatus}</p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="therapy-app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon" aria-hidden="true">
              S
            </div>
            <div>
              <div className="logo-name">Serenity</div>
              <div className="logo-sub">Personal support space</div>
            </div>
          </div>

          <nav className="nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => setActivePage(item.id)}
                type="button"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-foot">
            <button className="sidebar-profile-btn" type="button" onClick={() => setActivePage('profile')}>
              {profileLabel}
            </button>
          </div>
        </aside>

        <main className="main">
          {activePage === 'session' && (
            <section className="page active-page">
              <header className="chat-header">
                <div className="chat-header-copy chat-header-copy-simple">
                  <div className="chat-header-text">
                    <h1 className="page-title">{CHAT_HEADER_PROMPT}</h1>
                    <div className="chat-title-label">{displayedChatTitle}</div>
                  </div>
                </div>
                <div className="header-actions">
                  <button className="btn-sm" type="button" onClick={() => createNewSession()}>
                    <PlusIcon />
                    <span>New chat</span>
                  </button>
                </div>
              </header>

              <div className="messages" ref={messagesRef}>
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${message.sequence_no || index}`}
                    className={`msg-row ${message.role === 'user' ? 'user' : 'ai'}`}
                  >
                    {message.role !== 'user' && <div className="ai-avatar">S</div>}
                    <div className={`bubble ${message.role === 'user' ? 'user' : 'ai'}`}>{message.text}</div>
                  </div>
                ))}

                {isTyping && (
                  <div className="msg-row ai">
                    <div className="ai-avatar">S</div>
                    <div className="typing">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                  </div>
                )}
              </div>

              <div className="input-area">
                <div className="input-row">
                  <button
                    className={`mic-btn ${isListening ? 'active' : ''}`}
                    type="button"
                    aria-label="Voice message"
                    onClick={handleMicInput}
                    disabled={isSessionLoading || isTyping}
                  >
                    <MicIcon />
                  </button>
                  <input
                    className="input-box"
                    placeholder="Share what's on your mind..."
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    disabled={isSessionLoading || isTyping}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        sendMessage();
                      }
                    }}
                  />
                  <button
                    className="send-btn"
                    type="button"
                    onClick={sendMessage}
                    disabled={isTyping || isSessionLoading}
                    aria-label="Send message"
                  >
                    <SendIcon />
                  </button>
                </div>
                <p className="status-note speech-status">{speechStatus}</p>
              </div>
            </section>
          )}

          {activePage === 'mood' && (
            <section className="page active-page">
              <header className="page-header">
                <div>
                  <h1 className="page-title">Mood Tracker</h1>
                  <p className="page-sub">Track patterns over time</p>
                </div>
              </header>

              <div className="mood-page-content">
                <div className="mood-grid">
                  <div className="card">
                    <div className="card-title">Log today&apos;s mood</div>
                    <div className="mood-row mood-row-tracker">
                      {MOODS.map((mood) => (
                        <button
                          key={mood.value}
                          className={`mood-btn ${trackerMood === mood.value ? 'selected' : ''}`}
                          onClick={() => setTrackerMood(mood.value)}
                          type="button"
                        >
                          {mood.badge}
                          <span>{mood.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="card-title secondary-title">What&apos;s contributing?</div>
                    <div className="tag-row">
                      {TAGS.map((tag) => (
                        <button
                          key={tag}
                          className={`tag ${selectedTags.includes(tag) ? 'selected' : ''}`}
                          onClick={() => toggleTag(tag)}
                          type="button"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>

                    <button className="primary-btn" type="button" onClick={logMood} disabled={isMoodSaving || !canLogMoodToday}>
                      {isMoodSaving ? 'Saving...' : canLogMoodToday ? 'Save Mood' : 'Daily limit reached'}
                    </button>
                    <p className="status-note">{moodStatus}</p>
                  </div>

                  <div className="stats-column">
                    <div className="stat-card">
                      <div className="stat-kicker">Average</div>
                      <div className="stat-average">
                        <span className="stat-emoji">{averageMood.badge}</span>
                        <div>
                          <div className="stat-val">{moodAverage ? moodAverage.toFixed(1) : '0.0'}</div>
                          <div className="stat-lbl">{averageMood.label}</div>
                        </div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-kicker">Today</div>
                      <div className="stat-val">{todayMoodCount}/3</div>
                      <div className="stat-lbl">mood logs used</div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">Mood over time, last 14 days</div>
                  <div className="chart-bars">
                    {recentMoodEntries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={`bar ${index === recentMoodEntries.length - 1 ? 'today' : ''}`}
                        style={{ height: `${Math.round((Number(entry.mood_value) / 5) * 100)}%` }}
                        title={entry.tags.join(', ') || 'No tags'}
                      />
                    ))}
                  </div>
                  <div className="chart-labels">
                    <span>14 days ago</span>
                    <span>Today</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activePage === 'history' && (
            <section className="page active-page">
              <header className="page-header">
                <div>
                  <h1 className="page-title">Session History</h1>
                  <p className="page-sub">Stored Gemini conversations from Supabase</p>
                </div>
              </header>

              <div className="history-content">
                {sessionList.length === 0 && (
                  <div className="card">
                    <div className="card-title">No sessions yet</div>
                    <p className="status-note">Start a conversation in the Session tab to create your first stored chat.</p>
                  </div>
                )}

                {sessionList.map((item) => {
                  const sessionMeta = `${new Date(item.started_at).toLocaleString()} | ${item.messages.length} messages`;

                  return (
                    <article key={item.id} className={`session-card ${activeSessionId === item.id ? 'active' : ''}`}>
                      <button className="session-open" type="button" onClick={() => loadSessionMessages(item.id)}>
                        <div className="session-row">
                          <div className="session-icon">S</div>
                          <div className="session-copy">
                            <div className="session-title">{item.title}</div>
                            <div className="session-meta">{sessionMeta}</div>
                          </div>
                        </div>
                      </button>
                      <button
                        className="session-delete"
                        type="button"
                        aria-label={`Delete ${item.title}`}
                        onClick={(event) => deleteSession(event, item.id)}
                      >
                        <TrashIcon />
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {activePage === 'exercises' && (
            <section className="page active-page">
              <header className="page-header">
                <div>
                  <h1 className="page-title">Guided Exercises</h1>
                  <p className="page-sub">Evidence-based tools for anxiety and stress</p>
                </div>
                {activeExerciseId === 'thought' && (
                  <button className="btn-sm" type="button" onClick={() => setActiveExerciseId(null)}>
                    Back
                  </button>
                )}
              </header>

              <div className="exercises-content">
                {activeExerciseId !== 'thought' && (
                  <div className="ex-grid">
                    {EXERCISES.map((exercise) => (
                      <button
                        key={exercise.id}
                        className="ex-card"
                        type="button"
                        onClick={() => openExercise(exercise.id)}
                      >
                        <div className={`ex-icon ${exercise.accent}`}>{exercise.icon}</div>
                        <div className="ex-title">{exercise.title}</div>
                        <div className={`ex-sub ${exercise.accent}`}>{exercise.subtitle}</div>
                        <div className="ex-desc">Structured technique for stress regulation and emotional reset.</div>
                        <div className={`ex-link ${exercise.accent}`}>Start exercise -&gt;</div>
                      </button>
                    ))}
                  </div>
                )}

                {activeExerciseId === 'thought' && (
                  <div className="journal-app">
                    <aside className="journal-sidebar">
                      <div className="journal-sidebar-top">
                        <button className="journal-tab active" type="button">Pages</button>
                      </div>
                      <div className="journal-pages">
                        {activeJournal?.pages?.map((page) => (
                          <button
                            key={page.id}
                            type="button"
                            className={`journal-page-tile ${activeJournalPageId === page.id ? 'active' : ''}`}
                            onClick={() => {
                              setActiveJournalId(activeJournal.id);
                              setActiveJournalPageId(page.id);
                            }}
                          >
                            <div className="journal-page-preview">
                              <div className="journal-page-preview-header">
                                <span className="journal-page-preview-title">{page.title || `Page ${page.page_no}`}</span>
                                <span className="journal-page-preview-number">{page.page_no}</span>
                              </div>
                              <div className="journal-page-preview-body">
                                <div className="journal-page-preview-lines" aria-hidden="true" />
                                <p>{getJournalPreviewText(page.content)}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                        <button className="journal-add-page" type="button" onClick={addJournalPage}>
                          <PlusIcon />
                          <span>Add a Page</span>
                        </button>
                      </div>
                    </aside>

                    <section className="journal-paper-shell">
                      <div className="journal-toolbar">
                        <div>
                          <div className="page-title">CBT Journal</div>
                          <p className="page-sub">{journalStatus}</p>
                        </div>
                        <div className="journal-actions">
                          <button className="btn-sm" type="button" onClick={createJournal}>
                            <PlusIcon />
                            <span>New journal</span>
                          </button>
                          <button className="btn-sm" type="button" onClick={saveJournalPage} disabled={isJournalSaving || !activeJournalPage}>
                            <span>{isJournalSaving ? 'Saving...' : 'Save page'}</span>
                          </button>
                        </div>
                      </div>

                      {isJournalLoading && <p className="status-note">Loading journal...</p>}

                      {activeJournalPage && (
                        <div className="journal-paper">
                          <div className="journal-paper-inner">
                            <div className="journal-meta-row">
                              <div className="journal-meta-cell">Journal: {activeJournal?.title || 'Thought record'}</div>
                              <div className="journal-meta-cell">Page {activeJournalPage.page_no}</div>
                            </div>
                            <div className="journal-fields">
                              {CBT_FIELDS.map((field) => (
                                <label key={field.key} className="journal-row">
                                  <span>{field.label}</span>
                                  <textarea
                                    value={activeJournalPage.content?.[field.key] || ''}
                                    onChange={(event) => updateJournalPage(field.key, event.target.value)}
                                    placeholder={`Write ${field.label.toLowerCase()}...`}
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </section>
          )}

          {activePage === 'profile' && (
            <section className="page active-page">
              <header className="page-header">
                <div>
                  <h1 className="page-title">Your Profile</h1>
                  <p className="page-sub">Manage your account details</p>
                </div>
              </header>

              <div className="profile-content">
                <div className="card">
                  <div className="profile-field">
                    <label>Name</label>
                    <input 
                      value={editName || profileLabel} 
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter display name"
                    />
                    <button 
                      className="primary-btn" 
                      type="button"
                      onClick={async () => {
                        if (supabase && editName?.trim()) {
                          const { data, error } = await supabase.auth.updateUser({ 
                            data: { display_name: editName.trim() } 
                          });
                          if (!error && data.user) {
                            setSession({ 
                              ...session, 
                              user: { 
                                ...session.user, 
                                user_metadata: { 
                                  ...session.user.user_metadata, 
                                  display_name: data.user.user_metadata.display_name 
                                } 
                              } 
                            });
                            setEditName('');
                          } else {
                            alert(error?.message || 'Update failed');
                          }
                        }
                      }}
                      disabled={!editName?.trim()}
                    >
                      Save Name
                    </button>
                  </div>
                  <div className="profile-field">
                    <label>Email</label>
                    <p>{session?.user?.email || 'N/A'}</p>
                  </div>
                  <div className="profile-field">
                    <label>Member since</label>
                    <p>{session?.user?.created_at ? new Date(session.user.created_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div style={{marginTop: '24px'}}>
                    <button className="primary-btn" type="button" onClick={handleSignOut}>
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>

        {isBreathingOpen && (
          <div className="modal-bg" onClick={closeBreathing} role="presentation">
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <button className="close-btn" type="button" onClick={closeBreathing} aria-label="Close">
                X
              </button>
              <div className="modal-title">Box Breathing</div>
              <div className="modal-sub">Calm your nervous system</div>
              <div className="breath-ring">
                <svg width="160" height="160" className="ring-svg" aria-hidden="true">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="var(--border-muted)" strokeWidth="5" />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="var(--sidebar-accent-strong)"
                    strokeWidth="5"
                    strokeDasharray="439.8"
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    className="ring-progress"
                  />
                </svg>
                <div className="breath-inner">
                  <div className="breath-phase">{breathingFinished ? 'Done' : phase.label}</div>
                  <div className="breath-count">{countdown}</div>
                </div>
              </div>
              <div className="breath-inst">{breathingFinished ? 'Great job. Notice how you feel.' : phase.instruction}</div>
              <div className="cycle-label">Cycle {breathCycle} of 4</div>
              <button className="start-btn" type="button" onClick={toggleBreathing}>
                {breathingFinished ? 'Close' : breathRunning ? 'Pause' : breathTick > 0 ? 'Resume' : 'Begin'}
              </button>
            </div>
          </div>
        )}

        {isGroundingOpen && (
          <div className="modal-bg" onClick={closeGrounding} role="presentation">
            <div className="modal modal-wide" onClick={(event) => event.stopPropagation()}>
              <button className="close-btn" type="button" onClick={closeGrounding} aria-label="Close">
                X
              </button>
              <div className="modal-title">Anchor Exercise</div>
              <div className="modal-sub">5-4-3-2-1 grounding</div>

              {!groundingFinished && (
                <>
                  <div className="grounding-step">{currentGroundingStep.count} things you can {currentGroundingStep.label}</div>
                  <p className="grounding-copy">{currentGroundingStep.prompt}</p>
                  <textarea
                    className="grounding-input"
                    value={groundingInput}
                    onChange={(event) => setGroundingInput(event.target.value)}
                    placeholder="Write what you notice..."
                  />
                  <button className="start-btn" type="button" onClick={advanceGrounding}>
                    {groundingStepIndex === GROUNDING_STEPS.length - 1 ? 'Finish' : 'Next'}
                  </button>
                </>
              )}

              {groundingFinished && (
                <div className="grounding-summary">
                  <p className="grounding-copy">You finished the anchor exercise. Read back what kept you grounded.</p>
                  {groundingResponses.map((entry) => (
                    <div key={entry.label} className="grounding-summary-row">
                      <strong>{entry.count} {entry.label}</strong>
                      <span>{entry.text}</span>
                    </div>
                  ))}
                  <button className="start-btn" type="button" onClick={closeGrounding}>
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

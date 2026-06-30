/**
 * app.js — English Teacher AI v2.0
 * Gère : conversations multiples, historique local, thèmes guidés,
 * mode sombre/clair, suivi de progression, interface mobile.
 */

// ─────────────────────────────────────────────────────────
//  STORAGE KEYS & STATE
// ─────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  conversations: "eta_conversations",   // liste de toutes les conversations
  activeId:      "eta_active_id",
  theme:         "eta_theme",
  stats:         "eta_stats",
  lastVisit:     "eta_last_visit",
  streak:        "eta_streak",
};

const TOPIC_PROMPTS = {
  free:      null,
  travel:    "Let's practice English for travel! Imagine I'm at an airport or hotel. Start by greeting me as if I just arrived.",
  business:  "Let's practice business English! Imagine we're starting a work meeting. Begin the conversation professionally.",
  interview: "Let's practice for a job interview! Act as my interviewer and ask me the first question.",
  restaurant:"Let's practice ordering at a restaurant! Act as a waiter and greet me at my table.",
  smalltalk: "Let's practice casual small talk in English! Start a friendly conversation, like at a party.",
  grammar:   "I'd like to focus on grammar today. Please ask me about a grammar topic I should practice, or give me a quick exercise.",
};

let state = {
  conversations: [],     // [{id, title, messages: [{role, content}], topic, createdAt}]
  activeId: null,
  isLoading: false,
};

// ─────────────────────────────────────────────────────────
//  INITIALISATION
// ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadConversations();
  bindEvents();
  updateStreak();
  renderConversationList();

  if (state.conversations.length === 0) {
    createNewConversation();
  } else {
    const lastId = localStorage.getItem(STORAGE_KEYS.activeId);
    const exists = state.conversations.find(c => c.id === lastId);
    setActiveConversation(exists ? lastId : state.conversations[0].id);
  }

  refreshProgressPanel();
  document.getElementById("userInput").focus();
});

// ─────────────────────────────────────────────────────────
//  THEME (dark / light)
// ─────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
}

// ─────────────────────────────────────────────────────────
//  EVENT BINDINGS
// ─────────────────────────────────────────────────────────
function bindEvents() {
  document.getElementById("sendBtn").addEventListener("click", sendMessage);
  document.getElementById("userInput").addEventListener("keydown", handleKeydown);
  document.getElementById("userInput").addEventListener("input", e => autoResize(e.target));

  document.getElementById("newConvBtn").addEventListener("click", () => {
    createNewConversation();
    closeSidebarMobile();
  });

  document.getElementById("menuBtn").addEventListener("click", openSidebarMobile);
  document.getElementById("sidebarClose").addEventListener("click", closeSidebarMobile);
  document.getElementById("sidebarBackdrop").addEventListener("click", closeSidebarMobile);

  document.getElementById("themeSwitch").addEventListener("click", toggleTheme);

  document.getElementById("progressBtn").addEventListener("click", openProgressPanel);
  document.getElementById("progressClose").addEventListener("click", closeProgressPanel);
  document.getElementById("progressOverlay").addEventListener("click", closeProgressPanel);

  document.querySelectorAll(".topic-chip").forEach(chip => {
    chip.addEventListener("click", () => selectTopic(chip.dataset.topic, chip));
  });
}

// ─────────────────────────────────────────────────────────
//  MOBILE SIDEBAR
// ─────────────────────────────────────────────────────────
function openSidebarMobile() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sidebarBackdrop").classList.add("open");
}
function closeSidebarMobile() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarBackdrop").classList.remove("open");
}

// ─────────────────────────────────────────────────────────
//  PROGRESS PANEL
// ─────────────────────────────────────────────────────────
function openProgressPanel() {
  refreshProgressPanel();
  document.getElementById("progressPanel").classList.add("open");
  document.getElementById("progressOverlay").classList.add("open");
}
function closeProgressPanel() {
  document.getElementById("progressPanel").classList.remove("open");
  document.getElementById("progressOverlay").classList.remove("open");
}

function refreshProgressPanel() {
  const stats = getStats();
  document.getElementById("statMessages").textContent = stats.totalMessages;
  document.getElementById("statCorrections").textContent = stats.totalCorrections;
  document.getElementById("statConversations").textContent = state.conversations.length;
  document.getElementById("statStreak").textContent = getStreak().count;

  // Niveau estimé (heuristique simple basée sur le nombre de messages)
  const level = Math.min(100, stats.totalMessages * 2);
  document.getElementById("levelBarFill").style.width = level + "%";
  let levelLabel = "Beginner — keep practicing!";
  if (stats.totalMessages > 40) levelLabel = "Advanced — you're doing great!";
  else if (stats.totalMessages > 15) levelLabel = "Intermediate — solid progress!";
  document.getElementById("levelLabel").textContent = levelLabel;

  // Liste des dernières corrections
  const mistakeList = document.getElementById("mistakeList");
  if (stats.recentCorrections.length === 0) {
    mistakeList.innerHTML = `<p class="mistake-empty">Your corrections will appear here as you chat with Alex.</p>`;
  } else {
    mistakeList.innerHTML = stats.recentCorrections
      .slice(-5).reverse()
      .map(c => `<div class="mistake-item">${escapeHtml(c)}</div>`)
      .join("");
  }
}

function getStats() {
  const raw = localStorage.getItem(STORAGE_KEYS.stats);
  return raw ? JSON.parse(raw) : { totalMessages: 0, totalCorrections: 0, recentCorrections: [] };
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
}

function recordUserMessage() {
  const stats = getStats();
  stats.totalMessages += 1;
  saveStats(stats);
}

function recordCorrections(text) {
  const matches = text.match(/✏️[^\n]+/g);
  if (!matches) return;
  const stats = getStats();
  stats.totalCorrections += matches.length;
  stats.recentCorrections.push(...matches);
  if (stats.recentCorrections.length > 30) {
    stats.recentCorrections = stats.recentCorrections.slice(-30);
  }
  saveStats(stats);
}

// ─────────────────────────────────────────────────────────
//  STREAK (jours consécutifs)
// ─────────────────────────────────────────────────────────
function getStreak() {
  const raw = localStorage.getItem(STORAGE_KEYS.streak);
  return raw ? JSON.parse(raw) : { count: 0, lastDate: null };
}

function updateStreak() {
  const streak = getStreak();
  const today = new Date().toDateString();

  if (streak.lastDate === today) {
    // déjà compté aujourd'hui
  } else {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (streak.lastDate === yesterday) {
      streak.count += 1;
    } else if (streak.lastDate !== today) {
      streak.count = 1;
    }
    streak.lastDate = today;
    localStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(streak));
  }

  document.getElementById("streakNum").textContent = `${streak.count} day${streak.count !== 1 ? "s" : ""} streak`;
  document.getElementById("streakLabel").textContent = streak.count > 0 ? "Keep it up! 🎉" : "Practice today!";
}

// ─────────────────────────────────────────────────────────
//  CONVERSATIONS — gestion multi-historique
// ─────────────────────────────────────────────────────────
function loadConversations() {
  const raw = localStorage.getItem(STORAGE_KEYS.conversations);
  state.conversations = raw ? JSON.parse(raw) : [];
}

function persistConversations() {
  localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(state.conversations));
}

function createNewConversation(topic = "free") {
  const conv = {
    id: "conv_" + Date.now(),
    title: "New conversation",
    messages: [],
    topic,
    createdAt: Date.now(),
  };
  state.conversations.unshift(conv);
  persistConversations();
  renderConversationList();
  setActiveConversation(conv.id);

  // Message de bienvenue
  const welcomeText = topic === "free"
    ? "Hello! I'm **Alex**, your personal English teacher. 👋\n\nFeel free to write to me in English or French, and I'll gently correct any mistakes and explain why.\n\n*Ready to start? Just say hello! 😊*"
    : "Great choice! Let's dive into this scenario. 🎬";
  appendMessageToDOM("assistant", welcomeText);
  conv.messages.push({ role: "assistant", content: welcomeText });
  persistConversations();

  // Si un thème spécifique est choisi, on lance la conversation automatiquement
  if (topic !== "free" && TOPIC_PROMPTS[topic]) {
    sendHiddenSystemKickoff(TOPIC_PROMPTS[topic]);
  }
}

function setActiveConversation(id) {
  state.activeId = id;
  localStorage.setItem(STORAGE_KEYS.activeId, id);
  renderConversationList();
  renderMessages();
  syncTopicChip();
}

function getActiveConversation() {
  return state.conversations.find(c => c.id === state.activeId);
}

function deleteConversation(id, event) {
  event.stopPropagation();
  state.conversations = state.conversations.filter(c => c.id !== id);
  persistConversations();
  renderConversationList();

  if (state.activeId === id) {
    if (state.conversations.length > 0) {
      setActiveConversation(state.conversations[0].id);
    } else {
      createNewConversation();
    }
  }
}

function renderConversationList() {
  const list = document.getElementById("conversationList");
  if (state.conversations.length === 0) {
    list.innerHTML = `<p class="conversation-empty">No conversations yet.<br>Start chatting with Alex!</p>`;
    return;
  }

  const topicIcons = { free: "💬", travel: "✈️", business: "💼", interview: "🎤", restaurant: "🍽️", smalltalk: "☕", grammar: "📚" };

  list.innerHTML = state.conversations.map(conv => `
    <div class="conversation-item ${conv.id === state.activeId ? "active" : ""}" data-id="${conv.id}">
      <span class="conversation-item-icon">${topicIcons[conv.topic] || "💬"}</span>
      <span class="conversation-item-text">${escapeHtml(conv.title)}</span>
      <button class="conversation-item-delete" data-id="${conv.id}" aria-label="Delete conversation">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>
      </button>
    </div>
  `).join("");

  list.querySelectorAll(".conversation-item").forEach(item => {
    item.addEventListener("click", () => {
      setActiveConversation(item.dataset.id);
      closeSidebarMobile();
    });
  });
  list.querySelectorAll(".conversation-item-delete").forEach(btn => {
    btn.addEventListener("click", e => deleteConversation(btn.dataset.id, e));
  });
}

function updateConversationTitle(conv, firstUserMessage) {
  if (conv.title !== "New conversation") return;
  conv.title = firstUserMessage.length > 38
    ? firstUserMessage.slice(0, 38) + "…"
    : firstUserMessage;
  persistConversations();
  renderConversationList();
}

// ─────────────────────────────────────────────────────────
//  TOPICS (thèmes guidés)
// ─────────────────────────────────────────────────────────
function selectTopic(topic, chipEl) {
  document.querySelectorAll(".topic-chip").forEach(c => c.classList.remove("active"));
  chipEl.classList.add("active");
  createNewConversation(topic);
}

function syncTopicChip() {
  const conv = getActiveConversation();
  if (!conv) return;
  document.querySelectorAll(".topic-chip").forEach(c => {
    c.classList.toggle("active", c.dataset.topic === conv.topic);
  });
}

// ─────────────────────────────────────────────────────────
//  ENVOI DE MESSAGE
// ─────────────────────────────────────────────────────────
function handleKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

async function sendMessage() {
  if (state.isLoading) return;
  const input = document.getElementById("userInput");
  const text = input.value.trim();
  if (!text) return;

  const conv = getActiveConversation();
  if (!conv) return;

  appendMessageToDOM("user", text);
  conv.messages.push({ role: "user", content: text });
  updateConversationTitle(conv, text);
  persistConversations();
  recordUserMessage();

  input.value = "";
  autoResize(input);

  await requestAIResponse(conv);
}

/** Lance un premier message "système" invisible pour démarrer un scénario thématique */
async function sendHiddenSystemKickoff(promptText) {
  const conv = getActiveConversation();
  if (!conv) return;
  conv.messages.push({ role: "user", content: promptText });
  persistConversations();
  await requestAIResponse(conv, /* hideUserBubble */ true);
}

async function requestAIResponse(conv, hideUserBubble = false) {
  setLoading(true);
  const typingId = showTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conv.messages }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Server error");
    }

    const data = await response.json();
    removeTyping(typingId);

    appendMessageToDOM("assistant", data.reply);
    conv.messages.push({ role: "assistant", content: data.reply });
    persistConversations();
    recordCorrections(data.reply);

  } catch (error) {
    removeTyping(typingId);
    appendMessageToDOM("assistant", `⚠️ **Error:** ${error.message}. Please check your connection and try again.`);
  } finally {
    setLoading(false);
  }
}

// ─────────────────────────────────────────────────────────
//  RENDU DES MESSAGES
// ─────────────────────────────────────────────────────────
function renderMessages() {
  const conv = getActiveConversation();
  const container = document.getElementById("messages");
  container.innerHTML = "";
  if (!conv) return;
  conv.messages.forEach(m => appendMessageToDOM(m.role, m.content, false));
  scrollToBottom();
}

function appendMessageToDOM(role, content, scroll = true) {
  const container = document.getElementById("messages");

  const wrapper = document.createElement("div");
  wrapper.classList.add("message", role === "user" ? "message-user" : "message-assistant");

  const avatar = document.createElement("div");
  avatar.classList.add("msg-avatar");
  avatar.textContent = role === "user" ? "U" : "A";

  const col = document.createElement("div");
  col.classList.add("msg-col");

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.innerHTML = formatMessage(content);

  const time = document.createElement("span");
  time.classList.add("msg-time");
  time.textContent = currentTime();

  col.appendChild(bubble);
  col.appendChild(time);
  wrapper.appendChild(avatar);
  wrapper.appendChild(col);
  container.appendChild(wrapper);

  if (scroll) scrollToBottom();
}

function formatMessage(text) {
  let safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  safe = safe.replace(/(✏️[^\n]+)/g, '<div class="correction">$1</div>');
  safe = safe.replace(/(👍[^\n]+|✅[^\n]+|🎉[^\n]+)/g, '<div class="encouragement">$1</div>');
  safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");

  const paragraphs = safe.split(/\n\n+/).filter(p => p.trim());
  if (paragraphs.length > 1) {
    return paragraphs.map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  }
  return safe.replace(/\n/g, "<br>");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ─────────────────────────────────────────────────────────
//  TYPING INDICATOR
// ─────────────────────────────────────────────────────────
function showTyping() {
  const container = document.getElementById("messages");
  const id = "typing-" + Date.now();

  const wrapper = document.createElement("div");
  wrapper.classList.add("message", "message-assistant");
  wrapper.id = id;

  const avatar = document.createElement("div");
  avatar.classList.add("msg-avatar");
  avatar.textContent = "A";

  const col = document.createElement("div");
  col.classList.add("msg-col");
  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.innerHTML = `<div class="typing"><span></span><span></span><span></span></div>`;
  col.appendChild(bubble);

  wrapper.appendChild(avatar);
  wrapper.appendChild(col);
  container.appendChild(wrapper);
  scrollToBottom();
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ─────────────────────────────────────────────────────────
//  UTILITAIRES
// ─────────────────────────────────────────────────────────
function setLoading(loadingState) {
  state.isLoading = loadingState;
  document.getElementById("sendBtn").disabled = loadingState;
  document.getElementById("userInput").disabled = loadingState;
}

function scrollToBottom() {
  const container = document.getElementById("messages");
  container.scrollTop = container.scrollHeight;
}

function currentTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 130) + "px";
}

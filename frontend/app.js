/**
 * app.js — Logique frontend du chatbot English Teacher AI
 * Gère l'envoi de messages, l'affichage des réponses, l'historique de conversation.
 */

// ── État de la conversation ────────────────────────────────────
let conversationHistory = [];
let isLoading = false;

// ── Initialisation ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadModelInfo();
  document.getElementById("userInput").focus();
});

/** Charge et affiche le modèle IA utilisé */
async function loadModelInfo() {
  try {
    const res = await fetch("/api/model");
    const data = await res.json();
    document.getElementById("modelName").textContent = data.model;
  } catch {
    document.getElementById("modelName").textContent = "Unavailable";
  }
}

// ── Envoi de message ───────────────────────────────────────────

/** Gère la touche Entrée (envoie) vs Shift+Entrée (nouvelle ligne) */
function handleKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

/** Envoie le message utilisateur à l'API et affiche la réponse */
async function sendMessage() {
  if (isLoading) return;

  const input = document.getElementById("userInput");
  const text = input.value.trim();
  if (!text) return;

  // Affiche le message utilisateur
  appendMessage("user", text);
  conversationHistory.push({ role: "user", content: text });

  // Réinitialise l'input
  input.value = "";
  autoResize(input);

  // État de chargement
  setLoading(true);
  const typingId = showTypingIndicator();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversationHistory }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Server error");
    }

    const data = await response.json();
    removeTypingIndicator(typingId);

    // Affiche la réponse de l'IA
    appendMessage("assistant", data.reply);
    conversationHistory.push({ role: "assistant", content: data.reply });

    // Mise à jour du niveau détecté (heuristique simple)
    updateLevelBadge();

  } catch (error) {
    removeTypingIndicator(typingId);
    appendMessage("assistant", `⚠️ **Error:** ${error.message}. Please check your API key and try again.`);
  } finally {
    setLoading(false);
  }
}

// ── Affichage des messages ──────────────────────────────────────

/**
 * Ajoute un message dans la zone de chat.
 * @param {"user"|"assistant"} role
 * @param {string} content
 */
function appendMessage(role, content) {
  const messagesEl = document.getElementById("messages");

  const wrapper = document.createElement("div");
  wrapper.classList.add("message", role === "user" ? "message-user" : "message-assistant");

  const avatarEl = document.createElement("div");
  avatarEl.classList.add("message-avatar");
  avatarEl.textContent = role === "user" ? "U" : "A";

  const bodyEl = document.createElement("div");
  bodyEl.classList.add("message-body");

  const bubbleEl = document.createElement("div");
  bubbleEl.classList.add("message-bubble");
  bubbleEl.innerHTML = formatMessage(content);

  const timeEl = document.createElement("span");
  timeEl.classList.add("message-time");
  timeEl.textContent = currentTime();

  bodyEl.appendChild(bubbleEl);
  bodyEl.appendChild(timeEl);
  wrapper.appendChild(avatarEl);
  wrapper.appendChild(bodyEl);
  messagesEl.appendChild(wrapper);

  scrollToBottom();
}

/**
 * Formate le texte brut en HTML lisible.
 * Gère le markdown basique : **gras**, *italique*, corrections ✏️
 */
function formatMessage(text) {
  // Échappe le HTML
  let safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Corrections (lignes commençant par ✏️)
  safe = safe.replace(/(✏️[^\n]+)/g, '<div class="correction">$1</div>');

  // Gras **texte**
  safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italique *texte*
  safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Sauts de ligne → paragraphes
  const paragraphs = safe.split(/\n\n+/).filter(p => p.trim());
  if (paragraphs.length > 1) {
    return paragraphs.map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  }

  return safe.replace(/\n/g, "<br>");
}

// ── Indicateur de chargement ────────────────────────────────────

function showTypingIndicator() {
  const messagesEl = document.getElementById("messages");
  const id = "typing-" + Date.now();

  const wrapper = document.createElement("div");
  wrapper.classList.add("message", "message-assistant");
  wrapper.id = id;

  const avatarEl = document.createElement("div");
  avatarEl.classList.add("message-avatar");
  avatarEl.textContent = "A";

  const bodyEl = document.createElement("div");
  bodyEl.classList.add("message-body");

  const bubbleEl = document.createElement("div");
  bubbleEl.classList.add("message-bubble");
  bubbleEl.innerHTML = `
    <div class="typing-indicator">
      <span></span><span></span><span></span>
    </div>`;

  bodyEl.appendChild(bubbleEl);
  wrapper.appendChild(avatarEl);
  wrapper.appendChild(bodyEl);
  messagesEl.appendChild(wrapper);
  scrollToBottom();

  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ── Utilitaires ─────────────────────────────────────────────────

function setLoading(state) {
  isLoading = state;
  const btn = document.getElementById("sendBtn");
  const input = document.getElementById("userInput");
  btn.disabled = state;
  input.disabled = state;
}

function scrollToBottom() {
  const messagesEl = document.getElementById("messages");
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function currentTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Adapte la hauteur du textarea au contenu */
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 140) + "px";
}

/** Remet à zéro la conversation */
function newConversation() {
  conversationHistory = [];
  const messagesEl = document.getElementById("messages");
  messagesEl.innerHTML = "";
  appendMessage("assistant", "New conversation started! 🎉 What would you like to practice today?");
  document.getElementById("levelBadge").textContent = "📊 Detecting your level…";
  document.getElementById("userInput").focus();
}

/** Met à jour le badge de niveau (heuristique basée sur le nombre d'échanges) */
function updateLevelBadge() {
  const turns = conversationHistory.filter(m => m.role === "user").length;
  const badge = document.getElementById("levelBadge");
  if (turns < 3) badge.textContent = "📊 Detecting your level…";
  else if (turns < 8) badge.textContent = "🌱 Beginner / Intermediate";
  else badge.textContent = "🚀 Keep it up!";
}

(function () {
  const ADMIN_WHATSAPP = "19059292625";
  const ADMIN_PHONE_DISPLAY = "+1 905 929 2625";

  const copy = {
    en: {
      launcher: "Chat with us",
      title: "ZentraLab Assistant",
      subtitle: "Usually replies instantly",
      placeholder: "Type your message...",
      send: "Send",
      greeting:
        "Hi! 👋 I'm the ZentraLab assistant. We offer modern AI-powered IT services — faster and more cost-effective for small businesses.\n\nWhat would you like help with?",
      askName: "Great. What's your name?",
      askBusiness: "Thanks, {name}! What's your business name?",
      askPhone: "Got it. What's the best phone number to reach you? (or type skip)",
      askDetails: "Tell me a bit more about what you need — for example POS issues, Wi-Fi, email setup, or a new location.",
      summary:
        "Perfect. Here's what I have:\n\n• Name: {name}\n• Business: {business}\n• Need: {need}\n• Topic: {topic}\n• Phone: {phone}\n\nI can send this to our team on WhatsApp so they can reply to you directly.",
      sendWhatsApp: "Send to WhatsApp",
      startOver: "Start over",
      directWhatsApp: "Chat on WhatsApp now",
      callUs: "Call us",
      thanks:
        "Opening WhatsApp with your message… If it doesn't open, message us at " +
        ADMIN_PHONE_DISPLAY +
        ".",
      skipped: "Not provided",
      topics: {
        managed: "Managed IT support",
        network: "Network / Wi-Fi",
        pos: "POS / Restaurant tech",
        cloud: "Cloud & Email",
        security: "Cybersecurity",
        quote: "Get a quote",
        other: "Something else"
      }
    },
    ta: {
      launcher: "எங்களுடன் அரட்டை",
      title: "ZentraLab Assistant",
      subtitle: "பொதுவாக உடனே பதில்",
      placeholder: "உங்கள் செய்தியை எழுதுங்கள்...",
      send: "அனுப்பு",
      greeting:
        "வணக்கம்! 👋 நான் ZentraLab assistant. நவீன AI-powered IT சேவைகள் — வேகமானது, cost-effective.\n\nஎதில் உதவி வேண்டும்?",
      askName: "சரி. உங்கள் பெயர் என்ன?",
      askBusiness: "நன்றி, {name}! உங்கள் business பெயர் என்ன?",
      askPhone: "சரி. உங்களை அடைய சிறந்த phone number? (அல்லது skip என எழுதுங்கள்)",
      askDetails: "உங்களுக்கு என்ன தேவை என்பதை இன்னும் சொல்லுங்கள் — எ.கா. POS, Wi-Fi, email setup, அல்லது புதிய location.",
      summary:
        "சரி. இதோ details:\n\n• பெயர்: {name}\n• Business: {business}\n• தேவை: {need}\n• Topic: {topic}\n• Phone: {phone}\n\nஇதை எங்கள் team-க்கு WhatsApp-ல் அனுப்பலாம் — அவர்கள் நேரடியாக பதிலளிப்பார்கள்.",
      sendWhatsApp: "WhatsApp-க்கு அனுப்பு",
      startOver: "மீண்டும் தொடங்கு",
      directWhatsApp: "இப்போதே WhatsApp-ல் அரட்டை",
      callUs: "எங்களை அழைக்கவும்",
      thanks:
        "WhatsApp உங்கள் message-உடன் திறக்கிறது… திறக்கவில்லை என்றால் " +
        ADMIN_PHONE_DISPLAY +
        " என்ற எண்ணுக்கு message அனுப்புங்கள்.",
      skipped: "கொடுக்கப்படவில்லை",
      topics: {
        managed: "Managed IT support",
        network: "Network / Wi-Fi",
        pos: "POS / Restaurant tech",
        cloud: "Cloud & Email",
        security: "Cybersecurity",
        quote: "மதிப்பீடு பெறுங்கள்",
        other: "வேறு ஏதாவது"
      }
    }
  };

  const state = {
    step: "topic",
    topic: "",
    topicLabel: "",
    name: "",
    business: "",
    phone: "",
    need: ""
  };

  function lang() {
    const saved = localStorage.getItem("zentralab-lang");
    return saved === "ta" ? "ta" : "en";
  }

  function t() {
    return copy[lang()];
  }

  function el(html) {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  function createWidget() {
    const root = el(`
      <div class="zl-chat-root" id="zl-chat-root">
        <button type="button" class="zl-chat-launcher" id="zl-chat-launcher" aria-label="Open chat">
          <span class="zl-chat-launcher-icon">💬</span>
          <span class="zl-chat-launcher-text" id="zl-chat-launcher-text">Chat with us</span>
        </button>
        <div class="zl-chat-panel" id="zl-chat-panel" role="dialog" aria-label="Chat">
          <div class="zl-chat-header">
            <div class="zl-chat-header-info">
              <div class="zl-chat-avatar">ZL</div>
              <div>
                <h3 id="zl-chat-title">ZentraLab Assistant</h3>
                <p id="zl-chat-subtitle">Usually replies instantly</p>
              </div>
            </div>
            <button type="button" class="zl-chat-close" id="zl-chat-close" aria-label="Close">×</button>
          </div>
          <div class="zl-chat-messages" id="zl-chat-messages"></div>
          <div class="zl-quick-replies" id="zl-quick-replies"></div>
          <form class="zl-chat-input-row" id="zl-chat-form">
            <input type="text" class="zl-chat-input" id="zl-chat-input" autocomplete="off" />
            <button type="submit" class="zl-chat-send" id="zl-chat-send">Send</button>
          </form>
        </div>
      </div>
    `);
    document.body.appendChild(root);
    return root;
  }

  function messagesEl() {
    return document.getElementById("zl-chat-messages");
  }

  function quickEl() {
    return document.getElementById("zl-quick-replies");
  }

  function addMessage(text, type) {
    const msg = document.createElement("div");
    msg.className = "zl-msg zl-msg-" + type;
    msg.textContent = text;
    messagesEl().appendChild(msg);
    messagesEl().scrollTop = messagesEl().scrollHeight;
  }

  function showTyping(show) {
    const existing = messagesEl().querySelector(".zl-typing");
    if (existing) existing.remove();
    if (!show) return;
    const typing = el('<div class="zl-typing" aria-hidden="true"><span></span><span></span><span></span></div>');
    messagesEl().appendChild(typing);
    messagesEl().scrollTop = messagesEl().scrollHeight;
  }

  function botSay(text, after) {
    showTyping(true);
    setTimeout(() => {
      showTyping(false);
      addMessage(text, "bot");
      if (after) after();
    }, 450);
  }

  function clearQuick() {
    quickEl().innerHTML = "";
  }

  function addChips(items) {
    clearQuick();
    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "zl-chip" + (item.whatsapp ? " zl-chip-whatsapp" : "");
      btn.textContent = item.label;
      btn.addEventListener("click", item.onClick);
      quickEl().appendChild(btn);
    });
  }

  function resetState() {
    state.step = "topic";
    state.topic = "";
    state.topicLabel = "";
    state.name = "";
    state.business = "";
    state.phone = "";
    state.need = "";
  }

  function buildWhatsAppText() {
    const c = t();
    return [
      "New website chat lead — ZentraLab",
      "",
      "Name: " + state.name,
      "Business: " + state.business,
      "Phone: " + (state.phone || c.skipped),
      "Topic: " + state.topicLabel,
      "Need: " + state.need,
      "",
      "Source: zentralab.ca website chatbot"
    ].join("\n");
  }

  function openWhatsApp(text) {
    const url = "https://wa.me/" + ADMIN_WHATSAPP + "?text=" + encodeURIComponent(text);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function showTopicChips() {
    const c = t();
    const topics = [
      ["managed", c.topics.managed],
      ["network", c.topics.network],
      ["pos", c.topics.pos],
      ["cloud", c.topics.cloud],
      ["security", c.topics.security],
      ["quote", c.topics.quote],
      ["other", c.topics.other]
    ];

    addChips(
      topics.map(([key, label]) => ({
        label,
        onClick: () => {
          state.topic = key;
          state.topicLabel = label;
          addMessage(label, "user");
          clearQuick();
          state.step = "name";
          botSay(c.askName);
        }
      })).concat([
        {
          label: c.directWhatsApp,
          whatsapp: true,
          onClick: () => {
            openWhatsApp(
              lang() === "ta"
                ? "வணக்கம் ZentraLab, எனக்கு IT help தேவை."
                : "Hi ZentraLab, I need help with IT for my small business."
            );
          }
        }
      ])
    );
  }

  function showFinalActions() {
    const c = t();
    addChips([
      {
        label: c.sendWhatsApp,
        whatsapp: true,
        onClick: () => {
          openWhatsApp(buildWhatsAppText());
          addMessage(c.thanks, "system");
          clearQuick();
          addChips([
            {
              label: c.startOver,
              onClick: () => startConversation(true)
            },
            {
              label: c.callUs,
              onClick: () => {
                window.location.href = "tel:+19059292625";
              }
            }
          ]);
        }
      },
      {
        label: c.startOver,
        onClick: () => startConversation(true)
      },
      {
        label: c.callUs,
        onClick: () => {
          window.location.href = "tel:+19059292625";
        }
      }
    ]);
  }

  function handleUserText(text) {
    const value = text.trim();
    if (!value) return;
    const c = t();
    addMessage(value, "user");
    document.getElementById("zl-chat-input").value = "";

    if (state.step === "topic") {
      state.topic = "other";
      state.topicLabel = c.topics.other;
      state.need = value;
      state.step = "name";
      clearQuick();
      botSay(c.askName);
      return;
    }

    if (state.step === "name") {
      state.name = value;
      state.step = "business";
      botSay(c.askBusiness.replace("{name}", state.name));
      return;
    }

    if (state.step === "business") {
      state.business = value;
      state.step = "details";
      botSay(c.askDetails);
      return;
    }

    if (state.step === "details") {
      state.need = state.need ? state.need + " | " + value : value;
      state.step = "phone";
      botSay(c.askPhone);
      return;
    }

    if (state.step === "phone") {
      const skip = /^(skip|n\/a|na|no|none|-)$/i.test(value) || value === "தவிர்" || value === "skip";
      state.phone = skip ? "" : value;
      state.step = "done";
      const summary = c.summary
        .replace("{name}", state.name)
        .replace("{business}", state.business)
        .replace("{need}", state.need)
        .replace("{topic}", state.topicLabel)
        .replace("{phone}", state.phone || c.skipped);
      botSay(summary, showFinalActions);
    }
  }

  function refreshLabels() {
    const c = t();
    const launcherText = document.getElementById("zl-chat-launcher-text");
    const title = document.getElementById("zl-chat-title");
    const subtitle = document.getElementById("zl-chat-subtitle");
    const input = document.getElementById("zl-chat-input");
    const send = document.getElementById("zl-chat-send");
    if (launcherText) launcherText.textContent = c.launcher;
    if (title) title.textContent = c.title;
    if (subtitle) subtitle.textContent = c.subtitle;
    if (input) input.placeholder = c.placeholder;
    if (send) send.textContent = c.send;
  }

  function startConversation(clear) {
    resetState();
    refreshLabels();
    if (clear) messagesEl().innerHTML = "";
    clearQuick();
    botSay(t().greeting, showTopicChips);
  }

  function openPanel() {
    document.getElementById("zl-chat-panel").classList.add("open");
    document.getElementById("zl-chat-launcher").classList.add("hidden");
    if (!messagesEl().children.length) {
      startConversation(false);
    } else {
      refreshLabels();
    }
    setTimeout(() => document.getElementById("zl-chat-input").focus(), 100);
  }

  function closePanel() {
    document.getElementById("zl-chat-panel").classList.remove("open");
    document.getElementById("zl-chat-launcher").classList.remove("hidden");
  }

  document.addEventListener("DOMContentLoaded", () => {
    createWidget();
    refreshLabels();

    document.getElementById("zl-chat-launcher").addEventListener("click", openPanel);
    document.getElementById("zl-chat-close").addEventListener("click", closePanel);
    document.getElementById("zl-chat-form").addEventListener("submit", (e) => {
      e.preventDefault();
      handleUserText(document.getElementById("zl-chat-input").value);
    });

    // Keep chatbot labels in sync when language changes
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        setTimeout(() => {
          refreshLabels();
          // If chat is at the topic step with no answers yet, restart in new language
          if (state.step === "topic" && !state.name) {
            startConversation(true);
          }
        }, 50);
      });
    });
  });
})();

(function () {
  const SALON_PHONE = "19059202277";
  const SALON_PHONE_DISPLAY = "905-920-2277";
  const SALON_WHATSAPP = "19059202277";

  const copy = {
    launcher: "Chat with us",
    title: "Farzana Hair Salon",
    subtitle: "We usually reply instantly",
    placeholder: "Type your message...",
    send: "Send",
    greeting:
      "Hi! I'm the Farzana Hair Salon assistant.\n\nI can help with services, location, hours, and booking. Online reservations are coming soon — for now I can connect you by phone or WhatsApp.\n\nWhat would you like?",
    askName: "Great. What's your name?",
    askService: "Thanks, {name}! Which service — women's cut, men's cut, or something else?",
    askWhen: "When would you like to come in? (day and time, or say flexible)",
    askPhone: "Best phone number to reach you? (or type skip)",
    summary:
      "Perfect. Here's what I have:\n\n• Name: {name}\n• Service: {service}\n• When: {when}\n• Phone: {phone}\n\nI can open WhatsApp so the salon can confirm your appointment.",
    sendWhatsApp: "Send on WhatsApp",
    startOver: "Start over",
    callUs: "Call salon",
    thanks:
      "Opening WhatsApp with your request… If it doesn't open, call us at " +
      SALON_PHONE_DISPLAY +
      ".",
    skipped: "Not provided",
    topics: {
      book: "Book a haircut",
      women: "Women's cuts",
      men: "Men's cuts",
      location: "Location & parking",
      hours: "Hours",
      other: "Something else"
    },
    answers: {
      women:
        "We offer women's haircuts, trims, and restyles shaped for your face and lifestyle.\n\nPricing is confirmed when you book. Want me to help you request an appointment?",
      men:
        "We offer men's haircuts, fades/tapers, and tidy finishes — clean and easy to maintain.\n\nWant me to help you request an appointment?",
      location:
        "We're at 8 Taywood Crt, Dundas, ON L9H 7A2.\n\nEasy to find on Taywood Court. Open in Maps from our Visit page, or I can help you book a visit.",
      hours:
        "Please call " +
        SALON_PHONE_DISPLAY +
        " for today's hours and openings — they can confirm the best time for you.\n\nWould you like to request a booking?"
    }
  };

  const state = {
    step: "topic",
    topic: "",
    topicLabel: "",
    name: "",
    service: "",
    when: "",
    phone: ""
  };

  function el(html) {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  function createWidget() {
    const root = el(`
      <div class="fh-chat-root" id="fh-chat-root">
        <button type="button" class="fh-chat-launcher" id="fh-chat-launcher" aria-label="Open chat">
          <span class="fh-chat-launcher-icon" aria-hidden="true">💬</span>
          <span class="fh-chat-launcher-text" id="fh-chat-launcher-text">Chat with us</span>
        </button>
        <div class="fh-chat-panel" id="fh-chat-panel" role="dialog" aria-label="Salon chat">
          <div class="fh-chat-header">
            <div class="fh-chat-header-info">
              <div class="fh-chat-avatar">FH</div>
              <div>
                <h3 id="fh-chat-title">Farzana Hair Salon</h3>
                <p id="fh-chat-subtitle">We usually reply instantly</p>
              </div>
            </div>
            <button type="button" class="fh-chat-close" id="fh-chat-close" aria-label="Close">×</button>
          </div>
          <div class="fh-chat-messages" id="fh-chat-messages"></div>
          <div class="fh-quick-replies" id="fh-quick-replies"></div>
          <form class="fh-chat-input-row" id="fh-chat-form">
            <input type="text" class="fh-chat-input" id="fh-chat-input" autocomplete="off" />
            <button type="submit" class="fh-chat-send" id="fh-chat-send">Send</button>
          </form>
        </div>
      </div>
    `);
    document.body.appendChild(root);
    return root;
  }

  function messagesEl() {
    return document.getElementById("fh-chat-messages");
  }

  function quickEl() {
    return document.getElementById("fh-quick-replies");
  }

  function addMessage(text, type) {
    const msg = document.createElement("div");
    msg.className = "fh-msg fh-msg-" + type;
    msg.textContent = text;
    messagesEl().appendChild(msg);
    messagesEl().scrollTop = messagesEl().scrollHeight;
  }

  function showTyping(show) {
    const existing = messagesEl().querySelector(".fh-typing");
    if (existing) existing.remove();
    if (!show) return;
    const typing = el(
      '<div class="fh-typing" aria-hidden="true"><span></span><span></span><span></span></div>'
    );
    messagesEl().appendChild(typing);
    messagesEl().scrollTop = messagesEl().scrollHeight;
  }

  function botSay(text, after) {
    showTyping(true);
    setTimeout(() => {
      showTyping(false);
      addMessage(text, "bot");
      if (after) after();
    }, 420);
  }

  function clearQuick() {
    quickEl().innerHTML = "";
  }

  function addChips(items) {
    clearQuick();
    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fh-chip" + (item.primary ? " fh-chip-primary" : "");
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
    state.service = "";
    state.when = "";
    state.phone = "";
  }

  function buildWhatsAppText() {
    return [
      "New booking request — Farzana Hair Salon",
      "",
      "Name: " + state.name,
      "Service: " + state.service,
      "When: " + state.when,
      "Phone: " + (state.phone || copy.skipped),
      "",
      "Source: fhsalon.ca website chatbot"
    ].join("\n");
  }

  function openWhatsApp(text) {
    const url =
      "https://wa.me/" + SALON_WHATSAPP + "?text=" + encodeURIComponent(text);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function offerBookingFollowUp() {
    addChips([
      {
        label: copy.topics.book,
        primary: true,
        onClick: () => startBooking()
      },
      {
        label: copy.callUs,
        onClick: () => {
          window.location.href = "tel:+" + SALON_PHONE;
        }
      },
      {
        label: copy.startOver,
        onClick: () => startConversation(true)
      }
    ]);
  }

  function startBooking() {
    state.topic = "book";
    state.topicLabel = copy.topics.book;
    addMessage(copy.topics.book, "user");
    clearQuick();
    state.step = "name";
    botSay(copy.askName);
  }

  function showTopicChips() {
    const topics = [
      ["book", copy.topics.book],
      ["women", copy.topics.women],
      ["men", copy.topics.men],
      ["location", copy.topics.location],
      ["hours", copy.topics.hours],
      ["other", copy.topics.other]
    ];

    addChips(
      topics.map(([key, label]) => ({
        label,
        primary: key === "book",
        onClick: () => {
          state.topic = key;
          state.topicLabel = label;
          addMessage(label, "user");
          clearQuick();

          if (key === "book") {
            state.step = "name";
            botSay(copy.askName);
            return;
          }

          if (key === "women" || key === "men" || key === "location" || key === "hours") {
            state.step = "topic";
            botSay(copy.answers[key], offerBookingFollowUp);
            return;
          }

          state.step = "other";
          botSay("Tell me what you need — I'll do my best to help, or connect you with the salon.");
        }
      })).concat([
        {
          label: copy.callUs,
          onClick: () => {
            window.location.href = "tel:+" + SALON_PHONE;
          }
        }
      ])
    );
  }

  function showFinalActions() {
    addChips([
      {
        label: copy.sendWhatsApp,
        primary: true,
        onClick: () => {
          openWhatsApp(buildWhatsAppText());
          addMessage(copy.thanks, "system");
          clearQuick();
          addChips([
            {
              label: copy.startOver,
              onClick: () => startConversation(true)
            },
            {
              label: copy.callUs,
              onClick: () => {
                window.location.href = "tel:+" + SALON_PHONE;
              }
            }
          ]);
        }
      },
      {
        label: copy.startOver,
        onClick: () => startConversation(true)
      },
      {
        label: copy.callUs,
        onClick: () => {
          window.location.href = "tel:+" + SALON_PHONE;
        }
      }
    ]);
  }

  function handleUserText(text) {
    const value = text.trim();
    if (!value) return;
    addMessage(value, "user");
    document.getElementById("fh-chat-input").value = "";

    if (state.step === "topic" || state.step === "other") {
      const lower = value.toLowerCase();
      if (/book|appoint|reserv|schedule/.test(lower)) {
        state.step = "name";
        botSay(copy.askName);
        return;
      }
      if (/women|lady|ladies|female/.test(lower)) {
        botSay(copy.answers.women, offerBookingFollowUp);
        return;
      }
      if (/men|male|fade|beard/.test(lower)) {
        botSay(copy.answers.men, offerBookingFollowUp);
        return;
      }
      if (/where|address|location|map|park/.test(lower)) {
        botSay(copy.answers.location, offerBookingFollowUp);
        return;
      }
      if (/hour|open|close|time/.test(lower)) {
        botSay(copy.answers.hours, offerBookingFollowUp);
        return;
      }
      botSay(
        "Thanks! For that, the quickest answer is to call " +
          SALON_PHONE_DISPLAY +
          ", or I can help you request a booking.",
        offerBookingFollowUp
      );
      return;
    }

    if (state.step === "name") {
      state.name = value;
      state.step = "service";
      botSay(copy.askService.replace("{name}", state.name));
      return;
    }

    if (state.step === "service") {
      state.service = value;
      state.step = "when";
      botSay(copy.askWhen);
      return;
    }

    if (state.step === "when") {
      state.when = value;
      state.step = "phone";
      botSay(copy.askPhone);
      return;
    }

    if (state.step === "phone") {
      const skip = /^(skip|n\/a|na|no|none|-)$/i.test(value);
      state.phone = skip ? "" : value;
      state.step = "done";
      const summary = copy.summary
        .replace("{name}", state.name)
        .replace("{service}", state.service)
        .replace("{when}", state.when)
        .replace("{phone}", state.phone || copy.skipped);
      botSay(summary, showFinalActions);
    }
  }

  function refreshLabels() {
    const launcherText = document.getElementById("fh-chat-launcher-text");
    const title = document.getElementById("fh-chat-title");
    const subtitle = document.getElementById("fh-chat-subtitle");
    const input = document.getElementById("fh-chat-input");
    const send = document.getElementById("fh-chat-send");
    if (launcherText) launcherText.textContent = copy.launcher;
    if (title) title.textContent = copy.title;
    if (subtitle) subtitle.textContent = copy.subtitle;
    if (input) input.placeholder = copy.placeholder;
    if (send) send.textContent = copy.send;
  }

  function startConversation(clear) {
    resetState();
    refreshLabels();
    if (clear) messagesEl().innerHTML = "";
    clearQuick();
    botSay(copy.greeting, showTopicChips);
  }

  function openPanel() {
    document.getElementById("fh-chat-panel").classList.add("open");
    document.getElementById("fh-chat-launcher").classList.add("hidden");
    if (!messagesEl().children.length) {
      startConversation(false);
    } else {
      refreshLabels();
    }
    setTimeout(() => document.getElementById("fh-chat-input").focus(), 100);
  }

  function closePanel() {
    document.getElementById("fh-chat-panel").classList.remove("open");
    document.getElementById("fh-chat-launcher").classList.remove("hidden");
  }

  document.addEventListener("DOMContentLoaded", () => {
    createWidget();
    refreshLabels();
    document.getElementById("fh-chat-launcher").addEventListener("click", openPanel);
    document.getElementById("fh-chat-close").addEventListener("click", closePanel);
    document.getElementById("fh-chat-form").addEventListener("submit", (e) => {
      e.preventDefault();
      handleUserText(document.getElementById("fh-chat-input").value);
    });
  });
})();

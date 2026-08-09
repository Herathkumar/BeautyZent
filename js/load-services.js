(() => {
  const API =
    window.FHSALON_CATALOG_URL ||
    "https://fhsalon.vercel.app/api/public/fhsalon/catalog";
  const API_ORIGIN = (() => {
    try {
      return new URL(API).origin;
    } catch {
      return "https://fhsalon.vercel.app";
    }
  })();

  const LOCAL_IMAGES = {
    "Women's haircut & style": "images/services/menu/womens-haircut-style.jpg",
    "Women's haircut": "images/services/menu/womens-haircut-style.jpg",
    "Trim & tidy": "images/services/menu/trim-tidy.jpg",
    "Bang / fringe trim": "images/services/menu/bang-fringe-trim.jpg",
    "Men's haircut": "images/services/menu/mens-haircut.jpg",
    "Fade / taper": "images/services/menu/fade-taper.jpg",
    "Beard tidy (with cut)": "images/services/menu/beard-tidy.jpg",
    "Eyebrow trimming": "images/services/menu/eyebrow-trimming.jpg",
    "Hair coloring": "images/services/menu/hair-coloring.jpg",
    "Beard trimming": "images/services/menu/beard-trimming.jpg",
  };

  const womenList = document.querySelector("[data-services-women]");
  const menList = document.querySelector("[data-services-men]");
  const otherWrap = document.querySelector("[data-services-other-wrap]");
  const otherList = document.querySelector("[data-services-other]");
  const homeGrid = document.querySelector("[data-home-services]");

  if (!womenList && !menList && !homeGrid) return;

  function formatPrice(cents) {
    const n = Number(cents);
    if (!Number.isFinite(n)) return "Ask";
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: n % 100 === 0 ? 0 : 2,
    }).format(n / 100);
  }

  function imageFor(service) {
    const remote = service.imageUrl || service.photoUrl;
    if (remote) {
      if (/^https?:\/\//i.test(remote)) return remote;
      return API_ORIGIN + remote;
    }
    return LOCAL_IMAGES[service.name] || null;
  }

  function renderList(ul, services) {
    ul.innerHTML = "";
    if (!services.length) {
      const li = document.createElement("li");
      li.innerHTML = "<span>No services listed yet</span><span>—</span>";
      ul.appendChild(li);
      return;
    }
    services.forEach((s) => {
      const li = document.createElement("li");
      li.className = "service-menu-item";

      const left = document.createElement("div");
      left.className = "service-menu-item-main";

      const imgUrl = imageFor(s);
      if (imgUrl) {
        const thumb = document.createElement("img");
        thumb.src = imgUrl;
        thumb.alt = "";
        thumb.width = 56;
        thumb.height = 56;
        thumb.loading = "lazy";
        left.appendChild(thumb);
      }

      const text = document.createElement("div");
      const name = document.createElement("span");
      name.className = "service-menu-name";
      name.textContent = s.name;
      text.appendChild(name);
      if (s.durationMin) {
        const meta = document.createElement("span");
        meta.className = "service-menu-meta";
        meta.textContent = s.durationMin + " min";
        text.appendChild(meta);
      }
      left.appendChild(text);

      const price = document.createElement("span");
      price.className = "service-menu-price";
      price.textContent = formatPrice(s.priceCents);

      li.append(left, price);
      ul.appendChild(li);
    });
  }

  function renderHomeGrid(services) {
    if (!homeGrid) return;
    homeGrid.innerHTML = "";
    if (!services.length) {
      homeGrid.innerHTML =
        '<p class="service-offer-empty">Services will appear here soon.</p>';
      return;
    }
    services.forEach((s) => {
      const card = document.createElement("article");
      card.className = "service-offer-card";

      const media = document.createElement("div");
      media.className = "service-offer-media";
      const imgUrl = imageFor(s);
      if (imgUrl) {
        const img = document.createElement("img");
        img.src = imgUrl;
        img.alt = "";
        img.width = 640;
        img.height = 480;
        img.loading = "lazy";
        media.appendChild(img);
      } else {
        media.classList.add("is-empty");
      }

      const body = document.createElement("div");
      body.className = "service-offer-body";

      const top = document.createElement("div");
      top.className = "service-offer-top";
      const title = document.createElement("h3");
      title.textContent = s.name;
      const price = document.createElement("p");
      price.className = "service-offer-price";
      price.textContent = formatPrice(s.priceCents);
      top.append(title, price);

      const meta = document.createElement("p");
      meta.className = "service-offer-meta";
      const bits = [];
      if (s.category === "WOMEN") bits.push("Women");
      else if (s.category === "MEN") bits.push("Men");
      if (s.durationMin) bits.push(s.durationMin + " min");
      meta.textContent = bits.join(" · ");

      body.append(top, meta);
      if (s.description) {
        const desc = document.createElement("p");
        desc.className = "service-offer-desc";
        desc.textContent = s.description;
        body.appendChild(desc);
      }

      card.append(media, body);
      homeGrid.appendChild(card);
    });
  }

  function splitCategories(data) {
    const by = data.servicesByCategory || {};
    const all = data.services || [];
    return {
      women: by.women || all.filter((s) => s.category === "WOMEN"),
      men: by.men || all.filter((s) => s.category === "MEN"),
      other: by.other || all.filter((s) => s.category !== "WOMEN" && s.category !== "MEN"),
      all,
    };
  }

  async function load() {
    try {
      const res = await fetch(API, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("catalog " + res.status);
      const data = await res.json();
      const { women, men, other, all } = splitCategories(data);

      if (homeGrid) renderHomeGrid(all);

      if (womenList) renderList(womenList, women);
      if (menList) renderList(menList, men);
      if (otherWrap && otherList) {
        if (other.length) {
          otherWrap.hidden = false;
          renderList(otherList, other);
        } else {
          otherWrap.hidden = true;
        }
      }
    } catch (err) {
      console.warn("Could not load live services", err);
      if (homeGrid) {
        homeGrid.innerHTML =
          '<p class="service-offer-empty">Couldn’t load live prices — <a href="services.html">see services</a> or call 905-920-2277.</p>';
      }
      if (womenList) {
        womenList.innerHTML =
          '<li><span>Couldn’t load live prices</span><span>Book online / call</span></li>';
      }
      if (menList) {
        menList.innerHTML =
          '<li><span>Couldn’t load live prices</span><span>Book online / call</span></li>';
      }
    }
  }

  load();
})();

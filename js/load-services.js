(() => {
  const API =
    window.FHSALON_CATALOG_URL ||
    "https://fhsalon.vercel.app/api/public/fhsalon/catalog";

  const womenList = document.querySelector("[data-services-women]");
  const menList = document.querySelector("[data-services-men]");
  const otherWrap = document.querySelector("[data-services-other-wrap]");
  const otherList = document.querySelector("[data-services-other]");
  if (!womenList || !menList) return;

  function formatPrice(cents) {
    const n = Number(cents);
    if (!Number.isFinite(n)) return "Ask";
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: n % 100 === 0 ? 0 : 2,
    }).format(n / 100);
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
      const name = document.createElement("span");
      name.textContent = s.name;
      const price = document.createElement("span");
      price.textContent = formatPrice(s.priceCents);
      li.append(name, price);
      ul.appendChild(li);
    });
  }

  async function load() {
    try {
      const res = await fetch(API, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("catalog " + res.status);
      const data = await res.json();
      const by = data.servicesByCategory || {};
      const women = by.women || (data.services || []).filter((s) => s.category === "WOMEN");
      const men = by.men || (data.services || []).filter((s) => s.category === "MEN");
      const other = by.other || (data.services || []).filter(
        (s) => s.category !== "WOMEN" && s.category !== "MEN"
      );
      renderList(womenList, women);
      renderList(menList, men);
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
      womenList.innerHTML =
        '<li><span>Couldn’t load live prices</span><span>Book online / call</span></li>';
      menList.innerHTML =
        '<li><span>Couldn’t load live prices</span><span>Book online / call</span></li>';
    }
  }

  load();
})();

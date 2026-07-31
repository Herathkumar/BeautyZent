import { useEffect, useState } from "react";

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isIos() && !isStandalone()) {
      const dismissed = sessionStorage.getItem("zl_install_dismissed");
      if (!dismissed) setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="install-hint">
      <div>
        <strong>Install on iPad</strong>
        <p>
          Tap Share, then <em>Add to Home Screen</em> for a full-screen POS app.
        </p>
      </div>
      <button
        className="secondary"
        type="button"
        onClick={() => {
          sessionStorage.setItem("zl_install_dismissed", "1");
          setShow(false);
        }}
      >
        Got it
      </button>
    </div>
  );
}

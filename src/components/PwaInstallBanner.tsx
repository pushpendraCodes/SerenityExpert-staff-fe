import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed";

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Shows an install banner when the browser can install this PWA,
 * or iOS “Add to Home Screen” instructions when needed.
 */
export function PwaInstallBanner({ appName = "app" }: { appName?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    setHidden(false);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    if (isIos()) setShowIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
    setDeferred(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (hidden) return null;
  if (!deferred && !showIosHint) return null;

  return (
    <div className="fixed inset-x-0 bottom-[4.5rem] z-40 mx-3 sm:bottom-4 sm:mx-auto sm:max-w-md lg:bottom-6">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">Install {appName}</p>
          {deferred ? (
            <>
              <p className="mt-0.5 text-xs text-muted">
                Add to your home screen for faster access and call alerts.
              </p>
              <button
                type="button"
                onClick={install}
                className="mt-2 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white"
              >
                Install app
              </button>
            </>
          ) : (
            <p className="mt-0.5 text-xs text-muted">
              On iPhone: tap <strong>Share</strong> → <strong>Add to Home Screen</strong> to install.
            </p>
          )}
        </div>
        <button type="button" onClick={dismiss} className="text-muted hover:text-ink" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

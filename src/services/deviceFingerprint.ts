import { detectIncognito } from "detectincognitojs";

interface FingerprintResult {
  requestId: string;
  visitorId: string;
}

interface BrowserDetails {
  browserName: string;
  browserMajorVersion: string;
  browserFullVersion: string;
  os: string;
  osVersion: string;
  device: string;
  userAgent: string;
  sdkVersion: string;
  appVersion: string;
}

const API_FINGERPRINT_URL = import.meta.env.VITE_API_FINGERPRINT_URL;
const API_VERIFY_IP_URL = import.meta.env.VITE_API_VERIFY_IP_URL;
const AUTH_API_KEY = import.meta.env.VITE_AUTH_API_KEY;

export async function getDeviceFingerprint(): Promise<FingerprintResult> {
  if (typeof window === "undefined") {
    return { requestId: "", visitorId: "" }; // SSR-safe
  }

  try {
    const userAgent = navigator.userAgent;
    const colorDepth = screen.colorDepth;
    const resolution = `${screen.availWidth},${screen.availHeight}`;
    const cookiesEnabled = navigator.cookieEnabled;
    const canvasPrint = getCanvasPrint();
    const localStorageEnabled = isStorageEnabled(localStorage);
    const sessionStorageEnabled = isStorageEnabled(sessionStorage);
    const incognito = (await detectIncognito()).isPrivate;

    const hashInput = [
      userAgent,
      colorDepth,
      resolution,
      localStorageEnabled,
      sessionStorageEnabled,
      cookiesEnabled,
      canvasPrint,
      location.hostname,
    ].join("|");

    const hashCode = murmurHash3_32_gc(hashInput).toString();

    const payload = {
      hashCode,
      hashValue: hashInput,
      otherInformation: {
        ip: await getIP(),
        requestTimeStamp: Date.now().toString(),
        browserDetails: getBrowserDetails(),
        confidenceParams: {
          isBot: isBot(),
          incognito,
        },
        tag: {
          displayHeight: window.innerHeight,
          displayWidth: window.innerWidth,
          process: "searchIt",
        },
      },
    };

    const res = await fetch(`${API_FINGERPRINT_URL}native-fingerprint/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Auth-API-Key": AUTH_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return {
      requestId: data?.data?.requestId || "",
      visitorId: data?.data?.visitorId || "",
    };
  } catch (err) {
    console.error("Device fingerprint error:", err);
    return { requestId: "", visitorId: "" };
  }
}

function isBot(): boolean {
  const botPatterns = [
    /bot/i,
    /spider/i,
    /crawl/i,
    /slurp/i,
    /headless/i,
    /phantom/i,
    /wget/i,
    /curl/i,
  ];
  return botPatterns.some((pattern) => pattern.test(navigator.userAgent));
}

function isStorageEnabled(storage: Storage): boolean {
  try {
    storage.setItem("test", "test");
    storage.removeItem("test");
    return true;
  } catch {
    return false;
  }
}

function getCanvasPrint(): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx?.fillText("fingerprint", 10, 10);
    return canvas.toDataURL();
  } catch {
    return "error";
  }
}

async function getIP(): Promise<string> {
  try {
    const res = await fetch(API_VERIFY_IP_URL);
    return await res.text();
  } catch {
    return "";
  }
}

function getBrowserDetails(): BrowserDetails {
  const userAgent = navigator.userAgent;

  const browserName =
    /Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)
      ? "Chrome"
      : /Edg/i.test(userAgent)
      ? "Edge"
      : /Firefox/i.test(userAgent)
      ? "Firefox"
      : /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)
      ? "Safari"
      : "Other";

  const versionMatch = /(?:Chrome|Firefox|Safari|Opera)\/(\d+)/.exec(userAgent);
  const browserMajorVersion = versionMatch ? versionMatch[1] : "";

  const osMatch = /\(([^)]+)\)/.exec(userAgent);
  const os = osMatch ? osMatch[1] : "";
  const osVersion = os || "";

  return {
    browserName,
    browserMajorVersion,
    browserFullVersion: userAgent,
    os,
    osVersion,
    device: "other",
    userAgent,
    sdkVersion: "1.0.0",
    appVersion: "1.0",
  };
}

// ✅ MurmurHash3 (x86, 32-bit) in pure JS
function murmurHash3_32_gc(key: string, seed = 0): number {
  let remainder = key.length & 3; // key.length % 4
  let bytes = key.length - remainder;
  let h1 = seed;
  let c1 = 0xcc9e2d51;
  let c2 = 0x1b873593;
  let i = 0;

  while (i < bytes) {
    let k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(++i) & 0xff) << 8) |
      ((key.charCodeAt(++i) & 0xff) << 16) |
      ((key.charCodeAt(++i) & 0xff) << 24);
    ++i;

    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = (Math.imul(h1, 5) + 0xe6546b64) | 0;
  }

  let k1 = 0;
  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    case 2:
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    case 1:
      k1 ^= key.charCodeAt(i) & 0xff;
      k1 = Math.imul(k1, c1);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
  }

  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

export type PublicGiftPlatformId = "taobao" | "jd";

export type PublicGiftLink = {
  id: PublicGiftPlatformId;
  name: string;
  domain: string;
  url: string;
  kind: "gift";
};

export type GiftLinkCheck =
  | { status: "supported"; link: PublicGiftLink }
  | { status: "known-platform-unverified" }
  | { status: "invalid" }
  | { status: "unknown" };

function normalize(rawUrl: string): URL | null {
  if (!rawUrl || rawUrl.length > 2048 || /[\u0000-\u001f\u007f]/.test(rawUrl)) return null;
  try {
    const url = new URL(rawUrl.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    return url;
  } catch {
    return null;
  }
}

function normalizedHost(url: URL) {
  return url.hostname.toLowerCase().replace(/\.$/, "");
}

function hasOnlyOneParameter(url: URL, name: string) {
  const keys = [...url.searchParams.keys()];
  return keys.length === 1 && keys[0] === name && url.searchParams.getAll(name).length === 1;
}

function canonicalGiftUrl(domain: string, path: string, parameter?: { name: string; value: string }) {
  const canonical = new URL(`https://${domain}${path}`);
  if (parameter) canonical.searchParams.set(parameter.name, parameter.value);
  return canonical.toString();
}

function jdGiftId(value: string | null) {
  return Boolean(value && value.length >= 20 && value.length <= 512 && /^[A-Za-z0-9+/=]+$/.test(value));
}

export function checkGiftLink(rawUrl: string): GiftLinkCheck {
  const url = normalize(rawUrl);
  if (!url) return { status: "invalid" };

  const domain = normalizedHost(url);
  const path = url.pathname.replace(/\/{2,}/g, "/");
  const hasCanonicalPath = path === url.pathname;
  const taobaoToken = url.searchParams.get("tk") ?? "";

  if (
    domain === "i.tb.cn"
    && hasCanonicalPath
    && /^\/h\.[A-Za-z0-9_-]{4,64}$/.test(path)
    && /^[A-Za-z0-9]{8,32}$/.test(taobaoToken)
    && hasOnlyOneParameter(url, "tk")
    && !url.hash
  ) {
    return { status: "supported", link: { id: "taobao", name: "淘宝", domain, url: canonicalGiftUrl(domain, path, { name: "tk", value: taobaoToken }), kind: "gift" } };
  }
  const jdId = url.searchParams.get("id");
  if (
    domain === "trade.m.jd.com"
    && hasCanonicalPath
    && path === "/present"
    && jdGiftId(jdId)
    && hasOnlyOneParameter(url, "id")
    && !url.hash
  ) {
    return { status: "supported", link: { id: "jd", name: "京东", domain, url: canonicalGiftUrl(domain, path, { name: "id", value: jdId ?? "" }), kind: "gift" } };
  }
  if (domain === "3.cn" && hasCanonicalPath && /^\/-[A-Za-z0-9_-]{4,64}$/.test(path) && !url.search && !url.hash) {
    return { status: "supported", link: { id: "jd", name: "京东", domain, url: canonicalGiftUrl(domain, path), kind: "gift" } };
  }

  const knownPlatform = domain === "taobao.com" || domain.endsWith(".taobao.com")
    || domain === "tmall.com" || domain.endsWith(".tmall.com")
    || domain === "tb.cn" || domain.endsWith(".tb.cn")
    || domain === "jd.com" || domain.endsWith(".jd.com")
    || domain === "jd.hk" || domain.endsWith(".jd.hk")
    || domain === "3.cn" || domain.endsWith(".3.cn")
    || domain === "jingdong.com" || domain.endsWith(".jingdong.com")
    || domain === "weixin.qq.com" || domain.endsWith(".weixin.qq.com");
  return { status: knownPlatform ? "known-platform-unverified" : "unknown" };
}

export function getPublicGiftLink(rawUrl: string): PublicGiftLink | null {
  const direct = checkGiftLink(rawUrl);
  if (direct.status === "supported") return direct.link;

  if (
    !rawUrl
    || rawUrl.length > 4096
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(rawUrl)
  ) {
    return null;
  }

  const candidates = rawUrl.match(/https:\/\/[^\s<>"'【】（）\[\]，。；;｜]+/g) ?? [];
  const supported = new Map<string, PublicGiftLink>();
  for (const candidate of candidates) {
    const checked = checkGiftLink(candidate);
    if (checked.status === "supported") supported.set(checked.link.url, checked.link);
  }

  return supported.size === 1 ? supported.values().next().value ?? null : null;
}

export type GiftLinkPlatformId = "taobao" | "jd" | "wechat-shop" | "generic";

export type GiftLinkPlatform = {
  id: GiftLinkPlatformId;
  name: string;
  domain: string;
  url: string;
};

type PlatformRule = {
  id: Exclude<GiftLinkPlatformId, "generic">;
  name: string;
  domains: readonly string[];
};

const PLATFORM_RULES: readonly PlatformRule[] = [
  {
    id: "taobao",
    name: "淘宝",
    domains: ["taobao.com", "tmall.com", "tb.cn"],
  },
  {
    id: "jd",
    name: "京东",
    domains: ["jd.com", "jd.hk", "jingdong.com", "3.cn"],
  },
  {
    id: "wechat-shop",
    name: "微信小店",
    domains: ["weixin.qq.com"],
  },
];

function matchesDomain(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function getGiftLinkPlatform(rawUrl: string): GiftLinkPlatform | null {
  try {
    const url = new URL(rawUrl.trim());

    if (url.protocol !== "https:") {
      return null;
    }

    const domain = url.hostname.toLowerCase().replace(/\.$/, "");
    const platform = PLATFORM_RULES.find((rule) =>
      rule.domains.some((knownDomain) => matchesDomain(domain, knownDomain)),
    );

    return {
      id: platform?.id ?? "generic",
      name: platform?.name ?? "礼物链接",
      domain,
      url: url.toString(),
    };
  } catch {
    return null;
  }
}

// Campaign → 产品映射（来源：知识文档/campaign与产品的对应关系.xlsx）
// 生成时间：2026-03-20

const CAMPAIGN_PRODUCT_MAP = {
  "Ft-web-2.5-12.9-功能词-拉新-首页": "fachat",
  "Ft-web-IN-12.2-Pmax-TCPA": "fachat",
  "Ft-web-IN-2.5-10.15-online chat-onlinechat页面-TCPA": "fachat",
  "Ft-web-IN-2.5-9.10-首页-random chat-TCPA": "fachat",
  "Ft-web-IN-2.5-emeraldchat-8.15-首页-TCPA-词组匹配": "fachat",
  "ft-web-IN-2.5-功能词-广泛-5.13-首页-TCPA": "fachat",
  "ft-web-IN-2.5-广泛-1.17-功能词-首页-TCPA": "fachat",
  "ft-web-IN-3.0-广泛-6.12-功能词+竞品词-首页-Troas": "fachat",
  "ft-web-IN-talk to strangers-7.25-首页-TCPA": "fachat",
  "ft-web-pmax-IN-3.0-7.30-高价值新客户-首页-Troas": "fachat",
  "Ft-web-UK-2.5-Display-1.3-homepage": "fachat",
  "ft-web-US-2.5-7.11重开-功能词-首页-Troas": "fachat",
  "Ft-web-US-2.5-Display-12.26-homepage": "fachat",
  "ft-web-印度-2.5-广泛-5.13-live call-首页-TCPA": "fachat",
  "ft-巴西-2.5-功能词-5.19-swip页": "fachat",
  "Ppt-web-2.5-AR+UAE+IL+QA-2.10-AR": "pinkpinkchat",
  "Ppt-web-2.5-AR+UAE+IL+QA-2.3": "pinkpinkchat",
  "Ppt-web-UK-2.5-1.18-homepage": "pinkpinkchat",
  "Ppt-web-UK-2.5-Display-1.28-homepage": "pinkpinkchat",
  "Ppt-web-UK-2.5-竞品词-2.2-homepage": "pinkpinkchat",
  "Ppt-web-US-2.5-1.17-homepage": "pinkpinkchat",
  "Ppt-web-US-2.5-Pmax-1.20-homepage": "pinkpinkchat",
  "Ppt-web-US-2.5-竞品词-1.28-homepage": "pinkpinkchat",
  "Pu-IN-2.5-Pmax-1.13-首页-重开": "parau",
  "Pu-IN-2.5-Pmax-7.11-首页-TCPA": "parau",
  "Pu-IN-2.5-功能词拓展2-6.16-首页-TCPA": "parau",
  "Pu-web-2.5-IN-Display-12.23": "parau",
  "Pu-web-2.5-UK-Display-12.26-TCPA": "parau",
  "Pu-web-2.5-US-Display-1.8": "parau",
  "Pu-web-2.5-US-Display-12.25-TCPA": "parau",
  "Pu-web-IN-2.5-10.16-y99-y99页面-TCPA": "parau",
  "Pu-web-IN-2.5-12.4-竞品词集合": "parau",
  "Pu-web-IN-2.5-12.5-PMax-首页": "parau",
  "Pu-web-IN-2.5-emeraldchat-9.2重开-emeraldchat页-TCPA": "parau",
  "Pu-web-IN-2.5-flirt-12.8-首页": "parau",
  "pu-web-IN-2.5-功能词-6.23-首页-TCPA": "parau",
  "Pu-web-IN-2.5-功能词拓展1-6.16-首页": "parau",
  "pu-web-IN-2.5-品牌词-6.16": "parau",
  "pu-web-IN-2.5-竞品词-6.14重开": "parau",
  "Pu-web-IN-2.5-竞品词-6.20-首页-TCPA": "parau",
  "Pu-web-IN-3.0-7.17-chatrandom落地页-Troas": "parau",
  "Pu-web-IN-3.0-7.17-Ometv落地页-Troas": "parau",
  "Pu-web-IN-3.0-talk to strangers-7.21-omegel页-Troas": "parau",
  "Pu-web-巴西-2.5-功能词-9.2重开-葡语落地页-TCPA": "parau",
  "Pu-web-美国-2.5-6.14重开-功能词-TCPA": "parau"
};

// 前缀 → 产品 快速匹配（用于新 Campaign 或映射表中未列出的）
const PRODUCT_PREFIX_RULES = [
  { prefix: 'ft-', product: 'fachat' },
  { prefix: 'ft ', product: 'fachat' },
  { prefix: 'ppt-', product: 'pinkpinkchat' },
  { prefix: 'ppt ', product: 'pinkpinkchat' },
  { prefix: 'pu-', product: 'parau' },
  { prefix: 'pu ', product: 'parau' },
];

// 各产品的品牌词（该词在自家产品是品牌词，在其他产品是竞品词）
const PRODUCT_BRAND_KEYWORDS = {
  fachat:        ['fachat', 'fachat app', 'face chat'],
  parau:         ['parau', 'parau app'],
  pinkpinkchat:  ['pinkpinkchat', 'pinkpink', 'pptalk', 'pink pink chat'],
};

/**
 * 根据 campaign 名称获取产品
 * 优先精确匹配映射表，fallback 到前缀规则
 */
function getCampaignProduct(campName) {
  if (!campName) return '未知';
  if (CAMPAIGN_PRODUCT_MAP[campName]) return CAMPAIGN_PRODUCT_MAP[campName];
  var lower = campName.toLowerCase();
  for (var i = 0; i < PRODUCT_PREFIX_RULES.length; i++) {
    if (lower.startsWith(PRODUCT_PREFIX_RULES[i].prefix)) return PRODUCT_PREFIX_RULES[i].product;
  }
  return '未知';
}

/**
 * 判断一个关键词对某产品来说是什么身份
 * 返回: 'brand'(自家品牌词) | 'competitor'(竞品词) | 'generic'(通用词)
 */
function getKeywordRole(keyword, product) {
  if (!keyword || !product) return 'generic';
  var kwLower = keyword.toLowerCase().trim();
  var products = Object.keys(PRODUCT_BRAND_KEYWORDS);
  for (var i = 0; i < products.length; i++) {
    var brandWords = PRODUCT_BRAND_KEYWORDS[products[i]];
    if (brandWords.some(function(bw) { return kwLower === bw || kwLower.includes(bw); })) {
      return products[i] === product ? 'brand' : 'competitor';
    }
  }
  return 'generic';
}

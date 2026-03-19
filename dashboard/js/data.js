/**
 * Web 投放数据后台 - 数据层
 * [REAL] = 来自 BI 真实数据
 * [MOCK] = 模拟数据，待替换为 ADW 导出
 */

// ============================================================
// [REAL] Campaign 汇总数据 (2026-02-01 ~ 2026-03-18, from BI)
// ============================================================
const CAMPAIGN_SUMMARY = [
  { id: "ft-us-display", name: "Ft-web-US-2.5-Display-12.26-homepage", product: "Ft", country: "US", type: "Display", bidding: "tCPA", targetCPA: 15, newUsers: 13375, newAndroid: 1055, newIOS: 10007, newPayUsers: 613, newRevenue: 2096.76, oldPayUsers: 732, oldRevenue: 8874.51, totalJID: 1345, spend: 14377.68, totalRevenue: 10971.27, roas: 0.76, newCPA: 23.45, arppu: 3.42, androidPayRate: "2.09%", iosPayRate: "5.91%", landingPage: "https://www.fachatapp.com/" },
  { id: "ft-uk-display", name: "Ft-web-UK-2.5-Display-1.3-homepage", product: "Ft", country: "UK", type: "Display", bidding: "tCPA", targetCPA: 15, newUsers: 4170, newAndroid: 262, newIOS: 3369, newPayUsers: 340, newRevenue: 1117.54, oldPayUsers: 181, oldRevenue: 1097.17, totalJID: 521, spend: 4569.37, totalRevenue: 2214.72, roas: 0.48, newCPA: 13.44, arppu: 3.29, androidPayRate: "2.67%", iosPayRate: "9.88%", landingPage: "https://www.fachatapp.com/" },
  { id: "ft-in-search", name: "ft-web-IN-2.5-广泛-1.17-功能词-首页-TCPA", product: "Ft", country: "IN", type: "Search", bidding: "MaxConv", targetCPA: 140, newUsers: 1869, newAndroid: 370, newIOS: 1059, newPayUsers: 69, newRevenue: 259.90, oldPayUsers: 847, oldRevenue: 8441.51, totalJID: 916, spend: 2442.94, totalRevenue: 8701.41, roas: 3.56, newCPA: 35.40, arppu: 3.77, androidPayRate: "1.35%", iosPayRate: "6.04%", landingPage: "https://www.fachatapp.com/" },
  { id: "pu-in-display", name: "Pu-web-2.5-IN-Display-12.23", product: "Pu", country: "IN", type: "Display", bidding: "tCPA", targetCPA: 105, newUsers: 32653, newAndroid: 22788, newIOS: 3606, newPayUsers: 330, newRevenue: 627.30, oldPayUsers: 270, oldRevenue: 1381.26, totalJID: 600, spend: 8057.36, totalRevenue: 2008.57, roas: 0.25, newCPA: 24.42, arppu: 1.90, androidPayRate: "0.86%", iosPayRate: "3.74%", landingPage: "https://parau.vip/" },
  { id: "pu-in-emerald", name: "Pu-web-IN-2.5-emeraldchat-9.2重开-emeraldchat页-TCPA", product: "Pu", country: "IN", type: "Search", bidding: "MaxConv", targetCPA: 91, newUsers: 2475, newAndroid: 1008, newIOS: 1127, newPayUsers: 119, newRevenue: 213.00, oldPayUsers: 523, oldRevenue: 3220.23, totalJID: 642, spend: 2139.04, totalRevenue: 3433.23, roas: 1.61, newCPA: 17.98, arppu: 1.79, androidPayRate: "2.08%", iosPayRate: "8.70%", landingPage: "https://parau.vip/" },
  { id: "pu-in-func", name: "pu-web-IN-2.5-功能词-6.23-首页-TCPA", product: "Pu", country: "IN", type: "Search", bidding: "MaxConv", targetCPA: 140, newUsers: 4073, newAndroid: 2161, newIOS: 1311, newPayUsers: 99, newRevenue: 158.27, oldPayUsers: 219, oldRevenue: 1478.98, totalJID: 318, spend: 1900.87, totalRevenue: 1637.24, roas: 0.86, newCPA: 19.20, arppu: 1.60, androidPayRate: "1.30%", iosPayRate: "5.42%", landingPage: "https://parau.vip/" },
  { id: "pu-in-brand", name: "pu-web-IN-2.5-品牌词-6.16", product: "Pu", country: "IN", type: "Search", bidding: "MaxConv", targetCPA: null, newUsers: 2688, newAndroid: 739, newIOS: 1720, newPayUsers: 155, newRevenue: 328.60, oldPayUsers: 2575, oldRevenue: 23084.42, totalJID: 2730, spend: 2440.72, totalRevenue: 23413.01, roas: 9.59, newCPA: 15.75, arppu: 2.12, androidPayRate: "4.87%", iosPayRate: "6.92%", landingPage: "https://parau.vip/" },
  { id: "pu-in-comp", name: "pu-web-IN-2.5-竞品词-6.14重开", product: "Pu", country: "IN", type: "Search", bidding: "MaxConv", targetCPA: null, newUsers: 12146, newAndroid: 4904, newIOS: 5394, newPayUsers: 470, newRevenue: 1250.04, oldPayUsers: 801, oldRevenue: 5259.84, totalJID: 1271, spend: 7943.98, totalRevenue: 6509.88, roas: 0.82, newCPA: 16.90, arppu: 2.66, androidPayRate: "1.96%", iosPayRate: "6.95%", landingPage: "https://parau.vip/" },
  { id: "pu-us-func", name: "Pu-web-美国-2.5-6.14重开-功能词-TCPA", product: "Pu", country: "US", type: "Search", bidding: "MaxConv", targetCPA: 224, newUsers: 3051, newAndroid: 38, newIOS: 2540, newPayUsers: 221, newRevenue: 863.11, oldPayUsers: 273, oldRevenue: 2315.62, totalJID: 494, spend: 4438.28, totalRevenue: 3178.73, roas: 0.72, newCPA: 20.08, arppu: 3.91, androidPayRate: "0.0%", iosPayRate: "8.70%", landingPage: "https://parau.vip/" },
  { id: "pu-us-display", name: "Pu-web-2.5-US-Display-1.8", product: "Pu", country: "US", type: "Display", bidding: "tCPA", targetCPA: null, newUsers: 106, newAndroid: 0, newIOS: 0, newPayUsers: 2, newRevenue: 4.60, oldPayUsers: 24, oldRevenue: 251.97, totalJID: 26, spend: 99.15, totalRevenue: 256.57, roas: 2.59, newCPA: 49.57, arppu: 2.30, androidPayRate: "--", iosPayRate: "--", landingPage: "https://parau.vip/" },
  { id: "ppt-ar-pmax", name: "Ppt-web-2.5-AR+UAE+IL+QA-2.3", product: "Ppt", country: "ME", type: "Pmax", bidding: "MaxConv", targetCPA: 28, newUsers: 10540, newAndroid: 1753, newIOS: 6005, newPayUsers: 604, newRevenue: 2379.64, oldPayUsers: 467, oldRevenue: 3489.79, totalJID: 1071, spend: 5542.96, totalRevenue: 5869.43, roas: 1.06, newCPA: 9.18, arppu: 3.94, androidPayRate: "3.14%", iosPayRate: "9.14%", landingPage: "https://www.pinkpinkchat.com/" },
  { id: "ppt-ar-2", name: "Ppt-web-2.5-AR+UAE+IL+QA-2.10-AR", product: "Ppt", country: "ME", type: "Search", bidding: "MaxConv", targetCPA: null, newUsers: 837, newAndroid: 134, newIOS: 695, newPayUsers: 42, newRevenue: 184.64, oldPayUsers: 19, oldRevenue: 127.84, totalJID: 61, spend: 954.34, totalRevenue: 312.48, roas: 0.33, newCPA: 22.72, arppu: 4.40, androidPayRate: "0.75%", iosPayRate: "5.90%", landingPage: "https://www.pinkpinkchat.com/" },
  { id: "ppt-uk-search", name: "Ppt-web-UK-2.5-1.18-homepage", product: "Ppt", country: "UK", type: "Search", bidding: "MaxConv", targetCPA: null, newUsers: 6282, newAndroid: 131, newIOS: 4389, newPayUsers: 646, newRevenue: 1796.43, oldPayUsers: 299, oldRevenue: 1329.95, totalJID: 945, spend: 5657.71, totalRevenue: 3126.39, roas: 0.55, newCPA: 8.76, arppu: 2.78, androidPayRate: "8.40%", iosPayRate: "14.47%", landingPage: "https://www.pinkpinkchat.com/" },
  { id: "ppt-uk-display", name: "Ppt-web-UK-2.5-Display-1.28-homepage", product: "Ppt", country: "UK", type: "Display", bidding: "tCPA", targetCPA: null, newUsers: 130, newAndroid: 0, newIOS: 14, newPayUsers: 11, newRevenue: 58.63, oldPayUsers: 19, oldRevenue: 169.54, totalJID: 30, spend: 369.46, totalRevenue: 228.16, roas: 0.62, newCPA: 33.59, arppu: 5.33, androidPayRate: "--", iosPayRate: "71.43%", landingPage: "https://www.pinkpinkchat.com/" },
  { id: "ppt-uk-comp", name: "Ppt-web-UK-2.5-竞品词-2.2-homepage", product: "Ppt", country: "UK", type: "Search", bidding: "MaxConv", targetCPA: null, newUsers: 2000, newAndroid: 49, newIOS: 1453, newPayUsers: 176, newRevenue: 509.23, oldPayUsers: 59, oldRevenue: 309.30, totalJID: 235, spend: 1946.10, totalRevenue: 818.54, roas: 0.42, newCPA: 11.06, arppu: 2.89, androidPayRate: "8.16%", iosPayRate: "11.84%", landingPage: "https://www.pinkpinkchat.com/" },
  { id: "ppt-us-search", name: "Ppt-web-US-2.5-1.17-homepage", product: "Ppt", country: "US", type: "Search", bidding: "MaxConv", targetCPA: null, newUsers: 9283, newAndroid: 212, newIOS: 6339, newPayUsers: 520, newRevenue: 1713.25, oldPayUsers: 205, oldRevenue: 1682.36, totalJID: 725, spend: 5260.64, totalRevenue: 3395.62, roas: 0.65, newCPA: 10.12, arppu: 3.29, androidPayRate: "3.77%", iosPayRate: "8.09%", landingPage: "https://www.pinkpinkchat.com/" },
  { id: "ppt-us-pmax", name: "Ppt-web-US-2.5-Pmax-1.20-homepage", product: "Ppt", country: "US", type: "Pmax", bidding: "MaxConv", targetCPA: null, newUsers: 9893, newAndroid: 890, newIOS: 6227, newPayUsers: 461, newRevenue: 1733.05, oldPayUsers: 255, oldRevenue: 1538.25, totalJID: 716, spend: 4911.32, totalRevenue: 3271.30, roas: 0.67, newCPA: 10.65, arppu: 3.76, androidPayRate: "1.80%", iosPayRate: "7.15%", landingPage: "https://www.pinkpinkchat.com/" },
  { id: "ppt-us-comp", name: "Ppt-web-US-2.5-竞品词-1.28-homepage", product: "Ppt", country: "US", type: "Search", bidding: "MaxConv", targetCPA: null, newUsers: 3946, newAndroid: 59, newIOS: 2747, newPayUsers: 289, newRevenue: 1050.09, oldPayUsers: 75, oldRevenue: 529.81, totalJID: 364, spend: 2986.17, totalRevenue: 1579.90, roas: 0.53, newCPA: 10.33, arppu: 3.63, androidPayRate: "0.0%", iosPayRate: "10.52%", landingPage: "https://www.pinkpinkchat.com/" },
];

// ============================================================
// [REAL] Ft-web-US-Display 每日数据 (from BI)
// ============================================================
const FT_US_DISPLAY_DAILY = [
  { date: "2026-02-01", newUsers: 0, newAndroid: 0, newIOS: 0, newPay: 0, newRev: 0, oldPay: 11, oldRev: 84.37, spend: 0, totalRev: 84.37, roas: null },
  { date: "2026-02-02", newUsers: 0, newAndroid: 0, newIOS: 0, newPay: 0, newRev: 0, oldPay: 13, oldRev: 218.23, spend: 0, totalRev: 218.23, roas: null },
  { date: "2026-02-03", newUsers: 148, newAndroid: 0, newIOS: 0, newPay: 9, newRev: 13.11, oldPay: 12, oldRev: 185.85, spend: 156.49, totalRev: 198.96, roas: 1.27 },
  { date: "2026-02-04", newUsers: 204, newAndroid: 0, newIOS: 0, newPay: 12, newRev: 45.96, oldPay: 13, oldRev: 60.15, spend: 215.01, totalRev: 106.11, roas: 0.49 },
  { date: "2026-02-05", newUsers: 232, newAndroid: 0, newIOS: 0, newPay: 9, newRev: 34.32, oldPay: 13, oldRev: 91.89, spend: 183.84, totalRev: 126.20, roas: 0.69 },
  { date: "2026-02-06", newUsers: 230, newAndroid: 0, newIOS: 0, newPay: 10, newRev: 23.63, oldPay: 8, oldRev: 80.39, spend: 187.71, totalRev: 104.03, roas: 0.55 },
  { date: "2026-02-07", newUsers: 259, newAndroid: 0, newIOS: 0, newPay: 15, newRev: 91.85, oldPay: 19, oldRev: 155.74, spend: 223.25, totalRev: 247.58, roas: 1.11 },
  { date: "2026-02-08", newUsers: 377, newAndroid: 0, newIOS: 0, newPay: 18, newRev: 34.87, oldPay: 12, oldRev: 203.97, spend: 233.79, totalRev: 238.85, roas: 1.02 },
  { date: "2026-02-09", newUsers: 440, newAndroid: 0, newIOS: 0, newPay: 22, newRev: 63.88, oldPay: 19, oldRev: 268.38, spend: 263.01, totalRev: 332.26, roas: 1.26 },
  { date: "2026-02-10", newUsers: 423, newAndroid: 0, newIOS: 0, newPay: 15, newRev: 45.68, oldPay: 21, oldRev: 129.54, spend: 212.75, totalRev: 175.22, roas: 0.82 },
  { date: "2026-02-11", newUsers: 465, newAndroid: 16, newIOS: 449, newPay: 28, newRev: 90.18, oldPay: 14, oldRev: 81.92, spend: 361.96, totalRev: 172.10, roas: 0.48 },
  { date: "2026-02-12", newUsers: 399, newAndroid: 4, newIOS: 395, newPay: 27, newRev: 120.41, oldPay: 13, oldRev: 149.93, spend: 317.43, totalRev: 270.34, roas: 0.85 },
  { date: "2026-02-13", newUsers: 422, newAndroid: 7, newIOS: 415, newPay: 40, newRev: 195.93, oldPay: 20, oldRev: 141.65, spend: 357.06, totalRev: 337.58, roas: 0.95 },
  { date: "2026-02-14", newUsers: 452, newAndroid: 10, newIOS: 442, newPay: 15, newRev: 80.30, oldPay: 24, oldRev: 195.21, spend: 370.96, totalRev: 275.50, roas: 0.74 },
  { date: "2026-02-15", newUsers: 419, newAndroid: 11, newIOS: 408, newPay: 12, newRev: 26.13, oldPay: 19, oldRev: 319.60, spend: 381.62, totalRev: 345.73, roas: 0.91 },
  { date: "2026-02-16", newUsers: 687, newAndroid: 10, newIOS: 677, newPay: 26, newRev: 60.97, oldPay: 24, oldRev: 208.72, spend: 368.41, totalRev: 269.69, roas: 0.73 },
  { date: "2026-02-17", newUsers: 535, newAndroid: 19, newIOS: 516, newPay: 22, newRev: 119.10, oldPay: 27, oldRev: 137.88, spend: 357.65, totalRev: 256.98, roas: 0.72 },
  { date: "2026-02-18", newUsers: 496, newAndroid: 11, newIOS: 485, newPay: 32, newRev: 71.39, oldPay: 18, oldRev: 84.52, spend: 400.49, totalRev: 155.91, roas: 0.39 },
  { date: "2026-02-19", newUsers: 198, newAndroid: 24, newIOS: 174, newPay: 13, newRev: 48.36, oldPay: 17, oldRev: 224.85, spend: 160.04, totalRev: 273.21, roas: 1.71 },
  { date: "2026-02-20", newUsers: 265, newAndroid: 55, newIOS: 210, newPay: 13, newRev: 23.73, oldPay: 23, oldRev: 526.93, spend: 652.63, totalRev: 550.66, roas: 0.84 },
  { date: "2026-02-21", newUsers: 155, newAndroid: 21, newIOS: 134, newPay: 6, newRev: 15.40, oldPay: 15, oldRev: 183.69, spend: 433.21, totalRev: 199.09, roas: 0.46 },
  { date: "2026-02-22", newUsers: 208, newAndroid: 28, newIOS: 180, newPay: 13, newRev: 26.32, oldPay: 12, oldRev: 124.04, spend: 384.56, totalRev: 150.37, roas: 0.39 },
  { date: "2026-02-23", newUsers: 120, newAndroid: 10, newIOS: 110, newPay: 5, newRev: 12.17, oldPay: 13, oldRev: 90.36, spend: 362.85, totalRev: 102.53, roas: 0.28 },
  { date: "2026-02-24", newUsers: 111, newAndroid: 17, newIOS: 94, newPay: 5, newRev: 11.51, oldPay: 14, oldRev: 121.54, spend: 461.99, totalRev: 133.05, roas: 0.29 },
  { date: "2026-02-25", newUsers: 175, newAndroid: 34, newIOS: 141, newPay: 11, newRev: 56.63, oldPay: 13, oldRev: 239.59, spend: 401.13, totalRev: 296.21, roas: 0.74 },
  { date: "2026-02-26", newUsers: 265, newAndroid: 47, newIOS: 218, newPay: 12, newRev: 16.43, oldPay: 15, oldRev: 432.85, spend: 421.69, totalRev: 449.29, roas: 1.07 },
  { date: "2026-02-27", newUsers: 221, newAndroid: 42, newIOS: 179, newPay: 9, newRev: 36.52, oldPay: 17, oldRev: 200.58, spend: 410.22, totalRev: 237.10, roas: 0.58 },
  { date: "2026-02-28", newUsers: 224, newAndroid: 51, newIOS: 173, newPay: 6, newRev: 27.53, oldPay: 16, oldRev: 335.29, spend: 340.40, totalRev: 362.82, roas: 1.07 },
  { date: "2026-03-01", newUsers: 264, newAndroid: 59, newIOS: 205, newPay: 5, newRev: 3.92, oldPay: 18, oldRev: 158.04, spend: 351.25, totalRev: 161.96, roas: 0.46 },
  { date: "2026-03-02", newUsers: 371, newAndroid: 43, newIOS: 328, newPay: 10, newRev: 31.98, oldPay: 19, oldRev: 106.58, spend: 395.57, totalRev: 138.56, roas: 0.35 },
  { date: "2026-03-03", newUsers: 316, newAndroid: 46, newIOS: 270, newPay: 13, newRev: 61.71, oldPay: 18, oldRev: 230.94, spend: 355.46, totalRev: 292.65, roas: 0.82 },
  { date: "2026-03-04", newUsers: 341, newAndroid: 50, newIOS: 291, newPay: 12, newRev: 33.88, oldPay: 12, oldRev: 283.89, spend: 300.92, totalRev: 317.77, roas: 1.06 },
  { date: "2026-03-05", newUsers: 253, newAndroid: 31, newIOS: 222, newPay: 14, newRev: 51.74, oldPay: 25, oldRev: 184.64, spend: 299.44, totalRev: 236.38, roas: 0.79 },
  { date: "2026-03-06", newUsers: 359, newAndroid: 50, newIOS: 309, newPay: 14, newRev: 55.61, oldPay: 13, oldRev: 177.03, spend: 492.16, totalRev: 232.63, roas: 0.47 },
  { date: "2026-03-07", newUsers: 198, newAndroid: 26, newIOS: 172, newPay: 9, newRev: 15.79, oldPay: 17, oldRev: 279.94, spend: 362.81, totalRev: 295.73, roas: 0.82 },
  { date: "2026-03-08", newUsers: 290, newAndroid: 48, newIOS: 242, newPay: 9, newRev: 23.78, oldPay: 18, oldRev: 187.51, spend: 361.41, totalRev: 211.28, roas: 0.58 },
  { date: "2026-03-09", newUsers: 387, newAndroid: 57, newIOS: 330, newPay: 19, newRev: 66.41, oldPay: 15, oldRev: 349.00, spend: 385.64, totalRev: 415.41, roas: 1.08 },
  { date: "2026-03-10", newUsers: 336, newAndroid: 42, newIOS: 294, newPay: 13, newRev: 23.61, oldPay: 14, oldRev: 138.68, spend: 337.88, totalRev: 162.30, roas: 0.48 },
  { date: "2026-03-11", newUsers: 283, newAndroid: 38, newIOS: 245, newPay: 9, newRev: 45.21, oldPay: 16, oldRev: 115.95, spend: 364.32, totalRev: 161.16, roas: 0.44 },
  { date: "2026-03-12", newUsers: 253, newAndroid: 21, newIOS: 232, newPay: 10, newRev: 38.22, oldPay: 10, oldRev: 260.94, spend: 378.54, totalRev: 299.16, roas: 0.79 },
  { date: "2026-03-13", newUsers: 268, newAndroid: 24, newIOS: 244, newPay: 9, newRev: 23.24, oldPay: 19, oldRev: 372.12, spend: 306.14, totalRev: 395.36, roas: 1.29 },
  { date: "2026-03-14", newUsers: 279, newAndroid: 25, newIOS: 254, newPay: 18, newRev: 136.93, oldPay: 20, oldRev: 339.99, spend: 322.46, totalRev: 476.92, roas: 1.48 },
  { date: "2026-03-15", newUsers: 208, newAndroid: 12, newIOS: 196, newPay: 7, newRev: 15.19, oldPay: 11, oldRev: 201.41, spend: 240.62, totalRev: 216.60, roas: 0.90 },
  { date: "2026-03-16", newUsers: 233, newAndroid: 22, newIOS: 211, newPay: 9, newRev: 13.54, oldPay: 13, oldRev: 77.85, spend: 202.87, totalRev: 91.39, roas: 0.45 },
  { date: "2026-03-17", newUsers: 283, newAndroid: 19, newIOS: 264, newPay: 13, newRev: 31.07, oldPay: 10, oldRev: 35.42, spend: 300.07, totalRev: 66.49, roas: 0.22 },
];

// ============================================================
// [MOCK] ADW 展示位置报告 - Ft-web-US-Display
// ============================================================
const MOCK_PLACEMENTS_FT_US = {
  _isMock: true,
  campaign: "Ft-web-US-2.5-Display-12.26-homepage",
  data: [
    { placement: "mobileapp::2-com.bingo.live", type: "移动应用", impressions: 185420, clicks: 3250, cost: 2180.50, conversions: 12, convRate: "0.37%", cpc: 0.67 },
    { placement: "mobileapp::2-com.chat.random.video", type: "移动应用", impressions: 142300, clicks: 2890, cost: 1950.30, conversions: 45, convRate: "1.56%", cpc: 0.67 },
    { placement: "mobileapp::2-com.game.puzzle.free", type: "移动应用", impressions: 128750, clicks: 2100, cost: 1680.20, conversions: 5, convRate: "0.24%", cpc: 0.80 },
    { placement: "youtube.com", type: "网站", impressions: 98500, clicks: 1850, cost: 1420.80, conversions: 38, convRate: "2.05%", cpc: 0.77 },
    { placement: "mobileapp::2-com.social.dating.app", type: "移动应用", impressions: 95200, clicks: 1780, cost: 1280.60, conversions: 52, convRate: "2.92%", cpc: 0.72 },
    { placement: "mobileapp::2-com.kids.drawing.game", type: "移动应用", impressions: 88600, clicks: 1950, cost: 1150.40, conversions: 2, convRate: "0.10%", cpc: 0.59 },
    { placement: "omegle-alternative.com", type: "网站", impressions: 45200, clicks: 980, cost: 820.50, conversions: 35, convRate: "3.57%", cpc: 0.84 },
    { placement: "mobileapp::2-com.news.reader.daily", type: "移动应用", impressions: 72100, clicks: 1250, cost: 780.30, conversions: 8, convRate: "0.64%", cpc: 0.62 },
    { placement: "chatroulette.com", type: "网站", impressions: 32400, clicks: 720, cost: 650.20, conversions: 28, convRate: "3.89%", cpc: 0.90 },
    { placement: "mobileapp::2-com.vpn.free.proxy", type: "移动应用", impressions: 65800, clicks: 1100, cost: 620.40, conversions: 3, convRate: "0.27%", cpc: 0.56 },
    { placement: "mobileapp::2-com.match.dating", type: "移动应用", impressions: 38900, clicks: 680, cost: 540.30, conversions: 22, convRate: "3.24%", cpc: 0.79 },
    { placement: "mobileapp::2-com.ringtone.maker", type: "移动应用", impressions: 52300, clicks: 890, cost: 480.60, conversions: 1, convRate: "0.11%", cpc: 0.54 },
    { placement: "random-video-chat.net", type: "网站", impressions: 18500, clicks: 420, cost: 380.20, conversions: 18, convRate: "4.29%", cpc: 0.91 },
    { placement: "mobileapp::2-com.wallpaper.hd.free", type: "移动应用", impressions: 48200, clicks: 780, cost: 350.80, conversions: 0, convRate: "0.0%", cpc: 0.45 },
    { placement: "其他（合计82个位置）", type: "混合", impressions: 220000, clicks: 3800, cost: 1092.50, conversions: 15, convRate: "0.39%", cpc: 0.29 },
  ]
};

// ============================================================
// [MOCK] ADW 搜索词报告 - Ppt-web-US-Search
// ============================================================
const MOCK_SEARCH_TERMS_PPT_US = {
  _isMock: true,
  campaign: "Ppt-web-US-2.5-1.17-homepage",
  data: [
    { term: "random video chat", matchType: "广泛匹配", impressions: 12500, clicks: 890, cost: 720.30, conversions: 48, cpc: 0.81, convRate: "5.39%" },
    { term: "talk to strangers online", matchType: "广泛匹配", impressions: 9800, clicks: 650, cost: 580.20, conversions: 35, cpc: 0.89, convRate: "5.38%" },
    { term: "omegle alternative", matchType: "词组匹配", impressions: 8200, clicks: 720, cost: 650.80, conversions: 42, cpc: 0.90, convRate: "5.83%" },
    { term: "video chat with girls", matchType: "广泛匹配", impressions: 15600, clicks: 1200, cost: 890.50, conversions: 55, cpc: 0.74, convRate: "4.58%" },
    { term: "free video call app", matchType: "广泛匹配", impressions: 7500, clicks: 420, cost: 380.40, conversions: 12, cpc: 0.91, convRate: "2.86%" },
    { term: "chatroulette", matchType: "广泛匹配", impressions: 6800, clicks: 580, cost: 520.60, conversions: 30, cpc: 0.90, convRate: "5.17%" },
    { term: "random chat room", matchType: "广泛匹配", impressions: 5200, clicks: 310, cost: 260.30, conversions: 15, cpc: 0.84, convRate: "4.84%" },
    { term: "how to video call on laptop", matchType: "广泛匹配", impressions: 4800, clicks: 280, cost: 245.20, conversions: 3, cpc: 0.88, convRate: "1.07%" },
    { term: "zoom alternative free", matchType: "广泛匹配", impressions: 3500, clicks: 210, cost: 198.60, conversions: 2, cpc: 0.95, convRate: "0.95%" },
    { term: "online dating video", matchType: "广泛匹配", impressions: 6200, clicks: 380, cost: 320.50, conversions: 18, cpc: 0.84, convRate: "4.74%" },
    { term: "monkey app alternative", matchType: "广泛匹配", impressions: 3800, clicks: 290, cost: 265.40, conversions: 22, cpc: 0.92, convRate: "7.59%" },
    { term: "facetime for android", matchType: "广泛匹配", impressions: 4500, clicks: 350, cost: 310.80, conversions: 5, cpc: 0.89, convRate: "1.43%" },
    { term: "meet new people app", matchType: "广泛匹配", impressions: 3200, clicks: 180, cost: 156.30, conversions: 8, cpc: 0.87, convRate: "4.44%" },
    { term: "stranger chat app", matchType: "广泛匹配", impressions: 2800, clicks: 195, cost: 172.40, conversions: 12, cpc: 0.88, convRate: "6.15%" },
    { term: "其他（共 320 个搜索词）", matchType: "混合", impressions: 28500, clicks: 1680, cost: 1588.30, conversions: 42, cpc: 0.95, convRate: "2.50%" },
  ]
};

// ============================================================
// [MOCK] ADW 设备报告 - 全 Campaign
// ============================================================
const MOCK_DEVICE_DATA = {
  _isMock: true,
  data: [
    { campaign: "Ft-web-US-2.5-Display-12.26-homepage", desktop: { spend: 2150, conv: 180, revenue: 1850 }, mobile: { spend: 10800, conv: 920, revenue: 7800 }, tablet: { spend: 1428, conv: 245, revenue: 1321 } },
    { campaign: "Ft-web-UK-2.5-Display-1.3-homepage", desktop: { spend: 685, conv: 78, revenue: 520 }, mobile: { spend: 3420, conv: 380, revenue: 1450 }, tablet: { spend: 464, conv: 63, revenue: 245 } },
    { campaign: "Pu-web-2.5-IN-Display-12.23", desktop: { spend: 805, conv: 42, revenue: 280 }, mobile: { spend: 6850, conv: 510, revenue: 1580 }, tablet: { spend: 402, conv: 48, revenue: 149 } },
    { campaign: "Ppt-web-US-2.5-1.17-homepage", desktop: { spend: 2630, conv: 420, revenue: 2180 }, mobile: { spend: 2105, conv: 245, revenue: 980 }, tablet: { spend: 526, conv: 60, revenue: 236 } },
    { campaign: "Ppt-web-UK-2.5-1.18-homepage", desktop: { spend: 2830, conv: 520, revenue: 1950 }, mobile: { spend: 2260, conv: 340, revenue: 950 }, tablet: { spend: 568, conv: 85, revenue: 226 } },
    { campaign: "pu-web-IN-2.5-竞品词-6.14重开", desktop: { spend: 1190, conv: 180, revenue: 1250 }, mobile: { spend: 6360, conv: 980, revenue: 4850 }, tablet: { spend: 394, conv: 111, revenue: 410 } },
  ]
};

// ============================================================
// [MOCK] 关键词-落地页匹配分析数据
// ============================================================
const MOCK_LANDING_PAGE_DATA = {
  _isMock: true,
  products: {
    'Pu (Parau)': {
      currentDomain: 'parau.vip',
      campaigns: [
        { campaign: 'pu-IN-竞品词-6.14', type: 'Search', country: 'IN' },
        { campaign: 'pu-IN-品牌词-6.16', type: 'Search', country: 'IN' },
        { campaign: 'pu-IN-功能词-6.23', type: 'Search', country: 'IN' },
        { campaign: 'Pu-US-功能词-TCPA', type: 'Search', country: 'US' },
        { campaign: 'Pu-IN-emeraldchat-9.2', type: 'Search', country: 'IN' },
      ],
      pages: [
        { keyword: 'parau app', keywordGroup: '品牌词', currentPage: '/ (首页)', suggestedPage: '/ (首页)', bounceRate: 32, avgDuration: 52, registerRate: 14.2, payRate: 2.8, qs: 10, qsTrend: 'stable', status: 'optimal', suggestion: '维持，品牌词匹配度高' },
        { keyword: 'parau video call', keywordGroup: '品牌词', currentPage: '/ (首页)', suggestedPage: '/ (首页)', bounceRate: 35, avgDuration: 48, registerRate: 12.5, payRate: 2.1, qs: 9, qsTrend: 'stable', status: 'optimal', suggestion: '维持' },
        { keyword: 'omegle alternative', keywordGroup: '竞品词', currentPage: '/ (首页)', suggestedPage: '/omegle-alternative', bounceRate: 72, avgDuration: 18, registerRate: 3.2, payRate: 0.4, qs: 5, qsTrend: 'down', status: 'critical', suggestion: '建 /omegle-alternative，标题突出"Omegle已关闭？试试Parau"' },
        { keyword: 'omegle india', keywordGroup: '竞品词', currentPage: '/ (首页)', suggestedPage: '/omegle-alternative', bounceRate: 74, avgDuration: 15, registerRate: 2.8, payRate: 0.3, qs: 4, qsTrend: 'down', status: 'critical', suggestion: '同上，合并到 /omegle-alternative' },
        { keyword: 'emeraldchat alternative', keywordGroup: '竞品词', currentPage: '/ (首页)', suggestedPage: '/emeraldchat-alternative', bounceRate: 68, avgDuration: 22, registerRate: 4.1, payRate: 0.6, qs: 6, qsTrend: 'stable', status: 'warning', suggestion: '建 /emeraldchat-alternative，对比表突出差异' },
        { keyword: 'random video chat', keywordGroup: '功能词', currentPage: '/ (首页)', suggestedPage: '/random-video-chat', bounceRate: 65, avgDuration: 22, registerRate: 4.5, payRate: 0.6, qs: 6, qsTrend: 'down', status: 'warning', suggestion: '建 /random-video-chat，首屏强调随机匹配' },
        { keyword: 'video chat with strangers', keywordGroup: '功能词', currentPage: '/ (首页)', suggestedPage: '/random-video-chat', bounceRate: 67, avgDuration: 20, registerRate: 4.0, payRate: 0.5, qs: 5, qsTrend: 'down', status: 'critical', suggestion: '合并到 /random-video-chat' },
        { keyword: 'talk to strangers', keywordGroup: '功能词', currentPage: '/ (首页)', suggestedPage: '/talk-to-strangers', bounceRate: 63, avgDuration: 24, registerRate: 5.1, payRate: 0.7, qs: 6, qsTrend: 'stable', status: 'warning', suggestion: '建 /talk-to-strangers，SEO 高搜索量词' },
        { keyword: '1v1 video call', keywordGroup: '功能词', currentPage: '/ (首页)', suggestedPage: '/1v1-video-chat', bounceRate: 58, avgDuration: 28, registerRate: 6.2, payRate: 1.2, qs: 7, qsTrend: 'up', status: 'ok', suggestion: '可建 /1v1-video-chat 进一步优化' },
        { keyword: 'live video chat app', keywordGroup: '功能词', currentPage: '/ (首页)', suggestedPage: '/random-video-chat', bounceRate: 61, avgDuration: 25, registerRate: 5.5, payRate: 0.8, qs: 6, qsTrend: 'stable', status: 'warning', suggestion: '合并到 /random-video-chat' },
        { keyword: 'chatroulette alternative', keywordGroup: '竞品词', currentPage: '/ (首页)', suggestedPage: '/omegle-alternative', bounceRate: 70, avgDuration: 19, registerRate: 3.5, payRate: 0.5, qs: 5, qsTrend: 'down', status: 'critical', suggestion: '合并到 /omegle-alternative' },
        { keyword: 'video call with girls', keywordGroup: '功能词', currentPage: '/ (首页)', suggestedPage: '/meet-new-people', bounceRate: 76, avgDuration: 14, registerRate: 2.1, payRate: 0.2, qs: 4, qsTrend: 'down', status: 'critical', suggestion: '建 /meet-new-people，强调真人安全社交' },
      ]
    },
    'Ppt (PinkPinkChat)': {
      currentDomain: 'pinkpinkchat.com',
      campaigns: [
        { campaign: 'Ppt-UK-1.18-homepage', type: 'Search', country: 'UK' },
        { campaign: 'Ppt-US-1.17-homepage', type: 'Search', country: 'US' },
        { campaign: 'Ppt-UK-竞品词-2.2', type: 'Search', country: 'UK' },
        { campaign: 'Ppt-US-竞品词-1.28', type: 'Search', country: 'US' },
      ],
      pages: [
        { keyword: 'random video chat', keywordGroup: '功能词', currentPage: '/ (首页)', suggestedPage: '/random-video-chat', bounceRate: 62, avgDuration: 26, registerRate: 5.8, payRate: 1.1, qs: 7, qsTrend: 'stable', status: 'warning', suggestion: '建 /random-video-chat' },
        { keyword: 'live chat 1v1', keywordGroup: '功能词', currentPage: '/ (首页)', suggestedPage: '/1v1-live-chat', bounceRate: 55, avgDuration: 32, registerRate: 7.2, payRate: 1.5, qs: 8, qsTrend: 'up', status: 'ok', suggestion: '可建 /1v1-live-chat 提升 QS 至 9+' },
        { keyword: 'omegle replacement', keywordGroup: '竞品词', currentPage: '/ (首页)', suggestedPage: '/omegle-alternative', bounceRate: 69, avgDuration: 20, registerRate: 3.8, payRate: 0.6, qs: 5, qsTrend: 'down', status: 'critical', suggestion: '建 /omegle-alternative' },
        { keyword: 'chatrandom alternative', keywordGroup: '竞品词', currentPage: '/ (首页)', suggestedPage: '/omegle-alternative', bounceRate: 71, avgDuration: 18, registerRate: 3.2, payRate: 0.4, qs: 5, qsTrend: 'down', status: 'critical', suggestion: '合并到 /omegle-alternative' },
        { keyword: 'video chat app', keywordGroup: '功能词', currentPage: '/ (首页)', suggestedPage: '/video-chat-app', bounceRate: 60, avgDuration: 28, registerRate: 6.0, payRate: 1.0, qs: 7, qsTrend: 'stable', status: 'warning', suggestion: '建 /video-chat-app' },
        { keyword: 'meet strangers online', keywordGroup: '功能词', currentPage: '/ (首页)', suggestedPage: '/meet-new-people', bounceRate: 64, avgDuration: 24, registerRate: 5.2, payRate: 0.8, qs: 6, qsTrend: 'stable', status: 'warning', suggestion: '建 /meet-new-people' },
        { keyword: 'monkey app alternative', keywordGroup: '竞品词', currentPage: '/ (首页)', suggestedPage: '/best-video-chat-app', bounceRate: 66, avgDuration: 22, registerRate: 4.5, payRate: 0.7, qs: 6, qsTrend: 'stable', status: 'warning', suggestion: '建 /best-video-chat-app 评测页' },
        { keyword: 'camsurf alternative', keywordGroup: '竞品词', currentPage: '/ (首页)', suggestedPage: '/best-video-chat-app', bounceRate: 68, avgDuration: 21, registerRate: 4.0, payRate: 0.5, qs: 5, qsTrend: 'down', status: 'critical', suggestion: '合并到 /best-video-chat-app' },
      ]
    },
    'Ft (Fachat)': {
      currentDomain: 'fachatapp.com',
      campaigns: [
        { campaign: 'ft-IN-广泛-1.17-功能词', type: 'Search', country: 'IN' },
      ],
      pages: [
        { keyword: 'video call app', keywordGroup: '功能词', currentPage: '/ (首页)', suggestedPage: '/video-call-app', bounceRate: 59, avgDuration: 30, registerRate: 6.5, payRate: 1.3, qs: 7, qsTrend: 'stable', status: 'warning', suggestion: '建 /video-call-app' },
        { keyword: 'random video chat india', keywordGroup: '功能词', currentPage: '/ (首页)', suggestedPage: '/random-video-chat-india', bounceRate: 64, avgDuration: 23, registerRate: 5.0, payRate: 0.8, qs: 6, qsTrend: 'stable', status: 'warning', suggestion: '建地区专页 /random-video-chat-india' },
        { keyword: 'talk to strangers india', keywordGroup: '功能词', currentPage: '/ (首页)', suggestedPage: '/talk-to-strangers', bounceRate: 62, avgDuration: 25, registerRate: 5.3, payRate: 0.9, qs: 6, qsTrend: 'stable', status: 'warning', suggestion: '建 /talk-to-strangers' },
        { keyword: 'omegle indian', keywordGroup: '竞品词', currentPage: '/ (首页)', suggestedPage: '/omegle-alternative', bounceRate: 73, avgDuration: 16, registerRate: 2.9, payRate: 0.3, qs: 4, qsTrend: 'down', status: 'critical', suggestion: '建 /omegle-alternative' },
        { keyword: 'facetime for android', keywordGroup: '竞品词', currentPage: '/ (首页)', suggestedPage: '/facetime-alternative', bounceRate: 78, avgDuration: 12, registerRate: 1.8, payRate: 0.1, qs: 3, qsTrend: 'down', status: 'critical', suggestion: '建 /facetime-alternative，但搜索意图偏离，考虑否定' },
      ]
    },
  },
  suggestedLandingPages: [
    { path: '/omegle-alternative', priority: 'P0', products: ['Pu', 'Ppt', 'Ft'], keywordsServed: 6, estMonthlySavings: 2800, description: '"Omegle 已关闭？试试 XXX" - 竞品替代叙事，含对比表' },
    { path: '/random-video-chat', priority: 'P0', products: ['Pu', 'Ppt'], keywordsServed: 5, estMonthlySavings: 1500, description: '随机视频聊天功能页，首屏即 CTA' },
    { path: '/talk-to-strangers', priority: 'P1', products: ['Pu', 'Ft'], keywordsServed: 3, estMonthlySavings: 800, description: 'SEO 高流量词专页，内容型落地页' },
    { path: '/1v1-video-chat', priority: 'P1', products: ['Pu', 'Ppt'], keywordsServed: 2, estMonthlySavings: 500, description: '1对1 私密聊天卖点页' },
    { path: '/meet-new-people', priority: 'P2', products: ['Pu', 'Ppt'], keywordsServed: 2, estMonthlySavings: 400, description: '安全社交场景页，适合社交意图词' },
    { path: '/emeraldchat-alternative', priority: 'P2', products: ['Pu'], keywordsServed: 1, estMonthlySavings: 300, description: 'Emeraldchat 竞品专页' },
    { path: '/best-video-chat-app', priority: 'P2', products: ['Ppt'], keywordsServed: 2, estMonthlySavings: 350, description: '评测对比风格页，适合泛竞品词' },
    { path: '/facetime-alternative', priority: 'P3', products: ['Ft'], keywordsServed: 1, estMonthlySavings: 150, description: 'FaceTime 替代方案页（需评估搜索意图）' },
  ]
};

// ============================================================
// [MOCK] 落地页版本管理数据
// ============================================================
const LP_VERSION_DATA = {
  _isMock: true,
  sites: [
    {
      domain: 'parau.vip',
      product: 'Pu (Parau)',
      productShort: 'Pu',
      pages: [
        {
          path: '/',
          name: '首页',
          pageStatus: 'active',
          healthStatus: 'warning',
          versions: [
            {
              versionId: 'v2.0', name: 'CTA优化 + 安全标识',
              deployDate: '2026-03-10', endDate: null, isActive: true,
              changelog: '首屏CTA从Download改为Start Chat Now; 新增安全认证badge; 首屏增加在线用户数实时counter',
              metrics: { clicks: 3420, impressions: 48500, ctr: 7.05, avgCpc: 4.2, cost: 14364, bounceRate: 52.3, avgDuration: 38, pageLoadSpeed: 2.1, registerRate: 9.2, payRate: 1.8, qualityScore: 7, landingPageExp: '平均', cpa: 42, roas: 2.1 }
            },
            {
              versionId: 'v1.0', name: '初始版本',
              deployDate: '2026-01-15', endDate: '2026-03-09', isActive: false,
              changelog: '首次上线，通用介绍页',
              metrics: { clicks: 5800, impressions: 92000, ctr: 6.30, avgCpc: 5.1, cost: 29580, bounceRate: 64.5, avgDuration: 25, pageLoadSpeed: 3.2, registerRate: 5.8, payRate: 0.9, qualityScore: 5, landingPageExp: '低于平均', cpa: 68, roas: 1.2 }
            }
          ]
        },
        {
          path: '/omegle-alternative',
          name: 'Omegle替代页',
          pageStatus: 'active',
          healthStatus: 'optimal',
          versions: [
            {
              versionId: 'v1.1', name: '增加用户评价模块',
              deployDate: '2026-03-18', endDate: null, isActive: true,
              changelog: '新增真实用户评价section; 优化移动端适配; 首屏加载从2.4s降至1.6s',
              metrics: { clicks: 120, impressions: 1800, ctr: 6.67, avgCpc: 3.5, cost: 420, bounceRate: 42.1, avgDuration: 48, pageLoadSpeed: 1.6, registerRate: 13.2, payRate: 2.8, qualityScore: 9, landingPageExp: '高于平均', cpa: 24, roas: 4.1 }
            },
            {
              versionId: 'v1.0', name: '竞品替代叙事页',
              deployDate: '2026-03-08', endDate: '2026-03-17', isActive: false,
              changelog: '新建页面: "Omegle已关闭？试试Parau" 叙事 + 功能对比表 + CTA',
              metrics: { clicks: 280, impressions: 4200, ctr: 6.67, avgCpc: 3.8, cost: 1064, bounceRate: 48.5, avgDuration: 42, pageLoadSpeed: 2.4, registerRate: 11.5, payRate: 2.2, qualityScore: 8, landingPageExp: '高于平均', cpa: 28, roas: 3.5 }
            }
          ]
        },
        {
          path: '/random-video-chat',
          name: '随机视频聊天',
          pageStatus: 'active',
          healthStatus: 'ok',
          versions: [
            {
              versionId: 'v1.0', name: '功能型落地页',
              deployDate: '2026-03-12', endDate: null, isActive: true,
              changelog: '新建页面: 首屏展示随机匹配动画 + "Start Chat" CTA + 安全保障说明',
              metrics: { clicks: 350, impressions: 5600, ctr: 6.25, avgCpc: 3.9, cost: 1365, bounceRate: 51.2, avgDuration: 35, pageLoadSpeed: 2.0, registerRate: 10.1, payRate: 1.9, qualityScore: 7, landingPageExp: '平均', cpa: 36, roas: 2.8 }
            }
          ]
        },
        {
          path: '/emeraldchat-alternative',
          name: 'Emeraldchat替代页',
          pageStatus: 'planned',
          healthStatus: 'critical',
          versions: []
        },
        {
          path: '/talk-to-strangers',
          name: '陌生人社交页',
          pageStatus: 'planned',
          healthStatus: 'critical',
          versions: []
        }
      ]
    },
    {
      domain: 'pinkpinkchat.com',
      product: 'Ppt (PinkPinkChat)',
      productShort: 'Ppt',
      pages: [
        {
          path: '/',
          name: '首页',
          pageStatus: 'active',
          healthStatus: 'warning',
          versions: [
            {
              versionId: 'v2.1', name: '女性友好设计改版',
              deployDate: '2026-03-05', endDate: null, isActive: true,
              changelog: '粉色主题加深; 增加女性安全保障模块; 首屏改为"Meet Amazing People"',
              metrics: { clicks: 2100, impressions: 35000, ctr: 6.0, avgCpc: 6.8, cost: 14280, bounceRate: 55.8, avgDuration: 32, pageLoadSpeed: 2.3, registerRate: 8.5, payRate: 1.5, qualityScore: 6, landingPageExp: '平均', cpa: 52, roas: 1.8 }
            },
            {
              versionId: 'v2.0', name: '视频预览功能',
              deployDate: '2026-02-15', endDate: '2026-03-04', isActive: false,
              changelog: '首屏加入视频聊天预览动画; A/B测试CTA文案',
              metrics: { clicks: 1800, impressions: 32000, ctr: 5.63, avgCpc: 7.2, cost: 12960, bounceRate: 59.2, avgDuration: 28, pageLoadSpeed: 2.8, registerRate: 7.2, payRate: 1.2, qualityScore: 6, landingPageExp: '平均', cpa: 58, roas: 1.5 }
            },
            {
              versionId: 'v1.0', name: '初始版本',
              deployDate: '2026-01-10', endDate: '2026-02-14', isActive: false,
              changelog: '首次上线',
              metrics: { clicks: 3200, impressions: 58000, ctr: 5.52, avgCpc: 7.8, cost: 24960, bounceRate: 66.3, avgDuration: 22, pageLoadSpeed: 3.5, registerRate: 5.0, payRate: 0.7, qualityScore: 4, landingPageExp: '低于平均', cpa: 78, roas: 0.9 }
            }
          ]
        },
        {
          path: '/omegle-alternative',
          name: 'Omegle替代页',
          pageStatus: 'active',
          healthStatus: 'ok',
          versions: [
            {
              versionId: 'v1.0', name: '竞品替代页',
              deployDate: '2026-03-01', endDate: null, isActive: true,
              changelog: '新建页面: 面向UK/US市场的Omegle替代方案, 强调安全与女性友好',
              metrics: { clicks: 420, impressions: 6800, ctr: 6.18, avgCpc: 5.5, cost: 2310, bounceRate: 50.2, avgDuration: 38, pageLoadSpeed: 1.9, registerRate: 10.8, payRate: 2.0, qualityScore: 7, landingPageExp: '平均', cpa: 33, roas: 2.9 }
            }
          ]
        },
        {
          path: '/video-chat-app',
          name: '视频聊天应用页',
          pageStatus: 'planned',
          healthStatus: 'warning',
          versions: []
        },
        {
          path: '/best-video-chat-app',
          name: '评测对比页',
          pageStatus: 'planned',
          healthStatus: 'warning',
          versions: []
        }
      ]
    },
    {
      domain: 'fachatapp.com',
      product: 'Ft (Fachat)',
      productShort: 'Ft',
      pages: [
        {
          path: '/',
          name: '首页',
          pageStatus: 'active',
          healthStatus: 'warning',
          versions: [
            {
              versionId: 'v1.1', name: '印度本地化',
              deployDate: '2026-02-20', endDate: null, isActive: true,
              changelog: '增加Hindi语言支持; 显示₹价格; 增加印度用户testimonials',
              metrics: { clicks: 4500, impressions: 72000, ctr: 6.25, avgCpc: 2.8, cost: 12600, bounceRate: 58.5, avgDuration: 30, pageLoadSpeed: 2.5, registerRate: 7.8, payRate: 1.1, qualityScore: 6, landingPageExp: '平均', cpa: 45, roas: 1.6 }
            },
            {
              versionId: 'v1.0', name: '初始版本',
              deployDate: '2026-01-10', endDate: '2026-02-19', isActive: false,
              changelog: '首次上线，英文通用版',
              metrics: { clicks: 3800, impressions: 68000, ctr: 5.59, avgCpc: 3.2, cost: 12160, bounceRate: 65.8, avgDuration: 22, pageLoadSpeed: 3.0, registerRate: 5.2, payRate: 0.6, qualityScore: 4, landingPageExp: '低于平均', cpa: 62, roas: 1.0 }
            }
          ]
        },
        {
          path: '/omegle-alternative',
          name: 'Omegle替代页',
          pageStatus: 'planned',
          healthStatus: 'critical',
          versions: []
        },
        {
          path: '/random-video-chat-india',
          name: '印度视频聊天页',
          pageStatus: 'planned',
          healthStatus: 'warning',
          versions: []
        },
        {
          path: '/facetime-alternative',
          name: 'FaceTime替代页',
          pageStatus: 'planned',
          healthStatus: 'critical',
          versions: []
        }
      ]
    }
  ],

  keywordPageMap: [
    { keyword: 'parau app', keywordGroup: '品牌词', product: 'Pu', domain: 'parau.vip', currentPage: '/', suggestedPage: '/', matchScore: 95, bounceRate: 32, qs: 10, payRate: 2.8, status: 'optimal' },
    { keyword: 'parau video call', keywordGroup: '品牌词', product: 'Pu', domain: 'parau.vip', currentPage: '/', suggestedPage: '/', matchScore: 90, bounceRate: 35, qs: 9, payRate: 2.1, status: 'optimal' },
    { keyword: 'omegle alternative', keywordGroup: '竞品词', product: 'Pu', domain: 'parau.vip', currentPage: '/', suggestedPage: '/omegle-alternative', matchScore: 25, bounceRate: 72, qs: 5, payRate: 0.4, status: 'critical' },
    { keyword: 'omegle india', keywordGroup: '竞品词', product: 'Pu', domain: 'parau.vip', currentPage: '/', suggestedPage: '/omegle-alternative', matchScore: 20, bounceRate: 74, qs: 4, payRate: 0.3, status: 'critical' },
    { keyword: 'emeraldchat alternative', keywordGroup: '竞品词', product: 'Pu', domain: 'parau.vip', currentPage: '/', suggestedPage: '/emeraldchat-alternative', matchScore: 30, bounceRate: 68, qs: 6, payRate: 0.6, status: 'warning' },
    { keyword: 'random video chat', keywordGroup: '功能词', product: 'Pu', domain: 'parau.vip', currentPage: '/', suggestedPage: '/random-video-chat', matchScore: 35, bounceRate: 65, qs: 6, payRate: 0.6, status: 'warning' },
    { keyword: 'video chat with strangers', keywordGroup: '功能词', product: 'Pu', domain: 'parau.vip', currentPage: '/', suggestedPage: '/random-video-chat', matchScore: 30, bounceRate: 67, qs: 5, payRate: 0.5, status: 'critical' },
    { keyword: 'talk to strangers', keywordGroup: '功能词', product: 'Pu', domain: 'parau.vip', currentPage: '/', suggestedPage: '/talk-to-strangers', matchScore: 35, bounceRate: 63, qs: 6, payRate: 0.7, status: 'warning' },
    { keyword: '1v1 video call', keywordGroup: '功能词', product: 'Pu', domain: 'parau.vip', currentPage: '/', suggestedPage: '/', matchScore: 70, bounceRate: 58, qs: 7, payRate: 1.2, status: 'ok' },
    { keyword: 'chatroulette alternative', keywordGroup: '竞品词', product: 'Pu', domain: 'parau.vip', currentPage: '/', suggestedPage: '/omegle-alternative', matchScore: 22, bounceRate: 70, qs: 5, payRate: 0.5, status: 'critical' },
    { keyword: 'video call with girls', keywordGroup: '功能词', product: 'Pu', domain: 'parau.vip', currentPage: '/', suggestedPage: '/random-video-chat', matchScore: 28, bounceRate: 76, qs: 4, payRate: 0.2, status: 'critical' },

    { keyword: 'random video chat', keywordGroup: '功能词', product: 'Ppt', domain: 'pinkpinkchat.com', currentPage: '/', suggestedPage: '/video-chat-app', matchScore: 40, bounceRate: 62, qs: 7, payRate: 1.1, status: 'warning' },
    { keyword: 'live chat 1v1', keywordGroup: '功能词', product: 'Ppt', domain: 'pinkpinkchat.com', currentPage: '/', suggestedPage: '/', matchScore: 72, bounceRate: 55, qs: 8, payRate: 1.5, status: 'ok' },
    { keyword: 'omegle replacement', keywordGroup: '竞品词', product: 'Ppt', domain: 'pinkpinkchat.com', currentPage: '/', suggestedPage: '/omegle-alternative', matchScore: 28, bounceRate: 69, qs: 5, payRate: 0.6, status: 'critical' },
    { keyword: 'chatrandom alternative', keywordGroup: '竞品词', product: 'Ppt', domain: 'pinkpinkchat.com', currentPage: '/', suggestedPage: '/omegle-alternative', matchScore: 25, bounceRate: 71, qs: 5, payRate: 0.4, status: 'critical' },
    { keyword: 'video chat app', keywordGroup: '功能词', product: 'Ppt', domain: 'pinkpinkchat.com', currentPage: '/', suggestedPage: '/video-chat-app', matchScore: 38, bounceRate: 60, qs: 7, payRate: 1.0, status: 'warning' },
    { keyword: 'meet strangers online', keywordGroup: '功能词', product: 'Ppt', domain: 'pinkpinkchat.com', currentPage: '/', suggestedPage: '/video-chat-app', matchScore: 35, bounceRate: 64, qs: 6, payRate: 0.8, status: 'warning' },
    { keyword: 'monkey app alternative', keywordGroup: '竞品词', product: 'Ppt', domain: 'pinkpinkchat.com', currentPage: '/', suggestedPage: '/best-video-chat-app', matchScore: 30, bounceRate: 66, qs: 6, payRate: 0.7, status: 'warning' },
    { keyword: 'camsurf alternative', keywordGroup: '竞品词', product: 'Ppt', domain: 'pinkpinkchat.com', currentPage: '/', suggestedPage: '/best-video-chat-app', matchScore: 26, bounceRate: 68, qs: 5, payRate: 0.5, status: 'critical' },

    { keyword: 'video call app', keywordGroup: '功能词', product: 'Ft', domain: 'fachatapp.com', currentPage: '/', suggestedPage: '/', matchScore: 65, bounceRate: 59, qs: 7, payRate: 1.3, status: 'ok' },
    { keyword: 'random video chat india', keywordGroup: '功能词', product: 'Ft', domain: 'fachatapp.com', currentPage: '/', suggestedPage: '/random-video-chat-india', matchScore: 32, bounceRate: 64, qs: 6, payRate: 0.8, status: 'warning' },
    { keyword: 'talk to strangers india', keywordGroup: '功能词', product: 'Ft', domain: 'fachatapp.com', currentPage: '/', suggestedPage: '/', matchScore: 55, bounceRate: 62, qs: 6, payRate: 0.9, status: 'warning' },
    { keyword: 'omegle indian', keywordGroup: '竞品词', product: 'Ft', domain: 'fachatapp.com', currentPage: '/', suggestedPage: '/omegle-alternative', matchScore: 18, bounceRate: 73, qs: 4, payRate: 0.3, status: 'critical' },
    { keyword: 'facetime for android', keywordGroup: '竞品词', product: 'Ft', domain: 'fachatapp.com', currentPage: '/', suggestedPage: '/facetime-alternative', matchScore: 15, bounceRate: 78, qs: 3, payRate: 0.1, status: 'critical' },
  ]
};

// ============================================================
// [MOCK] A/B 测试数据
// ============================================================
const AB_TEST_DATA = {
  _isMock: true,
  testableElements: [
    { id: 'H1', name: '主标题', type: 'text' },
    { id: 'H2', name: '副标题', type: 'text' },
    { id: 'CTA_TEXT', name: 'CTA按钮文案', type: 'text' },
    { id: 'CTA_COLOR', name: 'CTA按钮颜色', type: 'color' },
    { id: 'HERO', name: '首屏主视觉', type: 'media' },
    { id: 'TRUST', name: '信任标识', type: 'component' },
    { id: 'SOCIAL_PROOF', name: '社会证明', type: 'component' },
    { id: 'LAYOUT', name: '页面布局', type: 'template' },
  ],

  tests: [
    {
      testId: 'ab-001',
      name: 'CTA文案 & 颜色优化',
      product: 'Pu', domain: 'parau.vip', pagePath: '/omegle-alternative', pageVersionId: 'v1.1',
      status: 'running', startDate: '2026-03-15', endDate: null, daysRunning: 3,
      trafficSplit: [50, 50], targetMetric: 'payRate', secondaryMetrics: ['registerRate', 'bounceRate', 'cpa'],
      minSampleSize: 1000, confidenceTarget: 95,
      variants: [
        {
          id: 'control', name: '对照组 (当前)', isControl: true,
          elements: { CTA_TEXT: 'Start Chatting Now', CTA_COLOR: '#6366f1', H1: 'Omegle Shut Down? Try Parau' },
          metrics: { visitors: 580, clicks: 320, bounceRate: 48.5, avgDuration: 42, registerRate: 11.5, payRate: 2.2, conversions: 13, revenue: 1862, cost: 532, cpa: 40.9, roas: 3.5 },
          dailyData: [
            { date: '03-15', visitors: 180, bounceRate: 49.2, registerRate: 10.8, payRate: 2.0 },
            { date: '03-16', visitors: 210, bounceRate: 48.0, registerRate: 11.9, payRate: 2.4 },
            { date: '03-17', visitors: 190, bounceRate: 48.3, registerRate: 11.8, payRate: 2.1 },
          ]
        },
        {
          id: 'variant-a', name: '变体A - 绿色CTA+直接文案', isControl: false,
          elements: { CTA_TEXT: 'Free Video Chat Now', CTA_COLOR: '#22c55e', H1: 'Omegle Shut Down? Try Parau' },
          metrics: { visitors: 560, clicks: 342, bounceRate: 44.2, avgDuration: 46, registerRate: 13.8, payRate: 2.9, conversions: 16, revenue: 2352, cost: 518, cpa: 32.4, roas: 4.5 },
          dailyData: [
            { date: '03-15', visitors: 175, bounceRate: 45.8, registerRate: 12.5, payRate: 2.6 },
            { date: '03-16', visitors: 200, bounceRate: 43.5, registerRate: 14.2, payRate: 3.1 },
            { date: '03-17', visitors: 185, bounceRate: 43.3, registerRate: 14.5, payRate: 3.0 },
          ]
        }
      ],
      result: {
        currentWinner: 'variant-a', confidence: 87.3,
        improvement: { payRate: '+31.8%', registerRate: '+20.0%', cpa: '-20.8%', bounceRate: '-8.9%' },
        recommendation: '变体A在所有核心指标上领先对照组。付费率提升31.8%，但统计显著性87.3%未达95%目标。建议继续运行3-5天至样本量达标。',
        canPromote: false
      }
    },
    {
      testId: 'ab-002',
      name: '首页 Headline A/B 测试',
      product: 'Ppt', domain: 'pinkpinkchat.com', pagePath: '/', pageVersionId: 'v2.1',
      status: 'completed', startDate: '2026-02-28', endDate: '2026-03-10', daysRunning: 10,
      trafficSplit: [50, 50], targetMetric: 'registerRate', secondaryMetrics: ['payRate', 'bounceRate'],
      minSampleSize: 2000, confidenceTarget: 95,
      variants: [
        {
          id: 'control', name: '对照组 - Meet Amazing People', isControl: true,
          elements: { H1: 'Meet Amazing People', H2: 'Safe & Fun 1v1 Video Chat' },
          metrics: { visitors: 3200, clicks: 1920, bounceRate: 56.2, avgDuration: 31, registerRate: 8.2, payRate: 1.4, conversions: 45, revenue: 4860, cost: 9600, cpa: 213, roas: 0.51 },
          dailyData: [
            { date: '02-28', visitors: 280, registerRate: 7.8, payRate: 1.2 }, { date: '03-01', visitors: 310, registerRate: 8.0, payRate: 1.3 },
            { date: '03-02', visitors: 325, registerRate: 8.1, payRate: 1.5 }, { date: '03-03', visitors: 340, registerRate: 8.5, payRate: 1.4 },
            { date: '03-04', visitors: 315, registerRate: 8.3, payRate: 1.3 }, { date: '03-05', visitors: 290, registerRate: 8.0, payRate: 1.5 },
            { date: '03-06', visitors: 335, registerRate: 8.4, payRate: 1.4 }, { date: '03-07', visitors: 320, registerRate: 8.2, payRate: 1.4 },
            { date: '03-08', visitors: 345, registerRate: 8.6, payRate: 1.5 }, { date: '03-09', visitors: 340, registerRate: 8.3, payRate: 1.5 },
          ]
        },
        {
          id: 'variant-a', name: '变体A - Find Your Vibe', isControl: false,
          elements: { H1: 'Find Your Vibe', H2: 'Live 1v1 Video Chat with Real People' },
          metrics: { visitors: 3150, clicks: 2016, bounceRate: 51.8, avgDuration: 36, registerRate: 11.5, payRate: 1.9, conversions: 60, revenue: 7020, cost: 9450, cpa: 157, roas: 0.74 },
          dailyData: [
            { date: '02-28', visitors: 275, registerRate: 10.2, payRate: 1.6 }, { date: '03-01', visitors: 305, registerRate: 10.8, payRate: 1.7 },
            { date: '03-02', visitors: 318, registerRate: 11.2, payRate: 1.9 }, { date: '03-03', visitors: 332, registerRate: 11.8, payRate: 2.0 },
            { date: '03-04', visitors: 310, registerRate: 11.5, payRate: 1.8 }, { date: '03-05', visitors: 285, registerRate: 11.0, payRate: 1.9 },
            { date: '03-06', visitors: 330, registerRate: 12.0, payRate: 2.1 }, { date: '03-07', visitors: 315, registerRate: 11.4, payRate: 1.9 },
            { date: '03-08', visitors: 340, registerRate: 12.2, payRate: 2.0 }, { date: '03-09', visitors: 340, registerRate: 11.8, payRate: 2.0 },
          ]
        }
      ],
      result: {
        currentWinner: 'variant-a', confidence: 98.7,
        improvement: { registerRate: '+40.2%', payRate: '+35.7%', bounceRate: '-7.8%', cpa: '-26.3%' },
        recommendation: '变体A "Find Your Vibe" 显著优于对照组，注册率提升40.2%，统计显著性98.7%。建议立即推广为正式版本。',
        canPromote: true, promotedAsVersion: null
      }
    },
    {
      testId: 'ab-003',
      name: '首屏布局三方案对比',
      product: 'Pu', domain: 'parau.vip', pagePath: '/random-video-chat', pageVersionId: 'v1.0',
      status: 'running', startDate: '2026-03-14', endDate: null, daysRunning: 4,
      trafficSplit: [34, 33, 33], targetMetric: 'registerRate', secondaryMetrics: ['payRate', 'bounceRate', 'avgDuration'],
      minSampleSize: 1500, confidenceTarget: 95,
      variants: [
        {
          id: 'control', name: '对照组 - 静态Hero图', isControl: true,
          elements: { HERO: '静态展示图', LAYOUT: '标准单栏布局' },
          metrics: { visitors: 420, clicks: 252, bounceRate: 51.2, avgDuration: 35, registerRate: 10.1, payRate: 1.9, conversions: 8, revenue: 960, cost: 546, cpa: 68, roas: 1.76 },
          dailyData: [
            { date: '03-14', visitors: 95, registerRate: 9.5, payRate: 1.8 }, { date: '03-15', visitors: 108, registerRate: 10.2, payRate: 2.0 },
            { date: '03-16', visitors: 112, registerRate: 10.5, payRate: 1.9 }, { date: '03-17', visitors: 105, registerRate: 10.3, payRate: 2.0 },
          ]
        },
        {
          id: 'variant-a', name: '变体A - 自动播放视频', isControl: false,
          elements: { HERO: '15秒产品预览视频(自动播放)', LAYOUT: '标准单栏布局' },
          metrics: { visitors: 410, clicks: 262, bounceRate: 46.8, avgDuration: 42, registerRate: 12.8, payRate: 2.3, conversions: 9, revenue: 1170, cost: 533, cpa: 59, roas: 2.20 },
          dailyData: [
            { date: '03-14', visitors: 92, registerRate: 11.5, payRate: 2.0 }, { date: '03-15', visitors: 105, registerRate: 13.0, payRate: 2.4 },
            { date: '03-16', visitors: 110, registerRate: 13.2, payRate: 2.5 }, { date: '03-17', visitors: 103, registerRate: 13.5, payRate: 2.2 },
          ]
        },
        {
          id: 'variant-b', name: '变体B - 实时匹配动画', isControl: false,
          elements: { HERO: '模拟实时匹配动画+倒计时', LAYOUT: '左右分栏布局' },
          metrics: { visitors: 405, clicks: 275, bounceRate: 43.5, avgDuration: 48, registerRate: 14.2, payRate: 2.6, conversions: 11, revenue: 1485, cost: 527, cpa: 48, roas: 2.82 },
          dailyData: [
            { date: '03-14', visitors: 90, registerRate: 13.0, payRate: 2.3 }, { date: '03-15', visitors: 103, registerRate: 14.5, payRate: 2.7 },
            { date: '03-16', visitors: 108, registerRate: 14.8, payRate: 2.8 }, { date: '03-17', visitors: 104, registerRate: 14.6, payRate: 2.5 },
          ]
        }
      ],
      result: {
        currentWinner: 'variant-b', confidence: 82.5,
        improvement: { registerRate: '+40.6%', payRate: '+36.8%', bounceRate: '-15.0%', avgDuration: '+37.1%' },
        recommendation: '变体B（实时匹配动画+左右分栏）在所有指标上大幅领先。但3变体测试需要更大样本量，当前82.5%未达标。预计还需5-7天。',
        canPromote: false
      }
    },
    {
      testId: 'ab-004',
      name: '印度本地化深度优化',
      product: 'Ft', domain: 'fachatapp.com', pagePath: '/', pageVersionId: 'v1.1',
      status: 'draft', startDate: null, endDate: null, daysRunning: 0,
      trafficSplit: [50, 50], targetMetric: 'registerRate', secondaryMetrics: ['payRate', 'bounceRate'],
      minSampleSize: 2000, confidenceTarget: 95,
      variants: [
        {
          id: 'control', name: '对照组 - 当前v1.1', isControl: true,
          elements: { H1: 'Random Video Chat', H2: 'Meet New Friends from India', SOCIAL_PROOF: '英文用户评价' },
          metrics: null, dailyData: []
        },
        {
          id: 'variant-a', name: '变体A - 完全Hindi化', isControl: false,
          elements: { H1: 'वीडियो कॉल करें (Hindi标题)', H2: 'भारत के नए दोस्तों से मिलें', SOCIAL_PROOF: 'Hindi用户评价+本地明星推荐' },
          metrics: null, dailyData: []
        }
      ],
      result: { currentWinner: null, confidence: 0, improvement: {}, recommendation: '草稿状态，测试尚未启动。', canPromote: false }
    },
    {
      testId: 'ab-005',
      name: '信任标识位置测试',
      product: 'Ppt', domain: 'pinkpinkchat.com', pagePath: '/omegle-alternative', pageVersionId: 'v1.0',
      status: 'paused', startDate: '2026-03-10', endDate: '2026-03-14', daysRunning: 4,
      trafficSplit: [50, 50], targetMetric: 'registerRate', secondaryMetrics: ['bounceRate'],
      minSampleSize: 1500, confidenceTarget: 95,
      variants: [
        {
          id: 'control', name: '对照组 - 底部信任栏', isControl: true,
          elements: { TRUST: '页面底部信任badge栏' },
          metrics: { visitors: 320, clicks: 198, bounceRate: 50.5, avgDuration: 37, registerRate: 10.6, payRate: 1.9, conversions: 6, revenue: 684, cost: 528, cpa: 88, roas: 1.30 },
          dailyData: [
            { date: '03-10', visitors: 75, registerRate: 10.2, payRate: 1.8 }, { date: '03-11', visitors: 82, registerRate: 10.8, payRate: 2.0 },
            { date: '03-12', visitors: 85, registerRate: 10.5, payRate: 1.9 }, { date: '03-13', visitors: 78, registerRate: 10.8, payRate: 1.9 },
          ]
        },
        {
          id: 'variant-a', name: '变体A - 首屏信任栏', isControl: false,
          elements: { TRUST: '首屏hero下方信任badge栏' },
          metrics: { visitors: 310, clicks: 199, bounceRate: 49.8, avgDuration: 38, registerRate: 11.0, payRate: 2.0, conversions: 6, revenue: 720, cost: 511, cpa: 85, roas: 1.41 },
          dailyData: [
            { date: '03-10', visitors: 72, registerRate: 10.5, payRate: 1.9 }, { date: '03-11', visitors: 80, registerRate: 11.2, payRate: 2.1 },
            { date: '03-12', visitors: 82, registerRate: 11.0, payRate: 2.0 }, { date: '03-13', visitors: 76, registerRate: 11.2, payRate: 2.0 },
          ]
        }
      ],
      result: {
        currentWinner: 'variant-a', confidence: 42.1,
        improvement: { registerRate: '+3.8%', bounceRate: '-1.4%' },
        recommendation: '两组差异极小，信任标识位置对转化影响不显著。已暂停测试，建议将资源投入到更有潜力的测试维度（如CTA文案、首屏布局）。',
        canPromote: false
      }
    }
  ]
};

// ============================================================
// [MOCK] 异常检测数据
// ============================================================
const MOCK_ALERTS = [
  { date: "2026-03-17", campaign: "Ft-web-US-2.5-Display-12.26-homepage", type: "ROAS骤降", severity: "high", message: "ROAS 从前日 0.45 降至 0.22，为 45 天最低值", metric: "roas", value: 0.22, threshold: 0.5 },
  { date: "2026-03-16", campaign: "Pu-web-2.5-IN-Display-12.23", type: "CPA异常", severity: "high", message: "新用户 CPA 升至 32.5，超出目标 CPA(105) 的预警线", metric: "cpa", value: 32.5, threshold: 30 },
  { date: "2026-03-15", campaign: "Ppt-web-UK-2.5-竞品词-2.2-homepage", type: "花费激增", severity: "medium", message: "日花费 68.2 较 7 日均值(42.1) 上升 62%", metric: "spend", value: 68.2, threshold: 50 },
  { date: "2026-03-14", campaign: "Ft-web-US-2.5-Display-12.26-homepage", type: "ROAS回升", severity: "low", message: "ROAS 回升至 1.48，为近 7 日最高", metric: "roas", value: 1.48, threshold: 1.0 },
  { date: "2026-03-13", campaign: "pu-web-IN-2.5-品牌词-6.16", type: "付费率下降", severity: "medium", message: "iOS 付费率从 7.2% 降至 4.8%", metric: "iosPayRate", value: 4.8, threshold: 5.0 },
  { date: "2026-03-12", campaign: "Ppt-web-2.5-AR+UAE+IL+QA-2.3", type: "新用户质量", severity: "medium", message: "新用户付费率降至 3.2%，低于 7 日均值 5.8%", metric: "newPayRate", value: 3.2, threshold: 4.0 },
];

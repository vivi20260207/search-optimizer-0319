#!/usr/bin/env python3
"""
Landing Page Health Monitor
- Gclid preservation check (redirect chain analysis)
- LCP via Google PageSpeed Insights API
Outputs: dashboard/js/adw_data_lp.js
"""
import json, time, os, sys

try:
    import requests
except ImportError:
    print("ERROR: `requests` package required. Install via: pip install requests")
    sys.exit(1)

OUTPUT_PATH = "dashboard/js/adw_data_lp.js"

PAGESPEED_API_KEY = os.environ.get("PAGESPEED_API_KEY", "")

LANDING_PAGES = [
    {"url": "https://www.fachatapp.com/", "product": "Ft",
     "campaigns": ["ft-web-IN-2.5-广泛-1.17-功能词-首页-TCPA"]},
    {"url": "https://parau.vip/", "product": "Pu",
     "campaigns": ["pu-web-IN-2.5-竞品词-6.14重开", "pu-web-IN-2.5-品牌词-6.16"]},
    {"url": "https://www.pinkpinkchat.com/", "product": "Ppt",
     "campaigns": ["Ppt-web-US-2.5-1.17-homepage", "Ppt-web-UK-2.5-1.18-homepage"]},
    {"url": "https://parau.vip/emeraldchat", "product": "Pu",
     "campaigns": ["Pu-web-IN-2.5-emeraldchat-9.2重开-emeraldchat页-TCPA"]},
]

TEST_GCLID = "test_gclid_cursor_monitor_" + time.strftime("%Y%m%d")


def check_gclid(url: str) -> dict:
    """Follow redirects with a test gclid param and check if it's preserved."""
    test_url = url.rstrip("/") + "/?gclid=" + TEST_GCLID
    result = {
        "gclidPreserved": False,
        "redirectChain": [],
        "finalUrl": "",
        "statusCode": 0,
        "error": "",
    }
    try:
        resp = requests.get(test_url, allow_redirects=True, timeout=15,
                            headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"})
        result["statusCode"] = resp.status_code
        chain = [r.url for r in resp.history] + [resp.url]
        result["redirectChain"] = chain
        result["finalUrl"] = resp.url
        result["gclidPreserved"] = TEST_GCLID in resp.url
    except Exception as e:
        result["error"] = str(e)
    return result


def check_lcp(url: str) -> dict:
    """Use PageSpeed Insights API to measure LCP (mobile strategy)."""
    result = {"lcpMs": 0, "perfScore": 0, "error": ""}
    if not PAGESPEED_API_KEY:
        result["error"] = "PAGESPEED_API_KEY not set"
        return result
    try:
        api_url = (
            "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
            f"?url={url}&strategy=mobile&category=performance&key={PAGESPEED_API_KEY}"
        )
        resp = requests.get(api_url, timeout=60)
        data = resp.json()
        lh = data.get("lighthouseResult", {})
        audits = lh.get("audits", {})
        lcp_audit = audits.get("largest-contentful-paint", {})
        result["lcpMs"] = round(lcp_audit.get("numericValue", 0))
        perf = lh.get("categories", {}).get("performance", {})
        result["perfScore"] = round(perf.get("score", 0) * 100)
    except Exception as e:
        result["error"] = str(e)
    return result


def main():
    results = []
    now_str = time.strftime("%Y-%m-%d %H:%M")

    for lp in LANDING_PAGES:
        url = lp["url"]
        print(f"Checking {url} ...", flush=True)

        gclid = check_gclid(url)
        print(f"  Gclid: {'preserved' if gclid['gclidPreserved'] else 'LOST'} | "
              f"chain={len(gclid['redirectChain'])} hops | final={gclid['finalUrl']}")

        lcp = check_lcp(url)
        if lcp["error"]:
            print(f"  LCP: skipped ({lcp['error']})")
        else:
            print(f"  LCP: {lcp['lcpMs']}ms | perf={lcp['perfScore']}")

        chain_display = []
        for i, hop in enumerate(gclid["redirectChain"]):
            if i == 0:
                chain_display.append(hop)
            else:
                chain_display.append(f"→ {hop}")
        if not chain_display:
            chain_display = [f"{url} → (请求失败)"]

        results.append({
            "url": url,
            "product": lp["product"],
            "campaigns": lp["campaigns"],
            "lcpMs": lcp["lcpMs"],
            "perfScore": lcp["perfScore"],
            "gclidPreserved": gclid["gclidPreserved"],
            "redirectChain": chain_display,
            "finalUrl": gclid["finalUrl"],
            "statusCode": gclid["statusCode"],
            "lastChecked": now_str,
            "error": gclid["error"] or lcp["error"] or "",
        })

    js = f"// Landing Page Health — auto-generated {now_str}\n"
    js += f"const ADW_LP_HEALTH = {json.dumps(results, ensure_ascii=False, indent=2)};\n"

    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from scripts.safe_write import safe_write_js
        safe_write_js(OUTPUT_PATH, js, "lp_health", {"pages": results}, len(results))
    except ImportError:
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            f.write(js)
        print(f"\nWrote {len(js):,} chars to {OUTPUT_PATH}")

    print(f"\nDone! {len(results)} pages checked.")


if __name__ == "__main__":
    main()

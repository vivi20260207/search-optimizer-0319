#!/usr/bin/env python3
"""
Fetch Google Ads Change History (change_event) for App campaign accounts.
Outputs to dashboard/js/adw_data_app_changelog.js

Usage:
    python fetch_app_change_history.py
"""
import sys, json, time
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException

OUTPUT_PATH = "dashboard/js/adw_data_app_changelog.js"
START_DATE = "2026-02-19"
END_DATE   = "2026-03-19"

ACCOUNTS = [
    "4720551746",  # Find Mate-IN-01
    "9956162596",  # G-Max Security-0714-01
    "8183373292",  # G-Weather Mate-IN-02
    "8719323356",  # GPS Share-IN-01
    "9723856754",  # KeepClean_HK_1
    "3401728768",  # KeepClean_HK_2
    "1384163864",  # Local Weather-HK-1
    "4317744776",  # Local Weather-IN-01
    "6656007143",  # MaxSecurity_IN_02
    "2579044998",  # MyHealth_HK_1
    "2376715297",  # Storage Clean-IN-01
    "8799953811",  # Weather Pro-IN-01
]

def make_client():
    return GoogleAdsClient.load_from_storage("google-ads-app.yaml")

def micros(v):
    return round(v / 1_000_000, 2) if v else 0

def run_query(client, cid, query, label=""):
    ga = client.get_service("GoogleAdsService")
    rows = []
    try:
        resp = ga.search(customer_id=cid, query=query)
        for row in resp:
            rows.append(row)
    except GoogleAdsException as ex:
        for e in ex.failure.errors:
            print(f"    API ERROR [{label}]: {e.message}")
    except Exception as e:
        print(f"    EXCEPTION [{label}]: {e}")
    return rows

QUERY = f"""
SELECT
  change_event.change_date_time,
  change_event.change_resource_type,
  change_event.resource_change_operation,
  change_event.changed_fields,
  change_event.user_email,
  change_event.client_type,
  change_event.old_resource,
  change_event.new_resource,
  change_event.resource_name,
  campaign.name,
  ad_group.name
FROM change_event
WHERE change_event.change_date_time >= '{START_DATE}'
  AND change_event.change_date_time <= '{END_DATE}'
ORDER BY change_event.change_date_time DESC
LIMIT 5000
"""

def resource_type_label(val):
    if not val: return ""
    n = val.name if hasattr(val, 'name') else str(val)
    return {
        "CAMPAIGN": "Campaign", "AD_GROUP": "广告组",
        "AD_GROUP_CRITERION": "关键词", "AD_GROUP_AD": "广告", "AD": "广告",
        "CAMPAIGN_CRITERION": "Campaign否定词", "AD_GROUP_BID_MODIFIER": "出价调整",
        "CAMPAIGN_BUDGET": "预算", "ASSET": "素材",
        "AD_GROUP_ASSET": "广告组素材", "CAMPAIGN_ASSET": "Campaign素材",
    }.get(n, n)

def operation_label(val):
    if not val: return ""
    n = val.name if hasattr(val, 'name') else str(val)
    return {"CREATE": "新建", "UPDATE": "修改", "REMOVE": "移除"}.get(n, n)

def client_type_label(val):
    if not val: return ""
    n = val.name if hasattr(val, 'name') else str(val)
    return {
        "GOOGLE_ADS_WEB_CLIENT": "网页端", "GOOGLE_ADS_AUTOMATED_RULE": "自动规则",
        "GOOGLE_ADS_SCRIPTS": "脚本", "GOOGLE_ADS_BULK_UPLOAD": "批量上传",
        "GOOGLE_ADS_API": "API", "GOOGLE_ADS_EDITOR": "Editor",
        "GOOGLE_ADS_MOBILE_APP": "移动端", "GOOGLE_ADS_RECOMMENDATIONS": "建议",
        "GOOGLE_ADS_AUTOMATED_BIDDING": "自动出价", "INTERNAL": "内部",
        "INTERNAL_TOOL": "内部工具", "OTHER": "其他",
    }.get(n, n)

def extract_detail(ce):
    fields = list(ce.changed_fields.paths) if ce.changed_fields and ce.changed_fields.paths else []
    details = []
    old_r = ce.old_resource
    new_r = ce.new_resource
    rt = ce.change_resource_type.name if ce.change_resource_type else ""
    status_map = {"ENABLED": "已启用", "PAUSED": "已暂停", "REMOVED": "已移除"}

    for f in fields[:8]:
        old_val, new_val = "", ""
        try:
            if rt == "AD_GROUP_CRITERION":
                if "status" in f:
                    old_val = old_r.ad_group_criterion.status.name if old_r and old_r.ad_group_criterion and old_r.ad_group_criterion.status else ""
                    new_val = new_r.ad_group_criterion.status.name if new_r and new_r.ad_group_criterion and new_r.ad_group_criterion.status else ""
                elif "cpc_bid_micros" in f:
                    old_val = str(micros(old_r.ad_group_criterion.cpc_bid_micros)) if old_r and old_r.ad_group_criterion and old_r.ad_group_criterion.cpc_bid_micros else ""
                    new_val = str(micros(new_r.ad_group_criterion.cpc_bid_micros)) if new_r and new_r.ad_group_criterion and new_r.ad_group_criterion.cpc_bid_micros else ""
                elif "keyword" in f:
                    new_val = new_r.ad_group_criterion.keyword.text if new_r and new_r.ad_group_criterion and hasattr(new_r.ad_group_criterion, 'keyword') and new_r.ad_group_criterion.keyword else ""
            elif rt == "CAMPAIGN":
                if "status" in f:
                    old_val = old_r.campaign.status.name if old_r and old_r.campaign and old_r.campaign.status else ""
                    new_val = new_r.campaign.status.name if new_r and new_r.campaign and new_r.campaign.status else ""
                elif "bidding" in f.lower():
                    old_val = old_r.campaign.bidding_strategy_type.name if old_r and old_r.campaign and old_r.campaign.bidding_strategy_type else ""
                    new_val = new_r.campaign.bidding_strategy_type.name if new_r and new_r.campaign and new_r.campaign.bidding_strategy_type else ""
            elif rt == "AD_GROUP":
                if "status" in f:
                    old_val = old_r.ad_group.status.name if old_r and old_r.ad_group and old_r.ad_group.status else ""
                    new_val = new_r.ad_group.status.name if new_r and new_r.ad_group and new_r.ad_group.status else ""
                elif "cpc_bid_micros" in f:
                    old_val = str(micros(old_r.ad_group.cpc_bid_micros)) if old_r and old_r.ad_group and old_r.ad_group.cpc_bid_micros else ""
                    new_val = str(micros(new_r.ad_group.cpc_bid_micros)) if new_r and new_r.ad_group and new_r.ad_group.cpc_bid_micros else ""
            elif rt == "AD_GROUP_AD":
                if "status" in f:
                    old_val = old_r.ad_group_ad.status.name if old_r and old_r.ad_group_ad and old_r.ad_group_ad.status else ""
                    new_val = new_r.ad_group_ad.status.name if new_r and new_r.ad_group_ad and new_r.ad_group_ad.status else ""
            elif rt == "CAMPAIGN_CRITERION":
                cc_old = old_r.campaign_criterion if old_r else None
                cc_new = new_r.campaign_criterion if new_r else None
                if "keyword" in f:
                    kw_old = cc_old.keyword if cc_old and hasattr(cc_old, 'keyword') and cc_old.keyword else None
                    kw_new = cc_new.keyword if cc_new and hasattr(cc_new, 'keyword') and cc_new.keyword else None
                    if "text" in f:
                        old_val = kw_old.text if kw_old and kw_old.text else ""
                        new_val = kw_new.text if kw_new and kw_new.text else ""
                    elif "match_type" in f:
                        mt_map = {"EXACT": "完全匹配", "PHRASE": "词组匹配", "BROAD": "广泛匹配"}
                        old_val = mt_map.get(kw_old.match_type.name, kw_old.match_type.name) if kw_old and kw_old.match_type else ""
                        new_val = mt_map.get(kw_new.match_type.name, kw_new.match_type.name) if kw_new and kw_new.match_type else ""
                elif "status" in f:
                    old_val = cc_old.status.name if cc_old and cc_old.status else ""
                    new_val = cc_new.status.name if cc_new and cc_new.status else ""
                elif "negative" in f:
                    old_val = "是" if cc_old and cc_old.negative else ""
                    new_val = "是" if cc_new and cc_new.negative else ""
                elif "content_label" in f:
                    old_val = cc_old.content_label.type_.name if cc_old and hasattr(cc_old, 'content_label') and cc_old.content_label and cc_old.content_label.type_ else ""
                    new_val = cc_new.content_label.type_.name if cc_new and hasattr(cc_new, 'content_label') and cc_new.content_label and cc_new.content_label.type_ else ""
                elif "mobile_app_category" in f:
                    try:
                        old_val = str(cc_old.mobile_app_category.mobile_app_category_constant) if cc_old and hasattr(cc_old, 'mobile_app_category') and cc_old.mobile_app_category and cc_old.mobile_app_category.mobile_app_category_constant else ""
                        new_val = str(cc_new.mobile_app_category.mobile_app_category_constant) if cc_new and hasattr(cc_new, 'mobile_app_category') and cc_new.mobile_app_category and cc_new.mobile_app_category.mobile_app_category_constant else ""
                    except: pass
                elif "placement" in f:
                    try:
                        old_val = cc_old.placement.url if cc_old and hasattr(cc_old, 'placement') and cc_old.placement else ""
                        new_val = cc_new.placement.url if cc_new and hasattr(cc_new, 'placement') and cc_new.placement else ""
                    except: pass
                elif "gender" in f:
                    try:
                        old_val = cc_old.gender.type_.name if cc_old and hasattr(cc_old, 'gender') and cc_old.gender and cc_old.gender.type_ else ""
                        new_val = cc_new.gender.type_.name if cc_new and hasattr(cc_new, 'gender') and cc_new.gender and cc_new.gender.type_ else ""
                    except: pass
                elif "mobile_application" in f:
                    try:
                        old_val = cc_old.mobile_application.app_id if cc_old and hasattr(cc_old, 'mobile_application') and cc_old.mobile_application else ""
                        new_val = cc_new.mobile_application.app_id if cc_new and hasattr(cc_new, 'mobile_application') and cc_new.mobile_application else ""
                    except: pass
            elif rt == "CAMPAIGN_BUDGET":
                if "amount_micros" in f:
                    old_val = str(micros(old_r.campaign_budget.amount_micros)) if old_r and old_r.campaign_budget and old_r.campaign_budget.amount_micros else ""
                    new_val = str(micros(new_r.campaign_budget.amount_micros)) if new_r and new_r.campaign_budget and new_r.campaign_budget.amount_micros else ""
        except Exception:
            pass

        old_val = status_map.get(old_val, old_val)
        new_val = status_map.get(new_val, new_val)
        details.append({"field": f.split(".")[-1], "old": old_val, "new": new_val})

    return details

def neg_sub_type(fields):
    """Determine the sub-type of a Campaign Criterion from its changed fields."""
    joined = " ".join(fields)
    if "keyword.text" in joined: return "否定关键词"
    if "mobile_app_category" in joined: return "排除App类别"
    if "content_label" in joined: return "排除内容标签"
    if "placement" in joined: return "排除展示位置"
    if "gender" in joined: return "排除性别"
    if "user_list" in joined: return "排除受众"
    if "mobile_application" in joined: return "排除App"
    return ""

def parse(row, account_id=""):
    ce = row.change_event
    fields = list(ce.changed_fields.paths) if ce.changed_fields and ce.changed_fields.paths else []
    rt = resource_type_label(ce.change_resource_type)
    rec = {
        "accountId": account_id,
        "dateTime": ce.change_date_time if ce.change_date_time else "",
        "campaign": row.campaign.name if row.campaign else "",
        "adGroup": row.ad_group.name if row.ad_group and row.ad_group.name else "",
        "resourceType": rt,
        "operation": operation_label(ce.resource_change_operation),
        "userEmail": ce.user_email if ce.user_email else "",
        "clientType": client_type_label(ce.client_type),
        "changedFields": fields,
        "details": extract_detail(ce),
        "resourceName": ce.resource_name if ce.resource_name else "",
    }
    if rt == "Campaign否定词":
        rec["negSubType"] = neg_sub_type(fields)
    return rec

def main():
    if not ACCOUNTS:
        print("ERROR: No accounts configured. Please add App account IDs to the ACCOUNTS list.")
        print("       Edit fetch_app_change_history.py and fill in the account IDs.")
        sys.exit(1)

    client = make_client()
    all_changes = []

    for i, cid in enumerate(ACCOUNTS):
        print(f"[{i+1}/{len(ACCOUNTS)}] Account {cid}...", end=" ", flush=True)
        t0 = time.time()
        rows = run_query(client, cid, QUERY, "CHANGE")
        parsed = [parse(r, cid) for r in rows]
        all_changes.extend(parsed)
        print(f"{len(parsed)} events ({time.time()-t0:.1f}s)")

    all_changes.sort(key=lambda x: x.get("dateTime", ""), reverse=True)
    print(f"\nTotal change events: {len(all_changes)}")

    js = f"// App Change History — Auto-generated via Google Ads API\n"
    js += f"// Date range: {START_DATE} ~ {END_DATE}\n"
    js += f"// Generated: {time.strftime('%Y-%m-%d %H:%M')}\n\n"
    js += f"const ADW_APP_CHANGE_HISTORY = {json.dumps(all_changes, ensure_ascii=False, indent=None)};\n"

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(js)

    print(f"Wrote {len(js):,} chars to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()

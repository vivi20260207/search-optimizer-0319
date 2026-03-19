#!/usr/bin/env python3
"""
Fetch Google Ads Change History (change_event) for all accounts.
Outputs to dashboard/js/adw_data_changelog.js
"""
import sys, json, time
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException

OUTPUT_PATH = "dashboard/js/adw_data_changelog.js"
START_DATE = "2026-02-19"
END_DATE   = "2026-03-19"

ACCOUNTS = [
    "9077174845", "6492700111", "2302435452", "8875844595",
    "5886212641",
    "2677546619", "1691466535", "8145694686"
]

def make_client():
    return GoogleAdsClient.load_from_storage("google-ads.yaml")

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
        "AD_GROUP_CRITERION": "关键词", "AD_GROUP_AD": "广告",
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
        "GOOGLE_ADS_AUTOMATED_BIDDING": "自动出价", "INTERNAL": "内部", "OTHER": "其他",
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

def parse(row):
    ce = row.change_event
    return {
        "dateTime": ce.change_date_time if ce.change_date_time else "",
        "campaign": row.campaign.name if row.campaign else "",
        "adGroup": row.ad_group.name if row.ad_group and row.ad_group.name else "",
        "resourceType": resource_type_label(ce.change_resource_type),
        "operation": operation_label(ce.resource_change_operation),
        "userEmail": ce.user_email if ce.user_email else "",
        "clientType": client_type_label(ce.client_type),
        "changedFields": list(ce.changed_fields.paths) if ce.changed_fields and ce.changed_fields.paths else [],
        "details": extract_detail(ce),
        "resourceName": ce.resource_name if ce.resource_name else "",
    }

def main():
    client = make_client()
    all_changes = []

    for i, cid in enumerate(ACCOUNTS):
        print(f"[{i+1}/{len(ACCOUNTS)}] Account {cid}...", end=" ", flush=True)
        t0 = time.time()
        rows = run_query(client, cid, QUERY, "CHANGE")
        parsed = [parse(r) for r in rows]
        all_changes.extend(parsed)
        print(f"{len(parsed)} events ({time.time()-t0:.1f}s)")

    all_changes.sort(key=lambda x: x.get("dateTime", ""), reverse=True)
    print(f"\nTotal change events: {len(all_changes)}")

    js = f"// Change History — Auto-generated via Google Ads API\n"
    js += f"// Date range: {START_DATE} ~ {END_DATE}\n"
    js += f"// Generated: {time.strftime('%Y-%m-%d %H:%M')}\n\n"
    js += f"const ADW_CHANGE_HISTORY = {json.dumps(all_changes, ensure_ascii=False, indent=None)};\n"

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(js)

    print(f"Wrote {len(js):,} chars to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()

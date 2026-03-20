#!/usr/bin/env python3
"""
Fetch Google Ads Change History (change_event) for App campaign accounts.
Outputs to dashboard/js/adw_data_app_changelog.js

Usage:
    python fetch_app_change_history.py
"""
import sys, json, time, os
from datetime import datetime, timedelta
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException

OUTPUT_PATH = "dashboard/js/adw_data_app_changelog.js"

_today = datetime.now().strftime("%Y-%m-%d")
START_DATE = os.environ.get("ADW_START_DATE", (datetime.now() - timedelta(days=29)).strftime("%Y-%m-%d"))
END_DATE   = os.environ.get("ADW_END_DATE", _today)

MCC_CONFIGS = [
    "google-ads-app.yaml",           # MCC 7767893962
    "google-ads-mcc-5100780984.yaml", # MCC 5100780984
    "google-ads-mcc-7534035699.yaml", # MCC 7534035699
    "google-ads-mcc-3094233805.yaml", # MCC 3094233805
    "google-ads-mcc-8009156492.yaml", # MCC 8009156492
]

def make_client(config_path="google-ads-app.yaml"):
    return GoogleAdsClient.load_from_storage(config_path)

def discover_accounts(config_path):
    """List all non-manager child accounts under an MCC."""
    import yaml
    with open(config_path) as f:
        conf = yaml.safe_load(f)
    login_id = str(conf.get("login_customer_id", ""))
    client = make_client(config_path)
    ga = client.get_service("GoogleAdsService")
    query = """
    SELECT customer_client.id, customer_client.descriptive_name,
           customer_client.manager
    FROM customer_client
    WHERE customer_client.status = 'ENABLED' AND customer_client.manager = FALSE
    """
    accounts = []
    try:
        results = ga.search(customer_id=login_id, query=query)
        for row in results:
            cc = row.customer_client
            accounts.append((str(cc.id), cc.descriptive_name))
    except Exception as e:
        print(f"  [WARN] Cannot list accounts for {config_path}: {e}")
    return accounts

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

def _extract_target_roas(camp):
    """Try multiple paths to get target_roas from a campaign resource."""
    if not camp: return ""
    paths = [
        lambda c: c.maximize_conversion_value.target_roas,
        lambda c: c.target_roas.target_roas,
    ]
    for fn in paths:
        try:
            v = fn(camp)
            if v and v > 0:
                return str(round(v, 4))
        except: pass
    return ""

def _extract_target_cpa(camp):
    """Try multiple paths to get target_cpa from a campaign resource."""
    if not camp: return ""
    paths = [
        lambda c: c.maximize_conversions.target_cpa_micros,
        lambda c: c.target_cpa.target_cpa_micros,
    ]
    for fn in paths:
        try:
            v = fn(camp)
            if v and v > 0:
                return str(micros(v))
        except: pass
    return ""

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
                c_old = old_r.campaign if old_r else None
                c_new = new_r.campaign if new_r else None
                if "status" in f:
                    old_val = c_old.status.name if c_old and c_old.status else ""
                    new_val = c_new.status.name if c_new and c_new.status else ""
                elif "target_roas" in f:
                    old_val = _extract_target_roas(c_old)
                    new_val = _extract_target_roas(c_new)
                elif "target_cpa" in f:
                    old_val = _extract_target_cpa(c_old)
                    new_val = _extract_target_cpa(c_new)
                elif "bidding_strategy_type" in f:
                    old_val = c_old.bidding_strategy_type.name if c_old and c_old.bidding_strategy_type else ""
                    new_val = c_new.bidding_strategy_type.name if c_new and c_new.bidding_strategy_type else ""
                elif "bidding" in f.lower():
                    old_val = c_old.bidding_strategy_type.name if c_old and c_old.bidding_strategy_type else ""
                    new_val = c_new.bidding_strategy_type.name if c_new and c_new.bidding_strategy_type else ""
                elif "ad_serving_optimization_status" in f:
                    try:
                        old_val = c_old.ad_serving_optimization_status.name if c_old and c_old.ad_serving_optimization_status else ""
                        new_val = c_new.ad_serving_optimization_status.name if c_new and c_new.ad_serving_optimization_status else ""
                    except: pass
                elif "name" in f and "resource" not in f:
                    old_val = c_old.name if c_old and c_old.name else ""
                    new_val = c_new.name if c_new and c_new.name else ""
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
    import os
    all_changes = []
    total_accounts = 0

    for cfg in MCC_CONFIGS:
        if not os.path.exists(cfg):
            print(f"[SKIP] Config not found: {cfg}")
            continue

        print(f"\n{'='*50}")
        print(f"MCC Config: {cfg}")
        print(f"{'='*50}")

        try:
            accounts = discover_accounts(cfg)
        except Exception as e:
            print(f"  [SKIP] Failed to connect: {e}")
            continue
        if not accounts:
            print("  No accounts found, skipping.")
            continue

        print(f"  Found {len(accounts)} accounts")
        try:
            client = make_client(cfg)
        except Exception as e:
            print(f"  [SKIP] Failed to create client: {e}")
            continue

        for i, (cid, name) in enumerate(accounts):
            print(f"  [{i+1}/{len(accounts)}] {cid} ({name})...", end=" ", flush=True)
            t0 = time.time()
            try:
                rows = run_query(client, cid, QUERY, "CHANGE")
                parsed = [parse(r, cid) for r in rows]
                all_changes.extend(parsed)
                total_accounts += 1
                print(f"{len(parsed)} events ({time.time()-t0:.1f}s)")
            except Exception as e:
                print(f"ERROR ({time.time()-t0:.1f}s): {e}")

    all_changes.sort(key=lambda x: x.get("dateTime", ""), reverse=True)
    print(f"\n{'='*50}")
    print(f"Total: {len(all_changes)} change events from {total_accounts} accounts")

    js = f"// App Change History — Auto-generated via Google Ads API\n"
    js += f"// Date range: {START_DATE} ~ {END_DATE}\n"
    js += f"// Accounts: {total_accounts}\n"
    js += f"// Generated: {time.strftime('%Y-%m-%d %H:%M')}\n\n"
    js += f"const ADW_APP_CHANGE_HISTORY = {json.dumps(all_changes, ensure_ascii=False, indent=None)};\n"

    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from scripts.safe_write import safe_write_js
        safe_write_js(OUTPUT_PATH, js, "app_changelog", all_changes, len(all_changes))
    except ImportError:
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            f.write(js)
        print(f"Wrote {len(js):,} chars to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()

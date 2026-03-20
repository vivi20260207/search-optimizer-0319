#!/usr/bin/env python3
"""
Google Ads API -> adw_data_daily.js
Pulls daily data: Campaign summary, Keywords, Search Terms (aggregated),
Devices, Demographics (Gender + Age), Ad Policy Status, Campaign Budget.
"""
import sys, json, time, os
from datetime import datetime, timedelta
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException

OUTPUT_PATH = "dashboard/js/adw_data_daily.js"

_today = datetime.now().strftime("%Y-%m-%d")
# 最早日期固定 02-01；结束日为本次拉取日（可用环境变量覆盖）
START_DATE = os.environ.get("ADW_START_DATE", "2026-02-01")
END_DATE   = os.environ.get("ADW_END_DATE", _today)

ACCOUNTS = [
    "9077174845", "6492700111", "2302435452", "8875844595",
    "5886212641",
    "2677546619", "1691466535", "8145694686"
]

YAML_PATH = os.environ.get("GOOGLE_ADS_YAML", "google-ads.yaml")

def make_client():
    return GoogleAdsClient.load_from_storage(YAML_PATH)

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

# ═══════════════════════════════════════
# QUERIES — all with segments.date
# ═══════════════════════════════════════

def q_campaign_daily():
    return f"""
    SELECT
      segments.date, campaign.name, campaign.bidding_strategy_type,
      campaign.campaign_budget,
      metrics.impressions, metrics.clicks, metrics.cost_micros,
      metrics.conversions, metrics.conversions_value,
      metrics.average_cpc, metrics.ctr, metrics.cost_per_conversion,
      metrics.search_impression_share
    FROM campaign
    WHERE segments.date >= '{START_DATE}' AND segments.date <= '{END_DATE}'
      AND metrics.impressions > 0
    ORDER BY segments.date ASC
    """

def q_budget():
    """Fetch campaign budget amount (separate query since budget is a linked resource)."""
    return f"""
    SELECT
      campaign.name,
      campaign_budget.amount_micros
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    """

def q_keywords_daily():
    return f"""
    SELECT
      segments.date, campaign.name, ad_group.name,
      ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
      metrics.clicks, metrics.impressions, metrics.cost_micros,
      metrics.conversions, metrics.conversions_value,
      metrics.average_cpc, metrics.cost_per_conversion,
      ad_group_criterion.quality_info.quality_score,
      ad_group_criterion.quality_info.search_predicted_ctr,
      ad_group_criterion.quality_info.post_click_quality_score
    FROM keyword_view
    WHERE segments.date >= '{START_DATE}' AND segments.date <= '{END_DATE}'
      AND campaign.status != 'REMOVED'
      AND ad_group.status != 'REMOVED'
      AND metrics.impressions > 0
    ORDER BY segments.date ASC
    """

def q_search_terms_daily():
    """Search terms × day — 前端按日期区间聚合。"""
    return f"""
    SELECT
      segments.date,
      campaign.name, ad_group.name,
      search_term_view.search_term, search_term_view.status,
      metrics.clicks, metrics.impressions, metrics.cost_micros,
      metrics.average_cpc, metrics.conversions, metrics.conversions_value
    FROM search_term_view
    WHERE segments.date >= '{START_DATE}' AND segments.date <= '{END_DATE}'
      AND metrics.impressions > 0
    ORDER BY campaign.name, segments.date
    """

def q_devices_daily():
    return f"""
    SELECT
      segments.date, campaign.name, segments.device,
      metrics.impressions, metrics.clicks, metrics.cost_micros,
      metrics.conversions, metrics.average_cpc, metrics.ctr,
      metrics.cost_per_conversion
    FROM campaign
    WHERE segments.date >= '{START_DATE}' AND segments.date <= '{END_DATE}'
      AND metrics.impressions > 0
    ORDER BY segments.date ASC
    """

def q_gender_daily():
    return f"""
    SELECT
      segments.date,
      campaign.name,
      ad_group_criterion.gender.type,
      metrics.impressions, metrics.clicks, metrics.cost_micros,
      metrics.conversions, metrics.conversions_value
    FROM gender_view
    WHERE segments.date >= '{START_DATE}' AND segments.date <= '{END_DATE}'
      AND metrics.impressions > 0
    ORDER BY campaign.name, segments.date
    """

def q_age_daily():
    return f"""
    SELECT
      segments.date,
      campaign.name,
      ad_group_criterion.age_range.type,
      metrics.impressions, metrics.clicks, metrics.cost_micros,
      metrics.conversions, metrics.conversions_value
    FROM age_range_view
    WHERE segments.date >= '{START_DATE}' AND segments.date <= '{END_DATE}'
      AND metrics.impressions > 0
    ORDER BY campaign.name, segments.date
    """

def q_campaign_hourly():
    """Campaign × date × hour — for intraday spend concentration analysis."""
    return f"""
    SELECT
      segments.date, segments.hour, campaign.name,
      metrics.impressions, metrics.clicks, metrics.cost_micros,
      metrics.conversions, metrics.conversions_value
    FROM campaign
    WHERE segments.date >= '{START_DATE}' AND segments.date <= '{END_DATE}'
      AND metrics.impressions > 0
    ORDER BY segments.date ASC, segments.hour ASC
    """

def q_ad_policy():
    """Ad-level policy/approval status — detect disapproved ads."""
    return f"""
    SELECT
      campaign.name, ad_group.name,
      ad_group_ad.ad.id,
      ad_group_ad.ad.type,
      ad_group_ad.policy_summary.approval_status,
      ad_group_ad.policy_summary.policy_topic_entries
    FROM ad_group_ad
    WHERE campaign.status != 'REMOVED'
      AND ad_group.status != 'REMOVED'
      AND ad_group_ad.status != 'REMOVED'
    """

def q_change_history():
    """Account change history — tracks all modifications made in Google Ads."""
    return f"""
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

# ═══════════════════════════════════════
# PARSERS
# ═══════════════════════════════════════

def qs_label(val):
    if not val: return ""
    n = val.name if hasattr(val, 'name') else str(val)
    if n in ("UNSPECIFIED", "UNKNOWN"): return ""
    return {"BELOW_AVERAGE": "低于平均水平", "AVERAGE": "平均水平", "ABOVE_AVERAGE": "高于平均水平"}.get(n, n)

def match_label(val):
    if not val: return ""
    n = val.name if hasattr(val, 'name') else str(val)
    return {"BROAD": "广泛匹配", "PHRASE": "词组匹配", "EXACT": "完全匹配"}.get(n, n)

def device_label(val):
    if not val: return ""
    n = val.name if hasattr(val, 'name') else str(val)
    return {"MOBILE": "手机", "DESKTOP": "计算机", "TABLET": "平板电脑"}.get(n, n)

def bidding_label(val):
    if not val: return ""
    n = val.name if hasattr(val, 'name') else str(val)
    return {
        "MAXIMIZE_CONVERSIONS": "MaxConv",
        "TARGET_CPA": "tCPA",
        "MAXIMIZE_CONVERSION_VALUE": "MaxValue",
        "TARGET_ROAS": "tROAS",
        "MANUAL_CPC": "ManualCPC",
        "TARGET_IMPRESSION_SHARE": "tIS",
    }.get(n, n)

def parse_camp_daily(row):
    m = row.metrics
    return {
        "date": row.segments.date,
        "campaign": row.campaign.name,
        "bidding": bidding_label(row.campaign.bidding_strategy_type),
        "impressions": m.impressions,
        "clicks": m.clicks,
        "cost": micros(m.cost_micros),
        "conversions": round(m.conversions, 2),
        "revenue": round(m.conversions_value, 2),
        "cpc": micros(m.average_cpc),
        "ctr": round(m.ctr * 100, 2) if m.ctr else 0,
        "cpa": micros(m.cost_per_conversion) if m.cost_per_conversion else 0,
        "impressionShare": round(m.search_impression_share * 100, 1) if m.search_impression_share and m.search_impression_share > 0 else None,
    }

def parse_kw_daily(row):
    m = row.metrics
    qi = row.ad_group_criterion.quality_info
    kw = row.ad_group_criterion.keyword
    return {
        "date": row.segments.date,
        "campaign": row.campaign.name,
        "adGroup": row.ad_group.name,
        "keyword": kw.text,
        "matchType": match_label(kw.match_type),
        "clicks": m.clicks,
        "impressions": m.impressions,
        "cost": micros(m.cost_micros),
        "conversions": round(m.conversions, 2),
        "revenue": round(m.conversions_value, 2),
        "cpc": micros(m.average_cpc),
        "cpa": micros(m.cost_per_conversion) if m.cost_per_conversion else 0,
        "qualityScore": qi.quality_score if qi.quality_score else None,
        "expectedCTR": qs_label(qi.search_predicted_ctr),
        "landingPageExp": qs_label(qi.post_click_quality_score),
    }

def parse_st(row):
    m = row.metrics
    st = row.search_term_view
    s = st.status.name if st.status else ""
    sl = {"ADDED": "已添加", "EXCLUDED": "已排除", "ADDED_EXCLUDED": "已排除"}.get(s, "")
    return {
        "date": row.segments.date,
        "campaign": row.campaign.name,
        "adGroup": row.ad_group.name,
        "term": st.search_term,
        "addedExcluded": sl,
        "clicks": m.clicks,
        "impressions": m.impressions,
        "cost": micros(m.cost_micros),
        "cpc": micros(m.average_cpc),
        "conversions": round(m.conversions, 2),
        "revenue": round(m.conversions_value, 2),
    }

def parse_dev_daily(row):
    m = row.metrics
    clicks = m.clicks or 0
    conv = m.conversions or 0
    return {
        "date": row.segments.date,
        "campaign": row.campaign.name,
        "device": device_label(row.segments.device),
        "impressions": m.impressions,
        "clicks": clicks,
        "cost": micros(m.cost_micros),
        "conversions": round(conv, 2),
        "cpc": micros(m.average_cpc),
        "ctr": round(m.ctr * 100, 2) if m.ctr else 0,
        "cpa": micros(m.cost_per_conversion) if m.cost_per_conversion else 0,
    }

def gender_label(val):
    if not val: return ""
    n = val.name if hasattr(val, 'name') else str(val)
    return {"MALE": "男性", "FEMALE": "女性", "UNDETERMINED": "未确定"}.get(n, n)

def age_label(val):
    if not val: return ""
    n = val.name if hasattr(val, 'name') else str(val)
    return {
        "AGE_RANGE_18_24": "18-24", "AGE_RANGE_25_34": "25-34",
        "AGE_RANGE_35_44": "35-44", "AGE_RANGE_45_54": "45-54",
        "AGE_RANGE_55_64": "55-64", "AGE_RANGE_65_UP": "65+",
        "AGE_RANGE_UNDETERMINED": "未确定",
    }.get(n, n)

def parse_gender(row):
    m = row.metrics
    return {
        "date": row.segments.date,
        "campaign": row.campaign.name,
        "gender": gender_label(row.ad_group_criterion.gender.type),
        "impressions": m.impressions,
        "clicks": m.clicks or 0,
        "cost": micros(m.cost_micros),
        "conversions": round(m.conversions, 2) if m.conversions else 0,
        "revenue": round(m.conversions_value, 2) if m.conversions_value else 0,
    }

def parse_age(row):
    m = row.metrics
    return {
        "date": row.segments.date,
        "campaign": row.campaign.name,
        "ageRange": age_label(row.ad_group_criterion.age_range.type),
        "impressions": m.impressions,
        "clicks": m.clicks or 0,
        "cost": micros(m.cost_micros),
        "conversions": round(m.conversions, 2) if m.conversions else 0,
        "revenue": round(m.conversions_value, 2) if m.conversions_value else 0,
    }

def approval_label(val):
    if not val: return ""
    n = val.name if hasattr(val, 'name') else str(val)
    return {
        "APPROVED": "已批准", "APPROVED_LIMITED": "受限批准",
        "DISAPPROVED": "已拒登", "AREA_OF_INTEREST_ONLY": "仅感兴趣地区",
        "UNKNOWN": "未知",
    }.get(n, n)

def parse_ad_policy(row):
    ps = row.ad_group_ad.policy_summary
    topics = []
    if ps.policy_topic_entries:
        for entry in ps.policy_topic_entries:
            t = entry.topic if hasattr(entry, 'topic') else ''
            tp = entry.type_.name if hasattr(entry, 'type_') and entry.type_ else ''
            topics.append({"topic": t, "type": tp})
    return {
        "campaign": row.campaign.name,
        "adGroup": row.ad_group.name,
        "adId": str(row.ad_group_ad.ad.id),
        "adType": row.ad_group_ad.ad.type_.name if row.ad_group_ad.ad.type_ else "",
        "approvalStatus": approval_label(ps.approval_status),
        "policyTopics": topics,
    }

def parse_budget(row):
    budget_micros = row.campaign_budget.amount_micros if row.campaign_budget.amount_micros else 0
    return {
        "campaign": row.campaign.name,
        "dailyBudget": micros(budget_micros),
    }

def parse_hourly(row):
    m = row.metrics
    return {
        "date": row.segments.date,
        "hour": row.segments.hour,
        "campaign": row.campaign.name,
        "impressions": m.impressions,
        "clicks": m.clicks,
        "cost": micros(m.cost_micros),
        "conversions": round(m.conversions, 2),
        "revenue": round(m.conversions_value, 2),
    }

def resource_type_label(val):
    if not val: return ""
    n = val.name if hasattr(val, 'name') else str(val)
    return {
        "CAMPAIGN": "Campaign",
        "AD_GROUP": "广告组",
        "AD_GROUP_CRITERION": "关键词",
        "AD_GROUP_AD": "广告",
        "CAMPAIGN_CRITERION": "Campaign否定词",
        "AD_GROUP_BID_MODIFIER": "出价调整",
        "CAMPAIGN_BUDGET": "预算",
        "AD_GROUP_FEED": "Feed",
        "CAMPAIGN_FEED": "CampaignFeed",
        "FEED": "Feed",
        "FEED_ITEM": "FeedItem",
        "AD_GROUP_ASSET": "广告组素材",
        "CAMPAIGN_ASSET": "Campaign素材",
        "ASSET": "素材",
    }.get(n, n)

def operation_label(val):
    if not val: return ""
    n = val.name if hasattr(val, 'name') else str(val)
    return {"CREATE": "新建", "UPDATE": "修改", "REMOVE": "移除"}.get(n, n)

def client_type_label(val):
    if not val: return ""
    n = val.name if hasattr(val, 'name') else str(val)
    return {
        "GOOGLE_ADS_WEB_CLIENT": "网页端",
        "GOOGLE_ADS_AUTOMATED_RULE": "自动规则",
        "GOOGLE_ADS_SCRIPTS": "脚本",
        "GOOGLE_ADS_BULK_UPLOAD": "批量上传",
        "GOOGLE_ADS_API": "API",
        "GOOGLE_ADS_EDITOR": "Editor",
        "GOOGLE_ADS_MOBILE_APP": "移动端",
        "GOOGLE_ADS_RECOMMENDATIONS": "建议",
        "SEARCH_ADS_360": "SA360",
        "SMART_CAMPAIGN": "智能广告系列",
        "GOOGLE_ADS_AUTOMATED_BIDDING": "自动出价",
        "INTERNAL": "内部",
        "OTHER": "其他",
    }.get(n, n)

def _extract_change_detail(ce):
    """Extract human-readable old→new change description from change_event."""
    fields = []
    if ce.changed_fields and ce.changed_fields.paths:
        fields = list(ce.changed_fields.paths)

    details = []
    old_r = ce.old_resource
    new_r = ce.new_resource
    rt_name = ce.change_resource_type.name if ce.change_resource_type else ""

    for f in fields[:8]:
        old_val, new_val = "", ""
        try:
            if rt_name == "AD_GROUP_CRITERION":
                if "status" in f:
                    old_val = old_r.ad_group_criterion.status.name if old_r and old_r.ad_group_criterion and old_r.ad_group_criterion.status else ""
                    new_val = new_r.ad_group_criterion.status.name if new_r and new_r.ad_group_criterion and new_r.ad_group_criterion.status else ""
                elif "cpc_bid_micros" in f:
                    old_val = str(micros(old_r.ad_group_criterion.cpc_bid_micros)) if old_r and old_r.ad_group_criterion and old_r.ad_group_criterion.cpc_bid_micros else ""
                    new_val = str(micros(new_r.ad_group_criterion.cpc_bid_micros)) if new_r and new_r.ad_group_criterion and new_r.ad_group_criterion.cpc_bid_micros else ""
                elif "keyword" in f:
                    new_val = new_r.ad_group_criterion.keyword.text if new_r and new_r.ad_group_criterion and hasattr(new_r.ad_group_criterion, 'keyword') and new_r.ad_group_criterion.keyword else ""
            elif rt_name == "CAMPAIGN":
                if "status" in f:
                    old_val = old_r.campaign.status.name if old_r and old_r.campaign and old_r.campaign.status else ""
                    new_val = new_r.campaign.status.name if new_r and new_r.campaign and new_r.campaign.status else ""
                elif "budget" in f.lower():
                    pass
                elif "bidding" in f.lower():
                    old_val = old_r.campaign.bidding_strategy_type.name if old_r and old_r.campaign and old_r.campaign.bidding_strategy_type else ""
                    new_val = new_r.campaign.bidding_strategy_type.name if new_r and new_r.campaign and new_r.campaign.bidding_strategy_type else ""
            elif rt_name == "AD_GROUP":
                if "status" in f:
                    old_val = old_r.ad_group.status.name if old_r and old_r.ad_group and old_r.ad_group.status else ""
                    new_val = new_r.ad_group.status.name if new_r and new_r.ad_group and new_r.ad_group.status else ""
                elif "cpc_bid_micros" in f:
                    old_val = str(micros(old_r.ad_group.cpc_bid_micros)) if old_r and old_r.ad_group and old_r.ad_group.cpc_bid_micros else ""
                    new_val = str(micros(new_r.ad_group.cpc_bid_micros)) if new_r and new_r.ad_group and new_r.ad_group.cpc_bid_micros else ""
            elif rt_name == "AD_GROUP_AD":
                if "status" in f:
                    old_val = old_r.ad_group_ad.status.name if old_r and old_r.ad_group_ad and old_r.ad_group_ad.status else ""
                    new_val = new_r.ad_group_ad.status.name if new_r and new_r.ad_group_ad and new_r.ad_group_ad.status else ""
            elif rt_name == "CAMPAIGN_BUDGET":
                if "amount_micros" in f:
                    old_val = str(micros(old_r.campaign_budget.amount_micros)) if old_r and old_r.campaign_budget and old_r.campaign_budget.amount_micros else ""
                    new_val = str(micros(new_r.campaign_budget.amount_micros)) if new_r and new_r.campaign_budget and new_r.campaign_budget.amount_micros else ""
        except Exception:
            pass

        status_map = {"ENABLED": "已启用", "PAUSED": "已暂停", "REMOVED": "已移除"}
        old_val = status_map.get(old_val, old_val)
        new_val = status_map.get(new_val, new_val)

        short = f.split(".")[-1]
        details.append({"field": short, "old": old_val, "new": new_val})

    return details

def parse_change_event(row):
    ce = row.change_event
    details = _extract_change_detail(ce)
    return {
        "dateTime": ce.change_date_time if ce.change_date_time else "",
        "campaign": row.campaign.name if row.campaign else "",
        "adGroup": row.ad_group.name if row.ad_group and row.ad_group.name else "",
        "resourceType": resource_type_label(ce.change_resource_type),
        "operation": operation_label(ce.resource_change_operation),
        "userEmail": ce.user_email if ce.user_email else "",
        "clientType": client_type_label(ce.client_type),
        "changedFields": list(ce.changed_fields.paths) if ce.changed_fields and ce.changed_fields.paths else [],
        "details": details,
        "resourceName": ce.resource_name if ce.resource_name else "",
    }

# ═══════════════════════════════════════
# MAIN
# ═══════════════════════════════════════
def main():
    client = make_client()
    all_camp, all_kw, all_st, all_dev = [], [], [], []
    all_gender, all_age, all_policy, all_budget = [], [], [], []
    all_hourly = []
    all_changes = []

    for i, cid in enumerate(ACCOUNTS):
        print(f"\n[{i+1}/{len(ACCOUNTS)}] Account {cid}")

        t0 = time.time()
        print(f"  Campaign Daily...", end=" ", flush=True)
        rows = run_query(client, cid, q_campaign_daily(), "CAMP")
        parsed = [parse_camp_daily(r) for r in rows]
        all_camp.extend(parsed)
        print(f"{len(parsed)} rows ({time.time()-t0:.1f}s)")

        t0 = time.time()
        print(f"  Keywords Daily...", end=" ", flush=True)
        rows = run_query(client, cid, q_keywords_daily(), "KW")
        parsed = [parse_kw_daily(r) for r in rows]
        all_kw.extend(parsed)
        print(f"{len(parsed)} rows ({time.time()-t0:.1f}s)")

        t0 = time.time()
        print(f"  Search Terms (agg)...", end=" ", flush=True)
        rows = run_query(client, cid, q_search_terms_daily(), "ST")
        parsed = [parse_st(r) for r in rows]
        all_st.extend(parsed)
        print(f"{len(parsed)} rows ({time.time()-t0:.1f}s)")

        t0 = time.time()
        print(f"  Devices Daily...", end=" ", flush=True)
        rows = run_query(client, cid, q_devices_daily(), "DEV")
        parsed = [parse_dev_daily(r) for r in rows]
        all_dev.extend(parsed)
        print(f"{len(parsed)} rows ({time.time()-t0:.1f}s)")

        t0 = time.time()
        print(f"  Budget...", end=" ", flush=True)
        rows = run_query(client, cid, q_budget(), "BUDGET")
        parsed = [parse_budget(r) for r in rows]
        all_budget.extend(parsed)
        print(f"{len(parsed)} rows ({time.time()-t0:.1f}s)")

        t0 = time.time()
        print(f"  Gender Demographics...", end=" ", flush=True)
        rows = run_query(client, cid, q_gender_daily(), "GENDER")
        parsed = [parse_gender(r) for r in rows]
        all_gender.extend(parsed)
        print(f"{len(parsed)} rows ({time.time()-t0:.1f}s)")

        t0 = time.time()
        print(f"  Age Demographics...", end=" ", flush=True)
        rows = run_query(client, cid, q_age_daily(), "AGE")
        parsed = [parse_age(r) for r in rows]
        all_age.extend(parsed)
        print(f"{len(parsed)} rows ({time.time()-t0:.1f}s)")

        t0 = time.time()
        print(f"  Hourly Breakdown...", end=" ", flush=True)
        rows = run_query(client, cid, q_campaign_hourly(), "HOURLY")
        parsed = [parse_hourly(r) for r in rows]
        all_hourly.extend(parsed)
        print(f"{len(parsed)} rows ({time.time()-t0:.1f}s)")

        t0 = time.time()
        print(f"  Ad Policy Status...", end=" ", flush=True)
        rows = run_query(client, cid, q_ad_policy(), "POLICY")
        parsed = [parse_ad_policy(r) for r in rows]
        all_policy.extend(parsed)
        print(f"{len(parsed)} rows ({time.time()-t0:.1f}s)")

        t0 = time.time()
        print(f"  Change History...", end=" ", flush=True)
        rows = run_query(client, cid, q_change_history(), "CHANGE")
        parsed = [parse_change_event(r) for r in rows]
        all_changes.extend(parsed)
        print(f"{len(parsed)} rows ({time.time()-t0:.1f}s)")

    print(f"\n{'='*60}")
    print(f"Campaign daily: {len(all_camp)}")
    print(f"Keywords daily: {len(all_kw)}")
    print(f"Search terms (agg): {len(all_st)}")
    print(f"Devices daily: {len(all_dev)}")
    print(f"Budgets: {len(all_budget)}")
    print(f"Hourly breakdown: {len(all_hourly)}")
    print(f"Gender demographics: {len(all_gender)}")
    print(f"Age demographics: {len(all_age)}")
    print(f"Ad policy rows: {len(all_policy)}")
    print(f"Change history: {len(all_changes)}")

    def group(data, key="campaign"):
        g = {}
        for d in data:
            g.setdefault(d.get(key, "unknown"), []).append(d)
        return g

    camp_g = group(all_camp)
    kw_g   = group(all_kw)
    st_g   = group(all_st)
    dev_g  = group(all_dev)
    gender_g = group(all_gender)
    age_g    = group(all_age)
    policy_g = group(all_policy)

    budget_map = {}
    for b in all_budget:
        budget_map[b["campaign"]] = b["dailyBudget"]

    disapproved = [p for p in all_policy if p["approvalStatus"] == "已拒登"]
    non_normal = [p for p in all_policy if p["approvalStatus"] not in ("已批准", "")]

    def safe_name(camp):
        s = camp.replace("-","_").replace(".","_").replace("+","_").replace(" ","_")
        return ''.join(c for c in s if c.isalnum() or c == '_').upper()

    _used_names = {}
    def unique_name(prefix, camp):
        base = f"{prefix}{safe_name(camp)}"
        if base not in _used_names:
            _used_names[base] = 0
            return base
        _used_names[base] += 1
        return f"{base}_{_used_names[base]}"

    js = f"// Auto-generated via Google Ads API (DAILY)\n// Date range: {START_DATE} ~ {END_DATE}\n// Generated: {time.strftime('%Y-%m-%d %H:%M')}\n\n"
    meta = {"startDate": START_DATE, "endDate": END_DATE, "generatedAt": time.strftime("%Y-%m-%d %H:%M")}
    js += f"var ADW_DATA_META = {json.dumps(meta, ensure_ascii=False)};\n\n"

    def write_const(name, data):
        return f"var {name} = {json.dumps(data, ensure_ascii=False)};\n\n"

    js += "// ═══ Campaign Daily (campaign × date) ═══\n"
    for camp, data in sorted(camp_g.items(), key=lambda x: -sum(d['cost'] for d in x[1])):
        js += write_const(unique_name("ADW_CAMP_", camp), data)

    js += "// ═══ Keywords Daily (keyword × date) ═══\n"
    for camp, data in sorted(kw_g.items(), key=lambda x: -len(x[1])):
        js += write_const(unique_name("ADW_KW_", camp), data)

    js += "// ═══ Search Terms (daily rows, aggregate in UI) ═══\n"
    for camp, data in sorted(st_g.items(), key=lambda x: -len(x[1])):
        js += write_const(unique_name("ADW_ST_", camp), data)

    js += "// ═══ Devices Daily (device × date) ═══\n"
    for camp, data in sorted(dev_g.items(), key=lambda x: -len(x[1])):
        js += write_const(unique_name("ADW_DEV_", camp), data)

    js += "// ═══ Gender Demographics (aggregated) ═══\n"
    gender_var_names = []
    for camp, data in sorted(gender_g.items(), key=lambda x: -sum(d['cost'] for d in x[1])):
        vname = unique_name("ADW_GENDER_", camp)
        gender_var_names.append(vname)
        js += write_const(vname, data)
    js += f"var ADW_GENDER_REGISTRY = [{', '.join(gender_var_names)}];\n\n"

    js += "// ═══ Age Demographics (aggregated) ═══\n"
    age_var_names = []
    for camp, data in sorted(age_g.items(), key=lambda x: -sum(d['cost'] for d in x[1])):
        vname = unique_name("ADW_AGE_", camp)
        age_var_names.append(vname)
        js += write_const(vname, data)
    js += f"var ADW_AGE_REGISTRY = [{', '.join(age_var_names)}];\n\n"

    js += "// ═══ Campaign Daily Budgets ═══\n"
    js += write_const("ADW_BUDGET_MAP", budget_map)

    hourly_g = group(all_hourly)
    js += "// ═══ Hourly Breakdown (campaign × date × hour) ═══\n"
    hourly_var_names = []
    for camp, data in sorted(hourly_g.items(), key=lambda x: -sum(d['cost'] for d in x[1])):
        vname = unique_name("ADW_HOURLY_", camp)
        hourly_var_names.append(vname)
        js += write_const(vname, data)
    js += f"var ADW_HOURLY_REGISTRY = [{', '.join(hourly_var_names)}];\n\n"

    js += "// ═══ Ad Policy (all non-approved + disapproved) ═══\n"
    js += write_const("ADW_DISAPPROVED_ADS", disapproved)
    js += write_const("ADW_POLICY_NON_NORMAL", non_normal)
    js += f"const ADW_POLICY_TOTAL_COUNT = {len(all_policy)};\n\n"

    js += "// ═══ Change History → loaded from adw_data_changelog.js ═══\n\n"

    js += "// ═══ Index ═══\n"
    js += f"const ADW_CAMPAIGN_LIST = {json.dumps(sorted(camp_g.keys()), ensure_ascii=False)};\n"

    # 归档原始数据 + 空数据保护
    archive_bundle = {
        "campaigns": all_camp,
        "keywords": all_kw,
        "search_terms": all_st,
        "devices": all_dev,
        "budgets": all_budget,
        "hourly": all_hourly,
        "gender": all_gender,
        "age": all_age,
        "policy": all_policy,
    }
    total_records = len(all_camp) + len(all_kw) + len(all_st)

    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from scripts.safe_write import safe_write_js
        safe_write_js(OUTPUT_PATH, js, "daily_bundle", archive_bundle, total_records)
    except ImportError:
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            f.write(js)
        print(f"\nWrote {len(js):,} chars to {OUTPUT_PATH}")

    print("Done!")

if __name__ == "__main__":
    main()

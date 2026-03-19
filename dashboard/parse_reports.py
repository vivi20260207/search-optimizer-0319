#!/usr/bin/env python3
"""
解析 ADW 导出的 CSV 报告，生成 dashboard 可用的 JSON 数据。
"""
import csv
import json
import sys
from collections import defaultdict

BASE = "/Users/vivigao/Downloads/"

def clean_num(s):
    if not s or s.strip() in ('--', ''):
        return 0
    return float(s.replace(',', '').replace('%', '').strip())

def parse_placement_report(path):
    """解析展示位置报告 - 按展示位置聚合不同转化事件"""
    placements = defaultdict(lambda: {
        'type': '', 'purchase_new': 0, 'purchase_new_value': 0,
        'purchase': 0, 'purchase_value': 0,
        'first_visit': 0, 'page_view': 0, 'videocall_15s': 0
    })
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 8:
                continue
            conv_action = row[0].strip()
            placement = row[1].strip()
            if '总计' in placement or '总计' in conv_action or not placement:
                continue
            ptype = row[3].strip()
            conv = clean_num(row[5])
            p = placements[placement]
            p['type'] = ptype
            if 's2s_purchase_new' in conv_action:
                p['purchase_new'] += conv
                p['purchase_new_value'] += clean_num(row[7]) if conv > 0 else 0
            elif 's2s_purchase' in conv_action and 'new' not in conv_action:
                p['purchase'] += conv
            elif 'first_visit' in conv_action:
                p['first_visit'] += conv
            elif 'page_view' in conv_action:
                p['page_view'] += conv
            elif 'videocall' in conv_action:
                p['videocall_15s'] += conv

    result = []
    for name, d in placements.items():
        if d['purchase_new'] > 0 or d['purchase'] > 0 or d['first_visit'] > 50:
            result.append({
                'placement': name, 'type': d['type'],
                'purchaseNew': round(d['purchase_new']),
                'purchaseAll': round(d['purchase_new'] + d['purchase']),
                'firstVisit': round(d['first_visit']),
                'pageView': round(d['page_view']),
                'videocall15s': round(d['videocall_15s']),
            })
    result.sort(key=lambda x: x['purchaseNew'], reverse=True)
    return result

def parse_geo(path):
    result = []
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 12: continue
            region = row[0].strip()
            if '总计' in region: continue
            result.append({
                'region': region,
                'clicks': int(clean_num(row[3])),
                'impressions': int(clean_num(row[4])),
                'ctr': row[5].strip(),
                'cpc': round(clean_num(row[7]), 2),
                'cost': round(clean_num(row[8]), 2),
                'convRate': row[9].strip(),
                'conversions': int(clean_num(row[10])),
                'cpa': round(clean_num(row[11]), 2),
            })
    result.sort(key=lambda x: x['cost'], reverse=True)
    return result

def parse_audience(path):
    result = []
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 15: continue
            if '总计' in row[0] or '总计' in row[1]: continue
            audience = row[1].strip()
            if not audience: continue
            result.append({
                'audience': audience, 'type': row[2].strip(),
                'conversions': round(clean_num(row[6]), 2),
                'cpa': round(clean_num(row[8]), 2),
                'clicks': int(clean_num(row[9])),
                'impressions': int(clean_num(row[10])),
                'ctr': row[11].strip(), 'cpc': round(clean_num(row[12]), 2),
                'cost': round(clean_num(row[13]), 2), 'convRate': row[14].strip(),
            })
    return result

def parse_assets(path):
    """聚合素材资源数据 - 按素材 × 类型去重"""
    assets = defaultdict(lambda: {
        'status': '', 'asset_type': '', 'conv': 0, 'conv_value': 0,
        'all_conv': 0, 'all_conv_value': 0
    })
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 25: continue
            asset_name = row[2].strip()
            status = row[3].strip()
            asset_type = row[4].strip()
            if not asset_name or '总计' in asset_name: continue

            key = f"{asset_name}||{asset_type}"
            a = assets[key]
            a['status'] = status
            a['asset_type'] = asset_type
            a['conv'] += clean_num(row[7])
            a['conv_value'] += clean_num(row[8])
            a['all_conv'] += clean_num(row[23])
            a['all_conv_value'] += clean_num(row[24])

    result = []
    for key, d in assets.items():
        name = key.split('||')[0]
        if d['all_conv'] <= 0 and d['conv'] <= 0: continue
        if d['status'] == '已移除': continue
        display = name
        if 'googlesyndication.com' in name:
            img_id = name.split('/')[-1][:12]
            display = f'图片素材({img_id}...)'
        elif 'youtube.com' in name:
            vid_id = name.split('=')[-1][:11] if '=' in name else name[-11:]
            display = f'YouTube({vid_id})'
        result.append({
            'asset': display, 'fullUrl': name,
            'status': d['status'], 'type': d['asset_type'],
            'purchaseConv': round(d['conv'], 2),
            'purchaseValue': round(d['conv_value'], 2),
            'allConv': round(d['all_conv'], 2),
            'allConvValue': round(d['all_conv_value'], 2),
        })
    result.sort(key=lambda x: x['allConvValue'], reverse=True)
    return result

def parse_device(path, campaign_name):
    result = []
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 15: continue
            device = row[0].strip()
            if not device or '总计' in device: continue
            result.append({
                'device': device, 'campaign': campaign_name,
                'bidAdj': row[4].strip(),
                'clicks': int(clean_num(row[6])),
                'impressions': int(clean_num(row[7])),
                'ctr': row[8].strip(),
                'cpc': round(clean_num(row[10]), 2),
                'cost': round(clean_num(row[11]), 2),
                'convRate': row[12].strip(),
                'conversions': round(clean_num(row[13]), 2),
                'cpa': round(clean_num(row[14]), 2),
            })
    return result

def parse_search_terms(path):
    """解析搜索字词报告 - 聚合 s2s_purchase_new 转化 + 花费"""
    terms = defaultdict(lambda: {
        'matchType': '', 'adGroup': '', 'purchaseNew': 0, 'purchaseNewValue': 0,
        'purchaseAll': 0, 'purchaseAllValue': 0,
        'firstVisit': 0, 'pageView': 0, 'videocall': 0,
        'clicks': 0, 'impressions': 0, 'cost': 0, 'cpc': 0
    })
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 19: continue
            conv_action = row[0].strip()
            term = row[1].strip()
            if '总计' in term or '总计' in conv_action or not term: continue
            matchType = row[2].strip()
            adGroup = row[4].strip()
            conv = clean_num(row[11])
            conv_value = clean_num(row[12])
            all_conv = clean_num(row[17])
            all_conv_value = clean_num(row[18])

            t = terms[term]
            t['matchType'] = matchType
            t['adGroup'] = adGroup
            t['clicks'] = int(clean_num(row[5]))
            t['impressions'] = int(clean_num(row[6]))
            t['cpc'] = clean_num(row[9])
            t['cost'] = clean_num(row[10])
            if 's2s_purchase_new' in conv_action:
                t['purchaseNew'] += conv
                t['purchaseNewValue'] += conv_value
            elif 's2s_purchase' in conv_action:
                t['purchaseAll'] += conv
                t['purchaseAllValue'] += conv_value
            elif 'first_visit' in conv_action:
                t['firstVisit'] += all_conv
            elif 'page_view' in conv_action:
                t['pageView'] += all_conv
            elif 'videocall' in conv_action:
                t['videocall'] += all_conv

    result = []
    for term, d in terms.items():
        if d['purchaseNew'] > 0 or d['pageView'] > 20:
            result.append({
                'term': term, 'matchType': d['matchType'], 'adGroup': d['adGroup'],
                'purchaseNew': round(d['purchaseNew'], 1),
                'purchaseNewValue': round(d['purchaseNewValue'], 2),
                'purchaseAll': round(d['purchaseNew'] + d['purchaseAll'], 1),
                'clicks': d['clicks'], 'impressions': d['impressions'],
                'cost': round(d['cost'], 2), 'cpc': round(d['cpc'], 2),
                'firstVisit': round(d['firstVisit']),
                'pageView': round(d['pageView']),
                'videocall': round(d['videocall']),
            })
    result.sort(key=lambda x: x['purchaseNew'], reverse=True)
    return result

def parse_keywords(path):
    """解析搜索关键字报告 - 聚合 s2s_purchase_new + 质量得分 + 花费"""
    kws = defaultdict(lambda: {
        'matchType': '', 'adGroup': '', 'status': '', 'purchaseNew': 0,
        'purchaseNewValue': 0, 'qualityScore': '', 'expectedCTR': '',
        'landingPageExp': '', 'adRelevance': '',
        'clicks': 0, 'impressions': 0, 'cost': 0, 'cpc': 0
    })
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 26: continue
            conv_action = row[0].strip()
            keyword = row[2].strip()
            if '总计' in keyword or '总计' in row[3] or not keyword: continue
            matchType = row[3].strip()
            adGroup = row[4].strip()
            status = row[5].strip()
            conv = clean_num(row[7])
            conv_value = clean_num(row[17])
            qs = row[25].strip() if len(row) > 25 else ''
            eCTR = row[26].strip() if len(row) > 26 else ''
            lpe = row[27].strip() if len(row) > 27 else ''
            adRel = row[28].strip() if len(row) > 28 else ''

            k = kws[keyword]
            k['matchType'] = matchType
            k['adGroup'] = adGroup
            k['status'] = status
            k['clicks'] = int(clean_num(row[11]))
            k['impressions'] = int(clean_num(row[12]))
            k['cpc'] = clean_num(row[14])
            k['cost'] = clean_num(row[15])
            if qs and qs != '--': k['qualityScore'] = qs
            if eCTR and eCTR != '--': k['expectedCTR'] = eCTR
            if lpe and lpe != '--': k['landingPageExp'] = lpe
            if adRel and adRel != '--': k['adRelevance'] = adRel
            if 's2s_purchase_new' in conv_action:
                k['purchaseNew'] += conv
                k['purchaseNewValue'] += conv_value

    result = []
    for kw, d in kws.items():
        result.append({
            'keyword': kw, 'matchType': d['matchType'], 'adGroup': d['adGroup'],
            'status': d['status'], 'purchaseNew': round(d['purchaseNew'], 1),
            'purchaseNewValue': round(d['purchaseNewValue'], 2),
            'clicks': d['clicks'], 'impressions': d['impressions'],
            'cost': round(d['cost'], 2), 'cpc': round(d['cpc'], 2),
            'qualityScore': d['qualityScore'], 'expectedCTR': d['expectedCTR'],
            'landingPageExp': d['landingPageExp'], 'adRelevance': d['adRelevance'],
        })
    result.sort(key=lambda x: x['purchaseNew'], reverse=True)
    return result

def parse_search_assets(path):
    """解析搜索 campaign 素材资源报告"""
    assets = defaultdict(lambda: {
        'status': '', 'level': '', 'asset_type': '', 'addedBy': '',
        'conv': 0, 'conv_value': 0, 'all_conv': 0, 'all_conv_value': 0
    })
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 22: continue
            asset_name = row[2].strip()
            level = row[3].strip()
            status = row[4].strip()
            asset_type = row[5].strip()
            addedBy = row[7].strip()
            if not asset_name or '总计' in asset_name: continue

            key = f"{asset_name}||{asset_type}"
            a = assets[key]
            a['status'] = status
            a['level'] = level
            a['asset_type'] = asset_type
            a['addedBy'] = addedBy
            a['conv'] += clean_num(row[9])
            a['conv_value'] += clean_num(row[10])
            a['all_conv'] += clean_num(row[21])
            a['all_conv_value'] += clean_num(row[22]) if len(row) > 22 else 0

    result = []
    for key, d in assets.items():
        name = key.split('||')[0]
        if d['all_conv'] <= 0 and d['conv'] <= 0: continue
        if d['status'] == '已移除': continue
        display = name
        if 'googlesyndication.com' in name:
            display = f'图片({name.split("/")[-1][:10]}…)'
        result.append({
            'asset': display, 'fullUrl': name,
            'status': d['status'], 'type': d['asset_type'],
            'level': d['level'], 'addedBy': d['addedBy'],
            'purchaseConv': round(d['conv'], 2),
            'purchaseValue': round(d['conv_value'], 2),
            'allConv': round(d['all_conv'], 2),
            'allConvValue': round(d['all_conv_value'], 2),
        })
    result.sort(key=lambda x: x['purchaseConv'], reverse=True)
    return result

def parse_search_terms_v2(path):
    """解析 Ppt 格式搜索字词报告 (15列，转化次数+转化价值直接在行内)"""
    terms = defaultdict(lambda: {
        'matchType': '', 'adGroup': '', 'addedExcluded': '',
        'purchaseNew': 0, 'purchaseNewValue': 0,
        'purchaseAll': 0, 'purchaseAllValue': 0, 'firstVisit': 0,
        'clicks': 0, 'impressions': 0, 'cost': 0, 'cpc': 0
    })
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 13: continue
            conv_action = row[0].strip()
            term = row[1].strip()
            if '总计' in term or '总计' in conv_action or not term: continue
            matchType = row[2].strip()
            addedExcl = row[3].strip()
            adGroup = row[4].strip()
            conv = clean_num(row[11])
            conv_value = clean_num(row[12])

            t = terms[term]
            t['matchType'] = matchType
            t['adGroup'] = adGroup
            t['addedExcluded'] = addedExcl
            t['clicks'] = int(clean_num(row[5]))
            t['impressions'] = int(clean_num(row[6]))
            t['cpc'] = clean_num(row[9])
            t['cost'] = clean_num(row[10])
            if 's2s_purchase_new' in conv_action or 'purchase_new' in conv_action:
                t['purchaseNew'] += conv
                t['purchaseNewValue'] += conv_value
            elif 's2s_purchase' in conv_action or 'purchase' in conv_action:
                t['purchaseAll'] += conv
                t['purchaseAllValue'] += conv_value
            elif 'first_visit' in conv_action:
                t['firstVisit'] += conv

    result = []
    for term, d in terms.items():
        if d['purchaseNew'] > 0 or d['purchaseAll'] > 0 or d['firstVisit'] > 0:
            result.append({
                'term': term, 'matchType': d['matchType'], 'adGroup': d['adGroup'],
                'addedExcluded': d['addedExcluded'],
                'purchaseNew': round(d['purchaseNew'], 1),
                'purchaseNewValue': round(d['purchaseNewValue'], 2),
                'purchaseAll': round(d['purchaseNew'] + d['purchaseAll'], 1),
                'clicks': d['clicks'], 'impressions': d['impressions'],
                'cost': round(d['cost'], 2), 'cpc': round(d['cpc'], 2),
                'firstVisit': round(d['firstVisit']),
            })
    result.sort(key=lambda x: x['purchaseNew'], reverse=True)
    return result

def parse_keywords_v2(path):
    """解析 Ppt 格式关键字报告 (含质量得分, 不同列位置) + 花费"""
    kws = defaultdict(lambda: {
        'matchType': '', 'adGroup': '', 'status': '', 'purchaseNew': 0,
        'purchaseNewValue': 0, 'qualityScore': '', 'expectedCTR': '',
        'landingPageExp': '', 'adRelevance': '',
        'clicks': 0, 'impressions': 0, 'cost': 0, 'cpc': 0
    })
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 20: continue
            conv_action = row[0].strip()
            keyword = row[2].strip()
            if '总计' in keyword or '总计' in row[3] or not keyword: continue
            matchType = row[3].strip()
            adGroup = row[4].strip()
            status = row[5].strip()
            conv = clean_num(row[7])
            conv_value = clean_num(row[18]) if len(row) > 18 else 0
            qs = row[19].strip() if len(row) > 19 else ''
            lpe = row[20].strip() if len(row) > 20 else ''
            eCTR = row[21].strip() if len(row) > 21 else ''
            adRel = row[22].strip() if len(row) > 22 else ''

            k = kws[keyword]
            k['matchType'] = matchType
            k['adGroup'] = adGroup
            k['status'] = status
            k['clicks'] = int(clean_num(row[11]))
            k['impressions'] = int(clean_num(row[12]))
            k['cpc'] = clean_num(row[14])
            k['cost'] = clean_num(row[15])
            if qs and qs != '--': k['qualityScore'] = qs
            if eCTR and eCTR != '--': k['expectedCTR'] = eCTR
            if lpe and lpe != '--': k['landingPageExp'] = lpe
            if adRel and adRel != '--': k['adRelevance'] = adRel
            if 's2s_purchase_new' in conv_action or 'purchase_new' in conv_action:
                k['purchaseNew'] += conv
                k['purchaseNewValue'] += conv_value

    result = []
    for kw, d in kws.items():
        result.append({
            'keyword': kw, 'matchType': d['matchType'], 'adGroup': d['adGroup'],
            'status': d['status'], 'purchaseNew': round(d['purchaseNew'], 1),
            'purchaseNewValue': round(d['purchaseNewValue'], 2),
            'clicks': d['clicks'], 'impressions': d['impressions'],
            'cost': round(d['cost'], 2), 'cpc': round(d['cpc'], 2),
            'qualityScore': d['qualityScore'], 'expectedCTR': d['expectedCTR'],
            'landingPageExp': d['landingPageExp'], 'adRelevance': d['adRelevance'],
        })
    result.sort(key=lambda x: x['purchaseNew'], reverse=True)
    return result

def parse_schedule(path):
    """解析投放时间（周几+时段）报告"""
    result = []
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 11: continue
            day = row[0].strip()
            if '总计' in day or not day: continue
            hour = int(clean_num(row[1]))
            clicks = int(clean_num(row[2]))
            impressions = int(clean_num(row[3]))
            ctr = row[4].strip()
            cpc = round(clean_num(row[6]), 2)
            cost = round(clean_num(row[7]), 2)
            convRate = row[8].strip()
            conv = round(clean_num(row[9]), 2)
            cpa = round(clean_num(row[10]), 2)
            result.append({
                'day': day, 'hour': hour,
                'clicks': clicks, 'impressions': impressions, 'ctr': ctr,
                'cpc': cpc, 'cost': cost, 'convRate': convRate,
                'conversions': conv, 'cpa': cpa,
            })
    return result

def parse_search_terms_v3(path):
    """解析品牌词搜索字词报告 (19列, 含所有转化次数/所有转化价值)
    列序: 转化操作,搜索字词,匹配类型,已添加/已排除,广告组,点击,展示,CTR,货币,CPC,费用,转化次数,转化价值,CPA,ROAS,ARPPU,转化率,所有转化次数,所有转化价值
    """
    terms = defaultdict(lambda: {
        'matchType': '', 'adGroup': '', 'addedExcluded': '',
        'purchaseNew': 0, 'purchaseNewValue': 0,
        'purchaseAll': 0, 'purchaseAllValue': 0,
        'firstVisit': 0, 'pageView': 0, 'videocall': 0,
        'clicks': 0, 'impressions': 0, 'cost': 0, 'cpc': 0
    })
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 13: continue
            conv_action = row[0].strip()
            term = row[1].strip()
            if '总计' in term or '总计' in conv_action or not term: continue
            matchType = row[2].strip()
            addedExcl = row[3].strip()
            adGroup = row[4].strip()
            conv = clean_num(row[11])
            conv_value = clean_num(row[12])
            all_conv = clean_num(row[17]) if len(row) > 17 else 0
            all_conv_value = clean_num(row[18]) if len(row) > 18 else 0

            t = terms[term]
            t['matchType'] = matchType
            t['adGroup'] = adGroup
            t['addedExcluded'] = addedExcl
            t['clicks'] = int(clean_num(row[5]))
            t['impressions'] = int(clean_num(row[6]))
            t['cpc'] = clean_num(row[9])
            t['cost'] = clean_num(row[10])
            if 's2s_purchase_new' in conv_action or 'purchase_new' in conv_action:
                t['purchaseNew'] += conv
                t['purchaseNewValue'] += conv_value
            elif 's2s_purchase' in conv_action or 'purchase' in conv_action:
                t['purchaseAll'] += conv
                t['purchaseAllValue'] += conv_value
            elif 'first_visit' in conv_action:
                t['firstVisit'] += all_conv if all_conv > 0 else conv
            elif 'page_view' in conv_action:
                t['pageView'] += all_conv if all_conv > 0 else conv
            elif 'videocall' in conv_action:
                t['videocall'] += all_conv if all_conv > 0 else conv

    result = []
    for term, d in terms.items():
        if d['purchaseNew'] > 0 or d['purchaseAll'] > 0 or d['pageView'] > 20:
            result.append({
                'term': term, 'matchType': d['matchType'], 'adGroup': d['adGroup'],
                'addedExcluded': d['addedExcluded'],
                'purchaseNew': round(d['purchaseNew'], 1),
                'purchaseNewValue': round(d['purchaseNewValue'], 2),
                'purchaseAll': round(d['purchaseNew'] + d['purchaseAll'], 1),
                'clicks': d['clicks'], 'impressions': d['impressions'],
                'cost': round(d['cost'], 2), 'cpc': round(d['cpc'], 2),
                'firstVisit': round(d['firstVisit']),
                'pageView': round(d['pageView']),
                'videocall': round(d['videocall']),
            })
    result.sort(key=lambda x: x['purchaseNew'], reverse=True)
    return result

def parse_keywords_brand(path):
    """解析品牌词关键字报告 (29-30列, 含ARPPU/搜索展示份额)
    与parse_keywords列位相同, 额外提取 ARPPU + impression share
    """
    kws = defaultdict(lambda: {
        'matchType': '', 'adGroup': '', 'status': '', 'purchaseNew': 0,
        'purchaseNewValue': 0, 'qualityScore': '', 'expectedCTR': '',
        'landingPageExp': '', 'adRelevance': '', 'arppu': 0, 'impressionShare': '',
        'clicks': 0, 'impressions': 0, 'cost': 0, 'cpc': 0
    })
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 26: continue
            conv_action = row[0].strip()
            keyword = row[2].strip()
            if '总计' in keyword or '总计' in row[3] or not keyword: continue
            matchType = row[3].strip()
            adGroup = row[4].strip()
            status = row[5].strip()
            conv = clean_num(row[7])
            conv_value = clean_num(row[17])
            arppu = clean_num(row[24]) if len(row) > 24 else 0
            qs = row[25].strip() if len(row) > 25 else ''
            eCTR = row[26].strip() if len(row) > 26 else ''
            lpe = row[27].strip() if len(row) > 27 else ''
            adRel = row[28].strip() if len(row) > 28 else ''
            impShare = row[29].strip() if len(row) > 29 else ''

            k = kws[keyword]
            k['matchType'] = matchType
            k['adGroup'] = adGroup
            k['status'] = status
            k['clicks'] = int(clean_num(row[11]))
            k['impressions'] = int(clean_num(row[12]))
            k['cpc'] = clean_num(row[14])
            k['cost'] = clean_num(row[15])
            if qs and qs != '--': k['qualityScore'] = qs
            if eCTR and eCTR != '--': k['expectedCTR'] = eCTR
            if lpe and lpe != '--': k['landingPageExp'] = lpe
            if adRel and adRel != '--': k['adRelevance'] = adRel
            if impShare and impShare != '--': k['impressionShare'] = impShare
            if 's2s_purchase_new' in conv_action or 'purchase_new' in conv_action:
                k['purchaseNew'] += conv
                k['purchaseNewValue'] += conv_value
                if arppu > 0: k['arppu'] = round(arppu, 2)

    result = []
    for kw, d in kws.items():
        result.append({
            'keyword': kw, 'matchType': d['matchType'], 'adGroup': d['adGroup'],
            'status': d['status'], 'purchaseNew': round(d['purchaseNew'], 1),
            'purchaseNewValue': round(d['purchaseNewValue'], 2),
            'clicks': d['clicks'], 'impressions': d['impressions'],
            'cost': round(d['cost'], 2), 'cpc': round(d['cpc'], 2),
            'arppu': d['arppu'], 'impressionShare': d['impressionShare'],
            'qualityScore': d['qualityScore'], 'expectedCTR': d['expectedCTR'],
            'landingPageExp': d['landingPageExp'], 'adRelevance': d['adRelevance'],
        })
    result.sort(key=lambda x: x['purchaseNew'], reverse=True)
    return result

def parse_keywords_with_cost(path):
    """解析带花费的关键字报告（非转化操作拆分，每行一个关键词汇总）
    列序: 关键字状态,关键字,匹配类型,广告组,状态,状况原因,转化次数,货币代码,每次转化费用,
          最终到达网址,点击次数,展示次数,点击率,平均每次点击费用,费用,花费($),转化价值,ROAS,
          转化次数(按转化时间),转化价值(按转化时间),转化价值($),转化率(按转化时间),CPA,ARPPU,
          质量得分,预期点击率,着陆页体验,广告相关性,搜索展示份额
    """
    result = []
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 25: continue
            kw_status = row[0].strip()
            keyword = row[1].strip()
            if not keyword or '总计' in keyword or '总计' in row[2] or '总计' in row[3]: continue
            if kw_status == '--': continue

            clicks = int(clean_num(row[10]))
            impressions = int(clean_num(row[11]))
            cost = round(clean_num(row[14]), 2)
            conv = round(clean_num(row[6]), 2)
            cpa = round(clean_num(row[8]), 2)
            conv_value = round(clean_num(row[16]), 2)
            roas = round(clean_num(row[17]), 2)
            conv_by_time = round(clean_num(row[18]), 2) if len(row) > 18 else conv
            conv_value_by_time = round(clean_num(row[19]), 2) if len(row) > 19 else conv_value
            conv_rate = row[21].strip() if len(row) > 21 else ''
            cpa2 = round(clean_num(row[22]), 2) if len(row) > 22 else cpa
            arppu = round(clean_num(row[23]), 2) if len(row) > 23 else 0
            qs = row[24].strip() if len(row) > 24 else ''
            eCTR = row[25].strip() if len(row) > 25 else ''
            lpe = row[26].strip() if len(row) > 26 else ''
            adRel = row[27].strip() if len(row) > 27 else ''
            impShare = row[28].strip() if len(row) > 28 else ''

            result.append({
                'keyword': keyword, 'matchType': row[2].strip(),
                'adGroup': row[3].strip(), 'status': row[4].strip(),
                'clicks': clicks, 'impressions': impressions,
                'ctr': row[12].strip(),
                'cpc': round(clean_num(row[13]), 2),
                'cost': cost,
                'purchaseNew': conv_by_time,
                'purchaseNewValue': conv_value_by_time,
                'cpa': cpa2 if cpa2 > 0 else cpa,
                'roas': roas,
                'arppu': arppu,
                'convRate': conv_rate,
                'qualityScore': qs if qs != '--' else '',
                'expectedCTR': eCTR if eCTR != '--' else '',
                'landingPageExp': lpe if lpe != '--' else '',
                'adRelevance': adRel if adRel != '--' else '',
                'impressionShare': impShare if impShare != '--' else '',
            })
    result.sort(key=lambda x: x['cost'], reverse=True)
    return result

def parse_pmax_search_terms(path):
    """解析PMax搜索字词报告 (14列，无广告组列)"""
    terms = defaultdict(lambda: {
        'matchType': '', 'addedExcluded': '',
        'purchaseNew': 0, 'purchaseNewValue': 0,
        'purchaseAll': 0, 'purchaseAllValue': 0, 'firstVisit': 0
    })
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 12: continue
            conv_action = row[0].strip()
            term = row[1].strip()
            if '总计' in term or '总计' in conv_action or not term: continue
            matchType = row[2].strip()
            addedExcl = row[3].strip()
            conv = clean_num(row[10])
            conv_value = clean_num(row[11])

            t = terms[term]
            t['matchType'] = matchType
            t['addedExcluded'] = addedExcl
            if 's2s_purchase_new' in conv_action or 'purchase_new' in conv_action:
                t['purchaseNew'] += conv
                t['purchaseNewValue'] += conv_value
            elif 's2s_purchase' in conv_action or 'purchase' in conv_action:
                t['purchaseAll'] += conv
                t['purchaseAllValue'] += conv_value
            elif 'first_visit' in conv_action:
                t['firstVisit'] += conv

    result = []
    for term, d in terms.items():
        if d['purchaseNew'] > 0 or d['purchaseAll'] > 0:
            result.append({
                'term': term, 'matchType': d['matchType'],
                'adGroup': 'PMax', 'addedExcluded': d['addedExcluded'],
                'purchaseNew': round(d['purchaseNew'], 1),
                'purchaseNewValue': round(d['purchaseNewValue'], 2),
                'purchaseAll': round(d['purchaseNew'] + d['purchaseAll'], 1),
                'firstVisit': round(d['firstVisit']),
                'clicks': 0, 'impressions': 0, 'cost': 0, 'cpc': 0,
            })
    result.sort(key=lambda x: x['purchaseNew'], reverse=True)
    return result

def parse_pmax_placements(path):
    """解析效果最大化展示位置报告 (仅展示次数)"""
    result = []
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 5: continue
            name = row[0].strip()
            if not name or '总计' in name: continue
            impressions = int(clean_num(row[4]))
            if impressions < 5: continue
            result.append({
                'placement': name,
                'url': row[1].strip(),
                'type': row[2].strip(),
                'network': row[3].strip(),
                'impressions': impressions,
            })
    result.sort(key=lambda x: x['impressions'], reverse=True)
    return result

def parse_pmax_assets(path):
    """解析PMax素材资源效果报告 (10列: 素材,类型,使用方,添加者,展示,点击,货币,费用,转化,转化价值)"""
    result = []
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 10: continue
            asset_name = row[0].strip()
            if not asset_name or '总计' in asset_name: continue
            impressions = int(clean_num(row[4]))
            clicks = int(clean_num(row[5]))
            cost = round(clean_num(row[7]), 2)
            conv = round(clean_num(row[8]), 2)
            conv_value = round(clean_num(row[9]), 2)
            display = asset_name
            if 'googlesyndication.com' in asset_name:
                img_id = asset_name.split('/')[-1][:12]
                display = f'图片素材({img_id}...)'
            elif 'youtube.com' in asset_name:
                vid_id = asset_name.split('=')[-1][:11] if '=' in asset_name else asset_name[-11:]
                display = f'YouTube({vid_id})'
            if '\n' in display:
                display = display.split('\n')[0].strip()
            result.append({
                'asset': display, 'fullUrl': asset_name,
                'type': row[1].strip(), 'addedBy': row[3].strip(),
                'impressions': impressions, 'clicks': clicks,
                'cost': cost, 'conversions': conv, 'convValue': conv_value,
                'ctr': f'{clicks/impressions*100:.2f}%' if impressions > 0 else '-',
                'cpa': round(cost / conv, 2) if conv > 0 else 0,
            })
    result.sort(key=lambda x: x['convValue'], reverse=True)
    return result

def parse_pmax_geo(path):
    """解析PMax地理位置报告 - 按地区聚合转化事件"""
    regions = defaultdict(lambda: {
        'purchaseNew': 0, 'purchaseNewValue': 0,
        'purchaseAll': 0, 'purchaseAllValue': 0,
        'firstVisit': 0, 'allConv': 0, 'allConvValue': 0,
    })
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        for row in reader:
            if len(row) < 17: continue
            conv_action = row[0].strip()
            region = row[1].strip()
            if '总计' in region or '总计' in conv_action or not region: continue
            conv = clean_num(row[8])
            conv_value = clean_num(row[9])
            all_conv = clean_num(row[15])
            all_conv_value = clean_num(row[16])

            r = regions[region]
            if 's2s_purchase_new' in conv_action or 'purchase_new' in conv_action:
                r['purchaseNew'] += conv
                r['purchaseNewValue'] += conv_value
            elif 's2s_purchase' in conv_action or 'purchase' in conv_action:
                r['purchaseAll'] += conv
                r['purchaseAllValue'] += conv_value
            elif 'first_visit' in conv_action:
                r['firstVisit'] += all_conv
                r['allConv'] += all_conv
                r['allConvValue'] += all_conv_value

    result = []
    for region, d in regions.items():
        result.append({
            'region': region,
            'purchaseNew': round(d['purchaseNew']),
            'purchaseNewValue': round(d['purchaseNewValue'], 2),
            'purchaseAll': round(d['purchaseNew'] + d['purchaseAll']),
            'purchaseAllValue': round(d['purchaseNewValue'] + d['purchaseAllValue'], 2),
            'firstVisit': round(d['firstVisit']),
        })
    result.sort(key=lambda x: x['purchaseNewValue'], reverse=True)
    return result

def parse_search_terms_ft(path):
    """解析 ft-IN 功能词搜索字词报告（转化操作分段，自动表头定位）"""
    terms = defaultdict(lambda: {
        'matchType': '', 'adGroup': '', 'addedExcluded': '',
        'purchaseNew': 0, 'purchaseNewValue': 0,
        'purchaseAll': 0, 'purchaseAllValue': 0, 'firstVisit': 0,
        'clicks': 0, 'impressions': 0, 'cost': 0, 'cpc': 0
    })
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        col = {h.strip(): i for i, h in enumerate(header)}
        for row in reader:
            if len(row) < col.get('转化价值', 12) + 1: continue
            conv_action = row[col['转化操作']].strip()
            term = row[col['搜索字词']].strip()
            if '总计' in term or '总计' in conv_action or not term: continue

            t = terms[term]
            t['matchType'] = row[col['匹配类型']].strip()
            t['adGroup'] = row[col.get('广告组', 4)].strip()
            t['addedExcluded'] = row[col.get('已添加/已排除', 3)].strip()
            if '点击次数' in col: t['clicks'] = int(clean_num(row[col['点击次数']]))
            if '展示次数' in col: t['impressions'] = int(clean_num(row[col['展示次数']]))
            if '平均每次点击费用' in col: t['cpc'] = clean_num(row[col['平均每次点击费用']])
            if '费用' in col: t['cost'] = clean_num(row[col['费用']])

            conv = clean_num(row[col['转化次数']])
            conv_value = clean_num(row[col['转化价值']])
            if 's2s_purchase_new' in conv_action or 'purchase_new' in conv_action:
                t['purchaseNew'] += conv; t['purchaseNewValue'] += conv_value
            elif 's2s_purchase' in conv_action or 'purchase' in conv_action:
                t['purchaseAll'] += conv; t['purchaseAllValue'] += conv_value
            elif 'first_visit' in conv_action:
                t['firstVisit'] += conv

    result = []
    for term, d in terms.items():
        if d['purchaseNew'] > 0 or d['purchaseAll'] > 0 or d['firstVisit'] > 0:
            result.append({
                'term': term, 'matchType': d['matchType'], 'adGroup': d['adGroup'],
                'addedExcluded': d['addedExcluded'],
                'purchaseNew': round(d['purchaseNew'], 1),
                'purchaseNewValue': round(d['purchaseNewValue'], 2),
                'purchaseAll': round(d['purchaseNew'] + d['purchaseAll'], 1),
                'clicks': d['clicks'], 'impressions': d['impressions'],
                'cost': round(d['cost'], 2), 'cpc': round(d['cpc'], 2),
                'firstVisit': round(d['firstVisit']),
            })
    result.sort(key=lambda x: x['purchaseNew'], reverse=True)
    return result

def parse_keywords_ft(path):
    """解析 ft-IN 功能词关键字报告（转化操作分段，自动表头定位）"""
    kws = defaultdict(lambda: {
        'matchType': '', 'adGroup': '', 'status': '', 'purchaseNew': 0,
        'purchaseNewValue': 0, 'qualityScore': '', 'expectedCTR': '',
        'landingPageExp': '', 'adRelevance': '',
        'clicks': 0, 'impressions': 0, 'cost': 0, 'cpc': 0
    })
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        col = {h.strip(): i for i, h in enumerate(header)}
        conv_val_key = next((h for h in col if '转化价值' in h and '转化时间' in h), '转化价值')
        for row in reader:
            if len(row) < col.get('质量得分', 26) + 1: continue
            conv_action = row[col['转化操作']].strip()
            keyword = row[col['关键字']].strip()
            if '总计' in keyword or not keyword: continue

            k = kws[keyword]
            k['matchType'] = row[col['匹配类型']].strip()
            k['adGroup'] = row[col.get('广告组', 4)].strip()
            k['status'] = row[col.get('状态', 5)].strip()
            if '点击次数' in col: k['clicks'] = int(clean_num(row[col['点击次数']]))
            if '展示次数' in col: k['impressions'] = int(clean_num(row[col['展示次数']]))
            if '平均每次点击费用' in col: k['cpc'] = clean_num(row[col['平均每次点击费用']])
            if '费用' in col: k['cost'] = clean_num(row[col['费用']])

            qs = row[col['质量得分']].strip() if '质量得分' in col and len(row) > col['质量得分'] else ''
            lpe = row[col['着陆页体验']].strip() if '着陆页体验' in col and len(row) > col['着陆页体验'] else ''
            eCTR = row[col['预期点击率']].strip() if '预期点击率' in col and len(row) > col['预期点击率'] else ''
            adRel = row[col['广告相关性']].strip() if '广告相关性' in col and len(row) > col['广告相关性'] else ''
            if qs and qs != '--': k['qualityScore'] = qs
            if eCTR and eCTR != '--': k['expectedCTR'] = eCTR
            if lpe and lpe != '--': k['landingPageExp'] = lpe
            if adRel and adRel != '--': k['adRelevance'] = adRel

            conv = clean_num(row[col['转化次数']])
            conv_value = clean_num(row[col[conv_val_key]]) if conv_val_key in col else 0
            if 's2s_purchase_new' in conv_action or 'purchase_new' in conv_action:
                k['purchaseNew'] += conv; k['purchaseNewValue'] += conv_value

    result = []
    for kw, d in kws.items():
        result.append({
            'keyword': kw, 'matchType': d['matchType'], 'adGroup': d['adGroup'],
            'status': d['status'], 'purchaseNew': round(d['purchaseNew'], 1),
            'purchaseNewValue': round(d['purchaseNewValue'], 2),
            'clicks': d['clicks'], 'impressions': d['impressions'],
            'cost': round(d['cost'], 2), 'cpc': round(d['cpc'], 2),
            'qualityScore': d['qualityScore'], 'expectedCTR': d['expectedCTR'],
            'landingPageExp': d['landingPageExp'], 'adRelevance': d['adRelevance'],
        })
    result.sort(key=lambda x: x['purchaseNew'], reverse=True)
    return result

def parse_cost_search_terms(path):
    """解析不按转化操作分段的搜索字词报告 → {term: {clicks, impressions, cost, cpc}}
    通过表头自动定位列"""
    cost_map = {}
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        col = {h.strip(): i for i, h in enumerate(header)}
        click_idx = col.get('点击次数', 4)
        impr_idx = col.get('展示次数', 5)
        cpc_idx = col.get('平均每次点击费用', 8)
        cost_idx = col.get('费用', 9)
        min_cols = cost_idx + 1
        for row in reader:
            if len(row) < min_cols: continue
            term = row[0].strip()
            if '总计' in term or not term: continue
            cost_map[term] = {
                'clicks': int(clean_num(row[click_idx])),
                'impressions': int(clean_num(row[impr_idx])),
                'cpc': round(clean_num(row[cpc_idx]), 2),
                'cost': round(clean_num(row[cost_idx]), 2),
            }
    return cost_map

def parse_cost_keywords(path):
    """解析不按转化操作分段的搜索关键字报告 → {keyword: {clicks, impressions, cost, cpc}}
    通过表头自动定位列"""
    cost_map = {}
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        col = {h.strip(): i for i, h in enumerate(header)}
        kw_idx = col.get('关键字', 1)
        click_idx = col.get('点击次数', 10)
        impr_idx = col.get('展示次数', 11)
        cpc_idx = col.get('平均每次点击费用', 13)
        cost_idx = col.get('费用', 14)
        for row in reader:
            if len(row) < cost_idx + 1: continue
            keyword = row[kw_idx].strip()
            if '总计' in keyword or not keyword: continue
            cost_map[keyword] = {
                'clicks': int(clean_num(row[click_idx])),
                'impressions': int(clean_num(row[impr_idx])),
                'cpc': round(clean_num(row[cpc_idx]), 2),
                'cost': round(clean_num(row[cost_idx]), 2),
            }
    return cost_map

def parse_landing_pages(path):
    """解析着陆页报告（自动表头定位）"""
    result = []
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader); next(reader)
        header = next(reader)
        col = {h.strip(): i for i, h in enumerate(header)}
        for row in reader:
            if len(row) < col.get('费用', 10) + 1: continue
            page = row[col['着陆页']].strip()
            if not page or '总计' in page: continue
            clicks = int(clean_num(row[col['点击次数']]))
            impressions = int(clean_num(row[col['展示次数']]))
            cost = round(clean_num(row[col['费用']]), 2)
            conv = round(clean_num(row[col['转化次数']]), 2)
            conv_value = round(clean_num(row[col['转化价值']]), 2)
            cpc = round(clean_num(row[col['平均每次点击费用']]), 2)
            ctr = row[col['点击率']].strip() if '点击率' in col else ''
            conv_rate = row[col['转化率']].strip() if '转化率' in col else ''
            cpa = round(clean_num(row[col['每次转化费用']]), 2) if '每次转化费用' in col else 0
            mobile_speed = row[col.get('移动网页加载速度得分', 2)].strip() if '移动网页加载速度得分' in col else ''
            short_page = page.replace('https://', '').replace('http://', '')
            if len(short_page) > 60:
                short_page = short_page[:57] + '...'
            result.append({
                'page': short_page, 'fullUrl': page,
                'clicks': clicks, 'impressions': impressions,
                'ctr': ctr, 'cpc': cpc, 'cost': cost,
                'conversions': conv, 'convValue': conv_value,
                'convRate': conv_rate, 'cpa': cpa,
                'mobileSpeed': mobile_speed,
            })
    result.sort(key=lambda x: x['cost'], reverse=True)
    return result

def merge_cost(data_list, cost_map, key_field='term'):
    """将花费数据合并到已有数据列表"""
    merged = 0
    for item in data_list:
        key = item.get(key_field, '')
        if key in cost_map:
            c = cost_map[key]
            item['clicks'] = c['clicks']
            item['impressions'] = c['impressions']
            item['cpc'] = c['cpc']
            item['cost'] = c['cost']
            merged += 1
    return merged

if __name__ == '__main__':
    print("Parsing reports...", file=sys.stderr)

    data = {
        'pu_in_placements': parse_placement_report(
            BASE + "Pu-web-2.5-IN-Display-12.23展示位置报告.csv"),
        'ft_us_placements': parse_placement_report(
            BASE + "Ft-web-US-2.5-Display-12.26-homepage的展示位置报告.csv"),
        'pu_in_geo': parse_geo(
            BASE + "Pu-web-2.5-IN-Display-12.23地理位置报告.csv"),
        'ft_us_audience': parse_audience(
            BASE + "Ft-web-US-2.5-Display-12.26-homepage细分受众群报告.csv"),
        'ft_us_assets': parse_assets(
            BASE + "Ft-web-US-2.5-Display-12.26-homepage素材资源详细信息报告.csv"),
        'pu_in_devices': parse_device(
            BASE + "Pu-web-2.5-IN-Display-12.23设备报告.csv",
            "Pu-web-2.5-IN-Display-12.23"),
        'ft_us_devices': parse_device(
            BASE + "Ft-web-US-2.5-Display-12.26-homepage设备报告.csv",
            "Ft-web-US-2.5-Display-12.26-homepage"),
        'pu_in_comp_search_terms': parse_search_terms(
            BASE + " pu-web-IN-2.5-竞品词-6.14重开搜索字词报告.csv"),
        'pu_in_comp_keywords': parse_keywords_with_cost(
            BASE + "3. pu-web-IN-2.5-竞品词-6.14重开搜索关键字报告 -带花费(3).csv"),
        'pu_in_comp_assets': parse_search_assets(
            BASE + "pu-web-IN-2.5-竞品词-6.14重开素材资源详细信息报告.csv"),
        'pu_in_comp_devices': parse_device(
            BASE + "pu-web-IN-2.5-竞品词-6.14重开设备报告.csv",
            "pu-web-IN-2.5-竞品词-6.14重开"),
        'ppt_uk_search_terms': parse_search_terms_v2(
            BASE + "4. Ppt-web-UK-2.5-1.18-homepage搜索字词报告.csv"),
        'ppt_uk_keywords': parse_keywords_v2(
            BASE + "4. Ppt-web-UK-2.5-1.18-homepage搜索关键字报告 (3).csv"),
        'ppt_uk_devices': parse_device(
            BASE + "4. Ppt-web-UK-2.5-1.18-homepage设备报告.csv",
            "Ppt-web-UK-2.5-1.18-homepage"),
        'ppt_uk_schedule': parse_schedule(
            BASE + "4. Ppt-web-UK-2.5-1.18-homepage广告投放时间（周几和时段）（印度时区）报告.csv"),
        'ppt_us_search_terms': parse_search_terms_v2(
            BASE + "5. Ppt-web-US-2.5-1.17-homepage搜索字词报告.csv"),
        'ppt_us_keywords': parse_keywords_v2(
            BASE + "5. Ppt-web-US-2.5-1.17-homepage搜索关键字报告 (3).csv"),
        'ppt_us_devices': parse_device(
            BASE + "5. Ppt-web-US-2.5-1.17-homepage设备报告.csv",
            "Ppt-web-US-2.5-1.17-homepage"),
        'ppt_me_pmax_placements': parse_pmax_placements(
            BASE + "6. Ppt-web-2.5-AR+UAE+IL+QA-2.3效果最大化广告系列展示位置报告.csv"),
        'ppt_me_pmax_assets': parse_pmax_assets(
            BASE + "6. Ppt-web-2.5-AR+UAE+IL+QA-2.3素材资源效果报告.csv"),
        'ppt_me_pmax_geo': parse_pmax_geo(
            BASE + "6. Ppt-web-2.5-AR+UAE+IL+QA-2.3地理位置报告.csv"),
        'ppt_us_pmax_search_terms': parse_pmax_search_terms(
            BASE + "7. Ppt-web-US-2.5-Pmax-1.20-homepage搜索字词报告.csv"),
        'ppt_us_pmax_assets': parse_pmax_assets(
            BASE + "7. Ppt-web-US-2.5-Pmax-1.20-homepage素材资源效果报告.csv"),
        'ppt_us_pmax_placements': parse_pmax_placements(
            BASE + "7. Ppt-web-US-2.5-Pmax-1.20-homepage效果最大化广告系列展示位置报告.csv"),
        'pu_in_brand_search_terms': parse_search_terms_v3(
            BASE + "8. pu-web-IN-2.5-品牌词-6.16搜索字词报告.csv"),
        'pu_in_brand_keywords': parse_keywords_brand(
            BASE + "8. pu-web-IN-2.5-品牌词-6.16搜索关键字报告-搜索展示份额(3).csv"),
        'ft_in_func_search_terms': parse_search_terms_ft(
            BASE + "9. ft-web-IN-2.5-广泛-1.17-功能词-首页-TCPA搜索字词报告-只有转化数据 (3).csv"),
        'ft_in_func_keywords': parse_keywords_ft(
            BASE + "9. ft-web-IN-2.5-广泛-1.17-功能词-首页-TCPA搜索关键字报告-只有转化数据 (3).csv"),
        'pu_in_emerald_search_terms': parse_search_terms_ft(
            BASE + "10. Pu-web-IN-2.5-emeraldchat-9.2重开搜索字词报告-带转化操作 (3).csv"),
        'pu_in_emerald_keywords': parse_keywords_ft(
            BASE + "10. Pu-web-IN-2.5-emeraldchat-9.2重开搜索关键字报告-带转化操作 (4).csv"),
        'pu_in_emerald_landing_pages': parse_landing_pages(
            BASE + "10. Pu-web-IN-2.5-emeraldchat-9.2重开着陆页报告 (1).csv"),
    }

    for k, v in data.items():
        print(f"  {k}: {len(v)} records", file=sys.stderr)

    # --- 合并花费数据（从不按转化操作分段的报告） ---
    print("\nMerging cost data...", file=sys.stderr)

    cost_merges = [
        ('ppt_uk_search_terms', 'term',
         BASE + "Ppt-web-UK-2.5-1.18-homepage_cost搜索字词报告 (3).csv", 'search_terms'),
        ('ppt_uk_keywords', 'keyword',
         BASE + "Ppt-web-UK-2.5-1.18-homepage搜索关键字报告_cost(3).csv", 'keywords'),
        ('ppt_us_search_terms', 'term',
         BASE + "Ppt-web-US-2.5-1.17-homepage搜索字词报告 (3)_cost.csv", 'search_terms'),
        ('ppt_us_keywords', 'keyword',
         BASE + "Ppt-web-US-2.5-1.17-homepage搜索关键字报告_cost (3).csv", 'keywords'),
        ('ppt_us_pmax_search_terms', 'term',
         BASE + "Ppt-web-US-2.5-Pmax-1.20-homepage搜索字词报告_cost (3).csv", 'search_terms'),
        ('pu_in_brand_search_terms', 'term',
         BASE + "pu-web-IN-2.5-品牌词-6.16搜索字词报告-cost.csv", 'search_terms'),
        ('pu_in_brand_keywords', 'keyword',
         BASE + "pu-web-IN-2.5-品牌词-6.16搜索关键字报告_cost (3).csv", 'keywords'),
        ('ft_in_func_search_terms', 'term',
         BASE + "9. ft-web-IN-2.5-广泛-1.17-功能词-首页-TCPA搜索字词报告_cost (3).csv", 'search_terms'),
        ('ft_in_func_keywords', 'keyword',
         BASE + "9. ft-web-IN-2.5-广泛-1.17-功能词-首页-TCPA搜索关键字报告_cost (3).csv", 'keywords'),
        ('pu_in_emerald_search_terms', 'term',
         BASE + "10. Pu-web-IN-2.5-emeraldchat-9.2重开搜索字词报告_cost (3).csv", 'search_terms'),
        ('pu_in_emerald_keywords', 'keyword',
         BASE + "10. Pu-web-IN-2.5-emeraldchat-9.2重开搜索关键字报告_cost (3).csv", 'keywords'),
    ]

    for data_key, key_field, cost_path, report_type in cost_merges:
        try:
            if report_type == 'search_terms':
                cost_map = parse_cost_search_terms(cost_path)
            else:
                cost_map = parse_cost_keywords(cost_path)
            merged = merge_cost(data[data_key], cost_map, key_field)
            print(f"  {data_key}: merged {merged}/{len(data[data_key])} records with cost (from {len(cost_map)} cost entries)", file=sys.stderr)
        except FileNotFoundError:
            print(f"  {data_key}: cost file not found, skipping", file=sys.stderr)
        except Exception as e:
            print(f"  {data_key}: error merging cost - {e}", file=sys.stderr)

    output = "// Auto-generated from ADW reports - [REAL DATA]\n"
    output += "// Generated: 2026-03-18\n\n"
    for key, val in data.items():
        output += f"const ADW_{key.upper()} = {json.dumps(val, ensure_ascii=False, indent=2)};\n\n"

    out_path = "/Users/vivigao/Desktop/cursor/web 1V1产品投放-甲锋-0318/dashboard/js/adw_data.js"
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(output)
    print(f"\nDone! → {out_path}", file=sys.stderr)

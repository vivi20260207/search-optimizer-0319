#!/usr/bin/env python3
"""List all sub-accounts under multiple MCCs."""
import glob, os
from google.ads.googleads.client import GoogleAdsClient

MCC_CONFIGS = sorted(glob.glob("google-ads-mcc-*.yaml")) + ["google-ads-app.yaml"]

for cfg in MCC_CONFIGS:
    if not os.path.exists(cfg):
        continue
    mcc_id = cfg.replace("google-ads-mcc-", "").replace("google-ads-app", "7767893962").replace(".yaml", "")
    print(f"\n{'='*60}")
    print(f"MCC: {mcc_id}  (config: {cfg})")
    print(f"{'='*60}")

    try:
        client = GoogleAdsClient.load_from_storage(cfg)
        ga = client.get_service("GoogleAdsService")

        # Read login_customer_id from config
        import yaml
        with open(cfg) as f:
            conf = yaml.safe_load(f)
        login_id = str(conf.get("login_customer_id", ""))

        query = """
        SELECT
          customer_client.id,
          customer_client.descriptive_name,
          customer_client.manager,
          customer_client.status
        FROM customer_client
        WHERE customer_client.status = 'ENABLED'
          AND customer_client.manager = FALSE
        ORDER BY customer_client.descriptive_name
        """
        results = ga.search(customer_id=login_id, query=query)
        for row in results:
            cc = row.customer_client
            print(f"  {cc.id:<15} {cc.descriptive_name}")
    except Exception as e:
        print(f"  ERROR: {e}")

if __name__ == "__main__":
    pass

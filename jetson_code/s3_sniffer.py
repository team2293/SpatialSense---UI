# S3 command sniffer — verifies UI → S3 → Jetson signal path without
# touching GPIO or running the real scan. Run this on the Jetson, then
# click "New Scan" in the UI. If the path works, you'll see the payload
# print within ~2 seconds.

import boto3
import time
import json

BUCKET = 'jetson-data-test-123'
KEY = 'commands/start-scan.json'  # matches what src/services/s3Service.js writes
POLL_INTERVAL = 2

s3 = boto3.client(
    's3',
    region_name='us-east-1',
    aws_access_key_id='YOUR_KEY',        # fill in on the Jetson, do not commit
    aws_secret_access_key='YOUR_SECRET',
)

print(f"Polling s3://{BUCKET}/{KEY} every {POLL_INTERVAL}s...")
print("Click 'New Scan' in the UI to test.\n")

last_seen = None
while True:
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=KEY)
        modified = obj['LastModified']
        if modified != last_seen:
            last_seen = modified
            body = json.loads(obj['Body'].read())
            print(f"\nCOMMAND RECEIVED at {modified}:")
            print(json.dumps(body, indent=2))
            print()
    except s3.exceptions.NoSuchKey:
        pass
    except KeyboardInterrupt:
        print("\nStopped.")
        break
    except Exception as e:
        print(f"Error: {e}")
    time.sleep(POLL_INTERVAL)

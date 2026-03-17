import requests
import json

base_url = "http://localhost:3000"
alias = "harvan_mkokevb2"
visitor_token = "test-token-123"

# 1. Get Session
print(f"--- Getting session for {alias} ---")
r = requests.get(f"{base_url}/public/profiles/{alias}/session?visitorToken={visitor_token}")
print(f"Status: {r.status_code}")
data = r.json()
print(json.dumps(data, indent=2))

if not data.get('success'):
    print("Failed to get session")
    exit(1)

public_token = data['data']['publicToken']
conv_id = data['data']['conversationId']

# 2. Load Messages
print(f"\n--- Loading messages for conversation {conv_id} ---")
headers = {"Authorization": f"Bearer {public_token}"}
r = requests.get(f"{base_url}/messages?conversationId={conv_id}&limit=50", headers=headers)
print(f"Status: {r.status_code}")
try:
    print(json.dumps(r.json(), indent=2))
except:
    print(f"Response (not JSON): {r.text}")

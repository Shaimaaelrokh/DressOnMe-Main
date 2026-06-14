import urllib.request
import json
req = urllib.request.Request('http://127.0.0.1:8000/api/analytics/dashboard/', headers={'X-Dashboard-Pin': '7894561230+789456120$5'})
try:
    response = urllib.request.urlopen(req)
    print("STATUS:", response.status)
    data = json.loads(response.read().decode('utf-8'))
    print("KEYS:", data.keys())
    print("KPIS:", data.get('kpis'))
except Exception as e:
    print("ERROR:", e)

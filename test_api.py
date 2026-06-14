import requests, json
res = requests.get('http://127.0.0.1:8000/api/analytics/dashboard/', headers={'X-Dashboard-Pin': '7894561230+789456120$5'})
with open('d:/back_gp/test_out.json', 'w', encoding='utf-8') as f:
    f.write(res.text)

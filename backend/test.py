import urllib.request, json, urllib.error
req = urllib.request.Request('http://127.0.0.1:8000/api/v1/auth/register', data=json.dumps({'name':'A','phone':'123','password':'B','location':'C','farm_size':0}).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    print(e.read().decode())

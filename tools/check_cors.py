from urllib.request import Request, urlopen
API='http://127.0.0.1:5000'
req = Request(API + '/canchas')
with urlopen(req) as r:
    print('status', r.status)
    print('headers:', r.getheaders())
    print(r.read().decode())

import json
from urllib.request import urlopen, Request
API='http://127.0.0.1:5000'

def get_canchas():
    req = Request(API + '/canchas')
    with urlopen(req) as r:
        print('status', r.status)
        print(r.read().decode())

if __name__ == '__main__':
    get_canchas()

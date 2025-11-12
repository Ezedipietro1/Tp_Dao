import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

API = 'http://127.0.0.1:5000'

def post_reserva(payload):
    url = API + '/reservas'
    data = json.dumps(payload).encode('utf-8')
    req = Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        resp = urlopen(req)
        print('POST status', resp.status)
        print(resp.read().decode())
    except HTTPError as e:
        print('POST error', e.code)
        print(e.read().decode())


def get_reservas():
    url = API + '/reservas'
    req = Request(url)
    try:
        resp = urlopen(req)
        print('GET status', resp.status)
        print(resp.read().decode())
    except HTTPError as e:
        print('GET error', e.code)
        print(e.read().decode())

if __name__ == '__main__':
    # Prepare payload: cancha 1, cliente 99999999 (new), fecha a free date 2025-11-16, horarios [1,2]
    payload = {
        'cancha_id': 1,
        'cliente_dni': 99999999,
        'fecha': '2025-11-16',
        'horario_ids': [1,2],
        'precio': 164000
    }
    print('Posting reserva...')
    post_reserva(payload)
    print('\nListing reservas:')
    get_reservas()

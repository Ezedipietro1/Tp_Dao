import json
import traceback
import sys
import os
from pathlib import Path

# Ensure project root is on sys.path so top-level modules can be imported when this
# script is executed from tools/ directory.
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

try:
    import repositorio
    print('=== HORARIOS ===')
    try:
        hs = repositorio.listar_horarios()
        print(json.dumps(hs, ensure_ascii=False))
    except Exception:
        print('HORARIOS ERROR')
        traceback.print_exc()

    print('\n=== CLIENTES ===')
    try:
        cs = repositorio.listar_clientes()
        print(json.dumps(cs, ensure_ascii=False))
    except Exception:
        print('CLIENTES ERROR')
        traceback.print_exc()

    print('\n=== RESERVAS LIST ===')
    try:
        res = repositorio.listar_reservas()
        print('type:', type(res), 'len:', len(res))
        for i,r in enumerate(res[:5]):
            try:
                # try to serialize basic attrs
                print(i, {'id': r.get_id() if hasattr(r,'get_id') else None, 'fecha': getattr(r,'_fecha', None)})
            except Exception:
                print('RES ITEM ERROR')
                traceback.print_exc()
    except Exception:
        print('RESERVAS ERROR')
        traceback.print_exc()

except Exception:
    traceback.print_exc()

from pathlib import Path
p=Path(r'd:\\DAO\\TP_Canchas\\frontend\\app.js')
s=p.read_text()
open_braces=s.count('{')
close_braces=s.count('}')
print('open { =', open_braces, 'close } =', close_braces)
# simple stack check
stack=[]
for i,ch in enumerate(s):
    if ch=='{': stack.append(i)
    elif ch=='}':
        if stack:
            stack.pop()
        else:
            print('Extra closing brace at', i)
            break
else:
    if stack:
        print('Unclosed braces count', len(stack))
    else:
        print('Braces appear balanced')

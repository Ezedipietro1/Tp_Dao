from pathlib import Path
p=Path(r'd:\\DAO\\TP_Canchas\\frontend\\app.js')
s=p.read_text()
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
        pos = stack[-1]
        # print context around the position
        line_start = s.rfind('\n',0,pos)+1
        line_end = s.find('\n', pos)
        print('Last unclosed position:', pos)
        print('Context line:', s[line_start:line_end])
        # print a few lines after for more context
        after_start = line_start
        for _ in range(5):
            next_end = s.find('\n', after_start)
            if next_end == -1: break
            print(s[after_start:next_end])
            after_start = next_end+1
    else:
        print('Braces balanced')

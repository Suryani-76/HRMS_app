import os

desktop = r'C:\Users\Gouda Suryani\Desktop'
for fname in os.listdir(desktop):
    if not fname.endswith('.html'):
        continue
    fpath = os.path.join(desktop, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = content.replace('href="dashboard.html">Home</a>', 'href="dashboard_replica.html">Home</a>')
    if new_content != content:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Fixed ' + fname)
print('Done')

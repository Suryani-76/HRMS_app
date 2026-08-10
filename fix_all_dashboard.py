import os

desktop = r'C:\Users\Gouda Suryani\Desktop'
for fname in os.listdir(desktop):
    if not fname.endswith('.html'):
        continue
    fpath = os.path.join(desktop, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'href="dashboard.html"' in content:
        new_content = content.replace('href="dashboard.html"', 'href="dashboard_replica.html"')
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Fixed dashboard.html in ' + fname)
print('Done - all dashboard.html references replaced')

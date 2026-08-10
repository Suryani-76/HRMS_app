import os, re

desktop = r'C:\Users\Gouda Suryani\Desktop'
files = set(f for f in os.listdir(desktop) if f.endswith('.html'))

all_links = set()
for fname in files:
    fpath = os.path.join(desktop, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    for m in re.finditer(r'href="([^"]+\.html(?:#[^"]*)?)"', content):
        href = m.group(1)
        page = href.split('#')[0]
        all_links.add(page)

missing = []
for link in sorted(all_links):
    if link not in files:
        missing.append(link)

if missing:
    print('MISSING TARGET FILES:')
    for f in missing:
        print('  - ' + f)
else:
    print('All linked HTML files exist!')

count = 0
for fname in files:
    fpath = os.path.join(desktop, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'href="dashboard.html"' in content:
        count += 1
        print('  ' + fname + ' links to dashboard.html')
if count == 0:
    print('No files link to dashboard.html')

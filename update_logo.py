import os, re
pattern = re.compile(r'src=[\'\"].*?hrm\.oklut\.com/storage/uploads/logo/.*?[\'\"]')
for f in os.listdir('.'):
    if f.endswith('.html'):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        new_content = pattern.sub('src=\"assets/oklut-logo.png\"', content)
        if new_content != content:
            with open(f, 'w', encoding='utf-8') as file:
                file.write(new_content)
            print(f'Updated {f}')

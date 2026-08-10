import zipfile, xml.etree.ElementTree as ET

z = zipfile.ZipFile(r'C:\HRMS\HRMS_Architecture (1).docx')
xml_content = z.read('word/document.xml')
root = ET.fromstring(xml_content)
ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
text_parts = []
for p in root.iter('{' + ns + '}p'):
    texts = []
    for t in p.iter('{' + ns + '}t'):
        if t.text:
            texts.append(t.text)
    if texts:
        text_parts.append(''.join(texts))
print('\n'.join(text_parts))

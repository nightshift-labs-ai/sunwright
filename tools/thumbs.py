"""Readability check: write 252-px-wide downscales of every screenshot (the judge's small cells)
and a 768x480 cover, side by side in one sheet, to tools/.shots-tmp/thumbs.png for a visual pass.
    /home/agent/tools/imgvenv/bin/python tools/thumbs.py   (any Python with Pillow)
"""
import os
from PIL import Image

names = sorted(f for f in os.listdir('screenshots') if f.endswith('.jpg'))
os.makedirs('tools/.shots-tmp', exist_ok=True)
cover = Image.open(os.path.join('screenshots', names[0])).resize((768, 480), Image.LANCZOS)
smalls = [Image.open(os.path.join('screenshots', n)).resize((252, 158), Image.LANCZOS) for n in names[1:]]
sheet = Image.new('RGB', (768, 480 + 166), (40, 40, 40))
sheet.paste(cover, (0, 0))
for k, im in enumerate(smalls):
    sheet.paste(im, (k * 258, 486))
sheet.save('tools/.shots-tmp/thumbs.png')
print('wrote tools/.shots-tmp/thumbs.png')

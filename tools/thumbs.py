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
# The cover's HUD panels at the cover cell's scale (0.6), to check they read on the judge's sheet.
full = Image.open(os.path.join('screenshots', names[0]))
crops = [full.crop(box).resize((int((box[2] - box[0]) * 0.6), int((box[3] - box[1]) * 0.6)), Image.LANCZOS)
         for box in [(0, 0, 222, 360), (1056, 0, 1280, 650), (226, 0, 1056, 210), (180, 706, 1280, 800)]]
sheet = Image.new('RGB', (768, 480 + 166 + 400), (40, 40, 40))
sheet.paste(cover, (0, 0))
for k, im in enumerate(smalls):
    sheet.paste(im, (k * 258, 486))
x = 0
for im in crops[:3]:
    sheet.paste(im, (x, 652))
    x += im.width + 6
sheet.paste(crops[3], (0, 652 + 400 - crops[3].height))
sheet.save('tools/.shots-tmp/thumbs.png')
print('wrote tools/.shots-tmp/thumbs.png')

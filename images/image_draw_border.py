import os.path
from PIL import Image, ImageDraw

folder = os.getcwd()
for f in os.listdir(folder):
    head = ['s','d','h','c']
    if f[0] in head:
        im = Image.open(f)
        img1 = ImageDraw.Draw(im)
        img1.line([(0,0),(100,0)], fill='white', width = 2)
        img1.line([(0,0),(0,140)], fill='white', width = 2)
        img1.line([(98,0),(98,140)], fill='white', width = 2)
        img1.line([(0,138),(100,138)], fill='white', width = 2)
        im.save(f)

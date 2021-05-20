import os.path
from PIL import Image

folder = os.getcwd()
for f in os.listdir(folder):
    head = ['s','d','h','c']
    if f[0] in head:
        im = Image.open(f)
        im=im.resize((100,140))
        im.save(f)

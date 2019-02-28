from PIL import ImageFile

fp = open("5.bmp", "rb")
p = ImageFile.Parser()

while 1:
    s = fp.read(1024)
    if not s:
        break
    p.feed(s)

im = p.close()

im.save("6.pgm")

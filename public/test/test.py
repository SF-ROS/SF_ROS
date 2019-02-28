from PIL import Image 
im = Image.open("index2.png") 
print(im.mode)
print(im.width,im.height)
im.save('9.bmp')

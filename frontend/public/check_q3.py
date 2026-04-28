from PIL import Image

img = Image.open('c:/Users/ROHAN/kisancore-ai/frontend/public/q3.png')
print("Corner colors:")
print("TL:", img.getpixel((0,0)))
print("TR:", img.getpixel((511,0)))
print("BL:", img.getpixel((0,511)))
print("BR:", img.getpixel((511,511)))
print("Center:", img.getpixel((256,256)))

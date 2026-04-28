from PIL import Image

original_path = 'C:/Users/ROHAN/.gemini/antigravity/brain/70764263-2336-4ce3-87c0-b231922e65f8/kisancore_logo_options_1775471410672.png'
img = Image.open(original_path)
print("Original size:", img.size)

w, h = img.size
crop = img.crop((w*2//3, h//4, w, h*3//4))
print("Crop size:", crop.size)

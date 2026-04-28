from PIL import Image

original_path = 'C:/Users/ROHAN/.gemini/antigravity/brain/70764263-2336-4ce3-87c0-b231922e65f8/kisancore_logo_options_1775471410672.png'
img = Image.open(original_path)
w, h = img.size

# DALL-E / Midjourney are typically exactly halving the image
q1 = img.crop((0, 0, w//2, h//2))
q2 = img.crop((w//2, 0, w, h//2))
q3 = img.crop((0, h//2, w//2, h))
q4 = img.crop((w//2, h//2, w, h))

q1.save('c:/Users/ROHAN/kisancore-ai/frontend/public/q1.png')
q2.save('c:/Users/ROHAN/kisancore-ai/frontend/public/q2.png')
q3.save('c:/Users/ROHAN/kisancore-ai/frontend/public/q3.png')
q4.save('c:/Users/ROHAN/kisancore-ai/frontend/public/q4.png')

from PIL import Image
import math

img = Image.open('c:/Users/ROHAN/kisancore-ai/frontend/public/kisancore_premium_full_v15.png')
# Assuming dark background around the border
bg_color = img.getpixel((10, 10))

data = img.getdata()
w, h = img.size

min_x, min_y, max_x, max_y = w, h, 0, 0
for y in range(h):
    for x in range(w):
        p = data[y * w + x]
        diff = sum(abs(p[i] - bg_color[i]) for i in range(3))
        if diff > 30: # Not background
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y

if min_x <= max_x:
    leaf_w = max_x - min_x
    leaf_h = max_y - min_y
    print(f"Total size: {w}x{h}")
    print(f"Leaf bounding box: {min_x},{min_y} to {max_x},{max_y}")
    print(f"Leaf size: {leaf_w}x{leaf_h}")
    print(f"Leaf area covers {leaf_w/w*100:.1f}% width and {leaf_h/h*100:.1f}% height")
else:
    print("Could not find leaf.")

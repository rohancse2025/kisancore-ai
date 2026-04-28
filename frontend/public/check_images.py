import glob
from PIL import Image

for f in glob.glob('c:/Users/ROHAN/kisancore-ai/frontend/public/*.png'):
    try:
        img = Image.open(f)
        print(f.split('\\')[-1].split('/')[-1])
        print("  Size:", img.size, "Mode:", img.mode)
        if 'A' in img.mode:
            bbox = img.split()[3].getbbox()
            if bbox:
                w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
                print(f"  Alpha Bbox size: {w}x{h}")
            else:
                print("  Fully transparent")
    except Exception as e:
        print(f, e)

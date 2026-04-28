from PIL import Image

def create_transparent_logo():
    original_path = 'C:/Users/ROHAN/.gemini/antigravity/brain/70764263-2336-4ce3-87c0-b231922e65f8/kisancore_logo_options_1775471410672.png'
    output_path = 'c:/Users/ROHAN/kisancore-ai/frontend/public/kisancore_transparent_v16.png'
    
    img = Image.open(original_path).convert('RGBA')
    w, h = img.size
    
    # Precise crop of the Right Third (Option 3 area)
    crop = img.crop((w*2//3, h//4, w, h*3//4))
    
    bg_color = crop.getpixel((10, 10))
    
    # Make background transparent
    data = list(crop.getdata())
    
    new_data = []
    for p in data:
        # Distance from bg_color
        diff = sum(abs(p[i] - bg_color[i]) for i in range(3))
        if diff < 15: # strict background threshold
            new_data.append((p[0], p[1], p[2], 0))
        elif diff < 40: # anti-aliasing edge softening
            alpha = int(((diff - 15) / 25.0) * 255)
            new_data.append((p[0], p[1], p[2], alpha))
        else:
            new_data.append((p[0], p[1], p[2], 255))
    
    crop.putdata(new_data)
    
    # Find bounding box
    mask = crop.split()[3]
    bbox = mask.getbbox()
    
    if bbox:
        l, t, r, b = bbox
        padding = 10
        logo = crop.crop((max(0, l-padding), max(0, t-padding), min(crop.width, r+padding), min(crop.height, b+padding)))
        
        size = 1024
        # Fully transparent background
        final = Image.new('RGBA', (size, size), (0,0,0,0))
        
        # Scale logo to fill 95% of the square so it's large and prominent
        target_size = int(size * 0.95)
        scale = min(target_size / logo.width, target_size / logo.height)
        new_w, new_h = int(logo.width * scale), int(logo.height * scale)
        logo_scaled = logo.resize((new_w, new_h), Image.LANCZOS)
        
        final.paste(logo_scaled, ((size - new_w)//2, (size - new_h)//2))
        final.save(output_path)
        print("Transparent Logo created successfully!")

if __name__ == "__main__":
    create_transparent_logo()

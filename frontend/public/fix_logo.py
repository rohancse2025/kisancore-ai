from PIL import Image

def create_perfect_logo():
    # Path to original grid
    original_path = 'C:/Users/ROHAN/.gemini/antigravity/brain/70764263-2336-4ce3-87c0-b231922e65f8/kisancore_logo_options_1775471410672.png'
    output_path = 'c:/Users/ROHAN/kisancore-ai/frontend/public/kisancore_final_v12_zoom.png'
    
    img = Image.open(original_path)
    w, h = img.size
    
    # Precise crop of the Right Third (Option 3 area)
    # The logos are likely centered in their thirds.
    crop = img.crop((w*2//3, h//4, w, h*3//4))
    
    # Get background color from the crop's corner
    bg_color = crop.getpixel((10, 10))
    
    # Find the actual logo bounding box by looking for non-background pixels
    # (Checking for pixels that differ from the background)
    mask = Image.new('L', crop.size, 0)
    data = crop.getdata()
    mask_data = []
    for p in data:
        diff = sum(abs(p[i] - bg_color[i]) for i in range(3))
        mask_data.append(255 if diff > 15 else 0)
    mask.putdata(mask_data)
    
    bbox = mask.getbbox()
    if bbox:
        l, t, r, b = bbox
        # Add a nice 10% padding so it looks breathable
        padding = 30
        logo = crop.crop((max(0, l-padding), max(0, t-padding), min(crop.width, r+padding), min(crop.height, b+padding)))
        
        # Create final 512x512 square with the sampled background color
        size = 1024 # high res
        final = Image.new('RGB', (size, size), bg_color)
        
        # Scale logo to fill 85% of the square
        target_size = int(size * 0.85)
        scale = min(target_size / logo.width, target_size / logo.height)
        new_w, new_h = int(logo.width * scale), int(logo.height * scale)
        logo_scaled = logo.resize((new_w, new_h), Image.LANCZOS)
        
        # Paste in center
        final.paste(logo_scaled, ((size - new_w)//2, (size - new_h)//2))
        final.save(output_path)
        print("Logo created successfully!")

if __name__ == "__main__":
    create_perfect_logo()

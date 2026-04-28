from PIL import Image, ImageDraw

def create_rounded_transparent():
    # Base solid image
    img = Image.open('c:/Users/ROHAN/kisancore-ai/frontend/public/kisancore_final.png').convert("RGBA")
    w, h = img.size
    
    # Create mask with rounded corners
    radius = int(w * 0.15) # 15% corner radius is standard
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, w, h), radius=radius, fill=255)
    
    # Create new image with transparent background
    result = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask)
    
    # Save the Windows specific icon
    result.save('c:/Users/ROHAN/kisancore-ai/frontend/public/kisancore_windows.png')
    print("Rounded transparent icon created!")

if __name__ == "__main__":
    create_rounded_transparent()

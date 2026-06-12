from PIL import Image, ImageFilter
import numpy as np

img = Image.open("/home/user/workspace/uploaded_attachments/89bb03d34eb146a8ba64fd85d3d95881/monkey.jpeg").convert("RGBA")
data = np.array(img, dtype=np.float32)

r, g, b = data[:,:,0], data[:,:,1], data[:,:,2]

# Build a smooth alpha mask based on how "white" each pixel is
# White = all channels high and similar
whiteness = (r + g + b) / 3.0  # 0–255
# Pixels above 240 = fully transparent, below 200 = fully opaque, smooth blend between
alpha = np.clip((240 - whiteness) / (240 - 200) * 255, 0, 255)

data[:,:,3] = alpha
img2 = Image.fromarray(data.astype(np.uint8))

# Slight blur on alpha channel only to smooth jagged edges
r2, g2, b2, a2 = img2.split()
a2 = a2.filter(ImageFilter.GaussianBlur(radius=1.2))
img2 = Image.merge("RGBA", (r2, g2, b2, a2))

# Tight crop
data2 = np.array(img2)
alpha2 = data2[:,:,3]
rows = np.where(alpha2.sum(axis=1) > 10)[0]
cols = np.where(alpha2.sum(axis=0) > 10)[0]
pad = 24
t = max(0, rows[0]-pad)
b = min(img2.height, rows[-1]+pad)
l = max(0, cols[0]-pad)
r3 = min(img2.width, cols[-1]+pad)

cropped = img2.crop((l, t, r3, b))
cw, ch = cropped.size

# Square canvas
size = max(cw, ch) + 10
square = Image.new("RGBA", (size, size), (0,0,0,0))
square.paste(cropped, ((size-cw)//2, (size-ch)//2))

square.save("/home/user/workspace/monky/attached_assets/splash_monkey.png", "PNG")
print(f"Saved {size}x{size}")

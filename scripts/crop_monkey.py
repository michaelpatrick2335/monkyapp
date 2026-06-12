from PIL import Image
import numpy as np

img = Image.open("/home/user/workspace/monky/attached_assets/monky_logo_transparent.png").convert("RGBA")

# Monkey body: tight crop, minimal padding
top    = 560
bottom = 940
left   = 290
right  = 1210

cropped = img.crop((left, top, right, bottom))
data = np.array(cropped)

# Remove stray green text pixels
r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
green_text = (g.astype(int) - r.astype(int) > 60) & (g.astype(int) - b.astype(int) > 60) & (g > 80)
data[green_text] = [0, 0, 0, 0]
cropped = Image.fromarray(data)

# Tight bounding box — find actual content bounds
data2 = np.array(cropped)
alpha2 = data2[:,:,3]
rows = np.where(alpha2.sum(axis=1) > 0)[0]
cols = np.where(alpha2.sum(axis=0) > 0)[0]
pad = 10  # just 10px breathing room
t, b2, l, r2 = rows[0]-pad, rows[-1]+pad, cols[0]-pad, cols[-1]+pad
t = max(0, t); l = max(0, l)

tight = cropped.crop((l, t, r2, b2))
tw, th = tight.size

# Square it
size = max(tw, th) + 20
square = Image.new("RGBA", (size, size), (0, 0, 0, 0))
square.paste(tight, ((size - tw)//2, (size - th)//2))

square.save("/home/user/workspace/monky/attached_assets/monky_monkey_only.png", "PNG")
print(f"Tight crop saved: {size}x{size} (monkey {tw}x{th})")

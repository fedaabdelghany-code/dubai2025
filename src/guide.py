import fitz
from PIL import Image

# Open the PDF
pdf = fitz.open("src/assets/guide.pdf")
images = []

# Adjust these to control how much of the footer to remove
CROP_PIXELS = 100        # remove fixed pixel height from bottom
CROP_PERCENT = 0.05      # or remove 5% of height (optional)

for page in pdf[:-1]:
    pix = page.get_pixmap(matrix=fitz.Matrix(3, 3))
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

    # Compute how much to crop
    crop_height = max(CROP_PIXELS, int(img.height * CROP_PERCENT))
    crop_box = (0, 0, img.width, img.height - crop_height)

    # Crop the footer area
    cropped = img.crop(crop_box)
    images.append(cropped)

# Calculate total height
total_height = sum(i.height for i in images)
max_width = max(i.width for i in images)

# Create one tall image
combined = Image.new("RGB", (max_width, total_height), color=(255, 255, 255))

y_offset = 0
for i in images:
    combined.paste(i, (0, y_offset))
    y_offset += i.height

# Save the final long image
combined.save("output_long_image.jpg")

print("✅ Done! Saved as output_long_image.jpg")

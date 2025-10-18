import qrcode
import csv
import os
from pathlib import Path

def create_vcard(name, position, country, email, phone, linkedin):
    """
    Create a vCard format string for contact information
    """
    vcard = f"""BEGIN:VCARD
VERSION:3.0
FN:{name}
TITLE:{position}
EMAIL:{email}
TEL:{phone}
URL:{linkedin}
ADR:;;;;;;{country}
END:VCARD"""
    return vcard

def generate_qr_code(vcard_data, filename, output_folder='qr_codes'):
    """
    Generate a QR code from vCard data and save it as an image
    """
    # Create output folder if it doesn't exist
    Path(output_folder).mkdir(parents=True, exist_ok=True)
    
    # Create QR code instance
    qr = qrcode.QRCode(
        version=None,  # Auto-determine size
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    
    # Add data and generate
    qr.add_data(vcard_data)
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save image
    filepath = os.path.join(output_folder, f"{filename}.png")
    img.save(filepath)
    print(f"Generated: {filepath}")

def process_csv(csv_file, output_folder='qr_codes'):
    """
    Read CSV file and generate QR codes for each person
    Expected CSV columns: Name, Position, Country, Email, Phone, LinkedIn
    """
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            
            count = 0
            for row in csv_reader:
                # Extract data from CSV
                name = row.get('Name', '').strip()
                position = row.get('Position', '').strip()
                country = row.get('Country', '').strip()
                email = row.get('Email', '').strip()
                phone = row.get('Phone', '').strip()
                linkedin = row.get('LinkedIn', '').strip()
                
                # Skip empty rows
                if not name:
                    continue
                
                # Create vCard
                vcard = create_vcard(name, position, country, email, phone, linkedin)
                
                # Generate filename (sanitize name for filename)
                safe_filename = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).strip()
                safe_filename = safe_filename.replace(' ', '_')
                
                # Generate QR code
                generate_qr_code(vcard, safe_filename, output_folder)
                count += 1
            
            print(f"\n✓ Successfully generated {count} QR codes in '{output_folder}' folder!")
            
    except FileNotFoundError:
        print(f"Error: CSV file '{csv_file}' not found!")
    except Exception as e:
        print(f"Error processing CSV: {str(e)}")

# Example usage
if __name__ == "__main__":
    # Specify your CSV file name
    csv_filename = "business_cards.csv"
    
    # Optional: specify custom output folder
    output_folder = "qr_codes"
    
    print("Starting QR Code generation...")
    print(f"Reading from: {csv_filename}")
    print(f"Output folder: {output_folder}\n")
    
    process_csv(csv_filename, output_folder)
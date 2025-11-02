import qrcode
import csv
import os
from pathlib import Path

# Dummy data for testing
DUMMY_DATA = [
    {
        "Name": "Sarah Johnson",
        "Position": "Marketing Director",
        "Country": "United States",
        "Email": "sarah.johnson@company.com",
        "Phone": "+1-555-0123",
        "LinkedIn": "https://linkedin.com/in/sarahjohnson"
    },
    {
        "Name": "Carlos Rodriguez",
        "Position": "Software Engineer",
        "Country": "Spain",
        "Email": "carlos.r@company.com",
        "Phone": "+34-612-345-678",
        "LinkedIn": "https://linkedin.com/in/carlosrodriguez"
    },
    {
        "Name": "Yuki Tanaka",
        "Position": "Product Manager",
        "Country": "Japan",
        "Email": "yuki.tanaka@company.com",
        "Phone": "+81-90-1234-5678",
        "LinkedIn": "https://linkedin.com/in/yukitanaka"
    },
    {
        "Name": "Emma Williams",
        "Position": "CEO & Founder",
        "Country": "United Kingdom",
        "Email": "emma@company.com",
        "Phone": "+44-7700-900123",
        "LinkedIn": "https://linkedin.com/in/emmawilliams"
    },
    {
        "Name": "Ahmed Hassan",
        "Position": "Sales Manager",
        "Country": "Egypt",
        "Email": "ahmed.hassan@company.com",
        "Phone": "+20-100-123-4567",
        "LinkedIn": "https://linkedin.com/in/ahmedhassan"
    }
]

def create_vcard(name, position, country, email, phone, linkedin):
    """
    Create a vCard format string for contact information (vCard 3.0)
    This format is universally supported by smartphones
    """
    vcard = f"""BEGIN:VCARD
VERSION:3.0
FN:{name}
TITLE:{position}
EMAIL:{email}
TEL;TYPE=WORK,VOICE:{phone}
URL:{linkedin}
ADR;TYPE=WORK:;;;;;;{country}
END:VCARD"""
    return vcard

def generate_qr_code(vcard_data, filename, output_folder='qr_codes'):
    """
    Generate a QR code from vCard data and save it as an image
    """
    Path(output_folder).mkdir(parents=True, exist_ok=True)
    
    # Create QR code with optimal settings for vCard
    qr = qrcode.QRCode(
        version=None,  # Auto-determine size
        error_correction=qrcode.constants.ERROR_CORRECT_M,  # Medium correction for better scanning
        box_size=10,
        border=4,
    )
    
    qr.add_data(vcard_data)
    qr.make(fit=True)
    
    # Create and save image
    img = qr.make_image(fill_color="black", back_color="white")
    filepath = os.path.join(output_folder, f"{filename}.png")
    img.save(filepath)
    print(f"✓ Generated: {filepath}")
    
    return filepath

def create_dummy_csv(filename='business_cards.csv'):
    """
    Create a CSV file with dummy business card data
    """
    with open(filename, 'w', newline='', encoding='utf-8') as file:
        fieldnames = ['Name', 'Position', 'Country', 'Email', 'Phone', 'LinkedIn']
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        
        writer.writeheader()
        writer.writerows(DUMMY_DATA)
    
    print(f"✓ Created dummy CSV file: {filename}\n")
    return filename

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
                # Extract and clean data
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
                
                # Generate safe filename
                safe_filename = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).strip()
                safe_filename = safe_filename.replace(' ', '_')
                
                # Generate QR code
                generate_qr_code(vcard, safe_filename, output_folder)
                count += 1
            
            print(f"\n{'='*50}")
            print(f"✓ SUCCESS: Generated {count} QR business cards!")
            print(f"📁 Location: '{output_folder}' folder")
            print(f"{'='*50}")
            print("\n📱 To test: Scan any QR code with your phone's camera")
            print("   It should prompt you to save the contact automatically!")
            
    except FileNotFoundError:
        print(f"❌ Error: CSV file '{csv_file}' not found!")
    except Exception as e:
        print(f"❌ Error processing CSV: {str(e)}")

def generate_from_dummy_data(output_folder='qr_codes'):
    """
    Generate QR codes directly from dummy data (no CSV needed)
    """
    print("Generating QR codes from dummy data...\n")
    Path(output_folder).mkdir(parents=True, exist_ok=True)
    
    for person in DUMMY_DATA:
        vcard = create_vcard(
            person['Name'],
            person['Position'],
            person['Country'],
            person['Email'],
            person['Phone'],
            person['LinkedIn']
        )
        
        safe_filename = "".join(c for c in person['Name'] if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_filename = safe_filename.replace(' ', '_')
        
        generate_qr_code(vcard, safe_filename, output_folder)
    
    print(f"\n{'='*50}")
    print(f"✓ SUCCESS: Generated {len(DUMMY_DATA)} QR business cards!")
    print(f"📁 Location: '{output_folder}' folder")
    print(f"{'='*50}")
    print("\n📱 To test: Scan any QR code with your phone's camera")
    print("   It should prompt you to save the contact automatically!")

if __name__ == "__main__":
    print("="*50)
    print("QR BUSINESS CARD GENERATOR")
    print("="*50)
    print("\nChoose an option:")
    print("1. Generate from dummy data (quick test)")
    print("2. Create CSV template and generate from it")
    print("3. Generate from existing CSV file")
    
    choice = input("\nEnter choice (1/2/3) [default: 1]: ").strip() or "1"
    
    output_folder = input("Output folder name [default: qr_codes]: ").strip() or "qr_codes"
    
    print(f"\n{'='*50}\n")
    
    if choice == "1":
        # Quick generation from dummy data
        generate_from_dummy_data(output_folder)
        
    elif choice == "2":
        # Create CSV then generate
        csv_file = input("CSV filename [default: business_cards.csv]: ").strip() or "business_cards.csv"
        create_dummy_csv(csv_file)
        process_csv(csv_file, output_folder)
        
    elif choice == "3":
        # Use existing CSV
        csv_file = input("Enter CSV filename: ").strip()
        if csv_file:
            process_csv(csv_file, output_folder)
        else:
            print("❌ No filename provided!")
    else:
        print("❌ Invalid choice!")
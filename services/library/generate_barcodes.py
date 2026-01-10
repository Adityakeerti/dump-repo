#!/usr/bin/env python3
"""
Barcode Generator for CampusIntell Library System
Connects to MySQL database (connect_college) and generates barcodes for all books.

Usage:
    python generate_barcodes.py              # Generate barcodes for all books
    python generate_barcodes.py --sheet      # Generate printable sheet
    python generate_barcodes.py --single BK001001  # Generate single barcode
"""

import os
import sys
import io
from PIL import Image, ImageDraw, ImageFont

# Install dependencies if not present
try:
    from barcode import Code128
    from barcode.writer import ImageWriter
except ImportError:
    print("Installing python-barcode...")
    os.system(f'{sys.executable} -m pip install python-barcode pillow')
    from barcode import Code128
    from barcode.writer import ImageWriter

try:
    import mysql.connector
except ImportError:
    print("Installing mysql-connector-python...")
    os.system(f'{sys.executable} -m pip install mysql-connector-python')
    import mysql.connector

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',           # Change as needed
    'password': 'aditya',           # Change as needed
    'database': 'connect_college'
}

# Output directory for barcodes
BARCODE_DIR = "barcodes"


def get_db_connection():
    """Get MySQL database connection"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except mysql.connector.Error as e:
        print(f"❌ Database connection error: {e}")
        print("   Make sure MySQL is running and connect_college database exists.")
        return None


def generate_single_barcode(barcode_id: str, title: str, author: str, save_path: str = None):
    """Generate a single barcode image with book info"""
    
    # Generate Code128 barcode
    code = Code128(barcode_id, writer=ImageWriter())
    
    # Generate barcode image in memory
    buffer = io.BytesIO()
    code.write(buffer)
    buffer.seek(0)
    
    # Open barcode image
    barcode_img = Image.open(buffer)
    
    # Create a larger image with text
    img_width, img_height = 400, 300
    img = Image.new('RGB', (img_width, img_height), 'white')
    
    # Resize and paste barcode
    barcode_width, barcode_height = barcode_img.size
    scale = min(350 / barcode_width, 120 / barcode_height)
    new_width = int(barcode_width * scale)
    new_height = int(barcode_height * scale)
    
    barcode_img = barcode_img.resize((new_width, new_height))
    barcode_x = (img_width - new_width) // 2
    barcode_y = 50
    img.paste(barcode_img, (barcode_x, barcode_y))
    
    # Add text
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("arial.ttf", 14)
        small_font = ImageFont.truetype("arial.ttf", 10)
    except:
        font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    # Book title (truncated)
    title_text = title[:35] + "..." if len(title) > 35 else title
    draw.text((10, 10), title_text, fill="black", font=font)
    
    # Author
    if author:
        author_text = f"by {author[:30]}..." if len(author) > 30 else f"by {author}"
        draw.text((10, 30), author_text, fill="gray", font=small_font)
    
    # Barcode ID below barcode
    text_y = barcode_y + new_height + 10
    draw.text((barcode_x, text_y), barcode_id, fill="black", font=font)
    
    # Library name
    draw.text((10, img_height - 30), "CampusIntell Library", fill="blue", font=small_font)
    
    # Save image
    if save_path is None:
        save_path = f"{BARCODE_DIR}/{barcode_id}.png"
    
    os.makedirs(os.path.dirname(save_path) if os.path.dirname(save_path) else BARCODE_DIR, exist_ok=True)
    img.save(save_path)
    
    return save_path


def generate_all_barcodes():
    """Generate barcode images for all books in database"""
    
    conn = get_db_connection()
    if not conn:
        return 0
    
    cursor = conn.cursor()
    
    try:
        # Query all books with barcode_id
        cursor.execute("""
            SELECT book_id, title, author, barcode_id 
            FROM books 
            WHERE barcode_id IS NOT NULL AND barcode_id != ''
        """)
        books = cursor.fetchall()
        
        if not books:
            print("⚠️  No books with barcodes found in database.")
            print("   Make sure to add books with barcode_id values.")
            return 0
        
        print(f"\n📚 Generating barcodes for {len(books)} books...\n")
        
        os.makedirs(BARCODE_DIR, exist_ok=True)
        generated = 0
        
        for book_id, title, author, barcode_id in books:
            try:
                filepath = generate_single_barcode(barcode_id, title, author or "Unknown")
                print(f"  ✅ {barcode_id} - {title[:40]}{'...' if len(title) > 40 else ''}")
                generated += 1
            except Exception as e:
                print(f"  ❌ {barcode_id} - Error: {e}")
        
        print(f"\n🎉 Generated {generated} barcode images in '{BARCODE_DIR}/' folder")
        return generated
        
    except mysql.connector.Error as e:
        print(f"❌ Database error: {e}")
        return 0
    finally:
        cursor.close()
        conn.close()


def generate_barcode_sheet(limit=12):
    """Generate a single sheet with multiple barcodes for printing"""
    
    conn = get_db_connection()
    if not conn:
        return
    
    cursor = conn.cursor()
    
    try:
        cursor.execute(f"""
            SELECT barcode_id, title, author 
            FROM books 
            WHERE barcode_id IS NOT NULL AND barcode_id != ''
            LIMIT {limit}
        """)
        books = cursor.fetchall()
        
        if not books:
            print("⚠️  No books with barcodes found in database.")
            return
        
        # Create A4 sheet (2480x3508 pixels at 300 DPI)
        sheet_width, sheet_height = 2480, 3508
        sheet = Image.new('RGB', (sheet_width, sheet_height), 'white')
        
        # Grid: 2 columns, 6 rows
        cols, rows = 2, 6
        cell_width = sheet_width // cols
        cell_height = sheet_height // rows
        
        for i, (barcode_id, title, author) in enumerate(books):
            if i >= 12:  # Max 12 per sheet
                break
                
            row = i // cols
            col = i % cols
            
            x = col * cell_width + 50
            y = row * cell_height + 50
            
            # Generate barcode for this book
            code = Code128(barcode_id, writer=ImageWriter())
            buffer = io.BytesIO()
            code.write(buffer)
            buffer.seek(0)
            barcode_img = Image.open(buffer)
            
            # Resize barcode to fit cell
            barcode_width = cell_width - 100
            barcode_height = 150
            barcode_img = barcode_img.resize((barcode_width, barcode_height))
            
            # Paste barcode
            sheet.paste(barcode_img, (x, y + 80))
            
            # Add text
            draw = ImageDraw.Draw(sheet)
            try:
                font = ImageFont.truetype("arial.ttf", 36)
                small_font = ImageFont.truetype("arial.ttf", 24)
            except:
                font = ImageFont.load_default()
                small_font = ImageFont.load_default()
            
            # Title
            title_text = title[:25] + "..." if len(title) > 25 else title
            draw.text((x, y), title_text, fill="black", font=font)
            
            # Author
            if author:
                author_text = f"by {author[:20]}" if len(author) > 20 else f"by {author}"
                draw.text((x, y + 45), author_text, fill="gray", font=small_font)
            
            # Barcode ID below barcode
            draw.text((x, y + 250), barcode_id, fill="blue", font=font)
        
        # Save sheet
        os.makedirs(BARCODE_DIR, exist_ok=True)
        sheet_path = f"{BARCODE_DIR}/barcode_sheet.png"
        sheet.save(sheet_path)
        print(f"\n📄 Generated printable barcode sheet: {sheet_path}")
        print(f"   Contains {min(len(books), 12)} barcodes (A4 size, 300 DPI)")
        
    except mysql.connector.Error as e:
        print(f"❌ Database error: {e}")
    finally:
        cursor.close()
        conn.close()


def show_database_summary():
    """Show summary of books in database"""
    
    conn = get_db_connection()
    if not conn:
        return
    
    cursor = conn.cursor()
    
    try:
        # Total books
        cursor.execute("SELECT COUNT(*) FROM books")
        total = cursor.fetchone()[0]
        
        # Books with barcodes
        cursor.execute("SELECT COUNT(*) FROM books WHERE barcode_id IS NOT NULL AND barcode_id != ''")
        with_barcode = cursor.fetchone()[0]
        
        # Books by category
        cursor.execute("""
            SELECT c.name, COUNT(b.book_id) 
            FROM categories c
            LEFT JOIN books b ON c.category_id = b.category_id
            GROUP BY c.category_id, c.name
        """)
        categories = cursor.fetchall()
        
        print("\n📊 DATABASE SUMMARY")
        print("=" * 40)
        print(f"   Total Books:      {total}")
        print(f"   With Barcodes:    {with_barcode}")
        print(f"   Without Barcodes: {total - with_barcode}")
        print("\n   Books by Category:")
        for cat_name, count in categories:
            print(f"     • {cat_name}: {count}")
        print("=" * 40)
        
    except mysql.connector.Error as e:
        print(f"❌ Database error: {e}")
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("🏷️  CAMPUSINTELL BARCODE GENERATOR")
    print("=" * 50)
    
    # Check command line arguments
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg in ['--sheet', '-s', 'sheet']:
            generate_barcode_sheet()
        elif arg in ['--single', '-1'] and len(sys.argv) > 2:
            barcode_id = sys.argv[2]
            conn = get_db_connection()
            if conn:
                cursor = conn.cursor()
                cursor.execute("SELECT title, author FROM books WHERE barcode_id = %s", (barcode_id,))
                result = cursor.fetchone()
                if result:
                    path = generate_single_barcode(barcode_id, result[0], result[1] or "Unknown")
                    print(f"✅ Generated: {path}")
                else:
                    print(f"❌ Book with barcode '{barcode_id}' not found")
                cursor.close()
                conn.close()
        elif arg in ['--help', '-h']:
            print(__doc__)
        else:
            print(f"Unknown option: {arg}")
            print("Use --help for usage info")
    else:
        # Interactive mode
        show_database_summary()
        
        print("\nOptions:")
        print("  1. Generate individual barcodes for all books")
        print("  2. Generate printable sheet (12 per page)")
        print("  3. Both")
        print("  4. Exit")
        
        choice = input("\nSelect option [1]: ").strip()
        
        if choice == '2':
            generate_barcode_sheet()
        elif choice == '3':
            generate_all_barcodes()
            generate_barcode_sheet()
        elif choice == '4':
            print("Bye!")
        else:
            generate_all_barcodes()
    
    print()

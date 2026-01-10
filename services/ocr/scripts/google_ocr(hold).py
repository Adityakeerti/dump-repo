import time
import json
import os
from PIL import Image
from dotenv import load_dotenv
from google.api_core.client_options import ClientOptions
from google.cloud import documentai, storage

load_dotenv()

client = None
storage_client = None
project_id = None

def initialize_google_clients():
    global client, storage_client, project_id
    cred_file = "google_cred.json"
    if not os.path.exists(cred_file):
        print("Warning: google_cred.json not found. OCR will be skipped.")
        return False
    try:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_file
        with open(cred_file, 'r', encoding="utf-8") as f:
            cred_data = json.load(f)
            project_id = cred_data.get("project_id")
        if not project_id:
            print("Warning: Could not determine project ID from credentials.")
            return False
        storage_client = storage.Client()
        return True
    except Exception as e:
        print(f"Warning: Failed to initialize Google Cloud clients: {e}")
        return False

results_dir = "data/output/ocr_results"
if not os.path.exists(results_dir):
    os.makedirs(results_dir, exist_ok=True)
    print(f"Created results directory: {results_dir}")

def get_max_confidence_table(tables, table_type):
    filtered = [t for t in tables if t["table_type"] == table_type]
    if not filtered: return None
    return max(filtered, key=lambda x: x["confidence"])

def crop_table_from_image(image_path, coordinates, margin_ratio=0.10):
    with Image.open(image_path) as img:
        x1 = int(round(coordinates["x1"]))
        y1 = int(round(coordinates["y1"]))
        x2 = int(round(coordinates["x2"]))
        y2 = int(round(coordinates["y2"]))

        width = max(0, x2-x1)
        height = max(0, y2-y1)
        pad_x = int(round(width * margin_ratio))
        pad_y = int(round(height * margin_ratio))

        x1 -= pad_x
        y1 -= pad_y
        x2 += pad_x
        y2 += pad_y

        x1 = max(0, min(x1, img.width))
        y1 = max(0, min(y1, img.height))
        x2 = max(0, min(x2, img.width))
        y2 = max(0, min(y2, img.height))

        cropped = img.crop((x1, y1, x2, y2))
        return cropped

def save_cropped_image(cropped_img, filename, table_type):
    temp_filename = f"temp_{filename}_{table_type.replace(' ', '_').lower()}.jpg"
    if cropped_img.mode != 'RGB':
        cropped_img = cropped_img.convert('RGB')
    cropped_img.save(temp_filename, format='JPEG')
    return temp_filename

def upload_to_gcs(bucket_name, file_path, gcs_filename):
    if not storage_client:
        raise Exception("Storage client not initialized")
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(gcs_filename)
    blob.upload_from_filename(file_path)
    return f"gs://{bucket_name}/{gcs_filename}"

def batch_process_documents_with_doc_ai(project_id, location, processor_id, gcs_input_uri, gcs_output_uri):
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    doc_client = documentai.DocumentProcessorServiceClient(client_options=opts)
    name = doc_client.processor_path(project_id, location, processor_id)
    gcs_document = documentai.GcsDocument(gcs_uri=gcs_input_uri, mime_type="image/jpeg")
    gcs_documents = documentai.GcsDocuments(documents=[gcs_document])
    input_config = documentai.BatchDocumentsInputConfig(gcs_documents=gcs_documents)
    gcs_output_config = documentai.DocumentOutputConfig.GcsOutputConfig(gcs_uri=gcs_output_uri)
    output_config = documentai.DocumentOutputConfig(gcs_output_config=gcs_output_config)
    request = documentai.BatchProcessRequest(
        name=name,
        input_documents=input_config,
        document_output_config=output_config,
    )
    operation = doc_client.batch_process_documents(request)
    operation.result(timeout=420)

def get_doc_ai_results_text(bucket_name, gcs_prefix):
    if not storage_client:
        raise Exception("Storage client not initialized")
    bucket = storage_client.bucket(bucket_name)
    blob_list = list(bucket.list_blobs(prefix=gcs_prefix))

    def get_text(text_anchor, full_text):
        if text_anchor.text_segments:
            start_index = int(text_anchor.text_segments[0].start_index)
            end_index = int(text_anchor.text_segments[0].end_index)
            return full_text[start_index:end_index]
        return ""

    result_lines = []
    for blob in blob_list:
        if blob.name.endswith(".json"):
            json_string = blob.download_as_bytes()
            document = documentai.Document.from_json(json_string)
            full_text = document.text

            # Improved row and column reconstruction
            for page in document.pages:
                lines_on_page = []
                for line in page.lines:
                    line_text = get_text(line.layout.text_anchor, full_text).strip()
                    if line_text:
                        y_coord = line.layout.bounding_poly.vertices[0].y
                        x_coord = line.layout.bounding_poly.vertices[0].x
                        lines_on_page.append({'text': line_text, 'y': y_coord, 'x': x_coord})

                if not lines_on_page: continue
                # Tighter y-tolerance to preserve tabular rows
                lines_on_page.sort(key=lambda l: l['y'])
                y_tolerance = 7
                current_visual_row = []
                prev_y = None

                for ld in lines_on_page:
                    if prev_y is None or abs(ld['y'] - prev_y) < y_tolerance:
                        current_visual_row.append(ld)
                        prev_y = ld['y']
                    else:
                        current_visual_row.sort(key=lambda l: l['x'])
                        reconstructed_row = [seg['text'] for seg in current_visual_row]
                        result_lines.append(' | '.join(reconstructed_row))
                        current_visual_row = [ld]
                        prev_y = ld['y']

                if current_visual_row:
                    current_visual_row.sort(key=lambda l: l['x'])
                    reconstructed_row = [seg['text'] for seg in current_visual_row]
                    result_lines.append(' | '.join(reconstructed_row))

                result_lines.append("--- Page Break ---")

    result_text = "\n".join(result_lines)
    return result_text

def cleanup_gcs(bucket_name, gcs_prefix, gcs_filename):
    if not storage_client: return
    bucket = storage_client.bucket(bucket_name)
    try:
        bucket.blob(gcs_filename).delete()
    except Exception: pass
    blobs_to_delete = list(bucket.list_blobs(prefix=gcs_prefix))
    for blob in blobs_to_delete:
        blob.delete()

def process_ocr_with_google(image_path, bucket_name, location, processor_id):
    if not client and not initialize_google_clients():
        return "OCR not available - no valid Google Cloud credentials"
    try:
        timestamp = int(time.time())
        image_filename = os.path.basename(image_path)
        gcs_filename = f"docai-input/{timestamp}-{image_filename}"
        gcs_output_prefix = f"docai-output/{timestamp}-{image_filename}/"
        gcs_input_uri = upload_to_gcs(bucket_name, image_path, gcs_filename)
        gcs_output_uri = f"gs://{bucket_name}/{gcs_output_prefix}"

        batch_process_documents_with_doc_ai(
            project_id, location, processor_id,
            gcs_input_uri, gcs_output_uri
        )

        extracted_text = get_doc_ai_results_text(bucket_name, gcs_output_prefix)
        cleanup_gcs(bucket_name, gcs_output_prefix, gcs_filename)
        return extracted_text
    except Exception as e:
        return f"OCR failed: {str(e)}"

def process_image_with_tables(image_path, json_path, bucket_name="marksheet_ocr", location="us", processor_id="44770fd7117288da"):
    print(f"Processing: {os.path.basename(image_path)}")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    filename = os.path.splitext(os.path.basename(image_path))[0]
    tables = data["table_detection"]["table_coordinates"]

    marks_table = get_max_confidence_table(tables, "Marks Table")
    info_table = get_max_confidence_table(tables, "Information Table")

    # Process Marks Table
    if marks_table:
        print(f"  Processing Marks Table (confidence: {marks_table['confidence']:.3f})")
        cropped_img = crop_table_from_image(image_path, marks_table["coordinates"], margin_ratio=0.10)
        temp_file = save_cropped_image(cropped_img, filename, "marks")
        try:
            marks_text = process_ocr_with_google(temp_file, bucket_name, location, processor_id)
            marks_output_path = os.path.join(results_dir, f"{filename}_marks.txt")
            with open(marks_output_path, 'w', encoding='utf-8') as f:
                f.write(marks_text)
            if "OCR not available" in marks_text or "OCR failed" in marks_text:
                print(f"  Warning: {marks_text}")
            else:
                print(f"  Saved marks table to: {marks_output_path}")
        except Exception as e:
            print(f"  Error processing marks table: {e}")
        finally:
            if os.path.exists(temp_file):
                os.remove(temp_file)

    # Process Information Table
    if info_table:
        print(f"  Processing Information Table (confidence: {info_table['confidence']:.3f})")
        cropped_img = crop_table_from_image(image_path, info_table["coordinates"], margin_ratio=0.15)
        temp_file = save_cropped_image(cropped_img, filename, "info")
        try:
            info_text = process_ocr_with_google(temp_file, bucket_name, location, processor_id)
            info_output_path = os.path.join(results_dir, f"{filename}_info.txt")
            with open(info_output_path, 'w', encoding='utf-8') as f:
                f.write(info_text)
            if "OCR not available" in info_text or "OCR failed" in info_text:
                print(f"  Warning: {info_text}")
            else:
                print(f"  Saved info table to: {info_output_path}")
        except Exception as e:
            print(f"  Error processing info table: {e}")
        finally:
            if os.path.exists(temp_file):
                os.remove(temp_file)
    if not marks_table and not info_table:
        print(f"  No tables found in {filename}")

def list_available_images():
    inputs_dir = "data/input"
    if not os.path.exists(inputs_dir):
        print(f"Error: {inputs_dir} directory not found!")
        return []
    image_files = []
    for file in os.listdir(inputs_dir):
        if file.lower().endswith(('.jpg', '.jpeg', '.png')):
            base_name = file.replace('_preprocessed', '').replace('.jpg', '').replace('.jpeg', '').replace('.png', '')
            json_file = f"{base_name}_result.json"
            json_path = os.path.join(inputs_dir, json_file)
            if os.path.exists(json_path):
                image_files.append((os.path.join(inputs_dir, file), json_path))
            else:
                print(f"Warning: No JSON file found for {file} (looking for {json_file})")
    return image_files

def process_single_image(image_path, json_path, bucket_name, location, processor_id):
    print(f"Processing: {os.path.basename(image_path)}")
    try:
        process_image_with_tables(image_path, json_path, bucket_name, location, processor_id)
        print("Processing completed successfully!")
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

def main():
    print("Google Document AI OCR Table Processing Tool")
    print("=" * 50)
    if not initialize_google_clients():
        print("\nERROR: Google Cloud not configured properly.")
        print("Please ensure google_cred.json exists in the project directory.")
        return
    bucket_name = os.getenv("GOOGLE_CLOUD_BUCKET", "marksheet_ocr")
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us")
    processor_id = os.getenv("GOOGLE_CLOUD_PROCESSOR_ID", "44770fd7117288da")
    print(f"Using Google Cloud configuration:")
    print(f"  Bucket: {bucket_name}")
    print(f"  Location: {location}")
    print(f"  Processor ID: {processor_id}")
    if not bucket_name or not processor_id:
        print("Error: Bucket name and processor ID are required!")
        return
    image_files = list_available_images()
    if not image_files:
        print("No image files with corresponding JSON files found!")
        return
    while True:
        print(f"\nAvailable images ({len(image_files)} found):")
        print("-" * 30)
        for i, (image_path, json_path) in enumerate(image_files, 1):
            filename = os.path.basename(image_path)
            print(f"{i}. {filename}")
        print("\nCommands:")
        print(f"  <number>   - Process specific image (1-{len(image_files)})")
        print("  all        - Process all images")
        print("  list       - Show this list again")
        print("  quit/exit  - Exit the program")
        choice = input("\nEnter your choice: ").strip().lower()
        if choice in ['quit', 'exit', 'q']:
            print("Goodbye!")
            break
        elif choice == 'all':
            print(f"\nProcessing all {len(image_files)} images...")
            print("=" * 50)
            for i, (image_path, json_path) in enumerate(image_files, 1):
                print(f"[{i}/{len(image_files)}] Processing: {os.path.basename(image_path)}")
                try:
                    process_image_with_tables(image_path, json_path, bucket_name, location, processor_id)
                except Exception as e:
                    print(f"Error processing {image_path}: {e}")
                print("-" * 30)
            print("All images processed!")
        elif choice == 'list':
            continue
        elif choice.isdigit():
            image_index = int(choice) - 1
            if 0 <= image_index < len(image_files):
                image_path, json_path = image_files[image_index]
                print(f"\nSelected: {os.path.basename(image_path)}")
                process_single_image(image_path, json_path, bucket_name, location, processor_id)
            else:
                print(f"Invalid choice! Please enter a number between 1 and {len(image_files)}")
        else:
            print("Invalid choice! Please enter a number, 'all', 'list', or 'quit'")

if __name__ == "__main__":
    main()

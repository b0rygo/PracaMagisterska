import ollama
import pytesseract
from pdf2image import convert_from_path

def extract_llama(pdf_path):
    # Najpierw pobieramy tekst (Hybryda OCR + LLM)
    images = convert_from_path(pdf_path)
    raw_text = pytesseract.image_to_string(images[0], lang='pol')

    # Prompt opisujący poszukiwane pola (zgodnie ze slajdem 33)
    prompt = f"""
    Z poniższego tekstu faktury wyekstrahuj dane: Sprzedawca, Nabywca, Kwota Brutto, NIP. 
    Zwróć wynik wyłącznie w formacie JSON.
    Tekst: {raw_text}
    """

    response = ollama.generate(model='llama3', prompt=prompt)
    return response['response']
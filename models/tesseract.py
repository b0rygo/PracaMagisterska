import pytesseract
from pdf2image import convert_from_path
import re

def extract_classic(pdf_path):
    # Konwersja PDF na obraz (Tesseract potrzebuje obrazu)
    images = convert_from_path(pdf_path)
    full_text = ""
    for img in images:
        full_text += pytesseract.image_to_string(img, lang='pol')

    # Bezpieczna funkcja do ekstrakcji regex
    def safe_search(pattern, text, group=0):
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        return match.group(group) if match else None

    def find_all(pattern, text):
        return re.findall(pattern, text, re.IGNORECASE)

    # === EKSTRAKCJA DANYCH Z FAKTURY ===

    # NIP Sprzedawcy (pierwszy NIP na fakturze)
    nip_pattern = r'NIP[:\s]*(\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\d{10})'
    all_nips = find_all(nip_pattern, full_text)
    nip_sprzedawcy = all_nips[0] if len(all_nips) > 0 else "Nie znaleziono"
    nip_nabywcy = all_nips[1] if len(all_nips) > 1 else "Nie znaleziono"

    # Numer faktury (format: FAKTURA Nr X/XXXX/XX)
    nr_faktury = safe_search(r'FAKTURA\s*Nr\s*(\d+/\d+/\d+)', full_text, 1)
    if not nr_faktury:
        nr_faktury = safe_search(r'Nr\s*(\d+/\d+/\d+)', full_text, 1)

    # Data wystawienia (szukamy przy "dnia:" lub pierwsza data)
    data_wystawienia = safe_search(r'dnia[:\s]*(\d{2}\.\d{2}\.\d{4})', full_text, 1)
    if not data_wystawienia:
        data_wystawienia = safe_search(r'(\d{2}\.\d{2}\.\d{4})', full_text, 1)

    # Data wykonania usługi
    data_uslugi = safe_search(r'Data wykonania[^:]*[:\s]*(\d{2}\.\d{2}\.\d{4})', full_text, 1)

    # Termin płatności
    termin_platnosci = safe_search(r'Termin\s*P[łl]atno[śs]ci[:\s]*(\d{2}\.\d{2}\.\d{4})', full_text, 1)

    # Sprzedawca (nazwa firmy po "Sprzedawca" - do słowa "Miejscowość" lub końca linii)
    sprzedawca = safe_search(r'Sprzedawca\s*\n+([^\n]+?)(?:\s+Miejscowość|\s+\d{2}-\d{3}|\n)', full_text, 1)
    if not sprzedawca:
        sprzedawca = safe_search(r'Sprzedawca\s*\n?([^\n]+)', full_text, 1)

    # Adres sprzedawcy
    adres_sprzedawcy = safe_search(r'(\d{2}-\d{3}\s+[^\n]+)', full_text, 1)

    # Nabywca (nazwa firmy po "Nabywca")
    nabywca = safe_search(r'Nabywca\s*\n+([^\n]+)', full_text, 1)

    # Adres nabywcy (linia po nazwie nabywcy zawierająca "ulica" lub kod pocztowy)
    adres_nabywcy = safe_search(r'Nabywca\s*\n+[^\n]+\n+([^\n]*(?:ulica|ul\.|ul |al\.|aleja|\d{2}-\d{3})[^\n]*)', full_text, 1)

    # Kwota brutto (RAZEM lub Do zapłaty)
    kwota_brutto = safe_search(r'RAZEM[:\s]*[\d\s]+[\d,\.]+\s+([\d\s]+[\d,\.]+)', full_text, 1)
    if not kwota_brutto:
        kwota_brutto = safe_search(r'Do zap[łl]aty[:\s]*([\d\s]+[,\.]?\d*)\s*z[łl]', full_text, 1)

    # Sposób płatności
    sposob_platnosci = safe_search(r'Spos[óo]b p[łl]atno[śs]ci[:\s]*(\w+)', full_text, 1)

    # Numer konta bankowego
    nr_konta = safe_search(r'Nr konta[:\s]*([\d\s]+)', full_text, 1)
    if nr_konta:
        nr_konta = nr_konta.strip()

    # Nazwa banku
    nazwa_banku = safe_search(r'Nazwa Banku[:\s]*([^\n]+)', full_text, 1)

    # Miejscowość i data wystawienia
    miejscowosc = safe_search(r'Miejscowo[śs][ćc][:\s]*([^\s]+)', full_text, 1)

    data = {
        "sprzedawca": {
            "nazwa": sprzedawca.strip() if sprzedawca else "Nie znaleziono",
            "adres": adres_sprzedawcy.strip() if adres_sprzedawcy else "Nie znaleziono",
            "nip": nip_sprzedawcy
        },
        "nabywca": {
            "nazwa": nabywca.strip() if nabywca else "Nie znaleziono",
            "adres": adres_nabywcy.strip() if adres_nabywcy else "Nie znaleziono",
            "nip": nip_nabywcy
        },
        "faktura": {
            "numer": nr_faktury if nr_faktury else "Nie znaleziono",
            "data_wystawienia": data_wystawienia if data_wystawienia else "Nie znaleziono",
            "data_wykonania_uslugi": data_uslugi if data_uslugi else "Nie znaleziono",
            "miejscowosc": miejscowosc if miejscowosc else "Nie znaleziono"
        },
        "platnosc": {
            "kwota_brutto": kwota_brutto.strip() if kwota_brutto else "Nie znaleziono",
            "termin_platnosci": termin_platnosci if termin_platnosci else "Nie znaleziono",
            "sposob_platnosci": sposob_platnosci if sposob_platnosci else "Nie znaleziono",
            "bank": nazwa_banku.strip() if nazwa_banku else "Nie znaleziono",
            "nr_konta": nr_konta if nr_konta else "Nie znaleziono"
        },
        "raw_text_preview": full_text[:800] + "..." if len(full_text) > 800 else full_text
    }
    return data
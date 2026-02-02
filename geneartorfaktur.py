import os
import random
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from faker import Faker
from num2words import num2words

# Inicjalizacja generatora danych w języku polskim
fake = Faker('pl_PL')


def setup_fonts():
    """Konfiguracja czcionki wspierającej polskie znaki."""
    # Próba znalezienia czcionki Arial w systemie Windows
    possible_paths = [
        "C:\\Windows\\Fonts\\arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",  # Linux
        "/Library/Fonts/Arial.ttf"  # macOS
    ]

    font_registered = False
    for path in possible_paths:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont('PolishFont', path))
                pdfmetrics.registerFont(
                    TTFont('PolishFontBold', path.replace('arial.ttf', 'arialbd.ttf') if 'arial.ttf' in path else path))
                font_registered = True
                break
            except:
                continue

    if not font_registered:
        print("UWAGA: Nie znaleziono czcionki systemowej z polskimi znakami. PDF może zawierać błędy wyświetlania.")
        return "Helvetica", "Helvetica-Bold"

    return "PolishFont", "PolishFontBold"


def generate_repair_style_invoice(filename, invoice_id, font_name, font_bold):
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4

    # --- NAGŁÓWEK / SPRZEDAWCA ---
    c.setFont(font_bold, 10)
    c.drawString(50, height - 50, "Sprzedawca")
    c.setFont(font_bold, 12)
    c.drawString(50, height - 65, "Przedsiębiorstwo Usługowe REPAIR")
    c.drawString(50, height - 80, "Patryk Patrykowski")
    c.setFont(font_name, 10)
    c.drawString(50, height - 95, "34-300 Żywiec ul. Kątowa 13")
    c.drawString(50, height - 110, "NIP 553 555 55 55")

    # --- MIEJSCOWOŚĆ I DATA ---
    data_wystawienia = fake.date_this_year().strftime('%d.%m.%Y')
    c.drawString(350, height - 65, f"Miejscowość: Żywiec dnia: {data_wystawienia}")

    # --- NABYWCA ---
    c.setFont(font_bold, 10)
    c.drawString(50, height - 150, "Nabywca")
    c.setFont(font_name, 10)
    buyer_name = fake.company()
    # Usuwamy entery z adresu dla czytelności w PDF
    buyer_address = fake.address().replace('\n', ', ')
    c.drawString(50, height - 165, f"{buyer_name}")
    c.drawString(50, height - 180, f"{buyer_address}")
    c.drawString(50, height - 195, f"NIP {fake.nip()}")

    # --- NUMER FAKTURY ---
    c.setFont(font_bold, 14)
    c.drawCentredString(width / 2, height - 230, f"FAKTURA Nr {invoice_id}/2025/01")

    # --- INFORMACJE O PŁATNOŚCI ---
    c.setFont(font_name, 9)
    c.drawString(50, height - 260, "Środek transportu: własny wykonawcy")
    c.drawString(300, height - 260, f"Data wykonania usługi: {data_wystawienia}")

    c.drawString(50, height - 280, "Sposób płatności: przelew")
    # Poprawiony parametr future_date
    termin_platnosci = fake.future_date(end_date='+14d').strftime('%d.%m.%Y')
    c.drawString(50, height - 295, f"Termin Płatności: {termin_platnosci}")
    c.drawString(50, height - 310, "Nazwa Banku: PKO BP")
    c.drawString(50, height - 325, "Nr konta: 83 1020 1390 0000 6902 0637 6463")

    # --- TABELA TOWARÓW ---
    y = height - 360
    c.setFont(font_bold, 8)
    headers = ["L.p.", "Nazwa towaru lub usługi", "j.m.", "Ilość", "Wartość Netto", "VAT %", "Kwota VAT", "Brutto"]
    x_positions = [50, 75, 250, 280, 320, 400, 440, 510]

    for i, header in enumerate(headers):
        c.drawString(x_positions[i], y, header)

    c.line(50, y - 5, 570, y - 5)
    y -= 20

    services = ["Przegląd techniczny", "Konsultacje technologiczne", "Naprawa maszyny wtryskowej", "Przegląd form",
                "Serwis układu sterowania"]
    total_netto = 0
    total_vat = 0

    for i in range(1, random.randint(2, 6)):
        name = random.choice(services)
        qty = random.randint(1, 15)
        price_netto = round(random.uniform(150, 2500), 2)
        val_netto = round(qty * price_netto, 2)
        val_vat = round(val_netto * 0.23, 2)
        val_brutto = round(val_netto + val_vat, 2)

        total_netto += val_netto
        total_vat += val_vat

        c.setFont(font_name, 8)
        c.drawString(x_positions[0], y, str(i))
        c.drawString(x_positions[1], y, name)
        c.drawString(x_positions[2], y, "kpl")
        c.drawString(x_positions[3], y, str(qty))
        c.drawString(x_positions[4], y, f"{val_netto:.2f}")
        c.drawString(x_positions[5], y, "23%")
        c.drawString(x_positions[6], y, f"{val_vat:.2f}")
        c.drawString(x_positions[7], y, f"{val_brutto:.2f}")
        y -= 15

    # --- PODSUMOWANIE ---
    y -= 20
    total_brutto = round(total_netto + total_vat, 2)
    c.setFont(font_bold, 10)
    c.drawString(320, y, "RAZEM:")
    c.drawString(440, y, f"{total_vat:.2f}")
    c.drawString(510, y, f"{total_brutto:.2f}")

    y -= 30
    c.setFont(font_bold, 11)
    c.drawString(50, y, f"Do zapłaty: {total_brutto:.2f} zł.")

    # Kwota słownie
    zlote = int(total_brutto)
    grosze = int(round((total_brutto - zlote) * 100))
    try:
        slownie = num2words(zlote, lang='pl').capitalize()
    except:
        slownie = str(zlote)

    c.setFont(font_name, 9)
    c.drawString(50, y - 15, f"Słownie: {slownie} złote {grosze:02d}/100 groszy")

    c.save()


# --- PROCES GENEROWANIA ---
if __name__ == "__main__":
    output_dir = "uploads"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print("Konfiguracja czcionek...")
    f_reg, f_bold = setup_fonts()

    print(f"Generowanie 100 faktur w folderze '{output_dir}'...")
    for i in range(1, 101):
        filename = os.path.join(output_dir, f"faktura_REPAIR_{i}.pdf")
        generate_repair_style_invoice(filename, i, f_reg, f_bold)
        if i % 10 == 0:
            print(f"Postęp: {i}%")

    print("\nSukces! Wszystkie faktury zostały wygenerowane poprawnie z polskimi znakami.")
from transformers import DonutProcessor, VisionEncoderDecoderModel
import torch
from PIL import Image
from pdf2image import convert_from_path

def extract_donut(pdf_path):
    # Załadowanie lokalnego modelu z HuggingFace
    processor = DonutProcessor.from_pretrained("naver-clova-ix/donut-base-finetuned-docvqa")
    model = VisionEncoderDecoderModel.from_pretrained("naver-clova-ix/donut-base-finetuned-docvqa")

    images = convert_from_path(pdf_path)
    image = images[0].convert("RGB") # Przetwarzamy pierwszą stronę

    pixel_values = processor(image, return_tensors="pt").pixel_values
    task_prompt = "<s_docvqa><s_question>What is the total amount?</s_question><s_answer>"
    decoder_input_ids = processor.tokenizer(task_prompt, add_special_tokens=False, return_tensors="pt").input_ids

    outputs = model.generate(
        pixel_values,
        decoder_input_ids=decoder_input_ids,
        max_length=model.config.decoder.max_position_embeddings,
        pad_token_id=processor.tokenizer.pad_token_id,
        eos_token_id=processor.tokenizer.eos_token_id,
    )

    return processor.batch_decode(outputs, skip_special_tokens=True)
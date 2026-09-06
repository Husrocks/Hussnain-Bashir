import fitz
import os

pdf_path = "e:/POrtfoilio/hussnain-bashir-resume.pdf"
doc = fitz.open(pdf_path)

found = False
for page in doc:
    # We will search for different variations just in case
    search_texts = ["(+92) 307-5345242", "+92 307-5345242", "307-5345242", "(+92) 307 5345242", "+92) 307-5345242"]
    for text in search_texts:
        text_instances = page.search_for(text)
        if text_instances:
            found = True
            for inst in text_instances:
                # Add redaction annotation with white fill so it seamlessly blends with background
                page.add_redact_annot(inst, fill=(1, 1, 1))
            page.apply_redactions()

if found:
    # Save directly over the original file
    doc.saveIncr()
    print("Successfully redacted the phone number from the PDF.")
else:
    print("Could not find the phone number in the PDF.")

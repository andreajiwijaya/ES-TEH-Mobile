#!/usr/bin/env python3
"""Cleanup duplicated bottomPad entries in contentContainerStyle arrays."""
from pathlib import Path
import re

ROOT = Path(r"c:\Users\MSI THIN 15\Mobile Version\es-teh")

def cleanup_text(text: str) -> str:
    # Replace duplicates of paddingBottom bottomPad in arrays
    text = re.sub(r"\{ paddingBottom: bottomPad \}, \{ paddingBottom: bottomPad \}", "{ paddingBottom: bottomPad }", text)
    # If multiple occurrences separated by commas, collapse to one
    text = re.sub(r"(contentContainerStyle=\{\[.*?)(\{ paddingBottom: bottomPad \},\s*)+(\])\}",
                  lambda m: re.sub(r"\{ paddingBottom: bottomPad \},\s*", "", m.group(0), count=100),
                  text,
                  flags=re.DOTALL)
    return text

if __name__ == "__main__":
    total = 0
    for p in (ROOT / "app").rglob('*.tsx'):
        txt = p.read_text(encoding='utf-8')
        new = cleanup_text(txt)
        if new != txt:
            p.write_text(new, encoding='utf-8')
            print(f"✓ Cleaned {p.relative_to(ROOT)}")
            total += 1
    print(f"\n✓ Total cleaned: {total}")

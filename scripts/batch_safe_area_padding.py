#!/usr/bin/env python3
"""Batch add Safe Area bottom padding to ScrollView/FlatList content across screens.
- Adds: useSafeAreaInsets import if missing
- Ensures: spacing import from DesignSystem
- Inserts: const insets = useSafeAreaInsets(); const bottomPad = insets.bottom + spacing.lg;
- Updates: contentContainerStyle to include paddingBottom: bottomPad
"""

from pathlib import Path
import re

ROOT = Path(r"c:\Users\MSI THIN 15\Mobile Version\es-teh")
TARGET_DIRS = [
    ROOT / "app/(owner)",
    ROOT / "app/(kasir)",
    ROOT / "app/(gudang)",
    ROOT / "app/(auth)",
]

EXTS = {".tsx"}

IMPORT_SAFEAREA = "import { useSafeAreaInsets } from 'react-native-safe-area-context';"
IMPORT_SPACING = "import { spacing } from '../../constants/DesignSystem';"
IMPORT_SPACING_ALT = "import { spacing, radius, typography } from '../../constants/DesignSystem';"

def ensure_imports(text: str) -> str:
    changed = False
    if "useSafeAreaInsets" not in text:
        # Insert after react-native imports block
        text = re.sub(r"(from 'react-native';\s*)", r"\1\n" + IMPORT_SAFEAREA + "\n", text)
        changed = True
    # Ensure spacing import exists (handle existing DesignSystem import variants)
    if "constants/DesignSystem" in text and "spacing" in text:
        pass
    else:
        # Try to upgrade existing DesignSystem import to include spacing
        text = re.sub(r"import \{([^}]*)\} from '../../constants/DesignSystem';",
                      lambda m: f"import {{{m.group(1)}, spacing}} from '../../constants/DesignSystem';" if "spacing" not in m.group(1) else m.group(0),
                      text)
        if "spacing" not in text:
            # Fallback: add a new spacing import after Colors
            text = re.sub(r"(import \{ Colors \} from '../../constants/Colors';\s*)",
                          r"\1" + IMPORT_SPACING + "\n",
                          text)
        changed = True
    return text

def ensure_bottom_pad_vars(text: str) -> str:
    # Insert insets and bottomPad after component start (export default function ...)
    pattern = r"(export default function [^{]+\{)"
    if re.search(pattern, text) and "bottomPad" not in text:
        text = re.sub(pattern,
                      lambda m: m.group(1) + "\n  const insets = useSafeAreaInsets();\n  const bottomPad = insets.bottom + spacing.lg;\n",
                      text)
    return text

def patch_content_container_style(text: str) -> str:
    # Convert contentContainerStyle={styles.foo} -> contentContainerStyle={[styles.foo, { paddingBottom: bottomPad }]}
    text = re.sub(r"contentContainerStyle=\{(styles\.[A-Za-z0-9_]+)\}", r"contentContainerStyle={[\1, { paddingBottom: bottomPad }]}", text)
    # If already array, merge paddingBottom (basic approach)
    text = re.sub(r"contentContainerStyle=\{\[(.+?)\]\}", lambda m: f"contentContainerStyle={{[{m.group(1)}, {{ paddingBottom: bottomPad }}]}}", text)
    # For FlatList/Grid lacking contentContainerStyle, add minimal one (risky to auto). Skip.
    return text

def process_file(path: Path):
    text = path.read_text(encoding='utf-8')
    original = text
    text = ensure_imports(text)
    text = ensure_bottom_pad_vars(text)
    text = patch_content_container_style(text)
    if text != original:
        path.write_text(text, encoding='utf-8')
        print(f"✓ Patched {path.relative_to(ROOT)}")
        return True
    return False

if __name__ == "__main__":
    total = 0
    for d in TARGET_DIRS:
        if not d.exists():
            continue
        for p in d.rglob('*'):
            if p.suffix in EXTS:
                if process_file(p):
                    total += 1
    print(f"\n✓ Total patched files: {total}")

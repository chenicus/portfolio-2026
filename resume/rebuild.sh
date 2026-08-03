#!/bin/sh
# Rebuild everything the resume page is made of, from one source file.
#
#     sh rebuild.sh
#
# Edit "Charlotte Chen 2026.html" — that is the resume now — then run this.
# It writes:
#
#   Charlotte Chen 2026.pdf     the file the Download link serves, and the name
#                               it lands under in someone's Downloads folder
#   resume-page-1.webp          the page image the sheet displays
#   index.html                  rewritten between the TEXT-LAYER markers, with
#                               transparent, positioned, selectable copies of
#                               every line laid over that image
#
# Why the page shows an image with text over it rather than the PDF itself:
# iOS Safari paints nothing inside a PDF <iframe>, and Chrome and Firefox both
# have a setting that downloads PDFs instead of displaying them — in every one
# of those cases an embedded PDF is a blank rectangle, and the iframe fires
# load anyway, so there is no way to detect it and recover. The image always
# renders; the overlay makes it select and copy like a document.
#
# Needs poppler, webp and Chrome:  brew install poppler webp

set -e
cd "$(dirname "$0")"

# Quoted everywhere below — both names contain spaces on purpose, so that the
# file a recruiter saves is called "Charlotte Chen 2026.pdf".
PDF="Charlotte Chen 2026.pdf"
SRC="Charlotte Chen 2026.html"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

[ -f "$SRC" ] || { echo "missing $SRC"; exit 1; }
[ -x "$CHROME" ] || { echo "missing Chrome at $CHROME"; exit 1; }

echo "→ pdf"
"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
          --print-to-pdf="$PWD/$PDF" "file://$PWD/$SRC" 2>/dev/null

# The point of this whole file. macOS system fonts (-apple-system, SF Pro) go
# through CoreText and land in the PDF as Type 3 outlines with a custom
# encoding, which no browser can read — pdf.js extracted zero characters from
# the version of this resume that shipped that way. Helvetica Neue and friends
# embed as CID TrueType with a ToUnicode map instead. Fail loudly rather than
# quietly shipping an unreadable file again.
if pdffonts "$PDF" | tail -n +3 | grep -q "Type 3"; then
  echo
  echo "STOP: $PDF came out with Type 3 fonts, which browsers cannot read."
  echo "Check font-family in $SRC — a macOS system font will do this."
  pdffonts "$PDF"
  exit 1
fi
echo "   fonts ok: $(pdffonts "$PDF" | tail -n +3 | awk '{print $2, $3}' | sort -u | tr '\n' ' ')"

echo "→ page image"
pdftoppm -png -r 200 -singlefile "$PDF" _page
cwebp -quiet -q 88 _page.png -o resume-page-1.webp
rm -f _page.png

echo "→ text layer"
pdftotext -bbox-layout "$PDF" _bbox.html
python3 - <<'PY'
import html, re

src = open('_bbox.html', encoding='utf-8').read()

page = re.search(r'<page width="([\d.]+)" height="([\d.]+)"', src)
PW, PH = float(page.group(1)), float(page.group(2))

out = []
for line in re.finditer(r'<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</line>', src, re.S):
    body = line.group(5)
    x0, y0, x1, y1 = (float(line.group(i)) for i in range(1, 5))
    words = []
    for w in re.finditer(r'<word xMin="([\d.]+)"[^>]*xMax="([\d.]+)"[^>]*>(.*?)</word>', body, re.S):
        t = html.unescape(w.group(3)).strip()
        if t:
            words.append((float(w.group(1)), float(w.group(2)), t))
    if not words:
        continue
    # Rejoin on the gap between word boxes rather than a blanket space: poppler
    # splits at some kerning pairs as well as at real spaces, which copies out
    # as "20 1 8 | V ancouver". Measured on this file, kerning gaps sit under
    # 0.02 of the line height and real spaces above 0.14.
    gap_min = (y1 - y0) * 0.09
    text = words[0][2]
    for (wx0, _, t), (_, px1, _) in zip(words[1:], words):
        text += (' ' if wx0 - px1 >= gap_min else '') + t
    # The <br> is what makes a copied selection come out as lines: every span is
    # absolutely positioned, so without them the browser pastes one long run.
    out.append(
        '<span style="left:%.2fpx;top:%.2fpx;width:%.2fpx;font-size:%.2fpx">%s</span><br>'
        % (x0, y0, x1 - x0, y1 - y0, html.escape(text))
    )

frag = ('          <div class="resume-text" style="width:%.2fpx;height:%.2fpx">\n' % (PW, PH)
        + '\n'.join('            ' + s for s in out)
        + '\n          </div>')

pg = open('index.html', encoding='utf-8').read()
START = '<!-- TEXT-LAYER:start — generated, see rebuild.sh -->'
END = '<!-- TEXT-LAYER:end -->'
i, j = pg.index(START), pg.index(END)
pg = pg[:i + len(START)] + '\n' + frag + '\n          ' + pg[j:]
pg = re.sub(r'--stage-w: [\d.]+px; --stage-h: [\d.]+px',
            '--stage-w: %gpx; --stage-h: %gpx' % (PW, PH), pg)
open('index.html', 'w', encoding='utf-8').write(pg)
print('   %d lines injected, page %gx%g pt' % (len(out), PW, PH))
PY
rm -f _bbox.html

echo
echo "done — index.html updated in place."

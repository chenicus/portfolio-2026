#!/bin/sh
# Regenerate everything the resume page derives from the PDF.
#
# Run this from this folder after dropping in a new Charlotte-Chen-Resume.pdf:
#
#     sh rebuild.sh
#
# It writes two files, both committed:
#
#   resume-page-1.webp   the page image the sheet displays
#   index.html           rewritten in place between the TEXT-LAYER markers,
#                        with transparent, positioned, selectable copies of
#                        every line of the PDF
#
# Why a generated text layer instead of embedding the PDF: this PDF's text is
# drawn with Type 3 fonts and a custom encoding (what Figma exports), which
# browsers' own text layers cannot read — pdf.js extracts zero characters from
# it, and an <iframe> of a PDF renders nothing at all on iOS. Poppler *can*
# read it, so the text and its coordinates are lifted here, once, and laid over
# the image as real selectable text that works in every browser.
#
# Needs poppler and webp:  brew install poppler webp

set -e
cd "$(dirname "$0")"

PDF=Charlotte-Chen-Resume.pdf
[ -f "$PDF" ] || { echo "missing $PDF"; exit 1; }

echo "→ page image"
pdftoppm -png -r 200 -singlefile "$PDF" _page
cwebp -quiet -q 88 _page.png -o resume-page-1.webp
rm -f _page.png

echo "→ text layer"
pdftotext -bbox-layout "$PDF" _bbox.html
python3 - "$@" <<'PY'
import html, re, sys

src = open('_bbox.html', encoding='utf-8').read()

page = re.search(r'<page width="([\d.]+)" height="([\d.]+)"', src)
PW, PH = float(page.group(1)), float(page.group(2))

out = []
for line in re.finditer(r'<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</line>', src, re.S):
    body = line.group(5)
    x0, y0, x1, y1 = (float(line.group(i)) for i in range(1, 5))
    # Rejoin using the gap between word boxes, not a blanket space. Poppler
    # splits this PDF's Type 3 text at kerning pairs as well as at real
    # spaces, so a plain ' '.join() copies out as "20 1 8 | V ancouver". A gap
    # narrower than a fraction of the line height was never a space.
    words = []
    for w in re.finditer(r'<word xMin="([\d.]+)"[^>]*xMax="([\d.]+)"[^>]*>(.*?)</word>', body, re.S):
        t = html.unescape(w.group(3)).strip()
        if t:
            words.append((float(w.group(1)), float(w.group(2)), t))
    if not words:
        continue
    gap_min = (y1 - y0) * 0.09
    text = words[0][2]
    for (wx0, _, t), (_, px1, _) in zip(words[1:], words):
        text += (' ' if wx0 - px1 >= gap_min else '') + t
    # The <br> is what makes a copied selection come out as lines. Every span
    # is absolutely positioned, so the browser sees one continuous run and
    # pastes "Charlotte ChenCONTACTEXPERIENCE..." without them. Same trick the
    # pdf.js text layer uses, and the reason .resume-text br is styled at all.
    out.append(
        '<span style="left:%.2fpx;top:%.2fpx;width:%.2fpx;font-size:%.2fpx">%s</span><br>'
        % (x0, y0, x1 - x0, y1 - y0, html.escape(text))
    )

frag = ('          <div class="resume-text" style="width:%.2fpx;height:%.2fpx">\n' % (PW, PH)
        + '\n'.join('            ' + s for s in out)
        + '\n          </div>')

page = open('index.html', encoding='utf-8').read()
START = '<!-- TEXT-LAYER:start — generated, see rebuild.sh -->'
END = '<!-- TEXT-LAYER:end -->'
i, j = page.index(START), page.index(END)
page = page[:i + len(START)] + '\n' + frag + '\n          ' + page[j:]

# the stage is authored at the page's point size; keep it honest
page = re.sub(r'--stage-w: [\d.]+px; --stage-h: [\d.]+px',
              '--stage-w: %gpx; --stage-h: %gpx' % (PW, PH), page)

open('index.html', 'w', encoding='utf-8').write(page)
print('   %d lines injected, page %gx%g pt' % (len(out), PW, PH))
PY
rm -f _bbox.html

echo
echo "index.html updated in place."

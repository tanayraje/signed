// The logbook stamps: one ink design per achievement, drawn as SVG markup (built from fixed strings here, never from
// anything a person typed). "C" is swapped for the ink colour. Unearned stamps show only a dotted outline of their shape,
// so the design is a surprise until it is stamped.
import type { CSSProperties } from 'react';

type Shape = 'circle' | 'perf' | 'octa' | 'oval' | 'label';
const FRAMES: Record<Shape, string> = {
  "circle": "<defs><path id=\"%ID%t\" d=\"M12 50 A38 38 0 0 1 88 50\"></path><path id=\"%ID%b\" d=\"M8.5 50 A41.5 41.5 0 0 0 91.5 50\"></path></defs><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"none\" stroke=\"C\" stroke-width=\"2.6\"></circle><circle cx=\"50\" cy=\"50\" r=\"34.5\" fill=\"none\" stroke=\"C\" stroke-width=\"1.1\"></circle><text font-family=\"Newsreader, Georgia, serif\" font-size=\"7.8\" letter-spacing=\"1.2\" font-weight=\"600\" fill=\"C\"><textPath href=\"#%ID%t\" startOffset=\"50%\" text-anchor=\"middle\">%TOP%</textPath></text><text font-family=\"Newsreader, Georgia, serif\" font-size=\"7.2\" letter-spacing=\"1.4\" fill=\"C\"><textPath href=\"#%ID%b\" startOffset=\"50%\" text-anchor=\"middle\">%DATE%</textPath></text><circle cx=\"8.5\" cy=\"50\" r=\"1.6\" fill=\"C\"></circle><circle cx=\"91.5\" cy=\"50\" r=\"1.6\" fill=\"C\"></circle>",
  "perf": "<rect x=\"13\" y=\"7\" width=\"74\" height=\"86\" fill=\"none\" stroke=\"C\" stroke-width=\"3.4\" stroke-dasharray=\"0 5.4\" stroke-linecap=\"round\"></rect><rect x=\"19\" y=\"13\" width=\"62\" height=\"74\" fill=\"none\" stroke=\"C\" stroke-width=\"1.2\"></rect><text x=\"50\" y=\"25\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"6.6\" font-weight=\"600\" letter-spacing=\"0.9\" fill=\"C\">%TOP%</text><path d=\"M25 29 H75\" stroke=\"C\" stroke-width=\".8\"></path><text x=\"50\" y=\"75\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"7.8\" font-weight=\"600\" letter-spacing=\"0.5\" fill=\"C\">%LINE%</text><text x=\"50\" y=\"82.5\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"5.4\" font-weight=\"400\" letter-spacing=\"0.8\" fill=\"C\">%DATE%</text>",
  "octa": "<polygon points=\"31,4 69,4 96,31 96,69 69,96 31,96 4,69 4,31\" fill=\"none\" stroke=\"C\" stroke-width=\"2.6\" stroke-linejoin=\"round\"></polygon><polygon points=\"34,11 66,11 89,34 89,66 66,89 34,89 11,66 11,34\" fill=\"none\" stroke=\"C\" stroke-width=\"1\"></polygon><text x=\"50\" y=\"25\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"6.6\" font-weight=\"600\" letter-spacing=\"1\" fill=\"C\">%TOP%</text><text x=\"50\" y=\"75\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"7.2\" font-weight=\"600\" letter-spacing=\"0.5\" fill=\"C\">%LINE%</text><text x=\"50\" y=\"82.5\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"5.2\" font-weight=\"400\" letter-spacing=\"0.8\" fill=\"C\">%DATE%</text>",
  "oval": "<ellipse cx=\"50\" cy=\"50\" rx=\"47\" ry=\"36\" fill=\"none\" stroke=\"C\" stroke-width=\"2.6\"></ellipse><ellipse cx=\"50\" cy=\"50\" rx=\"41\" ry=\"30\" fill=\"none\" stroke=\"C\" stroke-width=\"1\"></ellipse><text x=\"50\" y=\"30.5\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"6.2\" font-weight=\"600\" letter-spacing=\"0.9\" fill=\"C\">%TOP%</text><text x=\"50\" y=\"70\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"7.8\" font-weight=\"600\" letter-spacing=\"0.5\" fill=\"C\">%LINE%</text><text x=\"50\" y=\"77.5\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"5.2\" font-weight=\"400\" letter-spacing=\"0.8\" fill=\"C\">%DATE%</text>",
  "label": "<rect x=\"6\" y=\"14\" width=\"88\" height=\"72\" rx=\"5\" fill=\"none\" stroke=\"C\" stroke-width=\"2.6\"></rect><rect x=\"11\" y=\"19\" width=\"78\" height=\"62\" rx=\"2.5\" fill=\"none\" stroke=\"C\" stroke-width=\"1\"></rect><text x=\"50\" y=\"29\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"6.8\" font-weight=\"600\" letter-spacing=\"1.1\" fill=\"C\">%TOP%</text><path d=\"M16 33 H84\" stroke=\"C\" stroke-width=\".8\"></path><text x=\"50\" y=\"72\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"7.4\" font-weight=\"600\" letter-spacing=\"0.5\" fill=\"C\">%LINE%</text><text x=\"50\" y=\"79\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"5.2\" font-weight=\"400\" letter-spacing=\"0.8\" fill=\"C\">%DATE%</text>"
};
const BLANKS: Record<Shape, string> = {
  "circle": "<circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"none\" stroke=\"C\" stroke-width=\"1.5\" stroke-dasharray=\"1 4.2\" stroke-linecap=\"round\"></circle>",
  "perf": "<rect x=\"13\" y=\"7\" width=\"74\" height=\"86\" rx=\"1\" fill=\"none\" stroke=\"C\" stroke-width=\"1.5\" stroke-dasharray=\"1 4.2\" stroke-linecap=\"round\"></rect>",
  "octa": "<polygon points=\"31,4 69,4 96,31 96,69 69,96 31,96 4,69 4,31\" fill=\"none\" stroke=\"C\" stroke-width=\"1.5\" stroke-dasharray=\"1 4.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></polygon>",
  "oval": "<ellipse cx=\"50\" cy=\"50\" rx=\"47\" ry=\"36\" fill=\"none\" stroke=\"C\" stroke-width=\"1.5\" stroke-dasharray=\"1 4.2\" stroke-linecap=\"round\"></ellipse>",
  "label": "<rect x=\"6\" y=\"14\" width=\"88\" height=\"72\" rx=\"5\" fill=\"none\" stroke=\"C\" stroke-width=\"1.5\" stroke-dasharray=\"1 4.2\" stroke-linecap=\"round\"></rect>"
};
const ICONS: Record<string, string> = {
  "envelope": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"31\" y=\"36\" width=\"38\" height=\"25\" rx=\"1.5\"></rect><path d=\"M31 37 L50 51 L69 37\"></path><path d=\"M31 61 L44 49 M69 61 L56 49\" stroke-width=\"1.1\"></path></g><circle cx=\"50\" cy=\"52\" r=\"3.4\" fill=\"C\"></circle>",
  "clock": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"50\" cy=\"50\" r=\"12\"></circle><path d=\"M50 50 V42 M50 50 L56 53\"></path><path d=\"M33 60 A19 19 0 1 0 36 37\" stroke-width=\"1.4\"></path><path d=\"M36 37 L30 37.5 M36 37 L35.5 43\" stroke-width=\"1.4\"></path></g><circle cx=\"59.5\" cy=\"50.0\" r=\".9\" fill=\"C\"></circle><circle cx=\"40.5\" cy=\"50.0\" r=\".9\" fill=\"C\"></circle><circle cx=\"50.0\" cy=\"59.5\" r=\".9\" fill=\"C\"></circle><circle cx=\"50.0\" cy=\"40.5\" r=\".9\" fill=\"C\"></circle>",
  "moon": "<path d=\"M55 33 A17 17 0 1 0 63 63 A13 13 0 1 1 55 33 Z\" fill=\"C\" opacity=\".92\"></path><path d=\"M66 34 L67.2 36.8 L70 38 L67.2 39.2 L66 42 L64.8 39.2 L62 38 L64.8 36.8 Z\" fill=\"C\"></path><path d=\"M70 50.4 L70.78 52.22 L72.6 53 L70.78 53.78 L70 55.6 L69.22 53.78 L67.4 53 L69.22 52.22 Z\" fill=\"C\"></path><path d=\"M33 34.2 L33.84 36.16 L35.8 37 L33.84 37.84 L33 39.8 L32.16 37.84 L30.2 37 L32.16 36.16 Z\" fill=\"C\"></path><path d=\"M60 62 L60.6 63.4 L62 64 L60.6 64.6 L60 66 L59.4 64.6 L58 64 L59.4 63.4 Z\" fill=\"C\"></path>",
  "route": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M22 58 Q50 18 78 58\" stroke-dasharray=\"3 3.4\"></path></g><circle cx=\"22\" cy=\"58\" r=\"3\" fill=\"C\"></circle><circle cx=\"78\" cy=\"58\" r=\"3\" fill=\"C\"></circle><g transform=\"translate(50 38) rotate(8)\"><rect x=\"-6\" y=\"-4\" width=\"12\" height=\"8\" rx=\"1\" fill=\"C\"></rect><path d=\"M-6 -4 L0 1 L6 -4\" fill=\"none\" stroke=\"#EFE3C8\" stroke-width=\".9\"></path></g>",
  "wave": "<g stroke=\"C\" stroke-width=\"2.4\" stroke-linecap=\"round\"><path d=\"M30 47.5 V52.5\"></path><path d=\"M35 44.5 V55.5\"></path><path d=\"M40 40.5 V59.5\"></path><path d=\"M45 37.0 V63.0\"></path><path d=\"M50 42.0 V58.0\"></path><path d=\"M55 38.0 V62.0\"></path><path d=\"M60 43.5 V56.5\"></path><path d=\"M65 40.0 V60.0\"></path><path d=\"M70 46.0 V54.0\"></path></g>",
  "stack": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"20\" y=\"46\" width=\"30\" height=\"19\" rx=\"1.2\"></rect><path d=\"M20 47 L35 57 L50 47\"></path><path d=\"M24 46 V41 H54 V60 H50\" stroke-width=\"1.4\"></path><path d=\"M28 41 V37 H58 V55 H54\" stroke-width=\"1.2\"></path></g><text x=\"70\" y=\"58\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"19\" font-weight=\"700\" letter-spacing=\"0\" fill=\"C\">15</text>",
  "milestone": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M37 66 V45 A13 13 0 0 1 63 45 V66 Z\"></path><path d=\"M28 66 H72\"></path><path d=\"M30 70 L34 66 M66 70 L70 66\" stroke-width=\"1.2\"></path></g><text x=\"50\" y=\"53\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"7.4\" font-weight=\"700\" letter-spacing=\"0\" fill=\"C\">2,500</text><text x=\"50\" y=\"61\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"5.6\" font-weight=\"600\" letter-spacing=\"1\" fill=\"C\">KM</text>",
  "mailbag": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M36 33 Q50 18 64 33\" stroke-width=\"1.5\"></path><rect x=\"40\" y=\"33\" width=\"12\" height=\"8\" rx=\"1\" transform=\"rotate(-10 46 37)\" stroke-width=\"1.2\"></rect><rect x=\"48\" y=\"31\" width=\"12\" height=\"8\" rx=\"1\" transform=\"rotate(8 54 35)\" stroke-width=\"1.2\"></rect><path d=\"M33 40 H67 L64 64 Q50 67 36 64 Z\"></path><path d=\"M33 40 L50 51 L67 40\"></path></g><circle cx=\"50\" cy=\"51\" r=\"2.3\" fill=\"C\"></circle>",
  "mountains": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 62 L33 45 L41 54 L52 38 L65 57 L71 50 L80 62\"></path><path d=\"M48 43 L52 38 L56 44\" stroke-width=\"1.2\"></path><path d=\"M18 62 H82\" stroke-width=\"1.2\"></path></g><circle cx=\"68\" cy=\"38\" r=\"4\" fill=\"C\"></circle>",
  "penpal": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"27\" y=\"35\" width=\"21\" height=\"14\" rx=\"1\"></rect><path d=\"M27 36 L37.5 43 L48 36\"></path><rect x=\"52\" y=\"51\" width=\"21\" height=\"14\" rx=\"1\"></rect><path d=\"M52 52 L62.5 59 L73 52\"></path><path d=\"M51 37 Q64 37 64 47\" stroke-width=\"1.3\"></path><path d=\"M64 47 L61 43.5 M64 47 L67 43.5\" stroke-width=\"1.3\"></path><path d=\"M49 63 Q36 63 36 53\" stroke-width=\"1.3\"></path><path d=\"M36 53 L33 56.5 M36 53 L39 56.5\" stroke-width=\"1.3\"></path></g>",
  "shelf": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.5\"><rect x=\"29.0\" y=\"38\" width=\"13\" height=\"11.5\"></rect><rect x=\"43.5\" y=\"38\" width=\"13\" height=\"11.5\"></rect><rect x=\"58.0\" y=\"38\" width=\"13\" height=\"11.5\"></rect><rect x=\"29.0\" y=\"51\" width=\"13\" height=\"11.5\"></rect><rect x=\"43.5\" y=\"51\" width=\"13\" height=\"11.5\"></rect><rect x=\"58.0\" y=\"51\" width=\"13\" height=\"11.5\"></rect></g><rect x=\"31.5\" y=\"42\" width=\"8\" height=\"5\" fill=\"C\"></rect><rect x=\"60.5\" y=\"42\" width=\"8\" height=\"5\" fill=\"C\"></rect><rect x=\"46.0\" y=\"55\" width=\"8\" height=\"5\" fill=\"C\"></rect><rect x=\"60.5\" y=\"55\" width=\"8\" height=\"5\" fill=\"C\"></rect><rect x=\"46.0\" y=\"42\" width=\"8\" height=\"5\" fill=\"C\"></rect>",
  "seasons": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M50 32 V68 M32 50 H68\" stroke-width=\"1\"></path><circle cx=\"41\" cy=\"41\" r=\"3\"></circle><path d=\"M46 41 L48 41\" stroke-width=\"1.2\"></path><path d=\"M36 41 L34 41\" stroke-width=\"1.2\"></path><path d=\"M41 46 L41 48\" stroke-width=\"1.2\"></path><path d=\"M41 36 L41 34\" stroke-width=\"1.2\"></path><path d=\"M44.5 44.5 L45.9 45.9\" stroke-width=\"1.2\"></path><path d=\"M37.5 44.5 L36.1 45.9\" stroke-width=\"1.2\"></path><path d=\"M44.5 37.5 L45.9 36.1\" stroke-width=\"1.2\"></path><path d=\"M37.5 37.5 L36.1 36.1\" stroke-width=\"1.2\"></path><path d=\"M54 46 Q55 36 64 36 Q63 45 54 46 Z M54 46 L60 40\" stroke-width=\"1.3\"></path><path d=\"M59 54 V66 M53.8 57 L64.2 63 M53.8 63 L64.2 57\" stroke-width=\"1.3\"></path><circle cx=\"41\" cy=\"59\" r=\"1.6\"></circle><circle cx=\"44.6\" cy=\"59.0\" r=\"2\" stroke-width=\"1.1\"></circle><circle cx=\"37.4\" cy=\"59.0\" r=\"2\" stroke-width=\"1.1\"></circle><circle cx=\"41.0\" cy=\"62.6\" r=\"2\" stroke-width=\"1.1\"></circle><circle cx=\"41.0\" cy=\"55.4\" r=\"2\" stroke-width=\"1.1\"></circle></g>",
  "months": "<circle cx=\"50.0\" cy=\"31.0\" r=\"2.2\" fill=\"C\"></circle><circle cx=\"59.5\" cy=\"33.5\" r=\"2.2\" fill=\"C\"></circle><circle cx=\"66.5\" cy=\"40.5\" r=\"2.2\" fill=\"C\"></circle><circle cx=\"69.0\" cy=\"50.0\" r=\"2.2\" fill=\"C\"></circle><circle cx=\"66.5\" cy=\"59.5\" r=\"2.2\" fill=\"C\"></circle><circle cx=\"59.5\" cy=\"66.5\" r=\"2.2\" fill=\"C\"></circle><circle cx=\"50.0\" cy=\"69.0\" r=\"2.2\" fill=\"C\"></circle><circle cx=\"40.5\" cy=\"66.5\" r=\"2.2\" fill=\"C\"></circle><circle cx=\"33.5\" cy=\"59.5\" r=\"2.2\" fill=\"C\"></circle><circle cx=\"31.0\" cy=\"50.0\" r=\"2.2\" fill=\"C\"></circle><circle cx=\"33.5\" cy=\"40.5\" r=\"2.2\" fill=\"C\"></circle><circle cx=\"40.5\" cy=\"33.5\" r=\"2.2\" fill=\"C\"></circle><text x=\"50\" y=\"54\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"13\" font-weight=\"700\" letter-spacing=\"0\" fill=\"C\">12</text><text x=\"50\" y=\"61\" text-anchor=\"middle\" font-family=\"Newsreader, Georgia, serif\" font-size=\"4.6\" font-weight=\"600\" letter-spacing=\"0.8\" fill=\"C\">MONTHS</text>",
  "umbrella": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M31 52 A19 19 0 0 1 69 52\"></path><path d=\"M31 52 q4.75 -4 9.5 0 t9.5 0 t9.5 0 t9.5 0\" stroke-width=\"1.4\"></path><path d=\"M50 33 V64 a3.2 3.2 0 0 1 -6.4 0\" stroke-width=\"1.6\"></path></g><path d=\"M28 36 l-1.6 4\" stroke=\"C\" stroke-width=\"1.3\" stroke-linecap=\"round\"></path><path d=\"M36 30 l-1.6 4\" stroke=\"C\" stroke-width=\"1.3\" stroke-linecap=\"round\"></path><path d=\"M66 30 l-1.6 4\" stroke=\"C\" stroke-width=\"1.3\" stroke-linecap=\"round\"></path><path d=\"M74 37 l-1.6 4\" stroke=\"C\" stroke-width=\"1.3\" stroke-linecap=\"round\"></path><path d=\"M24 46 l-1.6 4\" stroke=\"C\" stroke-width=\"1.3\" stroke-linecap=\"round\"></path><path d=\"M77 47 l-1.6 4\" stroke=\"C\" stroke-width=\"1.3\" stroke-linecap=\"round\"></path>",
  "pins": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M18 62 Q30 40 42 54 T62 46 T82 38\" stroke-dasharray=\"2.6 3\" stroke-width=\"1.3\"></path></g><g transform=\"translate(18 62)\"><path d=\"M0 0 C-5 -6 -5 -12 0 -12 C5 -12 5 -6 0 0 Z\" fill=\"C\"></path><circle cx=\"0\" cy=\"-8\" r=\"1.6\" fill=\"#EFE3C8\"></circle></g><g transform=\"translate(32 47)\"><path d=\"M0 0 C-5 -6 -5 -12 0 -12 C5 -12 5 -6 0 0 Z\" fill=\"C\"></path><circle cx=\"0\" cy=\"-8\" r=\"1.6\" fill=\"#EFE3C8\"></circle></g><g transform=\"translate(46 55)\"><path d=\"M0 0 C-5 -6 -5 -12 0 -12 C5 -12 5 -6 0 0 Z\" fill=\"C\"></path><circle cx=\"0\" cy=\"-8\" r=\"1.6\" fill=\"#EFE3C8\"></circle></g><g transform=\"translate(62 46)\"><path d=\"M0 0 C-5 -6 -5 -12 0 -12 C5 -12 5 -6 0 0 Z\" fill=\"C\"></path><circle cx=\"0\" cy=\"-8\" r=\"1.6\" fill=\"#EFE3C8\"></circle></g><g transform=\"translate(80 39)\"><path d=\"M0 0 C-5 -6 -5 -12 0 -12 C5 -12 5 -6 0 0 Z\" fill=\"C\"></path><circle cx=\"0\" cy=\"-8\" r=\"1.6\" fill=\"#EFE3C8\"></circle></g>",
  "sea": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M24 58 q4.3 -4 8.6 0 t8.6 0 t8.6 0 t8.6 0 t8.6 0 t8.6 0\"></path><path d=\"M28 65 q4.3 -4 8.6 0 t8.6 0 t8.6 0 t8.6 0 t8.6 0\" stroke-width=\"1.4\"></path></g><g transform=\"translate(50 42)\"><rect x=\"-7\" y=\"-4.5\" width=\"14\" height=\"9\" rx=\"1\" fill=\"C\"></rect><path d=\"M-7 -4.5 L0 1 L7 -4.5\" fill=\"none\" stroke=\"#EFE3C8\" stroke-width=\".9\"></path><path d=\"M-7 -1 Q-15 -10 -21 -4 Q-15 -5 -12 1 Z M7 -1 Q15 -10 21 -4 Q15 -5 12 1 Z\" fill=\"C\"></path></g>",
  "wind": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M22 42 H58 a6.5 6.5 0 1 0 -6.5 -6.5\"></path><path d=\"M22 52 H70 a6.5 6.5 0 1 1 -6.5 6.5\"></path><path d=\"M30 62 H52\" stroke-width=\"1.4\"></path><path d=\"M60 47 H76\" stroke-width=\"1.2\"></path></g>",
  "hourglass": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M38 34 H62 M38 66 H62\"></path><path d=\"M41 34 Q41 46 50 50 Q59 54 59 66 M59 34 Q59 46 50 50 Q41 54 41 66\"></path></g><path d=\"M44 64 Q50 56 56 64 Z M47 42 H53 L50 46 Z\" fill=\"C\"></path>",
  "road": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M24 42 H76\" stroke-width=\"1.2\"></path><path d=\"M30 66 Q44 56 48 42 M70 66 Q56 56 52 42\"></path><path d=\"M50 64 V60 M50 55 V52 M50 48 V46\" stroke-width=\"1.3\"></path><path d=\"M60 42 L64 35 L68 42 M34 42 L37 37 L40 42\" stroke-width=\"1.2\"></path></g>",
  "compass": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"50\" cy=\"50\" r=\"15\"></circle></g><path d=\"M65 50 L69 50\" stroke=\"C\" stroke-width=\"1.4\"></path><path d=\"M35 50 L31 50\" stroke=\"C\" stroke-width=\"1.4\"></path><path d=\"M50 65 L50 69\" stroke=\"C\" stroke-width=\"1.4\"></path><path d=\"M50 35 L50 31\" stroke=\"C\" stroke-width=\"1.4\"></path><path d=\"M50 37 L54 50 L46 50 Z\" fill=\"C\"></path><path d=\"M50 63 L54 50 L46 50 Z\" fill=\"none\" stroke=\"C\" stroke-width=\"1.2\"></path><circle cx=\"50\" cy=\"50\" r=\"1.6\" fill=\"#EFE3C8\"></circle>",
  "globe": "<g fill=\"none\" stroke=\"C\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"50\" cy=\"48\" r=\"13\"></circle><ellipse cx=\"50\" cy=\"48\" rx=\"5.5\" ry=\"13\" stroke-width=\"1.1\"></ellipse><path d=\"M37 48 H63 M39.5 41 H60.5 M39.5 55 H60.5\" stroke-width=\"1\"></path><path d=\"M14 58 Q50 4 86 58\" stroke-dasharray=\"2.8 3\" stroke-width=\"1.3\"></path></g><circle cx=\"14\" cy=\"58\" r=\"2.6\" fill=\"C\"></circle><circle cx=\"86\" cy=\"58\" r=\"2.6\" fill=\"C\"></circle>"
};
/** id → [shape, name along the top, middle line, icon] */
const DESIGNS: Record<string, [Shape, string, string, string]> = {
  "first": [
    "perf",
    "FIRST LETTER",
    "No. 1",
    "envelope"
  ],
  "same_day": [
    "circle",
    "SAME-DAY REPLY",
    "",
    "clock"
  ],
  "busy_beak": [
    "label",
    "BUSY BEAK",
    "LETTERS",
    "stack"
  ],
  "night_owl": [
    "octa",
    "NIGHT OWL",
    "3 LATE NIGHTS",
    "moon"
  ],
  "first_1000": [
    "circle",
    "FIRST STRETCH",
    "",
    "milestone"
  ],
  "full_bag": [
    "perf",
    "FULL BAG",
    "40 CARRIED",
    "mailbag"
  ],
  "long_haul": [
    "oval",
    "LONG HAUL",
    "20,000 KM",
    "route"
  ],
  "cross_country": [
    "oval",
    "CROSS-COUNTRY",
    "25,000 KM",
    "mountains"
  ],
  "enchanted": [
    "circle",
    "ENCHANTED",
    "",
    "wave"
  ],
  "pen_pal": [
    "circle",
    "PEN PAL",
    "",
    "penpal"
  ],
  "full_shelf": [
    "label",
    "FULL SHELF",
    "5 FRIENDS",
    "shelf"
  ],
  "seasons": [
    "circle",
    "EVERY SEASON",
    "",
    "seasons"
  ],
  "one_year": [
    "circle",
    "ONE YEAR",
    "",
    "months"
  ],
  "rain_shine": [
    "octa",
    "RAIN OR SHINE",
    "80 CARRIED",
    "umbrella"
  ],
  "jet_stream": [
    "label",
    "JET STREAM",
    "50,000 KM",
    "wind"
  ],
  "explorer": [
    "oval",
    "EXPLORER",
    "5 CITIES",
    "pins"
  ],
  "sea": [
    "circle",
    "SEA CROSSING",
    "",
    "sea"
  ],
  "old_hand": [
    "perf",
    "OLD HAND",
    "150 CARRIED",
    "hourglass"
  ],
  "wayfarer": [
    "octa",
    "WAYFARER",
    "80,000 KM",
    "road"
  ],
  "true_north": [
    "circle",
    "TRUE NORTH",
    "",
    "compass"
  ],
  "far_flight": [
    "oval",
    "FAR FLIGHT",
    "5,000+ KM ×3",
    "globe"
  ]
};

export const SEAL_INK = '#7A2420';
export const OWL_INK = '#1F2A44';
export const PENCIL = '#8E8375';
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const stampDate = (iso?: string | null) => {
  if (!iso) return 'SIGNED POST';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
export const stampShape = (id: string): Shape => DESIGNS[id]?.[0] ?? 'circle';

function markup(id: string, color: string, date: string, key: string) {
  const d = DESIGNS[id];
  if (!d) return '';
  const [shape, top, line, icon] = d;
  const frame = FRAMES[shape].split('%TOP%').join(top).split('%LINE%').join(line).split('%DATE%').join(date).split('%ID%').join(key);
  return (frame + (ICONS[icon] ?? '')).split('"C"').join(`"${color}"`);
}

/** An inked stamp. Needs <InkDefs /> somewhere on the page for the rough ink edge. */
export function StampArt({ id, color, date, size = 96, rotate = 0, uid = '', style }: { id: string; color: string; date?: string | null; size?: number; rotate?: number; uid?: string; style?: CSSProperties }) {
  const key = `st-${id}${uid}`;
  return (
    <svg className="stamp-ink" viewBox="0 0 100 100" aria-hidden="true" width={size} height={size}
      style={{ overflow: 'visible', transform: rotate ? `rotate(${rotate}deg)` : undefined, ...style }}>
      <g filter="url(#ink-rough)" dangerouslySetInnerHTML={{ __html: markup(id, color, stampDate(date), key) }} />
    </svg>
  );
}

/** A stamp not earned yet: just the dotted outline of its shape. */
export function StampBlank({ id, size = 84, children }: { id: string; size?: number; children?: React.ReactNode }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" width={size} height={size} style={{ overflow: 'visible' }}>
      <g dangerouslySetInnerHTML={{ __html: BLANKS[stampShape(id)].split('"C"').join(`"${PENCIL}"`) }} />
      {children}
    </svg>
  );
}

/** The ink filter: a slightly wobbly edge and patchy coverage, like a real rubber stamp. Render once per screen. */
export function InkDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <defs>
        <filter id="ink-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={3} result="fine" />
          <feDisplacementMap in="SourceGraphic" in2="fine" scale={1.8} result="wobble" />
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves={2} seed={11} result="blot" />
          <feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.6 0 0 0 2.15" result="mask" />
          <feComposite in="wobble" in2="mask" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

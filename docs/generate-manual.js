/*
 * Generates the Nisa Al-Huda Product Manual as a .docx file.
 * Run: node docs/generate-manual.js
 * Output: docs/Nisa-AlHuda-Product-Manual.docx
 *
 * Layout: US Letter, Arial 11pt default, 1" margins.
 * Structure: Cover -> TOC -> 11 parts covering architecture, roles,
 *   public, student, instructor, admin, workflows, notifications,
 *   pricing, FA, data model + glossary.
 */

const fs = require("fs");
const path = require("path");

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  LevelFormat,
  TabStopType,
  TabStopPosition,
  TableOfContents,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
  PageBreak,
} = require("docx");

// ───────────────────────────────────────────────────────────────
// Design system
// ───────────────────────────────────────────────────────────────

const BRAND = {
  primary: "7C2D12",   // deep amber/rose — NAH brand
  accent: "0F766E",    // teal for on-going/accents
  heading: "1F2937",   // slate-800
  body: "111827",      // near-black
  muted: "6B7280",     // gray
  rule: "E5E7EB",      // light gray
  tableHead: "FDE68A", // soft amber for table headers
  tableHead2: "CCFBF1", // soft teal for alt table headers
  tableAltRow: "FFFBEB", // very light amber
  warningBg: "FEF3C7", // amber-100 for callouts
  infoBg: "DBEAFE",    // blue-100
};

const PAGE_WIDTH_DXA = 12240;  // US Letter
const PAGE_HEIGHT_DXA = 15840;
const MARGIN_DXA = 1440;
const CONTENT_WIDTH = PAGE_WIDTH_DXA - 2 * MARGIN_DXA; // 9360

// ───────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────

const run = (text, opts = {}) => new TextRun({ text, font: "Arial", ...opts });

const p = (text, opts = {}) =>
  new Paragraph({
    children: [run(text, opts.runOpts || {})],
    spacing: { before: 80, after: 80, line: 300 },
    ...opts.paraOpts,
  });

const body = (text) =>
  new Paragraph({
    children: [run(text)],
    spacing: { before: 60, after: 120, line: 300 },
    alignment: AlignmentType.JUSTIFIED,
  });

// Allow inline formatted runs within a single paragraph
const bodyRich = (runs) =>
  new Paragraph({
    children: runs,
    spacing: { before: 60, after: 120, line: 300 },
    alignment: AlignmentType.JUSTIFIED,
  });

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [run(text, { bold: true, size: 36, color: BRAND.primary })],
    spacing: { before: 480, after: 240 },
    pageBreakBefore: true,
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: BRAND.primary, space: 4 },
    },
  });

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [run(text, { bold: true, size: 28, color: BRAND.heading })],
    spacing: { before: 320, after: 160 },
  });

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [run(text, { bold: true, size: 24, color: BRAND.accent })],
    spacing: { before: 240, after: 120 },
  });

const h4 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_4,
    children: [run(text, { bold: true, size: 22, color: BRAND.heading })],
    spacing: { before: 180, after: 80 },
  });

const bullet = (text, level = 0) =>
  new Paragraph({
    numbering: { reference: "bullets", level },
    children: [run(text)],
    spacing: { before: 40, after: 40, line: 280 },
  });

const bulletRich = (runs, level = 0) =>
  new Paragraph({
    numbering: { reference: "bullets", level },
    children: runs,
    spacing: { before: 40, after: 40, line: 280 },
  });

const numbered = (text, level = 0) =>
  new Paragraph({
    numbering: { reference: "numbers", level },
    children: [run(text)],
    spacing: { before: 40, after: 40, line: 280 },
  });

const callout = (label, text, color = BRAND.warningBg) => {
  const border = { style: BorderStyle.SINGLE, size: 6, color: BRAND.primary };
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: border, bottom: border, left: border, right: border,
            },
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            shading: { fill: color, type: ShadingType.CLEAR },
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            children: [
              new Paragraph({
                children: [run(label, { bold: true, size: 22, color: BRAND.primary })],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [run(text, { size: 22 })],
                alignment: AlignmentType.JUSTIFIED,
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

// ───────────────────────────────────────────────────────────────
// Table helpers
// ───────────────────────────────────────────────────────────────

const thinBorder = { style: BorderStyle.SINGLE, size: 2, color: BRAND.rule };
const cellBorders = {
  top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder,
};

function headerCell(text, width, fill = BRAND.tableHead) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [
      new Paragraph({
        children: [run(text, { bold: true, size: 20, color: BRAND.heading })],
      }),
    ],
  });
}

function bodyCell(text, width, opts = {}) {
  const paras = Array.isArray(text)
    ? text.map((t) =>
        new Paragraph({
          children: [run(String(t), { size: 20 })],
          spacing: { before: 20, after: 20 },
        })
      )
    : [
        new Paragraph({
          children: [run(String(text ?? ""), { size: 20, ...(opts.runOpts || {}) })],
        }),
      ];
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: paras,
  });
}

/**
 * Build a table from a headers array + rows array.
 * Column widths auto-distribute evenly if not provided.
 */
function buildTable({ headers, rows, widths, headerFill = BRAND.tableHead, zebra = true }) {
  const cols = headers.length;
  const colWidths =
    widths && widths.length === cols
      ? widths
      : Array.from({ length: cols }, () => Math.floor(CONTENT_WIDTH / cols));
  // Make sure they sum exactly
  const sum = colWidths.reduce((a, b) => a + b, 0);
  if (sum !== CONTENT_WIDTH) {
    colWidths[0] += CONTENT_WIDTH - sum;
  }

  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: headers.map((h, i) => headerCell(h, colWidths[i], headerFill)),
    }),
    ...rows.map(
      (row, rIdx) =>
        new TableRow({
          children: row.map((cell, cIdx) =>
            bodyCell(cell, colWidths[cIdx], {
              fill: zebra && rIdx % 2 === 1 ? BRAND.tableAltRow : undefined,
            })
          ),
        })
    ),
  ];

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: tableRows,
  });
}

// Small spacer between blocks
const spacer = () =>
  new Paragraph({ children: [run("")], spacing: { before: 40, after: 40 } });

// ───────────────────────────────────────────────────────────────
// Content loader
// ───────────────────────────────────────────────────────────────

const content = require("./manual-content");

const sectionBlocks = content.build({
  h1, h2, h3, h4,
  p, body, bodyRich, run,
  bullet, bulletRich, numbered,
  callout, buildTable, spacer,
  BRAND, CONTENT_WIDTH,
});

// ───────────────────────────────────────────────────────────────
// Document assembly
// ───────────────────────────────────────────────────────────────

const doc = new Document({
  creator: "Nisa Al-Huda Product Team",
  title: "Nisa Al-Huda — Product Manual",
  description:
    "End-to-end product manual covering Admin, Instructor, and Student experiences.",
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22 } }, // 11pt
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: "Arial", size: 36, bold: true, color: BRAND.primary },
        paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: "Arial", size: 28, bold: true, color: BRAND.heading },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: "Arial", size: 24, bold: true, color: BRAND.accent },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 },
      },
      {
        id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: "Arial", size: 22, bold: true, color: BRAND.heading },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 3 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "\u2022",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 540, hanging: 270 } } },
          },
          {
            level: 1,
            format: LevelFormat.BULLET,
            text: "\u25E6",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 900, hanging: 270 } } },
          },
          {
            level: 2,
            format: LevelFormat.BULLET,
            text: "\u25AA",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1260, hanging: 270 } } },
          },
        ],
      },
      {
        reference: "numbers",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 540, hanging: 270 } } },
          },
          {
            level: 1,
            format: LevelFormat.LOWER_LETTER,
            text: "%2.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 900, hanging: 270 } } },
          },
        ],
      },
    ],
  },
  sections: [
    // ─── SECTION 1 : Cover page (no header/footer) ─────────
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH_DXA, height: PAGE_HEIGHT_DXA },
          margin: { top: MARGIN_DXA, right: MARGIN_DXA, bottom: MARGIN_DXA, left: MARGIN_DXA },
        },
      },
      children: content.buildCover({ run, BRAND }),
    },

    // ─── SECTION 2 : Main document with header/footer ──────
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH_DXA, height: PAGE_HEIGHT_DXA },
          margin: { top: MARGIN_DXA, right: MARGIN_DXA, bottom: MARGIN_DXA, left: MARGIN_DXA },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                run("Nisa Al-Huda — Product Manual", {
                  size: 18, color: BRAND.muted, bold: true,
                }),
                new TextRun({ text: "\t" }),
                run("Confidential — Internal Use", {
                  size: 18, color: BRAND.muted, italics: true,
                }),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              border: {
                bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND.primary, space: 4 },
              },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                run("© Nisa Al-Huda", { size: 18, color: BRAND.muted }),
                new TextRun({ text: "\t" }),
                run("Page ", { size: 18, color: BRAND.muted }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  size: 18,
                  color: BRAND.muted,
                  font: "Arial",
                }),
                run(" of ", { size: 18, color: BRAND.muted }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  size: 18,
                  color: BRAND.muted,
                  font: "Arial",
                }),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              border: {
                top: { style: BorderStyle.SINGLE, size: 4, color: BRAND.rule, space: 4 },
              },
            }),
          ],
        }),
      },
      children: [
        // TOC
        new Paragraph({
          children: [run("Table of Contents", { bold: true, size: 36, color: BRAND.primary })],
          spacing: { before: 240, after: 240 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 12, color: BRAND.primary, space: 4 },
          },
        }),
        new TableOfContents("Contents", {
          hyperlink: true,
          headingStyleRange: "1-3",
        }),
        new Paragraph({ children: [new PageBreak()] }),

        // All chapters
        ...sectionBlocks,
      ],
    },
  ],
});

// ───────────────────────────────────────────────────────────────
// Write file
// ───────────────────────────────────────────────────────────────

const outPath = path.join(__dirname, "Nisa-AlHuda-Product-Manual.docx");
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  const size = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`\u2713 Generated ${outPath} (${size} KB)`);
});

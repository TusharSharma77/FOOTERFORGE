const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Serve built React frontend (production) ───────────────────────────────────
const frontendDist = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// ── Temp uploads dir ──────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Multer config ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") return cb(null, true);
  cb(new Error("Only PDF files are allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function cleanup(...filePaths) {
  filePaths.forEach((p) => {
    try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
  });
}

// ── POST /upload ──────────────────────────────────────────────────────────────
app.post("/upload", upload.single("pdf"), async (req, res) => {
  const inputPath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded." });
    }

    const { name, enrollmentNumber } = req.body;
    if (!name?.trim() || !enrollmentNumber?.trim()) {
      cleanup(inputPath);
      return res.status(400).json({ error: "Name and Enrollment Number are required." });
    }

    // ── Load & modify PDF ─────────────────────────────────────────────────────
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    const footerText = `Name: ${name.trim()}   |   Enrollment: ${enrollmentNumber.trim()}`;
    const fontSize = 10;
    const footerHeight = 62;
    const footerPadding = 10;
    const minHorizontalPadding = 16;

    for (const page of pages) {
      const { width } = page.getSize();

      // Cover a larger band at the bottom so an existing footer gets replaced,
      // not stacked with the new one below it.
      page.drawRectangle({
        x: 0, y: 0, width, height: footerHeight,
        color: rgb(1, 1, 1),
      });

      // Subtle separator line
      page.drawRectangle({
        x: 0, y: footerHeight - 0.5, width, height: 0.5,
        color: rgb(0.75, 0.75, 0.75),
      });

      // Center the replacement footer while keeping a safe inset on narrow pages.
      const textWidth = font.widthOfTextAtSize(footerText, fontSize);
      page.drawText(footerText, {
        x: Math.max((width - textWidth) / 2, minHorizontalPadding),
        y: footerPadding,
        size: fontSize,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
    }

    const modifiedBytes = await pdfDoc.save();

    // ── Send download ─────────────────────────────────────────────────────────
    const baseName = path.basename(req.file.originalname, path.extname(req.file.originalname));
    const downloadName = `${baseName}_modified.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    res.send(Buffer.from(modifiedBytes));

  } catch (err) {
    console.error("PDF processing error:", err);
    res.status(500).json({ error: "Failed to process PDF. Ensure the file is a valid, non-encrypted PDF." });
  } finally {
    cleanup(inputPath);
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ── SPA fallback (serve React for all non-API routes) ─────────────────────────
if (fs.existsSync(frontendDist)) {
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE")
    return res.status(413).json({ error: "File too large. Maximum size is 10 MB." });
  if (err.message === "Only PDF files are allowed")
    return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "An unexpected error occurred." });
});

app.listen(PORT, () => {
  console.log(`\n🚀 FooterForge running at http://localhost:${PORT}`);
  console.log(`   API: POST http://localhost:${PORT}/upload\n`);
});

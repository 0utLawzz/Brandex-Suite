import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } from "docx";
import sharp from "sharp";

export async function buildDocument(title: string, text: string, images: Buffer[] = []) {
  const children: Paragraph[] = [];
  for (const line of text.replaceAll("\r", "").split("\n")) {
    if (line.trim() === "[[BRANDEX_CASE_IMAGES]]") {
      if (!images.length) throw new Error("This template requires a case image. Add images at intake before generation.");
      for (const image of images) {
        const rendered = await sharp(image, { limitInputPixels: 40000000 }).rotate().resize({ width: 550, height: 350, fit: "inside", withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
        children.push(new Paragraph({ children: [new ImageRun({ data: rendered.data, type: "png", transformation: { width: rendered.info.width, height: rendered.info.height } })], spacing: { after: 180 } }));
      }
    } else children.push(new Paragraph({ children: [new TextRun({ text: line, font: "Arial", size: 22 })], spacing: { after: 100 } }));
  }
  return Packer.toBuffer(new Document({ title, creator: "Brandex Suite", styles: { default: { document: { run: { font: "Arial", size: 22 } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, right: 1100, bottom: 1000, left: 1100 } } }, children: [new Paragraph({ text: title, heading: HeadingLevel.TITLE, spacing: { after: 300 } }), ...children] }] }));
}

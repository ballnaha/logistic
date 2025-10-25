// สคริปต์สำหรับแปลงฟอนต์ Sarabun เป็น base64 
// รันไฟล์นี้ด้วย Node.js เพื่อสร้างฟอนต์ base64

const fs = require('fs');
const path = require('path');

function convertFontToBase64(fontPath) {
  try {
    const fontBuffer = fs.readFileSync(fontPath);
    const base64String = fontBuffer.toString('base64');
    return base64String;
  } catch (error) {
    console.error('Error converting font:', error);
    return null;
  }
}

// แปลงฟอนต์ Sarabun
const sarabunRegularPath = path.join(__dirname, '..', 'public', 'fonts', 'Sarabun-Regular.ttf');
const sarabunBoldPath = path.join(__dirname, '..', 'public', 'fonts', 'Sarabun-Bold.ttf');

console.log('Converting Sarabun fonts to base64...');

if (fs.existsSync(sarabunRegularPath)) {
  const regularBase64 = convertFontToBase64(sarabunRegularPath);
  if (regularBase64) {
    console.log('Sarabun Regular converted successfully!');
    // สร้างไฟล์ output
    const outputContent = `
// Auto-generated Sarabun font for jsPDF
export const SARABUN_REGULAR_BASE64 = "${regularBase64}";

// เพิ่มฟอนต์ให้ jsPDF
export function addSarabunFont(doc) {
  doc.addFileToVFS('Sarabun-Regular.ttf', SARABUN_REGULAR_BASE64);
  doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
}
`;
    fs.writeFileSync(path.join(__dirname, 'sarabunFont.ts'), outputContent);
    console.log('Font file saved to sarabunFont.ts');
  }
} else {
  console.log('Sarabun-Regular.ttf not found at:', sarabunRegularPath);
}

if (fs.existsSync(sarabunBoldPath)) {
  const boldBase64 = convertFontToBase64(sarabunBoldPath);
  if (boldBase64) {
    console.log('Sarabun Bold converted successfully!');
  }
} else {
  console.log('Sarabun-Bold.ttf not found at:', sarabunBoldPath);
}
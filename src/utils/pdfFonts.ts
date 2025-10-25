import jsPDF from 'jspdf';
import { addThaiFont } from './fonts';

let fontsLoaded = false;

export async function loadThaiFont(doc: jsPDF): Promise<void> {
  if (fontsLoaded) return;

  try {
  // โหลดฟอนต์ Sarabun จาก public/fonts
  await addThaiFont(doc);
    fontsLoaded = true;
  } catch (error) {
    console.warn('Failed to load Thai font, using fallback:', error);
  }
}

export function setThaiFont(doc: jsPDF, size: number = 12, style: 'normal' | 'bold' = 'normal'): void {
  try {
    // ใช้ฟอนต์ Sarabun ที่โหลดมาแล้ว
    doc.setFont('Sarabun', style);
    doc.setFontSize(size);
  } catch (error) {
    console.warn('Failed to set Thai font, using fallback:', error);
    // ใช้ฟอนต์สำรองถ้าไม่สามารถใช้ Sarabun ได้
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
  }
}

export function formatThaiText(text: string): string {
  // ป้องกันปัญหาการแสดงผลภาษาไทย
  if (!text) return '';
  
  // แปลงตัวเลขไทยเป็นอารบิก (ถ้าจำเป็น)
  const thaiNumbers = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  const arabicNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let formattedText = text.toString();
  
  // แปลงตัวเลขไทยเป็นอารบิกถ้าจำเป็น (สำหรับ jsPDF)
  for (let i = 0; i < thaiNumbers.length; i++) {
    formattedText = formattedText.replace(new RegExp(thaiNumbers[i], 'g'), arabicNumbers[i]);
  }
  
  return formattedText;
}

// ฟังก์ชันสำหรับจัดการข้อความยาวในภาษาไทย
export function splitThaiText(doc: jsPDF, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const textWidth = doc.getTextWidth(testLine);
    
    if (textWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}
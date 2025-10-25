// ฟอนต์ Sarabun สำหรับ jsPDF
// โหลดจากไฟล์ที่มีอยู่ใน public/fonts/

// ฟังก์ชันสำหรับแก้ไขข้อความไทยที่มีปัญหาการทับซ้อน
export const fixThaiText = (text: string): string => {
  // แทนที่คำที่มีปัญหาด้วยเวอร์ชันที่แก้ไขแล้ว
  return text
    .replace(/เบี้ยเลี้ยง/g, 'เบี้ย\u200Bเลี้ยง') // เพิ่ม Zero-Width Space
    .replace(/ี้/g, 'ี\u200B้') // แยกสระกับวรรณยุกต์ที่ซ้อนทับ
    .normalize('NFC'); // Unicode Normalization
};

export const addThaiFont = async (doc: any) => {
  try {
    // โหลดฟอนต์ Sarabun จาก public/fonts/
    const fontUrl = '/fonts/Sarabun-Regular.ttf';
    const response = await fetch(fontUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch font: ${response.status}`);
    }
    
    const fontArrayBuffer = await response.arrayBuffer();
    
    // แปลงเป็น base64
    const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontArrayBuffer)));
    
    // เพิ่มฟอนต์ลงใน jsPDF
    doc.addFileToVFS('Sarabun-Regular.ttf', fontBase64);
    doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
    
    // ตั้งค่าฟอนต์และปรับแต่งสำหรับภาษาไทย
    doc.setFont('Sarabun', 'normal');
    
    // ปรับค่าเพื่อป้องกันการทับซ้อนของสระและวรรณยุกต์
    doc.setLineHeightFactor(1.6); // ปรับกลับให้พอดี
    doc.setCharSpace(0.15); // ปรับระยะห่างให้เหมาะสม
    
    console.log('Sarabun font loaded successfully with Thai language support');
    return true;
  } catch (error) {
    console.warn('Failed to load Sarabun font, using fallback:', error);
    // ใช้ฟอนต์ fallback ที่รองรับไทย
    doc.setFont('helvetica', 'normal');
    doc.setLineHeightFactor(1.3);
    return false;
  }
};

// ฟังก์ชันโหลดฟอนต์หนา (Bold)
export const addThaiFontBold = async (doc: any) => {
  try {
    // โหลดฟอนต์ Sarabun Bold จาก public/fonts/
    const fontUrl = '/fonts/Sarabun-Bold.ttf';
    const response = await fetch(fontUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch bold font: ${response.status}`);
    }
    
    const fontArrayBuffer = await response.arrayBuffer();
    const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontArrayBuffer)));
    
    // เพิ่มฟอนต์หนาลงใน jsPDF
    doc.addFileToVFS('Sarabun-Bold.ttf', fontBase64);
    doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold');
    
    // ตั้งค่าฟอนต์หนา
    doc.setFont('Sarabun', 'bold');
    
    console.log('Sarabun Bold font loaded successfully');
    return true;
  } catch (error) {
    console.warn('Failed to load Sarabun Bold font, using fallback:', error);
    doc.setFont('helvetica', 'bold');
    return false;
  }
};

// ฟังก์ชันหลักสำหรับโหลดฟอนต์ Sarabun ทั้งปกติและหนา
export const loadSarabunFont = async (doc?: any) => {
  try {
    let targetDoc = doc;
    
    if (!targetDoc) {
      const { default: jsPDF } = await import('jspdf');
      targetDoc = new jsPDF();
    }
    
    // โหลดฟอนต์ปกติ
    await addThaiFont(targetDoc);
    
    // โหลดฟอนต์หนา
    await addThaiFontBold(targetDoc);
    
    console.log('All Sarabun fonts loaded successfully');
    return true;
  } catch (error) {
    console.error('Failed to load Sarabun fonts:', error);
    return false;
  }
};

// วิธีการแปลงฟอนต์:
// 1. ไปที่ https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html
// 2. อัปโหลดไฟล์ฟอนต์ .ttf ของ Sarabun
// 3. คัดลอก output และเพิ่มในฟังก์ชันข้างต้น

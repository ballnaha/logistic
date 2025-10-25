'use client';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFGeneratorOptions {
  elementId: string;
  filename?: string;
  reportData?: any;
  vendorOptions?: any[];
  selectedVendor?: string;
  selectedMonth?: string;
  selectedYear?: string;
  months?: { value: string; label: string }[];
  showSnackbar?: (message: string, severity: 'success' | 'error') => void;
  quality?: number; // Image quality 0.5 - 1.5
  compressImages?: boolean; // Whether to compress images
}

export interface PDFGeneratorResult {
  blob?: Blob;
  success: boolean;
  error?: string;
}

export class EvaluationReportPDFGenerator {
  private static async generatePDFInternal(options: PDFGeneratorOptions): Promise<{ pdf: jsPDF; success: boolean; error?: string }> {
    try {
      // Ensure Sarabun font is loaded before creating PDF
      await document.fonts.ready;
      
      // Additional wait for local fonts to be fully loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if Sarabun font is available, fallback to system fonts if not  
      const fontFamily = document.fonts.check('12px Sarabun') ? 'Sarabun, Arial, sans-serif' : 'Arial, sans-serif';
      
      // Create PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      const margins = 5; // margins in mm
      const contentWidth = pdfWidth - (margins * 2);
      const contentHeight = pdfHeight - (margins * 2) - 20; // Reserve space for footer
      const printDate = new Date().toLocaleDateString('en-GB', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      let currentPage = 1;
      const pageFooters: Array<{ pageNum: number }> = []; // Track which pages need footers
      
      // Function to mark page for footer (will be added with correct total pages later)
      const markPageForFooter = (pageNum: number) => {
        pageFooters.push({ pageNum });
      };

      // Get the main report element
      const element = document.getElementById(options.elementId);
      if (!element) {
        return { pdf, success: false, error: 'Report element not found' };
      }

      // Hide action buttons for PDF
      const actionButtons = document.querySelector('.action-buttons') as HTMLElement;
      const originalDisplay = actionButtons?.style.display;
      if (actionButtons) actionButtons.style.display = 'none';

      // Create a temporary DOM element for main report with proper styling
      const tempMainDiv = document.createElement('div');
      tempMainDiv.style.position = 'absolute';
      tempMainDiv.style.left = '-9999px';
      tempMainDiv.style.width = '210mm';
      tempMainDiv.style.fontFamily = fontFamily;
      tempMainDiv.style.fontSize = '12px';
      tempMainDiv.style.backgroundColor = 'white';
      tempMainDiv.style.padding = '5mm';
      
      // Clone the main report content
      tempMainDiv.innerHTML = element.innerHTML;
      document.body.appendChild(tempMainDiv);

      // Capture main report content with configurable quality
      const quality = options.quality || 1.0;
      const compressImages = options.compressImages !== false; // default true
      const scale = Math.max(0.8, Math.min(2.0, quality * 1.2)); // Convert quality to reasonable scale

      const canvas = await html2canvas(tempMainDiv, {
        scale: scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Remove temporary element and restore action buttons
      document.body.removeChild(tempMainDiv);
      if (actionButtons && originalDisplay !== undefined) {
        actionButtons.style.display = originalDisplay;
      }

      // Generate image data with compression if enabled
      const imageFormat = compressImages ? 'image/jpeg' : 'image/png';
      const imageQuality = compressImages ? Math.max(0.3, Math.min(1.0, quality * 0.8)) : 1.0;
      const imgData = canvas.toDataURL(imageFormat, imageQuality);
      const imgAspectRatio = canvas.height / canvas.width;
      const imgWidth = contentWidth;
      const imgHeight = contentWidth * imgAspectRatio;

      // Add main report pages
      let yPosition = margins;
      let remainingHeight = imgHeight;

      if (imgHeight > contentHeight) {
        // Split across multiple pages
        const pageImageHeight = contentHeight;
        const pageCanvasHeight = (pageImageHeight / imgHeight) * canvas.height;
        
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = pageCanvasHeight;
        const pageCtx = pageCanvas.getContext('2d');
        
        if (pageCtx) {
          pageCtx.drawImage(canvas, 0, 0, canvas.width, pageCanvasHeight, 0, 0, canvas.width, pageCanvasHeight);
          const pageImgData = pageCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', margins, yPosition, imgWidth, pageImageHeight);
          markPageForFooter(currentPage);
          
          remainingHeight -= pageImageHeight;
          let sourceY = pageCanvasHeight;
          currentPage++;
          
          while (remainingHeight > 0) {
            pdf.addPage();
            
            const currentPageHeight = Math.min(contentHeight, remainingHeight);
            const currentCanvasHeight = (currentPageHeight / imgHeight) * canvas.height;
            
            pageCanvas.height = currentCanvasHeight;
            pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
            pageCtx.drawImage(canvas, 0, sourceY, canvas.width, currentCanvasHeight, 0, 0, canvas.width, currentCanvasHeight);
            
            const currentPageImgData = pageCanvas.toDataURL('image/png');
            pdf.addImage(currentPageImgData, 'PNG', margins, margins, imgWidth, currentPageHeight);
            markPageForFooter(currentPage);
            
            sourceY += currentCanvasHeight;
            remainingHeight -= currentPageHeight;
            currentPage++;
          }
        }
      } else {
        // Fits on one page
        pdf.addImage(imgData, 'PNG', margins, yPosition, imgWidth, imgHeight);
        markPageForFooter(currentPage);
        currentPage++;
      }

      // Add transaction detail pages if reportData is provided
      if (options.reportData?.data && options.reportData.data.length > 0 && options.vendorOptions && options.selectedVendor && options.selectedMonth && options.selectedYear && options.months) {
        // Fetch evaluations for transaction details
        const evaluationResponse = await fetch('/api/evaluation');
        const allEvaluations = await evaluationResponse.json();
        const selectedVendorData = options.vendorOptions.find(v => v.code === options.selectedVendor);
        
        // Filter evaluations by vendor, month, and year
        const filteredEvaluations = allEvaluations.filter((evaluation: any) => {
          const evalDate = new Date(evaluation.evaluationDate);
          const evalMonth = evalDate.getMonth() + 1;
          const evalYear = evalDate.getFullYear();
          
          return evaluation.contractorName === selectedVendorData?.name &&
                 evalMonth.toString() === options.selectedMonth &&
                 evalYear.toString() === options.selectedYear;
        });

        for (const item of options.reportData.data) {
          // Get vehicle evaluations for this vehicle
          const vehicleEvaluations = filteredEvaluations.filter(
            (evaluation: any) => evaluation.vehiclePlate === item.vehiclePlate
          );
          
          // Group evaluations by date
          const dateGroups: { [key: string]: any[] } = {};
          vehicleEvaluations.forEach((evaluation: any) => {
            const evalDate = new Date(evaluation.evaluationDate).toLocaleDateString('th-TH');
            if (!dateGroups[evalDate]) {
              dateGroups[evalDate] = [];
            }
            dateGroups[evalDate].push(evaluation);
          });
          
          // Sort dates from smallest to largest
          const sortedDates = Object.keys(dateGroups).sort((a, b) => {
            const dateA = new Date(a.split('/').reverse().join('-'));
            const dateB = new Date(b.split('/').reverse().join('-'));
            return dateA.getTime() - dateB.getTime();
          });
          
          // Add first page for this vehicle
          pdf.addPage();
          let currentYPosition = margins;
          let isFirstPage = true;
          
          // Add header for this vehicle (only on first page)
          const addVehicleHeader = () => {
            const headerHeight = 40; // Approximate header height in mm
            
            // Create header HTML
            const headerDiv = document.createElement('div');
            headerDiv.style.position = 'absolute';
            headerDiv.style.left = '-9999px';
            headerDiv.style.width = '190mm';
            headerDiv.style.fontFamily = fontFamily;
            headerDiv.style.fontSize = '12px';
            headerDiv.style.backgroundColor = 'white';
            headerDiv.style.padding = '5mm';
            
            headerDiv.innerHTML = `
              <div class="font-sarabun" style="text-align: center;">
                <h2 style="font-size: 1.25rem; font-weight: bold; margin: 0;">รายละเอียดการประเมินรถขนส่ง</h2>
              </div>
              <div class="font-sarabun" style="margin-bottom: 5px;">
                <p style="margin: 3px 0; font-size: 0.875rem;"><strong>ทะเบียนรถ:</strong> ${item.vehiclePlate}</p>
                <p style="margin: 3px 0; font-size: 0.875rem;"><strong>ผู้รับจ้างช่วง:</strong> ${options.reportData.contractor}</p>
                <p style="margin: 3px 0; font-size: 0.875rem;"><strong>เดือน:</strong> ${options.months?.find(m => m.value === options.selectedMonth)?.label} ${parseInt(options.selectedYear!) + 543}</p>
              </div>
            `;
            
            return { headerDiv, headerHeight };
          };
          
          // Add header to first page
          const { headerDiv, headerHeight } = addVehicleHeader();
          document.body.appendChild(headerDiv);
          
          const headerCanvas = await html2canvas(headerDiv, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
          });
          
          document.body.removeChild(headerDiv);
          
          const headerImgData = headerCanvas.toDataURL('image/png');
          const headerImgAspectRatio = headerCanvas.height / headerCanvas.width;
          const headerImgWidth = contentWidth;
          const headerImgHeight = contentWidth * headerImgAspectRatio;
          
          pdf.addImage(headerImgData, 'PNG', margins, currentYPosition, headerImgWidth, headerImgHeight);
          currentYPosition += headerImgHeight + 2; // Add minimal spacing
          
          // Process each date group
          for (const date of sortedDates) {
            const dayEvaluations = dateGroups[date];
            
            // Create a temporary DOM element for this date's data
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.width = '190mm';
            tempDiv.style.fontFamily = fontFamily;
            tempDiv.style.fontSize = '12px';
            tempDiv.style.backgroundColor = 'white';
            tempDiv.style.padding = '5mm';
            
            let htmlContent = `
              <div class="font-sarabun">
                <h3 style="font-size: 0.75rem; font-weight: bold; margin: 0 0 2px 0;">วันที่: ${date}</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; margin-bottom: 1px;">
                  <thead>
                    <tr style="background-color: #f5f5f5;">
                      <th style="border: 1px solid black; padding: 4px; text-align: center; font-size: 0.7rem;">เวลา</th>
                      <th style="border: 1px solid black; padding: 4px; text-align: center; font-size: 0.7rem;">(ก) ความร่วมมือคนขับ (4)</th>
                      <th style="border: 1px solid black; padding: 4px; text-align: center; font-size: 0.7rem;">(ข) สภาพความพร้อมของรถ (3)</th>
                      <th style="border: 1px solid black; padding: 4px; text-align: center; font-size: 0.7rem;">(ค) ความเสียหายของพัสดุ (3)</th>
                      <th style="border: 1px solid black; padding: 4px; text-align: center; font-size: 0.7rem;">คะแนนรวม</th>
                      <th style="border: 1px solid black; padding: 4px; text-align: center; font-size: 0.7rem;">คะแนนเต็ม</th>
                      <th style="border: 1px solid black; padding: 4px; text-align: center; font-size: 0.7rem;">เปอร์เซ็นต์</th>
                    </tr>
                  </thead>
                  <tbody>
            `;
            
            // Sort evaluations by time
            const sortedEvaluations = dayEvaluations.sort((a: any, b: any) => 
              new Date(a.evaluationDate).getTime() - new Date(b.evaluationDate).getTime()
            );
            
            // Add row for each trip
            sortedEvaluations.forEach((evaluation: any) => {
              const evalTime = new Date(evaluation.evaluationDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
              const driverScore = evaluation.driverCooperation || 0;
              const vehicleScore = evaluation.vehicleCondition || 0;
              const damageScore = evaluation.damageScore || 0;
              const totalScore = driverScore + vehicleScore + damageScore;
              const maxScore = 4 + 3 + 3; // 10
              const percentage = Math.round((totalScore / maxScore) * 100);
              
              htmlContent += `
                    <tr>
                      <td style="border: 1px solid black; padding: 4px; text-align: center; font-size: 0.75rem;">${evalTime}</td>
                      <td style="border: 1px solid black; padding: 4px; text-align: center; font-size: 0.75rem;">${driverScore}</td>
                      <td style="border: 1px solid black; padding: 4px; text-align: center; font-size: 0.75rem;">${vehicleScore}</td>
                      <td style="border: 1px solid black; padding: 4px; text-align: center; font-size: 0.75rem;">${damageScore}</td>
                      <td style="border: 1px solid black; padding: 4px; text-align: center; font-size: 0.75rem;">${totalScore}</td>
                      <td style="border: 1px solid black; padding: 4px; text-align: center; font-size: 0.75rem;">${maxScore}</td>
                      <td style="border: 1px solid black; padding: 4px; text-align: center; font-size: 0.75rem;">${percentage}%</td>
                    </tr>
              `;
            });
            
            htmlContent += `
                  </tbody>
                </table>
            `;
            
            // Add damage notes for this specific date
            const dayDamageEvaluations = dayEvaluations.filter((evaluation: any) => 
              evaluation.damageFound && evaluation.damageValue && evaluation.damageValue > 0
            );
            
            if (dayDamageEvaluations.length > 0) {
              htmlContent += `
                <div class="font-sarabun" style="margin-top: 5px; margin-bottom: 1px; padding: 4px; background-color: #f5f5f5; border: 1px solid #cccccc; border-radius: 4px;">
                  <div style="font-size: 0.7rem; font-weight: bold; color: #000; margin-bottom: 2px;">หมายเหตุความเสียหาย (วันที่ ${date}):</div>
              `;
              
              // Sort damage evaluations for this day by time
              dayDamageEvaluations
                .sort((a, b) => new Date(a.evaluationDate).getTime() - new Date(b.evaluationDate).getTime())
                .forEach((evaluation: any) => {
                  const evalTime = new Date(evaluation.evaluationDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                  const damageValue = evaluation.damageValue ? evaluation.damageValue.toLocaleString('th-TH') : '0';
                  const remark = evaluation.remark ? ` (${evaluation.remark})` : '';
                  
                  htmlContent += `
                    <div style="font-size: 0.65rem; color: #000; margin-left: 8px; margin-bottom: 3px;">
                      • เวลา ${evalTime} - มูลค่าความเสียหาย: ${damageValue} บาท${remark}
                    </div>
                  `;
                });
              
              htmlContent += `
                </div>
              `;
            }
            
            htmlContent += `
              </div>
            `;
            
            tempDiv.innerHTML = htmlContent;
            document.body.appendChild(tempDiv);
            
            // Capture the content for this date
            const dayCanvas = await html2canvas(tempDiv, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff'
            });
            
            // Remove temporary element
            document.body.removeChild(tempDiv);
            
            const dayImgData = dayCanvas.toDataURL('image/png');
            const dayImgAspectRatio = dayCanvas.height / dayCanvas.width;
            const dayImgWidth = contentWidth;
            const dayImgHeight = contentWidth * dayImgAspectRatio;
            
            // Check if this day's data fits in remaining space on current page
            const remainingSpace = contentHeight - currentYPosition;
            
            if (dayImgHeight > remainingSpace && currentYPosition > margins + headerImgHeight) {
              // Start a new page for this day's data
              markPageForFooter(currentPage);
              currentPage++;
              pdf.addPage();
              currentYPosition = margins;
              
              // Add vehicle header on new page
              const { headerDiv: newHeaderDiv } = addVehicleHeader();
              document.body.appendChild(newHeaderDiv);
              
              const newHeaderCanvas = await html2canvas(newHeaderDiv, {
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
              });
              
              document.body.removeChild(newHeaderDiv);
              
              const newHeaderImgData = newHeaderCanvas.toDataURL('image/png');
              const newHeaderImgAspectRatio = newHeaderCanvas.height / newHeaderCanvas.width;
              const newHeaderImgWidth = contentWidth;
              const newHeaderImgHeight = contentWidth * newHeaderImgAspectRatio;
              
              pdf.addImage(newHeaderImgData, 'PNG', margins, currentYPosition, newHeaderImgWidth, newHeaderImgHeight);
              currentYPosition += newHeaderImgHeight + 2;
            }
            
            // Check if day's data needs to be split across multiple pages
            if (dayImgHeight > contentHeight) {
              // Split day's data across multiple pages
              let dayRemainingHeight = dayImgHeight;
              let sourceY = 0;
              
              while (dayRemainingHeight > 0) {
                const availableHeight = contentHeight - currentYPosition;
                const currentPageHeight = Math.min(availableHeight, dayRemainingHeight);
                const currentCanvasHeight = (currentPageHeight / dayImgHeight) * dayCanvas.height;
                
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = dayCanvas.width;
                pageCanvas.height = currentCanvasHeight;
                const pageCtx = pageCanvas.getContext('2d');
                
                if (pageCtx) {
                  pageCtx.drawImage(dayCanvas, 0, sourceY, dayCanvas.width, currentCanvasHeight, 0, 0, dayCanvas.width, currentCanvasHeight);
                  const currentPageImgData = pageCanvas.toDataURL('image/png');
                  pdf.addImage(currentPageImgData, 'PNG', margins, currentYPosition, dayImgWidth, currentPageHeight);
                  
                  sourceY += currentCanvasHeight;
                  dayRemainingHeight -= currentPageHeight;
                  
                  if (dayRemainingHeight > 0) {
                    markPageForFooter(currentPage);
                    currentPage++;
                    pdf.addPage();
                    currentYPosition = margins;
                    
                    // Add vehicle header on new page
                    const { headerDiv: newHeaderDiv } = addVehicleHeader();
                    document.body.appendChild(newHeaderDiv);
                    
                    const newHeaderCanvas = await html2canvas(newHeaderDiv, {
                      scale: 2,
                      useCORS: true,
                      allowTaint: true,
                      backgroundColor: '#ffffff'
                    });
                    
                    document.body.removeChild(newHeaderDiv);
                    
                    const newHeaderImgData = newHeaderCanvas.toDataURL('image/png');
                    const newHeaderImgAspectRatio = newHeaderCanvas.height / newHeaderCanvas.width;
                    const newHeaderImgWidth = contentWidth;
                    const newHeaderImgHeight = contentWidth * newHeaderImgAspectRatio;
                    
                    pdf.addImage(newHeaderImgData, 'PNG', margins, currentYPosition, newHeaderImgWidth, newHeaderImgHeight);
                    currentYPosition += newHeaderImgHeight + 2;
                  } else {
                    currentYPosition += currentPageHeight;
                  }
                }
              }
            } else {
              // Add day's data to current page
              pdf.addImage(dayImgData, 'PNG', margins, currentYPosition, dayImgWidth, dayImgHeight);
              currentYPosition += dayImgHeight;
            }
          }
          
          // Mark footer for last page of this vehicle
          markPageForFooter(currentPage);
          currentPage++;
        }
      }

      // Now add footers to all pages with correct total page count
      const totalPages = currentPage - 1;
      pageFooters.forEach(footer => {
        pdf.setPage(footer.pageNum);
        pdf.setFontSize(8);
        // Print date on the left
        pdf.text(`Print Date: ${printDate}`, margins, pdfHeight - 5);
        // Page number on the right
        const pageText = `Page ${footer.pageNum}/${totalPages}`;
        const pageTextWidth = pdf.getTextWidth(pageText);
        pdf.text(pageText, pdfWidth - margins - pageTextWidth, pdfHeight - 5);
      });

      return { pdf, success: true };
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      return { pdf: new jsPDF(), success: false, error: error.message };
    }
  }

  // Generate PDF and download
  static async downloadPDF(options: PDFGeneratorOptions): Promise<PDFGeneratorResult> {
    const result = await this.generatePDFInternal(options);
    
    if (!result.success) {
      options.showSnackbar?.('เกิดข้อผิดพลาดในการสร้าง PDF', 'error');
      return { success: false, error: result.error };
    }

    try {
      const filename = options.filename || `รายงานประเมิน_${Date.now()}.pdf`;
      
      // Generate blob and create object URL
      const pdfBlob = result.pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Create temporary download link
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      downloadLink.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up blob URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 1000);
      
      options.showSnackbar?.('ดาวน์โหลด PDF เรียบร้อยแล้ว', 'success');
      return { success: true, blob: pdfBlob };
    } catch (error: any) {
      options.showSnackbar?.('เกิดข้อผิดพลาดในการดาวน์โหลด PDF', 'error');
      return { success: false, error: error.message };
    }
  }

  // Generate PDF and print
  static async printPDF(options: PDFGeneratorOptions): Promise<PDFGeneratorResult> {
    const result = await this.generatePDFInternal(options);
    
    if (!result.success) {
      options.showSnackbar?.('เกิดข้อผิดพลาดในการสร้าง PDF สำหรับพิมพ์', 'error');
      return { success: false, error: result.error };
    }

    try {
      // Generate blob and create object URL for printing
      const pdfBlob = result.pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Open PDF in new window and trigger print
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          // Clean up the blob URL after a delay
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 1000);
        };
      } else {
        throw new Error('ไม่สามารถเปิดหน้าต่างพิมพ์ได้');
      }
      
      return { success: true, blob: pdfBlob };
    } catch (error: any) {
      options.showSnackbar?.('เกิดข้อผิดพลาดในการพิมพ์ PDF', 'error');
      return { success: false, error: error.message };
    }
  }

  // Generate PDF blob (for custom handling)
  static async generateBlob(options: PDFGeneratorOptions): Promise<PDFGeneratorResult> {
    const result = await this.generatePDFInternal(options);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }

    try {
      const pdfBlob = result.pdf.output('blob');
      return { success: true, blob: pdfBlob };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
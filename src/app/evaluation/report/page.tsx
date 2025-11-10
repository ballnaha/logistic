'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  Divider,
  Card,
  CardContent,

} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  ArrowBack as BackIcon,
  TrendingUp as TrendingUpIcon,
  LocalShipping as TruckIcon,
  Business as BusinessIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { EvaluationReportPDFGenerator } from '../../../components/EvaluationReportPDFGenerator';

interface VendorOption {
  code: string;
  name: string;
  fullName: string;
}

interface EvaluationReportData {
  vehiclePlate: string;
  tripCount: number;
  driverCooperationTotal: number;
  driverCooperationMax: number;
  vehicleConditionTotal: number;
  vehicleConditionMax: number;
  damageScoreTotal: number;
  damageScoreMax: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  result: string;
}

interface ReportSummary {
  contractor: string;
  month: number;
  year: number;
  data: EvaluationReportData[];
  totalVehicles: number;
  totalTrips: number;
  averageScore: number;
  averagePercentage: number;
}

export default function EvaluationReportPage() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();

  // States
  const [loading, setLoading] = useState(false);
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth() + 1 + '');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedVehiclePlate, setSelectedVehiclePlate] = useState<string>('');
  const [allEvaluations, setAllEvaluations] = useState<any[]>([]);
  const [reportData, setReportData] = useState<ReportSummary | null>(null);



  // Months data
  const months = [
    { value: '1', label: 'มกราคม' },
    { value: '2', label: 'กุมภาพันธ์' },
    { value: '3', label: 'มีนาคม' },
    { value: '4', label: 'เมษายน' },
    { value: '5', label: 'พฤษภาคม' },
    { value: '6', label: 'มิถุนายน' },
    { value: '7', label: 'กรกฎาคม' },
    { value: '8', label: 'สิงหาคม' },
    { value: '9', label: 'กันยายน' },
    { value: '10', label: 'ตุลาคม' },
    { value: '11', label: 'พฤศจิกายน' },
    { value: '12', label: 'ธันวาคม' },
  ];

  // Get available years (from current year, add new year when it comes)
  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    // Start from current year and go back to 2025
    for (let year = currentYear; year >= 2025; year--) {
      years.push(year);
    }
    
    return years;
  };

  // Fetch vendor options from evaluations
  useEffect(() => {
    const fetchVendors = async () => {
      setVendorLoading(true);
      try {
        // ดึงข้อมูล evaluation ทั้งหมดก่อน
        const evaluationResponse = await fetch('/api/evaluation');
        if (evaluationResponse.ok) {
          const evaluations = await evaluationResponse.json();
          setAllEvaluations(evaluations); // เก็บข้อมูลทั้งหมดไว้
          
          // ดึงรายชื่อ vendor ที่ไม่ซ้ำจาก evaluation
          const uniqueVendors = Array.from(new Set(
            evaluations.map((evaluation: any) => evaluation.contractorName)
          )).filter(Boolean); // กรองค่าว่างออก
          
          // แปลงเป็น format ที่ต้องการ
          const vendorOptions = uniqueVendors.map((name, index: number) => ({
            code: `vendor_${index}`,
            name: name as string,
            fullName: name as string
          }));
          
          setVendorOptions(vendorOptions);
        } else {
          showSnackbar('ไม่สามารถดึงข้อมูลผู้รับจ้างช่วงได้', 'error');
        }
      } catch (error) {
        showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลผู้รับจ้างช่วง', 'error');
        console.error('Vendor fetch error:', error);
      } finally {
        setVendorLoading(false);
      }
    };

    fetchVendors();
  }, [showSnackbar]);

  // Get available contractors (filtered by selected month/year)
  const getAvailableContractors = () => {
    let filtered = allEvaluations;
    
    // Filter by date
    if (selectedMonth && selectedYear) {
      filtered = filtered.filter(evaluation => {
        const evalDate = new Date(evaluation.evaluationDate);
        const evalMonth = (evalDate.getMonth() + 1).toString();
        const evalYear = evalDate.getFullYear().toString();
        return evalMonth === selectedMonth && evalYear === selectedYear;
      });
    } else if (selectedYear) {
      filtered = filtered.filter(evaluation => {
        const evalDate = new Date(evaluation.evaluationDate);
        const evalYear = evalDate.getFullYear().toString();
        return evalYear === selectedYear;
      });
    }

    const contractors = filtered.map(e => e.contractorName).filter(Boolean);
    const uniqueContractors = Array.from(new Set(contractors)).sort((a, b) => a.localeCompare(b));
    
    // แปลงเป็น format ที่ต้องการ
    return uniqueContractors.map((name, index: number) => ({
      code: `vendor_${index}`,
      name: name as string,
      fullName: name as string
    }));
  };

  // Get available vehicle plates (cascade based on contractor and date selection)
  const getAvailableVehiclePlates = () => {
    let filtered = allEvaluations;
    
    // Filter by date
    if (selectedMonth && selectedYear) {
      filtered = filtered.filter(evaluation => {
        const evalDate = new Date(evaluation.evaluationDate);
        const evalMonth = (evalDate.getMonth() + 1).toString();
        const evalYear = evalDate.getFullYear().toString();
        return evalMonth === selectedMonth && evalYear === selectedYear;
      });
    } else if (selectedYear) {
      filtered = filtered.filter(evaluation => {
        const evalDate = new Date(evaluation.evaluationDate);
        const evalYear = evalDate.getFullYear().toString();
        return evalYear === selectedYear;
      });
    }

    // Filter by contractor if selected
    if (selectedVendor) {
      const availableContractors = getAvailableContractors();
      const selectedVendorData = availableContractors.find(v => v.code === selectedVendor);
      if (selectedVendorData) {
        filtered = filtered.filter(evaluation => 
          evaluation.contractorName === selectedVendorData.name
        );
      }
    }

    const plates = filtered.map(e => e.vehiclePlate).filter(Boolean);
    return Array.from(new Set(plates)).sort((a, b) => a.localeCompare(b));
  };

  // Reset contractor and vehicle plate when date filter changes
  useEffect(() => {
    const availableContractors = getAvailableContractors();
    const contractorCodes = availableContractors.map(c => c.code);
    
    // If selected contractor is not in the available list, reset it
    if (selectedVendor && !contractorCodes.includes(selectedVendor)) {
      setSelectedVendor('');
      setSelectedVehiclePlate('');
    } else if (selectedVendor) {
      // If contractor is still valid, check vehicle plate
      const availablePlates = getAvailableVehiclePlates();
      if (selectedVehiclePlate && !availablePlates.includes(selectedVehiclePlate)) {
        setSelectedVehiclePlate('');
      }
    }
    
    // Reset report data when filter changes
    setReportData(null);
  }, [selectedMonth, selectedYear]);

  // Reset vehicle plate and report data when contractor changes
  useEffect(() => {
    const availablePlates = getAvailableVehiclePlates();
    if (selectedVehiclePlate && !availablePlates.includes(selectedVehiclePlate)) {
      setSelectedVehiclePlate('');
    }
    
    // Reset report data when contractor changes
    setReportData(null);
  }, [selectedVendor]);
  
  // Reset report data when vehicle plate changes
  useEffect(() => {
    setReportData(null);
  }, [selectedVehiclePlate]);

  // Handle filter reset
  const handleResetFilter = () => {
    setSelectedVendor('');
    setSelectedMonth((new Date().getMonth() + 1).toString());
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedVehiclePlate('');
    setReportData(null);
  };

  // Generate report
  const generateReport = async () => {
    if (!selectedVendor || !selectedMonth || !selectedYear) {
      showSnackbar('กรุณาเลือกผู้รับจ้างช่วง เดือน และปี', 'error');
      return;
    }

    setLoading(true);
    try {
      // Fetch evaluations for the selected vendor, month, and year
      const response = await fetch('/api/evaluation');
      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลแบบประเมินได้');
      }

      const evaluations = await response.json();
      const availableContractors = getAvailableContractors();
      const selectedVendorData = availableContractors.find(v => v.code === selectedVendor);
      
      // Filter evaluations by vendor, month, year, and optionally vehicle plate
      let filteredEvaluations = evaluations.filter((evaluation: any) => {
        const evalDate = new Date(evaluation.evaluationDate);
        const evalMonth = evalDate.getMonth() + 1;
        const evalYear = evalDate.getFullYear();
        
        const matchesVendor = evaluation.contractorName === selectedVendorData?.name;
        const matchesDate = evalMonth.toString() === selectedMonth && evalYear.toString() === selectedYear;
        const matchesVehicle = !selectedVehiclePlate || evaluation.vehiclePlate === selectedVehiclePlate;
        
        return matchesVendor && matchesDate && matchesVehicle;
      });

      // Group by vehicle plate
      const vehicleGroups: { [key: string]: any[] } = {};
      filteredEvaluations.forEach((evaluation: any) => {
        if (!vehicleGroups[evaluation.vehiclePlate]) {
          vehicleGroups[evaluation.vehiclePlate] = [];
        }
        vehicleGroups[evaluation.vehiclePlate].push(evaluation);
      });

      // Calculate report data for each vehicle
      const reportItems: EvaluationReportData[] = Object.keys(vehicleGroups).map(vehiclePlate => {
        const vehicleEvaluations = vehicleGroups[vehiclePlate];
        const tripCount = vehicleEvaluations.length;
        
        // Calculate simple averages (total scores divided by total trips)
        const driverCooperationAvg = tripCount > 0 ? vehicleEvaluations.reduce((sum: number, evaluation: any) => 
          sum + evaluation.driverCooperation, 0) / tripCount : 0;
        const vehicleConditionAvg = tripCount > 0 ? vehicleEvaluations.reduce((sum: number, evaluation: any) => 
          sum + evaluation.vehicleCondition, 0) / tripCount : 0;
        
        // Calculate damage score average with monthly logic
        let damageScoreAvg = 0;
        const damageEvaluations = vehicleEvaluations.filter((evaluation: any) => evaluation.damageFound);
        const totalDamageValue = damageEvaluations.reduce((sum: number, evaluation: any) => 
          sum + (evaluation.damageValue || 0), 0);
        
        // New monthly damage logic: if damage > 1 time OR total value > 300k, all trips get 0 score
        if (damageEvaluations.length > 1 || totalDamageValue > 300000) {
          damageScoreAvg = 0; // ทั้งเดือนได้ 0 คะแนน
        } else if (damageEvaluations.length === 1 && totalDamageValue <= 300000) {
          // 1 ครั้งและไม่เกิน 300k: ให้คะแนนตามปกติ (3 สำหรับไม่เสียหาย, 1 สำหรับเสียหาย)
          const damageScoreTotal = vehicleEvaluations.reduce((sum: number, evaluation: any) => 
            sum + (evaluation.damageFound ? 1 : 3), 0);
          damageScoreAvg = tripCount > 0 ? damageScoreTotal / tripCount : 0;
        } else {
          // ไม่มีความเสียหาย: ให้ 3 คะแนนทุกเที่ยว
          damageScoreAvg = 3;
        }
        
        // Calculate max scores (per trip average)
        const driverCooperationMax = 4;
        const vehicleConditionMax = 3;
        const damageScoreMax = 3;
        
        const totalScore = driverCooperationAvg + vehicleConditionAvg + damageScoreAvg;
        const maxScore = driverCooperationMax + vehicleConditionMax + damageScoreMax;
        const percentage = maxScore > 0 ? parseFloat(((totalScore / maxScore) * 100).toFixed(2)) : 0;
        
        // Determine result
        let result = '';
        if (percentage > 90) result = 'ผ่าน';
        else if (percentage >= 80) result = 'ต้องปรับปรุง';
        else result = 'ไม่ผ่าน';

        return {
          vehiclePlate,
          tripCount,
          driverCooperationTotal: driverCooperationAvg, // ใช้เป็นค่าเฉลี่ย
          driverCooperationMax,
          vehicleConditionTotal: vehicleConditionAvg, // ใช้เป็นค่าเฉลี่ย
          vehicleConditionMax,
          damageScoreTotal: damageScoreAvg, // ใช้เป็นค่าเฉลี่ย
          damageScoreMax,
          totalScore,
          maxScore,
          percentage,
          result
        };
      });

      // Calculate summary
      const totalVehicles = reportItems.length;
      const totalTrips = reportItems.reduce((sum, item) => sum + item.tripCount, 0);
      const totalScoreSum = reportItems.reduce((sum, item) => sum + item.totalScore, 0);
      const totalMaxScoreSum = reportItems.reduce((sum, item) => sum + item.maxScore, 0);
      const averagePercentage = totalMaxScoreSum > 0 ? parseFloat(((totalScoreSum / totalMaxScoreSum) * 100).toFixed(2)) : 0;
      const averageScore = totalVehicles > 0 ? parseFloat((totalScoreSum / totalVehicles).toFixed(2)) : 0;

      const summary: ReportSummary = {
        contractor: selectedVendorData?.name || '',
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        data: reportItems.sort((a, b) => a.vehiclePlate.localeCompare(b.vehiclePlate)),
        totalVehicles,
        totalTrips,
        averageScore,
        averagePercentage
      };

      setReportData(summary);
    } catch (error: any) {
      console.error('Error generating report:', error);
      showSnackbar(error.message || 'เกิดข้อผิดพลาดในการสร้างรายงาน', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get result color
  const getResultColor = (percentage: number) => {
    if (percentage > 90) return 'success'; // ผ่าน
    if (percentage >= 80) return 'warning'; // ต้องปรับปรุง
    return 'error'; // ไม่ผ่าน
  };

  // Print report as PDF
  const handlePrintPDF = async () => {
    if (!reportData) {
      showSnackbar('ไม่พบข้อมูลรายงานสำหรับพิมพ์', 'error');
      return;
    }

    await EvaluationReportPDFGenerator.printPDF({
      elementId: 'report-content',
      reportData,
      vendorOptions: getAvailableContractors(),
      selectedVendor,
      selectedVehiclePlate,
      selectedMonth,
      selectedYear,
      months,
      showSnackbar
    });
  };

  // Print report
  const handlePrint = () => {
    window.print();
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!reportData) {
      showSnackbar('ไม่พบข้อมูลรายงานสำหรับดาวน์โหลด', 'error');
      return;
    }

    const filename = `รายงานประเมิน_${reportData.contractor}_${months.find(m => m.value === selectedMonth)?.label}_${parseInt(selectedYear) + 543}.pdf`;

    await EvaluationReportPDFGenerator.downloadPDF({
      elementId: 'report-content',
      filename,
      reportData,
      vendorOptions: getAvailableContractors(),
      selectedVendor,
      selectedVehiclePlate,
      selectedMonth,
      selectedYear,
      months,
      showSnackbar,
      quality: 1, // 100% quality
      compressImages: true
    });
  };

  return (
    <Layout showSidebar={false}>
      <Box >
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h5" component="h1" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.125rem' } }}>
              รายงานสรุปแบบประเมิน
            </Typography>
          </Box>
          
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon color="primary" />
            เลือกเงื่อนไขรายงาน
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <Box sx={{ minWidth: 200, flex: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>ผู้รับจ้างช่วง</InputLabel>
                <Select
                  value={selectedVendor}
                  label="ผู้รับจ้างช่วง"
                  onChange={(e) => {
                    setSelectedVendor(e.target.value);
                    // Reset vehicle plate when contractor changes
                    setSelectedVehiclePlate('');
                  }}
                  disabled={vendorLoading}
                >
                  {getAvailableContractors().map((vendor) => (
                    <MenuItem key={vendor.code} value={vendor.code}>
                      {vendor.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ minWidth: 150 }}>
              <FormControl fullWidth size="small">
                <InputLabel>ทะเบียนรถ</InputLabel>
                <Select
                  value={selectedVehiclePlate}
                  label="ทะเบียนรถ"
                  onChange={(e) => setSelectedVehiclePlate(e.target.value)}
                  disabled={!selectedVendor}
                >
                  <MenuItem value="">ทั้งหมด</MenuItem>
                  {getAvailableVehiclePlates().map((plate) => (
                    <MenuItem key={plate} value={plate}>
                      {plate}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ minWidth: 150 }}>
              <FormControl fullWidth size="small">
                <InputLabel>เดือน</InputLabel>
                <Select
                  value={selectedMonth}
                  label="เดือน"
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {months.map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ minWidth: 120 }}>
              <FormControl fullWidth size="small">
                <InputLabel>ปี</InputLabel>
                <Select
                  value={selectedYear}
                  label="ปี"
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {getAvailableYears().map((year) => (
                    <MenuItem key={year} value={year.toString()}>
                      {year + 543}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box>
              <Button
                variant="contained"
                onClick={generateReport}
                disabled={loading || vendorLoading}
                sx={{ borderRadius: 1, px: 3 }}
              >
                {loading ? 'กำลังสร้าง ...' : 'สร้างรายงาน'}
              </Button>
            </Box>
          </Box>

          {/* Active Filters */}
          {(selectedVendor || selectedVehiclePlate || selectedMonth || selectedYear !== new Date().getFullYear().toString()) && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderTopColor: 'grey.200' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                ตัวกรอง:
              </Typography>
              
              {selectedVendor && (
                <Chip
                  label={`ผู้รับจ้างช่วง: ${getAvailableContractors().find(v => v.code === selectedVendor)?.name || selectedVendor}`}
                  onDelete={() => {
                    setSelectedVendor('');
                    setSelectedVehiclePlate('');
                  }}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}

              {selectedVehiclePlate && (
                <Chip
                  label={`ทะเบียนรถ: ${selectedVehiclePlate}`}
                  onDelete={() => setSelectedVehiclePlate('')}
                  color="info"
                  variant="outlined"
                  size="small"
                />
              )}

              {selectedMonth && (
                <Chip
                  label={`เดือน: ${months.find(m => m.value === selectedMonth)?.label || selectedMonth}`}
                  onDelete={() => setSelectedMonth('')}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}

              {selectedYear !== new Date().getFullYear().toString() && (
                <Chip
                  label={`ปี: ${parseInt(selectedYear) + 543}`}
                  onDelete={() => setSelectedYear(new Date().getFullYear().toString())}
                  color="warning"
                  variant="outlined"
                  size="small"
                />
              )}

              <Chip
                label="ล้างทั้งหมด"
                onClick={handleResetFilter}
                variant="outlined"
                size="small"
                sx={{ 
                  color: 'text.secondary',
                  borderColor: 'grey.300',
                  '&:hover': { 
                    color: 'error.main',
                    borderColor: 'error.main' 
                  }
                }}
              />
            </Box>
          )}
        </Paper>

        {/* Report Content */}
        {reportData && (
          <Paper 
            id="report-content"
            className="font-sarabun"
            sx={{ 
              borderRadius: 0, 
              boxShadow: 'none',
              backgroundColor: 'white',
              '@media print': {
                border: 'none',
                boxShadow: 'none'
              }
            }}
          >
            {/* Report Header - Minimal Style */}
            <Box sx={{ p: 2 }}>
              {/* Form Number */}
              <Box sx={{ textAlign: 'right', mb: 2 }}>
                <Typography variant="body2" sx={{ 
                  border: '1px solid black', 
                  display: 'inline-block', 
                  px: 2, 
                  py: 0.5,
                  fontSize: '0.875rem'
                }}>
                  FM-WH-025 (02)
                </Typography>
              </Box>

              {/* Title */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="500" sx={{ mb: 1 , fontFamily: 'Sarabun, Arial, sans-serif' }}>
                  รายงานสรุปประเมินรถขนส่งพัสดุ
                </Typography>
              </Box>

              {/* Site Selection */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckBoxOutlineBlankIcon />
                    <Typography variant="body2" style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>PSC</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckBoxOutlineBlankIcon />
                    <Typography variant="body2" style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>PS</Typography>
                  </Box>
                </Box>
              </Box>

              {/* Info Section */}
              <Box sx={{ mb: 0 }}>
                <Typography variant="body2" sx={{ mb: 1 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                  <strong>ชื่อผู้รับจ้างช่วง:</strong> {reportData.contractor}
                </Typography>
                <Typography variant="body2" style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                  <strong>เดือน:</strong> {months.find(m => m.value === selectedMonth)?.label}
                  &nbsp;&nbsp;&nbsp;
                  <strong>ปี:</strong> {parseInt(selectedYear) + 543}
                </Typography>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box className="action-buttons" sx={{ p: 2, display: 'flex', gap: 2, justifyContent: 'flex-end', '@media print': { display: 'none' } }}>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handlePrintPDF}
                sx={{ borderRadius: 1 }}
              >
                พิมพ์ PDF
              </Button>
              
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadPDF}
                sx={{ borderRadius: 1 }}
              >
                ดาวน์โหลด PDF
              </Button>
            </Box>

            {/* Report Table - Minimal Style */}
            <Box sx={{ border: '1px solid black', m: 2 , mb: 3 }}>
              <Table size="small" sx={{ '& .MuiTableCell-root': { border: '1px solid black', fontSize: '0.75rem' } , width:'100%' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      ทะเบียนรถ
                    </TableCell>
                    <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      จำนวนเที่ยว
                    </TableCell>
                    <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.7rem', p: 0.5, minWidth: 80 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      (ก) ความร่วมมือคนขับ (4)
                    </TableCell>
                    <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.7rem', p: 0.5, minWidth: 80 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      (ข) สภาพความพร้อมของรถ (3)
                    </TableCell>
                    <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.7rem', p: 0.5, minWidth: 80 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      (ค) ความเสียหายของพัสดุ (3)
                    </TableCell>
                    <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      คะแนนเฉลี่ยรวม
                    </TableCell>
                    <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      คะแนนเต็ม
                    </TableCell>
                    <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      เปอร์เซ็นต์
                    </TableCell>
                    <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      ผลการประเมิน
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.data.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 500, fontSize: '0.75rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        {item.vehiclePlate}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        {item.tripCount}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        {item.driverCooperationTotal.toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        {item.vehicleConditionTotal.toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        {item.damageScoreTotal.toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        {item.totalScore.toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        {item.maxScore}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        {item.percentage}%
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.75rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        {item.result}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Box sx={{ p: 2, borderTop: '1px solid black'}}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', md: 'row' }, 
                gap: { xs: 1, md: 3 } 
              }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ mb: 1 , fontSize: '0.75rem' }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                    เปอร์เซ็นต์คะแนนที่ได้ / เดือน = คะแนนรวม x 100 / คะแนนเต็ม <br />
                    คะแนนเต็มต่อเที่ยว = 10
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ mb: 1 , fontSize: '0.75rem' }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                    คะแนนมากกว่า 90% ขึ้นไป = ผ่าน <br /> 
                    คะแนน 80-90% = ต้องปรับปรุง <br /> 
                    คะแนนน้อยกว่า 80% = ไม่ผ่าน
                  </Typography>
                </Box>
              </Box>
            </Box>
            

            {/* Summary Section */}
            <Box sx={{ p: 2, borderTop: '1px solid black' }}>
              <Typography variant="body2" sx={{ mb: 1 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                <strong>หมายเหตุ:</strong>
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', md: 'row' }, 
                gap: { xs: 1, md: 3 } 
              }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 1 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                    (ก) การให้ความร่วมมือของคนรถ หมายถึง มารยาทของคนขับรถ , คนขับรถให้ความร่วมมือในการคลุมผ้าใบ , การลงพัสดุ , ในกรณีที่คนขับรถให้ความร่วมมือดีมาก ให้คะแนน = 4 , ดี = 3 , ปานกลาง = 2 , ไม่ดี = 1
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 1 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                    (ข) สภาพความพร้อมของรถขนส่ง หมายถึง รถสะอาด ไม่พบรอยรั่ว , พื้นเรียบ ไม่มีรองฝา หรือกระดานกั้นฝา ในกรณีที่รถสะอาดตามรายละเอียดข้างต้น = 3 แต่ในกรณีที่รถสกปรกจะหักคะแนน = 0 และขอให้นำรถไปทำการปรับปรุงทันที
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 1 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                    (ค) ความเสียหายของพัสดุ กรณีที่รถขนส่งพัสดุเกิดอุบัติเหตุที่เป็นสาเหตุของพัสดุเสียหาย ในกรณีที่ไม่พบปัญหา ให้คะแนน = 3 คะแนน , กรณีที่พบปัญหา 1 ครั้งใน 1 เดือน ค่าเสียหายไม่เกิน 300,000 บาท ให้ 1 คะแนน กรณีที่พบปัญหาข้างต้นมากกว่า 1 ครั้ง/เดือน หรือมีความเสียหายมากกว่า 300,000 บาท ให้ = 0 คะแนน
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Signature Section */}
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Box sx={{ textAlign: 'center', minWidth: 200 }}>
                <Typography variant="body2" fontWeight="bold" style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>จัดทำโดย</Typography>
                <Box sx={{ borderBottom: '1px solid black', width: '100%', height: 40, mb: 1 }}></Box>
                
              </Box>
              <Box sx={{ textAlign: 'center', minWidth: 200 }}>
                <Typography variant="body2" fontWeight="bold" style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>ตรวจสอบโดย</Typography>
                <Box sx={{ borderBottom: '1px solid black', width: '100%', height: 40, mb: 1 }}></Box>
                
              </Box>
              <Box sx={{ textAlign: 'center', minWidth: 200 }}>
                <Typography variant="body2" fontWeight="bold" style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>รับทราบโดย</Typography>
                <Box sx={{ borderBottom: '1px solid black', width: '100%', height: 40, mb: 1 }}></Box>
                
              </Box>
            </Box>

          </Paper>
        )}
      </Box>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>


    </Layout>
  );
}

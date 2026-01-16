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
  FormControlLabel,
  Checkbox
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
  // Domestic fields
  driverCooperationTotal: number;
  driverCooperationMax: number;
  vehicleConditionTotal: number;
  vehicleConditionMax: number;
  damageScoreTotal: number;
  damageScoreMax: number;
  // International fields
  containerConditionTotal: number;
  containerConditionMax: number;
  punctualityTotal: number;
  punctualityMax: number;
  productDamageTotal: number;
  productDamageMax: number;
  // Common
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
  site?: string;
  transportType?: string;
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
  const [selectedTransportType, setSelectedTransportType] = useState('domestic');
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [allEvaluations, setAllEvaluations] = useState<any[]>([]);
  const [reportData, setReportData] = useState<ReportSummary | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [includeDetails, setIncludeDetails] = useState(false);



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
          const vendorOptions = uniqueVendors.map((name) => ({
            code: name as string,
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

  // Get available contractors (cascading based on site, transport type, month, and year)
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
    }

    // Filter by Site (case-insensitive and trimmed)
    if (selectedSite) {
      filtered = filtered.filter(evaluation =>
        evaluation.site?.trim().toUpperCase() === selectedSite.trim().toUpperCase()
      );
    }

    // Filter by Transport Type
    if (selectedTransportType) {
      filtered = filtered.filter(evaluation =>
        (evaluation.transportType || 'domestic') === selectedTransportType
      );
    }

    const contractors = filtered.map(e => e.contractorName).filter(Boolean);
    const uniqueContractors = Array.from(new Set(contractors)).sort((a, b) => a.localeCompare(b));

    // แปลงเป็น format ที่ต้องการ
    return uniqueContractors.map((name) => ({
      code: name as string,
      name: name as string,
      fullName: name as string
    }));
  };

  // Get available vehicle plates (cascading based on site, transport type, contractor, month, and year)
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
    }

    // Filter by Site
    if (selectedSite) {
      filtered = filtered.filter(evaluation =>
        evaluation.site?.trim().toUpperCase() === selectedSite.trim().toUpperCase()
      );
    }

    // Filter by Transport Type
    if (selectedTransportType) {
      filtered = filtered.filter(evaluation =>
        (evaluation.transportType || 'domestic') === selectedTransportType
      );
    }

    // Filter by contractor if selected
    if (selectedVendor) {
      filtered = filtered.filter(evaluation =>
        evaluation.contractorName === selectedVendor
      );
    }

    const plates = filtered.map(e => e.vehiclePlate).filter(Boolean);
    return Array.from(new Set(plates)).sort((a, b) => a.localeCompare(b));
  };

  // Handle cascading filter resets when dependencies change
  useEffect(() => {
    // 1. Validate Subcontractor (selectedVendor) when Site or TransportType changes
    const availableContractors = getAvailableContractors();
    const contractorNames = availableContractors.map(c => c.name);

    let isVendorValid = true;
    if (selectedVendor && !contractorNames.includes(selectedVendor)) {
      setSelectedVendor('');
      setSelectedVehiclePlate('');
      isVendorValid = false;
    }

    // 2. Validate Vehicle Plate when Vendor, Site, or TransportType changes
    if (isVendorValid && selectedVendor) {
      const availablePlates = getAvailableVehiclePlates();
      if (selectedVehiclePlate && !availablePlates.includes(selectedVehiclePlate)) {
        setSelectedVehiclePlate('');
      }
    }

    // 3. Always reset report data when any filter changes to ensure UI consistency
    setReportData(null);
  }, [selectedSite, selectedTransportType, selectedVendor, selectedVehiclePlate, selectedMonth, selectedYear]);

  // Handle filter reset
  const handleResetFilter = () => {
    setSelectedVendor('');
    setSelectedMonth((new Date().getMonth() + 1).toString());
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedVehiclePlate('');
    setSelectedTransportType('domestic');
    setSelectedSite('');
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
      const queryParams = new URLSearchParams({
        contractorName: selectedVendor || '',
        month: selectedMonth,
        year: selectedYear
      });

      const response = await fetch(`/api/evaluation?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลแบบประเมินได้');
      }

      const evaluations = await response.json();

      // Filter evaluations by vendor, month, year, site, transportType and optionally vehicle plate
      let filteredEvaluations = evaluations.filter((evaluation: any) => {
        const evalDate = new Date(evaluation.evaluationDate);
        const evalMonth = evalDate.getMonth() + 1;
        const evalYear = evalDate.getFullYear();

        const matchesVendor = evaluation.contractorName === selectedVendor;
        const matchesDate = evalMonth.toString() === selectedMonth && evalYear.toString() === selectedYear;
        const matchesVehicle = !selectedVehiclePlate || evaluation.vehiclePlate === selectedVehiclePlate;
        const matchesSite = !selectedSite || evaluation.site?.trim().toUpperCase() === selectedSite.trim().toUpperCase();
        const matchesTransportType = !selectedTransportType || (evaluation.transportType || 'domestic').toLowerCase() === selectedTransportType.toLowerCase();

        return matchesVendor && matchesDate && matchesVehicle && matchesSite && matchesTransportType;
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

        // Check transport type
        const isInternational = selectedTransportType === 'international';

        if (isInternational) {
          // International scoring: containerCondition(3) + punctuality(3) + productDamage(4) = max 10 per trip
          // Calculate total scores by summing all evaluations (not averaging)
          const containerConditionSum = vehicleEvaluations.reduce((sum: number, evaluation: any) =>
            sum + (evaluation.containerCondition || 0), 0);
          const punctualitySum = vehicleEvaluations.reduce((sum: number, evaluation: any) =>
            sum + (evaluation.punctuality || 0), 0);
          const productDamageSum = vehicleEvaluations.reduce((sum: number, evaluation: any) =>
            sum + (evaluation.productDamage || 0), 0);

          // Max scores per trip
          const containerConditionMaxPerTrip = 3;
          const punctualityMaxPerTrip = 3;
          const productDamageMaxPerTrip = 4;

          // Total max scores = max per trip * number of trips
          const containerConditionMax = containerConditionMaxPerTrip * tripCount;
          const punctualityMax = punctualityMaxPerTrip * tripCount;
          const productDamageMax = productDamageMaxPerTrip * tripCount;

          const totalScore = containerConditionSum + punctualitySum + productDamageSum;
          const maxScore = containerConditionMax + punctualityMax + productDamageMax;
          const percentage = maxScore > 0 ? parseFloat(((totalScore / maxScore) * 100).toFixed(2)) : 0;

          let result = '';
          if (percentage > 90) result = 'ผ่าน';
          else if (percentage >= 80) result = 'ต้องปรับปรุง';
          else result = 'ไม่ผ่าน';

          return {
            vehiclePlate,
            tripCount,
            // Domestic fields (set to 0 for international)
            driverCooperationTotal: 0,
            driverCooperationMax: 0,
            vehicleConditionTotal: 0,
            vehicleConditionMax: 0,
            damageScoreTotal: 0,
            damageScoreMax: 0,
            // International fields - now storing total sums
            containerConditionTotal: containerConditionSum,
            containerConditionMax,
            punctualityTotal: punctualitySum,
            punctualityMax,
            productDamageTotal: productDamageSum,
            productDamageMax,
            // Common
            totalScore,
            maxScore,
            percentage,
            result
          };
        } else {
          // Domestic scoring: driverCooperation(4) + vehicleCondition(3) + damageScore(3) = max 10 per trip
          // Calculate total scores by summing all evaluations (not averaging)
          const driverCooperationSum = vehicleEvaluations.reduce((sum: number, evaluation: any) =>
            sum + (evaluation.driverCooperation || 0), 0);
          const vehicleConditionSum = vehicleEvaluations.reduce((sum: number, evaluation: any) =>
            sum + (evaluation.vehicleCondition || 0), 0);

          // Calculate damage score with monthly logic (total, not average)
          let damageScoreSum = 0;
          const damageEvaluations = vehicleEvaluations.filter((evaluation: any) => evaluation.damageFound);
          const totalDamageValue = damageEvaluations.reduce((sum: number, evaluation: any) =>
            sum + (evaluation.damageValue || 0), 0);

          if (damageEvaluations.length > 1 || totalDamageValue > 300000) {
            // More than 1 damage incident or damage > 300,000: all trips get 0 for damage
            damageScoreSum = 0;
          } else if (damageEvaluations.length === 1 && totalDamageValue <= 300000) {
            // Exactly 1 damage incident with value <= 300,000: damaged trip gets 1, others get 3
            damageScoreSum = vehicleEvaluations.reduce((sum: number, evaluation: any) =>
              sum + (evaluation.damageFound ? 1 : 3), 0);
          } else {
            // No damage: all trips get 3
            damageScoreSum = 3 * tripCount;
          }

          // Max scores per trip
          const driverCooperationMaxPerTrip = 4;
          const vehicleConditionMaxPerTrip = 3;
          const damageScoreMaxPerTrip = 3;

          // Total max scores = max per trip * number of trips
          const driverCooperationMax = driverCooperationMaxPerTrip * tripCount;
          const vehicleConditionMax = vehicleConditionMaxPerTrip * tripCount;
          const damageScoreMax = damageScoreMaxPerTrip * tripCount;

          const totalScore = driverCooperationSum + vehicleConditionSum + damageScoreSum;
          const maxScore = driverCooperationMax + vehicleConditionMax + damageScoreMax;
          const percentage = maxScore > 0 ? parseFloat(((totalScore / maxScore) * 100).toFixed(2)) : 0;

          let result = '';
          if (percentage > 90) result = 'ผ่าน';
          else if (percentage >= 80) result = 'ต้องปรับปรุง';
          else result = 'ไม่ผ่าน';

          return {
            vehiclePlate,
            tripCount,
            // Domestic fields - now storing total sums
            driverCooperationTotal: driverCooperationSum,
            driverCooperationMax,
            vehicleConditionTotal: vehicleConditionSum,
            vehicleConditionMax,
            damageScoreTotal: damageScoreSum,
            damageScoreMax,
            // International fields (set to 0 for domestic)
            containerConditionTotal: 0,
            containerConditionMax: 0,
            punctualityTotal: 0,
            punctualityMax: 0,
            productDamageTotal: 0,
            productDamageMax: 0,
            // Common
            totalScore,
            maxScore,
            percentage,
            result
          };
        }
      });

      // Calculate summary
      const totalVehicles = reportItems.length;
      const totalTrips = reportItems.reduce((sum, item) => sum + item.tripCount, 0);
      const totalScoreSum = reportItems.reduce((sum, item) => sum + item.totalScore, 0);
      const totalMaxScoreSum = reportItems.reduce((sum, item) => sum + item.maxScore, 0);
      const averagePercentage = totalMaxScoreSum > 0 ? parseFloat(((totalScoreSum / totalMaxScoreSum) * 100).toFixed(2)) : 0;
      const averageScore = totalVehicles > 0 ? parseFloat((totalScoreSum / totalVehicles).toFixed(2)) : 0;

      const summary: ReportSummary = {
        contractor: selectedVendor || '',
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        data: reportItems.sort((a, b) => a.vehiclePlate.localeCompare(b.vehiclePlate)),
        totalVehicles,
        totalTrips,
        averageScore,
        averagePercentage,
        site: selectedSite,
        transportType: selectedTransportType
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

    setPdfLoading(true);
    try {
      await EvaluationReportPDFGenerator.printPDF({
        elementId: 'report-content',
        reportData,
        vendorOptions: getAvailableContractors(),
        selectedVendor,
        selectedVehiclePlate,
        selectedMonth,
        selectedYear,
        months,
        showSnackbar,
        includeDetails
      });
    } finally {
      setPdfLoading(false);
    }
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

    setPdfLoading(true);
    try {
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
        compressImages: true,
        includeDetails
      });
    } finally {
      setPdfLoading(false);
    }
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
            <Box sx={{ minWidth: 200 }}>
              <FormControl fullWidth size="small">
                <InputLabel>ประเภทการขนส่ง</InputLabel>
                <Select
                  value={selectedTransportType}
                  label="ประเภทการขนส่ง"
                  onChange={(e) => {
                    setSelectedTransportType(e.target.value);
                    // Reset dependent filters when transport type changes
                    setSelectedVendor('');
                    setSelectedVehiclePlate('');
                    setSelectedSite('');
                  }}
                >
                  <MenuItem value="domestic">🚚 ขนส่งในประเทศ</MenuItem>
                  <MenuItem value="international">🌐 ขนส่งต่างประเทศ</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ minWidth: 120 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Plant</InputLabel>
                <Select
                  value={selectedSite}
                  label="Plant"
                  onChange={(e) => setSelectedSite(e.target.value)}
                >
                  <MenuItem value="">ทั้งหมด</MenuItem>
                  <MenuItem value="PS">PS</MenuItem>
                  <MenuItem value="PSC">PSC</MenuItem>
                </Select>
              </FormControl>
            </Box>

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

            <Box sx={{ minWidth: 200 }}>
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
          {(selectedTransportType || selectedVendor || selectedVehiclePlate || selectedMonth || selectedYear !== new Date().getFullYear().toString()) && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderTopColor: 'grey.200' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                ตัวกรอง:
              </Typography>

              {selectedTransportType && (
                <Chip
                  label={selectedTransportType === 'international' ? '🌐 ขนส่งต่างประเทศ' : '🚚 ขนส่งในประเทศ'}
                  color={selectedTransportType === 'international' ? 'secondary' : 'primary'}
                  variant="filled"
                  size="small"
                />
              )}

              {selectedVendor && (
                <Chip
                  label={`ผู้รับจ้างช่วง: ${selectedVendor}`}
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
            {/* Report Header - Design from Image */}
            <Box sx={{ p: 2, pt: 1, position: 'relative' }}>
              {/* Form Number Box - Top Right */}
              <Box sx={{
                position: 'absolute',
                top: 10,
                right: 15,
                border: '1px solid black',
                px: 2,
                py: 0.5,
                fontSize: '0.8rem',
                textAlign: 'center',
                minWidth: 140
              }}>
                {selectedTransportType === 'international' ? 'FM-WH-042 (02)' : 'FM-WH-025 (03)'}
              </Box>

              {/* Title Section */}
              <Box sx={{ textAlign: 'center', mb: 1, mt: 5 }}>
                <Typography variant="h5" sx={{
                  fontWeight: 'bold',
                  fontFamily: 'Sarabun, Arial, sans-serif',
                  fontSize: '1.1rem'
                }}>
                  {selectedTransportType === 'international' ? 'รายงานสรุปประเมินรถขนส่งสินค้าต่างประเทศ' : 'รายงานสรุปประเมินรถขนส่งสินค้า'}
                </Typography>
              </Box>

              {/* Info Area: Site on left, Vendor/Date centered */}
              <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-start', mb: 1, px: 1 }}>
                {/* Site Selection Left - Fixed width for symmetry */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1, width: 100 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {reportData.site?.toUpperCase() === 'PS' ? <CheckBoxIcon sx={{ fontSize: 20 }} /> : <CheckBoxOutlineBlankIcon sx={{ fontSize: 20 }} />}
                    <Typography variant="body1" sx={{ fontFamily: 'Sarabun, Arial, sans-serif', fontSize: '0.8rem', fontWeight: 500 }}>PS</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {reportData.site?.toUpperCase() === 'PSC' ? <CheckBoxIcon sx={{ fontSize: 20 }} /> : <CheckBoxOutlineBlankIcon sx={{ fontSize: 20 }} />}
                    <Typography variant="body1" sx={{ fontFamily: 'Sarabun, Arial, sans-serif', fontSize: '0.8rem', fontWeight: 500 }}>PSC</Typography>
                  </Box>
                </Box>

                {/* Vendor and Date Center - Centered container but left-aligned text lines */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.5 }}>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body1" sx={{ mb: 0.5, fontFamily: 'Sarabun, Arial, sans-serif', fontSize: '0.875rem', fontWeight: 500 }}>
                      ชื่อผู้รับจ้างช่วง: <span style={{ fontWeight: 400, paddingLeft: '10px' }}>{reportData.contractor}</span>
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'Sarabun, Arial, sans-serif', fontSize: '0.875rem', fontWeight: 500 }}>
                      เดือน: <span style={{ fontWeight: 400, paddingLeft: '10px' }}>{months.find(m => m.value === selectedMonth)?.label}</span> &nbsp;&nbsp; ปี: <span style={{ fontWeight: 400, paddingLeft: '10px' }}>{parseInt(selectedYear) + 543}</span>
                    </Typography>
                  </Box>
                </Box>

                {/* Right Spacer - Fixed width to match left side for true centering */}
                <Box sx={{ width: 100 }}></Box>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box className="action-buttons" sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'flex-end', '@media print': { display: 'none' } }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeDetails}
                    onChange={(e) => setIncludeDetails(e.target.checked)}
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <Typography sx={{ fontSize: '0.85rem', fontFamily: 'Sarabun, Arial, sans-serif' }}>
                    แสดงรายละเอียดแต่ละเที่ยว
                  </Typography>
                }
                sx={{ mr: 2 }}
              />

              <Button
                variant="outlined"
                startIcon={pdfLoading ? <CircularProgress size={20} color="inherit" /> : <PrintIcon />}
                onClick={handlePrintPDF}
                disabled={pdfLoading}
                sx={{ borderRadius: 1 }}
              >
                {pdfLoading ? 'กำลังสร้าง...' : 'พิมพ์ PDF'}
              </Button>

              <Button
                variant="contained"
                startIcon={pdfLoading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                sx={{ borderRadius: 1 }}
              >
                {pdfLoading ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF'}
              </Button>
            </Box>

            {/* Report Table - Minimal Style */}
            <Box sx={{ m: 2, mb: 3 }}>
              <Table size="small" sx={{ '& .MuiTableCell-root': { border: '1px solid black', fontSize: '0.7rem' }, width: '100%', borderCollapse: 'collapse' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.65rem', p: 0.5, whiteSpace: 'nowrap' }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      ทะเบียนรถ
                    </TableCell>
                    <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.65rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      จำนวนเที่ยว
                    </TableCell>
                    {selectedTransportType === 'international' ? (
                      <>
                        <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.65rem', p: 0.5, minWidth: 80 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                          สภาพตู้คอนเทนเนอร์ (3)
                        </TableCell>
                        <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.65rem', p: 0.5, minWidth: 80 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                          การตรงต่อเวลา (3)
                        </TableCell>
                        <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.65rem', p: 0.5, minWidth: 80 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                          ความเสียหายของสินค้า (4)
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.65rem', p: 0.5, minWidth: 80 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                          (ก) ความร่วมมือคนขับ (4)
                        </TableCell>
                        <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.65rem', p: 0.5, minWidth: 80 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                          (ข) สภาพความพร้อมของรถ (3)
                        </TableCell>
                        <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.65rem', p: 0.5, minWidth: 80 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                          (ค) ความเสียหายของพัสดุ (3)
                        </TableCell>
                      </>
                    )}
                    <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.65rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      คะแนนรวม
                    </TableCell>
                    <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.65rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      คะแนนเต็ม
                    </TableCell>
                    <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.65rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      เปอร์เซ็นต์
                    </TableCell>
                    <TableCell sx={{ fontWeight: '500', textAlign: 'center', fontSize: '0.65rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
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
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        {item.tripCount}
                      </TableCell>
                      {selectedTransportType === 'international' ? (
                        <>
                          <TableCell sx={{ textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                            {item.containerConditionTotal}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                            {item.punctualityTotal}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                            {item.productDamageTotal}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell sx={{ textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                            {item.driverCooperationTotal}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                            {item.vehicleConditionTotal}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                            {item.damageScoreTotal}
                          </TableCell>
                        </>
                      )}
                      <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        {item.totalScore}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        {item.maxScore}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        {item.percentage}%
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.7rem', p: 0.5 }} style={{ fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        {item.result}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Box sx={{ p: 2, borderTop: '1px solid black' }}>
              <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 1, md: 3 }
              }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.7rem', fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      เปอร์เซ็นต์คะแนนที่ได้ / เดือน =
                    </Typography>
                    <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontSize: '0.7rem', fontFamily: 'Sarabun, Arial, sans-serif', pb: 0.1 }}>
                        คะแนนรวม x 100
                      </Typography>
                      <Box sx={{ width: '100%', height: '1px', bgcolor: 'black' }} />
                      <Typography variant="body2" sx={{ fontSize: '0.7rem', fontFamily: 'Sarabun, Arial, sans-serif', pt: 0.1 }}>
                        คะแนนเต็ม
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.7rem', fontFamily: 'Sarabun, Arial, sans-serif' }}>
                    คะแนนเต็มต่อเที่ยว = 10
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex' }}>
                      <Typography variant="body2" sx={{ fontSize: '0.7rem', fontFamily: 'Sarabun, Arial, sans-serif', width: '140px' }}>
                        คะแนนมากกว่า 90% ขึ้นไป
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.7rem', fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        = &nbsp;&nbsp; ผ่าน
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex' }}>
                      <Typography variant="body2" sx={{ fontSize: '0.7rem', fontFamily: 'Sarabun, Arial, sans-serif', width: '140px' }}>
                        คะแนน 80-90%
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.7rem', fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        = &nbsp;&nbsp; ต้องปรับปรุง
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex' }}>
                      <Typography variant="body2" sx={{ fontSize: '0.7rem', fontFamily: 'Sarabun, Arial, sans-serif', width: '140px' }}>
                        คะแนนน้อยกว่า 80%
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.7rem', fontFamily: 'Sarabun, Arial, sans-serif' }}>
                        = &nbsp;&nbsp; ไม่ผ่าน
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>


            {/* Summary/Footer Section from Image */}
            <Box sx={{ p: 2, pt: 3, pb: 4 }}>

              {/* Remarks and Signature Section for Domestic - Two Column Layout */}
              {selectedTransportType === 'domestic' && (
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 4,
                  px: 2
                }}>
                  {/* Left Column - หมายเหตุ (ก, ข, ค) - 60% */}
                  <Box sx={{ flex: '0 0 60%' }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold', fontFamily: 'Sarabun, Arial, sans-serif', fontSize: '0.75rem' }}>
                      หมายเหตุ:
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.65rem', mb: 1, fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      (ก) การให้ความร่วมมือของคนรถ หมายถึง มารยาทของคนขับรถ , คนขับรถให้ความร่วมมือในการคลุมผ้าใบ , การลงพัสดุ , ในกรณีที่คนขับรถให้ความร่วมมือดีมาก ให้คะแนน = 4 , ดี = 3 , ปานกลาง = 2 , ไม่ดี = 1
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.65rem', mb: 1, fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      (ข) สภาพความพร้อมของรถขนส่ง หมายถึง รถสะอาด ไม่พบรอยรั่ว , พื้นเรียบ ไม่มีรองฝา หรือกระดานกั้นฝา ในกรณีที่รถสะอาดตามรายละเอียดข้างต้น = 3 แต่ในกรณีที่รถสกปรกจะหักคะแนน = 0 และขอให้นำรถไปทำการปรับปรุงทันที
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.65rem', mb: 1, fontFamily: 'Sarabun, Arial, sans-serif' }}>
                      (ค) ความเสียหายของพัสดุ กรณีที่รถขนส่งพัสดุเกิดอุบัติเหตุที่เป็นสาเหตุของพัสดุเสียหาย ในกรณีที่ไม่พบปัญหา ให้คะแนน = 3 คะแนน , กรณีที่พบปัญหา 1 ครั้งใน 1 เดือน ค่าเสียหายไม่เกิน 300,000 บาท ให้ 1 คะแนน กรณีที่พบปัญหาข้างต้นมากกว่า 1 ครั้ง/เดือน หรือมีความเสียหายมากกว่า 300,000 บาท ให้ = 0 คะแนน
                    </Typography>
                  </Box>

                  {/* Right Column - ลายเซ็น (จัดทำโดย, ตรวจสอบโดย, รับทราบโดย) - 40% */}
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    flex: '0 0 40%'
                  }}>
                    {/* จัดทำโดย */}
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body1" fontWeight="bold" sx={{ mb: 3, fontFamily: 'Sarabun, Arial, sans-serif', fontSize: '0.85rem' }}>
                        จัดทำโดย
                      </Typography>
                      <Box sx={{ borderBottom: '1px solid black', width: '100%' }}></Box>
                    </Box>
                    {/* ตรวจสอบโดย */}
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body1" fontWeight="bold" sx={{ mb: 3, fontFamily: 'Sarabun, Arial, sans-serif', fontSize: '0.85rem' }}>
                        ตรวจสอบโดย
                      </Typography>
                      <Box sx={{ borderBottom: '1px solid black', width: '100%' }}></Box>
                    </Box>
                    {/* รับทราบโดย */}
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body1" fontWeight="bold" sx={{ mb: 3, fontFamily: 'Sarabun, Arial, sans-serif', fontSize: '0.85rem' }}>
                        รับทราบโดย
                      </Typography>
                      <Box sx={{ borderBottom: '1px solid black', width: '100%' }}></Box>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Signature Section for International only */}
              {selectedTransportType === 'international' && (
                <Box sx={{
                  px: 2,
                  mt: 4,
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 10,
                  justifyContent: 'flex-start'
                }}>
                  {/* จัดทำโดย */}
                  <Box sx={{ textAlign: 'left', width: '250px' }}>
                    <Typography variant="body1" fontWeight="bold" sx={{ mb: 6, fontFamily: 'Sarabun, Arial, sans-serif', fontSize: '0.85rem' }}>
                      จัดทำโดย
                    </Typography>
                    <Box sx={{ borderBottom: '1px solid black', width: '100%' }}></Box>
                  </Box>
                </Box>
              )}
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

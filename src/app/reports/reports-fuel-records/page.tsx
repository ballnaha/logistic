'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TableFooter,
  Autocomplete,
  TextField
} from '@mui/material';
import {
  LocalGasStation as FuelIcon,
  DirectionsCar as CarIcon,
  CalendarToday as CalendarIcon,
  Clear as ClearIcon,
  ArrowBack as BackIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  Print as PrintIcon,
  Person as PersonIcon
} from '@mui/icons-material';

import { th } from 'date-fns/locale';
import { format } from 'date-fns';

import Layout from '../../components/Layout';
import DataTablePagination from '../../../components/DataTablePagination';
import { useSnackbar } from '../../../contexts/SnackbarContext';

// Production-ready image URL helper function
const getImageUrl = (imagePath: string) => {
  if (!imagePath) return '';
  
  // If already a complete URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // For production safety, use /api/serve-image endpoint
  if (imagePath.startsWith('/uploads/') || imagePath.includes('/uploads/')) {
    const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `/api/serve-image?path=${encodeURIComponent(cleanPath)}`;
  }
  
  // For other paths, ensure they start with /
  return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
};

// Vehicle type mapping function
const getVehicleTypeLabel = (vehicleType: string): string => {
  switch (vehicleType?.toLowerCase()) {
    case 'truck':
      return 'รถบรรทุก';
    case 'pickup':
      return 'รถกระบะ';
    case 'forklift':
      return 'โฟล์คลิฟท์';
    default:
      return vehicleType || '';
  }
};

const getVehicleTypeIcon = (vehicleType: string) => {
  switch (vehicleType?.toLowerCase()) {
    case 'truck':
      return '/images/icon-truck.png';
    case 'pickup':
      return '/images/icon-pickup.png';
    case 'forklift':
      return '/images/icon-forklift.png';
    default:
      return '/images/icon-truck.png';
  }
};

const getVehicleTypeText = (vehicleType: string) => {
  switch (vehicleType?.toLowerCase()) {
    case 'truck':
      return 'รถบรรทุก';
    case 'pickup':
      return 'รถกระบะ';
    case 'forklift':
      return 'รถโฟล์คลิฟท์';
    default:
      return vehicleType;
  }
};

// Interfaces
interface Driver {
  id: number;
  driverName: string;
  driverImage?: string;
  driverLicense: string;
}

interface Vehicle {
  id: number;
  licensePlate: string;
  brand: string;
  model?: string;
  vehicleType: string;
  carImage?: string;
  fuelTank?: number;
  fuelConsume?: number;
  fuelConsumeMth?: number;
  isActive?: boolean | number; // สถานะการใช้งานรถ
  // New driver relations
  mainDriver?: Driver;
  backupDriver?: Driver;
  // Legacy fields (may still exist in some data)
  driverName?: string;
  driverImage?: string;
  backupDriverName?: string;
  backupDriverImage?: string;
}

interface FuelRecord {
  id: number;
  vehicleId: number;
  fuelDate: string;
  fuelAmount: number;
  odometer?: number;
  remark?: string;
  driverType?: string;
  driverName?: string;
  driverLicense?: string; // หมายเลขใบขับขี่
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  vehicle: Vehicle;
}

interface FilterState {
  vehicleId: string;
  month: string;
  year: string;
}

export default function FuelRecordsReport() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showSnackbar } = useSnackbar();
  const minimalRef = useRef<HTMLDivElement | null>(null);

  // State
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]); // รถที่มีข้อมูลในเดือนที่เลือก
  const [loadingVehicles, setLoadingVehicles] = useState(false); // loading สำหรับ filter รถ
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<FuelRecord[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [driverImages, setDriverImages] = useState<Map<string, string>>(new Map());
  const [filters, setFilters] = useState<FilterState>({
    vehicleId: '',
    month: (new Date().getMonth() + 1).toString(), // เดือนปัจจุบัน (1-12)
    year: new Date().getFullYear().toString()
  });

  // Remove driver list state - not needed anymore
  // const [drivers, setDrivers] = useState<string[]>([]);

  // Summary data
  const [summary, setSummary] = useState({
    totalRecords: 0,
    totalFuelAmount: 0,
    averageFuelPerRecord: 0,
    vehiclesCount: 0
  });

  // Months data
  const months = [
    { value: '', label: 'ทั้งหมด' },
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
    { value: '12', label: 'ธันวาคม' }
  ];

  // Get available years (starting from current year descending to 2025)
  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2025; year--) {
      years.push(year);
    }
    return years;
  };

  // Driver image management functions
  const getDriverImageByLicense = async (driverLicense: string): Promise<string | null> => {
    if (!driverLicense || driverLicense.trim() === '') return null;
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Fetching driver image for license: ${driverLicense}`);
      }
      
      const controller = new AbortController();
      const timeout = process.env.NODE_ENV === 'production' ? 5000 : 3000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(`/api/drivers/by-license/${encodeURIComponent(driverLicense.trim())}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NODE_ENV === 'production' && {
            'Cache-Control': 'max-age=300'
          })
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`❌ Driver API returned ${response.status} for license: ${driverLicense}`);
        }
        return null;
      }
      
      const data = await response.json();
      const image = data.driver?.driverImage || null;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Driver image result for ${driverLicense}:`, image);
      }
      
      return image;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⏰ Driver image lookup timed out for license: ${driverLicense}`);
        }
      } else {
        console.error(`❌ Error fetching driver by license ${driverLicense}:`, error);
      }
      return null;
    }
  };

  // Get cached driver image by license
  const getCachedDriverImage = (driverLicense?: string): string | null => {
    if (!driverLicense || !driverLicense.trim()) return null;
    const cached = driverImages.get(driverLicense.trim());
    return cached === 'loading' ? null : cached || null;
  };

  // Load driver images for fuel records
  const loadDriverImages = async (records: FuelRecord[]) => {
    const uniqueLicenses = new Set<string>();
    
    records.forEach(record => {
      if (record.driverLicense && record.driverLicense.trim()) {
        uniqueLicenses.add(record.driverLicense.trim());
      }
    });

    // Always log in development, only basic info in production
    if (process.env.NODE_ENV === 'development') {
      console.log(`📸 [Reports] Loading images for ${uniqueLicenses.size} unique licenses:`, Array.from(uniqueLicenses));
      console.log(`📋 [Reports] Sample records with driverLicense:`, 
        records.slice(0, 3).map(r => ({ 
          id: r.id, 
          driverLicense: r.driverLicense, 
          driverName: r.driverName 
        }))
      );
    } else {
      console.log(`📸 [Reports] Loading ${uniqueLicenses.size} driver images`);
    }

    const newImages = new Map(driverImages);
    const loadPromises: Promise<void>[] = [];

    uniqueLicenses.forEach(license => {
      if (!newImages.has(license)) {
        newImages.set(license, 'loading');
        
        const loadPromise = getDriverImageByLicense(license).then(image => {
          setDriverImages(prev => {
            const updated = new Map(prev);
            if (image) {
              updated.set(license, image);
            } else {
              updated.delete(license);
            }
            return updated;
          });
        });
        loadPromises.push(loadPromise);
      }
    });

    if (loadPromises.length > 0) {
      setDriverImages(newImages);
      await Promise.all(loadPromises);
    }
  };

  // Load initial data
  useEffect(() => {
    loadVehicles();
  }, []);

  // Reload data when filters change
  useEffect(() => {
    loadFuelRecords();
  }, [filters]);

  // Load available vehicles when month or year changes
  useEffect(() => {
    if (vehicles.length > 0 && filters.month && filters.year) {
      fetchAvailableVehicles();
    } else {
      setAvailableVehicles([]);
    }
  }, [filters.month, filters.year, vehicles.length]);

  const loadVehicles = async () => {
    try {
      // ดึงรถทุกคัน (รวม inactive) เพื่อให้ filter แสดงครบ
      const response = await fetch('/api/vehicles?status=all&limit=1000');
      const result = await response.json();

      if (response.ok) {
        const vehicleList = result.vehicles || result.data || [];
        console.log(`📋 [Vehicles] Loaded ${vehicleList.length} vehicles (including inactive)`);
        setVehicles(vehicleList);
      } else {
        showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลรถ', 'error');
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลรถ', 'error');
    }
  };

  const loadFuelRecords = async () => {
    try {
      setLoading(true);
      
      // Build query parameters based on filters
      const params = new URLSearchParams();
      
      // Add vehicle filter if selected
      if (filters.vehicleId) {
        params.append('vehicleId', filters.vehicleId);
      }
      
      // Add date range filter based on year and month
      if (filters.year) {
        const year = parseInt(filters.year);
        let startDate: Date;
        let endDate: Date;
        
        if (filters.month) {
          // Specific month and year
          const month = parseInt(filters.month);
          startDate = new Date(year, month - 1, 1); // First day of month
          endDate = new Date(year, month, 0); // Last day of month
        } else {
          // Whole year
          startDate = new Date(year, 0, 1); // Jan 1
          endDate = new Date(year, 11, 31); // Dec 31
        }
        
        // Format as YYYY-MM-DD
        const formatDate = (date: Date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        };
        
        params.append('startDate', formatDate(startDate));
        params.append('endDate', formatDate(endDate));
      }
      
      // First, get the first page to know the total count
      const firstResponse = await fetch(`/api/fuel-records?page=1&limit=100&${params.toString()}`);
      const firstResult = await firstResponse.json();

      if (firstResponse.ok) {
        const allRecords: FuelRecord[] = [...(firstResult.data || [])];
        const total = firstResult.pagination?.total || 0;
        const totalPages = Math.ceil(total / 100);

        console.log(`📋 [Reports] Filtered fuel records: ${total}, fetching ${totalPages} pages...`);

        // Fetch remaining pages if there are more
        if (totalPages > 1) {
          const remainingPages = [];
          for (let page = 2; page <= totalPages; page++) {
            remainingPages.push(
              fetch(`/api/fuel-records?page=${page}&limit=100&${params.toString()}`)
                .then(res => res.json())
                .then(result => result.data || [])
            );
          }

          // Wait for all remaining pages
          const remainingRecords = await Promise.all(remainingPages);
          remainingRecords.forEach(pageRecords => {
            allRecords.push(...pageRecords);
          });
        }

        console.log(`📋 [Reports] Successfully loaded ${allRecords.length} fuel records`);
        setFuelRecords(allRecords);
        setFilteredRecords(allRecords); // No need to filter again, API already filtered
        
        // Calculate summary directly from API results
        const totalFuelAmount = allRecords.reduce((sum, record) => sum + parseFloat(record.fuelAmount.toString()), 0);
        const uniqueVehicles = new Set(allRecords.map(record => record.vehicleId));

        setSummary({
          totalRecords: allRecords.length,
          totalFuelAmount,
          averageFuelPerRecord: allRecords.length > 0 ? totalFuelAmount / allRecords.length : 0,
          vehiclesCount: uniqueVehicles.size
        });
        
        // Debug: Show sample records with driverLicense field
        if (process.env.NODE_ENV === 'development') {
          console.log(`📋 [Reports] Sample records:`, 
            allRecords.slice(0, 2).map((r: FuelRecord) => ({
              id: r.id,
              driverLicense: r.driverLicense,
              driverName: r.driverName,
              driverType: r.driverType,
              fuelDate: r.fuelDate
            }))
          );
        }
        
        // Load driver images for all records
        if (allRecords.length > 0) {
          loadDriverImages(allRecords);
        }
      } else {
        showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลการเติมน้ำมัน', 'error');
      }
    } catch (error) {
      console.error('Error loading fuel records:', error);
      showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลการเติมน้ำมัน', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ดึงรายการรถที่มีข้อมูลในเดือน/ปีที่เลือก
  const fetchAvailableVehicles = async () => {
    if (!filters.month || !filters.year) {
      setAvailableVehicles([]);
      return;
    }

    try {
      setLoadingVehicles(true);
      
      // Calculate month range
      const yearNum = parseInt(filters.year);
      let startDate, endDate;
      
      if (filters.month === '') {
        // All months in the selected year
        startDate = new Date(yearNum, 0, 1); // January 1st
        endDate = new Date(yearNum, 11, 31); // December 31st
      } else {
        // Specific month
        const monthNum = parseInt(filters.month);
        startDate = new Date(yearNum, monthNum - 1, 1);
        endDate = new Date(yearNum, monthNum, 0); // Last day of the month
      }

      const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      const params = new URLSearchParams();
      params.append('startDate', formatDate(startDate));
      params.append('endDate', formatDate(endDate));

      // ดึงหน้าแรกเพื่อดูจำนวนทั้งหมด
      const firstResponse = await fetch(`/api/fuel-records?page=1&limit=100&${params.toString()}`);
      const firstResult = await firstResponse.json();
      
      if (firstResponse.ok) {
        const allRecords: any[] = [...(firstResult.data || [])];
        const total = firstResult.pagination?.total || 0;
        const totalPages = Math.ceil(total / 100);

        console.log(`📋 [Available Vehicles] Total records: ${total}, fetching ${totalPages} pages...`);

        // ดึงหน้าที่เหลือถ้ามีมากกว่า 1 หน้า
        if (totalPages > 1) {
          const remainingPages = [];
          for (let page = 2; page <= totalPages; page++) {
            remainingPages.push(
              fetch(`/api/fuel-records?page=${page}&limit=100&${params.toString()}`)
                .then(res => res.json())
                .then(result => result.data || [])
            );
          }

          const remainingRecords = await Promise.all(remainingPages);
          remainingRecords.forEach(pageRecords => {
            allRecords.push(...pageRecords);
          });
        }

        // Extract unique vehicle IDs from ALL fuel records
        const vehicleIds = new Set<number>();
        allRecords.forEach((record: any) => {
          if (record.vehicleId) {
            vehicleIds.add(record.vehicleId);
          }
        });

        // Filter vehicles that have fuel records in this period
        const filtered = vehicles.filter(v => vehicleIds.has(v.id));
        
        console.log(`📋 [Available Vehicles] Found ${filtered.length} vehicles with fuel records (from ${allRecords.length} records)`);
        console.log(`📋 [Available Vehicles] Vehicle IDs with records:`, Array.from(vehicleIds));
        setAvailableVehicles(filtered);
      } else {
        setAvailableVehicles([]);
      }
    } catch (error) {
      console.error('Error fetching available vehicles:', error);
      setAvailableVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      vehicleId: '',
      month: '', // Reset to 'ทุกเดือน'
      year: new Date().getFullYear().toString()
    });
    setPage(0); // Reset page when clearing filters
  };

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Get paginated records
  const paginatedRecords = filteredRecords.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const exportToCSV = () => {
    const headers = [
      'วันที่เติมน้ำมัน',
      'ทะเบียนรถ',
      'ยี่ห้อ',
      'รุ่น',
      'ประเภทรถ',
      'คนขับ',
      'ประเภทคนขับ',
      'ปริมาณน้ำมัน (ลิตร)',
      'เลขไมล์',
      'หมายเหตุ'
    ];

    const csvData = filteredRecords.map(record => [
      format(new Date(record.fuelDate), 'dd/MM/yyyy'),
      record.vehicle.licensePlate || '-',
      record.vehicle.brand,
      record.vehicle.model || '-',
      getVehicleTypeText(record.vehicle.vehicleType),
      record.driverName || record.vehicle.driverName || '-',
      record.driverType === 'backup' ? 'คนขับรอง' : record.driverType === 'other' ? 'คนขับแทน' : 'คนขับหลัก',
      record.fuelAmount.toString(),
      record.odometer?.toString() || '-',
      record.remark || '-'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fuel-records-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSnackbar('ส่งออกรายงานสำเร็จ', 'success');
  };

  // Main handler for Download button (force file download)
  const handleDownloadPDF = async () => {
    if (!filteredRecords || filteredRecords.length === 0) {
      showSnackbar('กรุณาเลือกข้อมูลและตรวจสอบว่ามีข้อมูลการเติมน้ำมัน', 'warning');
      return;
    }
    if (!filters.vehicleId) {
      await exportAllVehiclesPDF({ mode: 'download' });
    } else {
      await exportSingleVehiclePDF({ mode: 'download' });
    }
  };

  // Export PDF สำหรับรถคันเดียว
  interface ExportModeOptions { mode?: 'download' | 'preview' | 'print'; }

  const exportSingleVehiclePDF = async ({ mode = 'download' }: ExportModeOptions = {}) => {
    try {
      setIsExporting(true);

      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      // ใช้เทมเพลต HTML ที่ซ่อนอยู่เพื่อให้ render ภาษาไทยถูกต้อง
      const sourceEl = minimalRef.current;
      if (!sourceEl) {
        showSnackbar('ไม่พบเทมเพลตสำหรับสร้าง PDF', 'error');
        return;
      }

      // ทำให้มองเห็นชั่วคราวนอกหน้าจอ เพื่อให้ layout คำนวณได้ถูกต้อง
      const prevVisibility = sourceEl.style.visibility;
      const prevPosition = sourceEl.style.position;
      const prevLeft = sourceEl.style.left;
      const prevTop = sourceEl.style.top;
      const prevWidth = sourceEl.style.width;

      sourceEl.style.visibility = 'visible';
      sourceEl.style.position = 'absolute';
      sourceEl.style.left = '-9999px';
      sourceEl.style.top = '0';
      sourceEl.style.width = '900px';

      // รอ font face
      await document.fonts.ready;

      const canvas = await html2canvas(sourceEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      // คืนค่า style เดิม
      sourceEl.style.visibility = prevVisibility;
      sourceEl.style.position = prevPosition;
      sourceEl.style.left = prevLeft;
      sourceEl.style.top = prevTop;
      sourceEl.style.width = prevWidth;

      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      const contentHeight = pageHeight - margin * 2 - 12; // เผื่อ footer

      // คำนวณความสูงของ header และ summary (ส่วนบน)
      const headerSectionHeight = 120; // ประมาณความสูงของ header + summary (ในหน่วย mm)
      const tableHeaderHeight = 25; // ความสูงของ header ตาราง (ในหน่วย mm)
      
      const totalPages = Math.ceil(imgHeight / contentHeight);
      let renderedHeight = 0;

      for (let page = 1; page <= totalPages; page++) {
        if (page > 1) doc.addPage();

        const sX = 0;
        const sY = (renderedHeight / imgHeight) * canvas.height;
        const sW = canvas.width;
        const sH = Math.min((contentHeight / imgHeight) * canvas.height, canvas.height - sY);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = sW;
        pageCanvas.height = sH;
        const pctx = pageCanvas.getContext('2d');
        if (pctx) {
          pctx.drawImage(canvas, sX, sY, sW, sH, 0, 0, sW, sH);
        }
        const pageImg = pageCanvas.toDataURL('image/png');
        const drawHeight = (sH * contentWidth) / sW;

        // เพิ่ม table header ในหน้าที่ 2 เป็นต้นไป
        if (page > 1) {
          // สร้าง header ของตารางเป็น HTML แล้วแปลงเป็นรูปภาพ (เหมือนหน้าแรกทุกอย่าง)
          const headerHTML = `
            <div style="font-family: 'Sarabun', Arial, sans-serif; width: 860px; background: white;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="background: #fff;">
                    <th style="border: 1px solid #000; padding: 3px; text-align: center; color: black; font-weight: 700; width: 12%; background: #fff; line-height: 1.2;">วันที่เติม</th>
                    <th style="border: 1px solid #000; padding: 3px; text-align: center; color: black; font-weight: 700; width: 15%; background: #fff; line-height: 1.2;">คนขับ</th>
                    <th style="border: 1px solid #000; padding: 3px; text-align: center; color: black; font-weight: 700; width: 12%; background: #fff; line-height: 1.2;">ปริมาณ (ลิตร)</th>
                    <th style="border: 1px solid #000; padding: 3px; text-align: center; color: black; font-weight: 700; width: 10%; background: #fff; line-height: 1.2;">เลขไมล์</th>
                    <th style="border: 1px solid #000; padding: 3px; text-align: center; color: black; font-weight: 700; width: 18%; background: #fff; line-height: 1.2;">หมายเหตุ</th>
                  </tr>
                </thead>
              </table>
            </div>
          `;
          
          const headerDiv = document.createElement('div');
          headerDiv.innerHTML = headerHTML;
          headerDiv.style.position = 'absolute';
          headerDiv.style.left = '-9999px';
          headerDiv.style.top = '0';
          document.body.appendChild(headerDiv);
          
          const headerCanvas = await html2canvas(headerDiv, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
          });
          
          document.body.removeChild(headerDiv);
          
          const headerImg = headerCanvas.toDataURL('image/png');
          const headerHeight = (headerCanvas.height * contentWidth) / headerCanvas.width;
          
          // วาด header ก่อน
          doc.addImage(headerImg, 'PNG', margin, margin, contentWidth, headerHeight);
          
          // วาดข้อมูลตารางต่อจาก header
          doc.addImage(pageImg, 'PNG', margin, margin + headerHeight, contentWidth, drawHeight);
        } else {
          // หน้าแรกไม่ต้องเพิ่ม header (มีอยู่แล้วในรูปภาพ)
          doc.addImage(pageImg, 'PNG', margin, margin, contentWidth, drawHeight);
        }

        // footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Print Date: ${new Date().toLocaleString('th-TH')}`, margin, pageHeight - 6);
        doc.text(`Page ${page}/${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });

        renderedHeight += contentHeight;
      }

      const today = new Date();
      const yearThai = today.getFullYear() + 543;
      const vehicle = vehicles.find(v => v.id.toString() === filters.vehicleId);
      const license = vehicle?.licensePlate || 'vehicle';
      const monthStr = filters.month.padStart(2, '0');
      const fileName = `fuel-records-${license}-${yearThai}-${monthStr}.pdf`;

      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      if (mode === 'preview') {
        const previewWindow = window.open(blobUrl, '_blank');
        if (previewWindow) {
          previewWindow.document.title = fileName;
          showSnackbar('เปิด PDF ในหน้าต่างใหม่แล้ว', 'success');
        } else {
          showSnackbar('กรุณาอนุญาต popup เพื่อแสดง PDF', 'warning');
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      } else if (mode === 'print') {
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.document.title = fileName;
          printWindow.onload = () => {
            try { printWindow.print(); } catch (err) { console.error(err); }
          };
          showSnackbar('เปิด PDF สำหรับพิมพ์แล้ว', 'success');
        } else {
          showSnackbar('กรุณาอนุญาต popup เพื่อพิมพ์ PDF', 'warning');
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      } else {
        // Trigger file download (browser may show save dialog if user enabled that setting)
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        showSnackbar('ดาวน์โหลดไฟล์ PDF แล้ว', 'success');
      }
    } catch (e) {
      console.error(e);
      showSnackbar('เกิดข้อผิดพลาดในการสร้าง PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Export PDF สำหรับรถทั้งหมด (สรุป + รายละเอียดแต่ละคัน)
  const exportAllVehiclesPDF = async ({ mode = 'download' }: ExportModeOptions = {}) => {
    try {
      setIsExporting(true);

      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      // จัดกลุ่มข้อมูลตามรถ
      const vehicleGroups = filteredRecords.reduce((groups, record) => {
        const vehicleId = record.vehicleId;
        if (!groups[vehicleId]) {
          groups[vehicleId] = {
            vehicle: record.vehicle,
            records: []
          };
        }
        groups[vehicleId].records.push(record);
        return groups;
      }, {} as Record<number, { vehicle: Vehicle; records: FuelRecord[] }>);

      const vehicles = Object.values(vehicleGroups);
      const monthName = months.find(m => m.value === filters.month)?.label || filters.month;
      const yearDisplay = parseInt(filters.year) + 543;

      // คำนวณปริมาณรวมทั้งหมดใหม่เพื่อให้แน่ใจว่าถูกต้อง
      const grandTotalFuel = vehicles.reduce((total, group) => {
        const groupTotal = group.records.reduce((sum, r) => sum + (parseFloat(r.fuelAmount.toString()) || 0), 0);
        return total + groupTotal;
      }, 0);

      // สร้าง HTML template แบบไดนามิก
      const createVehicleSummaryHTML = () => {
        return `
          <div style="font-family: 'Sarabun', Arial, sans-serif; width: 900px; background: white; padding: 20px; color: black;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: black;">รายงานการเติมน้ำมัน - สรุปทั้งหมด</h2>
              <p style="font-size: 16px; margin: 10px 0; color: black;">${monthName} ${yearDisplay}</p>
            </div>
            
            <div style="margin-bottom: 25px;">
              <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 10px; color: black;">สรุปรวมทั้งหมด</h3>
              <div style="display: flex; gap: 30px; font-size: 14px; color: black;">
                <span>จำนวนรถ: ${vehicles.length} คัน</span>
                <span>จำนวนครั้งเติม: ${summary.totalRecords} ครั้ง</span>
                <span>ปริมาณรวม: ${grandTotalFuel.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลิตร</span>
              </div>
            </div>

            <div>
              <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 15px; color: black;">สรุปแต่ละคัน</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="border: 1px solid #000; padding: 8px; text-align: center; color: black;">ลำดับ</th>
                    <th style="border: 1px solid #000; padding: 8px; text-align: left; color: black;">ทะเบียนรถ</th>
                    <th style="border: 1px solid #000; padding: 8px; text-align: left; color: black;">ยี่ห้อ รุ่น</th>
                    <th style="border: 1px solid #000; padding: 8px; text-align: center; color: black;">ประเภท</th>
                    <th style="border: 1px solid #000; padding: 8px; text-align: center; color: black;">จำนวนครั้ง</th>
                    <th style="border: 1px solid #000; padding: 8px; text-align: center; color: black;">ปริมาณรวม (ลิตร)</th>
                    <th style="border: 1px solid #000; padding: 8px; text-align: center; color: black;">เฉลี่ย (ลิตร/ครั้ง)</th>
                  </tr>
                </thead>
                <tbody>
                  ${vehicles.map((group, index) => {
                    const vehicleTotal = group.records.reduce((sum, r) => sum + (parseFloat(r.fuelAmount.toString()) || 0), 0);
                    const vehicleAvg = vehicleTotal / group.records.length;
                    return `
                      <tr>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">${index + 1}</td>
                        <td style="border: 1px solid #000; padding: 6px; color: black;">${group.vehicle.licensePlate}</td>
                        <td style="border: 1px solid #000; padding: 6px; color: black;">${group.vehicle.brand} ${group.vehicle.model || ''}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">${getVehicleTypeLabel(group.vehicle.vehicleType)}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">${group.records.length}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">${vehicleTotal.toLocaleString('th-TH', { maximumFractionDigits: 2 })}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">${vehicleAvg.toLocaleString('th-TH', { maximumFractionDigits: 2 })}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      };

      // สร้าง HTML รวมสำหรับทุกรถ
      const createAllVehicleDetailsHTML = () => {
        return `
          <div style="font-family: 'Sarabun', Arial, sans-serif; width: 900px; background: white; padding: 20px; color: black;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: black;">รายละเอียดการเติมน้ำมันทั้งหมด</h2>
              <p style="font-size: 14px; margin: 8px 0; color: black;">${monthName} ${yearDisplay}</p>
            </div>
            
            ${vehicles.map((group, vehicleIndex) => {
              const vehicleTotal = group.records.reduce((sum, r) => sum + (parseFloat(r.fuelAmount.toString()) || 0), 0);
              return `
                <div class="vehicle-section" style="margin-bottom: 30px; break-inside: avoid;">
                  <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: black; background: #f0f0f0; padding: 8px;">
                    ${group.vehicle.licensePlate} - ${group.vehicle.brand} ${group.vehicle.model || ''} (${getVehicleTypeLabel(group.vehicle.vehicleType)})
                  </h3>
                  
                  <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 15px;">
                    <thead>
                      <tr style="background: #f5f5f5;">
                        <th style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">วันที่เติม</th>
                        <th style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">คนขับ</th>
                        <th style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">ปริมาณ (ลิตร)</th>
                        <th style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">เลขไมล์</th>
                        <th style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${[...group.records].sort((a, b) => new Date(a.fuelDate).getTime() - new Date(b.fuelDate).getTime()).map(record => `
                        <tr>
                          <td style="border: 1px solid #000; padding: 4px; text-align: center; color: black;">${format(new Date(record.fuelDate), 'dd/MM/yyyy')}</td>
                          <td style="border: 1px solid #000; padding: 4px; color: black;">${record.driverName || record.vehicle.driverName || '-'}</td>
                          <td style="border: 1px solid #000; padding: 4px; text-align: center; color: black;">${(parseFloat(record.fuelAmount.toString()) || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</td>
                          <td style="border: 1px solid #000; padding: 4px; text-align: center; color: black;">${record.odometer ? record.odometer.toLocaleString('th-TH') : '-'}</td>
                          <td style="border: 1px solid #000; padding: 4px; color: black;">${record.remark || '-'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                    <tfoot>
                      <tr style="background: #f0f0f0;">
                        <td colspan="2" style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: 700; color: black;">รวมรถคันนี้:</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: 700; color: black;">${vehicleTotal.toLocaleString('th-TH', { maximumFractionDigits: 2 })}</td>
                        <td colspan="2" style="border: 1px solid #000; padding: 6px; color: black;"></td>
                      </tr>
                    </tfoot>
                  </table>
                  
                  <div style="font-size: 12px; color: black; margin-bottom: 10px;">
                    <strong>สรุปรถคันนี้:</strong> ${group.records.length} ครั้ง | รวม ${vehicleTotal.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลิตร | เฉลี่ย ${(vehicleTotal / group.records.length).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลิตร/ครั้ง
                  </div>
                </div>
              `;
            }).join('')}
            
            <div style="margin-top: 20px; padding: 10px; background: #f5f5f5; border: 1px solid #ccc;">
              <div style="font-size: 14px; font-weight: 700; color: black; text-align: center;">
                สรุปรวมทั้งหมด: ${vehicles.length} คัน | ${summary.totalRecords} ครั้ง | ${grandTotalFuel.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลิตร
              </div>
            </div>
          </div>
        `;
      };

      // สร้าง PDF
      const doc = new jsPDF('p', 'mm', 'a4');

      // หน้าสรุป
      const summaryHTML = createVehicleSummaryHTML();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = summaryHTML;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      document.body.appendChild(tempDiv);

      await document.fonts.ready;
      
      const summaryCanvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(tempDiv);

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2 - 12; // เผื่อ footer
      const imgHeight = (summaryCanvas.height * contentWidth) / summaryCanvas.width;

      doc.addImage(summaryCanvas.toDataURL('image/png'), 'PNG', margin, margin, contentWidth, imgHeight);

      // สร้างรายละเอียดทั้งหมดและใช้ logic การแบ่งหน้าแบบอัจฉริยะ
      const allDetailsHTML = createAllVehicleDetailsHTML();
      const detailTempDiv = document.createElement('div');
      detailTempDiv.innerHTML = allDetailsHTML;
      detailTempDiv.style.position = 'absolute';
      detailTempDiv.style.left = '-9999px';
      detailTempDiv.style.top = '0';
      document.body.appendChild(detailTempDiv);

      // ค้นหา vehicle sections ทั้งหมด
      const vehicleSections = detailTempDiv.querySelectorAll('.vehicle-section');
      
      // สร้าง canvas แยกสำหรับแต่ละรถ
      const vehicleCanvases = [];
      for (let i = 0; i < vehicleSections.length; i++) {
        const section = vehicleSections[i];
        const sectionDiv = document.createElement('div');
        sectionDiv.style.fontFamily = "'Sarabun', Arial, sans-serif";
        sectionDiv.style.width = '900px';
        sectionDiv.style.background = 'white';
        sectionDiv.style.padding = '20px';
        sectionDiv.style.color = 'black';
        sectionDiv.appendChild(section.cloneNode(true));
        
        sectionDiv.style.position = 'absolute';
        sectionDiv.style.left = '-9999px';
        sectionDiv.style.top = '0';
        document.body.appendChild(sectionDiv);

        const canvas = await html2canvas(sectionDiv, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });

        document.body.removeChild(sectionDiv);
        
        vehicleCanvases.push({
          canvas,
          vehicle: vehicles[i].vehicle,
          height: (canvas.height * contentWidth) / canvas.width
        });
      }

      document.body.removeChild(detailTempDiv);

      // แบ่งหน้าอย่างอัจฉริยะ
      doc.addPage();
      let currentPageHeight = 0;
      let pageNumber = 2; // เริ่มที่ 2 เพราะหน้าแรกเป็นหน้าสรุป
      const pageFooters = [
        { page: 1, isFirst: true },
        { page: 2, isFirst: false }
      ]; // เก็บข้อมูล footer แต่ละหน้า

      for (let i = 0; i < vehicleCanvases.length; i++) {
        const { canvas, vehicle, height } = vehicleCanvases[i];
        
        // ตรวจสอบว่าถ้าเพิ่มรถนี้แล้ว จะเกินหน้าไหม
        if (currentPageHeight + height > contentHeight && currentPageHeight > 0) {
          // ถ้าเกิน ให้ขึ้นหน้าใหม่
          doc.addPage();
          pageNumber++;
          pageFooters.push({ page: pageNumber, isFirst: false });
          currentPageHeight = 0;
        }

        // ถ้ารถคันนี้เองยาวเกินหน้าเดียว ให้แบ่งเป็นหลายหน้า
        if (height > contentHeight) {
          const totalVehiclePages = Math.ceil(height / contentHeight);
          let renderedHeight = 0;

          for (let vehiclePage = 1; vehiclePage <= totalVehiclePages; vehiclePage++) {
            if (vehiclePage > 1) {
              doc.addPage();
              pageNumber++;
              pageFooters.push({ page: pageNumber, isFirst: false });
            }

            const sY = (renderedHeight / height) * canvas.height;
            const sH = Math.min((contentHeight / height) * canvas.height, canvas.height - sY);

            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = sH;
            const pctx = pageCanvas.getContext('2d');
            if (pctx) {
              pctx.drawImage(canvas, 0, sY, canvas.width, sH, 0, 0, canvas.width, sH);
            }
            const pageImg = pageCanvas.toDataURL('image/png');
            const drawHeight = (sH * contentWidth) / canvas.width;

            // เพิ่ม table header สำหรับหน้าที่ 2+ ของรถคันเดียวกัน (ถ้าตารางยาวเกินหน้า)
            if (vehiclePage > 1) {
              // สร้าง header ของตารางเป็น HTML แล้วแปลงเป็นรูปภาพ (ใช้ค่าเดียวกับหน้าแรกทุกอย่าง)
              const headerHTML = `
                <div style="font-family: 'Sarabun', Arial, sans-serif; width: 860px; background: white;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                      <tr style="background: #fff;">
                        <th style="border: 1px solid #000; padding: 3px; text-align: center; color: black; font-weight: 700; background: #fff; line-height: 1.2;">วันที่เติม</th>
                        <th style="border: 1px solid #000; padding: 3px; text-align: center; color: black; font-weight: 700; background: #fff; line-height: 1.2;">คนขับ</th>
                        <th style="border: 1px solid #000; padding: 3px; text-align: center; color: black; font-weight: 700; background: #fff; line-height: 1.2;">ปริมาณ (ลิตร)</th>
                        <th style="border: 1px solid #000; padding: 3px; text-align: center; color: black; font-weight: 700; background: #fff; line-height: 1.2;">เลขไมล์</th>
                        <th style="border: 1px solid #000; padding: 3px; text-align: center; color: black; font-weight: 700; background: #fff; line-height: 1.2;">หมายเหตุ</th>
                      </tr>
                    </thead>
                  </table>
                </div>
              `;
              
              const headerDiv = document.createElement('div');
              headerDiv.innerHTML = headerHTML;
              headerDiv.style.position = 'absolute';
              headerDiv.style.left = '-9999px';
              headerDiv.style.top = '0';
              document.body.appendChild(headerDiv);
              
              const headerCanvas = await html2canvas(headerDiv, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
              });
              
              document.body.removeChild(headerDiv);
              
              const headerImg = headerCanvas.toDataURL('image/png');
              const headerHeight = (headerCanvas.height * contentWidth) / headerCanvas.width;
              
              // วาด header ก่อน
              doc.addImage(headerImg, 'PNG', margin, margin, contentWidth, headerHeight);
              
              // วาดข้อมูลตารางต่อจาก header
              doc.addImage(pageImg, 'PNG', margin, margin + headerHeight, contentWidth, drawHeight);
            } else {
              // หน้าแรกไม่ต้องเพิ่ม header (มีอยู่แล้วในรูปภาพ)
              doc.addImage(pageImg, 'PNG', margin, margin, contentWidth, drawHeight);
            }
            
            renderedHeight += contentHeight;
          }
          currentPageHeight = 0; // รีเซ็ตเพราะขึ้นหน้าใหม่แล้ว
        } else {
          // ถ้าไม่เกิน ให้วาดในหน้าปัจจุบัน
          doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin + currentPageHeight, contentWidth, height);
          currentPageHeight += height;
        }
      }

      // อัพเดท footer ทุกหน้าให้มีจำนวนหน้าทั้งหมดที่ถูกต้อง
      const totalPages = pageNumber; // หน้าสุดท้ายที่สร้าง
      
      for (let footerInfo of pageFooters) {
        doc.setPage(footerInfo.page);
        
        // ลบ footer เก่า
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, pageHeight - 12, contentWidth, 12, 'F');
        
        // ใส่ footer ใหม่
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text(`Print Date: ${new Date().toLocaleString('th-TH')}`, margin, pageHeight - 6);
        
        if (footerInfo.isFirst) {
          doc.text(`Page ${footerInfo.page}/${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
        } else {
          doc.text(`Page ${footerInfo.page}/${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
        }
      }

      // แสดง PDF ใน browser
      const today = new Date();
      const yearThai = today.getFullYear() + 543;
      const monthStr = filters.month.padStart(2, '0');
      const fileName = `fuel-records-all-vehicles-${yearThai}-${monthStr}.pdf`;

      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      if (mode === 'preview') {
        const previewWindow = window.open(blobUrl, '_blank');
        if (previewWindow) {
          previewWindow.document.title = fileName;
          showSnackbar('เปิด PDF ในหน้าต่างใหม่แล้ว', 'success');
        } else {
          showSnackbar('กรุณาอนุญาต popup เพื่อแสดง PDF', 'warning');
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      } else if (mode === 'print') {
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.document.title = fileName;
          printWindow.onload = () => {
            try { printWindow.print(); } catch (err) { console.error(err); }
          };
          showSnackbar('เปิด PDF สำหรับพิมพ์แล้ว', 'success');
        } else {
          showSnackbar('กรุณาอนุญาต popup เพื่อพิมพ์ PDF', 'warning');
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      } else {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        showSnackbar('ดาวน์โหลดไฟล์ PDF แล้ว', 'success');
      }
    } catch (e) {
      console.error(e);
      showSnackbar('เกิดข้อผิดพลาดในการสร้าง PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Handler for print action: generate PDF then open print dialog (single or all vehicles)
  const handlePrintPDF = async () => {
    if (!filteredRecords || filteredRecords.length === 0) {
      showSnackbar('ไม่มีข้อมูลสำหรับพิมพ์', 'warning');
      return;
    }
    if (!filters.vehicleId) {
      await exportAllVehiclesPDF({ mode: 'print' });
    } else {
      await exportSingleVehiclePDF({ mode: 'print' });
    }
  };

  const getImageUrl = (url: string) => {
    if (!url) return url;
    if (url.startsWith('blob:')) return url;
    if (url.startsWith('http')) return url; // external URL
    
    // Handle uploads directory paths for both production and development
    if (url.startsWith('/uploads/')) {
      return `/api/serve-image?path=${encodeURIComponent(url)}`;
    }
    
    // If it's just a filename without path, assume it's in /uploads/driver
    if (url && !url.startsWith('/') && !url.startsWith('http')) {
      const driverImagePath = `/uploads/driver/${url}`;
      return `/api/serve-image?path=${encodeURIComponent(driverImagePath)}`;
    }
    
    return url;
  };

  return (
    <Layout showSidebar={false}>
      <Box>
        {/* Hidden Minimal PDF Template (Thai-friendly) */}
        <Box
          ref={minimalRef}
          sx={{
            visibility: 'hidden',
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: 860,
            backgroundColor: '#fff',
            color: '#000',
            fontFamily: `'Sarabun', Arial, sans-serif`,
            '& h1, & h2, & h3': { fontWeight: 700, margin: 0, color: '#000' },
            '& .section': { marginBottom: '6px' },
            '& .row': { display: 'flex', gap: '8px', alignItems: 'center' },
            '& .table': { width: '100%', borderCollapse: 'collapse' },
            '& .table th, & .table td': { padding: '3px', fontSize: '13px', lineHeight: 1.2 },
            '& .table th': { background: '#fff', fontWeight: 700, textAlign: 'center' },
            '& .table td': { background: '#fff' },
          }}
        >
          <Box className="section" sx={{ marginBottom: '10px', textAlign: 'center' }}>
            <Typography component="h2" sx={{ fontSize: 18, fontWeight: 700 ,textAlign:'center' , fontFamily: `'Sarabun', Arial, sans-serif`}}>
              รายงานการเติมน้ำมัน
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 500, fontFamily: `'Sarabun', Arial, sans-serif`, whiteSpace: 'pre-line', textAlign:'center' }}>
              {(() => {
                const monthName = months.find(m => m.value === filters.month)?.label || filters.month;
                const yearDisplay = parseInt(filters.year) + 543;
                
                return `${monthName} ${yearDisplay}`;
              })()
              }
            </Typography>
          </Box>

          <Box className="section" sx={{ marginBottom: '10px', textAlign: 'center' }}>
          <Typography 
            sx={{ 
              fontSize: 16, 
              fontWeight: 500, 
              fontFamily: `'Sarabun', Arial, sans-serif`, 
              whiteSpace: 'pre-line', 
              textAlign: 'center',
              
              // 👇 ส่วนที่เพิ่มเข้ามาสำหรับพื้นหลังและกรอบ
              backgroundColor: '#f5f5f5', // สีเทาอ่อนมาก (MUI's grey[100] หรือสีใกล้เคียง)
              border: '1px solid #ccc',     // กรอบ 1px สีเทากลาง
              borderRadius: '4px',          // ทำให้มุมโค้งมนเล็กน้อย
              padding: '4px 8px',           // เพิ่มระยะห่างรอบข้อความด้านใน
              display: 'inline-block',      // สำคัญ: ทำให้พื้นหลังและกรอบมีขนาดพอดีกับข้อความ
              
            }}
          >
            {(() => {
              
              const vehicleText = filters.vehicleId 
                  ? (() => {
                      const vehicle = vehicles.find(v => v.id.toString() === filters.vehicleId);
                      return vehicle ? `รถ: ${vehicle.licensePlate} - ${vehicle.brand} ${vehicle.model}` : 'รถ: ไม่ระบุ';
                    })()
                  : 'รถ: ทั้งหมด';
              return `${vehicleText}`;
            })()
            }
          </Typography>
          </Box>

          {/* Summary */}
          <Box className="section">
            <table className="table" style={{ fontSize: '14px', width: '500px', margin: '0 auto' }}>
              <thead>
                <tr>
                  <th>จำนวนครั้ง</th>
                  <th>ปริมาณรวม (ลิตร)</th>
                  <th>เฉลี่ยต่อครั้ง (ลิตร)</th>
                  <th>จำนวนรถ</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ textAlign: 'center' }}>
                  <td>{summary.totalRecords}</td>
                  <td>{summary.totalFuelAmount.toLocaleString('th-TH', { maximumFractionDigits: 2 })}</td>
                  <td>{summary.averageFuelPerRecord.toLocaleString('th-TH', { maximumFractionDigits: 2 })}</td>
                  <td>{summary.vehiclesCount}</td>
                </tr>
              </tbody>
            </table>
          </Box>

          {/* Detailed Data */}
          <Box className="section" style={{ marginTop: '8px' }}>
            <table className="table" style={{ fontSize: '14px' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '12%' }}>วันที่เติม</th>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '15%' }}>คนขับ</th>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '12%' }}>ปริมาณ (ลิตร)</th>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '10%' }}>เลขไมล์</th>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '18%' }}>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {[...filteredRecords].sort((a, b) => new Date(a.fuelDate).getTime() - new Date(b.fuelDate).getTime()).map((record, index) => (
                  <tr key={record.id}>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '12px' }}>
                      {format(new Date(record.fuelDate), 'dd/MM/yyyy')}
                    </td>
                    
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '12px' }}>
                      {record.driverName || record.vehicle.driverName || '-'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '12px' }}>
                      {record.fuelAmount.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontSize: '12px' }}>
                      {record.odometer ? `${record.odometer.toLocaleString('th-TH')} กม.` : '-'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '12px' }}>
                      {record.remark || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <td colSpan={2} style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                    รวมทั้งหมด:
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 700, fontSize: '12px' }}>
                    {summary.totalFuelAmount.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} style={{ border: '1px solid #000', padding: '6px' }}></td>
                </tr>
              </tfoot>
            </table>
          </Box>
        </Box>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          mb: { xs: 3, print: 1 },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 1, print: 0.5 }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, print: 0.5 } }}>
            <Typography 
              variant={isMobile ? "h5" : "h6"} 
              component="h1" 
              fontWeight="bold"
              sx={{
                '@media print': {
                  fontSize: '14px !important',
                  margin: '0 !important',
                  fontWeight: 'bold'
                }
              }}
            >
              รายงานการเติมน้ำมัน
            </Typography>
          </Box>
          
          {/* Action Buttons - Compact */}
          <Box data-print-hide sx={{ 
            display: 'flex', 
            gap: 1, 
            flexDirection: { xs: 'column', sm: 'row' },
            width: { xs: '100%', sm: 'auto' }
          }}>
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              onClick={() => router.back()}
              size="small"
              sx={{ 
                borderColor: 'grey.300',
                color: 'grey.700',
                '&:hover': { borderColor: 'grey.400' },
                minWidth: { xs: '100%', sm: 'auto' }
              }}
            >
              กลับ
            </Button>

            
          </Box>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <CalendarIcon color="primary" />
              เลือกข้อมูล
            </Typography>
          </Box>

          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: '2fr 1fr auto', 
              lg: '3fr 1fr 1fr auto' 
            }, 
            gap: 1.5,
            alignItems: 'center'
          }}>

            {/* Filter 1: เลือกทะเบียนรถ */}
            <Autocomplete
              size="small"
              options={[...availableVehicles].sort((a, b) => {
                // เรียงตามประเภทรถก่อน แล้วตามทะเบียน
                const typeOrder: Record<string, number> = { 'truck': 1, 'pickup': 2, 'forklift': 3 };
                const typeA = typeOrder[a.vehicleType?.toLowerCase()] || 99;
                const typeB = typeOrder[b.vehicleType?.toLowerCase()] || 99;
                if (typeA !== typeB) return typeA - typeB;
                return (a.licensePlate || '').localeCompare(b.licensePlate || '', 'th');
              })}
              groupBy={(option) => getVehicleTypeLabel(option.vehicleType)}
              getOptionLabel={(option) => 
                option ? `${option.licensePlate} - ${option.brand} ${option.model || ''} (${getVehicleTypeLabel(option.vehicleType)})` : ''
              }
              value={vehicles.find(v => v.id.toString() === filters.vehicleId) || null}
              onChange={(_, newValue) => {
                setFilters(prev => ({ ...prev, vehicleId: newValue ? newValue.id.toString() : '' }));
              }}
              loading={loadingVehicles}
              loadingText="กำลังโหลด..."
              noOptionsText={loadingVehicles ? "กำลังโหลด..." : "ไม่พบรถที่มีข้อมูลในเดือนนี้"}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              renderGroup={(params) => (
                <li key={params.key}>
                  <Box sx={{ 
                    position: 'sticky', 
                    top: -8, 
                    px: 2, 
                    py: 1, 
                    bgcolor: 'primary.main', 
                    color: 'primary.contrastText',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}>
                    {params.group}
                  </Box>
                  <ul style={{ padding: 0 }}>{params.children}</ul>
                </li>
              )}
              renderOption={(props, option) => {
                return (
                  <li {...props} key={option.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {option.licensePlate} - {option.brand} {option.model || ''}
                        </Typography>
                      </Box>
                    </Box>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="ค้นหาทะเบียนรถ"
                  placeholder="พิมพ์ทะเบียนรถ..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingVehicles ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              sx={{ minWidth: 280 }}
            />

            {/* Filter 2: เดือน */}
            <FormControl fullWidth size="small">
              <InputLabel>เดือน</InputLabel>
              <Select
                value={filters.month}
                label="เดือน"
                onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
              >
                {months.map((month) => (
                  <MenuItem key={month.value} value={month.value}>
                    {month.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Filter 3: ปี */}
            <FormControl fullWidth size="small">
              <InputLabel>ปี</InputLabel>
              <Select
                value={filters.year}
                label="ปี"
                onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
              >
                {getAvailableYears().map((year) => (
                  <MenuItem key={year} value={year.toString()}>
                    {year + 543}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Button: ล้างทั้งหมด */}
            <Button
              variant="outlined"
              onClick={clearFilters}
              size="small"
              sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}
            >
              ล้างทั้งหมด
            </Button>
          </Box>
        </Paper>

        {/* Summary Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {summary.totalRecords}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              จำนวนครั้งทั้งหมด
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {summary.totalFuelAmount.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลิตร
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ปริมาณน้ำมันรวม
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {summary.averageFuelPerRecord.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลิตร
            </Typography>
            <Typography variant="body2" color="text.secondary">
              เฉลี่ยต่อครั้ง
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {summary.vehiclesCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              จำนวนรถ
            </Typography>
          </Paper>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 , textAlign:'right' , flexDirection: { xs: 'column', sm: 'row' }, justifyContent: { xs: 'center', sm: 'flex-end' }, alignItems: { xs: 'center', sm: 'center' } }}>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrintPDF}
          sx={{ borderRadius: 1 }}
          disabled={isExporting || filteredRecords.length === 0}
        >
          {isExporting ? 'กำลังสร้าง...' : 'พิมพ์ PDF'}
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadPDF}
          disabled={isExporting || filteredRecords.length === 0}
          sx={{ borderRadius: 1 }}
        >
          {isExporting ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF'}
        </Button>

        </Box>

        {/* Desktop Table / Mobile Cards */}
        {!isMobile ? (
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredRecords.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <FuelIcon sx={{ fontSize: '4rem', color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  ไม่พบข้อมูลการเติมน้ำมัน
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ลองปรับเปลี่ยนตัวกรองเพื่อดูข้อมูลอื่น
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>วันที่เติม</TableCell>
                      <TableCell>รถ</TableCell>
                      <TableCell>คนขับ</TableCell>
                      <TableCell align="right">ปริมาณน้ำมัน</TableCell>
                      <TableCell align="right">เลขไมล์</TableCell>
                      <TableCell>หมายเหตุ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRecords.map((record) => (
                      <TableRow key={record.id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(record.fuelDate), 'dd/MM/yyyy')}
                          </Typography>
                          
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar
                              src={getImageUrl(record.vehicle.carImage || '')}
                              sx={{ width: 48, height: 48, mr: 2, bgcolor: 'primary.main' }}
                            >
                              <img
                                src={getVehicleTypeIcon(record.vehicle.vehicleType)}
                                alt={record.vehicle.vehicleType}
                                style={{ width: 20, height: 20 }}
                              />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {record.vehicle.licensePlate}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {record.vehicle.brand} {record.vehicle.model}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar
                              src={(() => {
                                if (!record.driverLicense) {
                                  if (process.env.NODE_ENV === 'development') {
                                    console.log(`⚠️ [Avatar] No driverLicense for record ${record.id}`);
                                  }
                                  return '';
                                }
                                const cachedImage = getCachedDriverImage(record.driverLicense);
                                const imageUrl = getImageUrl(cachedImage || '');
                                if (process.env.NODE_ENV === 'development' && cachedImage) {
                                  console.log(`🖼️ [Avatar] Using image for ${record.driverLicense}: ${imageUrl}`);
                                }
                                return imageUrl;
                              })()}
                              onError={(e) => {
                                if (process.env.NODE_ENV === 'development') {
                                  console.error(`❌ [Avatar] Image load error for license ${record.driverLicense}:`, e);
                                }
                              }}
                              onLoad={() => {
                                if (process.env.NODE_ENV === 'development') {
                                  console.log(`✅ [Avatar] Image loaded successfully for license ${record.driverLicense}`);
                                }
                              }}
                              sx={{ 
                                width: 48, 
                                height: 48, 
                                mr: 2, 
                                bgcolor: 'secondary.main',
                                ...(record.driverLicense && driverImages.get(record.driverLicense) === 'loading' && {
                                  animation: 'pulse 1.5s infinite'
                                }),
                                '@keyframes pulse': {
                                  '0%': { opacity: 1 },
                                  '50%': { opacity: 0.7 },
                                  '100%': { opacity: 1 }
                                }
                              }}
                            >
                              <PersonIcon sx={{ fontSize: 20, color: 'white' }} />
                            </Avatar>
                            <Box>
                              <Typography variant="body2">
                                {record.driverName || 
                                 (record.driverType === 'backup' ? record.vehicle.backupDriver?.driverName : record.vehicle.mainDriver?.driverName) ||
                                 record.vehicle.driverName || '-'}
                              </Typography>
                              <Chip
                                label={
                                  record.driverType === 'backup' 
                                    ? 'คนขับรอง' 
                                    : record.driverType === 'other' 
                                      ? 'คนขับแทน' 
                                      : 'คนขับหลัก'
                                }
                                size="small"
                                color={
                                  record.driverType === 'backup' 
                                    ? 'secondary' 
                                    : record.driverType === 'other' 
                                      ? 'success' 
                                      : 'primary'
                                }
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {record.fuelAmount.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลิตร
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {record.odometer ? `${record.odometer.toLocaleString('th-TH')} กม.` : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200, wordBreak: 'break-word' }}>
                            {record.remark || '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2" fontWeight="medium">
                          รวมทั้งหมด ({summary.totalRecords} ครั้ง)
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium" color="primary">
                          {summary.totalFuelAmount.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลิตร
                        </Typography>
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </TableContainer>
            )}
          </Paper>
        ) : (
          /* Mobile Cards */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loading ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <CircularProgress size={40} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  กำลังโหลดข้อมูล...
                </Typography>
              </Paper>
            ) : filteredRecords.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <FuelIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                  ไม่มีข้อมูลการเติมน้ำมัน
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  ลองปรับเปลี่ยนตัวกรองเพื่อดูข้อมูลอื่น
                </Typography>
              </Paper>
            ) : (
              paginatedRecords.map((record) => (
                <Paper 
                  key={record.id}
                  sx={{ 
                    p: 3, 
                    borderRadius: 3,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    '&:hover': {
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Header with Date and Fuel Icon */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    mb: 2
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {format(new Date(record.fuelDate), 'dd/MM/yyyy')}
                      </Typography>
                    </Box>
                    <FuelIcon sx={{ color: 'warning.main', fontSize: 24 }} />
                  </Box>

                  {/* Vehicle and Driver Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar
                      src={getImageUrl(record.vehicle.carImage || '')}
                      sx={{ 
                        width: 56, 
                        height: 56, 
                        border: '2px solid #e0e0e0'
                      }}
                    >
                      <img
                        src={getVehicleTypeIcon(record.vehicle.vehicleType)}
                        alt={record.vehicle.vehicleType}
                        style={{ width: 24, height: 24 }}
                      />
                    </Avatar>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {record.vehicle.licensePlate}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {record.vehicle.brand} {record.vehicle.model}
                      </Typography>
                    </Box>

                    <Avatar
                      src={(() => {
                        if (!record.driverLicense) return '';
                        const cachedImage = getCachedDriverImage(record.driverLicense);
                        return getImageUrl(cachedImage || '');
                      })()}
                      onError={(e) => {
                        if (process.env.NODE_ENV === 'development') {
                          console.error(`❌ [Mobile Avatar] Image load error for license ${record.driverLicense}:`, e);
                        }
                      }}
                      sx={{ 
                        width: 48, 
                        height: 48, 
                        border: '2px solid #e0e0e0',
                        bgcolor: 'secondary.main',
                        ...(record.driverLicense && driverImages.get(record.driverLicense) === 'loading' && {
                          animation: 'pulse 1.5s infinite'
                        }),
                        '@keyframes pulse': {
                          '0%': { opacity: 1 },
                          '50%': { opacity: 0.7 },
                          '100%': { opacity: 1 }
                        }
                      }}
                    >
                      <PersonIcon sx={{ fontSize: 20, color: 'white' }} />
                    </Avatar>
                  </Box>

                  {/* Driver Details */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                      {record.driverName || 
                       (record.driverType === 'backup' ? record.vehicle.backupDriver?.driverName : record.vehicle.mainDriver?.driverName) ||
                       record.vehicle.driverName || '-'}
                    </Typography>
                    <Chip
                      label={
                        record.driverType === 'backup' 
                          ? 'คนขับรอง' 
                          : record.driverType === 'other' 
                            ? 'คนขับแทน' 
                            : 'คนขับหลัก'
                      }
                      size="small"
                      color={
                        record.driverType === 'backup' 
                          ? 'secondary' 
                          : record.driverType === 'other' 
                            ? 'success' 
                            : 'primary'
                      }
                      variant="outlined"
                    />
                  </Box>

                  {/* Fuel Details */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: 2, 
                    py: 2,
                    borderTop: '1px solid',
                    borderBottom: '1px solid',
                    borderColor: 'grey.100'
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        ปริมาณน้ำมัน
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                        {record.fuelAmount.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลิตร
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        เลขไมล์
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'info.main' }}>
                        {record.odometer ? `${record.odometer.toLocaleString('th-TH')} กม.` : '-'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Remark */}
                  {record.remark && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.100' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        หมายเหตุ
                      </Typography>
                      <Typography variant="body2">
                        {record.remark}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              ))
            )}
          </Box>
        )}

        {/* Pagination */}
        {!loading && filteredRecords.length > 0 && (
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <DataTablePagination
              component="div"
              count={filteredRecords.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[20, 50, 100, 200]}
              labelRowsPerPage="แสดงต่อหน้า:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
              }
            />
          </Paper>
        )}
      </Box>
    </Layout>
  );
}
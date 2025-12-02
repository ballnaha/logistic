'use client';
// Set to true only when needing to troubleshoot
const DEBUG_REPORTS_DRIVER = false;

/*
 * DRIVER DATA CONSISTENCY FIX:
 * Updated to prioritize trip_records.driver_name, trip_records.driver_license, 
 * and trip_records.driver_image as primary sources instead of vehicle relations.
 * 
 * Changes made:
 * 1. Added driverLicense and driverImage to TripRecord and ApiTripRecord interfaces
 * 2. Updated data mapping to include these fields from API response  
 * 3. Modified avatar rendering to use trip_records data first, then fallback to vehicle relations
 * 4. Updated handleDriverInfoClick to prioritize trip_records data
 * 
 * Note: The API needs to return driver_license and driver_image fields in trip_records response
 */
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Person as PersonIcon,
  DirectionsCar as CarIcon,
  CalendarToday as CalendarIcon,
  Clear as ClearIcon,
  ArrowBack as BackIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  Print as PrintIcon,
  LocalGasStation as FuelIcon,
  Info as InfoIcon
} from '@mui/icons-material';

import { th } from 'date-fns/locale';
import { format } from 'date-fns';

import Layout from '../../components/Layout';
import DataTablePagination from '../../../components/DataTablePagination';
import { useSnackbar } from '../../../contexts/SnackbarContext';

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

// Custom number formatting function for PDF - shows 2 decimal places but hides .00
const formatNumberForPDF = (value: number): string => {
  if (value === 0) return '0';
  
  const formatted = value.toLocaleString('th-TH', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2 
  });
  
  return formatted;
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
  // New driver relations
  mainDriver?: Driver;
  backupDriver?: Driver;
  // Legacy fields (may still exist in some data)
  driverName?: string;
  car_driver_name?: string;
  driverImage?: string;
  backupDriverName?: string;
  backup_driver_name?: string;
  backupDriverImage?: string;
  
}

interface TripRecord {
  id: number;
  tripDate: string; // Transformed from departureDate
  vehicleId: number;
  driverName?: string;
  driverLicense?: string;
  driverImage?: string;
  driverType?: string;
  departureLocation?: string;
  departureOdometer?: number;
  departureTime?: string;
  arrivalLocation?: string;
  arrivalOdometer?: number;
  arrivalTime?: string;
  returnDate?: string; // Add return_date field
  estimatedDistance?: number;
  actualDistance?: number;
  fuelAmount?: number;
  fuelCost?: number;
  tolls?: number;
  distanceCheckFee?: number; // ค่าจริงจาก trip_records.distance_check_fee
  calculatedDistanceCost?: number; // ค่าระยะทางที่คำนวณใหม่ = estimatedDistance × distanceRate
  repairCost?: number;
  suppliesCost?: number; // summed from tripItems totalPrice
  allowance?: number; // totalAllowance
  totalCosts?: number;
  driverExpenses?: number; // เบี้ยเลี้ยง + ค่าระยะทาง + ค่าพัสดุ
  tripFee?: number; // ค่าเที่ยวรถ
  remark?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  vehicle: Vehicle;
}

// API Response interface
interface ApiTripRecord {
  id: number;
  vehicleId: number;
  customerId: number;
  departureDate: string;
  departureTime: string;
  returnDate?: string;
  returnTime?: string;
  odometerBefore: number;
  odometerAfter: number;
  actualDistance: string;
  estimatedDistance: string;
  driverType: string;
  driverName: string;
  driverLicense?: string;
  driverImage?: string;
  days: number;
  allowanceRate: string;
  totalAllowance: string;
  loadingDate?: string;
  distanceCheckFee?: string;
  fuelCost?: string;
  tollFee?: string;
  repairCost?: string;
  tripFee?: string;
  documentNumber: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  vehicle: Vehicle;
  customer: any;
  tripItems: any[];
}

interface FilterState {
  driverName: string;
  month: string;
  year: string;
}

export default function DriverReport() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showSnackbar } = useSnackbar();
  const minimalRef = useRef<HTMLDivElement | null>(null);

  // State
  const [loading, setLoading] = useState(true); // Start with true to show loading initially
  const [isExporting, setIsExporting] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tripRecords, setTripRecords] = useState<TripRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<TripRecord[]>([]);
  const [drivers, setDrivers] = useState<string[]>([]);
  const [driverImages, setDriverImages] = useState<Map<string, string>>(new Map());
  const [distanceRate, setDistanceRate] = useState<number>(1.2); // Default to 1.2
  const [freeDistanceThreshold, setFreeDistanceThreshold] = useState<number>(1500); // Default 1500, จะโหลดจาก system_settings
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [filters, setFilters] = useState<FilterState>({
    driverName: '',
    month: (new Date().getMonth() + 1).toString(), // Start with current month
    year: new Date().getFullYear().toString()
  });

  // Dialog state for driver details
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [selectedDriverData, setSelectedDriverData] = useState<{
    driverName: string;
    driverImage?: string;
    driverLicense?: string;
    driverType: string;
    vehicle: Vehicle;
    // Expense details
    tripDate: string;
    returnDate?: string;
    departureLocation?: string;
    arrivalLocation?: string;
    actualDistance?: number;
    estimatedDistance?: number;
    fuelAmount?: number;
    fuelCost?: number;
    tolls?: number;
    distanceCheckFee?: number;
    calculatedDistanceCost?: number;
    repairCost?: number;
    suppliesCost?: number;
    allowance?: number;
    totalCosts?: number;
    driverExpenses?: number;
    tripFee?: number;
    remark?: string;
  } | null>(null);

  // Summary data
  const [summary, setSummary] = useState({
    totalTrips: 0,
    totalDistance: 0,
    totalFuelAmount: 0,
    totalCosts: 0,
    averageDistancePerTrip: 0,
    averageFuelPerTrip: 0,
    averageCostPerTrip: 0,
    driversCount: 0
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

  /**
   * คำนวณค่าระยะทางแบบ progressive สำหรับรายเที่ยว
   * @param tripDistance - ระยะทางของเที่ยวนี้
   * @param cumulativeDistanceBefore - ระยะทางสะสมก่อนเที่ยวนี้
   * @param rate - อัตราค่าระยะทาง (เช่น 1.2)
   * @param freeThreshold - ระยะทางฟรี (เช่น 1500 กม.)
   * @returns ค่าระยะทางที่ต้องจ่ายสำหรับเที่ยวนี้
   */
  const calculateProgressiveDistanceCost = (
    tripDistance: number,
    cumulativeDistanceBefore: number,
    rate: number,
    freeThreshold: number
  ): number => {
    if (tripDistance <= 0) return 0;
    
    const cumulativeAfter = cumulativeDistanceBefore + tripDistance;
    
    // กรณีที่ยังไม่เกิน threshold
    if (cumulativeAfter <= freeThreshold) {
      return 0;
    }
    
    // กรณีที่เกิน threshold
    if (cumulativeDistanceBefore >= freeThreshold) {
      // ทุก km ของเที่ยวนี้ต้องจ่าย
      return tripDistance * rate;
    }
    
    // กรณีที่เที่ยวนี้ทำให้ข้ามเกิน threshold
    const chargeableDistance = cumulativeAfter - freeThreshold;
    return chargeableDistance * rate;
  };

  // Transform API data to match our interface
  const transformTripRecord = (apiRecord: ApiTripRecord): TripRecord => {
  // Sum supplies (ค่าพัสดุ) from tripItems.totalPrice
  const suppliesCost = Array.isArray(apiRecord.tripItems)
    ? apiRecord.tripItems.reduce((sum: number, ti: any) => {
        const val = parseFloat(ti.totalPrice || ti.total_price || '0');
        return sum + (isNaN(val) ? 0 : val);
      }, 0)
    : 0;

const allowance = parseFloat(apiRecord.totalAllowance || '0') || 0; // ค่าเบี้ยเลี้ยง
const repairCost = parseFloat(apiRecord.repairCost || '0') || 0; // ค่าซ่อมแซม
const fuel = parseFloat(apiRecord.fuelCost || '0') || 0;
const toll = parseFloat(apiRecord.tollFee || '0') || 0;

// ค่าเช็คระยะ = ค่าจริงจากฐานข้อมูล trip_records.distance_check_fee
const distanceCheckFee = parseFloat(apiRecord.distanceCheckFee || '0') || 0;

// คำนวณค่าระยะทาง = ระยะทางจากระบบ × อัตรา (ค่าใหม่ที่คำนวณ)
const estimatedDistance = parseFloat(apiRecord.estimatedDistance) || 0;
const calculatedDistanceCost = estimatedDistance * distanceRate;

// ค่าเที่ยวรถ = ค่าจริงจากฐานข้อมูล trip_records.trip_fee
const tripFee = parseFloat(apiRecord.tripFee || '0') || 0;

// คำนวณค่าใช้จ่ายแต่ละประเภท
const driverExpenses = allowance + calculatedDistanceCost + suppliesCost; // เบี้ยเลี้ยง + ค่าระยะทาง + ค่าพัสดุ
const totalCosts = driverExpenses + tripFee; // รวมค่าใช้จ่ายคนขับ + ค่าเที่ยวรถ
    return {
      id: apiRecord.id,
      tripDate: apiRecord.departureDate,
      vehicleId: apiRecord.vehicleId,
      driverName: apiRecord.driverName,
      driverLicense: apiRecord.driverLicense,
      driverImage: apiRecord.driverImage,
      driverType: apiRecord.driverType,
      departureLocation: apiRecord.customer?.cmName || '',
      departureOdometer: apiRecord.odometerBefore,
      departureTime: apiRecord.departureTime,
      arrivalLocation: '', // Not available in API
      arrivalOdometer: apiRecord.odometerAfter,
      arrivalTime: apiRecord.returnTime || '',
      returnDate: apiRecord.returnDate || '', // Add return_date mapping
      estimatedDistance: parseFloat(apiRecord.estimatedDistance) || 0,
      actualDistance: parseFloat(apiRecord.actualDistance) || 0,
      fuelAmount: parseFloat(apiRecord.fuelCost || '0') || 0,
      fuelCost: parseFloat(apiRecord.fuelCost || '0') || 0,
      tolls: parseFloat(apiRecord.tollFee || '0') || 0,
      distanceCheckFee: distanceCheckFee, // ค่าจริงจาก trip_records.distance_check_fee
      calculatedDistanceCost: calculatedDistanceCost, // ค่าระยะทางที่คำนวณใหม่
      repairCost, // ค่าซ่อมแซม
      suppliesCost,
      allowance,
      totalCosts,
      driverExpenses,
      tripFee,
      remark: apiRecord.remark || '',
      createdAt: apiRecord.createdAt,
      updatedAt: apiRecord.updatedAt,
      createdBy: apiRecord.createdBy,
      updatedBy: apiRecord.updatedBy,
      vehicle: apiRecord.vehicle
    };
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Load distance rate and free distance threshold first
        await Promise.all([
          loadDistanceRate(),
          loadFreeDistanceThreshold()
        ]);
        // Then load vehicles
        await loadVehicles();
      } catch (error) {
        console.error('Error loading initial data:', error);
        showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Load trip records when filters change (year/month)
  useEffect(() => {
    if (filters.year) {
      loadTripRecords();
    }
  }, [filters.year, filters.month]);

  // Filter by driver when driverName filter changes (client-side only)
  useEffect(() => {
    let filtered = tripRecords;
    
    if (filters.driverName) {
      // กรณีเลือกคนขับเฉพาะคน
      filtered = tripRecords.filter(record => record.driverName === filters.driverName);
      
      // Sort by date (ascending order - earliest to latest)
      filtered.sort((a, b) => {
        const dateA = new Date(a.tripDate);
        const dateB = new Date(b.tripDate);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Recalculate distance cost with progressive calculation
      let cumulativeDistance = 0;
      filtered = filtered.map(record => {
        const tripDistance = record.estimatedDistance || 0;
        const progressiveDistanceCost = calculateProgressiveDistanceCost(
          tripDistance,
          cumulativeDistance,
          distanceRate,
          freeDistanceThreshold
        );
        
        cumulativeDistance += tripDistance;
        
        // Recalculate driverExpenses and totalCosts with new distance cost
        const driverExpenses = (record.allowance || 0) + progressiveDistanceCost + (record.suppliesCost || 0);
        const totalCosts = driverExpenses + (record.tripFee || 0);
        
        return {
          ...record,
          calculatedDistanceCost: progressiveDistanceCost,
          driverExpenses,
          totalCosts
        };
      });
    } else {
      // กรณีเลือก "คนขับทั้งหมด" - คำนวณแยกตามคนขับแต่ละคน
      
      // 1. จัดกลุ่มตามคนขับ
      const recordsByDriver = new Map<string, TripRecord[]>();
      tripRecords.forEach(record => {
        const driverName = record.driverName || 'ไม่ระบุ';
        if (!recordsByDriver.has(driverName)) {
          recordsByDriver.set(driverName, []);
        }
        recordsByDriver.get(driverName)!.push(record);
      });
      
      // 2. คำนวณค่าระยะทางแยกตามคนขับแต่ละคน
      const processedRecords: TripRecord[] = [];
      
      recordsByDriver.forEach((driverRecords, driverName) => {
        // เรียงตามวันที่สำหรับแต่ละคนขับ
        const sortedRecords = [...driverRecords].sort((a, b) => {
          const dateA = new Date(a.tripDate);
          const dateB = new Date(b.tripDate);
          return dateA.getTime() - dateB.getTime();
        });
        
        // คำนวณค่าระยะทางแบบสะสมสำหรับคนขับคนนี้
        let cumulativeDistance = 0;
        
        const calculatedRecords = sortedRecords.map(record => {
          const tripDistance = record.estimatedDistance || 0;
          const progressiveDistanceCost = calculateProgressiveDistanceCost(
            tripDistance,
            cumulativeDistance,
            distanceRate,
            freeDistanceThreshold
          );
          
          cumulativeDistance += tripDistance;
          
          // Recalculate expenses
          const driverExpenses = (record.allowance || 0) + progressiveDistanceCost + (record.suppliesCost || 0);
          const totalCosts = driverExpenses + (record.tripFee || 0);
          
          return {
            ...record,
            calculatedDistanceCost: progressiveDistanceCost,
            driverExpenses,
            totalCosts
          };
        });
        
        processedRecords.push(...calculatedRecords);
      });
      
      // 3. เรียงข้อมูลทั้งหมดตามวันที่อีกครั้ง (เพื่อแสดงผล)
      filtered = processedRecords.sort((a, b) => {
        const dateA = new Date(a.tripDate);
        const dateB = new Date(b.tripDate);
        return dateA.getTime() - dateB.getTime();
      });
    }
    
    setFilteredRecords(filtered);
    
    // Load driver images for the filtered records
    if (filtered.length > 0) {
      loadDriverImages(filtered);
    }
    
    // Recalculate summary
    const totalDistance = filtered.reduce((sum, record) => sum + (record.actualDistance || record.estimatedDistance || 0), 0);
    const totalCosts = filtered.reduce((sum, record) => sum + (record.totalCosts || 0), 0);
    const filteredUniqueDrivers = new Set(filtered.map(record => record.driverName).filter(Boolean));
    
    setSummary({
      totalTrips: filtered.length,
      totalDistance,
      totalFuelAmount: 0,
      totalCosts,
      averageDistancePerTrip: filtered.length > 0 ? totalDistance / filtered.length : 0,
      averageFuelPerTrip: 0,
      averageCostPerTrip: filtered.length > 0 ? totalCosts / filtered.length : 0,
      driversCount: filteredUniqueDrivers.size
    });
    
    // Update drivers list based on filtered records (month/year filter)
    const uniqueDrivers = new Set<string>();
    tripRecords.forEach((record: TripRecord) => {
      if (record.driverName && record.driverName.trim()) {
        uniqueDrivers.add(record.driverName.trim());
      }
    });
    const driversList = Array.from(uniqueDrivers).filter(Boolean).sort();
    setDrivers(driversList);
  }, [filters.driverName, tripRecords]);

  const loadDistanceRate = async () => {
    try {
      const response = await fetch('/api/system-settings/distance_rate');
      const result = await response.json();

      if (response.ok && result.value) {
        const rate = parseFloat(result.value);
        if (!isNaN(rate) && rate > 0) {
          setDistanceRate(rate);
        }
      }
    } catch (error) {
      console.error('Error loading distance rate, using default:', error);
    }
  };

  const loadFreeDistanceThreshold = async () => {
    try {
      const response = await fetch('/api/system-settings/free_distance_threshold');
      const result = await response.json();

      if (result.success && result.data?.value !== undefined) {
        const threshold = parseFloat(result.data.value);
        if (!isNaN(threshold) && threshold >= 0) {
          setFreeDistanceThreshold(threshold);
        }
      }
    } catch (error) {
      console.error('Error loading free distance threshold, using default:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      const result = await response.json();

      if (response.ok) {
        // Fix: API returns data in 'data' field, not 'vehicles'
        const vehicleList = result.data || result.vehicles || [];
        
        setVehicles(vehicleList);
      } else {
        showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลรถ', 'error');
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลรถ', 'error');
    }
  };

  const loadTripRecords = async () => {
    try {
      setLoading(true);
      
      // Build query parameters based on filters
      const params = new URLSearchParams();
      
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
      const firstResponse = await fetch(`/api/trip-records?page=1&limit=100&${params.toString()}`);
      const firstResult = await firstResponse.json();

      if (firstResponse.ok) {
        const allApiRecords: ApiTripRecord[] = [...(firstResult.trips || firstResult.data || [])];
        const total = firstResult.pagination?.total || 0;
        const totalPages = Math.ceil(total / 100);

        // Fetch remaining pages if there are more
        if (totalPages > 1) {
          const remainingPages = [];
          for (let page = 2; page <= totalPages; page++) {
            remainingPages.push(
              fetch(`/api/trip-records?page=${page}&limit=100&${params.toString()}`)
                .then(res => res.json())
                .then(result => result.trips || result.data || [])
            );
          }

          // Wait for all remaining pages
          const remainingRecords = await Promise.all(remainingPages);
          remainingRecords.forEach(pageRecords => {
            allApiRecords.push(...pageRecords);
          });
        }
        
        // Transform API records to match our interface (distanceRate should be loaded by now)
        const records = allApiRecords.map((apiRecord: ApiTripRecord) => transformTripRecord(apiRecord));
        setTripRecords(records);
        
        if (records.length === 0) {
          showSnackbar('ไม่พบข้อมูลการเดินทาง', 'warning');
          setDrivers([]);
          setFilteredRecords([]);
          setSummary({
            totalTrips: 0,
            totalDistance: 0,
            totalFuelAmount: 0,
            totalCosts: 0,
            averageDistancePerTrip: 0,
            averageFuelPerTrip: 0,
            averageCostPerTrip: 0,
            driversCount: 0
          });
          return;
        }
        
        // Extract unique drivers only from trip_records.driver_name
        const uniqueDrivers = new Set<string>();
        records.forEach((record: TripRecord) => {
          // Only from trip record driver_name field
          if (record.driverName && record.driverName.trim()) {
            uniqueDrivers.add(record.driverName.trim());
          }
        });
        
        const driversList = Array.from(uniqueDrivers).filter(Boolean).sort();
        setDrivers(driversList);
        
        // Reset driver filter if the selected driver is not in the new list
        if (filters.driverName && !driversList.includes(filters.driverName)) {
          setFilters(prev => ({ ...prev, driverName: '' }));
        }
        
        // Apply client-side driver filter if selected
        let filtered: TripRecord[];
        
        if (filters.driverName && driversList.includes(filters.driverName)) {
          // กรณีเลือกคนขับเฉพาะคน
          filtered = records.filter(record => record.driverName === filters.driverName);
          
          // Sort by date (ascending order - earliest to latest)
          filtered.sort((a, b) => {
            const dateA = new Date(a.tripDate);
            const dateB = new Date(b.tripDate);
            return dateA.getTime() - dateB.getTime();
          });
          
          // Recalculate distance cost with progressive calculation
          let cumulativeDistance = 0;
          filtered = filtered.map(record => {
            const tripDistance = record.estimatedDistance || 0;
            const progressiveDistanceCost = calculateProgressiveDistanceCost(
              tripDistance,
              cumulativeDistance,
              distanceRate,
              freeDistanceThreshold
            );
            
            cumulativeDistance += tripDistance;
            
            // Recalculate driverExpenses and totalCosts with new distance cost
            const driverExpenses = (record.allowance || 0) + progressiveDistanceCost + (record.suppliesCost || 0);
            const totalCosts = driverExpenses + (record.tripFee || 0);
            
            return {
              ...record,
              calculatedDistanceCost: progressiveDistanceCost,
              driverExpenses,
              totalCosts
            };
          });
        } else {
          // กรณีเลือก "คนขับทั้งหมด" - คำนวณแยกตามคนขับแต่ละคน
          
          // 1. จัดกลุ่มตามคนขับ
          const recordsByDriver = new Map<string, TripRecord[]>();
          records.forEach(record => {
            const driverName = record.driverName || 'ไม่ระบุ';
            if (!recordsByDriver.has(driverName)) {
              recordsByDriver.set(driverName, []);
            }
            recordsByDriver.get(driverName)!.push(record);
          });
          
          // 2. คำนวณค่าระยะทางแยกตามคนขับแต่ละคน
          const processedRecords: TripRecord[] = [];
          
          recordsByDriver.forEach((driverRecords, driverName) => {
            // เรียงตามวันที่สำหรับแต่ละคนขับ
            const sortedRecords = [...driverRecords].sort((a, b) => {
              const dateA = new Date(a.tripDate);
              const dateB = new Date(b.tripDate);
              return dateA.getTime() - dateB.getTime();
            });
            
            // คำนวณค่าระยะทางแบบสะสมสำหรับคนขับคนนี้
            let cumulativeDistance = 0;
            
            const calculatedRecords = sortedRecords.map(record => {
              const tripDistance = record.estimatedDistance || 0;
              const progressiveDistanceCost = calculateProgressiveDistanceCost(
                tripDistance,
                cumulativeDistance,
                distanceRate,
                freeDistanceThreshold
              );
              
              cumulativeDistance += tripDistance;
              
              // Recalculate expenses
              const driverExpenses = (record.allowance || 0) + progressiveDistanceCost + (record.suppliesCost || 0);
              const totalCosts = driverExpenses + (record.tripFee || 0);
              
              return {
                ...record,
                calculatedDistanceCost: progressiveDistanceCost,
                driverExpenses,
                totalCosts
              };
            });
            
            processedRecords.push(...calculatedRecords);
          });
          
          // 3. เรียงข้อมูลทั้งหมดตามวันที่อีกครั้ง (เพื่อแสดงผล)
          filtered = processedRecords.sort((a, b) => {
            const dateA = new Date(a.tripDate);
            const dateB = new Date(b.tripDate);
            return dateA.getTime() - dateB.getTime();
          });
        }
        
        setFilteredRecords(filtered);
        
        // Load driver images for the filtered records
        loadDriverImages(filtered);
        
        // Calculate summary
        const totalDistance = filtered.reduce((sum, record) => sum + (record.actualDistance || record.estimatedDistance || 0), 0);
        const totalCosts = filtered.reduce((sum, record) => sum + (record.totalCosts || 0), 0);
        const filteredUniqueDrivers = new Set(filtered.map(record => record.driverName).filter(Boolean));
        
        setSummary({
          totalTrips: filtered.length,
          totalDistance,
          totalFuelAmount: 0,
          totalCosts,
          averageDistancePerTrip: filtered.length > 0 ? totalDistance / filtered.length : 0,
          averageFuelPerTrip: 0,
          averageCostPerTrip: filtered.length > 0 ? totalCosts / filtered.length : 0,
          driversCount: filteredUniqueDrivers.size
        });
      } else {
        showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลการเดินทาง', 'error');
      }
    } catch (error) {
      console.error('Error loading trip records:', error);
      showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลการเดินทาง', 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      driverName: '',
      month: (new Date().getMonth() + 1).toString(), // Reset to current month
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
      'วันที่เดินทาง',
      'คนขับ',
      'ทะเบียนรถ',
      'ยี่ห้อ รุ่น',
      'ประเภทรถ',
      'ลูกค้า',
      'ระยะทางจริง (กม.)',
      'ระยะทางระบบ (กม.)',
      'จ่ายคนขับ (บาท)',
      'ค่าเที่ยวรถ (บาท)',
      'ค่าใช้จ่ายรวม (บาท)',
      'หมายเหตุ'
    ];

    const csvData = filteredRecords.map(record => [
      format(new Date(record.tripDate), 'dd/MM/yyyy'),
      record.driverName || '-',
      record.vehicle?.licensePlate || '-',
      `${record.vehicle?.brand || ''} ${record.vehicle?.model || ''}`.trim(),
      getVehicleTypeText(record.vehicle?.vehicleType || ''),
      record.departureLocation || '-',
      (record.actualDistance || 0).toString(),
      (record.estimatedDistance || 0).toString(),
      (record.driverExpenses || 0).toString(),
      (record.tripFee || 0).toString(),
      (record.totalCosts || 0).toString(),
      record.remark || '-'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `driver-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSnackbar('ส่งออกรายงานสำเร็จ', 'success');
  };

  // Dialog handlers
  const handleDriverInfoClick = (record: TripRecord) => {
    // Use trip_records data as primary source, license-based image lookup
    const cachedImage = getCachedDriverImage(record.driverLicense);
    
    setSelectedDriverData({
      driverName: record.driverName || '',
      driverImage: cachedImage || undefined,
      driverLicense: record.driverLicense,
      driverType: record.driverType || 'main',
      vehicle: record.vehicle,
      // Trip and expense details
      tripDate: record.tripDate,
      returnDate: record.returnDate,
      departureLocation: record.departureLocation,
      arrivalLocation: record.arrivalLocation,
      actualDistance: record.actualDistance,
      estimatedDistance: record.estimatedDistance,
      fuelAmount: record.fuelAmount,
      fuelCost: record.fuelCost,
      tolls: record.tolls,
      distanceCheckFee: record.distanceCheckFee,
      calculatedDistanceCost: record.calculatedDistanceCost,
      repairCost: record.repairCost,
      suppliesCost: record.suppliesCost,
      allowance: record.allowance,
      totalCosts: record.totalCosts,
      driverExpenses: record.driverExpenses,
      tripFee: record.tripFee,
      remark: record.remark
    });
    setDriverDialogOpen(true);
  };

  const handleCloseDriverDialog = () => {
    // Close first; clear data after transition completes to avoid empty content flash
    setDriverDialogOpen(false);
  };

  // Main handler for Download button (force file download)
  const handleDownloadPDF = async () => {
    if (!filteredRecords || filteredRecords.length === 0) {
      showSnackbar('กรุณาเลือกข้อมูลและตรวจสอบว่ามีข้อมูลการเดินทาง', 'warning');
      return;
    }
    if (!filters.driverName) {
      await exportAllDriversPDF({ mode: 'download' });
    } else {
      await exportSingleDriverPDF({ mode: 'download' });
    }
  };

  interface ExportModeOptions { mode?: 'download' | 'preview' | 'print'; }

  const exportSingleDriverPDF = async ({ mode = 'download' }: ExportModeOptions = {}) => {
    try {
      setIsExporting(true);

      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      // ใช้เทมเพลต HTML ที่ซ่อนอยู่เพื่อให้ render ภาษาไทยถูกต้อง
      // ยกเลิกการใช้ minimalRef และสร้าง HTML ใหม่เองเพื่อรองรับการแบ่งหน้าและ header
      
      // ฟังก์ชันสร้าง HTML สำหรับ Main Report (Summary Table)
      const createMainReportHTML = (recordsSubset: TripRecord[], startIndex: number, isFirstPage: boolean) => {
        const monthName = months.find(m => m.value === filters.month)?.label || filters.month;
        const yearDisplay = parseInt(filters.year) + 543;
        const driverText = filters.driverName ? `คนขับ: ${filters.driverName}` : 'คนขับ: ทั้งหมด';

        const headerSection = isFirstPage ? `
          <div style="text-align: center; margin-bottom: 10px;">
            <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: black;">รายงานคนขับรถ</h2>
            <p style="font-size: 16px; margin: 5px 0; color: black;">${monthName} ${yearDisplay}</p>
            <div style="
              background-color: #f5f5f5; 
              border: 1px solid #ccc; 
              border-radius: 4px; 
              padding: 4px 8px; 
              display: inline-block; 
              font-size: 16px; 
              font-weight: 500;
              margin-top: 5px;
            ">
              ${driverText}
            </div>
          </div>

          <div style="margin-bottom: 10px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr>
                  <th style="background: #fff; font-weight: 700; text-align: center; padding: 3px;">จำนวนเที่ยว</th>
                  <th style="background: #fff; font-weight: 700; text-align: center; padding: 3px;">ค่าเบี้ยเลี้ยงรวม (บาท)</th>
                  <th style="background: #fff; font-weight: 700; text-align: center; padding: 3px;">ค่าพัสดุรวม (บาท)</th>
                  <th style="background: #fff; font-weight: 700; text-align: center; padding: 3px;">ค่าระยะทางรวม (บาท)</th>
                  <th style="background: #fff; font-weight: 700; text-align: center; padding: 3px;">ค่าเที่ยวรถรวม (บาท)</th>
                  <th style="background: #fff; font-weight: 700; text-align: center; padding: 3px;">ค่าใช้จ่ายรวม (บาท)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="text-align: center;">
                  <td style="padding: 3px;">${summary.totalTrips}</td>
                  <td style="padding: 3px;">${formatNumberForPDF(filteredRecords.reduce((sum, r) => sum + (r.allowance || 0), 0))}</td>
                  <td style="padding: 3px;">${formatNumberForPDF(filteredRecords.reduce((sum, r) => sum + (r.suppliesCost || 0), 0))}</td>
                  <td style="padding: 3px;">${formatNumberForPDF(filteredRecords.reduce((sum, r) => sum + (r.calculatedDistanceCost || 0), 0))}</td>
                  <td style="padding: 3px;">${formatNumberForPDF(filteredRecords.reduce((sum, r) => sum + (r.tripFee || 0), 0))}</td>
                  <td style="padding: 3px;">${formatNumberForPDF(summary.totalCosts)}</td>
                </tr>
              </tbody>
            </table>
            <div style="margin-top: 6px; padding: 4px; background-color: #f5f5f5; border-radius: 4px; text-align: center;">
              <p style="font-size: 11px; color: #555; font-style: italic; margin: 0;">
                * หมายเหตุ: ค่าระยะทาง คำนวณจากระยะทางรวมทั้งเดือน โดย 0-${freeDistanceThreshold.toLocaleString('th-TH')} กม.แรก ไม่คิดค่าระยะทาง และตั้งแต่ ${(freeDistanceThreshold+1).toLocaleString('th-TH')} กม. ขึ้นไป คิดค่าระยะทาง × ${distanceRate} บาท/กม.
              </p>
            </div>
          </div>
        ` : `
          <div style="text-align: center; margin-bottom: 15px;">
            <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: black;">รายงานคนขับรถ (ต่อ)</h3>
            <p style="font-size: 14px; margin: 5px 0; color: black;">${monthName} ${yearDisplay}</p>
          </div>
        `;

        return `
          <div style="font-family: 'Sarabun', Arial, sans-serif; width: 900px; background: white; padding: 20px; color: black;">
            ${headerSection}
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead>
                <tr>
                  <th style="border: 1px solid #000; padding: 4px; width: 8%;">วันที่เดินทาง</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 8%;">คนขับ</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 8%;">ทะเบียนรถ</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 8%;">ยี่ห้อ รุ่น</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 6%;">ประเภทรถ</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 10%;">ลูกค้า</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 6%;">ระยะทางจริง (กม.)</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 6%;">ระยะทางระบบ (กม.)</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 8%;">จ่ายคนขับ (บาท)</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 8%;">ค่าเที่ยวรถ (บาท)</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 8%;">ค่าใช้จ่ายรวม (บาท)</th>
                  <th style="border: 1px solid #000; padding: 4px; width: 10%;">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                ${recordsSubset.map((record, index) => {
                  const driverPay = (record.allowance || 0) + (record.suppliesCost || 0) + (record.calculatedDistanceCost || 0);
                  return `
                    <tr>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${format(new Date(record.tripDate), 'dd/MM/yyyy')}</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${record.driverName || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${record.vehicle?.licensePlate || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${record.vehicle?.brand || ''} ${record.vehicle?.model || ''}</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${record.vehicle?.vehicleType || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${record.departureLocation || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${formatNumberForPDF(record.actualDistance || 0)}</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${formatNumberForPDF(record.estimatedDistance || 0)}</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${formatNumberForPDF(driverPay)}</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${formatNumberForPDF(record.tripFee || 0)}</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${formatNumberForPDF(record.totalCosts || 0)}</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">${record.remark || '-'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      };

      // แบ่งข้อมูลเป็นหน้าๆ
      const mainReportChunks: Array<{ records: TripRecord[], startIndex: number, isFirstPage: boolean }> = [];
      const records = filteredRecords;
      
      if (records.length > 0) {
        let currentIndex = 0;
        let remainingRecords = [...records];
        
        // หน้าแรก: Header + Summary + Table (ประมาณ 15 แถว)
        const firstPageSize = 18; 
        const firstChunk = remainingRecords.slice(0, Math.min(firstPageSize, remainingRecords.length));
        mainReportChunks.push({ records: firstChunk, startIndex: currentIndex, isFirstPage: true });
        currentIndex += firstChunk.length;
        remainingRecords = remainingRecords.slice(firstChunk.length);

        // หน้าถัดไป: Header (เล็ก) + Table (ประมาณ 25 แถว)
        const otherPageSize = 25;
        while (remainingRecords.length > 0) {
          const chunk = remainingRecords.slice(0, Math.min(otherPageSize, remainingRecords.length));
          mainReportChunks.push({ records: chunk, startIndex: currentIndex, isFirstPage: false });
          currentIndex += chunk.length;
          remainingRecords = remainingRecords.slice(chunk.length);
        }
      } else {
         // กรณีไม่มีข้อมูล สร้างหน้าเปล่าๆ หรือหน้าที่มีแต่ header
         mainReportChunks.push({ records: [], startIndex: 0, isFirstPage: true });
      }

      // สร้าง Canvas สำหรับแต่ละหน้า
      const mainReportPages: HTMLCanvasElement[] = [];
      for (const chunk of mainReportChunks) {
        const html = createMainReportHTML(chunk.records, chunk.startIndex, chunk.isFirstPage);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        document.body.appendChild(tempDiv);
        
        await document.fonts.ready;
        
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          allowTaint: true,
          logging: false,
          imageTimeout: 0,
          removeContainer: true
        });
        
        document.body.removeChild(tempDiv);
        mainReportPages.push(canvas);
      }

      const doc = new jsPDF('p', 'mm', 'a4');

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2 - 12; // เผื่อ footer

      const printDate = format(new Date(), 'dd/MM/yyyy HH:mm:ss');

      let currentPageNumber = 1;
      
      // เพิ่มหน้า Main Report ลง PDF
      for (let i = 0; i < mainReportPages.length; i++) {
        if (i > 0) doc.addPage();
        const canvas = mainReportPages[i];
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, contentWidth, imgHeight);
        currentPageNumber++;
      }

      // นับจำนวนหน้ารายละเอียดก่อน
      const selectedDriverRecords = filteredRecords.filter(record => 
        record.driverName === filters.driverName
      );

      // เพิ่มหน้าที่ 2: รายละเอียดการเดินทางของคนขับ
      const detailStartPage = currentPageNumber;
      doc.addPage();

      if (selectedDriverRecords.length > 0) {
        const monthName = months.find(m => m.value === filters.month)?.label || filters.month;
        const yearDisplay = parseInt(filters.year) + 543;
        
        const totalDistance = selectedDriverRecords.reduce((sum, r) => sum + (r.actualDistance || r.estimatedDistance || 0), 0);
        const totalCosts = selectedDriverRecords.reduce((sum, r) => sum + (r.totalCosts || 0), 0);
        const totalFuelCost = selectedDriverRecords.reduce((sum, r) => sum + (r.fuelCost || 0), 0);
        const totalTolls = selectedDriverRecords.reduce((sum, r) => sum + (r.tolls || 0), 0);
        const totalAllowance = selectedDriverRecords.reduce((sum, r) => sum + (r.allowance || 0), 0);
        const totalDistanceCheckFee = selectedDriverRecords.reduce((sum, r) => sum + (r.distanceCheckFee || 0), 0);
        const totalCalculatedDistanceCost = selectedDriverRecords.reduce((sum, r) => sum + (r.calculatedDistanceCost || 0), 0);
        const totalRepairCost = selectedDriverRecords.reduce((sum, r) => sum + (r.repairCost || 0), 0);
        const totalSuppliesCost = selectedDriverRecords.reduce((sum, r) => sum + (r.suppliesCost || 0), 0);

        // สร้าง header และ summary section
        const createHeaderAndSummaryHTML = () => {
          return `
            <div style="font-family: 'Sarabun', Arial, sans-serif; width: 900px; background: white; padding: 20px; color: black;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: black;">รายละเอียดการเดินทาง - ${filters.driverName}</h2>
                <p style="font-size: 16px; margin: 10px 0; color: black;">${monthName} ${yearDisplay}</p>
              </div>
              
              <div style="margin-bottom: 25px;">
                <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 15px; color: black;">สรุปการเดินทาง</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; font-size: 14px; color: black;">
                  <div>• จำนวนเที่ยว: ${selectedDriverRecords.length} เที่ยว</div>
                  <div>• ระยะทางจริงรวม: ${formatNumberForPDF(selectedDriverRecords.reduce((sum, r) => sum + (r.actualDistance || 0), 0))} กม.</div>
                  <div>• ระยะทางระบบรวม: ${formatNumberForPDF(selectedDriverRecords.reduce((sum, r) => sum + (r.estimatedDistance || 0), 0))} กม.</div>
                  ${totalAllowance > 0 ? `<div>• ค่าเบี้ยเลี้ยง: ${formatNumberForPDF(totalAllowance)} บาท</div>` : ''}
                  ${totalSuppliesCost > 0 ? `<div>• ค่าพัสดุนำกลับ: ${formatNumberForPDF(totalSuppliesCost)} บาท</div>` : ''}
                  ${totalCalculatedDistanceCost > 0 ? `<div>• ค่าระยะทาง: ${formatNumberForPDF(totalCalculatedDistanceCost)} บาท</div>` : ''}
                  ${selectedDriverRecords.reduce((sum, r) => sum + (r.tripFee || 0), 0) > 0 ? `<div>• ค่าเที่ยวรถ: ${formatNumberForPDF(selectedDriverRecords.reduce((sum, r) => sum + (r.tripFee || 0), 0))} บาท</div>` : ''}
                </div>
                <div style="margin-top: 15px; font-size: 16px; color: black; font-weight: 700; text-align: center; border: 2px solid #000; padding: 10px;">
                  รวมค่าใช้จ่ายทั้งหมด: ${formatNumberForPDF(totalCosts)} บาท
                </div>
              </div>
              
              <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px; color: black;">รายละเอียดแต่ละเที่ยว</h3>
            </div>
          `;
        };

        // สร้าง table header สำหรับหน้าต่อๆ ไป
        const createTableHeaderHTML = () => {
          return `
            <div style="font-family: 'Sarabun', Arial, sans-serif; width: 900px; background: white; padding: 10px 20px; color: black;">
              <div style="text-align: center; margin-bottom: 15px;">
                <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: black;">รายละเอียดการเดินทาง - ${filters.driverName} (ต่อ)</h3>
                <p style="font-size: 14px; margin: 5px 0; color: black;">${monthName} ${yearDisplay}</p>
              </div>
            </div>
          `;
        };

        // สร้าง block สำหรับแต่ละเที่ยว
        const createTripBlockHTML = (record: TripRecord, index: number) => {
          const allowance = record.allowance || 0;
          const repairCost = record.repairCost || 0;
          const suppliesCost = record.suppliesCost || 0;
          const distanceCheckFee = record.distanceCheckFee || 0;
          const calculatedDistanceCost = record.calculatedDistanceCost || 0;
          const fuelCost = record.fuelCost || 0;
          const tolls = record.tolls || 0;
          const tripTotal = record.totalCosts || 0;
          
          const tripDate = new Date(record.tripDate);
          const departureDate = `${tripDate.getDate().toString().padStart(2, '0')}/${(tripDate.getMonth() + 1).toString().padStart(2, '0')}/${tripDate.getFullYear() + 543}`;
          
          let returnDateStr = '';
          if (record.returnDate && record.returnDate.trim() !== '') {
            try {
              const returnDateObj = new Date(record.returnDate);
              if (!isNaN(returnDateObj.getTime())) {
                const returnDateFormatted = `${returnDateObj.getDate().toString().padStart(2, '0')}/${(returnDateObj.getMonth() + 1).toString().padStart(2, '0')}/${returnDateObj.getFullYear() + 543}`;
                if (returnDateFormatted !== departureDate) {
                  returnDateStr = ` - ${returnDateFormatted}`;
                }
              }
            } catch (e) {
              // ignore
            }
          }
          const travelPeriod = `${departureDate}${returnDateStr}`;
          const destination = record.departureLocation || record.arrivalLocation || '-';
          const licensePlate = record.vehicle?.licensePlate || '-';
          
          return `
            <div style="font-family: 'Sarabun', Arial, sans-serif; width: 900px; background: white; padding: 2px 20px; color: black;">
              <div style="margin-bottom: 6px; border: 1px solid #000; padding: 6px 8px; background: ${index % 2 === 0 ? '#fafafa' : '#f0f0f0'};">
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; font-size: 11px; color: black; line-height: 1.3;">
                  <div>• <strong>เดินทาง:</strong> ${travelPeriod}</div>
                  <div>• <strong>ปลายทาง:</strong> ${destination}</div>
                  <div>• <strong>ทะเบียนรถ:</strong> ${licensePlate}</div>
                  <div>• <strong>ระยะทางจริง:</strong> ${formatNumberForPDF(record.actualDistance || 0)} กม.</div>
                  <div>• <strong>ระยะทางระบบ:</strong> ${formatNumberForPDF(record.estimatedDistance || 0)} กม.</div>
                  <div>• <strong>เบี้ยเลี้ยง:</strong> ${formatNumberForPDF(allowance)} ฿</div>
                  <div>• <strong>ค่าพัสดุ:</strong> ${formatNumberForPDF(suppliesCost)} ฿</div>
                  <div>• <strong>ค่าระยะทาง:</strong> ${formatNumberForPDF(calculatedDistanceCost)} ฿</div>
                  <div>• <strong>ค่าเที่ยวรถ:</strong> ${formatNumberForPDF(record.tripFee || 0)} ฿</div>
                  <div style="grid-column: span 3;"><strong>รวมทั้งหมด:</strong> ${formatNumberForPDF(tripTotal)} ฿</div>
                  <div style="grid-column: span 4;"><strong>หมายเหตุ:</strong> ${record.remark || '-'}</div>
                </div>
              </div>
            </div>
          `;
        };

        // Pre-render header และ summary
        const headerHTML = createHeaderAndSummaryHTML();
        const headerTempDiv = document.createElement('div');
        headerTempDiv.innerHTML = headerHTML;
        headerTempDiv.style.position = 'absolute';
        headerTempDiv.style.left = '-9999px';
        headerTempDiv.style.top = '0';
        headerTempDiv.style.width = '900px';
        headerTempDiv.style.backgroundColor = '#ffffff';
        document.body.appendChild(headerTempDiv);

        await new Promise(resolve => setTimeout(resolve, 30));
        await document.fonts.ready;
        
        const headerCanvas = await html2canvas(headerTempDiv, {
          scale: 1.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          allowTaint: true,
          logging: false,
          imageTimeout: 5000,
          removeContainer: false,
          width: 900
        });

        document.body.removeChild(headerTempDiv);

        const headerImgHeight = (headerCanvas.height * contentWidth) / headerCanvas.width;

        // Pre-render table header สำหรับหน้าต่อไป
        const tableHeaderHTML = createTableHeaderHTML();
        const tableHeaderTempDiv = document.createElement('div');
        tableHeaderTempDiv.innerHTML = tableHeaderHTML;
        tableHeaderTempDiv.style.position = 'absolute';
        tableHeaderTempDiv.style.left = '-9999px';
        tableHeaderTempDiv.style.top = '0';
        tableHeaderTempDiv.style.width = '900px';
        tableHeaderTempDiv.style.backgroundColor = '#ffffff';
        document.body.appendChild(tableHeaderTempDiv);

        await new Promise(resolve => setTimeout(resolve, 30));
        await document.fonts.ready;
        
        const tableHeaderCanvas = await html2canvas(tableHeaderTempDiv, {
          scale: 1.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          allowTaint: true,
          logging: false,
          imageTimeout: 5000,
          removeContainer: false,
          width: 900
        });

        document.body.removeChild(tableHeaderTempDiv);

        const tableHeaderImgHeight = (tableHeaderCanvas.height * contentWidth) / tableHeaderCanvas.width;

        // Pre-render แต่ละ trip block
        const tripBlocks: { record: TripRecord; index: number; canvas: HTMLCanvasElement; height: number }[] = [];
        
        for (let i = 0; i < selectedDriverRecords.length; i++) {
          const record = selectedDriverRecords[i];
          const blockHTML = createTripBlockHTML(record, i);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = blockHTML;
          tempDiv.style.position = 'absolute';
          tempDiv.style.left = '-9999px';
          tempDiv.style.top = '0';
          tempDiv.style.width = '900px';
          tempDiv.style.backgroundColor = '#ffffff';
          document.body.appendChild(tempDiv);

          await new Promise(resolve => setTimeout(resolve, 20));
          await document.fonts.ready;
          
          const canvas = await html2canvas(tempDiv, {
            scale: 1.5,
            useCORS: true,
            backgroundColor: '#ffffff',
            allowTaint: true,
            logging: false,
            imageTimeout: 5000,
            removeContainer: false,
            width: 900
          });

          document.body.removeChild(tempDiv);

          const imgHeight = (canvas.height * contentWidth) / canvas.width;
          
          tripBlocks.push({
            record,
            index: i,
            canvas,
            height: imgHeight
          });
        }

        // วาง blocks ลง PDF
        const maxPageHeight = pageHeight - margin * 2 - 15;
        let currentY = margin;
        let isFirstPage = true;

        // วาง header ก่อน (เฉพาะหน้าแรก)
        doc.addImage(headerCanvas.toDataURL('image/png'), 'PNG', margin, currentY, contentWidth, headerImgHeight);
        currentY += headerImgHeight;
        
        // วาง trip blocks
        for (let i = 0; i < tripBlocks.length; i++) {
          const block = tripBlocks[i];
          
          // ถ้า block ปัจจุบันไม่พอที่จะใส่ในหน้านี้ ให้ขึ้นหน้าใหม่
          if (currentY + block.height > pageHeight - margin - 15) {
            currentPageNumber++;
            doc.addPage();
            currentY = margin;
            isFirstPage = false;
            
            // วาง table header ในหน้าใหม่
            doc.addImage(tableHeaderCanvas.toDataURL('image/png'), 'PNG', margin, currentY, contentWidth, tableHeaderImgHeight);
            currentY += tableHeaderImgHeight;
          }
          
          // วาง block ลงในตำแหน่งปัจจุบัน
          doc.addImage(block.canvas.toDataURL('image/png'), 'PNG', margin, currentY, contentWidth, block.height);
          currentY += block.height;
        }

        currentPageNumber++; // นับหน้าสุดท้าย
      }

      // ตอนนี้รู้จำนวนหน้าทั้งหมดแล้ว เขียน footer ทุกหน้า
      const totalPages = currentPageNumber - 1;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.text(`Print Date: ${printDate}`, margin, pageHeight - 6);
        doc.text(`Page ${p}/${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
      }

      const today = new Date();
      const yearThai = today.getFullYear() + 543;
      const monthStr = filters.month.padStart(2, '0');
      const fileName = `driver-report-${filters.driverName || 'all'}-${yearThai}-${monthStr}.pdf`;

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

  // Export PDF สำหรับคนขับทั้งหมด (สรุป + รายละเอียดแต่ละคน)
  const exportAllDriversPDF = async ({ mode = 'download' }: ExportModeOptions = {}) => {
    try {
      setIsExporting(true);

      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      // จัดกลุ่มข้อมูลตามคนขับ (เฉพาะ driver_name จาก trip records)
      const driverGroups = filteredRecords.reduce((groups, record) => {
        const driverName = record.driverName || 'ไม่ระบุ';
        if (!groups[driverName]) {
          groups[driverName] = [];
        }
        groups[driverName].push(record);
        return groups;
      }, {} as Record<string, TripRecord[]>);

      const driverList = Object.keys(driverGroups);
      const monthName = months.find(m => m.value === filters.month)?.label || filters.month;
      const yearDisplay = parseInt(filters.year) + 543;

      // คำนวณค่ารวมทั้งหมดใหม่เพื่อให้แน่ใจว่าถูกต้อง
      const grandTotalDistance = Object.values(driverGroups).reduce((total, records) => {
        const groupTotal = records.reduce((sum, r) => sum + (r.actualDistance || r.estimatedDistance || 0), 0);
        return total + groupTotal;
      }, 0);

      // สร้าง HTML template แบบไดนามิก
      // ฟังก์ชันสร้าง table header สำหรับใช้ซ้ำในแต่ละหน้า
      const createTableHeader = () => {
        return `
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="border: 1px solid #000; padding: 8px; text-align: center; color: black;">ลำดับ</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left; color: black;">คนขับ</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; color: black;">จำนวนเที่ยว</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; color: black;">ระยะทางจริงรวม (กม.)</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; color: black;">ระยะทางระบบรวม (กม.)</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; color: black;">ค่าเบี้ยเลี้ยงรวม (บาท)</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; color: black;">ค่าพัสดุนำกลับรวม (บาท)</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; color: black;">ค่าระยะทางรวม (บาท)</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; color: black;">ค่าเที่ยวรถรวม (บาท)</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; color: black;">ค่าใช้จ่ายรวม (บาท)</th>
            </tr>
          </thead>
        `;
      };

      const createDriverSummaryHTML = (includeHeader: boolean = true, driversSubset: string[] = driverList, startIndex: number = 0) => {
        const headerSection = includeHeader ? `
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: black;">รายงานคนขับรถ - สรุปทั้งหมด</h2>
            <p style="font-size: 16px; margin: 10px 0; color: black;">${monthName} ${yearDisplay}</p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 10px; color: black;">สรุปรวมทั้งหมด</h3>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; font-size: 14px; color: black;">
              <span>จำนวนคนขับ: ${driverList.length} คน</span>
              <span>จำนวนเที่ยว: ${summary.totalTrips} เที่ยว</span>
              <span>ระยะทางจริงรวม: ${formatNumberForPDF(filteredRecords.reduce((sum, r) => sum + (r.actualDistance || 0), 0))} กม.</span>
              <span>ระยะทางระบบรวม: ${formatNumberForPDF(filteredRecords.reduce((sum, r) => sum + (r.estimatedDistance || 0), 0))} กม.</span>
              ${filteredRecords.reduce((sum, r) => sum + (r.allowance || 0), 0) > 0 ? `<span>ค่าเบี้ยเลี้ยงรวม: ${formatNumberForPDF(filteredRecords.reduce((sum, r) => sum + (r.allowance || 0), 0))} บาท</span>` : ''}
              ${filteredRecords.reduce((sum, r) => sum + (r.suppliesCost || 0), 0) > 0 ? `<span>ค่าพัสดุนำกลับรวม: ${formatNumberForPDF(filteredRecords.reduce((sum, r) => sum + (r.suppliesCost || 0), 0))} บาท</span>` : ''}
              ${filteredRecords.reduce((sum, r) => sum + (r.calculatedDistanceCost || 0), 0) > 0 ? `<span>ค่าระยะทางรวม: ${formatNumberForPDF(filteredRecords.reduce((sum, r) => sum + (r.calculatedDistanceCost || 0), 0))} บาท</span>` : ''}
              ${filteredRecords.reduce((sum, r) => sum + (r.tripFee || 0), 0) > 0 ? `<span>ค่าเที่ยวรถรวม: ${formatNumberForPDF(filteredRecords.reduce((sum, r) => sum + (r.tripFee || 0), 0))} บาท</span>` : ''}
              <span style="font-weight: bold;">ค่าใช้จ่ายรวมทั้งหมด: ${formatNumberForPDF(summary.totalCosts)} บาท</span>
            </div>
          </div>
          
          <div>
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 15px; color: black;">สรุปแต่ละคน</h3>
          </div>
        ` : `
          <div style="text-align: center; margin-bottom: 20px;">
            <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: black;">รายงานคนขับรถ - สรุปทั้งหมด (ต่อ)</h3>
            <p style="font-size: 14px; margin: 8px 0; color: black;">${monthName} ${yearDisplay}</p>
          </div>
        `;

        return `
          <div style="font-family: 'Sarabun', Arial, sans-serif; width: 1200px; background: white; padding: 20px; color: black;">
            ${headerSection}
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              ${createTableHeader()}
              <tbody>
                ${driversSubset.map((driverName, subIndex) => {
                  const index = startIndex + subIndex;
                  const records = driverGroups[driverName];
                  const totalDistance = records.reduce((sum, r) => sum + (r.actualDistance || r.estimatedDistance || 0), 0);
                  const totalFuel = records.reduce((sum, r) => sum + (r.fuelAmount || 0), 0);
                  const totalCosts = records.reduce((sum, r) => sum + (r.totalCosts || 0), 0);
                  const avgDistance = totalDistance / records.length;
                  return `
                    <tr>
                      <td style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">${index + 1}</td>
                      <td style="border: 1px solid #000; padding: 6px; color: black;">${driverName}</td>
                      <td style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">${records.length}</td>
                      <td style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">${formatNumberForPDF(records.reduce((sum, r) => sum + (r.actualDistance || 0), 0))}</td>
                      <td style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">${formatNumberForPDF(records.reduce((sum, r) => sum + (r.estimatedDistance || 0), 0))}</td>
                      <td style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">${formatNumberForPDF(records.reduce((sum, r) => sum + (r.allowance || 0), 0))}</td>
                      <td style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">${formatNumberForPDF(records.reduce((sum, r) => sum + (r.suppliesCost || 0), 0))}</td>
                      <td style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">${formatNumberForPDF(records.reduce((sum, r) => sum + (r.calculatedDistanceCost || 0), 0))}</td>
                      <td style="border: 1px solid #000; padding: 6px; text-align: center; color: black;">${formatNumberForPDF(records.reduce((sum, r) => sum + (r.tripFee || 0), 0))}</td>
                      <td style="border: 1px solid #000; padding: 6px; text-align: center; color: black; font-weight: bold;">${formatNumberForPDF(totalCosts)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      };

      // สร้าง PDF
      const doc = new jsPDF('p', 'mm', 'a4');

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2 - 15; // เผื่อ footer
      
      const printDate = format(new Date(), 'dd/MM/yyyy HH:mm:ss');
      
      let currentPageNumber = 1;

      // แบ่งคนขับออกเป็น chunks เพื่อให้พอดีแต่ละหน้า
      // ใช้วิธี dynamic rendering โดยวัดความสูงจริง
      const driverChunks: Array<{ drivers: string[], startIndex: number, isFirstPage: boolean }> = [];
      
      // ถ้ามีคนขับไม่เกิน 10 คน ให้ใส่หน้าเดียว
      if (driverList.length <= 10) {
        driverChunks.push({ drivers: driverList, startIndex: 0, isFirstPage: true });
      } else {
        // แบ่งเป็นหลายหน้า: หน้าแรก 8 คน, หน้าถัดไป 15 คนต่อหน้า
        let remainingDrivers = [...driverList];
        let currentIndex = 0;
        
        // Chunk แรก (หน้าที่มี header + summary)
        const firstChunk = remainingDrivers.slice(0, Math.min(8, remainingDrivers.length));
        driverChunks.push({ drivers: firstChunk, startIndex: currentIndex, isFirstPage: true });
        currentIndex += firstChunk.length;
        remainingDrivers = remainingDrivers.slice(firstChunk.length);
        
        // Chunks ที่เหลือ (หน้าถัดไปมีเฉพาะตารางและ header)
        while (remainingDrivers.length > 0) {
          const chunk = remainingDrivers.slice(0, Math.min(15, remainingDrivers.length));
          driverChunks.push({ drivers: chunk, startIndex: currentIndex, isFirstPage: false });
          currentIndex += chunk.length;
          remainingDrivers = remainingDrivers.slice(chunk.length);
        }
      }
      
      // สร้างแต่ละหน้า
      const summaryPages: HTMLCanvasElement[] = [];
      
      for (const chunk of driverChunks) {
        const summaryHTML = createDriverSummaryHTML(chunk.isFirstPage, chunk.drivers, chunk.startIndex);
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
          backgroundColor: '#ffffff',
          allowTaint: true,
          logging: false,
          imageTimeout: 0,
          removeContainer: true
        });

        document.body.removeChild(tempDiv);
        summaryPages.push(summaryCanvas);
      }

      // เพิ่มหน้าสรุปทั้งหมดลง PDF
      for (let i = 0; i < summaryPages.length; i++) {
        if (i > 0) doc.addPage();
        
        const canvas = summaryPages[i];
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, contentWidth, imgHeight);
      }

      const summaryPagesCount = summaryPages.length;

      // หน้าที่ N+: รายละเอียดการเดินทางของแต่ละคนขับ (แบ่งหลายหน้าอัตโนมัติ)
      
      // สร้างเนื้อหารายละเอียดสำหรับคนขับแต่ละคน
      const createSingleDriverDetailHTML = (
        driverName: string, 
        driverIndex: number, 
        recordsSubset: TripRecord[],
        isFirstChunk: boolean,
        includeMainHeader: boolean
      ) => {
        const allRecords = driverGroups[driverName];
        const totalCosts = allRecords.reduce((sum, r) => sum + (r.totalCosts || 0), 0);
        const totalAllowance = allRecords.reduce((sum, r) => sum + (r.allowance || 0), 0);
        const totalCalculatedDistanceCost = allRecords.reduce((sum, r) => sum + (r.calculatedDistanceCost || 0), 0);
        const totalSuppliesCost = allRecords.reduce((sum, r) => sum + (r.suppliesCost || 0), 0);
        const totalTripFee = allRecords.reduce((sum, r) => sum + (r.tripFee || 0), 0);

        const headerHTML = includeMainHeader ? `
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="font-size: 16px; font-weight: 700; margin: 0; color: black;">รายงานคนขับรถ - รายละเอียดการเดินทาง</h2>
            <p style="font-size: 14px; margin: 8px 0; color: black;">${monthName} ${yearDisplay}</p>
          </div>
        ` : '';

        const driverHeaderHTML = isFirstChunk ? `
              <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color: black; border-bottom: 1px solid #000; padding-bottom: 4px;">
                ${driverIndex + 1}. ${driverName}
              </h3>
              
              <div style="margin-bottom: 8px; padding: 8px; background-color: #f5f5f5; border-radius: 3px;">
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; font-size: 12px; color: black;">
                  <div>จำนวนเที่ยว: ${allRecords.length} เที่ยว</div>
                  <div>ค่าเบี้ยเลี้ยง: ${formatNumberForPDF(totalAllowance)} บาท</div>
                  <div>ค่าพัสดุนำกลับ: ${formatNumberForPDF(totalSuppliesCost)} บาท</div>
                  <div>ค่าระยะทาง: ${formatNumberForPDF(totalCalculatedDistanceCost)} บาท</div>
                  <div>ค่าเที่ยวรถ: ${formatNumberForPDF(totalTripFee)} บาท</div>
                  <div style="grid-column: span 5; font-weight: bold; border-top: 1px solid #ccc; padding-top: 4px; margin-top: 4px;">รวมทั้งหมด: ${formatNumberForPDF(totalCosts)} บาท</div>
                </div>
              </div>
        ` : `
              <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color: black; border-bottom: 1px solid #000; padding-bottom: 4px;">
                ${driverIndex + 1}. ${driverName} (ต่อ)
              </h3>
        `;

        return `
          <div style="font-family: 'Sarabun', Arial, sans-serif; width: 900px; background: white; padding: 20px; color: black;">
            ${headerHTML}
            <div style="margin-bottom: 12px;">
              ${driverHeaderHTML}
              
              <ul style="list-style: none; padding: 0; margin: 0; font-size: 9px; color: black;">
                ${recordsSubset.map((record, index) => {
                  const tripDate = new Date(record.tripDate);
                  const departureDate = `${tripDate.getDate().toString().padStart(2, '0')}/${(tripDate.getMonth() + 1).toString().padStart(2, '0')}/${tripDate.getFullYear() + 543}`;
                  
                  let returnDateStr = '';
                  if (record.returnDate && record.returnDate.trim() !== '') {
                    const returnDate = new Date(record.returnDate);
                    returnDateStr = ` - ${returnDate.getDate().toString().padStart(2, '0')}/${(returnDate.getMonth() + 1).toString().padStart(2, '0')}/${returnDate.getFullYear() + 543}`;
                  }
                  const travelPeriod = `${departureDate}${returnDateStr}`;
                  
                  const destination = record.departureLocation || '-';
                  const licensePlate = record.vehicle?.licensePlate || '-';
                  
                  return `
                    <li style="margin-bottom: 3px; border: 1px solid #ccc; padding: 6px; background: ${index % 2 === 0 ? '#fafafa' : '#f0f0f0'};">
                      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; font-size: 12px; line-height: 1.3;">
                        <div><strong>วันที่:</strong> ${travelPeriod}</div>
                        <div><strong>ปลายทาง:</strong> ${destination}</div>
                        <div><strong>ทะเบียน:</strong> ${licensePlate}</div>
                        <div><strong>ระยะจริง:</strong> ${formatNumberForPDF(record.actualDistance || 0)} กม.</div>
                        
                        <div><strong>ระยะระบบ:</strong> ${formatNumberForPDF(record.estimatedDistance || 0)} กม.</div>
                        <div><strong>เบี้ยเลี้ยง:</strong> ${formatNumberForPDF(record.allowance || 0)} บาท</div>
                        <div><strong>ค่าพัสดุ:</strong> ${formatNumberForPDF(record.suppliesCost || 0)} บาท</div>
                        <div><strong>ค่าระยะทาง:</strong> ${formatNumberForPDF(record.calculatedDistanceCost || 0)} บาท</div>
                        
                        <div><strong>ค่าเที่ยวรถ:</strong> ${formatNumberForPDF(record.tripFee || 0)} บาท</div>
                        <div style="grid-column: span 3;"><strong>รวมทั้งหมด:</strong> ${formatNumberForPDF(record.totalCosts || 0)} บาท</div>
                        
                        <div style="grid-column: span 4;"><strong>หมายเหตุ:</strong> ${record.remark || '-'}</div>
                      </div>
                    </li>
                  `;
                }).join('')}
              </ul>
            </div>
          </div>
        `;
      };

      // Pre-render แต่ละ driver block เพื่อวัดความสูง
      const driverBlocks: { driverName: string; driverIndex: number; canvas: HTMLCanvasElement; height: number }[] = [];
      
      for (let i = 0; i < driverList.length; i++) {
        const driverName = driverList[i];
        const allRecords = driverGroups[driverName];
        
        let remainingRecords = [...allRecords];
        let chunkIndex = 0;
        
        // กำหนดจำนวนรายการต่อหน้า
        const firstChunkSize = 9; // หน้าแรกมี summary box (ลดลงเพื่อป้องกันล้นหน้า)
        const otherChunkSize = 11; // หน้าต่อๆ ไปมีแต่รายการ (ลดลงเพื่อป้องกันล้นหน้า)
        
        while (remainingRecords.length > 0) {
          const isFirstChunk = (chunkIndex === 0);
          const size = isFirstChunk ? firstChunkSize : otherChunkSize;
          const chunk = remainingRecords.slice(0, size);
          remainingRecords = remainingRecords.slice(size);
          
          const includeMainHeader = (i === 0 && isFirstChunk);
          
          const driverHTML = createSingleDriverDetailHTML(driverName, i, chunk, isFirstChunk, includeMainHeader);
          
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = driverHTML;
          tempDiv.style.position = 'absolute';
          tempDiv.style.left = '-9999px';
          tempDiv.style.top = '0';
          tempDiv.style.width = '900px';
          tempDiv.style.backgroundColor = '#ffffff';
          document.body.appendChild(tempDiv);

          await new Promise(resolve => setTimeout(resolve, 30));
          await document.fonts.ready;
          
          const canvas = await html2canvas(tempDiv, {
            scale: 1.5,
            useCORS: true,
            backgroundColor: '#ffffff',
            allowTaint: true,
            logging: false,
            imageTimeout: 5000,
            removeContainer: false,
            width: 900
          });

          document.body.removeChild(tempDiv);

          const imgHeight = (canvas.height * contentWidth) / canvas.width;
          
          driverBlocks.push({
            driverName,
            driverIndex: i,
            canvas,
            height: imgHeight
          });
          
          chunkIndex++;
        }
      }
      
      // คำนวณ layout ของแต่ละหน้าก่อน (เหมือน all-vehicle)
      const pdfPages: Array<{ blocks: typeof driverBlocks; startY: number }> = [];
      let currentPdfY = margin;
      let currentPageBlocks: typeof driverBlocks = [];
      const maxContentHeight = pageHeight - margin * 2 - 25; // เพิ่มพื้นที่ด้านล่างป้องกันทับเลขหน้า
      
      for (let i = 0; i < driverBlocks.length; i++) {
        const block = driverBlocks[i];
        
        // ตรวจสอบว่า block นี้พอดีในหน้าปัจจุบันหรือไม่
        if (currentPdfY + block.height > maxContentHeight) {
          // ไม่พอ บันทึกหน้าปัจจุบันและเริ่มหน้าใหม่
          if (currentPageBlocks.length > 0) {
            pdfPages.push({ blocks: [...currentPageBlocks], startY: margin });
          }
          currentPageBlocks = [block];
          currentPdfY = margin + block.height;
        } else {
          // พอดี เพิ่ม block เข้าหน้าปัจจุบัน
          currentPageBlocks.push(block);
          currentPdfY += block.height;
        }
      }
      
      // เพิ่มหน้าสุดท้าย
      if (currentPageBlocks.length > 0) {
        pdfPages.push({ blocks: [...currentPageBlocks], startY: margin });
      }
      
      // สร้าง PDF โดยรู้จำนวนหน้าทั้งหมดตั้งแต่ต้น
      const totalDetailPages = pdfPages.length;
      const totalPages = summaryPagesCount + totalDetailPages; // summary pages + detail pages
      
      // เขียน footer หน้า summary ทั้งหมด
      for (let i = 0; i < summaryPagesCount; i++) {
        doc.setPage(i + 1);
        doc.setFontSize(8);
        doc.text(`Print Date: ${printDate}`, margin, pageHeight - 6);
        doc.text(`Page ${i + 1}/${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
      }
      
      currentPageNumber = summaryPagesCount;
      
      // สร้างหน้ารายละเอียด
      for (let pageIdx = 0; pageIdx < pdfPages.length; pageIdx++) {
        doc.addPage();
        currentPageNumber++;
        
        const page = pdfPages[pageIdx];
        let yPos = page.startY;
        
        // วาง blocks ในหน้านี้
        for (const block of page.blocks) {
          doc.addImage(block.canvas.toDataURL('image/png'), 'PNG', margin, yPos, contentWidth, block.height);
          yPos += block.height;
        }
        
        // เขียน footer ทันที (รู้ totalPages แล้ว)
        doc.setFontSize(8);
        doc.text(`Print Date: ${printDate}`, margin, pageHeight - 6);
        const pageText = `Page ${currentPageNumber}/${totalPages}`;
        doc.text(pageText, pageWidth - margin, pageHeight - 6, { align: 'right' });
      }

      const today = new Date();
      const yearThai = today.getFullYear() + 543;
      const monthStr = filters.month.padStart(2, '0');
      const fileName = `driver-report-all-${yearThai}-${monthStr}.pdf`;

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

  // Handler for print action: generate PDF then open print dialog (single or all drivers)
  const handlePrintPDF = async () => {
    if (!filteredRecords || filteredRecords.length === 0) {
      showSnackbar('ไม่มีข้อมูลสำหรับพิมพ์', 'warning');
      return;
    }
    if (!filters.driverName) {
      await exportAllDriversPDF({ mode: 'print' });
    } else {
      await exportSingleDriverPDF({ mode: 'print' });
    }
  };

  // Helper function to get driver image based on driver name, driver type and vehicle data
  const getDriverImageByName = (driverName: string, driverType: string, vehicle: Vehicle) => {
    if (!driverName || !vehicle) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName || 'Unknown')}&background=607d8b&color=fff&size=128`;
    }

    // Attempt enrichment: sometimes tripRecords.vehicle is a trimmed object without latest driverImage
    let workingVehicle: Vehicle = vehicle;
    if ((!vehicle.driverImage || vehicle.driverImage === 'undefined') || (!vehicle.backupDriverImage || vehicle.backupDriverImage === 'undefined')) {
      const enriched = vehicles.find(v => v.id === vehicle.id);
      if (enriched) {
        workingVehicle = { ...enriched };
      }
    }

    // Normalize any image paths early (ensure they start with /uploads/driver/ if they look like filenames)
    const normalizePath = (p?: string) => {
      if (!p) return p;
      if (p.startsWith('http') || p.startsWith('/uploads/driver/')) return p; // already absolute or correct
      if (p.startsWith('/')) return p; // some other absolute path
      return `/uploads/driver/${p}`;
    };
    if (workingVehicle.driverImage) workingVehicle.driverImage = normalizePath(workingVehicle.driverImage);
    if (workingVehicle.backupDriverImage) workingVehicle.backupDriverImage = normalizePath(workingVehicle.backupDriverImage);
    
    // Strategy 1: Use driver_type to guide the search with new driver relations
    if (driverType === 'main' || driverType === 'primary') {
      // Look for main driver first using new relation
      const mainDriverData = workingVehicle.mainDriver;
      if (mainDriverData && mainDriverData.driverName === driverName) {
        const imagePath = mainDriverData.driverImage;
        
        if (imagePath && imagePath !== 'undefined' && imagePath !== 'null') {
          if (!imagePath.startsWith('/uploads/') && !imagePath.startsWith('http')) {
            return `/uploads/driver/${imagePath}`;
          }
          return imagePath;
        } else {
          return `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=0d47a1&color=fff&size=128`;
        }
      }
      
      // Fallback to legacy field
      if (workingVehicle.driverName === driverName) {
        const imagePath = workingVehicle.driverImage;
        
        if (imagePath && imagePath !== 'undefined' && imagePath !== 'null') {
          if (!imagePath.startsWith('/uploads/') && !imagePath.startsWith('http')) {
            return `/uploads/driver/${imagePath}`;
          }
          return imagePath;
        } else {
          return `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=0d47a1&color=fff&size=128`;
        }
      }
    } else if (driverType === 'backup' || driverType === 'secondary') {
      // Look for backup driver first using new relation
      const backupDriverData = workingVehicle.backupDriver;
      if (backupDriverData && backupDriverData.driverName === driverName) {
        const imagePath = backupDriverData.driverImage;
        
        if (imagePath && imagePath !== 'undefined' && imagePath !== 'null') {
          if (!imagePath.startsWith('/uploads/') && !imagePath.startsWith('http')) {
            return `/uploads/driver/${imagePath}`;
          }
          return imagePath;
        } else {
          return `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=f57c00&color=fff&size=128`;
        }
      }
      
      // Fallback to legacy field
      if (workingVehicle.backupDriverName === driverName) {
        const imagePath = workingVehicle.backupDriverImage;
        
        if (imagePath && imagePath !== 'undefined' && imagePath !== 'null') {
          if (!imagePath.startsWith('/uploads/') && !imagePath.startsWith('http')) {
            return `/uploads/driver/${imagePath}`;
          }
          return imagePath;
        } else {
          return `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=f57c00&color=fff&size=128`;
        }
      }
    }
    
    // Strategy 2: Fallback - check both positions regardless of type using new relations first
    // Check main driver using new relation
    const mainDriverData = workingVehicle.mainDriver;
    if (mainDriverData && mainDriverData.driverName === driverName) {
      const imagePath = mainDriverData.driverImage;
      
      if (imagePath && imagePath !== 'undefined' && imagePath !== 'null') {
        if (!imagePath.startsWith('/uploads/') && !imagePath.startsWith('http')) {
          return `/uploads/driver/${imagePath}`;
        }
        return imagePath;
      } else {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=0d47a1&color=fff&size=128`;
      }
    }
    
    // Check backup driver using new relation
    const backupDriverData = workingVehicle.backupDriver;
    if (backupDriverData && backupDriverData.driverName === driverName) {
      const imagePath = backupDriverData.driverImage;
      
      if (imagePath && imagePath !== 'undefined' && imagePath !== 'null') {
        if (!imagePath.startsWith('/uploads/') && !imagePath.startsWith('http')) {
          return `/uploads/driver/${imagePath}`;
        }
        return imagePath;
      } else {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=f57c00&color=fff&size=128`;
      }
    }
    
    // Legacy fallback - check old structure
    // Check main driver
    if (workingVehicle.driverName === driverName) {
      const imagePath = workingVehicle.driverImage;
      
      if (imagePath && imagePath !== 'undefined' && imagePath !== 'null') {
        if (!imagePath.startsWith('/uploads/') && !imagePath.startsWith('http')) {
          return `/uploads/driver/${imagePath}`;
        }
        return imagePath;
      } else {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=0d47a1&color=fff&size=128`;
      }
    }
    
    // Check backup driver
    if (workingVehicle.backupDriverName === driverName) {
      const imagePath = workingVehicle.backupDriverImage;
      
      if (imagePath && imagePath !== 'undefined' && imagePath !== 'null') {
        if (!imagePath.startsWith('/uploads/') && !imagePath.startsWith('http')) {
          return `/uploads/driver/${imagePath}`;
        }
        return imagePath;
      } else {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=f57c00&color=fff&size=128`;
      }
    }
    
    // Secondary check: trip_records.driver_name = vehicles.backupDriverName (actual field used)
    if (workingVehicle.backupDriverName === driverName) {
      const imagePath = workingVehicle.backupDriverImage;
      
      if (imagePath && imagePath !== 'undefined' && imagePath !== 'null') {
        // Ensure the path starts with /uploads/driver if it's just a filename
        if (!imagePath.startsWith('/uploads/') && !imagePath.startsWith('http')) {
          const fullPath = `/uploads/driver/${imagePath}`;
          return fullPath;
        }
        return imagePath;
      } else {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=f57c00&color=fff&size=128`;
      }
    }
    
    // Strategy 3: Fuzzy matching if exact match fails
    const normalizedSearchName = driverName.trim().toLowerCase();
    
    // Check main driver with fuzzy matching
    if (workingVehicle.driverName && workingVehicle.driverName.trim().toLowerCase().includes(normalizedSearchName)) {
      const imagePath = workingVehicle.driverImage;
      if (imagePath && imagePath !== 'undefined' && imagePath !== 'null') {
        if (!imagePath.startsWith('/uploads/') && !imagePath.startsWith('http')) {
          return `/uploads/driver/${imagePath}`;
        }
        return imagePath;
      } else {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=0d47a1&color=fff&size=128`;
      }
    }
    
    // Check backup driver with fuzzy matching
    if (workingVehicle.backupDriverName && workingVehicle.backupDriverName.trim().toLowerCase().includes(normalizedSearchName)) {
      const imagePath = workingVehicle.backupDriverImage;
      if (imagePath && imagePath !== 'undefined' && imagePath !== 'null') {
        if (!imagePath.startsWith('/uploads/') && !imagePath.startsWith('http')) {
          return `/uploads/driver/${imagePath}`;
        }
        return imagePath;
      } else {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=f57c00&color=fff&size=128`;
      }
    }
    
    // Strategy 4: Final fallback - no match found
    
    // Use driver type to determine placeholder color
    let backgroundColor = '#607d8b'; // Default gray
    if (driverType === 'main' || driverType === 'primary') {
      backgroundColor = '#0d47a1'; // Blue for main drivers
    } else if (driverType === 'backup' || driverType === 'secondary') {
      backgroundColor = '#f57c00'; // Orange for backup drivers
    } else if (driverType === 'other') {
      backgroundColor = '#2e7d32'; // Green for alternative drivers
    }
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=${backgroundColor.substring(1)}&color=fff&size=128`;
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

  // Get driver image by license number (since license is unique)
  const getDriverImageByLicense = async (driverLicense: string): Promise<string | null> => {
    if (!driverLicense || driverLicense.trim() === '') return null;
    
    try {
      const response = await fetch(`/api/drivers/by-license/${encodeURIComponent(driverLicense.trim())}`);
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      const driverImage = data.driver?.driverImage;
      
      return driverImage || null;
    } catch (error) {
      console.error('Error fetching driver by license:', error);
      return null;
    }
  };

  // Load driver images for all unique licenses in the current records
  const loadDriverImages = async (records: TripRecord[]) => {
    const uniqueLicenses = new Set<string>();
    
    // Collect all unique driver licenses
    records.forEach(record => {
      if (record.driverLicense && record.driverLicense.trim()) {
        uniqueLicenses.add(record.driverLicense.trim());
      }
    });

    // Load images for licenses we don't have cached
    const newImages = new Map(driverImages);
    const loadPromises: Promise<void>[] = [];

    uniqueLicenses.forEach(license => {
      if (!newImages.has(license)) {
        const loadPromise = getDriverImageByLicense(license).then(image => {
          if (image) {
            newImages.set(license, image);
          }
        });
        loadPromises.push(loadPromise);
      }
    });

    if (loadPromises.length > 0) {
      await Promise.all(loadPromises);
      setDriverImages(newImages);
    }
  };

  // Get cached driver image by license
  const getCachedDriverImage = (driverLicense?: string): string | null => {
    if (!driverLicense || !driverLicense.trim()) return null;
    return driverImages.get(driverLicense.trim()) || null;
  };

  return (
    <Layout showSidebar={false}>
      <Box>
        {/* Show loading overlay until all data is loaded */}
        {loading && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center',
            minHeight: '60vh',
            gap: 2
          }}>
            <CircularProgress size={48} />
            <Typography variant="h6" color="text.secondary">
              กำลังโหลดข้อมูล...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              โปรดรอสักครู่
            </Typography>
          </Box>
        )}
        
        {/* Main content - only show when not loading */}
        {!loading && (
          <>
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
            <Typography component="h2" sx={{ fontSize: 18, fontWeight: 700 , fontFamily: `'Sarabun', Arial, sans-serif`, textAlign: 'center'}}>
              รายงานคนขับรถ
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 500, fontFamily: `'Sarabun', Arial, sans-serif`, whiteSpace: 'pre-line' , textAlign: 'center' }}>
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
    
    const driverText = filters.driverName 
      ? `คนขับ: ${filters.driverName}`
      : 'คนขับ: ทั้งหมด';
    return `${driverText}`;
  })()
  }
</Typography>
          </Box>
          
          {/* Summary */}
          <Box className="section">
            <table className="table" style={{ fontSize: '14px', width: '100%', margin: '0 auto' }}>
              <thead>
                <tr>
                  <th>จำนวนเที่ยว</th>                 
                  <th>ค่าเบี้ยเลี้ยงรวม (บาท)</th>
                  <th>ค่าพัสดุรวม (บาท)</th>
                  <th>ค่าระยะทางรวม (บาท)</th>
                  <th>ค่าเที่ยวรถรวม (บาท)</th>
                  <th>ค่าใช้จ่ายรวม (บาท)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ textAlign: 'center' }}>
                  <td>{summary.totalTrips}</td>                 
                  <td>
                    {(() => {
                      const totalAllowance = filteredRecords.reduce((sum, record) => sum + (record.allowance || 0), 0);
                      return totalAllowance.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const totalSuppliesCost = filteredRecords.reduce((sum, record) => sum + (record.suppliesCost || 0), 0);
                      return totalSuppliesCost.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const totalDistanceCost = filteredRecords.reduce((sum, record) => sum + (record.calculatedDistanceCost || 0), 0);
                      return totalDistanceCost.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const totalTripFee = filteredRecords.reduce((sum, record) => sum + (record.tripFee || 0), 0);
                      return totalTripFee.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                    })()}
                  </td>
                  <td>{summary.totalCosts.toLocaleString('th-TH', { maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
            {/* คำแนะนำการคำนวณค่าระยะทาง */}
            <Box sx={{ marginTop: '6px', padding: '4px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <Typography sx={{ fontSize: 11, fontFamily: `'Sarabun', Arial, sans-serif`, color: '#555', textAlign: 'center', fontStyle: 'italic' }}>
              * หมายเหตุ: ค่าระยะทาง คำนวณจากระยะทางรวมทั้งเดือน โดย 0-{freeDistanceThreshold.toLocaleString('th-TH')} กม.แรก ไม่คิดค่าระยะทาง และตั้งแต่ {(freeDistanceThreshold+1).toLocaleString('th-TH') } กม. ขึ้นไป คิดค่าระยะทาง × {distanceRate} บาท/กม.
            </Typography>
            </Box>
          </Box>

          {/* Detailed Data */}
          <Box className="section" style={{ marginTop: '8px' }}>
            <table className="table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '8%' }}>วันที่เดินทาง</th>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '8%' }}>คนขับ</th>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '8%' }}>ทะเบียนรถ</th>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '10%' }}>ลูกค้า</th>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '6%' }}>ระยะทางจริง (กม.)</th>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '6%' }}>ระยะทางระบบ (กม.)</th>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '8%' }}>ค่าเบี้ยเลี้ยง (บาท)</th>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '8%' }}>ค่าพัสดุ (บาท)</th>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '8%' }}>ค่าระยะทาง (บาท)</th>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '8%' }}>ค่าเที่ยวรถ (บาท)</th>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '8%' }}>รวมทั้งหมด (บาท)</th>
                  <th style={{ border: '1px solid #000', padding: '8px', width: '10%' }}>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, index) => (
                  <tr key={`${record.id}-${index}`}>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '12px' }}>
                      {format(new Date(record.tripDate), 'dd/MM/yyyy')}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '12px' }}>
                      {record.driverName || '-'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '12px' }}>
                      {record.vehicle?.licensePlate || '-'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '12px' }}>
                      {record.departureLocation || '-'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '12px' }}>
                      {(record.actualDistance || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '12px' }}>
                      {(record.estimatedDistance || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontSize: '12px' }}>
                      {(record.allowance || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontSize: '12px' }}>
                      {(record.suppliesCost || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontSize: '12px' }}>
                      {(record.calculatedDistanceCost || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontSize: '12px' }}>
                      {(record.tripFee || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontSize: '12px' }}>
                      {(record.totalCosts || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '12px' }}>
                      {record.remark || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <td colSpan={4} style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                    รวมทั้งหมด:
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 700, fontSize: '12px' }}>
                    {(() => {
                      const totalActualDistance = filteredRecords.reduce((sum, record) => sum + (record.actualDistance || 0), 0);
                      return totalActualDistance.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                    })()}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 700, fontSize: '12px' }}>
                    {(() => {
                      const totalEstimatedDistance = filteredRecords.reduce((sum, record) => sum + (record.estimatedDistance || 0), 0);
                      return totalEstimatedDistance.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                    })()}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                    {(() => {
                      const totalAllowance = filteredRecords.reduce((sum, record) => sum + (record.allowance || 0), 0);
                      return totalAllowance.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                    })()}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                    {(() => {
                      const totalSuppliesCost = filteredRecords.reduce((sum, record) => sum + (record.suppliesCost || 0), 0);
                      return totalSuppliesCost.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                    })()}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                    {(() => {
                      const totalDistanceCost = filteredRecords.reduce((sum, record) => sum + (record.calculatedDistanceCost || 0), 0);
                      return totalDistanceCost.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                    })()}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                    {(() => {
                      const totalTripFee = filteredRecords.reduce((sum, record) => sum + (record.tripFee || 0), 0);
                      return totalTripFee.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                    })()}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                    {summary.totalCosts.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}></td>
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
              รายงานคนขับรถ
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

            {/* Filter 1: เลือกคนขับ */}
            <FormControl fullWidth size="small">
              <InputLabel>เลือกคนขับ</InputLabel>
              <Select
                value={filters.driverName}
                label="เลือกคนขับ"
                onChange={(e) => setFilters(prev => ({ ...prev, driverName: e.target.value }))}
              >
                <MenuItem value="">-- ทั้งหมด --</MenuItem>
                {drivers.length === 0 && (
                  <MenuItem disabled value="">
                    {loading ? 'กำลังโหลด...' : 'ไม่มีข้อมูลคนขับ'}
                  </MenuItem>
                )}
                {drivers.map((driverName) => (
                  <MenuItem key={driverName} value={driverName}>
                    {driverName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(8, 1fr)' }, gap: 2, mb: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {summary.totalTrips}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              จำนวนเที่ยวทั้งหมด
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="info.main">
              {(() => {
                const totalActualDistance = filteredRecords.reduce((sum, record) => sum + (record.actualDistance || 0), 0);
                return totalActualDistance.toLocaleString('th-TH', { maximumFractionDigits: 1 });
              })()} กม.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              ระยะทางจริงรวม
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="secondary.main">
              {(() => {
                const totalEstimatedDistance = filteredRecords.reduce((sum, record) => sum + (record.estimatedDistance || 0), 0);
                return totalEstimatedDistance.toLocaleString('th-TH', { maximumFractionDigits: 1 });
              })()} กม.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              ระยะทางระบบรวม
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main">
              {(() => {
                const totalAllowance = filteredRecords.reduce((sum, record) => sum + (record.allowance || 0), 0);
                return totalAllowance.toLocaleString('th-TH', { maximumFractionDigits: 0 });
              })()} บาท
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              ค่าเบี้ยเลี้ยง
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main">
              {(() => {
                const totalSuppliesCost = filteredRecords.reduce((sum, record) => sum + (record.suppliesCost || 0), 0);
                return totalSuppliesCost.toLocaleString('th-TH', { maximumFractionDigits: 0 });
              })()} บาท
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              ค่าพัสดุนำกลับ
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main">
              {(() => {
                const totalDistanceCost = filteredRecords.reduce((sum, record) => sum + (record.calculatedDistanceCost || 0), 0);
                return totalDistanceCost.toLocaleString('th-TH', { maximumFractionDigits: 0 });
              })()} บาท
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              ค่าระยะทาง
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="info.main">
              {(() => {
                const totalTripFee = filteredRecords.reduce((sum, record) => sum + (record.tripFee || 0), 0);
                return totalTripFee.toLocaleString('th-TH', { maximumFractionDigits: 0 });
              })()} บาท
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              ค่าเที่ยวรถ
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="success.main">
              {summary.totalCosts.toLocaleString('th-TH', { maximumFractionDigits: 0 })} บาท
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              ค่าใช้จ่ายรวม
            </Typography>
          </Paper>
        </Box>

        {/* คำแนะนำการคำนวณค่าระยะทาง */}
        <Paper sx={{ p: 1.5, mb: 3, backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <InfoIcon sx={{ color: 'info.main', fontSize: 20, mt: 0.2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
              <strong>หมายเหตุ:</strong> ค่าระยะทางคำนวณจากระยะทางรวมทั้งเดือน โดย <strong>0-{freeDistanceThreshold.toLocaleString('th-TH')} กม.แรก ไม่คิดค่าระยะทาง</strong> และ <strong>ตั้งแต่ {(freeDistanceThreshold+1).toLocaleString('th-TH') } กม. ขึ้นไป คิดค่าระยะทาง × {distanceRate} บาท/กม.</strong>
            </Typography>
          </Box>
        </Paper>

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
                <PersonIcon sx={{ fontSize: '4rem', color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  ไม่พบข้อมูลการเดินทาง
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
                      <TableCell>วันที่เดินทาง</TableCell>
                      <TableCell>คนขับ</TableCell>
                      <TableCell>รถ</TableCell>
                      <TableCell>ลูกค้า</TableCell>
                      <TableCell align="right">ระยะทางจริง</TableCell>
                      <TableCell align="right">ระยะทางระบบ</TableCell>
                      <TableCell align="right">ค่าเบี้ยเลี้ยง</TableCell>
                      <TableCell align="right">ค่าพัสดุนำกลับ</TableCell>
                      <TableCell align="right">ค่าระยะทาง</TableCell>
                      <TableCell align="right">ค่าเที่ยวรถ</TableCell>
                      <TableCell align="right">รวมทั้งหมด</TableCell>
                      <TableCell>หมายเหตุ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRecords.map((record, index) => (
                      <TableRow key={`${record.id}-${index}`} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(record.tripDate), 'dd/MM/yyyy')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar
                                src={getImageUrl((() => {
                                  // Use driver license to lookup image (since license is unique)
                                  const cachedImage = getCachedDriverImage(record.driverLicense);
                                  if (cachedImage) {
                                    return cachedImage;
                                  }
                                  
                                  // Fallback to ui-avatars using trip_records name as primary
                                  return `https://ui-avatars.com/api/?name=${encodeURIComponent(record.driverName || '?')}&background=607d8b&color=fff&size=128`;
                                })())}
                                sx={{ width: 48, height: 48, mr: 2, bgcolor: 'secondary.main' }}
                              >
                                {(record.driverName || '?').charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="body2">
                                  {record.driverName || '-'}
                                </Typography>
                                <Chip
                                  label={record.driverType === 'backup' ? 'คนขับรอง' : record.driverType === 'other' ? 'คนขับแทน' : 'คนขับหลัก'}
                                  size="small"
                                  color={record.driverType === 'backup' ? 'secondary' : record.driverType === 'other' ? 'success' : 'primary'}
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => handleDriverInfoClick(record)}
                              sx={{ ml: 1 }}
                            >
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar
                              src={getImageUrl(record.vehicle?.carImage || '')}
                              sx={{ width: 48, height: 48, mr: 2, bgcolor: 'primary.main' }}
                            >
                              <img
                                src={getVehicleTypeIcon(record.vehicle?.vehicleType || '')}
                                alt={record.vehicle?.vehicleType || ''}
                                style={{ width: 20, height: 20 }}
                              />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {record.vehicle?.licensePlate || '-'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {record.vehicle?.brand} {record.vehicle?.model}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200, wordBreak: 'break-word' }}>
                            {record.departureLocation || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {(record.actualDistance || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {(record.estimatedDistance || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium" color="warning.main">
                            {(record.allowance || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium" color="warning.main">
                            {(record.suppliesCost || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium" color="warning.main">
                            {(record.calculatedDistanceCost || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium" color="info.main">
                            {(record.tripFee || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium" color="success.main">
                            {(record.totalCosts || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 150, wordBreak: 'break-word' }}>
                            {record.remark || '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" fontWeight="medium">
                          รวมทั้งหมด ({summary.totalTrips} เที่ยว)
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium" color="primary">
                          {(() => {
                            const totalActualDistance = filteredRecords.reduce((sum, record) => sum + (record.actualDistance || 0), 0);
                            return totalActualDistance.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                          })()} กม.
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium" color="primary">
                          {(() => {
                            const totalEstimatedDistance = filteredRecords.reduce((sum, record) => sum + (record.estimatedDistance || 0), 0);
                            return totalEstimatedDistance.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                          })()} กม.
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium" color="warning.main">
                          {(() => {
                            const totalAllowance = filteredRecords.reduce((sum, record) => sum + (record.allowance || 0), 0);
                            return totalAllowance.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                          })()} 
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium" color="warning.main">
                          {(() => {
                            const totalSuppliesCost = filteredRecords.reduce((sum, record) => sum + (record.suppliesCost || 0), 0);
                            return totalSuppliesCost.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                          })()} 
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium" color="warning.main">
                          {(() => {
                            const totalDistanceCost = filteredRecords.reduce((sum, record) => sum + (record.calculatedDistanceCost || 0), 0);
                            return totalDistanceCost.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                          })()} 
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium" color="info.main">
                          {(() => {
                            const totalTripFee = filteredRecords.reduce((sum, record) => sum + (record.tripFee || 0), 0);
                            return totalTripFee.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                          })()} 
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium" color="success.main">
                          {summary.totalCosts.toLocaleString('th-TH', { maximumFractionDigits: 2 })} 
                        </Typography>
                      </TableCell>
                      <TableCell></TableCell>
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
                <PersonIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                  ไม่มีข้อมูลการเดินทาง
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  ลองปรับเปลี่ยนตัวกรองเพื่อดูข้อมูลอื่น
                </Typography>
              </Paper>
            ) : (
              paginatedRecords.map((record, index) => (
                <Paper 
                  key={`${record.id}-${index}`}
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
                  {/* Header with Date and Info Button */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    mb: 2
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {format(new Date(record.tripDate), 'dd/MM/yyyy')}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleDriverInfoClick(record)}
                      sx={{
                        color: 'info.main',
                        bgcolor: 'info.50',
                        '&:hover': { bgcolor: 'info.100' }
                      }}
                    >
                      <InfoIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>

                  {/* Driver and Vehicle Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar
                      src={getImageUrl((() => {
                        // Use driver license to lookup image (since license is unique)
                        const cachedImage = getCachedDriverImage(record.driverLicense);
                        if (cachedImage) {
                          return cachedImage;
                        }
                        
                        // Fallback to ui-avatars using trip_records name as primary
                        return `https://ui-avatars.com/api/?name=${encodeURIComponent(record.driverName || '?')}&background=607d8b&color=fff&size=128`;
                      })())}
                      sx={{ 
                        width: 56, 
                        height: 56, 
                        border: '2px solid #e0e0e0'
                      }}
                    >
                      {(record.driverName || '?').charAt(0).toUpperCase()}
                    </Avatar>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {record.driverName || '-'}
                      </Typography>
                      <Chip
                        label={record.driverType === 'backup' ? 'คนขับรอง' : record.driverType === 'other' ? 'คนขับแทน' : 'คนขับหลัก'}
                        size="small"
                        color={record.driverType === 'backup' ? 'secondary' : record.driverType === 'other' ? 'success' : 'primary'}
                        variant="outlined"
                      />
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        รถ
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {record.vehicle?.licensePlate || '-'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Trip Details */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: 1.5, 
                    py: 2,
                    borderTop: '1px solid',
                    borderBottom: '1px solid',
                    borderColor: 'grey.100'
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                        ระยะทางจริง
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {(record.actualDistance || 0).toLocaleString('th-TH', { maximumFractionDigits: 1 })} กม.
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                        ระยะทางระบบ
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main' }}>
                        {(record.estimatedDistance || 0).toLocaleString('th-TH', { maximumFractionDigits: 1 })} กม.
                      </Typography>
                    </Box>
                  </Box>

                  {/* Expense Details */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(4, 1fr)', 
                    gap: 1.5, 
                    py: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 1
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                        ค่าเบี้ยเลี้ยง
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                        {(record.allowance || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })} บ.
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                        ค่าพัสดุ
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                        {(record.suppliesCost || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })} บ.
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                        ค่าระยะทาง
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                        {(record.calculatedDistanceCost || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })} บ.
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                        ค่าเที่ยวรถ
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main' }}>
                        {(record.tripFee || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })} บ.
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Total Cost Row */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center',
                    py: 1.5,
                    borderTop: '1px solid',
                    borderColor: 'grey.200'
                  }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                        รวมทั้งหมด
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {(record.totalCosts || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })} บ.
                      </Typography>
                    </Box>
                  </Box>

                  {/* Customer and Vehicle Details */}
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        ลูกค้า
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {record.departureLocation || '-'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        รถ
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {record.vehicle?.brand} {record.vehicle?.model}
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
        </>
        )}

        {/* Driver Details Dialog */}
        <Dialog
          open={driverDialogOpen}
          onClose={handleCloseDriverDialog}
          keepMounted
          TransitionProps={{
            onExited: () => setSelectedDriverData(null)
          }}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            <Typography variant="h6" component="div">
              รายละเอียดคนขับ
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ p: { xs: 1, sm: 2 } }}>
            {selectedDriverData && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
                {/* Driver & Vehicle Info Combined */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
                  gap: 2,
                  p: 1.5,
                  bgcolor: 'grey.50',
                  borderRadius: 1
                }}>
                  {/* Driver Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      src={getImageUrl((() => {
                        // selectedDriverData already prioritizes trip_records data
                        const img = selectedDriverData.driverImage;
                        if (!img || img === 'undefined' || img === 'null') {
                          return `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDriverData.driverName || '?')}&background=607d8b&color=fff&size=128`;
                        }
                        if (img.startsWith('http') || img.startsWith('/uploads/driver/')) return img;
                        if (img.startsWith('/')) return img;
                        return `/uploads/driver/${img}`;
                      })())}
                      sx={{ width: 60, height: 60, bgcolor: 'secondary.main' }}
                    >
                      {(selectedDriverData.driverName || '?').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" noWrap>
                        {selectedDriverData.driverName || 'ไม่ระบุชื่อ'}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        <Chip
                          label={selectedDriverData.driverType === 'backup' ? 'คนขับรอง' : selectedDriverData.driverType === 'other' ? 'คนขับแทน' : 'คนขับหลัก'}
                          color={selectedDriverData.driverType === 'backup' ? 'secondary' : selectedDriverData.driverType === 'other' ? 'success' : 'primary'}
                          size="small"
                          variant="outlined"
                        />
                        {selectedDriverData.driverLicense && (
                          <Chip
                            label={`ใบขับขี่: ${selectedDriverData.driverLicense}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {/* Vehicle Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      src={getImageUrl(selectedDriverData.vehicle?.carImage || '')}
                      sx={{ width: 60, height: 60, bgcolor: 'primary.main' }}
                    >
                      <img
                        src={getVehicleTypeIcon(selectedDriverData.vehicle?.vehicleType || '')}
                        alt={selectedDriverData.vehicle?.vehicleType || ''}
                        style={{ width: 24, height: 24 }}
                      />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" noWrap>
                        {selectedDriverData.vehicle?.licensePlate || '-'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {selectedDriverData.vehicle?.brand} {selectedDriverData.vehicle?.model}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getVehicleTypeText(selectedDriverData.vehicle?.vehicleType || '')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Trip Information - Compact */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }, 
                  gap: 1.5,
                  p: 1.5,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1
                }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">วันที่เดินทาง</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {selectedDriverData.tripDate ? format(new Date(selectedDriverData.tripDate), 'dd/MM/yyyy') : '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">วันที่เดินทางกลับ</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {selectedDriverData.returnDate ? format(new Date(selectedDriverData.returnDate), 'dd/MM/yyyy') : '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">ระยะทางจริง</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {(selectedDriverData.actualDistance || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">ระยะทางจากระบบ</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {(selectedDriverData.estimatedDistance || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                    </Typography>
                  </Box>
                  <Box >
                    <Typography variant="caption" color="text.secondary">เส้นทาง</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {selectedDriverData.departureLocation || '-'} 
                      {selectedDriverData.arrivalLocation && selectedDriverData.departureLocation && ' → '}
                      {selectedDriverData.arrivalLocation || ''}
                    </Typography>
                  </Box>
                </Box>

                {/* Expense Details - Compact */}
                <Box sx={{ 
                  p: 1.5,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1
                }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                    ค่าใช้จ่าย
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, 
                    gap: 1.5 
                  }}>
                    
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">เบี้ยเลี้ยง</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {selectedDriverData.allowance !== undefined && selectedDriverData.allowance > 0 
                          ? selectedDriverData.allowance.toLocaleString('th-TH', { maximumFractionDigits: 2 })
                          : '-'
                        }
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">พัสดุที่นำกลับ</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {selectedDriverData.suppliesCost !== undefined && selectedDriverData.suppliesCost > 0 
                          ? selectedDriverData.suppliesCost.toLocaleString('th-TH', { maximumFractionDigits: 2 })
                          : '-'
                        }
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">ค่าระยะทาง</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {selectedDriverData.calculatedDistanceCost !== undefined && selectedDriverData.calculatedDistanceCost > 0 
                          ? `${selectedDriverData.calculatedDistanceCost.toLocaleString('th-TH', { maximumFractionDigits: 2 })}`
                          : '-'
                        }
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">ค่าเที่ยวรถ</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {selectedDriverData.tripFee !== undefined && selectedDriverData.tripFee > 0 
                          ? selectedDriverData.tripFee.toLocaleString('th-TH', { maximumFractionDigits: 2 })
                          : '-'
                        }
                      </Typography>
                    </Box>

                  </Box>
                  
                  {/* Total Cost */}
                  <Box sx={{ 
                    mt: 1.5, 
                    pt: 1.5, 
                    borderTop: 1,
                    borderColor: 'divider'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="subtitle2" color="success.main" fontWeight="bold">
                          รวมทั้งหมด
                        </Typography>
                        <Typography variant="h6" color="success.main" fontWeight="bold">
                          {selectedDriverData.totalCosts !== undefined && selectedDriverData.totalCosts > 0 
                            ? `${selectedDriverData.totalCosts.toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท`
                            : '-'
                          }
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Remarks - Compact */}
                {selectedDriverData.remark && (
                  <Box sx={{ 
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 1
                  }}>
                    <Typography variant="caption" color="text.secondary">หมายเหตุ</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {selectedDriverData.remark}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: { xs: 1, sm: 2 }, justifyContent: 'center' }}>
            <Button 
              onClick={handleCloseDriverDialog}
              variant="contained"
              sx={{ minWidth: { xs: 120, sm: 80 } }}
            >
              ปิด
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
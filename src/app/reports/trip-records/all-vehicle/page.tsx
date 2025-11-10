'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  AccordionDetails
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  DirectionsCar as DirectionsCarIcon,
  CalendarToday as CalendarIcon,
  Clear as ClearIcon,
  ArrowBack as BackIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Directions,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';

// Date picker imports
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { th } from 'date-fns/locale';

import Layout from '../../../components/Layout';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { getDistanceRate } from '@/utils/distanceRate';

// ฟังก์ชันสำหรับจัดการ URL รูปภาพ (รองรับ production)
const getImageUrl = (url: string) => {
  if (!url || url === 'undefined' || url === 'null') return undefined;
  
  // Handle blob URLs (for preview/upload)
  if (url.startsWith('blob:')) {
    return url;
  }
  
  // Handle external URLs (http/https)
  if (url.startsWith('http')) {
    return url;
  }
  
  // Detect production environment
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.VERCEL_ENV === 'production' ||
                      typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  
  // Handle uploads directory paths
  if (url.startsWith('/uploads/')) {
    // In production, use API endpoint for security and proper headers
    if (isProduction) {
      return `/api/serve-image?path=${encodeURIComponent(url)}&t=${Date.now()}`;
    } else {
      // In development, serve directly from public folder
      return url;
    }
  }
  
  // If it's just a filename, determine directory based on filename pattern
  if (url && !url.startsWith('/') && !url.startsWith('http')) {
    let imagePath;
    if (url.startsWith('car_')) {
      // Vehicle image
      imagePath = `/uploads/car/${url}`;
    } else {
      // Driver image (default)
      imagePath = `/uploads/driver/${url}`;
    }
    
    if (isProduction) {
      return `/api/serve-image?path=${encodeURIComponent(imagePath)}&t=${Date.now()}`;
    } else {
      return imagePath;
    }
  }
  
  return url;
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

interface Vehicle {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
  vehicleType: string;
  driverName?: string;
  backupDriverName?: string;
  carImage?: string;
}

interface Customer {
  id: number;
  cmName: string;
}

interface TripItem {
  id: number;
  // Optional plain name for backward compatibility
  itemName?: string;
  // Nested item object from API
  item?: {
    id: number;
    ptPart?: string;
    ptDesc1?: string;
    ptUm?: string;
  };
  quantity: number | string;
  unit: string;
  unitPrice?: number | string;
  totalPrice: number | string;
  remark?: string;
}

interface TripRecord {
  id: number;
  departureDate: string;
  returnDate: string;
  departureTime?: string;
  returnTime?: string;
  actualDistance: number | string;
  estimatedDistance?: number | string;
  days: number | string;
  totalAllowance: number | string;
  distanceCheckFee?: number | string; // ค่าเช็คระยะ
  fuelCost?: number | string;         // ค่าน้ำมันรถ
  tollFee?: number | string;          // ค่าทางด่วน
  repairCost?: number | string;       // ค่าซ่อมแซม
  documentNumber?: string;            // เลขที่เอกสาร
  driverType?: string;                // 'main' | 'backup' | 'other'
  driverName?: string;                // ชื่อคนขับที่ใช้ในเที่ยวนี้
  customer: Customer;
  vehicle?: Vehicle;
  tripItems?: TripItem[];
  remark?: string;
}

// Component สำหรับแสดงรูปรถยนต์
const VehicleImage = ({ vehicle, size = 24 }: { vehicle: Vehicle; size?: number }) => {
  return vehicle.carImage ? (
    <Avatar
      src={getImageUrl(vehicle.carImage)}
      alt={`${vehicle.brand} ${vehicle.model}`}
      sx={{ 
        width: size, 
        height: size, 
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider'
      }}
      variant="rounded"
      imgProps={{
        loading: 'lazy',
        style: { objectFit: 'cover' }
      }}
    />
  ) : (
    <Box sx={{ 
      width: size, 
      height: size, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      bgcolor: 'primary.main',
      borderRadius: 1.5,
      color: 'white'
    }}>
      <CarIcon sx={{ fontSize: size * 0.6 }} />
    </Box>
  );
};

export default function AllVehicleTripReportPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showSnackbar } = useSnackbar();

  // State management
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]); // รถที่มีข้อมูลในเดือนที่เลือก
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [tripRecords, setTripRecords] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false); // loading สำหรับ filter รถ
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString()); // เดือนปัจจุบัน (1-12)
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [isExporting, setIsExporting] = useState(false);
  const [distanceRate, setDistanceRate] = useState<number>(3);
  const [tripFeeRate, setTripFeeRate] = useState<number>(30); // ค่าเที่ยวต่อรอบ
  const minimalRef = useRef<HTMLDivElement | null>(null);

  // Months data
  const months = [
    { value: 'all', label: 'ทั้งหมด' },
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

  // Get available years
  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2025; year--) {
      years.push(year);
    }
    return years;
  };

  // Load vehicles on component mount
  useEffect(() => {
    loadVehicles();
  }, []);

  // Fetch distance rate and trip fee rate
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const rate = await getDistanceRate();
        setDistanceRate(rate);
        
        // Fetch trip fee rate
        const tripFeeResponse = await fetch('/api/settings/trip-fee');
        const tripFeeResult = await tripFeeResponse.json();
        if (tripFeeResponse.ok && tripFeeResult.success && tripFeeResult.data?.tripFee) {
          setTripFeeRate(tripFeeResult.data.tripFee);
        }
      } catch (error) {
        console.error('Error fetching rates:', error);
      }
    };
    fetchRates();
  }, []);

  // Load trip records when filters change
  useEffect(() => {
    if (selectedVehicleId && selectedMonth && selectedYear) {
      loadTripRecords();
    } else {
      setTripRecords([]);
    }
  }, [selectedVehicleId, selectedMonth, selectedYear]);

  const loadVehicles = async () => {
    try {
      // First, get the first page to know the total count
      const firstResponse = await fetch('/api/vehicles?page=1&limit=100');
      const firstResult = await firstResponse.json();
      
      console.log('Vehicles API Response:', firstResult);
      
      if (firstResult.success) {
        const allVehicles: any[] = [...(firstResult.data || [])];
        const total = firstResult.pagination?.total || 0;
        const totalPages = Math.ceil(total / 100);

        console.log(`📋 [Vehicles] Total: ${total}, fetching ${totalPages} pages...`);

        // Fetch remaining pages if there are more
        if (totalPages > 1) {
          const remainingPages = [];
          for (let page = 2; page <= totalPages; page++) {
            remainingPages.push(
              fetch(`/api/vehicles?page=${page}&limit=100`)
                .then(res => res.json())
                .then(result => result.data || [])
            );
          }

          // Wait for all remaining pages
          const remainingVehicles = await Promise.all(remainingPages);
          remainingVehicles.forEach(pageVehicles => {
            allVehicles.push(...pageVehicles);
          });
        }

        console.log(`📋 [Vehicles] Successfully loaded ${allVehicles.length} vehicles`);
        setVehicles(allVehicles);
      } else if (Array.isArray(firstResult)) {
        console.log('Found vehicles (direct array):', firstResult.length, 'vehicles');
        setVehicles(firstResult);
      } else {
        setVehicles([]);
        showSnackbar('ไม่สามารถโหลดข้อมูลรถได้', 'error');
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setVehicles([]);
      showSnackbar('เกิดข้อผิดพลาดในการโหลดข้อมูลรถ', 'error');
    }
  };

  // ดึงรายการรถที่มีข้อมูลในเดือน/ปีที่เลือก
  const fetchAvailableVehicles = useCallback(async () => {
    if (!selectedMonth || !selectedYear) {
      setAvailableVehicles([]);
      return;
    }

    try {
      setLoadingVehicles(true);
      
      // Calculate month range
      const yearNum = parseInt(selectedYear);
      let startDate, endDate;
      
      if (selectedMonth === 'all') {
        // All months in the selected year
        startDate = new Date(yearNum, 0, 1); // January 1st
        endDate = new Date(yearNum, 11, 31); // December 31st
      } else {
        // Specific month
        const monthNum = parseInt(selectedMonth);
        startDate = new Date(yearNum, monthNum - 1, 1);
        endDate = new Date(yearNum, monthNum, 0); // Last day of the month
      }

      const params = new URLSearchParams();
      params.append('startDate', toYmdLocal(startDate));
      params.append('endDate', toYmdLocal(endDate));

      // Query trip records to get unique vehicle IDs
      const response = await fetch(`/api/trip-records?page=1&limit=1000&${params.toString()}`);
      const result = await response.json();
      
      if (response.ok) {
        const trips = result.trips || result.data || [];
        
        // Extract unique vehicle IDs from trips
        const vehicleIds = new Set<number>();
        trips.forEach((trip: any) => {
          if (trip.vehicleId) {
            vehicleIds.add(trip.vehicleId);
          }
        });

        // Filter vehicles that have trips in this period and are trucks
        const filtered = vehicles.filter(v => 
          vehicleIds.has(v.id) && v.vehicleType?.toLowerCase() === 'truck'
        );
        
        console.log(`📋 [Available Vehicles] Found ${filtered.length} trucks with trips in selected period`);
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
  }, [selectedMonth, selectedYear, vehicles]);

  // Load available vehicles when month or year changes
  useEffect(() => {
    if (vehicles.length > 0 && selectedMonth && selectedYear) {
      fetchAvailableVehicles();
      // Reset selected vehicle when month/year changes to force user to reselect
      setSelectedVehicleId('');
    } else {
      setAvailableVehicles([]);
    }
  }, [selectedMonth, selectedYear, vehicles.length, fetchAvailableVehicles]);

  const loadTripRecords = async () => {
    console.log('Loading trip records with conditions:', {
      selectedVehicleId,
      selectedMonth,
      selectedYear
    });
    
    if (!selectedVehicleId || !selectedMonth || !selectedYear) {
      console.log('Conditions not met for loading trip records');
      setTripRecords([]);
      return;
    }
    
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Calculate month range
      const yearNum = parseInt(selectedYear);
      let startDate, endDate;
      
      if (selectedMonth === 'all') {
        // All months in the selected year
        startDate = new Date(yearNum, 0, 1); // January 1st
        endDate = new Date(yearNum, 11, 31); // December 31st
      } else {
        // Specific month
        const monthNum = parseInt(selectedMonth);
        startDate = new Date(yearNum, monthNum - 1, 1);
        endDate = new Date(yearNum, monthNum, 0); // Last day of the month
      }
      
      params.append('vehicleId', selectedVehicleId);
      params.append('startDate', toYmdLocal(startDate));
      params.append('endDate', toYmdLocal(endDate));

      // First, get the first page to know the total count
      const firstResponse = await fetch(`/api/trip-records?page=1&limit=100&${params.toString()}`);
      const firstResult = await firstResponse.json();
      
      console.log('Trip Records API Response:', firstResult);
      
      if (firstResponse.ok) {
        const allTrips: any[] = [...(firstResult.trips || firstResult.data || [])];
        const total = firstResult.pagination?.total || 0;
        const totalPages = Math.ceil(total / 100);

        console.log(`📋 [Trip Records] Filtered trips: ${total}, fetching ${totalPages} pages...`);

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
          const remainingTrips = await Promise.all(remainingPages);
          remainingTrips.forEach(pageTrips => {
            allTrips.push(...pageTrips);
          });
        }

        console.log(`📋 [Trip Records] Successfully loaded ${allTrips.length} trip records`);
        setTripRecords(allTrips);
      } else {
        console.warn('Trip records data is not in expected format:', firstResult);
        setTripRecords([]);
        showSnackbar('ไม่พบข้อมูลการเดินทาง', 'info');
      }
    } catch (error) {
      console.error('Error loading trip records:', error);
      setTripRecords([]);
      showSnackbar('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter handlers
  const handleClearFilters = () => {
    setSelectedVehicleId('');
    setSelectedMonth('all');
    setSelectedYear(new Date().getFullYear().toString());
    setTripRecords([]);
  };

  // Format date - แสดงปี ค.ศ. เพื่อให้สอดคล้องกับ DatePicker
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear(); // ปี ค.ศ.
    return `${day}/${month}/${year}`;
  };

  // Build YYYY-MM-DD in LOCAL time (to avoid UTC shift from toISOString())
  const toYmdLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    // Show up to 2 decimal places, but hide decimals for whole numbers
    return Number(amount || 0).toLocaleString('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // Compute date range label from given trips
  const getTripsDateRangeLabel = (trips: TripRecord[]) => {
    if (!Array.isArray(trips) || trips.length === 0) return '';
    let minDep: Date | null = null;
    let maxRet: Date | null = null;
    for (const t of trips) {
      const dep = new Date(t.departureDate);
      const ret = t.returnDate ? new Date(t.returnDate) : dep;
      if (!minDep || dep < minDep) minDep = dep;
      if (!maxRet || ret > maxRet) maxRet = ret;
    }
    if (!minDep || !maxRet) return '';
    const startStr = minDep.toLocaleDateString('th-TH');
    const endStr = maxRet.toLocaleDateString('th-TH');
    return startStr === endStr ? `วันที่: ${startStr}` : `ช่วงวันที่: ${startStr} - ${endStr}`;
  };

  // Calculate totals (แปลง string เป็น number ก่อนคำนวณ)
  const totalDistance = (Array.isArray(tripRecords) ? tripRecords : []).reduce((sum, trip) => {
    const distance = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance;
    return sum + distance;
  }, 0);
  
  const totalEstimatedDistance = (Array.isArray(tripRecords) ? tripRecords : []).reduce((sum, trip) => {
    const distance = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
    return sum + distance;
  }, 0);
  
  const totalAllowance = (Array.isArray(tripRecords) ? tripRecords : []).reduce((sum, trip) => {
    const allowance = typeof trip.totalAllowance === 'string' ? parseFloat(trip.totalAllowance) || 0 : trip.totalAllowance;
    return sum + allowance;
  }, 0);
  
  const totalDistanceCheckFee = (Array.isArray(tripRecords) ? tripRecords : []).reduce((sum, trip) => {
    const fee = typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0;
    return sum + fee;
  }, 0);
  
  const totalFuelCost = (Array.isArray(tripRecords) ? tripRecords : []).reduce((sum, trip) => {
    const cost = typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0;
    return sum + cost;
  }, 0);
  
  const totalTollFee = (Array.isArray(tripRecords) ? tripRecords : []).reduce((sum, trip) => {
    const fee = typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0;
    return sum + fee;
  }, 0);
  
  const totalRepairCost = (Array.isArray(tripRecords) ? tripRecords : []).reduce((sum, trip) => {
    const cost = typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0;
    return sum + cost;
  }, 0);
  
  // Calculate company expenses: ค่าซ่อมแซม + ค่าทางด่วน + ค่าน้ำมัน + ค่าเช็คระยะ
  const totalCompanyExpenses = totalDistanceCheckFee + totalFuelCost + totalTollFee + totalRepairCost;

  // Calculate distance cost for all trips
  const totalDistanceCost = (Array.isArray(tripRecords) ? tripRecords : []).reduce((sum, trip) => {
    const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
    return sum + (estimatedDist * distanceRate);
  }, 0);
  
  const totalItemsValue = (Array.isArray(tripRecords) ? tripRecords : []).reduce((sum, trip) => {
    const itemsTotal = trip.tripItems?.reduce((itemSum, item) => {
      const price = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) || 0 : item.totalPrice;
      return itemSum + price;
    }, 0) || 0;
    return sum + itemsTotal;
  }, 0);

  // Calculate trip fee for all trips (ค่าเที่ยว = จำนวนเที่ยว × ค่าเที่ยวต่อรอบ)
  const totalTripFee = (Array.isArray(tripRecords) ? tripRecords.length : 0) * tripFeeRate;

  // Calculate driver expenses: ค่าเบี้ยเลี้ยง + ค่าพัสดุ + ค่าระยะทาง + ค่าเที่ยว
  const totalDriverExpenses = totalAllowance + totalItemsValue + totalDistanceCost + totalTripFee;

  // คำนวณส่วนต่างระยะทาง (รวมแบบเครื่องหมาย + -)
  const totalDistanceDifference = (Array.isArray(tripRecords) ? tripRecords : []).reduce((sum, trip) => {
    const actual = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance;
    const estimated = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
    return sum + (actual - estimated);
  }, 0);

  const totalCosts = totalDriverExpenses + totalCompanyExpenses;  

  // สร้างรายการรถที่ไม่ซ้ำจาก trip records
  const uniqueVehicles: Vehicle[] = Array.isArray(tripRecords) ? Array.from(
    tripRecords
      .filter(trip => trip.vehicle)
      .reduce((map, trip) => {
        if (trip.vehicle) {
          map.set(trip.vehicle.id, trip.vehicle);
        }
        return map;
      }, new Map<number, Vehicle>())
      .values()
  ) : [];  


  // รวมรายการพัสดุต่อรถ (รวมทุกเที่ยวรถของรถนั้น ๆ)
  const aggregateItems = (trips: TripRecord[]) => {
    type Agg = { name: string; unit?: string; quantity: number; totalPrice: number };
    const map = new Map<string, Agg>();
    trips.forEach(trip => {
      (trip.tripItems || []).forEach((it: any) => {
        const key = it?.item?.id?.toString() || it?.id?.toString() || it?.itemName || Math.random().toString();
        const name = it?.item?.ptDesc1 || it?.itemName || it?.item?.ptPart || 'ไม่ระบุ';
        const unit = it?.unit || it?.item?.ptUm;
        const qty = typeof it?.quantity === 'string' ? (parseFloat(it.quantity) || 0) : (it?.quantity || 0);
        const total = typeof it?.totalPrice === 'string' ? (parseFloat(it.totalPrice) || 0) : (it?.totalPrice || 0);
        const uPrice = typeof it?.unitPrice === 'string' ? (parseFloat(it.unitPrice) || 0) : (it?.unitPrice || 0);
        const priceToAdd = total > 0 ? total : (uPrice && qty ? uPrice * qty : 0);
        const prev = map.get(key);
        if (prev) {
          prev.quantity += qty;
          prev.totalPrice += priceToAdd;
        } else {
          map.set(key, { name, unit, quantity: qty, totalPrice: priceToAdd });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.totalPrice - a.totalPrice);
  };

  // รวมรายการพัสดุแบบแยกต่อลูกค้าและรายการพัสดุ
  const aggregateItemsByCustomer = (trips: TripRecord[]) => {
    type Row = { customerId: number; customerName: string; name: string; unit?: string; quantity: number; totalPrice: number };
    const map = new Map<string, Row>();
    trips.forEach((trip: any) => {
      const cId = trip?.customer?.id;
      const cName = trip?.customer?.cmName || 'ไม่ระบุลูกค้า';
      (trip?.tripItems || []).forEach((it: any) => {
        const itemKey = it?.item?.id?.toString() || it?.id?.toString() || it?.itemName || '';
        const key = `${cId || 'x'}::${itemKey || it?.itemName || Math.random().toString()}`;
        const name = it?.item?.ptDesc1 || it?.itemName || it?.item?.ptPart || 'ไม่ระบุ';
        const unit = it?.unit || it?.item?.ptUm;
        const qty = typeof it?.quantity === 'string' ? (parseFloat(it.quantity) || 0) : (it?.quantity || 0);
        const total = typeof it?.totalPrice === 'string' ? (parseFloat(it.totalPrice) || 0) : (it?.totalPrice || 0);
        const uPrice = typeof it?.unitPrice === 'string' ? (parseFloat(it.unitPrice) || 0) : (it?.unitPrice || 0);
        const priceToAdd = total > 0 ? total : (uPrice && qty ? uPrice * qty : 0);
        const prev = map.get(key);
        if (prev) {
          prev.quantity += qty;
          prev.totalPrice += priceToAdd;
        } else {
          map.set(key, { customerId: cId || 0, customerName: cName, name, unit, quantity: qty, totalPrice: priceToAdd });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.customerName === b.customerName) return b.totalPrice - a.totalPrice;
      return a.customerName.localeCompare(b.customerName, 'th');
    });
  };

  // รวมคนขับที่ใช้ในแต่ละรถจากการเดินทาง
  const getVehicleDrivers = (vehicleId: number, trips: TripRecord[]) => {
    const vehicleTrips = trips.filter(trip => trip.vehicle?.id === vehicleId);
    const driversSet = new Set<string>();
    
    vehicleTrips.forEach(trip => {
      if (trip.driverName) {
        driversSet.add(trip.driverName);
      }
    });
    
    // ถ้าไม่มีคนขับจากการเดินทาง ให้ใช้คนขับที่ผูกกับรถ
    if (driversSet.size === 0) {
      const vehicle = trips.find(trip => trip.vehicle?.id === vehicleId)?.vehicle;
      if (vehicle?.driverName) {
        driversSet.add(vehicle.driverName);
      }
      if (vehicle?.backupDriverName) {
        driversSet.add(vehicle.backupDriverName);
      }
    }
    
    return Array.from(driversSet);
  };

  // รวมคนขับที่ไปหาลูกค้าแต่ละราย
  const getCustomerDrivers = (customerTrips: TripRecord[]) => {
    const driversSet = new Set<string>();
    
    customerTrips.forEach(trip => {
      if (trip.driverName) {
        driversSet.add(trip.driverName);
      } else if (trip.vehicle) {
        // ถ้าไม่มีข้อมูลคนขับในการเดินทาง ให้ใช้คนขับที่ผูกกับรถ
        if (trip.vehicle.driverName) {
          driversSet.add(trip.vehicle.driverName);
        }
      }
    });
    
    return Array.from(driversSet);
  };

  // จัดกลุ่มเที่ยวรถต่อลูกค้า
  const groupTripsByCustomer = (trips: TripRecord[]) => {
    const groups: Record<string, TripRecord[]> = {};
    trips.forEach((t) => {
      const key = `${t.customer?.id || 0}::${t.customer?.cmName || 'ไม่ระบุลูกค้า'}`;
      (groups[key] ||= []).push(t);
    });
    return groups; // keys like "<id>::<name>"
  };

  // จัดกลุ่มลูกค้าตาม departure date - return date + document number (แต่ละเที่ยวแยกแถว)
  const groupCustomersByDateRange = (trips: TripRecord[]) => {
    const dateGroups: Record<string, Record<string, TripRecord[]>> = {};
    
    trips.forEach((trip) => {
      const depDate = new Date(trip.departureDate);
      const retDate = trip.returnDate ? new Date(trip.returnDate) : depDate;
      
      // สร้าง key สำหรับ date range
      const depDateStr = depDate.toLocaleDateString('th-TH', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const retDateStr = retDate.toLocaleDateString('th-TH', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      
      const dateRangeKey = depDateStr === retDateStr ? 
        depDateStr : 
        `${depDateStr} - ${retDateStr}`;

      // เพิ่มเลขเอกสารลงใน key เพื่อแยกการแสดงผลแต่ละเอกสาร
      const documentNumber = trip.documentNumber || 'ไม่ระบุ';
      const dateDocKey = `${dateRangeKey}::${documentNumber}`;

      // สร้าง key สำหรับลูกค้า + เที่ยว (แต่ละเที่ยวแยกแถว)
      const customerKey = `${trip.customer?.id || 0}::${trip.customer?.cmName || 'ไม่ระบุลูกค้า'}::${trip.id}`;
      
      // จัดกลุ่มตาม date range + document number และ customer+tripId (แต่ละเที่ยวแยกแถว)
      if (!dateGroups[dateDocKey]) {
        dateGroups[dateDocKey] = {};
      }
      if (!dateGroups[dateDocKey][customerKey]) {
        dateGroups[dateDocKey][customerKey] = [];
      }
      dateGroups[dateDocKey][customerKey].push(trip);
    });
    
    return dateGroups;
  };

  // ดึงรายการพัสดุแบบรวมของลูกค้าเดียวจากกลุ่มทั้งหมด
  const getItemsForCustomer = (trips: TripRecord[], customerKey: string) => {
    const [idStr, name] = customerKey.split('::');
    const cid = parseInt(idStr || '0');
    const all = aggregateItemsByCustomer(trips);
    return all.filter(r => r.customerId === cid);
  };

  // Export to PDF using professional report format (clean layout without UI elements)
  // Export to PDF (Minimal Thai) using hidden HTML template + html2canvas
  const exportToPDF = async () => {
    if (!selectedVehicleId || !tripRecords || tripRecords.length === 0) {
      showSnackbar('กรุณาเลือกรถหรือเลือกช่วงวันที่และตรวจสอบว่ามีข้อมูลการเดินทาง', 'warning');
      return;
    }
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
      sourceEl.style.width = '1200px';

      // รอ font face
      await document.fonts.ready;

      // ตั้งค่าหน้ากระดาษ
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = 297;  // A4 landscape width
      const pageHeight = 210; // A4 landscape height
      const margin = 10;
      const footerHeightMm = 12;
      const contentWidthMm = pageWidth - margin * 2;
      const contentHeightMm = pageHeight - margin * 2 - footerHeightMm; // เผื่อ footer
      const cssWidthPx = 1200; // ความกว้างของเทมเพลต
      const pxPerMm = cssWidthPx / contentWidthMm;
      const maxPageHeightPx = Math.floor(contentHeightMm * pxPerMm);

      // โครงสร้างเพจชั่วคราวสำหรับประกอบ DOM ตามหน้า
      const paginationRoot = document.createElement('div');
      paginationRoot.style.position = 'absolute';
      paginationRoot.style.left = '-9999px';
      paginationRoot.style.top = '0';
      paginationRoot.style.width = cssWidthPx + 'px';
      paginationRoot.style.background = '#fff';
      paginationRoot.style.color = '#000';
      paginationRoot.style.fontFamily = `'Sarabun', Arial, sans-serif`;
      document.body.appendChild(paginationRoot);

      const pages: HTMLDivElement[] = [];

      const createPage = () => {
        const page = document.createElement('div');
        page.style.width = cssWidthPx + 'px';
        page.style.boxSizing = 'border-box';
        page.style.background = '#fff';
        page.style.color = '#000';
        page.style.padding = '0';
        page.style.margin = '0';
        paginationRoot.appendChild(page);
        pages.push(page);
        return page;
      };

      const cloneNode = (el: Element) => el.cloneNode(true) as HTMLElement;

      // ดึงส่วนหัวของรายงานไว้สำหรับใส่ซ้ำในทุกหน้า
      const sections = sourceEl.querySelectorAll('.section');
      const headerSection = sections[0] ? cloneNode(sections[0]) : null; // ชื่อรายงาน + header info
      const summarySection = sections[1] ? cloneNode(sections[1]) : null; // สรุปบนสุด

      // หา table หลักที่เป็นข้อมูลเที่ยว (หลีกเลี่ยง summary table อันแรก)
      // โครงสร้างตอนนี้: section[0]=หัวรายงาน, section[1]=summary, section[2]=กล่องแสดงตารางหลักของรถ
      const dataSection = sections[2] as HTMLElement | undefined;
      const mainTable = dataSection?.querySelector('table');
      const thead = mainTable?.querySelector('thead');
      const tbody = mainTable?.querySelector('tbody');
      const tfoot = mainTable?.querySelector('tfoot');

      // ฟังก์ชันสร้างตารางใหม่ในเพจ (ใส่ thead ซ้ำ)
      const createTableOnPage = (page: HTMLDivElement) => {
        const tbl = document.createElement('table');
        tbl.style.width = '100%';
        tbl.style.borderCollapse = 'collapse';
        tbl.style.fontSize = '14px';
        tbl.style.marginBottom = '3px';
        if (thead) tbl.appendChild(cloneNode(thead));
        const newTbody = document.createElement('tbody');
        tbl.appendChild(newTbody);
        page.appendChild(tbl);
        return { tbl, newTbody };
      };

      // สร้างหน้าแรก
      let currentPage = createPage();
      if (headerSection) currentPage.appendChild(headerSection.cloneNode(true));
      if (summarySection) {
        currentPage.appendChild(summarySection.cloneNode(true));
        // ถ้าเกินความสูงให้ย้าย summary ไปหน้าใหม่
        if (currentPage.scrollHeight > maxPageHeightPx) {
          // ย้าย summary ออกและสร้างหน้าใหม่
          if (currentPage.lastChild) currentPage.removeChild(currentPage.lastChild);
          currentPage = createPage();
          if (headerSection) currentPage.appendChild(headerSection.cloneNode(true));
          currentPage.appendChild(summarySection.cloneNode(true));
        }
      }
      let { tbl: currentTable, newTbody: currentTbody } = createTableOnPage(currentPage);

      // จัดหน้าโดยการเพิ่มแถวทีละแถวจนกว่าจะเต็มความสูงที่กำหนด
      if (!tbody) {
        // fallback: ถ้าไม่พบ tbody ให้ใช้ภาพรวมทั้งเอกสารเหมือนเดิม
        const canvasFallback = await html2canvas(sourceEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgW = contentWidthMm;
        const imgH = (canvasFallback.height * imgW) / (canvasFallback.width / (cssWidthPx / imgW));
        const imgData = canvasFallback.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', margin, margin, contentWidthMm, (canvasFallback.height * contentWidthMm) / canvasFallback.width);
      } else {
        const rows = Array.from(tbody.querySelectorAll('tr')) as HTMLTableRowElement[];
        for (let i = 0; i < rows.length; i++) {
          const rowClone = rows[i].cloneNode(true) as HTMLTableRowElement;
          currentTbody.appendChild(rowClone);

          // ถ้าเกินความสูงหน้ากระดาษ ให้ย้ายแถวนี้ไปหน้าใหม่
          if (currentPage.scrollHeight > maxPageHeightPx) {
            currentTbody.removeChild(rowClone);
            // ปิดตารางหน้าเดิมด้วยการเพิ่มเส้นแบ่งบางๆ (optional)
            // เริ่มหน้าใหม่
            currentPage = createPage();
            if (headerSection) currentPage.appendChild(headerSection.cloneNode(true));
            const created = createTableOnPage(currentPage);
            currentTable = created.tbl;
            currentTbody = created.newTbody;

            currentTbody.appendChild(rowClone);

            // ป้องกันกรณีแถวเดียวก็ยาวเกินทั้งหน้า (content ยาวมาก)
            if (currentPage.scrollHeight > maxPageHeightPx) {
              // ปล่อยให้ overflow เล็กน้อย แต่อย่างน้อยแถวจะไม่ถูกตัดคาบหน้า
              // (การแยกเนื้อหาในแถวให้ละเอียดกว่านี้ต้องปรับโครงสร้าง DOM เพิ่มเติม)
            }
          }
        }

        // เพิ่ม tfoot เฉพาะหน้าสุดท้าย (ถ้ามี)
        if (tfoot) {
          // ถ้าใส่แล้วเกิน ก็ขึ้นหน้าใหม่แล้วค่อยใส่
          const tfootClone = tfoot.cloneNode(true) as HTMLElement;
          currentTable.appendChild(tfootClone);
          if (currentPage.scrollHeight > maxPageHeightPx) {
            currentTable.removeChild(tfootClone);
            currentPage = createPage();
            if (headerSection) currentPage.appendChild(headerSection.cloneNode(true));
            const created = createTableOnPage(currentPage);
            currentTable = created.tbl;
            currentTbody = created.newTbody;
            // ไม่ต้องใส่แถวซ้ำ แค่ใส่ tfoot
            currentTable.appendChild(tfootClone);
          }
        }

        // แนบสรุปท้าย (Vehicle Summary - Detailed): พยายามต่อท้ายหน้าเดียวกันก่อน
        const vehicleSummary = dataSection?.querySelector('div.vehicle-summary-detailed');
        if (vehicleSummary) {
          const summaryClone = cloneNode(vehicleSummary);
          currentPage.appendChild(summaryClone);
          if (currentPage.scrollHeight > maxPageHeightPx) {
            // ถ้าไม่พอดีหน้านี้ ให้ย้ายไปหน้าใหม่ทั้งก้อน
            currentPage.removeChild(summaryClone);
            currentPage = createPage();
            if (headerSection) currentPage.appendChild(headerSection.cloneNode(true));
            currentPage.appendChild(summaryClone);
            // กรณี summary ใหญ่มากเกิน 1 หน้า ปล่อย overflow โดยไม่แยกส่วน
          }
        }
      }

      // สร้างภาพแต่ละหน้าและใส่ใน PDF
      for (let p = 0; p < pages.length; p++) {
        const pageEl = pages[p];
        const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        if (p > 0) doc.addPage();
        const drawWidthMm = contentWidthMm;
        const drawHeightMm = (canvas.height * drawWidthMm) / canvas.width;
        const pageIndex = p + 1;
        const totalPages = pages.length;
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', margin, margin, drawWidthMm, drawHeightMm);

        // footer
        doc.setFontSize(8);
        doc.text(`Print Date: ${new Date().toLocaleString('th-TH')}`, margin, pageHeight - 6);
        doc.text(`Page ${pageIndex}/${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
      }

      // ล้าง DOM ชั่วคราว
      paginationRoot.remove();

      // คืนค่า style เดิมของ source
      sourceEl.style.visibility = prevVisibility;
      sourceEl.style.position = prevPosition;
      sourceEl.style.left = prevLeft;
      sourceEl.style.top = prevTop;
      sourceEl.style.width = prevWidth;

      const today = new Date().toISOString().split('T')[0];
      const fileName = `trip-report-${today}.pdf`;
      
      // Create blob and download using standard approach to avoid browser security warnings
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Create temporary download link
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = fileName;
      downloadLink.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up blob URL
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);
      
      showSnackbar('ดาวน์โหลด PDF เรียบร้อยแล้ว', 'success');
    } catch (e) {
      console.error(e);
      showSnackbar('เกิดข้อผิดพลาดในการสร้าง PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Print PDF (open print dialog without downloading)
  const printToPDF = async () => {
    if (!selectedVehicleId || !tripRecords || tripRecords.length === 0) {
      showSnackbar('กรุณาเลือกรถหรือเลือกช่วงวันที่และตรวจสอบว่ามีข้อมูลการเดินทาง', 'warning');
      return;
    }
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
      sourceEl.style.width = '1200px';

      // รอ font face
      await (document as any).fonts?.ready;

      // ตั้งค่าหน้ากระดาษ
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = 297;  // A4 landscape width
      const pageHeight = 210; // A4 landscape height
      const margin = 10;
      const footerHeightMm = 12;
      const contentWidthMm = pageWidth - margin * 2;
      const contentHeightMm = pageHeight - margin * 2 - footerHeightMm; // เผื่อ footer
      const cssWidthPx = 1200; // ความกว้างของเทมเพลต
      const pxPerMm = cssWidthPx / contentWidthMm;
      const maxPageHeightPx = Math.floor(contentHeightMm * pxPerMm);

      // โครงสร้างเพจชั่วคราวสำหรับประกอบ DOM ตามหน้า
      const paginationRoot = document.createElement('div');
      paginationRoot.style.position = 'absolute';
      paginationRoot.style.left = '-9999px';
      paginationRoot.style.top = '0';
      paginationRoot.style.width = cssWidthPx + 'px';
      paginationRoot.style.background = '#fff';
      paginationRoot.style.color = '#000';
      paginationRoot.style.fontFamily = `'Sarabun', Arial, sans-serif`;
      document.body.appendChild(paginationRoot);

      const pages: HTMLDivElement[] = [];

      const createPage = () => {
        const page = document.createElement('div');
        page.style.width = cssWidthPx + 'px';
        page.style.boxSizing = 'border-box';
        page.style.background = '#fff';
        page.style.color = '#000';
        page.style.padding = '0';
        page.style.margin = '0';
        paginationRoot.appendChild(page);
        pages.push(page);
        return page;
      };

      const cloneNode = (el: Element) => el.cloneNode(true) as HTMLElement;

      // ดึงส่วนหัวของรายงานไว้สำหรับใส่ซ้ำในทุกหน้า
  const sections = sourceEl.querySelectorAll('.section');
  const headerSection = sections[0] ? cloneNode(sections[0]) : null; // ชื่อรายงาน + header info
  const summarySection = sections[1] ? cloneNode(sections[1]) : null; // สรุปบนสุด

      // หา table หลักที่เป็นข้อมูลเที่ยว (หลีกเลี่ยง summary table อันแรก)
      // โครงสร้างตอนนี้: section[0]=หัวรายงาน, section[1]=summary, section[2]=กล่องแสดงตารางหลักของรถ
      const dataSection = sections[2] as HTMLElement | undefined;
      const mainTable = dataSection?.querySelector('table');
      const thead = mainTable?.querySelector('thead');
      const tbody = mainTable?.querySelector('tbody');
      const tfoot = mainTable?.querySelector('tfoot');

      // ฟังก์ชันสร้างตารางใหม่ในเพจ (ใส่ thead ซ้ำ)
      const createTableOnPage = (page: HTMLDivElement) => {
        const tbl = document.createElement('table');
        tbl.style.width = '100%';
        tbl.style.borderCollapse = 'collapse';
        tbl.style.fontSize = '14px';
        tbl.style.marginBottom = '3px';
        if (thead) tbl.appendChild(cloneNode(thead));
        const newTbody = document.createElement('tbody');
        tbl.appendChild(newTbody);
        page.appendChild(tbl);
        return { tbl, newTbody };
      };

      // สร้างหน้าแรก
      let currentPage = createPage();
      if (headerSection) currentPage.appendChild(headerSection.cloneNode(true));
      if (summarySection) {
        currentPage.appendChild(summarySection.cloneNode(true));
        // ถ้าเกินความสูงให้ย้าย summary ไปหน้าใหม่
        if (currentPage.scrollHeight > maxPageHeightPx) {
          // ย้าย summary ออกและสร้างหน้าใหม่
          if (currentPage.lastChild) currentPage.removeChild(currentPage.lastChild);
          currentPage = createPage();
          if (headerSection) currentPage.appendChild(headerSection.cloneNode(true));
          currentPage.appendChild(summarySection.cloneNode(true));
        }
      }
      let { tbl: currentTable, newTbody: currentTbody } = createTableOnPage(currentPage);

      // จัดหน้าโดยการเพิ่มแถวทีละแถวจนกว่าจะเต็มความสูงที่กำหนด
      if (!tbody) {
        // fallback: ถ้าไม่พบ tbody ให้ใช้ภาพรวมทั้งเอกสารเหมือนเดิม
        const canvasFallback = await html2canvas(sourceEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgW = contentWidthMm;
        const imgH = (canvasFallback.height * imgW) / (canvasFallback.width / (cssWidthPx / imgW));
        const imgData = canvasFallback.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', margin, margin, contentWidthMm, (canvasFallback.height * contentWidthMm) / canvasFallback.width);
      } else {
        const rows = Array.from(tbody.querySelectorAll('tr')) as HTMLTableRowElement[];
        for (let i = 0; i < rows.length; i++) {
          const rowClone = rows[i].cloneNode(true) as HTMLTableRowElement;
          currentTbody.appendChild(rowClone);

          // ถ้าเกินความสูงหน้ากระดาษ ให้ย้ายแถวนี้ไปหน้าใหม่
          if (currentPage.scrollHeight > maxPageHeightPx) {
            currentTbody.removeChild(rowClone);
            // ปิดตารางหน้าเดิมด้วยการเพิ่มเส้นแบ่งบางๆ (optional)
            // เริ่มหน้าใหม่
            currentPage = createPage();
            if (headerSection) currentPage.appendChild(headerSection.cloneNode(true));
            const created = createTableOnPage(currentPage);
            currentTable = created.tbl;
            currentTbody = created.newTbody;

            currentTbody.appendChild(rowClone);

            // ป้องกันกรณีแถวเดียวก็ยาวเกินทั้งหน้า (content ยาวมาก)
            if (currentPage.scrollHeight > maxPageHeightPx) {
              // ปล่อยให้ overflow เล็กน้อย แต่อย่างน้อยแถวจะไม่ถูกตัดคาบหน้า
              // (การแยกเนื้อหาในแถวให้ละเอียดกว่านี้ต้องปรับโครงสร้าง DOM เพิ่มเติม)
            }
          }
        }

        // เพิ่ม tfoot เฉพาะหน้าสุดท้าย (ถ้ามี)
        if (tfoot) {
          // ถ้าใส่แล้วเกิน ก็ขึ้นหน้าใหม่แล้วค่อยใส่
          const tfootClone = tfoot.cloneNode(true) as HTMLElement;
          currentTable.appendChild(tfootClone);
          if (currentPage.scrollHeight > maxPageHeightPx) {
            currentTable.removeChild(tfootClone);
            currentPage = createPage();
            if (headerSection) currentPage.appendChild(headerSection.cloneNode(true));
            const created = createTableOnPage(currentPage);
            currentTable = created.tbl;
            currentTbody = created.newTbody;
            // ไม่ต้องใส่แถวซ้ำ แค่ใส่ tfoot
            currentTable.appendChild(tfootClone);
          }
        }

        // แนบสรุปท้าย (Vehicle Summary - Detailed): พยายามต่อท้ายหน้าเดียวกันก่อน
        const vehicleSummary = dataSection?.querySelector('div.vehicle-summary-detailed');
        if (vehicleSummary) {
          const summaryClone = cloneNode(vehicleSummary);
          currentPage.appendChild(summaryClone);
          if (currentPage.scrollHeight > maxPageHeightPx) {
            // ถ้าไม่พอดีหน้านี้ ให้ย้ายไปหน้าใหม่ทั้งก้อน
            currentPage.removeChild(summaryClone);
            currentPage = createPage();
            if (headerSection) currentPage.appendChild(headerSection.cloneNode(true));
            currentPage.appendChild(summaryClone);
            // กรณี summary ใหญ่มากเกิน 1 หน้า ปล่อย overflow โดยไม่แยกส่วน
          }
        }
      }

      // สร้างภาพแต่ละหน้าและใส่ใน PDF
      for (let p = 0; p < pages.length; p++) {
        const pageEl = pages[p];
        const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        if (p > 0) doc.addPage();
        const drawWidthMm = contentWidthMm;
        const drawHeightMm = (canvas.height * drawWidthMm) / canvas.width;
        const pageIndex = p + 1;
        const totalPages = pages.length;
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', margin, margin, drawWidthMm, drawHeightMm);

        // footer
        doc.setFontSize(8);
        doc.text(`Print Date: ${new Date().toLocaleString('th-TH')}`, margin, pageHeight - 6);
        doc.text(`Page ${pageIndex}/${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
      }

      // ล้าง DOM ชั่วคราว
      paginationRoot.remove();

      const today = new Date().toISOString().split('T')[0];
      const fileName = `trip-report-${today}.pdf`;

      // เปิดหน้าต่างพิมพ์
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
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

      // คืนค่า style เดิมของ source
      sourceEl.style.visibility = prevVisibility;
      sourceEl.style.position = prevPosition;
      sourceEl.style.left = prevLeft;
      sourceEl.style.top = prevTop;
      sourceEl.style.width = prevWidth;
      
    } catch (e) {
      console.error(e);
      showSnackbar('เกิดข้อผิดพลาดในการสร้าง PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Export PDF สำหรับข้อมูลสรุปรถทั้งหมด
  // This function is no longer needed as we only support single vehicle selection
  // const exportAllVehiclesSummaryToPDF was removed

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
    <Layout showSidebar={false}>
      <Box data-print-content sx={{
        '@media print': {
          fontSize: '12px',
          lineHeight: 1.2,
          margin: '0 !important',
          padding: '0 !important',
          '@page': {
            margin: '10mm',
            size: 'A4',
          },
          '& .MuiPaper-root': {
            boxShadow: 'none !important',
            border: '1px solid #000 !important',
            margin: '2px 0 !important',
            padding: '4px !important',
            borderRadius: '0 !important',
            backgroundColor: '#fff !important',
          },
          '& .MuiTypography-h6': {
            fontSize: '12px !important',
            margin: '2px 0 !important',
            lineHeight: 1.1,
            color: '#000 !important',
          },
          '& .MuiTypography-body2': {
            fontSize: '9px !important',
            lineHeight: 1.1,
            margin: '1px 0 !important',
            color: '#000 !important',
          },
          '& .MuiTypography-caption': {
            fontSize: '7px !important',
            lineHeight: 1,
            color: '#000 !important',
          },
          '& .MuiBox-root': {
            margin: '2px 0 !important',
            padding: '2px !important',
          },
          '& .MuiTableCell-root': {
            padding: '1px 2px !important',
            fontSize: '8px !important',
            borderBottom: '1px solid #000 !important',
            lineHeight: 1.1,
            backgroundColor: '#fff !important',
            color: '#000 !important',
          },
          '& .MuiTableHead-root .MuiTableCell-root': {
            fontSize: '7px !important',
            fontWeight: 'bold !important',
            backgroundColor: '#fff !important',
            padding: '2px !important',
            color: '#000 !important',
          },
          // Remove all visual decorations for print
          '& .MuiSvgIcon-root': {
            display: 'none !important',
          },
          // Simplify all borders for print
          '& *': {
            backgroundColor: '#fff !important',
            color: '#000 !important',
          },
          gap: '2px !important',
        }
      }}>
        {/* Hidden Minimal PDF Template (Thai-friendly) */}
        <Box
          ref={minimalRef}
          sx={{
            visibility: 'hidden',
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: 1200,  // Increased width for landscape
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
          <Box className="section">
            <Typography component="h2" sx={{ fontSize: 18, fontWeight: 700 , fontFamily: `'Sarabun', Arial, sans-serif`,textAlign:'center' }}>
              รายงานบันทึกการเดินทาง
            </Typography>
            <Typography sx={{ fontSize: 16 , fontWeight: 500 , fontFamily: `'Sarabun', Arial, sans-serif`, whiteSpace: 'pre-line' , textAlign:'center' , marginBottom:'10px' }}>
              {selectedVehicleId && selectedMonth && selectedYear
                ? (() => {
                    const v = (Array.isArray(vehicles) ? vehicles : []).find(v => v.id.toString() === selectedVehicleId);
                    if (!v) return '';
                    const monthName = months.find(m => m.value === selectedMonth)?.label || selectedMonth;
                    const yearDisplay = parseInt(selectedYear) + 543;
                    return `${monthName} ${yearDisplay}\nรถ: ${v.licensePlate} - ${v.brand} ${v.model} (${getVehicleTypeLabel(v.vehicleType)}) | คนขับ: ${getVehicleDrivers(v.id, tripRecords).join(', ')} | จำนวนรอบ: ${tripRecords?.length || 0} เที่ยว`;
                  })()
                : ''}
            </Typography>
          </Box>

          {/* Summary */}
          <Box className="section" style={{ marginBottom: '5px'}}>
            <table className="table" style={{ fontSize: '14px' , width:'500px' , margin: '0 auto' }}>
              <thead>
                <tr>
                  <th>ระยะทางจริง (กม.)</th>
                  <th>ระยะทางระบบ (กม.)</th>
                  <th>ส่วนต่าง (กม.)</th>
                  
                </tr>
              </thead>
              <tbody>
                <tr style={{ textAlign: 'center' }}>
                  <td>{Number(totalDistance).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</td>
                  <td>{Number(totalEstimatedDistance).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</td>
                  <td>{Number(totalDistanceDifference).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</td>
                  
                </tr>
              </tbody>
            </table>
          </Box>

          {/* Data by single vehicle - New Layout Style */}
          {selectedVehicleId && tripRecords && tripRecords.length > 0 ? (
            uniqueVehicles.map(vehicle => {
              const vehicleTrips = tripRecords.filter(trip => trip.vehicle?.id === vehicle.id);
              if (vehicleTrips.length === 0) return null;
              return (
                <Box key={vehicle.id} className="section" style={{ marginBottom: '8px' , marginTop: '8px' }}>

                  {(() => {
                    const dateGroups = groupCustomersByDateRange(vehicleTrips);
                    const itemRows = aggregateItemsByCustomer(vehicleTrips);
                    const vehicleGrandTotal = itemRows.reduce((s, r) => s + (r.totalPrice || 0), 0);
                    
                    return (
                      <>
                        {/* Vehicle Header - Compact */
                        // Always show a date line for this vehicle: if user selected a range, show that; otherwise derive from trips
                        }
                        <table style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse',
                          fontSize: '14px',
                          marginBottom: '3px'
                        }}>
                          <thead>
                            {/* Vehicle date range header row */}
                            <tr>
                              <th style={{ 
                                border: '1px solid #000',
                                padding: '2px',
                                textAlign: 'center',
                                fontWeight: 700,
                                width: '10%'
                              }}>วันที่ไป-กลับ</th>
                              <th style={{ 
                                border: '1px solid #000',
                                padding: '2px',
                                textAlign: 'center',
                                fontWeight: 700,
                                width: '13%'
                              }}>ลูกค้า</th>
                              <th style={{ 
                                border: '1px solid #000',
                                padding: '2px',
                                textAlign: 'center',
                                fontWeight: 700,
                                width: '9%'
                              }}>คนขับ</th>
                              <th style={{ 
                                border: '1px solid #000',
                                padding: '2px',
                                textAlign: 'center',
                                fontWeight: 700,
                                width: '8%'
                              }}>เลขที่เอกสาร</th>
                              <th style={{ 
                                border: '1px solid #000',
                                padding: '2px',
                                textAlign: 'center',
                                fontWeight: 700,
                                width: '10%'
                              }}>ระยะทาง</th>
                              <th style={{ 
                                border: '1px solid #000',
                                padding: '2px',
                                textAlign: 'center',
                                fontWeight: 700,
                                width: '8%'
                              }}>ค่าเบี้ยเลี้ยง</th>
                              
                              <th style={{ 
                                border: '1px solid #000',
                                padding: '2px',
                                textAlign: 'center',
                                fontWeight: 700,
                                width: '7%'
                              }}>ค่าระยะทาง</th>
                              
                              <th style={{ 
                                border: '1px solid #000',
                                padding: '2px',
                                textAlign: 'center',
                                fontWeight: 700,
                                width: '6%'
                              }}>ค่าเที่ยว</th>
                              
                              <th style={{ 
                                border: '1px solid #000',
                                padding: '2px',
                                textAlign: 'center',
                                fontWeight: 700,
                                width: '17%'
                              }}>ค่าพัสดุ</th>
                              <th style={{ 
                                border: '1px solid #000',
                                padding: '2px',
                                textAlign: 'center',
                                fontWeight: 700,
                                width: '15%'
                              }}>ค่าใช้จ่ายของบริษัท</th>
                              
                              <th style={{ 
                                border: '1px solid #000',
                                padding: '2px',
                                textAlign: 'center',
                                fontWeight: 700,
                                width: '8%'
                              }}>รวม</th>
                              
                            </tr>
                          </thead>
                          <tbody>
                            {Object.keys(dateGroups).sort().map((dateRangeKey) => {
                              const customerGroups = dateGroups[dateRangeKey];
                              
                              return Object.keys(customerGroups).map((customerKey, customerIndex) => {
                                const list = customerGroups[customerKey];
                                const customerName = customerKey.split('::')[1] || 'ไม่ระบุลูกค้า';
                                
                                // Get document number for this specific trip (no comma joining)
                                const docNumberText = list[0]?.documentNumber || '-';
                                
                                // Calculate customer totals
                                const totalActualDist = list.reduce((sum, trip) => {
                                  const actualDist = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance;
                                  return sum + actualDist;
                                }, 0);
                                const totalEstimatedDist = list.reduce((sum, trip) => {
                                  const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                                  return sum + estimatedDist;
                                }, 0);
                                const totalAllowance = list.reduce((sum, trip) => sum + (typeof trip.totalAllowance === 'string' ? parseFloat(trip.totalAllowance) || 0 : trip.totalAllowance), 0);
                                
                                // Get items for this customer ONLY within this group's trips
                                // Previously filtered from all vehicle trips (itemRows), which leaked items from other rounds
                                const customerItems = aggregateItemsByCustomer(list);
                                
                                // Calculate distance cost
                                const totalDistanceCost = list.reduce((sum, trip) => {
                                  const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                                  return sum + (estimatedDist * distanceRate);
                                }, 0);
                                
                                // Calculate company expenses: ค่าซ่อมแซม + ค่าทางด่วน + ค่าน้ำมัน + ค่าเช็คระยะ
                                const totalDistanceCheckFee = list.reduce((sum, trip) => sum + (typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0), 0);
                                const totalFuelCost = list.reduce((sum, trip) => sum + (typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0), 0);
                                const totalTollFee = list.reduce((sum, trip) => sum + (typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0), 0);
                                const totalRepairCost = list.reduce((sum, trip) => sum + (typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0), 0);
                                const companyExpenses = totalDistanceCheckFee + totalFuelCost + totalTollFee + totalRepairCost;
                                
                                // Calculate total products for this customer
                                const totalProducts = customerItems.reduce((s, r) => s + (r.totalPrice || 0), 0);
                                
                                // Calculate trip fee for this group (จำนวนเที่ยว × ค่าเที่ยวต่อรอบ)
                                const tripFeeForGroup = list.length * tripFeeRate;
                                
                                // Calculate driver expenses: เฉพาะค่าพัสดุ (เบี้ยเลี้ยงและค่าระยะทางแยกคอลัมน์แล้ว)
                                const driverExpenses = totalProducts;
                                
                                // Calculate grand total (รวมทุกอย่าง รวมค่าเที่ยว)
                                const grandTotal = totalAllowance + totalProducts + totalDistanceCost + tripFeeForGroup + companyExpenses;
                                
                                // Calculate total signed difference by summing individual trip differences with sign
                                const totalAbsoluteDifference = list.reduce((sum, trip) => {
                                  const actualDist = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance || 0;
                                  const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                                  return sum + (actualDist - estimatedDist);
                                }, 0);
                                                                
                                return (
                                  <React.Fragment key={`${dateRangeKey}-${customerKey}`}>
                                    {/* Display date range in first column only for first customer in each date group */}
                                    <tr>
                                      <td style={{ 
                                        border: '1px solid #000',
                                        padding: '2px',
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        
                                      }}>
                                        {customerIndex === 0 ? (
                                          <div style={{ fontSize: '12px', fontWeight: 700 }}>{dateRangeKey.split('::')[0]}</div>
                                        ) : null}
                                      </td>
                                      <td style={{ 
                                        border: '1px solid #000',
                                        padding: '2px',
                                        textAlign: 'center',
                                        fontWeight: 600
                                      }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700 }}>{customerName}</div>
                                      </td>
                                      <td style={{ 
                                        border: '1px solid #000',
                                        padding: '2px',
                                        textAlign: 'center',
                                        fontWeight: 600
                                      }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700 }}>
                                          {(() => {
                                            const drivers = getCustomerDrivers(list);
                                            return drivers.length > 0 ? drivers.join(', ') : 'ไม่ระบุ';
                                          })()}
                                        </div>
                                      </td>
                                      <td style={{ 
                                        border: '1px solid #000',
                                        padding: '2px',
                                        textAlign: 'center'
                                      }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700 }}>{docNumberText}</div>
                                      </td>

                                      <td style={{ 
                                        border: '1px solid #000',
                                        padding: '2px',
                                        textAlign: 'center'
                                      }}>
                                        <div style={{ fontSize: '12px' }}>จริง: {Number(totalActualDist).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</div>
                                        <div style={{ fontSize: '12px' }}>ประมาณ: {Number(totalEstimatedDist).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</div>
                                        
                                        <div style={{ fontSize: '12px', fontWeight: 700 }}>
                                          ต่าง: {totalAbsoluteDifference >= 0 ? '+' : ''}{Number(totalAbsoluteDifference).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม
                                        </div>
                                      </td>
                                      
                                      {/* Allowance Column */}
                                      <td style={{ 
                                        border: '1px solid #000',
                                        padding: '2px',
                                        textAlign: 'center'
                                      }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700 }}>฿{formatCurrency(totalAllowance)}</div>
                                      </td>
                                      
                                      {/* Distance Cost Column */}
                                      <td style={{ 
                                        border: '1px solid #000',
                                        padding: '2px',
                                        textAlign: 'center'
                                      }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700 }}>฿{formatCurrency(totalDistanceCost)}</div>
                                      </td>
                                      
                                      {/* Trip Fee Column */}
                                      <td style={{ 
                                        border: '1px solid #000',
                                        padding: '2px',
                                        textAlign: 'center'
                                      }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700 }}>฿{formatCurrency(tripFeeForGroup)}</div>
                                        
                                      </td>

                                      {/* Driver Expenses: ค่าพัสดุ only (เบี้ยเลี้ยงและค่าระยะทางแยกคอลัมน์แล้ว) */}
                                      <td style={{ 
                                        border: '1px solid #000',
                                        padding: '2px',
                                        textAlign: 'center',
                                        fontSize: '12px'
                                      }}>
                                        <div>
                                          {customerItems.length > 0 && (
                                            <div>
                                              {customerItems.map((item, idx) => (
                                                <div key={idx} style={{ marginBottom: '1px' }}>
                                                  <strong>{item.name}</strong> {Number(item.quantity).toLocaleString('th-TH', { maximumFractionDigits: 2 })}{item.unit || ''} = ฿{formatCurrency(item.totalPrice)}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                          <div style={{ fontWeight: 700, marginTop: '1px', borderTop: '1px solid #ddd', paddingTop: '1px' }}>
                                            รวม: ฿{formatCurrency(driverExpenses)}
                                          </div>
                                        </div>
                                      </td>
                                      
                                      {/* Company Expenses: ค่าซ่อมแซม + ค่าทางด่วน + ค่าน้ำมัน + ค่าเช็คระยะ */}
                                      <td style={{ 
                                        border: '1px solid #000',
                                        padding: '5px',
                                        textAlign: 'center',
                                        fontSize: '12px'
                                      }}>
                                        {companyExpenses > 0 ? (
                                          <div>
                                            {totalDistanceCheckFee > 0 && <div>เช็คระยะ: ฿{formatCurrency(totalDistanceCheckFee)}</div>}
                                            {totalFuelCost > 0 && <div>น้ำมัน: ฿{formatCurrency(totalFuelCost)}</div>}
                                            {totalTollFee > 0 && <div>ทางด่วน: ฿{formatCurrency(totalTollFee)}</div>}
                                            {totalRepairCost > 0 && <div>ซ่อมแซม: ฿{formatCurrency(totalRepairCost)}</div>}
                                            <div style={{ fontWeight: 700, marginTop: '1px', borderTop: '1px solid #ddd', paddingTop: '1px' }}>
                                              รวม: ฿{formatCurrency(companyExpenses)}
                                            </div>
                                          </div>
                                        ) : (
                                          <div style={{ fontSize: '12px', fontWeight: 700 }}>฿{formatCurrency(0)}</div>
                                        )}
                                      </td>
                                      
                                      <td style={{ 
                                        border: '1px solid #000',
                                        padding: '5px',
                                        textAlign: 'center',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        backgroundColor: '#f5f5f5'
                                      }}>
                                        <div style={{ color: '#000' }}>
                                          ฿{formatCurrency(grandTotal)}
                                        </div>
                                        
                                      </td>

                                    </tr>
                                  </React.Fragment>
                                );
                              });
                            })}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={5} style={{ 
                                border: '1px solid #000',
                                padding: '4px',
                                textAlign: 'right',
                                fontWeight: 700,
                                fontSize: '13px',
                                
                              }}>รวมทั้งหมด:</td>
                              
                              {/* Column 5: Allowance Total */}
                              <td style={{ 
                                border: '1px solid #000',
                                padding: '4px',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '13px',
                                
                              }}>
                                ฿{(() => {
                                  const totalAllowance = vehicleTrips.reduce((sum, trip) => {
                                    const allowance = typeof trip.totalAllowance === 'string' 
                                      ? parseFloat(trip.totalAllowance) || 0 
                                      : trip.totalAllowance || 0;
                                    return sum + allowance;
                                  }, 0);
                                  return formatCurrency(totalAllowance);
                                })()}
                              </td>
                              {/* Column 6: Distance Cost Total */}
                              <td style={{ 
                                border: '1px solid #000',
                                padding: '4px',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '13px',
                                
                              }}>
                                ฿{(() => {
                                  const totalDistanceCost = vehicleTrips.reduce((sum, trip) => {
                                    const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                                    return sum + (estimatedDist * distanceRate);
                                  }, 0);
                                  return formatCurrency(totalDistanceCost);
                                })()}
                              </td>
                              {/* Column 7: Trip Fee Total */}
                              <td style={{ 
                                border: '1px solid #000',
                                padding: '4px',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '13px',
                                
                              }}>
                                ฿{(() => {
                                  const totalTripFee = vehicleTrips.length * tripFeeRate;
                                  return formatCurrency(totalTripFee);
                                })()}
                              </td>
                              {/* Column 8: Driver Expenses Total (Items Only - allowance and distance cost are separate) */}
                              <td style={{ 
                                border: '1px solid #000',
                                padding: '4px',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '13px',
                                
                              }}>
                                ฿{(() => {
                                  const totalItems = vehicleTrips.reduce((sum, trip) => {
                                    const itemsTotal = trip.tripItems?.reduce((itemSum: number, item: any) => {
                                      const price = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) || 0 : item.totalPrice;
                                      return itemSum + price;
                                    }, 0) || 0;
                                    return sum + itemsTotal;
                                  }, 0);
                                  return formatCurrency(totalItems);
                                })()}
                              </td>
                              {/* Column 8: Company Expenses Total */}
                              <td style={{ 
                                border: '1px solid #000',
                                padding: '4px',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '13px',
                                
                              }}>
                                ฿{(() => {
                                  const totalExpenses = vehicleTrips.reduce((sum, trip) => {
                                    const distanceCheckFee = typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0;
                                    const fuelCost = typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0;
                                    const tollFee = typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0;
                                    const repairCost = typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0;
                                    return sum + distanceCheckFee + fuelCost + tollFee + repairCost;
                                  }, 0);
                                  return formatCurrency(totalExpenses);
                                })()}
                              </td>
                              
                              {/* Column 10: Grand Total */}
                              <td style={{ 
                                border: '1px solid #000',
                                padding: '4px',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '14px',
                                backgroundColor: '#f5f5f5'
                              }}>
                                ฿{(() => {
                                  const totalAllowance = vehicleTrips.reduce((sum, trip) => {
                                    const allowance = typeof trip.totalAllowance === 'string' 
                                      ? parseFloat(trip.totalAllowance) || 0 
                                      : trip.totalAllowance || 0;
                                    return sum + allowance;
                                  }, 0);
                                  const totalItems = vehicleTrips.reduce((sum, trip) => {
                                    const itemsTotal = trip.tripItems?.reduce((itemSum: number, item: any) => {
                                      const price = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) || 0 : item.totalPrice;
                                      return itemSum + price;
                                    }, 0) || 0;
                                    return sum + itemsTotal;
                                  }, 0);
                                  const totalDistanceCost = vehicleTrips.reduce((sum, trip) => {
                                    const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                                    return sum + (estimatedDist * distanceRate);
                                  }, 0);
                                  const totalTripFee = vehicleTrips.length * tripFeeRate;
                                  const totalExpenses = vehicleTrips.reduce((sum, trip) => {
                                    const distanceCheckFee = typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0;
                                    const fuelCost = typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0;
                                    const tollFee = typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0;
                                    const repairCost = typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0;
                                    return sum + distanceCheckFee + fuelCost + tollFee + repairCost;
                                  }, 0);
                                  const grandTotal = totalAllowance + totalDistanceCost + totalTripFee + totalItems + totalExpenses;
                                  return formatCurrency(grandTotal);
                                })()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                        
                        {/* Vehicle Summary - Detailed */}
                        <div className="vehicle-summary-detailed" style={{ 
                          
                          padding: '4px', 
                          fontSize: '12px',
                          marginTop: '2px',
                          backgroundColor: '#f9f9f9'
                        }}>
                          {(() => {
                            // Calculate total products/services value
                            const vehicleProducts = vehicleTrips.reduce((sum, trip) => {
                              const itemsTotal = trip.tripItems?.reduce((itemSum: number, item: any) => {
                                const price = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) || 0 : item.totalPrice;
                                return itemSum + price;
                              }, 0) || 0;
                              return sum + itemsTotal;
                            }, 0);

                            // Calculate company expenses for this vehicle
                            const vehicleCompanyExpenses = vehicleTrips.reduce((sum, trip) => {
                              const distanceCheckFee = typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0;
                              const fuelCost = typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0;
                              const tollFee = typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0;
                              const repairCost = typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0;
                              return sum + distanceCheckFee + fuelCost + tollFee + repairCost;
                            }, 0);
                            
                            // Calculate distance cost for this vehicle
                            const vehicleDistanceCost = vehicleTrips.reduce((sum, trip) => {
                              const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                              return sum + (estimatedDist * distanceRate);
                            }, 0);

                            // Calculate item categories breakdown with quantities
                            const itemCategories = new Map();
                            vehicleTrips.forEach(trip => {
                              trip.tripItems?.forEach((item: any) => {
                                const name = item?.item?.ptDesc1 || item?.itemName || item?.item?.ptPart || 'พัสดุอื่นๆ';
                                const price = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) || 0 : item.totalPrice || 0;
                                const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity || 0;
                                const unit = item?.unit || item?.item?.ptUm || 'หน่วย';
                                
                                const existing = itemCategories.get(name) || { total: 0, qty: 0, unit: unit };
                                itemCategories.set(name, {
                                  total: existing.total + price,
                                  qty: existing.qty + qty,
                                  unit: unit
                                });
                              });
                            });

                            // Calculate expense categories breakdown
                            const expenseCategories = new Map();
                            vehicleTrips.forEach(trip => {
                              const distanceCheckFee = typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0;
                              const fuelCost = typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0;
                              const tollFee = typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0;
                              const repairCost = typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0;
                              
                              if (distanceCheckFee > 0) expenseCategories.set('ค่าเช็คระยะ', (expenseCategories.get('ค่าเช็คระยะ') || 0) + distanceCheckFee);
                              if (fuelCost > 0) expenseCategories.set('ค่าน้ำมัน', (expenseCategories.get('ค่าน้ำมัน') || 0) + fuelCost);
                              if (tollFee > 0) expenseCategories.set('ค่าทางด่วน', (expenseCategories.get('ค่าทางด่วน') || 0) + tollFee);
                              if (repairCost > 0) expenseCategories.set('ค่าซ่อมแซม', (expenseCategories.get('ค่าซ่อมแซม') || 0) + repairCost);
                            });

                            return (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                
                                {/* Column 1 - Products/Services */}
                                <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                                  <div style={{ fontWeight: 700, marginBottom: '12px' }}></div>
                                  
                                  {/* Products/Services Breakdown */}
                                  <div style={{ marginBottom: '8px', flex: '1' }}>
                                    <div style={{ 
                                      fontWeight: 600, 
                                      fontSize: '12px', 
                                      marginBottom: '4px',
                                      paddingBottom: '2px',
                                      borderBottom: '1px solid #eee'
                                    }}>พัสดุที่นำกลับ:</div>
                                    {Array.from(itemCategories.entries()).length > 0 ? (
                                      Array.from(itemCategories.entries()).map(([name, data]) => (
                                        <div key={name} style={{ 
                                          fontSize: '12px', 
                                          marginLeft: '6px', 
                                          marginBottom: '2px',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          paddingRight: '4px'
                                        }}>
                                          <span style={{ flex: 1 }}>• {name} ({Number(data.qty).toLocaleString('th-TH', { maximumFractionDigits: 2 })} {data.unit})</span>
                                          <span style={{ fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>฿{formatCurrency(data.total)}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <div style={{ 
                                        fontSize: '12px', 
                                        marginLeft: '6px', 
                                        marginBottom: '2px',
                                        color: '#666',
                                        fontStyle: 'italic'
                                      }}>
                                        ไม่มีพัสดุที่นำกลับ
                                      </div>
                                    )}
                                    <div style={{ 
                                      fontSize: '12px', 
                                      fontWeight: 700, 
                                      marginLeft: '6px', 
                                      borderTop: '1px solid #ccc', 
                                      paddingTop: '3px', 
                                      marginTop: '4px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      paddingRight: '4px',
                                      backgroundColor: '#f8f8f8',
                                      padding: '3px 4px'
                                    }}>
                                      <span>รวมพัสดุที่นำกลับ:</span>
                                      <span style={{ minWidth: '60px', textAlign: 'right' }}>฿{formatCurrency(vehicleProducts)}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Column 2 - Expenses and Total */}
                                <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                                  <div style={{ fontWeight: 700, marginBottom: '12px' }}></div>
                                  
                                  {/* Expenses Breakdown */}
                                  <div style={{ marginBottom: '8px', flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                      <div style={{ 
                                        fontWeight: 600, 
                                        fontSize: '12px', 
                                        marginBottom: '4px',
                                        paddingBottom: '2px',
                                        borderBottom: '1px solid #eee'
                                      }}>ค่าใช้จ่ายอื่น ๆ:</div>
                                      {Array.from(expenseCategories.entries()).length > 0 ? (
                                        Array.from(expenseCategories.entries()).map(([name, total]) => (
                                          <div key={name} style={{ 
                                            fontSize: '12px', 
                                            marginLeft: '6px', 
                                            marginBottom: '2px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            paddingRight: '4px'
                                          }}>
                                            <span style={{ flex: 1 }}>• {name}</span>
                                            <span style={{ fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>฿{formatCurrency(total)}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <div style={{ 
                                          fontSize: '12px', 
                                          marginLeft: '6px', 
                                          marginBottom: '2px',
                                          color: '#666',
                                          fontStyle: 'italic'
                                        }}>
                                          ไม่มีค่าใช้จ่ายอื่น ๆ
                                        </div>
                                      )}
                                      <div style={{ 
                                        fontSize: '12px', 
                                        fontWeight: 700, 
                                        marginLeft: '6px', 
                                        borderTop: '1px solid #ccc', 
                                        paddingTop: '3px', 
                                        marginTop: '4px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingRight: '4px',
                                        backgroundColor: '#f8f8f8',
                                        padding: '3px 4px'
                                      }}>
                                        <span>รวมค่าใช้จ่าย:</span>
                                        <span style={{ minWidth: '60px', textAlign: 'right' }}>฿{formatCurrency(vehicleCompanyExpenses)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                                  <div style={{ fontWeight: 700, marginBottom: '12px' }}></div>
                                  
                                  {/* Grand Total Section */}
                                  <div style={{ marginBottom: '8px', flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                                    {(() => {
                                      // Calculate total allowance for this vehicle
                                      const totalAllowance = vehicleTrips.reduce((sum, trip) => {
                                        const allowance = typeof trip.totalAllowance === 'string' 
                                          ? parseFloat(trip.totalAllowance) || 0 
                                          : trip.totalAllowance || 0;
                                        return sum + allowance;
                                      }, 0);

                                      // Calculate trip fee for all trips of this vehicle
                                      const vehicleTripFee = vehicleTrips.length * tripFeeRate;
                                      
                                      const driverExpenses = totalAllowance + vehicleProducts + vehicleDistanceCost + vehicleTripFee;
                                      const grandTotal = driverExpenses + vehicleCompanyExpenses;

                                      return (
                                        <div>
                                          <div style={{ 
                                            fontWeight: 600, 
                                            fontSize: '12px', 
                                            marginBottom: '4px',
                                            paddingBottom: '2px',
                                            borderBottom: '1px solid #eee'
                                          }}>สรุปยอดรวม:</div>
                                          
                                          {/* ค่าใช้จ่ายของบริษัท */}
                                          <div style={{ 
                                            fontSize: '12px', 
                                            marginLeft: '6px', 
                                            marginBottom: '2px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            paddingRight: '4px',
                                            
                                          }}>
                                            <span style={{ flex: 1 }}>• ค่าใช้จ่ายของบริษัท</span>
                                            <span style={{ fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>฿{formatCurrency(vehicleCompanyExpenses)}</span>
                                          </div>
                                          
                                          {/* ค่าใช้จ่ายที่ต้องจ่ายพนักงานขับรถ */}
                                          <div style={{ 
                                            fontSize: '12px', 
                                            marginLeft: '6px', 
                                            marginBottom: '4px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            paddingRight: '4px',
                                            
                                          }}>
                                            <span style={{ flex: 1 }}>• ค่าใช้จ่ายที่ต้องจ่ายพนักงานขับรถ</span>
                                            <span style={{ fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>฿{formatCurrency(driverExpenses)}</span>
                                          </div>

                                          <div style={{ 
                                            fontSize: '14px', 
                                            fontWeight: 'bold', 
                                            marginLeft: '6px', 
                                            borderTop: '2px solid #333', 
                                            paddingTop: '6px', 
                                            marginTop: '8px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            paddingRight: '8px',
                                            backgroundColor: '#f5f5f5',
                                            padding: '8px 12px',
                                            border: '2px solid #424242',
                                            borderRadius: '4px'
                                          }}>
                                            <span style={{ 
                                              fontSize: '16px', 
                                              fontWeight: 'bold',
                                              color: '#212121'
                                            }}>ยอดรวมทั้งหมด:</span>
                                            <span style={{ 
                                              minWidth: '80px', 
                                              textAlign: 'right',
                                              fontSize: '18px',
                                              fontWeight: 'bold',
                                              color: '#424242'
                                            }}>฿{formatCurrency(grandTotal)}</span>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                                
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    );
                  })()}
                </Box>
              );
            })
          ) : selectedVehicleId && tripRecords && tripRecords.length > 0 ? (
            <Box className="section">
              {/* Single vehicle display - New Layout Style */}
              {(() => {
                const selectedVehicle = uniqueVehicles.find(v => v.id === Number(selectedVehicleId));
                const dateGroups = groupCustomersByDateRange(tripRecords);
                const itemRows = aggregateItemsByCustomer(tripRecords);
                const vehicleGrandTotal = itemRows.reduce((s, r) => s + (r.totalPrice || 0), 0);
                
                return (
                  <>
                    {/* Vehicle Header - Compact */}
                    <div style={{ 
                      
                      padding: '4px',
                      marginBottom: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: 700,
                      fontSize: '12px'
                    }}>
                      <div>
                        {selectedVehicle ? `${selectedVehicle.licensePlate} - ${selectedVehicle.brand} ${selectedVehicle.model} (${getVehicleTypeLabel(selectedVehicle.vehicleType)})` : 'รถที่เลือก'}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 'normal' }}>
                        {selectedVehicle && (() => {
                          const drivers = getVehicleDrivers(selectedVehicle.id, tripRecords);
                          if (drivers.length > 0) {
                            return `คนขับ: ${drivers.join(', ')}`;
                          }
                          return '';
                        })()}
                      </div>
                    </div>

                    {/* Main Data Table - Compact */}
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      fontSize: '12px',
                      marginBottom: '3px'
                    }}>
                      <thead>
                        <tr>
                          <th style={{ 
                            border: '1px solid #000',
                            padding: '2px',
                            textAlign: 'center',
                            fontWeight: 700,
                            width: '10%'
                          }}>วันที่ไป-กลับ</th>
                          <th style={{ 
                            border: '1px solid #000',
                            padding: '2px',
                            textAlign: 'center',
                            fontWeight: 700,
                            width: '12%'
                          }}>ลูกค้า</th>
                          <th style={{ 
                            border: '1px solid #000',
                            padding: '2px',
                            textAlign: 'center',
                            fontWeight: 700,
                            width: '9%'
                          }}>คนขับ</th>
                          <th style={{ 
                            border: '1px solid #000',
                            padding: '2px',
                            textAlign: 'center',
                            fontWeight: 700,
                            width: '8%'
                          }}>เลขที่เอกสาร</th>
                          
                          <th style={{ 
                            border: '1px solid #000',
                            padding: '2px',
                            textAlign: 'center',
                            fontWeight: 700,
                            width: '11%'
                          }}>ระยะทาง</th>
                          <th style={{ 
                            border: '1px solid #000',
                            padding: '2px',
                            textAlign: 'center',
                            fontWeight: 700,
                            width: '7%'
                          }}>เบี้ยเลี้ยง</th>
                          <th style={{ 
                            border: '1px solid #000',
                            padding: '2px',
                            textAlign: 'center',
                            fontWeight: 700,
                            width: '15%'
                          }}>พัสดุที่นำกลับ</th>
                          <th style={{ 
                            border: '1px solid #000',
                            padding: '2px',
                            textAlign: 'center',
                            fontWeight: 700,
                            width: '10%'
                          }}>ค่าใช้จ่าย</th>
                          <th style={{ 
                            border: '1px solid #000',
                            padding: '2px',
                            textAlign: 'center',
                            fontWeight: 700,
                            width: '10%'
                          }}>รวมค่าใช้จ่าย</th>
                          <th style={{ 
                            border: '1px solid #000',
                            padding: '2px',
                            textAlign: 'center',
                            fontWeight: 700,
                            width: '8%'
                          }}>หมายเหตุ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(dateGroups).sort().map((dateRangeKey) => {
                          const customerGroups = dateGroups[dateRangeKey];
                          
                          return Object.keys(customerGroups).map((customerKey, customerIndex) => {
                            const list = customerGroups[customerKey];
                            const customerName = customerKey.split('::')[1] || 'ไม่ระบุลูกค้า';
                            
                            // Get document number for this specific trip (no comma joining)
                            const docNumberText = list[0]?.documentNumber || '-';
                            
                            // Calculate customer totals
                            const totalActualDist = list.reduce((sum, trip) => {
                              const actualDist = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance;
                              return sum + actualDist;
                            }, 0);
                            const totalEstimatedDist = list.reduce((sum, trip) => {
                              const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                              return sum + estimatedDist;
                            }, 0);
                            const totalAllowance = list.reduce((sum, trip) => sum + (typeof trip.totalAllowance === 'string' ? parseFloat(trip.totalAllowance) || 0 : trip.totalAllowance), 0);
                            
                            // Get items for this customer ONLY within this group's trips
                            const customerItems = aggregateItemsByCustomer(list);
                            
                            // Calculate expenses
                            const totalDistanceCheckFee = list.reduce((sum, trip) => sum + (typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0), 0);
                            const totalFuelCost = list.reduce((sum, trip) => sum + (typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0), 0);
                            const totalTollFee = list.reduce((sum, trip) => sum + (typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0), 0);
                            const totalRepairCost = list.reduce((sum, trip) => sum + (typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0), 0);
                            const totalExpenses = totalDistanceCheckFee + totalFuelCost + totalTollFee + totalRepairCost;
                            
                            // Calculate total products for this customer
                            const totalProducts = customerItems.reduce((s, r) => s + (r.totalPrice || 0), 0);
                            
                            // Calculate grand total (allowance + products + expenses)
                            const grandTotal = totalAllowance + totalProducts + totalExpenses;
                            
                            // Calculate total signed difference by summing individual trip differences with sign
                            const totalAbsoluteDifference = list.reduce((sum, trip) => {
                              const actualDist = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance || 0;
                              const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                              return sum + (actualDist - estimatedDist);
                            }, 0);
                            
                            // Get remarks
                            const remarks = list.filter(t => t.remark && t.remark.trim()).map(t => t.remark).join('; ');
                            
                            return (
                              <React.Fragment key={`${dateRangeKey}-${customerKey}`}>
                                {/* Single row with all data */}
                                <tr>
                                  <td style={{ 
                                    border: '1px solid #000',
                                    padding: '2px',
                                    textAlign: 'center',
                                    fontWeight: 700,
                                    backgroundColor: customerIndex === 0 ? '#f5f5f5' : 'transparent'
                                  }}>
                                    {customerIndex === 0 ? (
                                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{dateRangeKey.split('::')[0]}</div>
                                    ) : null}
                                  </td>
                                  <td style={{ 
                                    border: '1px solid #000',
                                    padding: '2px',
                                    textAlign: 'center',
                                    fontWeight: 600
                                  }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700 }}>{customerName}</div>
                                  </td>
                                  <td style={{ 
                                    border: '1px solid #000',
                                    padding: '2px',
                                    textAlign: 'center',
                                    fontWeight: 600
                                  }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700 }}>
                                      {(() => {
                                        const drivers = getCustomerDrivers(list);
                                        return drivers.length > 0 ? drivers.join(', ') : 'ไม่ระบุ';
                                      })()}
                                    </div>
                                  </td>
                                  <td style={{ 
                                    border: '1px solid #000',
                                    padding: '2px',
                                    textAlign: 'center'
                                  }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700 }}>{docNumberText}</div>
                                  </td>
                                  
                                  <td style={{ 
                                    border: '1px solid #000',
                                    padding: '2px',
                                    textAlign: 'center'
                                  }}>
                                    <div style={{ fontSize: '12px' }}>ประมาณ: {Math.round(totalEstimatedDist)}</div>
                                    <div style={{ fontSize: '12px' }}>จริง: {Math.round(totalActualDist)}</div>
                                    <div style={{ fontSize: '12px', fontWeight: 700 }}>
                                      ต่าง: {totalAbsoluteDifference >= 0 ? '+' : ''}{Math.round(totalAbsoluteDifference)} กม
                                    </div>
                                  </td>
                                  <td style={{ 
                                    border: '1px solid #000',
                                    padding: '2px',
                                    textAlign: 'center'
                                  }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700 }}>฿{(Math.round(totalAllowance * 10) / 10).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
                                  </td>
                                  <td style={{ 
                                    border: '1px solid #000',
                                    padding: '2px',
                                    textAlign: 'center',
                                    fontSize: '12px'
                                  }}>
                                    {customerItems.length > 0 ? (
                                      <div>
                                        {customerItems.map((item, idx) => (
                                          <div key={idx} style={{ marginBottom: '1px' }}>
                                            <strong>{item.name}</strong><br /> {Number(item.quantity).toLocaleString('th-TH', { maximumFractionDigits: 2 })}{item.unit || ''} = ฿{formatCurrency(item.totalPrice as any)}
                                          </div>
                                        ))}
                                        <div style={{ fontWeight: 700, marginTop: '1px', borderTop: '1px solid #ddd', paddingTop: '1px' }}>
                                          รวม: ฿{formatCurrency(customerItems.reduce((s, r) => s + (Number(r.totalPrice) || 0), 0))}
                                        </div>
                                      </div>
                                    ) : '-'}
                                  </td>
                                  <td style={{ 
                                    border: '1px solid #000',
                                    padding: '5px',
                                    textAlign: 'left',
                                    fontSize: '12px'
                                  }}>
                                    {totalExpenses > 0 ? (
                                      <div>
                                        {totalDistanceCheckFee > 0 && <div>เช็คระยะ: ฿{formatCurrency(totalDistanceCheckFee)}</div>}
                                        {totalFuelCost > 0 && <div>น้ำมัน: ฿{formatCurrency(totalFuelCost)}</div>}
                                        {totalTollFee > 0 && <div>ทางด่วน: ฿{formatCurrency(totalTollFee)}</div>}
                                        {totalRepairCost > 0 && <div>ซ่อมแซม: ฿{formatCurrency(totalRepairCost)}</div>}
                                        <div style={{ fontWeight: 700, marginTop: '1px', borderTop: '1px solid #ddd', paddingTop: '1px' }}>
                                          รวม: ฿{formatCurrency(totalExpenses)}
                                        </div>
                                      </div>
                                    ) : '-'}
                                  </td>
                                  <td style={{ 
                                    border: '1px solid #000',
                                    padding: '5px',
                                    textAlign: 'center',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    backgroundColor: '#f5f5f5'
                                  }}>
                                    <div style={{ color: '#1976d2' }}>
                                      ฿{formatCurrency(grandTotal)}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                                      {formatCurrency(totalAllowance)} + {formatCurrency(totalProducts)} + {formatCurrency(totalExpenses)}
                                    </div>
                                  </td>
                                  <td style={{ 
                                    border: '1px solid #000',
                                    padding: '5px',
                                    textAlign: 'left',
                                    fontSize: '12px'
                                  }}>
                                    {remarks.length > 20 ? remarks.substring(0, 20) + '...' : remarks || '-'}
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          });
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={6} style={{ 
                            border: '1px solid #000',
                            padding: '4px',
                            textAlign: 'right',
                            fontWeight: 700,
                            fontSize: '12px',
                            backgroundColor: '#f0f0f0'
                          }}>รวมทั้งหมด:</td>
                          <td style={{ 
                            border: '1px solid #000',
                            padding: '4px',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                            backgroundColor: '#f0f0f0'
                          }}>
                            ฿{(() => {
                              const totalAllowance = tripRecords.reduce((sum, trip) => {
                                const allowance = typeof trip.totalAllowance === 'string' 
                                  ? parseFloat(trip.totalAllowance) || 0 
                                  : trip.totalAllowance || 0;
                                return sum + allowance;
                              }, 0);
                              return (Math.round(totalAllowance * 10) / 10).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                            })()}
                          </td>
                          <td style={{ 
                            border: '1px solid #000',
                            padding: '4px',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                            backgroundColor: '#f0f0f0'
                          }}>
                            ฿{(() => {
                              const totalItems = tripRecords.reduce((sum, trip) => {
                                const itemsTotal = trip.tripItems?.reduce((itemSum: number, item: any) => {
                                  const price = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) || 0 : item.totalPrice;
                                  return itemSum + price;
                                }, 0) || 0;
                                return sum + itemsTotal;
                              }, 0);
                              return Math.round(totalItems).toLocaleString('th-TH');
                            })()}
                          </td>
                          <td style={{ 
                            border: '1px solid #000',
                            padding: '4px',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                            backgroundColor: '#f0f0f0'
                          }}>
                            ฿{(() => {
                              const totalExpenses = tripRecords.reduce((sum, trip) => {
                                const distanceCheckFee = typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0;
                                const fuelCost = typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0;
                                const tollFee = typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0;
                                const repairCost = typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0;
                                return sum + distanceCheckFee + fuelCost + tollFee + repairCost;
                              }, 0);
                              return Math.round(totalExpenses).toLocaleString('th-TH');
                            })()}
                          </td>
                          <td style={{ 
                            border: '1px solid #000',
                            padding: '4px',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: '14px',
                            backgroundColor: '#e3f2fd'
                          }}>
                            ฿{(() => {
                              const totalAllowance = tripRecords.reduce((sum, trip) => {
                                const allowance = typeof trip.totalAllowance === 'string' 
                                  ? parseFloat(trip.totalAllowance) || 0 
                                  : trip.totalAllowance || 0;
                                return sum + allowance;
                              }, 0);
                              const totalItems = tripRecords.reduce((sum, trip) => {
                                const itemsTotal = trip.tripItems?.reduce((itemSum: number, item: any) => {
                                  const price = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) || 0 : item.totalPrice;
                                  return itemSum + price;
                                }, 0) || 0;
                                return sum + itemsTotal;
                              }, 0);
                              const totalExpenses = tripRecords.reduce((sum, trip) => {
                                const distanceCheckFee = typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0;
                                const fuelCost = typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0;
                                const tollFee = typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0;
                                const repairCost = typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0;
                                return sum + distanceCheckFee + fuelCost + tollFee + repairCost;
                              }, 0);
                              const grandTotal = totalAllowance + totalItems + totalExpenses;
                              return Math.round(grandTotal).toLocaleString('th-TH');
                            })()}
                          </td>
                          <td style={{ 
                            border: '1px solid #000',
                            padding: '4px',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                            backgroundColor: '#f0f0f0'
                          }}>-</td>
                        </tr>
                      </tfoot>
                    </table>
                    
                    {/* Vehicle Summary - Detailed */}
                    <div className="vehicle-summary-detailed" style={{ 
                       
                      padding: '4px', 
                      fontSize: '12px',
                      marginTop: '2px',
                      backgroundColor: '#f9f9f9'
                    }}>
                      {(() => {
                        // Calculate total products/services value
                        const vehicleProducts = tripRecords.reduce((sum, trip) => {
                          const itemsTotal = trip.tripItems?.reduce((itemSum: number, item: any) => {
                            const price = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) || 0 : item.totalPrice;
                            return itemSum + price;
                          }, 0) || 0;
                          return sum + itemsTotal;
                        }, 0);

                        // Calculate company expenses
                        const vehicleCompanyExpenses = tripRecords.reduce((sum, trip) => {
                          const distanceCheckFee = typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0;
                          const fuelCost = typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0;
                          const tollFee = typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0;
                          const repairCost = typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0;
                          return sum + distanceCheckFee + fuelCost + tollFee + repairCost;
                        }, 0);
                        
                        // Calculate distance cost
                        const vehicleDistanceCost = tripRecords.reduce((sum, trip) => {
                          const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                          return sum + (estimatedDist * distanceRate);
                        }, 0);

                        // Calculate item categories breakdown with quantities
                        const itemCategories = new Map();
                        tripRecords.forEach(trip => {
                          trip.tripItems?.forEach((item: any) => {
                            const name = item?.item?.ptDesc1 || item?.itemName || item?.item?.ptPart || 'พัสดุอื่นๆ';
                            const price = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) || 0 : item.totalPrice || 0;
                            const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity || 0;
                            const unit = item?.unit || item?.item?.ptUm || 'หน่วย';
                            
                            const existing = itemCategories.get(name) || { total: 0, qty: 0, unit: unit };
                            itemCategories.set(name, {
                              total: existing.total + price,
                              qty: existing.qty + qty,
                              unit: unit
                            });
                          });
                        });

                        // Calculate expense categories breakdown
                        const expenseCategories = new Map();
                        tripRecords.forEach(trip => {
                          const distanceCheckFee = typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0;
                          const fuelCost = typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0;
                          const tollFee = typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0;
                          const repairCost = typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0;
                          
                          if (distanceCheckFee > 0) expenseCategories.set('ค่าเช็คระยะ', (expenseCategories.get('ค่าเช็คระยะ') || 0) + distanceCheckFee);
                          if (fuelCost > 0) expenseCategories.set('ค่าน้ำมัน', (expenseCategories.get('ค่าน้ำมัน') || 0) + fuelCost);
                          if (tollFee > 0) expenseCategories.set('ค่าทางด่วน', (expenseCategories.get('ค่าทางด่วน') || 0) + tollFee);
                          if (repairCost > 0) expenseCategories.set('ค่าซ่อมแซม', (expenseCategories.get('ค่าซ่อมแซม') || 0) + repairCost);
                        });

                        return (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>                        
                            
                            {/* Column 1 - Products/Services */}
                            <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                              <div style={{ fontWeight: 700, marginBottom: '12px' }}>สรุปรายการ {selectedVehicle?.licensePlate}:</div>
                              
                              {/* Products/Services Breakdown */}
                              <div style={{ marginBottom: '8px', flex: '1' }}>
                                <div style={{ 
                                  fontWeight: 600, 
                                  fontSize: '12px', 
                                  marginBottom: '4px',
                                  paddingBottom: '2px',
                                  borderBottom: '1px solid #eee'
                                }}>พัสดุที่นำกลับ:</div>
                                {Array.from(itemCategories.entries()).length > 0 ? (
                                  Array.from(itemCategories.entries()).map(([name, data]) => (
                                    <div key={name} style={{ 
                                      fontSize: '12px', 
                                      marginLeft: '6px', 
                                      marginBottom: '2px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      paddingRight: '4px'
                                    }}>
                                      <span style={{ flex: 1 }}>• {name} ({Math.round(data.qty).toLocaleString('th-TH')} {data.unit})</span>
                                      <span style={{ fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>฿{(Math.round(data.total * 10) / 10).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div style={{ 
                                    fontSize: '12px', 
                                    marginLeft: '6px', 
                                    marginBottom: '2px',
                                    color: '#666',
                                    fontStyle: 'italic'
                                  }}>
                                    ไม่มีพัสดุที่นำกลับ
                                  </div>
                                )}
                                <div style={{ 
                                  fontSize: '12px', 
                                  fontWeight: 700, 
                                  marginLeft: '6px', 
                                  borderTop: '1px solid #ccc', 
                                  paddingTop: '3px', 
                                  marginTop: '4px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  paddingRight: '4px',
                                  backgroundColor: '#f8f8f8',
                                  padding: '3px 4px'
                                }}>
                                  <span>รวมพัสดุที่นำกลับ:</span>
                                  <span style={{ minWidth: '60px', textAlign: 'right' }}>฿{Math.round(vehicleProducts).toLocaleString('th-TH')}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Column 2 - Expenses and Total */}
                            <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                              <div style={{ height: '24px' }}></div> {/* Spacer to align with column 2 content */}
                              
                              {/* Expenses Breakdown */}
                              <div style={{ marginBottom: '8px', flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                  <div style={{ 
                                    fontWeight: 600, 
                                    fontSize: '12px', 
                                    marginBottom: '4px',
                                    paddingBottom: '2px',
                                    borderBottom: '1px solid #eee'
                                  }}>ค่าใช้จ่ายอื่น ๆ:</div>
                                  {Array.from(expenseCategories.entries()).length > 0 ? (
                                    Array.from(expenseCategories.entries()).map(([name, total]) => (
                                      <div key={name} style={{ 
                                        fontSize: '12px', 
                                        marginLeft: '6px', 
                                        marginBottom: '2px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingRight: '4px'
                                      }}>
                                        <span style={{ flex: 1 }}>• {name}</span>
                                        <span style={{ fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>฿{Math.round(total).toLocaleString('th-TH')}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div style={{ 
                                      fontSize: '12px', 
                                      marginLeft: '6px', 
                                      marginBottom: '2px',
                                      color: '#666',
                                      fontStyle: 'italic'
                                    }}>
                                      ไม่มีค่าใช้จ่ายอื่น ๆ
                                    </div>
                                  )}
                                  <div style={{ 
                                    fontSize: '12px', 
                                    fontWeight: 700, 
                                    marginLeft: '6px', 
                                    borderTop: '1px solid #ccc', 
                                    paddingTop: '3px', 
                                    marginTop: '4px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingRight: '4px',
                                    backgroundColor: '#f8f8f8',
                                    padding: '3px 4px'
                                  }}>
                                    <span>รวมค่าใช้จ่าย:</span>
                                    <span style={{ minWidth: '60px', textAlign: 'right' }}>฿{Math.round(vehicleCompanyExpenses).toLocaleString('th-TH')}</span>
                                  </div>
                                </div>

                                
                              </div>
                            </div>

                            <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                                  <div style={{ height: '24px' }}></div> {/* Spacer to align with column 1 content */}
                                  
                                  {/* Grand Total Section */}
                                  <div style={{ marginBottom: '8px', flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                                    {(() => {
                                      // Calculate total allowance for this vehicle
                                      const totalAllowance = tripRecords.reduce((sum, trip) => {
                                        const allowance = typeof trip.totalAllowance === 'string' 
                                          ? parseFloat(trip.totalAllowance) || 0 
                                          : trip.totalAllowance || 0;
                                        return sum + allowance;
                                      }, 0);

                                      // Calculate trip fee for all trips
                                      const vehicleTripFee = tripRecords.length * tripFeeRate;
                                      
                                      const driverExpenses = totalAllowance + vehicleProducts + vehicleDistanceCost + vehicleTripFee;
                                      const grandTotal = driverExpenses + vehicleCompanyExpenses;

                                      return (
                                        <div>
                                          <div style={{ 
                                            fontWeight: 600, 
                                            fontSize: '12px', 
                                            marginBottom: '4px',
                                            paddingBottom: '2px',
                                            borderBottom: '1px solid #eee'
                                          }}>สรุปยอดรวม:</div>
                                          
                                          {/* ค่าใช้จ่ายของบริษัท */}
                                          <div style={{ 
                                            fontSize: '12px', 
                                            marginLeft: '6px', 
                                            marginBottom: '2px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            paddingRight: '4px',
                                            color: '#FF8C00'
                                          }}>
                                            <span style={{ flex: 1 }}>• ค่าใช้จ่ายของบริษัท</span>
                                            <span style={{ fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>฿{Math.round(vehicleCompanyExpenses).toLocaleString('th-TH')}</span>
                                          </div>
                                          
                                          {/* ค่าใช้จ่ายที่ต้องจ่ายพนักงานขับรถ */}
                                          <div style={{ 
                                            fontSize: '12px', 
                                            marginLeft: '6px', 
                                            marginBottom: '4px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            paddingRight: '4px',
                                            color: '#2E8B57'
                                          }}>
                                            <span style={{ flex: 1 }}>• ค่าใช้จ่ายที่ต้องจ่ายพนักงานขับรถ</span>
                                            <span style={{ fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>฿{Math.round(driverExpenses).toLocaleString('th-TH')}</span>
                                          </div>

                                          <div style={{ 
                                            fontSize: '14px', 
                                            fontWeight: 'bold', 
                                            marginLeft: '6px', 
                                            borderTop: '2px solid #333', 
                                            paddingTop: '6px', 
                                            marginTop: '8px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            paddingRight: '8px',
                                            backgroundColor: '#f5f5f5',
                                            padding: '8px 12px',
                                            border: '2px solid #424242',
                                            borderRadius: '4px'
                                          }}>
                                            <span style={{ 
                                              fontSize: '16px', 
                                              fontWeight: 'bold',
                                              color: '#212121'
                                            }}>ยอดรวมทั้งหมด:</span>
                                            <span style={{ 
                                              minWidth: '80px', 
                                              textAlign: 'right',
                                              fontSize: '18px',
                                              fontWeight: 'bold',
                                              color: '#424242'
                                            }}>฿{Math.round(grandTotal).toLocaleString('th-TH')}</span>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                            
                          </div>
                        );
                      })()}
                    </div>
                  </>
                );
              })()}
            </Box>
          ) : null}
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
                  fontWeight: 'bold',
                }
              }}
            >
              รายงานการเดินทาง
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

{/* Filters - Compact (Adjusted) */}
<Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
    <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <CalendarIcon color="primary" />
      เลือกข้อมูล
    </Typography>
    
  </Box>

  <Box sx={{ 
    display: 'grid', 
    // ปรับ grid layout ให้เลือกทะเบียนกว้างกว่า และปุ่มล้างอยู่ท้าย
    gridTemplateColumns: { 
      xs: '1fr', 
      sm: '2fr 1fr auto', 
      lg: '3fr 1fr 1fr auto' 
    }, 
    gap: 1.5,
    alignItems: 'center'
  }}>

    {/* Filter 1: เลือกรถ - กว้างกว่าอันอื่น */}
    <FormControl fullWidth size="small">
      <InputLabel>เลือกทะเบียน</InputLabel>
      <Select
        value={selectedVehicleId}
        label="เลือกทะเบียน"
        onChange={(e) => {
          setSelectedVehicleId(e.target.value);
        }}
        disabled={loadingVehicles || !selectedMonth || !selectedYear}
      >
        <MenuItem value="">-- เลือกทะเบียน --</MenuItem>
        {loadingVehicles ? (
          <MenuItem disabled>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            กำลังโหลด...
          </MenuItem>
        ) : (
          (Array.isArray(availableVehicles) ? availableVehicles : []).map((vehicle) => (
            <MenuItem key={vehicle.id} value={vehicle.id.toString()}>
              {vehicle.licensePlate} - {vehicle.brand} {vehicle.model} ({getVehicleTypeLabel(vehicle.vehicleType)})
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>

    {/* Filter 2: เดือน */}
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

    {/* Filter 3: ปี */}
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

    {/* Button: ล้างทั้งหมด - อยู่ท้ายสุด */}
    <Button
      variant="outlined"
      onClick={handleClearFilters}
      size="small"
      sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}
    >
      ล้างทั้งหมด
    </Button>
  </Box>
</Paper>

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* No Data */}
        {!loading && (!tripRecords || tripRecords.length === 0) && selectedVehicleId && selectedMonth && selectedYear && (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              ไม่พบข้อมูลการเดินทาง
            </Typography>
            <Typography variant="body2" color="text.secondary">
              สำหรับรถที่เลือกในเดือน {months.find(m => m.value === selectedMonth)?.label} ปี {parseInt(selectedYear) + 543}
            </Typography>
          </Paper>
        )}

        {/* Data Display */}
        {!loading && tripRecords && tripRecords.length > 0 && selectedVehicleId && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Summary Section */}
            {selectedVehicleId && (
              <Paper sx={{ 
                p: { xs: 3, print: 1 }, 
                borderRadius: { xs: 3, print: 0 }, 
                bgcolor: { xs: 'grey.50', print: 'transparent' }, 
                border: { xs: '1px solid rgba(0,0,0,0.05)', print: '1px solid #000' },
                '@media print': {
                  boxShadow: 'none',
                  margin: '4px 0'
                }
              }}>
                {/* Vehicle Info for Selected Vehicle */}
                {selectedVehicleId && (
                  <Box sx={{ mb: { xs: 3, print: 1 } }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      mb: { xs: 2, print: 0.5 }
                    }}>
                      <Typography variant="h6" fontWeight="bold" sx={{ 
                        '@media print': {
                          fontSize: '12px !important',
                          margin: '0 0 4px 0 !important'
                        }
                      }}>
                        ข้อมูลรถที่เลือก
                      </Typography>
                      
                      {/* PDF Buttons */}
                      <Box data-print-hide sx={{ ml: 2, display: 'flex', gap: 1 }}>
                        {(() => {
                          // เงื่อนไขการอนุญาตกด Export PDF รายละเอียด
                          // ต้องเลือก vehicle, month, year และมี tripRecords > 0
                          const hasData = Array.isArray(tripRecords) && tripRecords.length > 0;
                          const canExportDetailed = !!selectedVehicleId && !!selectedMonth && !!selectedYear && hasData;
                          const reason = !hasData
                            ? 'ยังไม่มีข้อมูล' 
                            : !selectedVehicleId
                              ? 'เลือกรถก่อน'
                              : !selectedMonth || !selectedYear
                                ? 'เลือกเดือนและปีก่อน'
                                : '';
                          return (
                            <>
                              <Button
                                variant="outlined"
                                startIcon={<PrintIcon />}
                                onClick={canExportDetailed ? printToPDF : undefined}
                                disabled={isExporting || !canExportDetailed}
                                title={canExportDetailed ? 'พิมพ์ PDF' : `ไม่สามารถพิมพ์: ${reason}`}
                                sx={{ 
                                  minWidth: 'auto',
                                  whiteSpace: 'nowrap',
                                  borderRadius: 1,
                                }}
                              >
                                {isExporting ? 'กำลังสร้าง...' : 'พิมพ์ PDF'}
                              </Button>
                              <Button
                                variant="contained"
                                startIcon={<DownloadIcon />}
                                onClick={canExportDetailed ? exportToPDF : undefined}
                                disabled={isExporting || !canExportDetailed}
                                title={canExportDetailed ? 'ส่งออก PDF' : `ไม่สามารถส่งออก: ${reason}`}
                                sx={{ 
                                  minWidth: 'auto',
                                  whiteSpace: 'nowrap',
                                  borderRadius: 1,
                                }}
                              >
                                {isExporting ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF'}
                              </Button>
                            </>
                          );
                        })()}
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{
                      lineHeight: 1.6,
                      '@media print': {
                        fontSize: '10px !important',
                        margin: '0 0 4px 0 !important',
                        color: '#000 !important'
                      }
                    }}>
                      {(() => {
                        const vehicle = vehicles.find(v => v.id.toString() === selectedVehicleId);
                        const monthName = months.find(m => m.value === selectedMonth)?.label || selectedMonth;
                        const yearDisplay = parseInt(selectedYear) + 543;
                        
                        return vehicle 
                          ? `${monthName} ${yearDisplay} | รถ: ${vehicle.licensePlate} - ${vehicle.brand} ${vehicle.model} (${getVehicleTypeLabel(vehicle.vehicleType)}) | คนขับ: ${getVehicleDrivers(vehicle.id, tripRecords).join(', ')} | จำนวนรอบ: ${tripRecords.length} เที่ยว`
                          : '';
                      })()
                      }
                    </Typography>
                  </Box>
                )}

                {/* Vehicle Info for Single Vehicle */}
                {selectedVehicleId && (
                  <Box sx={{ mb: { xs: 3, print: 1 } }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ 
                      mb: { xs: 2, print: 0.5 },
                      '@media print': {
                        fontSize: '12px !important',
                        margin: '0 0 4px 0 !important'
                      }
                    }}>
                      ข้อมูลรถ
                    </Typography>
                    {(() => {
                      const selectedVehicle = (Array.isArray(vehicles) ? vehicles : []).find(v => v.id.toString() === selectedVehicleId);
                      return selectedVehicle ? (
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ 
                            mb: { xs: 1, print: 0.2 },
                            '@media print': {
                              fontSize: '10px !important',
                              color: '#000 !important',
                              margin: '0 !important'
                            }
                          }}>
                            รถ: {selectedVehicle.licensePlate} - {selectedVehicle.brand} {selectedVehicle.model} ({getVehicleTypeLabel(selectedVehicle.vehicleType)}) | คนขับ: {getVehicleDrivers(selectedVehicle.id, tripRecords).join(', ')} | จำนวนเที่ยว: {tripRecords.length} เที่ยว 
                            <br />
                            {(() => {
                              const monthName = months.find(m => m.value === selectedMonth)?.label || selectedMonth;
                              const yearDisplay = parseInt(selectedYear) + 543;
                              return `${monthName} ${yearDisplay}`;
                            })()}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                            <VehicleImage vehicle={selectedVehicle} size={40} />
                            <Chip 
                              label={selectedVehicle.licensePlate}
                              variant="outlined"
                              size="small"
                              color="primary"
                            />
                            <Chip 
                              label={getVehicleDrivers(selectedVehicle.id, tripRecords).join(', ') || 'ไม่มีข้อมูลคนขับ'}
                              variant="outlined"
                              size="small"
                              color="primary"
                            />
                          </Box>
                        </Box>
                      ) : null;
                    })()}
                  </Box>
                )}

                {/* Summary Cards - Compact */}
                <Box sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap',
                  gap: { xs: 1, print: 0.5 },
                  '@media print': {
                    margin: '2px 0'
                  }
                }}>
                  {/* Summary cards for selected vehicle */}

                  
                  <Box sx={{ 
                    textAlign: 'center', 
                    p: { xs: 1, print: 0.3 }, 
                    bgcolor: { xs: 'white', print: 'transparent' }, 
                    borderRadius: { xs: 2, print: 0 }, 
                    border: { xs: '1px solid rgba(0,0,0,0.1)', print: '1px solid #000' },
                    minWidth: 'fit-content',
                    flex: '1 1 auto'
                  }}>
                    <Typography variant="caption" color="text.secondary" sx={{
                      '@media print': { fontSize: '6px !important', color: '#000 !important' },
                      display: 'block',
                      mb: 0.5
                    }}>
                      จำนวนเที่ยว
                    </Typography>
                    <Typography variant="body2" sx={{
                      '@media print': { fontSize: '7px !important', color: '#000 !important' }
                    }}>
                      <strong>{tripRecords?.length || 0}</strong> เที่ยว
                    </Typography>
                  </Box>
                  
                  <Box sx={{ 
                    textAlign: 'center', 
                    p: { xs: 1, print: 0.3 }, 
                    bgcolor: { xs: 'white', print: 'transparent' }, 
                    borderRadius: { xs: 2, print: 0 }, 
                    border: { xs: '1px solid rgba(0,0,0,0.1)', print: '1px solid #000' },
                    minWidth: 'fit-content',
                    flex: '1 1 auto'
                  }}>
                    <Typography variant="caption" color="text.secondary" sx={{
                      '@media print': { fontSize: '6px !important', color: '#000 !important' },
                      display: 'block',
                      mb: 0.5
                    }}>
                      ระยะทาง (จริง/ประมาณ)
                    </Typography>
                    <Typography variant="body2" sx={{
                      '@media print': { fontSize: '7px !important', color: '#000 !important' }
                    }}>
                      จริง <strong>{Number(totalDistance).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</strong> กม. / 
                      ประมาณ <strong>{Number(totalEstimatedDistance).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</strong> กม.<br/>
                      ส่วนต่าง <Typography component="span" sx={{ color: 'text.primary' }}>
                        <strong>{totalDistanceDifference >= 0 ? '+' : ''}{Number(totalDistanceDifference).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.</strong>
                      </Typography>
                    </Typography>
                  </Box>
    
                  <Box sx={{ 
                    textAlign: 'center', 
                    p: { xs: 1, print: 0.3 }, 
                    bgcolor: { xs: 'white', print: 'transparent' }, 
                    borderRadius: { xs: 2, print: 0 }, 
                    border: { xs: '1px solid rgba(0,0,0,0.1)', print: '1px solid #000' },
                    minWidth: 'fit-content',
                    flex: '1 1 auto'
                  }}>
                    <Typography variant="caption" color="text.secondary" sx={{
                      '@media print': { fontSize: '6px !important', color: '#000 !important' },
                      display: 'block',
                      mb: 0.5
                    }}>
                      มูลค่ารวม
                    </Typography>
                    <Typography variant="body2" sx={{
                      '@media print': { fontSize: '7px !important', color: '#000 !important' }
                    }}>
                      ค่าใช้จ่ายของบริษัท <strong>฿{formatCurrency(totalCompanyExpenses)}</strong> | <br/>
                      ค่าใช้จ่ายที่ต้องจ่ายพนักงานขับรถ <strong>฿{formatCurrency(totalDriverExpenses)}</strong> |
                      รวม <strong>฿{formatCurrency(totalCosts)}</strong><br/>
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            )}

            {/* Vehicle Trip Records */}
            {selectedVehicleId ? (
              // แสดงแยกตามรถ
              uniqueVehicles.map((vehicle) => {
                const vehicleTrips = tripRecords.filter(trip => trip.vehicle?.id === vehicle.id);
                const vehicleTotalDistance = vehicleTrips.reduce((sum, trip) => {
                  const distance = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance;
                  return sum + distance;
                }, 0);
                const vehicleTotalEstimatedDistance = vehicleTrips.reduce((sum, trip) => {
                  const distance = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                  return sum + distance;
                }, 0);
                const vehicleTotalAllowance = vehicleTrips.reduce((sum, trip) => {
                  const allowance = typeof trip.totalAllowance === 'string' ? parseFloat(trip.totalAllowance) || 0 : trip.totalAllowance;
                  return sum + allowance;
                }, 0);
                const vehicleTotalDistanceCheckFee = vehicleTrips.reduce((sum, trip) => {
                  const fee = typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0;
                  return sum + fee;
                }, 0);
                const vehicleTotalFuelCost = vehicleTrips.reduce((sum, trip) => {
                  const cost = typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0;
                  return sum + cost;
                }, 0);
                const vehicleTotalTollFee = vehicleTrips.reduce((sum, trip) => {
                  const fee = typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0;
                  return sum + fee;
                }, 0);
                const vehicleTotalRepairCost = vehicleTrips.reduce((sum, trip) => {
                  const cost = typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0;
                  return sum + cost;
                }, 0);
                const vehicleTotalItemsValue = vehicleTrips.reduce((sum, trip) => {
                  const itemsTotal = trip.tripItems?.reduce((itemSum, item) => {
                    const price = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) || 0 : item.totalPrice;
                    return itemSum + price;
                  }, 0) || 0;
                  return sum + itemsTotal;
                }, 0);
                const vehicleDistanceDifference = vehicleTrips.reduce((sum, trip) => {
                  const a = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance;
                  const e = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                  return sum + (a - e);
                }, 0);

                return (
                  <Paper key={vehicle.id} sx={{ 
                      borderRadius: { xs: 2, print: 0 },
                      border: '1px solid #e5e5e5',
                      boxShadow: 'none',
                      overflow: 'hidden',
                      backgroundColor: '#fff',
                      '@media print': {
                        pageBreakInside: 'avoid',
                        margin: '4px 0'
                      }
                  }}>
                    {/* Vehicle Header - Compact */}
                    <Box sx={{ 
                        p: { xs: 1.5, print: 1 }, 
                        bgcolor: '#fafafa',
                        borderBottom: '1px solid #eee'
                      }}>
                          <Box sx={{ 
                            display: 'flex', 
                          justifyContent: 'space-between', 
                            alignItems: 'center', 
                          gap: { xs: 1.5, print: 1 }
                        }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: { xs: 1.5, print: 1 } 
                          }}>
                            <Box sx={{ 
                              display: { xs: 'flex', print: 'none' }
                            }}>
                              <VehicleImage vehicle={vehicle} size={48} />
                          </Box>
                          <Box>
                            <Typography variant="h6" fontWeight="bold" sx={{
                              '@media print': {
                                fontSize: '10px !important',
                                margin: '0 !important',
                                fontWeight: 'bold'
                              }
                            }}>
                              {vehicle.licensePlate} - {vehicle.brand} {vehicle.model} ({getVehicleTypeLabel(vehicle.vehicleType)})
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{
                              '@media print': {
                                fontSize: '8px !important',
                                color: '#000 !important',
                                margin: '0 !important'
                              }
                            }}>
                                คนขับ: {getVehicleDrivers(vehicle.id, tripRecords).join(', ') || 'ไม่มีข้อมูลคนขับ'}
                              </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ 
                          display: 'flex', 
                          gap: { xs: 1.5, print: 1 }, 
                          textAlign: 'right',
                          flexWrap: 'wrap',
                          flexDirection: 'column'
                        }}>

                          
                          {/* Trip & Distance Metrics */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 'fit-content', justifyContent: 'center' }}>
                            <Typography variant="body2" sx={{
                              '@media print': { fontSize: '7px !important', color: '#000 !important' }
                            }}>
                              <strong>{vehicleTrips.length}</strong> เที่ยว | 
                              ระยะทางจริง <strong>{Number(vehicleTotalDistance).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</strong> กม. / 
                              ระยะทางประมาณ <strong>{Number(vehicleTotalEstimatedDistance).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</strong> กม. | 
                              ส่วนต่าง <Typography component="span" sx={{ color: 'text.primary' }}>
                                <strong>{vehicleDistanceDifference >= 0 ? '+' : ''}{Number(vehicleDistanceDifference).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</strong>
                              </Typography> กม.
                            </Typography>
                          </Box>
                          
                          {/* Financial Metrics */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 'fit-content', justifyContent: 'center' }}>
                            <Typography variant="body2" sx={{
                              '@media print': { fontSize: '7px !important', color: '#000 !important' }
                            }}>
                              เบี้ยเลี้ยง <strong>฿{formatCurrency(vehicleTotalAllowance)}</strong> | 
                              ค่าระยะทาง <strong>฿{formatCurrency(vehicleTotalEstimatedDistance * distanceRate)}</strong> |
                              พัสดุ <strong>฿{formatCurrency(vehicleTotalItemsValue)}</strong> |
                              ค่าเที่ยว <strong>฿{formatCurrency(vehicleTrips.length * tripFeeRate)}</strong> |
                              ค่าอื่นๆ <strong>฿{formatCurrency(vehicleTotalDistanceCheckFee + vehicleTotalFuelCost + vehicleTotalTollFee + vehicleTotalRepairCost)}</strong> | 
                              รวม <strong style={{ color: "green" }}>฿{formatCurrency(vehicleTotalAllowance + vehicleTotalItemsValue + (vehicleTotalEstimatedDistance * distanceRate) + (vehicleTrips.length * tripFeeRate) + vehicleTotalDistanceCheckFee + vehicleTotalFuelCost + vehicleTotalTollFee + vehicleTotalRepairCost)}</strong>
                            </Typography>
                          </Box>
                          
                        </Box>
                      </Box>
                    </Box>

                    {/* Vehicle Trip Records - Desktop Table or Mobile Cards */}
                    {!isMobile ? (
                      <Box>
                        {(() => {
                          const dateGroups = groupCustomersByDateRange(vehicleTrips);
                          const itemsAll = aggregateItemsByCustomer(vehicleTrips);
                          const grand = itemsAll.reduce((s, r) => s + (r.totalPrice || 0), 0);
                          return (
                            <>
                              {Object.keys(dateGroups).sort().map((dateRangeKey) => {
                                const customerGroups = dateGroups[dateRangeKey];
                                
                                return Object.keys(customerGroups).map((customerKey) => {
                                  const customerName = customerKey.split('::')[1] || 'ไม่ระบุลูกค้า';
                                  const list = customerGroups[customerKey];
                                  // Aggregate items only within this customer group (list), not across all trips
                                  const rowsForCustomer = aggregateItemsByCustomer(list);
                                  const sub = rowsForCustomer.reduce((s, r) => s + (r.totalPrice || 0), 0);
                                
                                // Calculate customer totals
                                const totalActualDist = list.reduce((sum, trip) => {
                                  const actualDist = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance;
                                  return sum + actualDist;
                                }, 0);
                                const totalEstimatedDist = list.reduce((sum, trip) => {
                                  const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                                  return sum + estimatedDist;
                                }, 0);
                                const totalAllowance = list.reduce((sum, trip) => sum + (typeof trip.totalAllowance === 'string' ? parseFloat(trip.totalAllowance) || 0 : trip.totalAllowance), 0);
                                const totalDistanceCheckFee = list.reduce((sum, trip) => sum + (typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0), 0);
                                const totalFuelCost = list.reduce((sum, trip) => sum + (typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0), 0);
                                const totalTollFee = list.reduce((sum, trip) => sum + (typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0), 0);
                                const totalRepairCost = list.reduce((sum, trip) => sum + (typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0), 0);
                                const totalOtherCosts = totalDistanceCheckFee + totalFuelCost + totalTollFee + totalRepairCost;
                                // Calculate total signed difference by summing individual trip differences with sign
                                const totalAbsoluteDifference = list.reduce((sum, trip) => {
                                  const actualDist = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance || 0;
                                  const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                                  const diff = actualDist - estimatedDist;
                                  return sum + diff;
                                }, 0);
                                
                                // Debug: Log actual calculation for this customer group  
                                console.log('Desktop UI Debug:', {
                                  customerName: customerKey.split('::')[1],
                                  totalActual: totalActualDist,
                                  totalEstimated: totalEstimatedDist,
                                  directDiff: Math.abs(totalActualDist - totalEstimatedDist),
                                  summedAbsDiff: totalAbsoluteDifference,
                                  roundedSummedDiff: Math.round(totalAbsoluteDifference),
                                  individualDiffs: list.map(trip => {
                                    const actual = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance || 0;
                                    const estimated = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                                    return Math.abs(actual - estimated);
                                  })
                                });
                                
                                return (
                                  <Paper key={`${dateRangeKey}-${customerKey}`} sx={{ p: 1, mb: 1, borderRadius: 0, border: '1px solid', borderColor: 'grey.200' }}>
                                    {/* Date Range Header */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, p: 0.5, backgroundColor: 'grey.100', borderRadius: 1}}>
                                      <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.primary', fontSize: '0.85rem' }}>
                                        {dateRangeKey.split('::')[0]}
                                      </Typography>
                                      <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.primary', fontSize: '0.85rem' }}>
                                        เลขที่: {list[0]?.documentNumber || 'ไม่ระบุ'}
                                      </Typography>
                                    </Box>
                                    
                                    
                                    {/* Customer Header - Compact */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, p: 0.5, backgroundColor: 'primary.50', borderRadius: 1 }}>
                                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                        {customerName}
                                      </Typography>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                          
                                           1 เที่ยวรถ | คนขับ {list[0]?.driverName || 'ไม่ระบุ'} | ระยะทางจริง {Number(totalActualDist).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม. | ระยะทางประมาณ {Number(totalEstimatedDist).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม. | ส่วนต่าง {totalAbsoluteDifference >= 0 ? '+' : ''}{Number(totalAbsoluteDifference).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                                        </Typography>
                                        
                                      </Box>
                                    </Box>

                                    {/* Items Summary - Detailed Format */}
                                    <Box sx={{ mb: 0.5 }}>
                                      {/* พัสดุ section */}
                                      <Box sx={{ mb: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
                                          พัสดุ:
                                        </Typography>
                                        {rowsForCustomer.length > 0 ? (
                                          <Box sx={{ ml: 1 }}>
                                            {rowsForCustomer.map((r, idx) => (
                                              <Typography key={idx} variant="body2" sx={{ color: 'text.primary', fontSize: '0.85rem', mb: 0.2 }}>
                                                {r.name} {Number(r.quantity).toLocaleString('th-TH', { maximumFractionDigits: 2 })}{r.unit || ''} (฿{formatCurrency(r.totalPrice as any)})
                                              </Typography>
                                            ))}
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main', mt: 0.5 }}>
                                              = ฿{formatCurrency(sub)}
                                            </Typography>
                                          </Box>
                                        ) : (
                                          <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1, fontSize: '0.85rem' }}>
                                            -
                                          </Typography>
                                        )}
                                      </Box>

                                      {/* Categorized Expenses Summary */}
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {(() => {
                                          // Calculate distance cost for this customer group
                                          const distanceCost = list.reduce((sum, trip) => {
                                            const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                                            return sum + (estimatedDist * distanceRate);
                                          }, 0);

                                          // Calculate company expenses
                                          const companyExpenses = [
                                            { label: 'เช็คระยะ', total: list.reduce((sum, trip) => sum + (typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0), 0) },
                                            { label: 'น้ำมัน', total: list.reduce((sum, trip) => sum + (typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0), 0) },
                                            { label: 'ทางด่วน', total: list.reduce((sum, trip) => sum + (typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0), 0) },
                                            { label: 'ซ่อมแซม', total: list.reduce((sum, trip) => sum + (typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0), 0) }
                                          ];
                                          const totalCompanyExpenses = companyExpenses.reduce((sum, expense) => sum + expense.total, 0);

                                          // Calculate trip fee for this group
                                          const tripFeeForGroup = list.length * tripFeeRate;
                                          
                                          // Calculate driver expenses (รวมค่าเที่ยว)
                                          const totalDriverExpenses = totalAllowance + sub + distanceCost + tripFeeForGroup;

                                          return (
                                            <>
                                              {/* Company Expenses */}
                                              <Typography variant="body2" sx={{ fontWeight: 500, color: 'warning.main' }}>
                                                ค่าใช้จ่ายของบริษัท: <strong>฿{formatCurrency(totalCompanyExpenses)}</strong>
                                                {totalCompanyExpenses > 0 ? (
                                                  <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.85rem', ml: 0.5 }}>
                                                    ({companyExpenses.filter(c => c.total > 0).map(cost => `${cost.label} ฿${formatCurrency(cost.total)}`).join(', ')})
                                                  </Typography>
                                                ) : (
                                                  <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.85rem', ml: 0.5 }}>
                                                    (-)
                                                  </Typography>
                                                )}
                                              </Typography>

                                              {/* Driver Expenses */}
                                              <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.main' }}>
                                                ค่าใช้จ่ายที่ต้องจ่ายพนักงานขับรถ: <strong>฿{formatCurrency(totalDriverExpenses)}</strong>
                                                <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.85rem', ml: 0.5 }}>
                                                  (เบี้ยเลี้ยง ฿{formatCurrency(totalAllowance || 0)}, พัสดุ ฿{formatCurrency(sub || 0)}, ค่าระยะทาง ฿{formatCurrency(distanceCost || 0)}, ค่าเที่ยว ฿{formatCurrency(tripFeeForGroup)})
                                                </Typography>
                                              </Typography>
                                            </>
                                          );
                                        })()}
                                      </Box>
                                    </Box>

                                    {/* Trip Details - Remarks Only (if any) */}
                                    {(() => {
                                      const tripsWithRemarks = list.filter(trip => trip.remark && trip.remark.trim());
                                      return tripsWithRemarks.length > 0 ? (
                                        <Accordion sx={{ boxShadow: 'none', '&:before': { display: 'none' }, mt: 0.5 }}>
                                          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: '32px', py: 0.5, '& .MuiAccordionSummary-content': { margin: '4px 0' } }}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                              หมายเหตุเพิ่มเติม ({tripsWithRemarks.length} รายการ)
                                            </Typography>
                                          </AccordionSummary>
                                          <AccordionDetails sx={{ pt: 0, pb: 0.5 }}>
                                            {tripsWithRemarks.map((trip) => (
                                              <Box key={trip.id} sx={{ py: 0.5, mb: 0.5, backgroundColor: 'grey.25', borderRadius: 1, px: 0.75 }}>
                                                
                                                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mt: 0.5 }}>
                                                  หมายเหตุ: {trip.remark}
                                                </Typography>
                                              </Box>
                                            ))}
                                          </AccordionDetails>
                                        </Accordion>
                                      ) : null;
                                    })()}
                                  </Paper>
                                );
                              });
                            })}
                              
                            </>
                          );
                        })()}
                      </Box>
                    ) : (
                      /* Mobile Cards for Vehicle Trips - Customer Grouped */
                      <Box sx={{ p: { xs: 2, sm: 1 } }}>
                        {(() => {
                          const dateGroups = groupCustomersByDateRange(vehicleTrips);
                          const itemsAll = aggregateItemsByCustomer(vehicleTrips);
                          
                          return (
                            <>
                              {Object.keys(dateGroups).sort().map((dateRangeKey) => {
                                const customerGroups = dateGroups[dateRangeKey];
                                
                                return Object.keys(customerGroups).map((customerKey) => {
                                  const customerName = customerKey.split('::')[1] || 'ไม่ระบุลูกค้า';
                                  const list = customerGroups[customerKey];
                                  // Aggregate items only within this customer group (list), not across all trips
                                  const rowsForCustomer = aggregateItemsByCustomer(list);
                                  const sub = rowsForCustomer.reduce((s, r) => s + (r.totalPrice || 0), 0);
                                  
                                  // Calculate customer totals
                                  const totalActualDist = list.reduce((sum, trip) => {
                                    const actualDist = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance;
                                    return sum + actualDist;
                                  }, 0);
                                  const totalEstimatedDist = list.reduce((sum, trip) => {
                                    const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                                  return sum + estimatedDist;
                                }, 0);
                                const totalAllowance = list.reduce((sum, trip) => sum + (typeof trip.totalAllowance === 'string' ? parseFloat(trip.totalAllowance) || 0 : trip.totalAllowance), 0);
                                const totalDistanceCheckFee = list.reduce((sum, trip) => sum + (typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0), 0);
                                const totalFuelCost = list.reduce((sum, trip) => sum + (typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0), 0);
                                const totalTollFee = list.reduce((sum, trip) => sum + (typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0), 0);
                                const totalRepairCost = list.reduce((sum, trip) => sum + (typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0), 0);
                                const totalOtherCosts = totalDistanceCheckFee + totalFuelCost + totalTollFee + totalRepairCost;
                                // Calculate total signed difference by summing individual trip differences with sign
                                const totalAbsoluteDifference = list.reduce((sum, trip) => {
                                  const actualDist = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance || 0;
                                  const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                                  const diff = actualDist - estimatedDist;
                                  return sum + diff;
                                }, 0);
                                
                                return (
                                  <Paper key={`${dateRangeKey}-${customerKey}`} sx={{ 
                                    p: { xs: 2, sm: 1 }, 
                                    mb: { xs: 2, sm: 1 }, 
                                    borderRadius: { xs: 3, sm: 0 }, 
                                    border: '1px solid', 
                                    borderColor: 'grey.200',
                                    boxShadow: { xs: '0 4px 12px rgba(0,0,0,0.08)', sm: 'none' }
                                  }}>
                                    {/* Date Range Header */}
                                    <Box sx={{ 
                                      display: 'flex', 
                                      justifyContent: 'center', 
                                      mb: { xs: 1, sm: 0.5 }, 
                                      p: { xs: 1, sm: 0.5 }, 
                                      backgroundColor: 'grey.100', 
                                      borderRadius: { xs: 2, sm: 1 },
                                      border: '1px solid',
                                      borderColor: 'grey.300'
                                    }}>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                        {dateRangeKey.split('::')[0]}
                                      </Typography>
                                    </Box>
                                    {/* Customer Header */}
                                    <Box sx={{ 
                                      display: 'flex', 
                                      flexDirection: { xs: 'column', sm: 'row' },
                                      justifyContent: 'space-between', 
                                      alignItems: { xs: 'flex-start', sm: 'center' }, 
                                      mb: { xs: 2, sm: 0.5 }, 
                                      p: { xs: 1.5, sm: 0.5 }, 
                                      backgroundColor: 'primary.50', 
                                      borderRadius: { xs: 2, sm: 1 },
                                      gap: { xs: 1, sm: 0 }
                                    }}>
                                      <Typography variant="h6" sx={{ 
                                        fontWeight: 700, 
                                        color: 'primary.main',
                                        fontSize: { xs: '1.2rem', sm: '1rem' }
                                      }}>
                                        {customerName}
                                      </Typography>
                                      
                                      {/* Trip Summary - Mobile Responsive */}
                                      <Box sx={{ 
                                        display: 'flex', 
                                        flexDirection: { xs: 'column', sm: 'row' },
                                        alignItems: { xs: 'flex-start', sm: 'center' }, 
                                        gap: { xs: 0.5, sm: 1 } 
                                      }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ 
                                          fontSize: { xs: '0.9rem', sm: '0.85rem' },
                                          lineHeight: { xs: 1.4, sm: 1.2 }
                                        }}>
                                          คนขับ: {(() => {
                                            if (list[0]?.vehicle) {
                                              const drivers = getVehicleDrivers(list[0].vehicle.id, list);
                                              return drivers.length > 0 ? drivers.join(', ') : 'ไม่ระบุ';
                                            }
                                            return 'ไม่ระบุ';
                                          })()} | เลขที่: {list[0]?.documentNumber || 'ไม่ระบุ'} | 1 เที่ยวรถ | ระยะทางจริง {Number(totalActualDist).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ 
                                          fontSize: { xs: '0.9rem', sm: '0.85rem' },
                                          display: { xs: 'block', sm: 'inline' }
                                        }}>
                                          ประมาณ {Number(totalEstimatedDist).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม. | ส่วนต่าง {totalAbsoluteDifference >= 0 ? '+' : ''}{Number(totalAbsoluteDifference).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                                        </Typography>
                                        
                                      </Box>
                                    </Box>

                                    {/* Items Summary - Mobile Detailed Format */}
                                    <Box sx={{ mb: { xs: 2, sm: 0.5 } }}>
                                      {/* พัสดุ section */}
                                      <Box sx={{ mb: { xs: 2, sm: 1 } }}>
                                        <Typography variant="body1" sx={{ 
                                          fontWeight: 600, 
                                          color: 'text.secondary', 
                                          fontSize: { xs: '1rem', sm: '0.9rem' },
                                          mb: { xs: 1, sm: 0.5 }
                                        }}>
                                          พัสดุ:
                                        </Typography>
                                        {rowsForCustomer.length > 0 ? (
                                          <Box sx={{ ml: { xs: 1, sm: 1 } }}>
                                            {rowsForCustomer.map((r, idx) => (
                                              <Typography key={idx} variant="body2" sx={{ 
                                                color: 'text.primary', 
                                                fontSize: { xs: '0.9rem', sm: '0.85rem' }, 
                                                mb: { xs: 0.5, sm: 0.2 },
                                                lineHeight: { xs: 1.4, sm: 1.2 }
                                              }}>
                                                {r.name} {Number(r.quantity).toLocaleString('th-TH', { maximumFractionDigits: 2 })}{r.unit || ''} (฿{formatCurrency(r.totalPrice as any)})
                                              </Typography>
                                            ))}
                                            <Typography variant="body2" sx={{ 
                                              fontWeight: 700, 
                                              color: 'success.main', 
                                              mt: { xs: 1, sm: 0.5 },
                                              fontSize: { xs: '1rem', sm: '0.9rem' }
                                            }}>
                                              = ฿{formatCurrency(sub)}
                                            </Typography>
                                          </Box>
                                        ) : (
                                          <Typography variant="body2" sx={{ 
                                            color: 'text.secondary', 
                                            ml: { xs: 1, sm: 1 }, 
                                            fontSize: { xs: '0.9rem', sm: '0.85rem' }
                                          }}>
                                            -
                                          </Typography>
                                        )}
                                      </Box>

                                      {/* Categorized Expenses Summary - Mobile Enhanced */}
                                      <Box sx={{ 
                                        display: 'flex', 
                                        flexDirection: 'column',
                                        gap: { xs: 1.5, sm: 1 }
                                      }}>
                                        {(() => {
                                          // Calculate distance cost for this customer group
                                          const distanceCost = list.reduce((sum, trip) => {
                                            const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                                            return sum + (estimatedDist * distanceRate);
                                          }, 0);

                                          // Calculate company expenses
                                          const companyExpenses = [
                                            { label: 'เช็คระยะ', total: totalDistanceCheckFee },
                                            { label: 'น้ำมัน', total: totalFuelCost },
                                            { label: 'ทางด่วน', total: totalTollFee },
                                            { label: 'ซ่อมแซม', total: totalRepairCost }
                                          ];
                                          const totalCompanyExpenses = companyExpenses.reduce((sum, expense) => sum + expense.total, 0);

                                          // Calculate trip fee for this group
                                          const tripFeeForGroup = list.length * tripFeeRate;
                                          
                                          // Calculate driver expenses (รวมค่าเที่ยว)
                                          const totalDriverExpenses = totalAllowance + sub + distanceCost + tripFeeForGroup;

                                          return (
                                            <>
                                              {/* Company Expenses */}
                                              <Box sx={{
                                                display: 'flex',
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                alignItems: { xs: 'flex-start', sm: 'center' },
                                                gap: { xs: 1, sm: 0.5 },
                                                p: { xs: 1.5, sm: 1 },
                                                bgcolor: { xs: 'warning.50', sm: 'transparent' },
                                                borderRadius: { xs: 2, sm: 0 },
                                                border: { xs: '1px solid', sm: 'none' },
                                                borderColor: { xs: 'warning.200', sm: 'transparent' },
                                                minWidth: { xs: '100%', sm: 'auto' }
                                              }}>
                                                <Typography variant="body1" sx={{ 
                                                  fontWeight: 500, 
                                                  color: 'warning.main',
                                                  fontSize: { xs: '1rem', sm: '0.9rem' }
                                                }}>
                                                  ค่าใช้จ่ายของบริษัท: 
                                                  <Typography component="span" sx={{ 
                                                    fontWeight: 700,
                                                    ml: 0.5,
                                                    fontSize: { xs: '1.1rem', sm: '1rem' }
                                                  }}>
                                                    ฿{formatCurrency(totalCompanyExpenses)}
                                                  </Typography>
                                                </Typography>
                                                {totalCompanyExpenses > 0 ? (
                                                  <Typography variant="body2" sx={{ 
                                                    color: 'text.secondary', 
                                                    fontSize: { xs: '0.9rem', sm: '0.85rem' }
                                                  }}>
                                                    ({companyExpenses.filter(c => c.total > 0).map(cost => `${cost.label} ฿${formatCurrency(cost.total)}`).join(', ')})
                                                  </Typography>
                                                ) : (
                                                  <Typography variant="body2" sx={{ 
                                                    color: 'text.secondary', 
                                                    fontSize: { xs: '0.9rem', sm: '0.85rem' }
                                                  }}>
                                                    (-)
                                                  </Typography>
                                                )}
                                              </Box>

                                              {/* Driver Expenses */}
                                              <Box sx={{
                                                display: 'flex',
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                alignItems: { xs: 'flex-start', sm: 'center' },
                                                gap: { xs: 1, sm: 0.5 },
                                                p: { xs: 1.5, sm: 1 },
                                                bgcolor: { xs: 'success.50', sm: 'transparent' },
                                                borderRadius: { xs: 2, sm: 0 },
                                                border: { xs: '1px solid', sm: 'none' },
                                                borderColor: { xs: 'success.200', sm: 'transparent' },
                                                minWidth: { xs: '100%', sm: 'auto' }
                                              }}>
                                                <Typography variant="body1" sx={{ 
                                                  fontWeight: 500,
                                                  color: 'success.main',
                                                  fontSize: { xs: '1rem', sm: '0.9rem' }
                                                }}>
                                                  ค่าใช้จ่ายที่ต้องจ่ายพนักงานขับรถ: 
                                                  <Typography component="span" sx={{ 
                                                    fontWeight: 700,
                                                    ml: 0.5,
                                                    fontSize: { xs: '1.1rem', sm: '1rem' }
                                                  }}>
                                                    ฿{formatCurrency(totalDriverExpenses)}
                                                  </Typography>
                                                </Typography>
                                                <Typography variant="body2" sx={{ 
                                                  color: 'text.secondary', 
                                                  fontSize: { xs: '0.9rem', sm: '0.85rem' }
                                                }}>
                                                  (เบี้ยเลี้ยง ฿{formatCurrency(totalAllowance || 0)}, พัสดุ ฿{formatCurrency(sub || 0)}, ค่าระยะทาง ฿{formatCurrency(distanceCost || 0)}, ค่าเที่ยว ฿{formatCurrency(tripFeeForGroup)})
                                                </Typography>
                                              </Box>
                                            </>
                                          );
                                        })()}
                                      </Box>
                                    </Box>

                                    {/* Trip Details - Remarks Only (if any) */}
                                    {(() => {
                                      const tripsWithRemarks = list.filter(trip => trip.remark && trip.remark.trim());
                                      return tripsWithRemarks.length > 0 ? (
                                        <Accordion sx={{ 
                                          boxShadow: 'none', 
                                          '&:before': { display: 'none' }, 
                                          mt: { xs: 1, sm: 0.5 },
                                          bgcolor: { xs: 'grey.25', sm: 'transparent' },
                                          borderRadius: { xs: 2, sm: 0 }
                                        }}>
                                          <AccordionSummary 
                                            expandIcon={<ExpandMoreIcon />} 
                                            sx={{ 
                                              minHeight: { xs: '40px', sm: '32px' }, 
                                              py: { xs: 1, sm: 0.5 }, 
                                              '& .MuiAccordionSummary-content': { 
                                                margin: { xs: '8px 0', sm: '4px 0' }
                                              }
                                            }}
                                          >
                                            <Typography variant="body2" sx={{ 
                                              color: 'text.secondary',
                                              fontSize: { xs: '0.9rem', sm: '0.85rem' }
                                            }}>
                                              หมายเหตุเพิ่มเติม ({tripsWithRemarks.length} รายการ)
                                            </Typography>
                                          </AccordionSummary>
                                          <AccordionDetails sx={{ pt: 0, pb: { xs: 1, sm: 0.5 } }}>
                                            {tripsWithRemarks.map((trip) => (
                                              <Box key={trip.id} sx={{ 
                                                py: { xs: 1, sm: 0.5 }, 
                                                mb: { xs: 1, sm: 0.5 }, 
                                                backgroundColor: { xs: 'white', sm: 'grey.25' }, 
                                                borderRadius: { xs: 2, sm: 1 }, 
                                                px: { xs: 1.5, sm: 0.75 },
                                                border: { xs: '1px solid', sm: 'none' },
                                                borderColor: { xs: 'grey.200', sm: 'transparent' }
                                              }}>
                                                <Typography variant="body2" sx={{ 
                                                  fontStyle: 'italic', 
                                                  color: 'text.secondary', 
                                                  mt: { xs: 0, sm: 0.5 },
                                                  fontSize: { xs: '0.9rem', sm: '0.85rem' },
                                                  lineHeight: { xs: 1.5, sm: 1.3 }
                                                }}>
                                                  {formatDate(trip.departureDate)}: {trip.remark}
                                                </Typography>
                                              </Box>
                                            ))}
                                          </AccordionDetails>
                                        </Accordion>
                                      ) : null;
                                    })()}
                                  </Paper>
                                );
                              });
                            })}
                            </>
                          );
                        })()}
                      </Box>
                    )}
                    
                  </Paper>
                );
              })
            ) : (
              // แสดงข้อมูลรถเดียว
              !isMobile ? (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DirectionsCarIcon color="primary" />
                    รายละเอียดการเดินทางรถคันที่เลือก
                  </Typography>
                  
                  {/* Use the same customer grouping layout as all vehicles */}
                  <Box>
                    {(() => {
                      const dateGroups = groupCustomersByDateRange(tripRecords);
                      const itemsAll = aggregateItemsByCustomer(tripRecords);
                      
                      return (
                        <>
                          {Object.keys(dateGroups).sort().map((dateRangeKey) => {
                            const customerGroups = dateGroups[dateRangeKey];
                            
                            return Object.keys(customerGroups).map((customerKey) => {
                              const customerName = customerKey.split('::')[1] || 'ไม่ระบุลูกค้า';
                              const list = customerGroups[customerKey];
                              // Aggregate items only within this customer group (list), not across all trips
                              const rowsForCustomer = aggregateItemsByCustomer(list);
                              const sub = rowsForCustomer.reduce((s, r) => s + (r.totalPrice || 0), 0);
                              
                              // Calculate customer totals
                              const totalActualDist = list.reduce((sum, trip) => {
                                const actualDist = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance;
                                return sum + actualDist;
                              }, 0);
                              const totalEstimatedDist = list.reduce((sum, trip) => {
                                const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                                return sum + estimatedDist;
                              }, 0);
                              const totalAllowance = list.reduce((sum, trip) => sum + (typeof trip.totalAllowance === 'string' ? parseFloat(trip.totalAllowance) || 0 : trip.totalAllowance), 0);
                              const totalDistanceCheckFee = list.reduce((sum, trip) => sum + (typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0), 0);
                              const totalFuelCost = list.reduce((sum, trip) => sum + (typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0), 0);
                              const totalTollFee = list.reduce((sum, trip) => sum + (typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0), 0);
                              const totalRepairCost = list.reduce((sum, trip) => sum + (typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0), 0);
                              const totalOtherCosts = totalDistanceCheckFee + totalFuelCost + totalTollFee + totalRepairCost;
                              // Calculate total signed difference by summing individual trip differences with sign
                              const totalAbsoluteDifference = list.reduce((sum, trip) => {
                                const actualDist = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance || 0;
                                const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                                return sum + (actualDist - estimatedDist);
                              }, 0);
                              
                              return (
                                <Paper key={`${dateRangeKey}-${customerKey}`} sx={{ p: 1, mb: 1, borderRadius: 0, border: '1px solid', borderColor: 'grey.200' }}>
                                  {/* Date Range Header single car */}
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, p: 0.5, backgroundColor: 'grey.100', borderRadius: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.primary', fontSize: '0.85rem' }}>
                                        {dateRangeKey.split('::')[0]}
                                      </Typography>
                                      <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.primary', fontSize: '0.85rem' }}>
                                        เลขที่: {list[0]?.documentNumber || 'ไม่ระบุ'}
                                      </Typography>
                                  </Box>
                                  {/* Customer Header - Compact */}
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, p: 0.5, backgroundColor: 'primary.50', borderRadius: 1 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                      {customerName}
                                    </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                      1 เที่ยวรถ | ระยะทางจริง {Number(totalActualDist).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม. | ระยะทางประมาณ {Number(totalEstimatedDist).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม. | ส่วนต่าง {totalAbsoluteDifference >= 0 ? '+' : ''}{Number(totalAbsoluteDifference).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                                    </Typography>
                                    
                                  </Box>
                                </Box>

                                {/* Items Summary - Single Vehicle Detailed Format */}
                                {(() => {
                                  const hasItems = rowsForCustomer.length > 0;
                                  return (
                                    <Box sx={{ mb: 0.5 }}>
                                      {/* พัสดุ section */}
                                      <Box sx={{ mb: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
                                          พัสดุ:
                                        </Typography>
                                        {hasItems ? (
                                          <Box sx={{ ml: 1 }}>
                                            {rowsForCustomer.map((r, idx) => (
                                              <Typography key={idx} variant="body2" sx={{ color: 'text.primary', fontSize: '0.8rem', mb: 0.2 }}>
                                                {r.name} {Number(r.quantity).toLocaleString('th-TH', { maximumFractionDigits: 2 })}{r.unit || ''} (฿{formatCurrency(r.totalPrice as any)})
                                              </Typography>
                                            ))}
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main', mt: 0.5, fontSize: '0.85rem' }}>
                                              = ฿{formatCurrency(sub)}
                                            </Typography>
                                          </Box>
                                        ) : (
                                          <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1, fontSize: '0.8rem' }}>
                                            -
                                          </Typography>
                                        )}
                                      </Box>

                                      {/* Categorized Expenses Summary */}
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {(() => {
                                          // Calculate distance cost for this customer group
                                          const distanceCost = list.reduce((sum, trip) => {
                                            const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                                            return sum + (estimatedDist * distanceRate);
                                          }, 0);

                                          // Calculate company expenses
                                          const companyExpenses = [
                                            { label: 'เช็คระยะ', total: totalDistanceCheckFee },
                                            { label: 'น้ำมัน', total: totalFuelCost },
                                            { label: 'ทางด่วน', total: totalTollFee },
                                            { label: 'ซ่อมแซม', total: totalRepairCost }
                                          ];
                                          const totalCompanyExpenses = companyExpenses.reduce((sum, expense) => sum + expense.total, 0);

                                          // Calculate trip fee for this group
                                          const tripFeeForGroup = list.length * tripFeeRate;
                                          
                                          // Calculate driver expenses (รวมค่าเที่ยว)
                                          const totalDriverExpenses = totalAllowance + sub + distanceCost + tripFeeForGroup;

                                          return (
                                            <>
                                              {/* Company Expenses */}
                                              <Typography variant="body2" sx={{ fontWeight: 500, color: 'warning.main' }}>
                                                ค่าใช้จ่ายของบริษัท: <strong>฿{formatCurrency(totalCompanyExpenses)}</strong>
                                                {totalCompanyExpenses > 0 ? (
                                                  <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.75rem', ml: 0.5 }}>
                                                    ({companyExpenses.filter(c => c.total > 0).map(cost => `${cost.label} ฿${formatCurrency(cost.total)}`).join(', ')})
                                                  </Typography>
                                                ) : (
                                                  <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.75rem', ml: 0.5 }}>
                                                    (-)
                                                  </Typography>
                                                )}
                                              </Typography>

                                              {/* Driver Expenses */}
                                              <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.main' }}>
                                                ค่าใช้จ่ายที่ต้องจ่ายพนักงานขับรถ: <strong>฿{formatCurrency(totalDriverExpenses)}</strong>
                                                <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.75rem', ml: 0.5 }}>
                                                  (เบี้ยเลี้ยง ฿{formatCurrency(totalAllowance || 0)}, พัสดุ ฿{formatCurrency(sub || 0)}, ค่าระยะทาง ฿{formatCurrency(distanceCost || 0)}, ค่าเที่ยว ฿{formatCurrency(tripFeeForGroup)})
                                                </Typography>
                                              </Typography>
                                            </>
                                          );
                                        })()}
                                      </Box>
                                    </Box>
                                  );
                                })()}

                                {/* Trip Details - Remarks Only (if any) */}
                                {(() => {
                                  const tripsWithRemarks = list.filter(trip => trip.remark && trip.remark.trim());
                                  return tripsWithRemarks.length > 0 ? (
                                    <Accordion sx={{ boxShadow: 'none', '&:before': { display: 'none' }, mt: 0.5 }}>
                                      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: '32px', py: 0.5, '& .MuiAccordionSummary-content': { margin: '4px 0' } }}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                          หมายเหตุเพิ่มเติม ({tripsWithRemarks.length} รายการ)
                                        </Typography>
                                      </AccordionSummary>
                                      <AccordionDetails sx={{ pt: 0, pb: 0.5 }}>
                                        {tripsWithRemarks.map((trip) => (
                                          <Box key={trip.id} sx={{ py: 0.5, mb: 0.5, backgroundColor: 'grey.25', borderRadius: 1, px: 0.75 }}>
                                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mt: 0.5 }}>
                                              {formatDate(trip.departureDate)}: {trip.remark}
                                            </Typography>
                                          </Box>
                                        ))}
                                      </AccordionDetails>
                                    </Accordion>
                                  ) : null;
                                })()}
                              </Paper>
                            );
                          });
                        })}
                        </>
                      );
                    })()}
                  </Box>
                </Box>
              ) : (
                /* Mobile Cards for Single Vehicle */
                <Box>
                  <Typography variant="h6" sx={{ 
                    mb: { xs: 3, sm: 2 }, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    fontSize: { xs: '1.3rem', sm: '1.25rem' }
                  }}>
                    <DirectionsCarIcon color="primary" />
                    รายละเอียดการเดินทาง
                  </Typography>
                  
                  {/* Use the same customer grouping layout as all vehicles mobile */}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: { xs: 3, sm: 2 },
                    px: { xs: 1, sm: 0 }
                  }}>
                    {(() => {
                      const dateGroups = groupCustomersByDateRange(tripRecords);
                      const itemsAll = aggregateItemsByCustomer(tripRecords);
                      
                      return (
                        <>
                          {Object.keys(dateGroups).sort().map((dateRangeKey) => {
                            const customerGroups = dateGroups[dateRangeKey];
                            
                            return Object.keys(customerGroups).map((customerKey) => {
                              const customerName = customerKey.split('::')[1] || 'ไม่ระบุลูกค้า';
                              const list = customerGroups[customerKey];
                              // Aggregate items only within this customer group (list), not across all trips
                              const rowsForCustomer = aggregateItemsByCustomer(list);
                              const sub = rowsForCustomer.reduce((s, r) => s + (r.totalPrice || 0), 0);
                            
                            // Calculate customer totals
                            const totalActualDist = list.reduce((sum, trip) => {
                              const actualDist = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance;
                              return sum + actualDist;
                            }, 0);
                            const totalEstimatedDist = list.reduce((sum, trip) => {
                              const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                              return sum + estimatedDist;
                            }, 0);
                            const totalAllowance = list.reduce((sum, trip) => sum + (typeof trip.totalAllowance === 'string' ? parseFloat(trip.totalAllowance) || 0 : trip.totalAllowance), 0);
                            const totalDistanceCheckFee = list.reduce((sum, trip) => sum + (typeof trip.distanceCheckFee === 'string' ? parseFloat(trip.distanceCheckFee) || 0 : trip.distanceCheckFee || 0), 0);
                            const totalFuelCost = list.reduce((sum, trip) => sum + (typeof trip.fuelCost === 'string' ? parseFloat(trip.fuelCost) || 0 : trip.fuelCost || 0), 0);
                            const totalTollFee = list.reduce((sum, trip) => sum + (typeof trip.tollFee === 'string' ? parseFloat(trip.tollFee) || 0 : trip.tollFee || 0), 0);
                            const totalRepairCost = list.reduce((sum, trip) => sum + (typeof trip.repairCost === 'string' ? parseFloat(trip.repairCost) || 0 : trip.repairCost || 0), 0);
                            // Calculate total signed difference by summing individual trip differences with sign
                            const totalAbsoluteDifference = list.reduce((sum, trip) => {
                              const actualDist = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance || 0;
                              const estimatedDist = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
                              return sum + (actualDist - estimatedDist);
                            }, 0);
                            
                            return (
                              <Paper key={`${dateRangeKey}-${customerKey}`} sx={{
                                p: { xs: 3, sm: 2.5 },
                                borderRadius: { xs: 4, sm: 3 },
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                border: '1px solid rgba(0,0,0,0.05)',
                                '&:hover': {
                                  boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                                  transform: 'translateY(-2px)'
                                },
                                transition: 'all 0.3s ease'
                              }}>
                                {/* Date Range Header - Mobile */}
                                <Box sx={{ 
                                  mb: { xs: 2, sm: 1 }, 
                                  p: { xs: 1.5, sm: 1 }, 
                                  backgroundColor: 'grey.100', 
                                  borderRadius: { xs: 3, sm: 2 },
                                  border: '1px solid',
                                  borderColor: 'grey.300',
                                  textAlign: 'center'
                                }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.primary', fontSize: { xs: '1.5rem'} }}>
                                    {dateRangeKey.split('::')[0]}
                                  </Typography>
                                </Box>
                                {/* Customer Header - Mobile */}
                                <Box sx={{ 
                                  mb: { xs: 3, sm: 2 }, 
                                  p: { xs: 2, sm: 1.5 }, 
                                  backgroundColor: 'primary.50', 
                                  borderRadius: { xs: 3, sm: 2 },
                                  border: '1px solid',
                                  borderColor: 'primary.200'
                                }}>
                                  <Typography variant="h5" sx={{ 
                                    fontWeight: 700, 
                                    color: 'primary.main', 
                                    mb: { xs: 2, sm: 1 },
                                    fontSize: { xs: '1.4rem', sm: '1.25rem' }
                                  }}>
                                    {customerName}
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 1 } }}>
                                    <Typography variant="body1" color="text.secondary" sx={{
                                      fontSize: { xs: '1rem', sm: '0.9rem' }
                                    }}>
                                      จำนวนเที่ยวรถ: <strong>1 เที่ยวรถ</strong>
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{
                                      fontSize: { xs: '1rem', sm: '0.9rem' }
                                    }}>
                                      ระยะทางจริง: <strong>{Number(totalActualDist).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.</strong>
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{
                                      fontSize: { xs: '1rem', sm: '0.9rem' }
                                    }}>
                                      ระยะทางประมาณ: <strong>{Number(totalEstimatedDist).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.</strong>
                                    </Typography>
                                    <Typography 
                                      variant="body1" 
                                      sx={{ 
                                        color: 'text.primary',
                                        fontWeight: 600,
                                        fontSize: { xs: '1rem', sm: '0.9rem' }
                                      }}
                                    >
                                      ส่วนต่าง: <strong>{totalAbsoluteDifference >= 0 ? '+' : ''}{Number(totalAbsoluteDifference).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.</strong>
                                    </Typography>
                                  </Box>
                                </Box>

                                {/* Items Summary - Mobile */}
                                {rowsForCustomer.length > 0 && (
                                  <Box sx={{ 
                                    mb: { xs: 3, sm: 2 }, 
                                    p: { xs: 2.5, sm: 2 }, 
                                    backgroundColor: 'grey.50', 
                                    borderRadius: { xs: 3, sm: 2 },
                                    border: '1px solid',
                                    borderColor: 'grey.200'
                                  }}>
                                    <Typography variant="h6" sx={{ 
                                      fontWeight: 600, 
                                      color: 'text.primary', 
                                      mb: { xs: 2, sm: 1.5 },
                                      fontSize: { xs: '1.2rem', sm: '1.1rem' }
                                    }}>
                                      พัสดุที่ขนส่ง:
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 1.5 } }}>
                                      {rowsForCustomer.map((r, idx) => (
                                        <Box key={idx} sx={{ 
                                          display: 'flex', 
                                          justifyContent: 'space-between', 
                                          alignItems: 'center',
                                          p: { xs: 2, sm: 1.5 },
                                          backgroundColor: 'white',
                                          borderRadius: { xs: 2, sm: 1 },
                                          border: '1px solid',
                                          borderColor: 'grey.300'
                                        }}>
                                          <Typography variant="body1" sx={{
                                            fontSize: { xs: '1rem', sm: '0.9rem' }
                                          }}>
                                            {r.name} {Number(r.quantity).toLocaleString('th-TH', { maximumFractionDigits: 2 })}{r.unit || ''}
                                          </Typography>
                                          <Typography variant="h6" sx={{ 
                                            fontWeight: 600, 
                                            color: 'success.main',
                                            fontSize: { xs: '1.1rem', sm: '1rem' }
                                          }}>
                                            ฿{formatCurrency(r.totalPrice as any)}
                                          </Typography>
                                        </Box>
                                      ))}
                                      <Box sx={{ 
                                        borderTop: '1px solid', 
                                        borderColor: 'grey.300', 
                                        pt: { xs: 2, sm: 1.5 }, 
                                        mt: { xs: 1, sm: 0.5 } 
                                      }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <Typography variant="h6" sx={{ 
                                            fontWeight: 700,
                                            fontSize: { xs: '1.2rem', sm: '1.1rem' }
                                          }}>
                                            รวมค่าพัสดุ:
                                          </Typography>
                                          <Typography variant="h5" sx={{ 
                                            fontWeight: 700, 
                                            color: 'success.main',
                                            fontSize: { xs: '1.4rem', sm: '1.3rem' }
                                          }}>
                                            ฿{formatCurrency(sub)}
                                          </Typography>
                                        </Box>
                                      </Box>
                                    </Box>
                                  </Box>
                                )}

                                {/* Financial Summary - Mobile */}
                                <Box sx={{ 
                                  mb: { xs: 3, sm: 2 }, 
                                  p: { xs: 2.5, sm: 2 }, 
                                  backgroundColor: 'warning.50', 
                                  borderRadius: { xs: 3, sm: 2 },
                                  border: '1px solid',
                                  borderColor: 'warning.200'
                                }}>
                                  <Typography variant="h6" sx={{ 
                                    fontWeight: 600, 
                                    color: 'text.primary', 
                                    mb: { xs: 2, sm: 1.5 },
                                    fontSize: { xs: '1.2rem', sm: '1.1rem' }
                                  }}>
                                    สรุปค่าใช้จ่าย:
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 1.5 } }}>
                                    <Box sx={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center',
                                      p: { xs: 2, sm: 1.5 },
                                      backgroundColor: 'success.50',
                                      borderRadius: { xs: 2, sm: 1 },
                                      border: '1px solid',
                                      borderColor: 'success.200'
                                    }}>
                                      <Typography variant="body1" sx={{
                                        fontSize: { xs: '1rem', sm: '0.9rem' }
                                      }}>
                                        เบี้ยเลี้ยง:
                                      </Typography>
                                      <Typography variant="h6" sx={{ 
                                        fontWeight: 600, 
                                        color: 'success.main',
                                        fontSize: { xs: '1.1rem', sm: '1rem' }
                                      }}>
                                        ฿{formatCurrency(totalAllowance)}
                                      </Typography>
                                    </Box>
                                    
                                    {totalDistanceCheckFee > 0 && (
                                      <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        p: { xs: 2, sm: 1.5 },
                                        backgroundColor: 'warning.100',
                                        borderRadius: { xs: 2, sm: 1 },
                                        border: '1px solid',
                                        borderColor: 'warning.300'
                                      }}>
                                        <Typography variant="body1" sx={{
                                          fontSize: { xs: '1rem', sm: '0.9rem' }
                                        }}>
                                          ค่าเช็คระยะ:
                                        </Typography>
                                        <Typography variant="h6" sx={{ 
                                          fontWeight: 600, 
                                          color: 'warning.main',
                                          fontSize: { xs: '1.1rem', sm: '1rem' }
                                        }}>
                                          ฿{formatCurrency(totalDistanceCheckFee)}
                                        </Typography>
                                      </Box>
                                    )}
                                    
                                    {totalFuelCost > 0 && (
                                      <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        p: { xs: 2, sm: 1.5 },
                                        backgroundColor: 'info.50',
                                        borderRadius: { xs: 2, sm: 1 },
                                        border: '1px solid',
                                        borderColor: 'info.200'
                                      }}>
                                        <Typography variant="body1" sx={{
                                          fontSize: { xs: '1rem', sm: '0.9rem' }
                                        }}>
                                          ค่าน้ำมัน:
                                        </Typography>
                                        <Typography variant="h6" sx={{ 
                                          fontWeight: 600, 
                                          color: 'info.main',
                                          fontSize: { xs: '1.1rem', sm: '1rem' }
                                        }}>
                                          ฿{formatCurrency(totalFuelCost)}
                                        </Typography>
                                      </Box>
                                    )}
                                    
                                    {totalTollFee > 0 && (
                                      <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        p: { xs: 2, sm: 1.5 },
                                        backgroundColor: 'secondary.50',
                                        borderRadius: { xs: 2, sm: 1 },
                                        border: '1px solid',
                                        borderColor: 'secondary.200'
                                      }}>
                                        <Typography variant="body1" sx={{
                                          fontSize: { xs: '1rem', sm: '0.9rem' }
                                        }}>
                                          ค่าทางด่วน:
                                        </Typography>
                                        <Typography variant="h6" sx={{ 
                                          fontWeight: 600, 
                                          color: 'secondary.main',
                                          fontSize: { xs: '1.1rem', sm: '1rem' }
                                        }}>
                                          ฿{formatCurrency(totalTollFee)}
                                        </Typography>
                                      </Box>
                                    )}
                                    
                                    {totalRepairCost > 0 && (
                                      <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        p: { xs: 2, sm: 1.5 },
                                        backgroundColor: 'error.50',
                                        borderRadius: { xs: 2, sm: 1 },
                                        border: '1px solid',
                                        borderColor: 'error.200'
                                      }}>
                                        <Typography variant="body1" sx={{
                                          fontSize: { xs: '1rem', sm: '0.9rem' }
                                        }}>
                                          ค่าซ่อมแซม:
                                        </Typography>
                                        <Typography variant="h6" sx={{ 
                                          fontWeight: 600, 
                                          color: 'error.main',
                                          fontSize: { xs: '1.1rem', sm: '1rem' }
                                        }}>
                                          ฿{formatCurrency(totalRepairCost)}
                                        </Typography>
                                      </Box>
                                    )}
                                  </Box>
                                </Box>

                                {/* Trip Details - Remarks Only (if any) */}
                                {(() => {
                                  const tripsWithRemarks = list.filter(trip => trip.remark && trip.remark.trim());
                                  return tripsWithRemarks.length > 0 ? (
                                    <Accordion sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
                                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography variant="body1" sx={{ 
                                          color: 'text.secondary',
                                          fontSize: { xs: '1rem', sm: '0.9rem' }
                                        }}>
                                          หมายเหตุเพิ่มเติม ({tripsWithRemarks.length} รายการ)
                                        </Typography>
                                      </AccordionSummary>
                                      <AccordionDetails>
                                        {tripsWithRemarks.map((trip) => (
                                          <Box key={trip.id} sx={{ 
                                            py: { xs: 2, sm: 1.5 }, 
                                            mb: { xs: 2, sm: 1.5 }, 
                                            backgroundColor: 'grey.25', 
                                            borderRadius: { xs: 2, sm: 1 }, 
                                            px: { xs: 2, sm: 1.5 } 
                                          }}>
                                            <Typography variant="body2" color="text.secondary" sx={{ 
                                              fontWeight: 600,
                                              fontSize: { xs: '0.9rem', sm: '0.8rem' }
                                            }}>
                                              {formatDate(trip.departureDate)}:
                                            </Typography>
                                            <Typography variant="body1" sx={{ 
                                              fontStyle: 'italic', 
                                              color: 'text.secondary', 
                                              mt: { xs: 1, sm: 0.5 },
                                              fontSize: { xs: '1rem', sm: '0.9rem' }
                                            }}>
                                              {trip.remark}
                                            </Typography>
                                          </Box>
                                        ))}
                                      </AccordionDetails>
                                    </Accordion>
                                  ) : null;
                                })()}
                              </Paper>
                            );
                          });
                        })}
                        </>
                      );
                    })()}
                  </Box>
                </Box>
              )
            )}

           
          </Box>
        )}
      </Box>
    </Layout>
    </LocalizationProvider>
  );
}



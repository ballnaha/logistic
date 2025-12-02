'use client';
import React, { useState, useEffect } from 'react';
import { getDistanceRate } from '@/utils/distanceRate';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Button,
  TextField,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Alert,
  Autocomplete,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  RouteOutlined as TripIcon,
  DirectionsCar as CarIcon,
  Clear as ClearIcon,
  Person as PersonIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import DataTablePagination from '../../components/DataTablePagination';
import { useSnackbar } from '../../contexts/SnackbarContext';

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

interface TripRecord {
  id: number;
  vehicleId: number;
  customerId: number;
  departureDate: string;
  departureTime: string;
  returnDate?: string | null;
  returnTime?: string | null;
  odometerBefore: number;
  odometerAfter: number;
  actualDistance: number;
  estimatedDistance: number;
  days: number;
  allowanceRate: number;
  totalAllowance: number;
  // คนขับที่ถูกเลือกใช้สำหรับเที่ยวรถนี้ (snapshot ณ วันเดินทาง)
  driverLicense?: string | null; // เลขใบขับขี่ของคนขับที่เลือก
  driverName?: string | null; // ชื่อคนขับ ณ วันเดินทาง
  loadingDate?: string;
  distanceCheckFee?: number;
  fuelCost?: number;
  tollFee?: number;
  repairCost?: number;
  tripFee?: number;
  documentNumber?: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
  vehicle: {
    id: number;
    licensePlate: string;
    brand: string;
    model: string;
    vehicleType: string;
    driverName: string;
    backupDriverName: string;
    carImage?: string;
    mainDriver?: {
      id: number;
      driverName: string;
      driverLicense: string;
      driverImage?: string;
    } | null;
    backupDriver?: {
      id: number;
      driverName: string;
      driverLicense: string;
      driverImage?: string;
    } | null;
  };
  customer: {
    id: number;
    cmCode: string;
    cmName: string;
    cmAddress: string;
    cmRegion: string;
    cmMileage: number;
  };
  tripItems?: {
    id: number;
    itemId: number;
    quantity: number;
    unit: string;
    unitPrice?: number;
    totalPrice?: number;
    remark?: string;
    item?: {
      id: number;
      ptPart: string;
      ptDesc1: string;
      ptDesc2?: string;
      ptUm: string;
      ptPrice?: number;
    };
  }[];
}

export default function TripRecordsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showSnackbar } = useSnackbar();

  // States
  const [tripRecords, setTripRecords] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [vehicleOptions, setVehicleOptions] = useState<Array<{ id: number; licensePlate: string; vehicleType: string }>>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [viewDialog, setViewDialog] = useState<{ open: boolean; record: TripRecord | null }>({
    open: false,
    record: null
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; recordId: number | null }>({
    open: false,
    recordId: null
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [driverImages, setDriverImages] = useState<Map<string, string>>(new Map());
  const [distanceRate, setDistanceRate] = useState<number>(3); // Default 3 baht per km

  // Get driver image by license number (since license is unique)
  const getDriverImageByLicense = async (driverLicense: string): Promise<string | null> => {
    if (!driverLicense || driverLicense.trim() === '') return null;
    
    try {
      // Only log in development to avoid console spam in production
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Fetching driver image for license: ${driverLicense}`);
      }
      
      const controller = new AbortController();
      // Longer timeout for production (network might be slower)
      const timeout = process.env.NODE_ENV === 'production' ? 5000 : 3000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(`/api/drivers/by-license/${encodeURIComponent(driverLicense.trim())}`, {
        signal: controller.signal,
        // Add headers for production
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NODE_ENV === 'production' && {
            'Cache-Control': 'max-age=300' // 5 minutes cache
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
        // Always log errors in production for debugging
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

  // Handle opening view dialog with driver image loading
  const handleOpenViewDialog = (record: TripRecord) => {
    setViewDialog({ open: true, record });
    
    // Load driver image immediately if we have a license and it's not cached
    if (record.driverLicense && !driverImages.has(record.driverLicense)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 Loading driver image for modal: ${record.driverLicense}`);
      }
      loadDriverImages([record]);
    }
  };

  // Force modal re-render when driver images update
  useEffect(() => {
    if (viewDialog.open && viewDialog.record?.driverLicense && process.env.NODE_ENV === 'development') {
      const license = viewDialog.record.driverLicense;
      console.log(`🔄 Driver images updated, checking for license: ${license}`, driverImages.get(license));
    }
  }, [driverImages, viewDialog.open]);

  // Fetch distance rate on component mount
  useEffect(() => {
    const fetchDistanceRate = async () => {
      try {
        const rate = await getDistanceRate();
        setDistanceRate(rate);
      } catch (error) {
        console.error('Error fetching distance rate:', error);
        // Keep default value of 3
      }
    };
    
    fetchDistanceRate();
  }, []);

  // Load driver images for trip records
  const loadDriverImages = async (records: TripRecord[]) => {
    const uniqueLicenses = new Set<string>();
    
    // Collect all unique driver licenses
    records.forEach(record => {
      if (record.driverLicense && record.driverLicense.trim()) {
        uniqueLicenses.add(record.driverLicense.trim());
      }
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`📸 Loading images for licenses:`, Array.from(uniqueLicenses));
    }

    // Set loading placeholders and load images in background
    const newImages = new Map(driverImages);
    const loadPromises: Promise<void>[] = [];

    uniqueLicenses.forEach(license => {
      if (!newImages.has(license)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`⏳ Setting loading placeholder for license: ${license}`);
        }
        newImages.set(license, 'loading'); // Placeholder while loading
        
        const loadPromise = getDriverImageByLicense(license).then(image => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`🖼️ Setting image for license ${license}:`, image);
          }
          setDriverImages(prev => {
            const updated = new Map(prev);
            if (image) {
              updated.set(license, image);
            } else {
              updated.delete(license); // Remove if no image found
            }
            return updated;
          });
        });
        loadPromises.push(loadPromise);
      }
    });

    if (loadPromises.length > 0) {
      setDriverImages(newImages); // Set loading placeholders immediately
      await Promise.all(loadPromises); // Load actual images in background
    }
  };

  // Fetch trip records
  const fetchTripRecords = async (resetLoading = false) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        sortBy: 'departureDate',
        sortOrder: 'desc',
      });

      if (selectedVehicleId) {
        params.set('vehicleId', selectedVehicleId);
      }

      // Add date range filter based on year and month
      if (selectedYear) {
        const year = parseInt(selectedYear);
        let startDate: Date;
        let endDate: Date;
        
        if (selectedMonth) {
          // Specific month and year
          const month = parseInt(selectedMonth);
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

      const apiUrl = `/api/trip-records?${params}`;

      console.log('Fetching with params:', {
        page,
        limit: itemsPerPage,
        search: searchTerm,
        selectedVehicleId,
        selectedMonth,
        selectedYear,
        url: apiUrl
      });

      const response = await fetch(apiUrl);
      const data = await response.json();

      console.log('API Response:', { 
        status: response.status,
        ok: response.ok, 
        data,
        tripsCount: data.trips?.length,
        pagination: data.pagination
      });

      if (response.ok) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Setting trip records:', data.trips);
        }
        setTripRecords(data.trips);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
        
        // Load driver images for the trip records (non-blocking)
        try {
          loadDriverImages(data.trips);
        } catch (imageError) {
          // Don't fail the whole page if image loading fails
          console.error('Failed to load driver images:', imageError);
        }
      } else {
        console.error('API Error:', data);
        showSnackbar(data.error || 'เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    } finally {
      if (resetLoading) {
        setLoading(false);
      }
    }
  };

  // Fetch vehicle options (from trip records based on selected month/year, excluding ForkLift)
  const fetchVehicleOptions = async () => {
    try {
      setLoadingVehicles(true);
      
      // Build query parameters for date filtering
      const params = new URLSearchParams({
        page: '1',
        limit: '1000',
      });

      // Add date range filter based on year and month
      if (selectedYear) {
        const year = parseInt(selectedYear);
        let startDate: Date;
        let endDate: Date;
        
        if (selectedMonth) {
          // Specific month and year
          const month = parseInt(selectedMonth);
          startDate = new Date(year, month - 1, 1);
          endDate = new Date(year, month, 0);
        } else {
          // Whole year
          startDate = new Date(year, 0, 1);
          endDate = new Date(year, 11, 31);
        }
        
        const formatDate = (date: Date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        };
        
        params.append('startDate', formatDate(startDate));
        params.append('endDate', formatDate(endDate));
      }

      const response = await fetch(`/api/trip-records?${params}`);
      const result = await response.json();
      
      if (response.ok && result?.trips) {
        // Extract unique vehicles from trip records, excluding ForkLift
        const vehicleMap = new Map();
        result.trips.forEach((trip: any) => {
          if (trip.vehicle && trip.vehicle.licensePlate) {
            const vehicleType = trip.vehicle.vehicleType?.toLowerCase() || '';
            // Exclude ForkLift
            if (vehicleType !== 'forklift') {
              if (!vehicleMap.has(trip.vehicle.id)) {
                vehicleMap.set(trip.vehicle.id, {
                  id: trip.vehicle.id,
                  licensePlate: trip.vehicle.licensePlate,
                  vehicleType: trip.vehicle.vehicleType
                });
              }
            }
          }
        });
        
        const options = Array.from(vehicleMap.values())
          .sort((a: any, b: any) => a.licensePlate.localeCompare(b.licensePlate));
        
        setVehicleOptions(options);
        
        // Reset vehicle filter if selected vehicle is not in the new list
        if (selectedVehicleId && !options.some((v: any) => String(v.id) === selectedVehicleId)) {
          setSelectedVehicleId('');
        }
      }
    } catch (error) {
      console.error('Failed to load vehicle options', error);
    } finally {
      setLoadingVehicles(false);
    }
  };

  // Handle delete
  const handleDeleteConfirm = async () => {
    if (!deleteDialog.recordId) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/trip-records/${deleteDialog.recordId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        showSnackbar('ลบบันทึกการเดินทางสำเร็จ', 'success');
        setDeleteDialog({ open: false, recordId: null });
        fetchTripRecords();
        
        // Reset page if current page becomes empty
        if (tripRecords.length === 1 && page > 1) {
          setPage(page - 1);
        }
      } else {
        showSnackbar(data.error || 'เกิดข้อผิดพลาดในการลบ', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการลบ', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      maximumFractionDigits: 2,
    }).format(amount) + ' บาท';
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Initial load
  useEffect(() => {
    fetchTripRecords(true);
    fetchVehicleOptions();
  }, []);

  // Handle search with debounce
  useEffect(() => {
    console.log('Search useEffect triggered:', { searchTerm });
    const delayedFetch = setTimeout(() => {
      setPage(1);
      fetchTripRecords();
    }, 500);

    return () => clearTimeout(delayedFetch);
  }, [searchTerm]);

  // Handle filter changes (reset to page 1 and fetch)
  useEffect(() => {
    console.log('Filter useEffect triggered:', { itemsPerPage, selectedVehicleId, selectedMonth, selectedYear });
    setPage(1);
    fetchTripRecords();
  }, [itemsPerPage, selectedVehicleId, selectedMonth, selectedYear]);

  // Reload vehicle options when month/year changes
  useEffect(() => {
    fetchVehicleOptions();
  }, [selectedMonth, selectedYear]);

  // Handle page changes only
  useEffect(() => {
    console.log('Page useEffect triggered:', { page });
    if (page > 1) {
      fetchTripRecords();
    }
  }, [page]);

  if (loading) {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout showSidebar={false}>
      <Box>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              บันทึกการเดินทาง
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* View Mode Toggle */}
            <Box sx={{ 
              display: { xs: 'none', md: 'flex' },
              border: '1px solid',
              borderColor: 'grey.300',
              borderRadius: 1,
              overflow: 'hidden'
            }}>
              <IconButton
                size="small"
                onClick={() => setViewMode('table')}
                sx={{
                  borderRadius: 0,
                  bgcolor: viewMode === 'table' ? 'primary.main' : 'transparent',
                  color: viewMode === 'table' ? 'white' : 'text.secondary',
                  '&:hover': {
                    bgcolor: viewMode === 'table' ? 'primary.dark' : 'grey.100',
                  },
                }}
              >
                <ViewListIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setViewMode('card')}
                sx={{
                  borderRadius: 0,
                  bgcolor: viewMode === 'card' ? 'primary.main' : 'transparent',
                  color: viewMode === 'card' ? 'white' : 'text.secondary',
                  '&:hover': {
                    bgcolor: viewMode === 'card' ? 'primary.dark' : 'grey.100',
                  },
                }}
              >
                <ViewModuleIcon />
              </IconButton>
            </Box>
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              href="/trip-records/add"
            >
              เพิ่มการเดินทาง
            </Button>
          </Box>
        </Box>

        {/* Search & Filters */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          {/* Search and Date Filter Row */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: '1fr',
              md: '2fr 1fr 1fr 1fr auto' 
            },
            gap: 2, 
            mb: 2,
            alignItems: 'center'
          }}>
            <TextField
              placeholder="ค้นหาทะเบียนรถ, ลูกค้า, เลขที่เอกสาร, หมายเหตุ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchTerm('')}
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            
            <Autocomplete
              options={vehicleOptions}
              getOptionLabel={(option) => option.licensePlate}
              value={vehicleOptions.find(v => String(v.id) === selectedVehicleId) || null}
              onChange={(event, newValue) => {
                const newVehicleId = newValue ? String(newValue.id) : '';
                console.log('Vehicle selection changed:', { 
                  oldValue: selectedVehicleId, 
                  newValue: newVehicleId,
                  vehicleInfo: newValue 
                });
                setSelectedVehicleId(newVehicleId);
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              loading={loadingVehicles}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="ทะเบียนรถ"
                  placeholder="พิมพ์เพื่อค้นหา..."
                  size="small"
                />
              )}
            />
            
            
            <FormControl size="small">
              <InputLabel>เดือน</InputLabel>
              <Select
                value={selectedMonth}
                label="เดือน"
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <MenuItem value="">ทั้งหมด</MenuItem>
                <MenuItem value="1">มกราคม</MenuItem>
                <MenuItem value="2">กุมภาพันธ์</MenuItem>
                <MenuItem value="3">มีนาคม</MenuItem>
                <MenuItem value="4">เมษายน</MenuItem>
                <MenuItem value="5">พฤษภาคม</MenuItem>
                <MenuItem value="6">มิถุนายน</MenuItem>
                <MenuItem value="7">กรกฎาคม</MenuItem>
                <MenuItem value="8">สิงหาคม</MenuItem>
                <MenuItem value="9">กันยายน</MenuItem>
                <MenuItem value="10">ตุลาคม</MenuItem>
                <MenuItem value="11">พฤศจิกายน</MenuItem>
                <MenuItem value="12">ธันวาคม</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small">
              <InputLabel>ปี</InputLabel>
              <Select
                value={selectedYear}
                label="ปี"
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const startYear = 2025; // ปีเริ่มต้นของระบบ
                  const years = [];
                  // เริ่มจากปีปัจจุบันลงมาถึงปีเริ่มต้น
                  for (let year = currentYear; year >= startYear; year--) {
                    years.push(
                      <MenuItem key={year} value={year.toString()}>
                        {year + 543}
                      </MenuItem>
                    );
                  }
                  return years;
                })()}
              </Select>
            </FormControl>

          </Box>

          {/* Active Filters */}
          { (searchTerm || selectedVehicleId || selectedMonth) && (
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1, 
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                  ตัวกรอง:
                </Typography>
                
                {searchTerm && (
                  <Chip
                    label={`ค้นหา: "${searchTerm}"`}
                    onDelete={() => setSearchTerm('')}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                )}

                {selectedVehicleId && (
                  <Chip
                    label={`ทะเบียน: ${vehicleOptions.find(v => String(v.id) === String(selectedVehicleId))?.licensePlate || selectedVehicleId}`}
                    onDelete={() => setSelectedVehicleId('')}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                )}

                {selectedMonth && (
                  <Chip
                    label={`เดือน: ${['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'][parseInt(selectedMonth)-1]}`}
                    onDelete={() => setSelectedMonth('')}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                )}

                {selectedYear && (
                  <Chip
                    label={`ปี: ${parseInt(selectedYear) + 543}`}
                    onDelete={() => setSelectedYear('')}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>

              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedVehicleId('');
                  setSelectedMonth('');
                  setSelectedYear('');
                }}
                sx={{ 
                  minWidth: 'auto',
                  px: 2,
                  color: 'text.secondary',
                  borderColor: 'grey.300',
                  '&:hover': { 
                    color: 'error.main',
                    borderColor: 'error.main' 
                  }
                }}
              >
                ล้างทั้งหมด
              </Button>
            </Box>
          )}
        </Paper>

        {/* Desktop Table or Card View / Mobile uses Card View */}
        {viewMode === 'table' && !isMobile ? (
          <TableContainer 
            component={Paper} 
            sx={{ 
              borderRadius: 3,
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)',
              overflow: 'hidden'
            }}
          >
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow sx={{ 
                  bgcolor: 'grey.50',
                  '& .MuiTableCell-head': {
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: 'grey.700',
                    borderBottom: '2px solid',
                    borderBottomColor: 'grey.200',
                    py: 2.5,
                    px: 3
                  }
                }}>
                  <TableCell>รถ</TableCell>
                  
                  <TableCell>ลูกค้า</TableCell>
                  <TableCell>เลขที่เอกสาร</TableCell>
                  <TableCell>วันที่เดินทาง</TableCell>
                  <TableCell align="center">ระยะทาง</TableCell>
                  <TableCell align="center">จำนวนวัน</TableCell>
                  <TableCell align="center">ค่าใช้จ่ายบริษัท</TableCell>
                  <TableCell align="center">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tripRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <TripIcon sx={{ fontSize: 48, color: 'grey.400' }} />
                        <Typography variant="body1" color="text.secondary">
                          ไม่พบข้อมูลการเดินทาง
                        </Typography>
                        {searchTerm && (
                          <Typography variant="body2" color="text.secondary">
                            ลองค้นหาด้วยคำอื่น หรือ{' '}
                            <Button size="small" onClick={() => setSearchTerm('')}>
                              ล้างการค้นหา
                            </Button>
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  tripRecords.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {record.vehicle.carImage ? (
                            <img 
                              src={getImageUrl(record.vehicle.carImage)} 
                              alt={record.vehicle.licensePlate} 
                              style={{ 
                                width: 40, 
                                height: 40, 
                                borderRadius: 4, 
                                objectFit: 'cover' 
                              }}
                              onError={(e) => {
                                console.log('Vehicle image failed to load:', record.vehicle.carImage);
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.setAttribute('style', 'display: inline-block');
                              }}
                            />
                          ) : null}
                          <CarIcon 
                            sx={{ 
                              color: 'grey.600',
                              display: record.vehicle.carImage ? 'none' : 'inline-block'
                            }} 
                          />
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {record.vehicle.licensePlate}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {record.vehicle.brand} {record.vehicle.model}
                            </Typography>
                            <Typography variant="caption" color="info.main" sx={{ fontWeight: 500 }}>
                              {record.vehicle.vehicleType === 'ForkLift' ? 'รถโฟล์คลิฟท์' :
                               record.vehicle.vehicleType === 'Pickup' ? 'รถกระบะ' :
                               record.vehicle.vehicleType === 'Truck' ? 'รถบรรทุก' :
                               record.vehicle.vehicleType || '-'}
                            </Typography>
                            <Typography variant="body2" fontWeight={600} color="primary.main">
                            {record.driverName || record.vehicle.driverName || '-'}
                          </Typography>
                          
                          
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {record.customer.cmName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {record.customer.cmCode}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Document Number */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {record.documentNumber || '-'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Box>
                          {(() => {
                            const depDateStr = formatDate(record.departureDate);
                            const retDateStr = record.returnDate ? formatDate(record.returnDate) : '-';
                            // Consider "ยังไม่ระบุวันกลับ" only when return date is truly a fallback:
                            // - no returnDate at all OR
                            // - returnDate equals departureDate AND (returnTime equals departureTime or empty) AND days === 0
                            // (Previously we flagged whenever times matched, causing valid different-date returns without time to be treated as missing.)
                            const noRealReturn = !record.returnDate || (
                              record.returnDate === record.departureDate &&
                              (record.returnTime === record.departureTime || !record.returnTime) &&
                              record.days === 0
                            );
                            return (
                              <>
                                <Typography variant="body2">
                                  {depDateStr} - {noRealReturn ? 'ยังไม่ระบุวันกลับ' : retDateStr}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {record.departureTime} - {noRealReturn ? '-' : record.returnTime}
                                </Typography>
                              </>
                            );
                          })()}
                        </Box>
                      </TableCell>

                      {/* Combined Distance Information */}
                      <TableCell align="center">
                        <Box sx={{ textAlign: 'center' }}>
                          {/* Actual Distance */}
                          <Typography variant="body2" fontWeight="bold" color="primary.main">
                            จริง: {record.actualDistance ? record.actualDistance.toLocaleString('th-TH', { maximumFractionDigits: 2 }) : '-'} 
                            {record.actualDistance && ' กม.'}
                          </Typography>
                          
                          {/* System Distance */}
                          <Typography variant="caption" color="secondary.main">
                            ระบบ: {record.estimatedDistance ? record.estimatedDistance.toLocaleString('th-TH', { maximumFractionDigits: 2 }) : '-'} 
                            {record.estimatedDistance && ' กม.'}
                          </Typography>
                          
                          {/* Distance Difference */}
                          {(() => {
                            if (!record.actualDistance || !record.estimatedDistance) {
                              return null;
                            }
                            
                            const difference = record.actualDistance - record.estimatedDistance;
                            const percentDiff = ((Math.abs(difference) / record.estimatedDistance) * 100).toFixed(1);
                            const isOver = difference > 0;
                            const isHighDiff = Math.abs(difference) > record.estimatedDistance * 0.3;
                            
                            return (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: isHighDiff ? 'warning.main' : (isOver ? 'error.main' : 'success.main'),
                                  fontWeight: 600,
                                  display: 'block'
                                }}
                              >
                                ต่าง: {difference > 0 ? '+' : ''}{difference.toFixed(1)} กม. ({isOver ? '+' : ''}{percentDiff}%)
                                {isHighDiff && ' ⚠️'}
                              </Typography>
                            );
                          })()}
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          label={`${record.days} วัน`}
                          size="small"
                          color={record.days >= 1 ? 'success' : 'default'}
                          variant={record.days >= 1 ? 'filled' : 'outlined'}
                        />
                      </TableCell>

                      {/* Company Expenses: ค่าซ่อมแซม + ค่าทางด่วน + ค่าน้ำมัน + ค่าเช็คระยะ */}
                      <TableCell align="center">
                        {(() => {
                          const companyExpenses = 
                            parseFloat(record.repairCost?.toString() || '0') + 
                            parseFloat(record.tollFee?.toString() || '0') + 
                            parseFloat(record.fuelCost?.toString() || '0') + 
                            parseFloat(record.distanceCheckFee?.toString() || '0');
                          
                          return (
                            <Typography 
                              variant="body2" 
                              fontWeight={500}
                              sx={{ 
                                color: 'warning.main',
                                bgcolor: companyExpenses > 0 ? 'warning.50' : 'transparent',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1
                              }}
                            >
                              {formatCurrency(companyExpenses)}
                            </Typography>
                          );
                        })()}
                      </TableCell>

                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenViewDialog(record)}
                            color="info"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            href={`/trip-records/edit/${record.id}`}
                            color="warning"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => setDeleteDialog({ open: true, recordId: record.id })}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          /* Card View (Desktop & Mobile) */
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr',
              sm: '1fr',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)' 
            },
            gap: { xs: 2, md: 3 }
          }}>
            {tripRecords.length === 0 ? (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                  <TripIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                    ไม่มีข้อมูลการเดินทาง
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                    เริ่มต้นบันทึกการเดินทางของคุณ
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    href="/trip-records/add"
                  >
                    เพิ่มการเดินทาง
                  </Button>
                </Paper>
              </Box>
            ) : (
              tripRecords.map((record) => (
                <Paper 
                  key={record.id}
                  sx={{ 
                    p: 3, 
                    borderRadius: 3,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    '&:hover': {
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Header with Date and Actions */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    mb: 2
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                      <TripIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.95rem' }}>
                        {(() => {
                          const depDateStr = formatDate(record.departureDate);
                          const retDateStr = record.returnDate ? formatDate(record.returnDate) : '-';
                          const noRealReturn = !record.returnDate || (
                            record.returnDate === record.departureDate &&
                            (record.returnTime === record.departureTime || !record.returnTime) &&
                            record.days === 0
                          );
                          return `${depDateStr} - ${noRealReturn ? 'ยังไม่กลับ' : retDateStr}`;
                        })()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        onClick={() => handleOpenViewDialog(record)}
                        size="small"
                        sx={{
                          color: 'info.main',
                          bgcolor: 'info.50',
                          '&:hover': { bgcolor: 'info.100' }
                        }}
                      >
                        <VisibilityIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton
                        href={`/trip-records/edit/${record.id}`}
                        size="small"
                        sx={{
                          color: 'warning.main',
                          bgcolor: 'warning.50',
                          '&:hover': { bgcolor: 'warning.100' }
                        }}
                      >
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton
                        onClick={() => setDeleteDialog({ open: true, recordId: record.id })}
                        size="small"
                        sx={{
                          color: 'error.main',
                          bgcolor: 'error.50',
                          '&:hover': { bgcolor: 'error.100' }
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Vehicle Section with Image */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    {record.vehicle.carImage ? (
                      <img 
                        src={getImageUrl(record.vehicle.carImage)} 
                        alt={record.vehicle.licensePlate} 
                        style={{ 
                          width: 60, 
                          height: 60, 
                          borderRadius: 8, 
                          objectFit: 'cover',
                          border: '2px solid #e0e0e0'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Box sx={{ 
                        width: 60, 
                        height: 60, 
                        borderRadius: 2, 
                        bgcolor: 'primary.main', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white',
                        border: '2px solid #e0e0e0'
                      }}>
                        <CarIcon sx={{ fontSize: 28 }} />
                      </Box>
                    )}
                    
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5, fontSize: '1rem' }}>
                        {record.vehicle.licensePlate}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                        {record.vehicle.brand} {record.vehicle.model}
                      </Typography>
                      <Chip
                        label={
                          record.vehicle.vehicleType === 'ForkLift' ? 'โฟล์คลิฟท์' :
                          record.vehicle.vehicleType === 'Pickup' ? 'กระบะ' :
                          record.vehicle.vehicleType === 'Truck' ? 'บรรทุก' :
                          record.vehicle.vehicleType || '-'
                        }
                        size="small"
                        sx={{ mt: 0.5, height: 22, fontSize: '0.75rem' }}
                        color="info"
                      />
                    </Box>
                  </Box>

                  {/* Driver Info */}
                  <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.9rem' }}>
                          {record.driverName || record.vehicle.driverName || '-'}
                        </Typography>
                        {record.driverLicense && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                            ใบขับขี่: {record.driverLicense}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {/* Customer Info */}
                  <Box sx={{ mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'grey.100' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      ลูกค้า
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {record.customer.cmName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {record.customer.cmCode}
                    </Typography>
                  </Box>

                  {/* Document Number */}
                  {record.documentNumber && (
                    <Box sx={{ mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'grey.100' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        เลขที่เอกสาร
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        fontFamily: 'monospace', 
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: 'primary.main'
                      }}>
                        {record.documentNumber}
                      </Typography>
                    </Box>
                  )}

                  {/* Distance and Days */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: 2, 
                    mb: 2,
                    pb: 2,
                    borderBottom: '1px solid',
                    borderColor: 'grey.100'
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.8rem' }}>
                        ระยะทางจริง
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', fontSize: '1.15rem' }}>
                        {record.actualDistance ? record.actualDistance.toLocaleString('th-TH', { maximumFractionDigits: 2 }) : '-'} กม.
                      </Typography>
                      {record.estimatedDistance && (
                        <Typography variant="caption" color="secondary.main" sx={{ fontSize: '0.75rem' }}>
                          ระบบ: {record.estimatedDistance.toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.8rem' }}>
                        จำนวนวัน
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main', fontSize: '1.15rem' }}>
                        {record.days} วัน
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {record.departureTime} - {record.returnTime || '-'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Expenses Summary */}
                  <Box sx={{ mt: 'auto' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'warning.50', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main', fontSize: '0.85rem' }}>
                        ค่าใช้จ่ายบริษัท
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main', fontSize: '0.9rem' }}>
                        {(() => {
                          const companyExpenses = 
                            parseFloat(record.repairCost?.toString() || '0') + 
                            parseFloat(record.tollFee?.toString() || '0') + 
                            parseFloat(record.fuelCost?.toString() || '0') + 
                            parseFloat(record.distanceCheckFee?.toString() || '0');
                          return formatCurrency(companyExpenses);
                        })()}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))
            )}
          </Box>
        )}

        {/* Pagination */}
        {totalItems > 0 && (
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <DataTablePagination
              component="div"
              count={totalItems}
              rowsPerPage={itemsPerPage}
              page={page - 1}
              onPageChange={(_, newPage) => setPage(newPage + 1)}
              onRowsPerPageChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setPage(1);
              }}
              rowsPerPageOptions={[20, 50, 100, 200]}
              labelRowsPerPage="แสดงต่อหน้า:"
              labelDisplayedRows={({ from, to, count }) => 
                `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
              }
            />
          </Paper>
        )}

        {/* View Dialog */}
  <Dialog 
          open={viewDialog.open} 
          onClose={() => {
            setViewDialog(prev => ({ ...prev, open: false }));
            setTimeout(() => {
              setViewDialog({ open: false, record: null });
            }, 300);
          }} 
          maxWidth="md" 
          fullWidth
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              borderRadius: isMobile ? 0 : 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              ...(isMobile && {
                margin: 0,
                maxHeight: '100vh',
                height: '100vh'
              })
            }
          }}
        >
          <DialogTitle sx={{ 
            pb: 0.5,
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            minHeight: 56
          }}>
            <Box sx={{ 
              width: 32, 
              height: 32, 
              borderRadius: '50%', 
              bgcolor: 'primary.main', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              fontSize: 16
            }}>
              🚚
            </Box>
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
                รายละเอียดการเดินทาง
              </Typography>
              {viewDialog.record && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }} noWrap>
                  {viewDialog.record.vehicle.licensePlate} → {viewDialog.record.customer.cmName}
                  {viewDialog.record.driverName || viewDialog.record.vehicle.driverName ? ` • คนขับ: ${viewDialog.record.driverName || viewDialog.record.vehicle.driverName}` : ''}
                  {viewDialog.record.driverLicense ? ` (${viewDialog.record.driverLicense})` : ''}
                </Typography>
              )}
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ p: { xs: 2, sm: 2.25 }, pt: 2 }}>
            
            {viewDialog.record && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Document Number */}
                {viewDialog.record.documentNumber && (
                  <Paper sx={{ p: 2, bgcolor: 'secondary.50', borderRadius: 2 , mt: 1}}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                        📄 เลขที่เอกสาร
                      </Typography>
                      
                    </Box>
                    <Typography variant="body2" sx={{ 
                      fontFamily: 'monospace', 
                      fontWeight: 600, 
                      bgcolor: 'white', 
                      p: 1.25, 
                      mt: 1,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'secondary.200'
                    }}>
                      {viewDialog.record.documentNumber}
                    </Typography>
                  </Paper>
                )}

                
                {/* Summary */}
                <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'success.main' }}>
                      💰 สรุป
                    </Typography>
                    
                  </Box>
                  
                  {/* Company Expenses Only */}
                  {(() => {
                    // Company expenses = repair + toll + fuel + distanceCheck
                    const companyExpenses = [
                      viewDialog.record.distanceCheckFee,
                      viewDialog.record.fuelCost,
                      viewDialog.record.tollFee,
                      viewDialog.record.repairCost
                    ].reduce((sum: number, cost) => sum + (parseFloat(cost?.toString() || '0')), 0);
                    
                    return (
                      <>
                        {/* Company Expenses Section */}
                        <Box sx={{ mb: 2, p: 2, bgcolor: companyExpenses > 0 ? 'warning.50' : 'grey.50', borderRadius: 2, border: '1px solid', borderColor: companyExpenses > 0 ? 'warning.200' : 'grey.200' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                            ค่าใช้จ่ายของบริษัท
                          </Typography>
                          <Typography variant="h6" color={companyExpenses > 0 ? 'warning.main' : 'text.secondary'} sx={{ fontWeight: 700, mb: 1.5 }}>
                            {companyExpenses > 0 ? formatCurrency(companyExpenses) : formatCurrency(0)}
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption" color="text.secondary">ค่าเช็คระยะ:</Typography>
                              <Typography variant="caption" fontWeight="bold">
                                {viewDialog.record.distanceCheckFee ? formatCurrency(viewDialog.record.distanceCheckFee) : formatCurrency(0)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption" color="text.secondary">ค่าน้ำมัน:</Typography>
                              <Typography variant="caption" fontWeight="bold">
                                {viewDialog.record.fuelCost ? formatCurrency(viewDialog.record.fuelCost) : formatCurrency(0)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption" color="text.secondary">ค่าทางด่วน:</Typography>
                              <Typography variant="caption" fontWeight="bold">
                                {viewDialog.record.tollFee ? formatCurrency(viewDialog.record.tollFee) : formatCurrency(0)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption" color="text.secondary">ค่าซ่อมแซม:</Typography>
                              <Typography variant="caption" fontWeight="bold">
                                {viewDialog.record.repairCost ? formatCurrency(viewDialog.record.repairCost) : formatCurrency(0)}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </>
                    );
                  })()}
                </Paper>


                {/* Vehicle and Customer Information */}
                <Paper sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      🚚 ข้อมูลเดินทาง
                    </Typography>
                    
                  </Box>

                  {/* Vehicle Image and License Plate */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    {viewDialog.record.vehicle.carImage ? (
                      <img 
                        src={getImageUrl(viewDialog.record.vehicle.carImage)} 
                        alt={viewDialog.record.vehicle.licensePlate} 
                        style={{ 
                          width: 72, 
                          height: 72, 
                          borderRadius: 8, 
                          objectFit: 'cover',
                          border: '2px solid #e0e0e0'
                        }}
                        onError={(e) => {
                          console.log('View dialog vehicle image failed to load:', viewDialog.record?.vehicle.carImage);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Box sx={{ 
                        width: 72, 
                        height: 72, 
                        borderRadius: 2, 
                        bgcolor: 'primary.main', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white',
                        border: '2px solid #e0e0e0'
                      }}>
                        <CarIcon sx={{ fontSize: 36 }} />
                      </Box>
                    )}
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ทะเบียนรถ
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {viewDialog.record.vehicle.licensePlate}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
                    gap: 2
                  }}>
                    
                    {/* License plate is now displayed with vehicle image above, so this section can show vehicle brand/model */}
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ยี่ห้อ/รุ่น
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {viewDialog.record.vehicle.brand} {viewDialog.record.vehicle.model}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ลูกค้า
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ({viewDialog.record.customer.cmCode}) {viewDialog.record.customer.cmName}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ประเภทรถ
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {viewDialog.record.vehicle.vehicleType === 'ForkLift' ? 'รถโฟล์คลิฟท์' :
                         viewDialog.record.vehicle.vehicleType === 'Pickup' ? 'รถกระบะ' :
                         viewDialog.record.vehicle.vehicleType === 'Truck' ? 'รถบรรทุก' :
                         viewDialog.record.vehicle.vehicleType || '-'}
                      </Typography>
                    </Box>
                    

                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <Typography variant="caption" color="text.secondary">
                        คนขับ (ณ วันเดินทาง)
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                        {(() => {
                          // Get driver name from trip record (priority) or fallback to vehicle data
                          const driverName = viewDialog.record.driverName || viewDialog.record.vehicle.mainDriver?.driverName || '-';
                          const driverLicense = viewDialog.record.driverLicense;
                          
                          if (process.env.NODE_ENV === 'development') {
                            console.log(`🎯 Modal driver lookup for:`, {
                              driverName,
                              driverLicense,
                              cachedImages: Array.from(driverImages.entries())
                            });
                          }
                          
                          // Get driver image with multiple fallback strategies
                          let driverImage = '';
                          let imageSource = 'none';
                          let isLoading = false;
                          
                          if (driverLicense) {
                            // Check if currently loading
                            isLoading = driverImages.get(driverLicense) === 'loading';
                            
                            // Strategy 1: Try cached image by license (most reliable)
                            const cachedImage = getCachedDriverImage(driverLicense);
                            if (cachedImage) {
                              driverImage = cachedImage;
                              imageSource = 'cache';
                            }
                            
                            // Strategy 2: Try vehicle driver relations by license match
                            if (!driverImage && viewDialog.record.vehicle.mainDriver?.driverLicense === driverLicense) {
                              driverImage = viewDialog.record.vehicle.mainDriver.driverImage || '';
                              imageSource = 'mainDriver';
                            }
                            
                            if (!driverImage && viewDialog.record.vehicle.backupDriver?.driverLicense === driverLicense) {
                              driverImage = viewDialog.record.vehicle.backupDriver.driverImage || '';
                              imageSource = 'backupDriver';
                            }
                            
                            // Strategy 3: If still no image and no cache entry, load from API
                            if (!driverImage && !driverImages.has(driverLicense)) {
                              if (process.env.NODE_ENV === 'development') {
                                console.log(`🚀 Loading image on-demand for license: ${driverLicense}`);
                              }
                              isLoading = true; // Mark as loading
                              getDriverImageByLicense(driverLicense).then(image => {
                                if (image) {
                                  setDriverImages(prev => {
                                    const updated = new Map(prev);
                                    updated.set(driverLicense, image);
                                    return updated;
                                  });
                                }
                              });
                            }
                          }
                          
                          // Strategy 4: Final fallback to main driver image if no license or no match
                          if (!driverImage && !isLoading) {
                            driverImage = viewDialog.record.vehicle.mainDriver?.driverImage || '';
                            imageSource = imageSource === 'none' ? 'fallback' : imageSource;
                          }
                          
                          if (process.env.NODE_ENV === 'development') {
                            console.log(`🖼️ Modal image result:`, {
                              driverImage,
                              imageSource,
                              isLoading
                            });
                          }
                          
                          const finalImageUrl = driverImage ? getImageUrl(driverImage) : undefined;
                          const showUserIcon = !finalImageUrl || isLoading;
                          
                          return (
                            <>
                              <Avatar
                                src={showUserIcon ? undefined : finalImageUrl}
                                sx={{ 
                                  width: 48, 
                                  height: 48,
                                  border: '2px solid',
                                  borderColor: 'grey.200',
                                  backgroundColor: showUserIcon ? 'grey.100' : 'transparent',
                                  // Add loading animation when loading
                                  ...(isLoading && {
                                    animation: 'pulse 1.5s ease-in-out infinite',
                                    '@keyframes pulse': {
                                      '0%': { opacity: 1 },
                                      '50%': { opacity: 0.5 },
                                      '100%': { opacity: 1 }
                                    }
                                  })
                                }}
                                onError={(e) => {
                                  if (process.env.NODE_ENV === 'development') {
                                    console.error('❌ Avatar image error:', {
                                      originalSrc: finalImageUrl,
                                      driverImage,
                                      imageSource
                                    });
                                  }
                                  // Reset src to show PersonIcon instead
                                  const img = e.target as HTMLImageElement;
                                  img.src = '';
                                }}
                                onLoad={() => {
                                  if (process.env.NODE_ENV === 'development') {
                                    console.log('✅ Avatar loaded:', finalImageUrl);
                                  }
                                }}
                              >
                                {/* แสดง PersonIcon เมื่อไม่มีรูปหรือกำลังโหลด */}
                                {showUserIcon && (
                                  <PersonIcon 
                                    sx={{ 
                                      fontSize: 28, 
                                      color: isLoading ? 'grey.500' : 'grey.600',
                                      // เพิ่ม animation เล็กน้อยเมื่อ loading
                                      ...(isLoading && {
                                        opacity: 0.7
                                      })
                                    }} 
                                  />
                                )}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {driverName}
                                </Typography>
                                {driverLicense && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                    ใบขับขี่: {driverLicense}
                                  </Typography>
                                )}
                                {/* Debug info in development */}
                                {process.env.NODE_ENV === 'development' && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>
                                    ภาพจาก: {imageSource} | Cache: {driverImages.has(driverLicense || '') ? 'Yes' : 'No'} | Loading: {isLoading ? 'Yes' : 'No'}
                                  </Typography>
                                )}
                              </Box>
                            </>
                          );
                        })()}
                      </Box>
                    </Box>
 
                  </Box>
                  
                  {viewDialog.record.customer.cmAddress && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.200' }}>
                      <Typography variant="caption" color="text.secondary">
                        ที่อยู่ลูกค้า
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {viewDialog.record.customer.cmAddress}
                      </Typography>
                    </Box>
                  )}
                </Paper>

                {/* Trip Schedule */}
                <Paper sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'success.main' }}>
                      📅 กำหนดการ
                    </Typography>
                    
                  </Box>
                  
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
                    gap: 2
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        วันที่ออกเดินทาง
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatDate(viewDialog.record.departureDate)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        เวลา {viewDialog.record.departureTime} น.
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        วันที่กลับ
                      </Typography>
                      {(() => {
                        const noRealReturn = !viewDialog.record.returnDate || (
                          viewDialog.record.returnDate === viewDialog.record.departureDate &&
                          (viewDialog.record.returnTime === viewDialog.record.departureTime || !viewDialog.record.returnTime) &&
                          viewDialog.record.days === 0
                        );
                        if (noRealReturn) {
                          return (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                                ยังไม่ระบุวันกลับ
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                เวลา -
                              </Typography>
                            </>
                          );
                        }
                        return (
                          <>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {viewDialog.record.returnDate ? formatDate(viewDialog.record.returnDate) : '-'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              เวลา {viewDialog.record.returnTime} น.
                            </Typography>
                          </>
                        );
                      })()}
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        จำนวนวัน
                      </Typography>
                      <Typography variant="subtitle1" color="success.main" sx={{ fontWeight: 600 }}>
                        {viewDialog.record.days} วัน
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ค่าเบี้ยเลี้ยง
                      </Typography>
                      <Typography variant="subtitle1" color="success.main" sx={{ fontWeight: 600 }}>
                        {formatCurrency(viewDialog.record.totalAllowance)}
                      </Typography>
                      
                    </Box>
                  </Box>
                  
                  {viewDialog.record.loadingDate && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'success.200' }}>
                      <Typography variant="caption" color="text.secondary">
                        วันที่ขึ้นของ
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {new Date(viewDialog.record.loadingDate).toLocaleDateString('th-TH')}
                      </Typography>
                    </Box>
                  )}
                </Paper>

                {/* Distance and Odometer Information */}
                <Paper sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'info.main' }}>
                      📏 ระยะทาง & ไมล์
                    </Typography>
                    
                  </Box>
                  
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
                    gap: 2
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ระยะทางประมาณจากระบบ
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {viewDialog.record.estimatedDistance.toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                      </Typography>
                    </Box>
                    
                    {viewDialog.record.actualDistance && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          ระยะทางจริงจากไมล์
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {viewDialog.record.actualDistance.toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                        </Typography>
                      </Box>
                    )}
                    
                    {viewDialog.record.odometerBefore && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          เลขไมล์ก่อนไป
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {viewDialog.record.odometerBefore.toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                        </Typography>
                      </Box>
                    )}
                    
                    {viewDialog.record.odometerAfter && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          เลขไมล์หลังกลับ
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {viewDialog.record.odometerAfter.toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>

                {/* Additional Costs */}
                <Paper sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                      💰 ค่าใช้จ่าย
                    </Typography>
                  </Box>
                  
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
                    gap: 2
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ค่าเช็คระยะ
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {(() => {
                          const v = viewDialog.record.distanceCheckFee;
                          const n = parseFloat(v?.toString() || '');
                          return isNaN(n) ? '-' : `${n.toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท`;
                        })()}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ค่าน้ำมันรถ
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {(() => {
                          const v = viewDialog.record.fuelCost;
                          const n = parseFloat(v?.toString() || '');
                          return isNaN(n) ? '-' : `${n.toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท`;
                        })()}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ค่าทางด่วน
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {(() => {
                          const v = viewDialog.record.tollFee;
                          const n = parseFloat(v?.toString() || '');
                          return isNaN(n) ? '-' : `${n.toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท`;
                        })()}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ค่าซ่อมแซม
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {(() => {
                          const v = viewDialog.record.repairCost;
                          const n = parseFloat(v?.toString() || '');
                          return isNaN(n) ? '-' : `${n.toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท`;
                        })()}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>


                {/* Trip Items */}
                {viewDialog.record.tripItems && viewDialog.record.tripItems.length > 0 && (
                  <Paper sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        📦 พัสดุที่นำกลับ ({viewDialog.record.tripItems.length})
                      </Typography>
                      
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {viewDialog.record.tripItems.map((item: any, index: number) => (
                        <Box key={index} sx={{ 
                          p: 1.5, 
                          bgcolor: 'grey.50', 
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'grey.200'
                        }}>
                          <Box sx={{ 
                            display: 'grid', 
                            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, 
                            gap: 2,
                            alignItems: 'start'
                          }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                รหัส/ชื่อพัสดุ
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                
                                {item.item?.ptDesc1}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                              {item.item?.ptPart}
                              </Typography>
                            </Box>
                            
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                จำนวน
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {parseFloat(item.quantity).toLocaleString('th-TH', { maximumFractionDigits: 2 })} {item.unit}
                              </Typography>
                            </Box>
                            
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                ราคารวม
                              </Typography>
                              <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 600 }}>
                                {parseFloat(item.totalPrice || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท
                              </Typography>
                            </Box>
                          </Box>
                          
                          {item.remark && (
                            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.200' }}>
                              <Typography variant="caption" color="text.secondary">
                                หมายเหตุ
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {item.remark}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                )}

                {/* Remark */}
                {viewDialog.record.remark && (
                  <Paper sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'warning.main' }}>
                      📝 หมายเหตุ
                    </Typography>
                    <Typography variant="body2">
                      {viewDialog.record.remark}
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 1, gap: 1 }}>
            <Button
              onClick={() => {
                setViewDialog(prev => ({ ...prev, open: false }));
                setTimeout(() => {
                  setViewDialog({ open: false, record: null });
                }, 300);
              }}
              color="inherit"
              variant="outlined"
            >
              ปิด
            </Button>
            {viewDialog.record && (
              <Button
                variant="contained"
                href={`/trip-records/edit/${viewDialog.record.id}`}
                startIcon={<EditIcon />}
              >
                แก้ไข
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialog.open} 
          onClose={() => setDeleteDialog({ open: false, recordId: null })}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              borderRadius: isMobile ? 0 : 3,
            }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            color: 'error.main'
          }}>
            <DeleteIcon />
            ยืนยันการลบ
          </DialogTitle>
          <DialogContent>
            <Typography>
              คุณแน่ใจหรือว่าต้องการลบบันทึกการเดินทางนี้ ?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button 
              onClick={() => setDeleteDialog({ open: false, recordId: null })}
              variant="outlined"
              fullWidth={isMobile}
              disabled={deleteLoading}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              variant="contained" 
              color="error"
              fullWidth={isMobile}
              disabled={deleteLoading}
              startIcon={deleteLoading ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
            >
              {deleteLoading ? 'กำลังลบ...' : 'ลบ'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
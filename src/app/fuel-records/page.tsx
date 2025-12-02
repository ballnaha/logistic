'use client';
import React, { useState, useEffect, useRef } from 'react';
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
  Avatar,
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
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  LocalGasStation as FuelIcon,
  DirectionsCar as CarIcon,
  Clear as ClearIcon,
  Person as PersonIcon,

} from '@mui/icons-material';

import Layout from '../components/Layout';
import DataTablePagination from '../../components/DataTablePagination';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface Driver {
  id: number;
  driverName: string;
  driverLicense: string;
  driverImage?: string;
}

interface FuelRecord {
  id: number;
  vehicleId: number;
  fuelDate: string;
  fuelAmount: any; // Prisma Decimal type
  odometer?: number;
  remark?: string;
  driverType?: string; // 'main', 'backup' หรือ 'other' (คนขับแทน)
  driverName?: string; // ชื่อคนขับที่เติมน้ำมัน
  driverLicense?: string; // หมายเลขใบขับขี่
  vehicle: {
    id: number;
    licensePlate?: string;
    brand: string;
    model?: string;
    vehicleType: string;
    carImage?: string;
    mainDriver?: Driver | null;
    backupDriver?: Driver | null;
  };
  createdAt: string;
  updatedAt: string;
}

export default function FuelRecordsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showSnackbar } = useSnackbar();

  // ฟังก์ชันสำหรับจัดการ URL รูปภาพ
  const getImageUrl = (url: string) => {
    if (!url) return url;
    
    // หาก URL เป็น blob: (preview) ให้ใช้เลย
    if (url.startsWith('blob:')) {
      return url;
    }
    
    // หาก URL เป็น /uploads/... ในโหมด production ให้ใช้ API เลย
    if (url.startsWith('/uploads/')) {
      if (process.env.NODE_ENV === 'production') {
        return `/api/serve-image?path=${encodeURIComponent(url)}`;
      } else {
        return url;
      }
    }
    
    return url;
  };

  // States
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const sortBy = 'fuelDate'; // Fixed sort by fuel date
  const sortOrder = 'desc'; // Fixed sort order descending (newest first)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [vehicleOptions, setVehicleOptions] = useState<Array<{ id: number; licensePlate: string; vehicleType: string }>>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [viewDialog, setViewDialog] = useState<{ open: boolean; record: FuelRecord | null }>({
    open: false,
    record: null
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; recordId: number | null }>({
    open: false,
    recordId: null
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [driverImages, setDriverImages] = useState<Map<string, string>>(new Map());
  // Refs to avoid duplicate initial fetches from multiple effects
  const didInitialFetch = useRef(false);
  const skipSearchEffect = useRef(true);
  

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
    if (!cached || cached === 'loading' || cached === '__none__') return null;
    return cached;
  };

  // Load driver images for fuel records
  const loadDriverImages = async (records: FuelRecord[]) => {
    console.log(`🔄 [LoadImages] Called with ${records.length} records`);
    const uniqueLicenses = new Set<string>();
    
    // Collect all unique driver licenses
    records.forEach(record => {
      // Check driverLicense field from fuel record
      if (record.driverLicense && record.driverLicense.trim()) {
        uniqueLicenses.add(record.driverLicense.trim());
      }
    });

    console.log(`� [LoadImages] Found ${uniqueLicenses.size} unique licenses:`, Array.from(uniqueLicenses));
    console.log(`💾 [LoadImages] Current cache has ${driverImages.size} entries`);

    // Set loading placeholders and load images in background
    const newImages = new Map(driverImages);
    const loadPromises: Promise<void>[] = [];

    uniqueLicenses.forEach(license => {
      if (!newImages.has(license)) {
        console.log(`🆕 [LoadImages] Loading new license: ${license}`);
        newImages.set(license, 'loading'); // Placeholder while loading
        
        const loadPromise = getDriverImageByLicense(license).then(image => {
          console.log(`✅ [LoadImages] Got image for ${license}:`, image ? 'Found' : 'Not found');
          setDriverImages(prev => {
            const updated = new Map(prev);
            if (image) {
              updated.set(license, image);
            } else {
              // Mark as no image to avoid repeated fetches causing flicker
              updated.set(license, '__none__');
            }
            return updated;
          });
        });
        loadPromises.push(loadPromise);
      }
    });

    if (loadPromises.length > 0) {
      console.log(`⚡ [LoadImages] Starting to load ${loadPromises.length} images`);
      setDriverImages(newImages); // Set loading placeholders immediately
      await Promise.all(loadPromises); // Load actual images in background
      console.log(`🏁 [LoadImages] Finished loading all images`);
    } else {
      console.log(`✅ [LoadImages] All images already cached, no loading needed`);
    }
  };

  // Handle opening view dialog with driver image loading
  const handleOpenViewDialog = (record: FuelRecord) => {
    console.log(`🎯 [Modal] Opening view dialog for record ${record.id}`);
    setViewDialog({ open: true, record });
    
    // Collect all driver licenses that need to be loaded for this modal
    const licensesToLoad = new Set<string>();
    
    // Add the main driver license (from fuel record)
    if (record.driverLicense && record.driverLicense.trim()) {
      licensesToLoad.add(record.driverLicense.trim());
    }
    
    // Add vehicle's main driver license
    if (record.vehicle?.mainDriver?.driverLicense && record.vehicle.mainDriver.driverLicense.trim()) {
      licensesToLoad.add(record.vehicle.mainDriver.driverLicense.trim());
    }
    
    // Add vehicle's backup driver license
    if (record.vehicle?.backupDriver?.driverLicense && record.vehicle.backupDriver.driverLicense.trim()) {
      licensesToLoad.add(record.vehicle.backupDriver.driverLicense.trim());
    }
    
    // Load images for all licenses that are not already cached
    const uncachedLicenses = Array.from(licensesToLoad).filter(license => 
      !driverImages.has(license) || driverImages.get(license) === 'loading'
    );
    
    if (uncachedLicenses.length > 0) {
      console.log(`🎯 [Modal] Loading ${uncachedLicenses.length} driver images for modal:`, uncachedLicenses);
      
      // Create temporary records for loading
      const recordsToLoad = uncachedLicenses.map(license => ({
        ...record,
        driverLicense: license
      }));
      
      loadDriverImages(recordsToLoad);
    } else {
      console.log(`✅ [Modal] All modal images already cached`);
    }
  };

  // Fetch fuel records
  const fetchFuelRecords = async (resetLoading = false) => {
    console.log(`📡 [FetchRecords] Called - page: ${page}, limit: ${itemsPerPage}, resetLoading: ${resetLoading}`);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedVehicleId && { vehicleId: selectedVehicleId }),
        ...(selectedMonth && { month: selectedMonth }),
        ...(selectedYear && { year: selectedYear }),
      });

      const response = await fetch(`/api/fuel-records?${params}`);
      const result = await response.json();

      if (response.ok) {
        const records = result.data || [];
        setFuelRecords(records);
        setTotalPages(result.pagination.totalPages);
        setTotalItems(result.pagination.total);
        
        // Load driver images for all records
        if (records.length > 0) {
          console.log(`📸 [FetchRecords] Loading images for ${records.length} fuel records`);
          loadDriverImages(records);
        }
      } else {
        showSnackbar('ไม่สามารถดึงข้อมูลการเติมน้ำมันได้', 'error');
      }
    } catch (err) {
      showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
    } finally {
      if (resetLoading) {
        setLoading(false);
      }
    }
  };

  // Handle view details
  const handleView = (id: number) => {
    const record = fuelRecords.find(r => r.id === id);
    if (record) {
      handleOpenViewDialog(record);
    }
  };

  // Handle delete
  const handleDelete = (id: number) => {
    setDeleteDialog({ open: true, recordId: id });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.recordId || deleteLoading) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/fuel-records/${deleteDialog.recordId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar('ลบข้อมูลการเติมน้ำมันสำเร็จ', 'success');
        fetchFuelRecords();
      } else {
        showSnackbar(result.error || 'ไม่สามารถลบข้อมูลได้', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    } finally {
      setDeleteLoading(false);
      setDeleteDialog({ open: false, recordId: null });
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Fetch vehicle options for filter
  const fetchVehicleOptions = async () => {
    try {
      setLoadingVehicles(true);
      
      // สร้าง query params สำหรับ filter ตามเดือนและปี
      const params = new URLSearchParams();
      if (selectedMonth) params.append('month', selectedMonth);
      if (selectedYear) params.append('year', selectedYear);
      
      const response = await fetch(`/api/vehicles/options?${params}`);
      const data = await response.json();
      
      if (response.ok && data.vehicles) {
        const options = data.vehicles.map((v: any) => ({
          id: v.id,
          licensePlate: v.licensePlate || 'ไม่ระบุ',
          vehicleType: v.vehicleType || ''
        }));
        setVehicleOptions(options);
        
        // Check if currently selected vehicle still exists
        if (selectedVehicleId && !options.some((v: any) => String(v.id) === selectedVehicleId)) {
          setSelectedVehicleId('');
        }
      }
    } catch (error) {
      console.error('Error fetching vehicle options:', error);
    } finally {
      setLoadingVehicles(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedVehicleId('');
    setSelectedMonth('');
    setSelectedYear('');
    setPage(1);
  };

  // Effects
  useEffect(() => {
    // Single initial fetch
    if (!didInitialFetch.current) {
      didInitialFetch.current = true;
      fetchFuelRecords(true);
      fetchVehicleOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search
  useEffect(() => {
    if (skipSearchEffect.current) {
      // Skip the very first run on mount
      skipSearchEffect.current = false;
      return;
    }
    const delayedFetch = setTimeout(() => {
      setPage(1);
      fetchFuelRecords();
    }, 500);

    return () => clearTimeout(delayedFetch);
  }, [searchTerm, itemsPerPage]);

  // Handle filter changes (vehicle, month, year)
  useEffect(() => {
    if (didInitialFetch.current) {
      setPage(1);
      fetchFuelRecords();
    }
  }, [selectedVehicleId, selectedMonth, selectedYear]);

  // Fetch vehicle options when month or year changes
  useEffect(() => {
    if (didInitialFetch.current) {
      fetchVehicleOptions();
    }
  }, [selectedMonth, selectedYear]);

  // Fetch when page changes
  useEffect(() => {
    // Fetch only when navigating beyond first page to avoid duplicate calls
    if (page > 1) {
      fetchFuelRecords();
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
              บันทึกการเติมน้ำมัน
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            href="/fuel-records/add"
            
          >
            เพิ่มการเติมน้ำมัน
          </Button>
        </Box>

        {/* Search & Filters */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            {/* First Row - Search and Main Filters */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { 
                xs: '1fr', 
                sm: '1fr 1fr',
                md: '2fr 1.2fr 0.8fr 0.8fr' 
              },
              gap: 2, 
              mb: 2
            }}>
              <TextField
                placeholder="ค้นหาทะเบียนรถ, ยี่ห้อ, คนขับ, หมายเหตุ..."
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

              <FormControl size="small">
                <InputLabel>ทะเบียนรถ</InputLabel>
                <Select
                  value={selectedVehicleId}
                  label="ทะเบียนรถ"
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  disabled={loadingVehicles}
                >
                  <MenuItem value="">ทั้งหมด</MenuItem>
                  {vehicleOptions.map((vehicle) => (
                    <MenuItem key={vehicle.id} value={String(vehicle.id)}>
                      {vehicle.licensePlate}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

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
                        <MenuItem key={year} value={String(year)}>
                          {year + 543}
                        </MenuItem>
                      );
                    }
                    return years;
                  })()}
                </Select>
              </FormControl>
            </Box>

            {/* Active Filters and Clear Button */}
            {(searchTerm || selectedVehicleId || selectedMonth) && (
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1, 
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2
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
                      label={`เดือน: ${['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][parseInt(selectedMonth) - 1]}`}
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
                  onClick={clearFilters}
                  sx={{ 
                    minWidth: 'auto',
                    px: 3,
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




        {/* Desktop Table / Mobile Cards */}
        {!isMobile ? (
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
                  <TableCell>วันที่เติมน้ำมัน</TableCell>
                  <TableCell>ทะเบียนรถ</TableCell>
                  <TableCell>คนขับ</TableCell>
                  <TableCell align="center">ปริมาณ (ลิตร)</TableCell>
                  <TableCell align="center">เลขไมล์</TableCell>
                  <TableCell align="center">หมายเหตุ</TableCell>
                  <TableCell align="center">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <CircularProgress size={40} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        กำลังโหลดข้อมูล...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : fuelRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <FuelIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                        ไม่มีข้อมูลการเติมน้ำมัน
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        เริ่มต้นบันทึกการเติมน้ำมันของคุณ
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        href="/fuel-records/add"
                        sx={{ mt: 2 }}
                      >
                        เพิ่มการเติมน้ำมัน
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  fuelRecords.map((record) => (
                  <TableRow 
                    key={record.id}
                    sx={{
                      '&:hover': {
                        bgcolor: 'grey.50'
                      },
                      '& .MuiTableCell-root': {
                        borderBottom: '1px solid',
                        borderBottomColor: 'grey.100',
                        py: 2,
                        px: 3
                      }
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formatDate(record.fuelDate)}
                      </Typography>
                    </TableCell>

                                        
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        src={getImageUrl(record.vehicle.carImage || '')}
                        variant="rounded"
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: 'grey.200',
                          border: '1px solid',
                          borderColor: 'grey.300'
                        }}
                      >
                        <CarIcon sx={{ fontSize: 20, color: 'grey.500' }} />
                      </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {record.vehicle.licensePlate || 'ไม่มีทะเบียน'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {record.vehicle.brand} {record.vehicle.model}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          src={(record.driverLicense && getCachedDriverImage(record.driverLicense)) 
                            ? getImageUrl(getCachedDriverImage(record.driverLicense) as string) 
                            : undefined}
                          sx={{ 
                            width: 48, 
                            height: 48, 
                            border: '2px solid',
                            borderColor: 'grey.200',
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
                          <PersonIcon sx={{ fontSize: 20, color: 'grey.500' }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {record.driverName || record.vehicle.mainDriver?.driverName || 'ไม่มีคนขับ'}
                          </Typography>
                          {record.driverType && (
                            <Chip
                              label={record.driverType === 'main' ? 'คนขับหลัก' : 
                                     record.driverType === 'backup' ? 'คนขับรอง' : 
                                     record.driverType === 'other' ? 'คนขับแทน' : 'คนขับรอง'}
                              size="small"
                              variant="outlined"
                              color={record.driverType === 'main' ? 'primary' : 
                                     record.driverType === 'backup' ? 'secondary' : 
                                     record.driverType === 'other' ? 'success' : 'default'}
                              sx={{ 
                                height: 20, 
                                fontSize: '0.7rem',
                                mt: 0.5,
                                '& .MuiChip-label': { 
                                  px: 1,
                                  py: 0
                                }
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {parseFloat(record.fuelAmount.toString()).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Typography variant="body2">
                        {record.odometer ? `${record.odometer.toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.` : '-'}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {record.remark || '-'}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <IconButton
                          onClick={() => handleView(record.id)}
                          sx={{
                            color: 'info.main',
                            bgcolor: 'info.50',
                            '&:hover': {
                              bgcolor: 'info.100',
                              transform: 'scale(1.1)'
                            },
                            transition: 'all 0.2s ease',
                            width: 36,
                            height: 36
                          }}
                          size="small"
                        >
                          <VisibilityIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton
                          onClick={() => window.location.href = `/fuel-records/edit/${record.id}`}
                          sx={{
                            color: 'primary.main',
                            bgcolor: 'primary.50',
                            '&:hover': {
                              bgcolor: 'primary.100',
                              transform: 'scale(1.1)'
                            },
                            transition: 'all 0.2s ease',
                            width: 36,
                            height: 36
                          }}
                          size="small"
                        >
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDelete(record.id)}
                          sx={{
                            color: 'error.main',
                            bgcolor: 'error.50',
                            '&:hover': {
                              bgcolor: 'error.100',
                              transform: 'scale(1.1)'
                            },
                            transition: 'all 0.2s ease',
                            width: 36,
                            height: 36
                          }}
                          size="small"
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
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
          /* Mobile Cards */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loading ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <CircularProgress size={40} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  กำลังโหลดข้อมูล...
                </Typography>
              </Paper>
            ) : fuelRecords.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <FuelIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                  ไม่มีข้อมูลการเติมน้ำมัน
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                  เริ่มต้นบันทึกการเติมน้ำมันของคุณ
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  href="/fuel-records/add"
                  fullWidth
                >
                  เพิ่มการเติมน้ำมัน
                </Button>
              </Paper>
            ) : (
              fuelRecords.map((record) => (
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
                  {/* Header with Date and Actions */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    mb: 2
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FuelIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {formatDate(record.fuelDate)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        onClick={() => handleView(record.id)}
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
                        onClick={() => window.location.href = `/fuel-records/edit/${record.id}`}
                        size="small"
                        sx={{
                          color: 'primary.main',
                          bgcolor: 'primary.50',
                          '&:hover': { bgcolor: 'primary.100' }
                        }}
                      >
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDelete(record.id)}
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

                  {/* Vehicle Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar
                      src={getImageUrl(record.vehicle.carImage || '')}
                      variant="rounded"
                      sx={{
                        width: 60,
                        height: 45,
                        bgcolor: 'grey.200',
                        border: '1px solid',
                        borderColor: 'grey.300'
                      }}
                    >
                      <CarIcon sx={{ fontSize: 24, color: 'grey.500' }} />
                    </Avatar>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {record.vehicle.licensePlate || 'ไม่มีทะเบียน'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {record.vehicle.brand} {record.vehicle.model}
                      </Typography>
                    </Box>

                    <Avatar
                      src={(record.driverLicense && getCachedDriverImage(record.driverLicense)) 
                        ? getImageUrl(getCachedDriverImage(record.driverLicense) as string) 
                        : undefined}
                      sx={{ 
                        width: 40, 
                        height: 40, 
                        bgcolor: 'primary.main',
                        border: record.driverName ? '2px solid' : '1px solid',
                        borderColor: record.driverName ? 'primary.main' : 'grey.300',
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
                      <PersonIcon sx={{ fontSize: 18, color: 'white' }} />
                    </Avatar>
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
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {parseFloat(record.fuelAmount.toString()).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลิตร
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        เลขไมล์
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {record.odometer ? `${record.odometer.toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.` : '-'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Remark */}
                  {record.remark && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        หมายเหตุ
                      </Typography>
                      <Typography variant="body2">
                        {record.remark}
                      </Typography>
                    </Box>
                  )}

                  {/* Driver Info */}
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.100' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      คนขับ
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        src={(record.driverLicense && getCachedDriverImage(record.driverLicense)) 
                          ? getImageUrl(getCachedDriverImage(record.driverLicense) as string) 
                          : undefined}
                        sx={{ 
                          width: 42, 
                          height: 42, 
                          bgcolor: 'primary.main',
                          fontSize: '0.75rem',
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
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {record.driverName || record.vehicle.mainDriver?.driverName || 'ไม่มีคนขับ'}
                        </Typography>
                        {record.driverType && (
                          <Chip
                            label={record.driverType === 'main' ? 'คนขับหลัก' : 
                                   record.driverType === 'backup' ? 'คนขับรอง' : 
                                   record.driverType === 'other' ? 'คนขับแทน' : 'คนขับรอง'}
                            size="small"
                            variant="outlined"
                            color={record.driverType === 'main' ? 'primary' : 
                                   record.driverType === 'backup' ? 'secondary' : 
                                   record.driverType === 'other' ? 'success' : 'default'}
                            sx={{ 
                              height: 20, 
                              fontSize: '0.7rem',
                              mt: 0.5,
                              '& .MuiChip-label': { 
                                px: 1,
                                py: 0
                              }
                            }}
                          />
                        )}
                      </Box>
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

        {/* View Details Modal */}
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
            pb: 1,
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <FuelIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                รายละเอียดการเติมน้ำมัน
              </Typography>
              {viewDialog.record && (
                <Typography variant="body2" color="text.secondary">
                  {formatDate(viewDialog.record.fuelDate)}
                </Typography>
              )}
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ p: 3 }}>
            {viewDialog.record && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Vehicle Information */}
                <Paper sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 , mt:3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                    🚗 ข้อมูลรถ
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' },
                    gap: 3
                  }}>
                    {/* Vehicle Images */}
                    <Box sx={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2
                    }}>
                      <Avatar
                        src={getImageUrl(viewDialog.record.vehicle.carImage || '')}
                        variant="rounded"
                        sx={{
                          width: 120,
                          height: 90,
                          bgcolor: 'grey.200',
                          border: '2px solid',
                          borderColor: 'grey.300'
                        }}
                        onError={(e) => {
                          console.error('❌ Fuel record car image load error:', viewDialog.record?.vehicle.carImage);
                        }}
                        onLoad={() => {
                          console.log('✅ Fuel record car image loaded successfully:', viewDialog.record?.vehicle.carImage);
                        }}
                      >
                        <CarIcon sx={{ fontSize: 40, color: 'grey.500' }} />
                      </Avatar>
                      
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            คนขับหลัก
                          </Typography>
                          <Avatar
                            src={(() => {
                              const license = viewDialog.record.vehicle.mainDriver?.driverLicense;
                              if (!license) return undefined;
                              const cachedImage = getCachedDriverImage(license);
                              const imageUrl = cachedImage ? getImageUrl(cachedImage) : undefined;
                              if (process.env.NODE_ENV === 'development') {
                                console.log(`🖼️ [Modal-Main] Driver ${license} - cached: ${cachedImage}, url: ${imageUrl}`);
                              }
                              return imageUrl;
                            })()}
                            onError={(e) => {
                              if (process.env.NODE_ENV === 'development') {
                                console.error(`❌ [Modal-Main] Image load error for license ${viewDialog.record?.vehicle.mainDriver?.driverLicense}:`, e);
                              }
                            }}
                            sx={{
                              width: 60,
                              height: 60,
                              bgcolor: 'grey.200',
                              border: '1px solid',
                              borderColor: 'grey.300',
                              ...(viewDialog.record.vehicle.mainDriver?.driverLicense && 
                                  driverImages.get(viewDialog.record.vehicle.mainDriver.driverLicense) === 'loading' && {
                                animation: 'pulse 1.5s infinite'
                              }),
                              '@keyframes pulse': {
                                '0%': { opacity: 1 },
                                '50%': { opacity: 0.7 },
                                '100%': { opacity: 1 }
                              }
                            }}
                          >
                            <PersonIcon sx={{ fontSize: 24, color: 'grey.500' }} />
                          </Avatar>
                        </Box>

                        {viewDialog.record.vehicle.backupDriver && (
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              คนขับรอง
                            </Typography>
                            <Avatar
                              src={(() => {
                                const license = viewDialog.record.vehicle.backupDriver?.driverLicense;
                                if (!license) return undefined;
                                const cachedImage = getCachedDriverImage(license);
                                const imageUrl = cachedImage ? getImageUrl(cachedImage) : undefined;
                                if (process.env.NODE_ENV === 'development') {
                                  console.log(`🖼️ [Modal-Backup] Driver ${license} - cached: ${cachedImage}, url: ${imageUrl}`);
                                }
                                return imageUrl;
                              })()}
                              onError={(e) => {
                                if (process.env.NODE_ENV === 'development') {
                                  console.error(`❌ [Modal-Backup] Image load error for license ${viewDialog.record?.vehicle.backupDriver?.driverLicense}:`, e);
                                }
                              }}
                              sx={{
                                width: 60,
                                height: 60,
                                bgcolor: 'grey.200',
                                border: '1px solid',
                                borderColor: 'grey.300',
                                ...(viewDialog.record.vehicle.backupDriver?.driverLicense && 
                                    driverImages.get(viewDialog.record.vehicle.backupDriver.driverLicense) === 'loading' && {
                                  animation: 'pulse 1.5s infinite'
                                }),
                                '@keyframes pulse': {
                                  '0%': { opacity: 1 },
                                  '50%': { opacity: 0.7 },
                                  '100%': { opacity: 1 }
                                }
                              }}
                            >
                              <PersonIcon sx={{ fontSize: 24, color: 'grey.500' }} />
                            </Avatar>
                          </Box>
                        )}

                        {/* Show Alternative Driver Image if driverType is 'other' */}
                        {viewDialog.record.driverType === 'other' && viewDialog.record.driverName && (
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              คนขับแทน
                            </Typography>
                            <Avatar
                              src={(() => {
                                const license = viewDialog.record.driverLicense;
                                if (!license) return undefined;
                                const cachedImage = getCachedDriverImage(license);
                                const imageUrl = cachedImage ? getImageUrl(cachedImage) : undefined;
                                if (process.env.NODE_ENV === 'development') {
                                  console.log(`🖼️ [Modal-Alternative] Driver ${license} - cached: ${cachedImage}, url: ${imageUrl}`);
                                }
                                return imageUrl;
                              })()}
                              onError={(e) => {
                                if (process.env.NODE_ENV === 'development') {
                                  console.error(`❌ [Modal-Alternative] Image load error for license ${viewDialog.record?.driverLicense}:`, e);
                                }
                              }}
                              sx={{
                                width: 60,
                                height: 60,
                                bgcolor: 'grey.200',
                                border: '2px solid',
                                borderColor: 'grey.300',
                                ...(viewDialog.record.driverLicense && 
                                    driverImages.get(viewDialog.record.driverLicense) === 'loading' && {
                                  animation: 'pulse 1.5s infinite'
                                }),
                                '@keyframes pulse': {
                                  '0%': { opacity: 1 },
                                  '50%': { opacity: 0.7 },
                                  '100%': { opacity: 1 }
                                }
                              }}
                            >
                              <PersonIcon sx={{ fontSize: 24, color: 'white' }} />
                            </Avatar>
                            
                          </Box>
                        )}
                      </Box>
                    </Box>
                    
                    {/* Vehicle Details */}
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
                      gap: 2
                    }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          ทะเบียนรถ
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                          {viewDialog.record.vehicle.licensePlate || 'ไม่มีทะเบียน'}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          ยี่ห้อ/รุ่น
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {viewDialog.record.vehicle.brand} {viewDialog.record.vehicle.model || ''}
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
                      
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          คนขับหลัก
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {viewDialog.record.vehicle.mainDriver?.driverName || 'ไม่มีคนขับ'}
                        </Typography>
                      </Box>

                      {viewDialog.record.vehicle.backupDriver && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            คนขับรอง
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {viewDialog.record.vehicle.backupDriver.driverName}
                          </Typography>
                        </Box>
                      )}

                      {/* Show Alternative Driver if driverType is 'other' */}
                      {viewDialog.record.driverType === 'other' && viewDialog.record.driverName && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            คนขับแทน
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {viewDialog.record.driverName}
                            </Typography>
                            
                          </Box>
                          
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Paper>

                {/* Fuel Information */}
                <Paper sx={{ p: 3, bgcolor: 'primary.50', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                    ⛽ ข้อมูลการเติมน้ำมัน
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, 
                    gap: 2
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        วันที่เติม
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {formatDate(viewDialog.record.fuelDate)}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ปริมาณน้ำมัน
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {parseFloat(viewDialog.record.fuelAmount.toString()).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลิตร
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        เลขไมล์
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {viewDialog.record.odometer ? `${viewDialog.record.odometer.toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.` : '-'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Driver Information at fuel time */}
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      คนขับ ณ ตอนนั้น
                    </Typography>
                    {(() => {
                      const driverImage = viewDialog.record.driverType === 'main'
                        ? viewDialog.record.vehicle.mainDriver?.driverImage
                        : viewDialog.record.driverType === 'backup'
                          ? viewDialog.record.vehicle.backupDriver?.driverImage
                          : viewDialog.record.vehicle.mainDriver?.driverImage;
                      const driverName = viewDialog.record.driverName
                        || (viewDialog.record.driverType === 'main'
                              ? viewDialog.record.vehicle.mainDriver?.driverName
                              : viewDialog.record.driverType === 'backup'
                                ? viewDialog.record.vehicle.backupDriver?.driverName
                                : viewDialog.record.vehicle.mainDriver?.driverName);
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            src={(() => {
                              if (!viewDialog.record.driverLicense) {
                                if (process.env.NODE_ENV === 'development') {
                                  console.log(`⚠️ [Modal] No driverLicense for record ${viewDialog.record.id}`);
                                }
                                return undefined;
                              }
                              const cachedImage = getCachedDriverImage(viewDialog.record.driverLicense);
                              const imageUrl = cachedImage ? getImageUrl(cachedImage) : undefined;
                              if (process.env.NODE_ENV === 'development') {
                                console.log(`🖼️ [Modal] Driver ${viewDialog.record.driverLicense} - cached: ${cachedImage}, url: ${imageUrl}`);
                              }
                              return imageUrl;
                            })()}
                            onError={(e) => {
                              if (process.env.NODE_ENV === 'development') {
                                console.error(`❌ [Modal] Image load error for license ${viewDialog.record?.driverLicense}:`, e);
                              }
                            }}
                            onLoad={() => {
                              if (process.env.NODE_ENV === 'development') {
                                console.log(`✅ [Modal] Image loaded successfully for license ${viewDialog.record?.driverLicense}`);
                              }
                            }}
                            sx={{ 
                              width: 42, 
                              height: 42,
                              bgcolor: 'success.main',
                              border: '2px solid',
                              borderColor: 'success.main',
                              ...(viewDialog.record.driverLicense && 
                                  driverImages.get(viewDialog.record.driverLicense) === 'loading' && {
                                animation: 'pulse 1.5s infinite'
                              }),
                              '@keyframes pulse': {
                                '0%': { opacity: 1 },
                                '50%': { opacity: 0.7 },
                                '100%': { opacity: 1 }
                              }
                            }}
                          >
                            <PersonIcon sx={{ fontSize: 18, color: 'white' }} />
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.main' }}>
                              {driverName || 'ไม่มีข้อมูลคนขับ'}
                            </Typography>
                            {viewDialog.record.driverType && (
                              <Chip
                                label={viewDialog.record.driverType === 'main' ? 'คนขับหลัก' : 
                                       viewDialog.record.driverType === 'backup' ? 'คนขับรอง' : 
                                       viewDialog.record.driverType === 'other' ? 'คนขับแทน' : 'คนขับรอง'}
                                size="small"
                                variant="filled"
                                color={viewDialog.record.driverType === 'main' ? 'primary' : 
                                       viewDialog.record.driverType === 'backup' ? 'secondary' : 
                                       viewDialog.record.driverType === 'other' ? 'success' : 'default'}
                                sx={{ 
                                  height: 22, 
                                  fontSize: '0.7rem',
                                  mt: 0.5,
                                  '& .MuiChip-label': { 
                                    px: 1.5,
                                    py: 0,
                                    color: 'white',
                                    fontWeight: 500
                                  }
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      );
                    })()}
                  </Box>
                  
                  {viewDialog.record.remark && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.200' }}>
                      <Typography variant="caption" color="text.secondary">
                        หมายเหตุ
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {viewDialog.record.remark}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 0 }}>
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
              <>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => {
                    const recordId = viewDialog.record?.id;
                    setViewDialog(prev => ({ ...prev, open: false }));
                    setTimeout(() => {
                      setViewDialog({ open: false, record: null });
                      if (recordId) {
                        window.location.href = `/fuel-records/edit/${recordId}`;
                      }
                    }, 300);
                  }}
                >
                  แก้ไข
                </Button>

              </>
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
              คุณแน่ใจหรือไม่ที่จะลบข้อมูลการเติมน้ำมันนี้ ?
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
              onClick={confirmDelete} 
              color="error" 
              variant="contained"
              startIcon={deleteLoading ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
              fullWidth={isMobile}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'กำลังลบ...' : 'ลบ'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}

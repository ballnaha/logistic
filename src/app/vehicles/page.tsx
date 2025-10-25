'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from '../../contexts/SnackbarContext';

import ColorChip from '../../components/ColorChip';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Avatar,
  Divider,
  Skeleton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  DirectionsCar as CarIcon,
  LocalShipping as TruckIcon,
  TwoWheeler as MotorcycleIcon,
  PrecisionManufacturing as ForkliftIcon,
  DriveEta as PickupIcon,
  Construction as ConstructionIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import VehicleMobileCard from '../components/VehicleMobileCard';
import DataTablePagination from '../../components/DataTablePagination';

interface Vehicle {
  id: number;
  licensePlate?: string;
  brand: string;
  model: string;
  color?: string;
  vehicleType: string;
  weight?: number;
  isActive: boolean;
  // คนขับ (ใหม่ - ใช้ relationships)
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
  // รูปภาพ
  carImage?: string;
  fuelConsume?: number;
  fuelTank?: number;
  fuelConsumeMth?: number;
  remark?: string;
  owner: {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}


function VehiclesPageContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleUsageInfo, setVehicleUsageInfo] = useState<Map<number, {
    isInUse: boolean;
    canDelete: boolean;
    tripRecordsCount: number;
    fuelRecordsCount: number;
  }>>(new Map());

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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');
  const [licensePlateFilter, setLicensePlateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // active, inactive, all
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableVehicleTypes, setAvailableVehicleTypes] = useState<string[]>([]);
  const [availableLicensePlates, setAvailableLicensePlates] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<Array<{id: string, label: string, value: string}>>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [isMobileView, setIsMobileView] = useState(false);
  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Check for mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  const [deleteDialog, setDeleteDialog] = useState<{ 
    open: boolean; 
    vehicleId: number | null;
    vehicle?: Vehicle | null;
  }>({
    open: false,
    vehicleId: null,
    vehicle: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState<number | null>(null);

  // ดึงข้อมูลรถ (Optimized with loading states and error handling)
  const fetchVehicles = async (
    page = pagination.page,
    limit = pagination.limit,
    search = searchTerm
  ) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: statusFilter,
        ...(search && { search }),
        ...(brandFilter && { brand: brandFilter }),
        ...(vehicleTypeFilter && { vehicleType: vehicleTypeFilter }),
        ...(licensePlateFilter && { licensePlate: licensePlateFilter }),
      });
      
      console.log('Fetching vehicles with params:', Object.fromEntries(params)); // Debug log

      // Optimized fetch with proper error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 วินาที timeout

      const response = await fetch(`/api/vehicles?${params}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setVehicles(result.data);
        setPagination(result.pagination);
        
        // ดึงข้อมูลการใช้งานรถแต่ละคัน
        if (result.data && result.data.length > 0) {
          fetchVehicleUsageInfo(result.data);
        }
      } else {
        showSnackbar('ไม่สามารถดึงข้อมูลรถได้', 'error');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        showSnackbar('การเชื่อมต่อหมดเวลา กรุณาลองใหม่', 'error');
      } else {
        showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลการใช้งานรถ (เช็คว่าถูกใช้ใน trip records หรือ fuel records หรือยัง)
  const fetchVehicleUsageInfo = async (vehicleList: Vehicle[]) => {
    try {
      const usageInfoPromises = vehicleList.map(async (vehicle) => {
        try {
          const response = await fetch(`/api/vehicles/${vehicle.id}/check-usage`);
          if (response.ok) {
            const result = await response.json();
            return {
              vehicleId: vehicle.id,
              data: result.data,
            };
          }
        } catch (error) {
          console.error(`Error fetching usage info for vehicle ${vehicle.id}:`, error);
        }
        // Fallback - ถือว่าใช้งานแล้วเพื่อความปลอดภัย
        return {
          vehicleId: vehicle.id,
          data: {
            isInUse: true,
            canDelete: false,
            tripRecordsCount: 0,
            fuelRecordsCount: 0,
          },
        };
      });

      const usageResults = await Promise.allSettled(usageInfoPromises);
      const newUsageInfo = new Map();

      usageResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { vehicleId, data } = result.value;
          newUsageInfo.set(vehicleId, {
            isInUse: data.isInUse,
            canDelete: data.canDelete,
            tripRecordsCount: data.tripRecordsCount,
            fuelRecordsCount: data.fuelRecordsCount,
          });
        }
      });

      setVehicleUsageInfo(newUsageInfo);
    } catch (error) {
      console.error('Error fetching vehicle usage info:', error);
    }
  };

  // Fetch vehicle options (brands, types) - Optimized with timeout
  const fetchVehicleOptions = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 วินาที timeout

      const response = await fetch('/api/vehicles/options', {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Vehicle options response:', result); // Debug log
        if (result.success) {
          setAvailableBrands(result.data.brands);
          setAvailableVehicleTypes(result.data.vehicleTypes);
          setAvailableLicensePlates(result.data.licensePlates || []);
          console.log('License plates loaded:', result.data.licensePlates); // Debug log
        }
      }
    } catch (error) {
      console.error('Error fetching vehicle options:', error);
      // ไม่แสดง error message เพราะไม่เป็นข้อมูลสำคัญ
    }
  };

  // Update active filters
  const updateActiveFilters = () => {
    const filters = [];
    if (searchTerm) filters.push({ id: 'search', label: `ค้นหา: "${searchTerm}"`, value: searchTerm });
    if (brandFilter) filters.push({ id: 'brand', label: `ยี่ห้อ: ${brandFilter}`, value: brandFilter });
    if (vehicleTypeFilter) filters.push({ id: 'type', label: `ประเภท: ${vehicleTypeFilter}`, value: vehicleTypeFilter });
    if (licensePlateFilter) filters.push({ id: 'licensePlate', label: `ทะเบียน: ${licensePlateFilter}`, value: licensePlateFilter });
    setActiveFilters(filters);
  };

  // Remove specific filter
  const removeFilter = (filterId: string) => {
    switch (filterId) {
      case 'search':
        setSearchTerm('');
        break;
      case 'brand':
        setBrandFilter('');
        break;
      case 'type':
        setVehicleTypeFilter('');
        break;
      case 'licensePlate':
        setLicensePlateFilter('');
        break;
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setBrandFilter('');
    setVehicleTypeFilter('');
    setLicensePlateFilter('');
    setStatusFilter('active');
  };

  // Initial load - Optimized parallel loading
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Load main data and options in parallel with aggressive timeout
        const [vehicleResult, optionsResult] = await Promise.allSettled([
          Promise.race([
            fetchVehicles(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]),
          Promise.race([
            fetchVehicleOptions(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ])
        ]);

        if (vehicleResult.status === 'rejected') {
          showSnackbar('การโหลดข้อมูลรถใช้เวลานานผิดปกติ', 'warning');
        }
        if (optionsResult.status === 'rejected') {
          console.warn('Failed to load options, continuing without filters');
        }
      } catch (error) {
        showSnackbar('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };
    
    loadInitialData();
  }, []);

  // Update active filters when any filter changes
  useEffect(() => {
    updateActiveFilters();
  }, [searchTerm, brandFilter, vehicleTypeFilter, licensePlateFilter, statusFilter]);

  // Handle search and filter changes with debounce for search
  useEffect(() => {
    // Skip initial load - let the initial useEffect handle the first load
    if (!initialLoad) {
      if (searchTerm) {
        // Debounce search
        const delayedFetch = setTimeout(() => {
          fetchVehicles(1, pagination.limit, searchTerm);
        }, 300);
        return () => clearTimeout(delayedFetch);
      } else {
        // No debounce for filter changes or clearing search
        fetchVehicles(1, pagination.limit, searchTerm);
      }
    }
  }, [searchTerm, brandFilter, vehicleTypeFilter, licensePlateFilter, statusFilter, pagination.limit]);

  // Handle pagination
  const handlePageChange = (event: unknown, newPage: number) => {
    fetchVehicles(newPage + 1);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    fetchVehicles(1, newLimit);
  };

  const handleToggleStatus = (vehicle: Vehicle) => {
    setDeleteDialog({ open: true, vehicleId: vehicle.id, vehicle });
  };

  const handleToggleActiveStatus = async (vehicle: Vehicle) => {
    try {
      setTogglingStatus(vehicle.id);
      const response = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle-status',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar(result.message, 'success');
        fetchVehicles(); // Reload data
      } else {
        showSnackbar(result.error || 'ไม่สามารถเปลี่ยนสถานะได้', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', 'error');
    } finally {
      setTogglingStatus(null);
    }
  };

  const handleDeleteVehicle = (vehicle: Vehicle, isHardDelete: boolean = false) => {
    setDeleteDialog({ 
      open: true, 
      vehicleId: vehicle.id, 
      vehicle: { ...vehicle, isHardDelete } as any 
    });
  };

  const handleViewDetails = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setDetailsModal(false);
    setTimeout(() => {
      setSelectedVehicle(null);
    }, 300);
  };

  const confirmToggleStatus = async () => {
    if (!deleteDialog.vehicleId || !deleteDialog.vehicle || deleteLoading) return;

    const vehicle = deleteDialog.vehicle;
    const isHardDelete = (vehicle as any).isHardDelete;
    const isCurrentlyActive = vehicle.isActive;
    
    let method = 'PATCH'; // default for reactivate
    let action = 'เปิดใช้งาน';
    let url = `/api/vehicles/${deleteDialog.vehicleId}`;

    if (isHardDelete) {
      method = 'DELETE';
      action = 'ลบ';
      url = `/api/vehicles/${deleteDialog.vehicleId}?force=true`;
    } else if (isCurrentlyActive) {
      method = 'DELETE';
      action = 'ยกเลิกใช้งาน';
    }

    setDeleteLoading(true);
    try {
      const response = await fetch(url, { method });
      const result = await response.json();

      if (result.success) {
        showSnackbar(result.message || `${action}รถเรียบร้อยแล้ว`, 'success');
        
        // รีเฟรชข้อมูลเฉพาะเมื่อไม่ใช่ hard delete หรือเป็น hard delete ที่สำเร็จ
        if (!isHardDelete || result.type === 'hard_delete') {
          fetchVehicles();
        } else {
          // กรณี soft delete เพราะมีการใช้งาน - รีเฟรชข้อมูลการใช้งาน
          fetchVehicles();
        }
      } else {
        showSnackbar(result.error || `ไม่สามารถ${action}รถได้`, 'error');
      }
    } catch (err) {
      showSnackbar(`เกิดข้อผิดพลาดในการ${action}`, 'error');
    } finally {
      setDeleteLoading(false);
      setDeleteDialog({ open: false, vehicleId: null, vehicle: null });
    }
  };



  const getVehicleIcon = (type: string) => {
    // ใช้ emoji แทน MUI icons เพื่อให้แสดงผลชัดเจนกว่า
    switch (type) {
      case 'ForkLift':
        return (
          <Typography sx={{ fontSize: 32, lineHeight: 1 }}>
            <img src="/images/icon-forklift.png" alt="Forklift" width={32} height={32} />
          </Typography>
        );
      case 'Pickup':
        return (
          <Typography sx={{ fontSize: 32, lineHeight: 1 }}>
            <img src="/images/icon-pickup.png" alt="PickUp" width={32} height={32} />
          </Typography>
        );
      case 'Truck':
        return (
          <Typography sx={{ fontSize: 32, lineHeight: 1 }}>
            <img src="/images/icon-truck.png" alt="Truck" width={32} height={32} />
          </Typography>
        );
      default:
        // สำหรับกรณีอื่นๆ
        const lowerType = type.toLowerCase();
        
        // Forklift 
        if (lowerType.includes('forklift') || lowerType.includes('ForkLift') || 
            lowerType.includes('รถยก') || lowerType.includes('รถโฟล์คลิฟท์')) {
          return <Typography sx={{ fontSize: 24, lineHeight: 1 }}>
            <img src="/images/icon-forklift.png" alt="Forklift" width={32} height={32} />
          </Typography>;
        }
        
        // Pickup truck 
        if (lowerType.includes('pickup') || lowerType.includes('กระบะ') || 
            lowerType.includes('รถกระบะ')) {
          return <Typography sx={{ fontSize: 24, lineHeight: 1 }}>
            <img src="/images/icon-pickup.png" alt="PickUp" width={32} height={32} />
            </Typography>;
        }
        
        // Motorcycle 
        if (lowerType.includes('มอเตอร์ไซค์') || lowerType.includes('จักรยานยนต์') || 
            lowerType.includes('motorcycle')) {
          return <Typography sx={{ fontSize: 24, lineHeight: 1 }}>🏍️</Typography>;
        }
        
        // Truck 
        if (lowerType.includes('บรรทุก') || lowerType.includes('พ่วง') || 
            lowerType.includes('truck')) {
          return <Typography sx={{ fontSize: 24, lineHeight: 1 }}>
            <img src="/images/icon-truck.png" alt="Truck" width={32} height={32} />
          </Typography>;
        }
        
        // Construction vehicles
        if (lowerType.includes('construction') || lowerType.includes('ก่อสร้าง')) {
          return <Typography sx={{ fontSize: 24, lineHeight: 1 }}>🚧</Typography>;
        }
        
        // Default car 
        return <Typography sx={{ fontSize: 24, lineHeight: 1 }}>
          <img src="/images/icon-car.png" alt="Truck" width={32} height={32} />
        </Typography>;
    }
  };


  return (
    <Layout showSidebar={false}>
      <Box>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'center', sm: 'center' }, 
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 }
        }}>
          <Typography 
            variant={isMobileView ? 'h5' : 'h5'} 
            sx={{ fontWeight: 600 }}
          >
            จัดการข้อมูลรถ
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, width: { xs: 'auto', sm: 'auto' } }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/vehicles/add')}
              fullWidth={isMobileView}
              sx={{
                background: `linear-gradient(135deg, #2196f3 0%, #1976d2 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, #1976d2 0%, #1565c0 100%)`,
                },
              }}
            >
              เพิ่มรถใหม่
            </Button>
          </Box>
        </Box>


        {/* Filters */}
         <Paper sx={{ p: 3, mb: 3 }}>
           {/* Search and Dropdowns */}
           <Box sx={{ 
             display: 'grid', 
             gridTemplateColumns: { 
               xs: '1fr', 
               sm: 'repeat(2, 1fr)',
               md: '2fr repeat(4, 1fr) auto'
             },
             gap: 2, 
             mb: 3,
             alignItems: 'center'
           }}>
             <TextField
               placeholder="ค้นหา..."
               value={searchTerm}
               size="small"
               onChange={(e) => setSearchTerm(e.target.value)}
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
                       sx={{ color: 'text.secondary' }}
                     >
                       ✕
                     </IconButton>
                   </InputAdornment>
                 ),
               }}
             />
             
             <FormControl size="small">
               <InputLabel size="small">ทะเบียนรถ</InputLabel>
               <Select
                 value={licensePlateFilter}
                 label="ทะเบียนรถ"
                 onChange={(e) => {
                   console.log('License plate filter changed to:', e.target.value); // Debug log
                   setLicensePlateFilter(e.target.value);
                 }}
                 size="small"
               >
                 <MenuItem value="">ทั้งหมด</MenuItem>
                 {availableLicensePlates.length === 0 ? (
                   <MenuItem disabled>ไม่มีทะเบียนรถ</MenuItem>
                 ) : (
                   availableLicensePlates.map((licensePlate) => (
                     <MenuItem key={licensePlate} value={licensePlate}>
                       {licensePlate}
                     </MenuItem>
                   ))
                 )}
               </Select>
             </FormControl>
             
             <FormControl size="small">
               <InputLabel size="small">ยี่ห้อรถ</InputLabel>
               <Select
                 value={brandFilter}
                 label="ยี่ห้อรถ"
                 onChange={(e) => setBrandFilter(e.target.value)}
                 size="small"
               >
                 <MenuItem value="">ทั้งหมด</MenuItem>
                 {availableBrands.map((brand) => (
                   <MenuItem key={brand} value={brand}>
                     {brand}
                   </MenuItem>
                 ))}
               </Select>
             </FormControl>

             <FormControl size="small">
               <InputLabel size="small">ประเภทรถ</InputLabel>
               <Select
                 value={vehicleTypeFilter}
                 label="ประเภทรถ"
                 size="small"
                 onChange={(e) => setVehicleTypeFilter(e.target.value)}
               >
                 <MenuItem value="">ทั้งหมด</MenuItem>
                 {availableVehicleTypes.map((type) => (
                   <MenuItem key={type} value={type}>
                     {type}
                   </MenuItem>
                 ))}
               </Select>
             </FormControl>

             <FormControl size="small">
               <InputLabel size="small">สถานะ</InputLabel>
               <Select
                 value={statusFilter}
                 label="สถานะ"
                 size="small"
                 onChange={(e) => setStatusFilter(e.target.value)}
               >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                 <MenuItem value="active">ใช้งาน</MenuItem>
                 <MenuItem value="inactive">ยกเลิกการใช้งาน</MenuItem>
                 
               </Select>
             </FormControl>

             <Button
               variant="outlined"
               size="small"
               onClick={clearAllFilters}
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

           {/* Active Filters Chips */}
           {activeFilters.length > 0 && (
             <Box>
               <Box sx={{ 
                 display: 'flex', 
                 alignItems: 'center', 
                 gap: 1,
                 mb: 2,
                 pb: 2,
                 borderTop: '1px solid',
                 borderColor: 'grey.200',
                 pt: 2
               }}>
                 <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                   ตัวกรองที่ใช้:
                 </Typography>
                 <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flex: 1 }}>
                   {activeFilters.map((filter) => (
                     <Chip
                       key={filter.id}
                       label={filter.label}
                       onDelete={() => removeFilter(filter.id)}
                       variant="outlined"
                       size="small"
                       sx={{
                         borderColor: 'primary.main',
                         color: 'primary.main',
                         '& .MuiChip-deleteIcon': {
                           color: 'primary.main',
                           '&:hover': {
                             color: 'primary.dark'
                           }
                         }
                       }}
                     />
                   ))}
                 </Box>
                 <Button
                   size="small"
                   onClick={clearAllFilters}
                   sx={{ 
                     color: 'text.secondary',
                     minWidth: 'auto',
                     '&:hover': { color: 'error.main' }
                   }}
                 >
                   ล้างทั้งหมด
                 </Button>
               </Box>
             </Box>
           )}
         </Paper>



         {/* Responsive Content */}
        {isMobileView ? (
          /* Mobile Card View */
          <Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : vehicles.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  ไม่พบข้อมูลรถ
                </Typography>
              </Paper>
            ) : (
              vehicles.map((vehicle) => (
                <VehicleMobileCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onView={() => handleViewDetails(vehicle)}
                  onEdit={() => router.push(`/vehicles/edit/${vehicle.id}`)}
                  onToggleStatus={handleToggleStatus}
                  onToggleActiveStatus={handleToggleActiveStatus}
                  onDelete={(v) => handleDeleteVehicle(v, true)}
                  canDelete={vehicleUsageInfo.get(vehicle.id)?.canDelete ?? false}
                  togglingStatus={togglingStatus}
                  usageInfo={vehicleUsageInfo.get(vehicle.id)}
                />
              ))
            )}
          </Box>
        ) : (
          /* Desktop Table View */
          <Paper sx={{ 
            borderRadius: 3,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }}>
            <TableContainer>
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
                  <TableCell>รถยนต์</TableCell>
                  <TableCell>คนขับหลัก</TableCell>
                  <TableCell>คนขับรอง</TableCell>
                  <TableCell>อัตราใช้น้ำมัน</TableCell>
                  <TableCell>สี</TableCell>                 
                  <TableCell>สถานะ</TableCell>
                  <TableCell align="center">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  // Skeleton loading rows
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      {/* รถยนต์ */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Skeleton variant="rounded" width={56} height={56} />
                          <Box>
                            <Skeleton width={120} height={24} />
                            <Skeleton width={100} height={20} />
                            <Skeleton width={80} height={16} />
                          </Box>
                        </Box>
                      </TableCell>
                      {/* คนขับหลัก */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Skeleton variant="circular" width={48} height={48} />
                          <Box>
                            <Skeleton width={100} height={20} />
                            <Skeleton width={80} height={16} />
                          </Box>
                        </Box>
                      </TableCell>
                      {/* คนขับรอง */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Skeleton variant="circular" width={48} height={48} />
                          <Box>
                            <Skeleton width={80} height={20} />
                            <Skeleton width={70} height={16} />
                          </Box>
                        </Box>
                      </TableCell>
                      {/* อัตราใช้น้ำมัน */}
                      <TableCell align="left">
                        <Skeleton width={90} height={20} />
                      </TableCell>
                      {/* สี */}
                      <TableCell align="center">
                        <Skeleton variant="rounded" width={40} height={20} />
                      </TableCell>
                      {/* สถานะ */}
                      <TableCell>
                        <Skeleton variant="rounded" width={80} height={24} />
                      </TableCell>
                      {/* จัดการ */}
                      <TableCell align="left">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'left' }}>
                          <Skeleton variant="circular" width={36} height={36} />
                          <Skeleton variant="circular" width={36} height={36} />
                          <Skeleton variant="circular" width={36} height={36} />
                          <Skeleton variant="circular" width={36} height={36} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : vehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                        ไม่พบข้อมูลรถ
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        ยังไม่มีข้อมูลรถในระบบ
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicles.map((vehicle, index) => (
                    <TableRow 
                      key={vehicle.id}
                      sx={{ 
                        '&:hover': { 
                          bgcolor: 'grey.50',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        },
                        transition: 'all 0.2s ease',
                        '& .MuiTableCell-root': {
                          borderBottom: index === vehicles.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.06)',
                          py: 3,
                          px: 3
                        }
                      }}
                    >
                      {/* รถยนต์ */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {vehicle.carImage ? (
                            <Avatar
                              src={getImageUrl(vehicle.carImage)}
                              sx={{ 
                                width: 56, 
                                height: 56, 
                                borderRadius: 2,
                                border: '2px solid',
                                borderColor: 'grey.200'
                              }}
                              variant="rounded"
                              imgProps={{
                                loading: 'lazy',
                                style: { objectFit: 'cover' }
                              }}
                              onError={(e) => {
                                console.error('❌ Car image load error:', vehicle.carImage);
                                // หาก fallback API ยังล้มเหลว ใน development mode ลอง static file
                                if (vehicle.carImage && vehicle.carImage.includes('api/serve-image') && process.env.NODE_ENV === 'development') {
                                  console.log('🔄 Fallback API failed, trying static file for:', vehicle.carImage);
                                  const urlParams = new URLSearchParams(vehicle.carImage.split('?')[1]);
                                  const originalPath = urlParams.get('path');
                                  if (originalPath) {
                                    const target = e.target as HTMLImageElement;
                                    if (target) {
                                      target.src = originalPath;
                                    }
                                  }
                                }
                              }}
                              onLoad={() => {
                                console.log('✅ Car image loaded successfully:', vehicle.carImage);
                              }}
                            />
                          ) : (
                            <Box sx={{ 
                              width: 56, 
                              height: 56, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              bgcolor: 'grey.100',
                              borderRadius: 2,
                              border: '2px dashed',
                              borderColor: 'grey.300'
                            }}>
                              {getVehicleIcon(vehicle.vehicleType)}
                            </Box>
                          )}
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                              {vehicle.licensePlate}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: 'grey.700' }}>
                              {vehicle.brand} {vehicle.model}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {vehicle.vehicleType}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* คนขับ */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {vehicle.mainDriver?.driverImage ? (
                            <Avatar
                              src={getImageUrl(vehicle.mainDriver.driverImage)}
                              sx={{ 
                                width: 48, 
                                height: 48,
                                border: '2px solid',
                                borderColor: 'grey.200'
                              }}
                              imgProps={{
                                loading: 'lazy',
                                style: { objectFit: 'cover' }
                              }}
                              onError={(e) => {
                                console.error('❌ Driver image load error:', vehicle.mainDriver?.driverImage);
                              }}
                              onLoad={() => {
                                console.log('✅ Driver image loaded successfully:', vehicle.mainDriver?.driverImage);
                              }}
                            />
                          ) : (
                            <Avatar sx={{ 
                              width: 48, 
                              height: 48, 
                              bgcolor: 'grey.300',
                              color: 'grey.600',
                              fontSize: '1.2rem'
                            }}>
                              👤
                            </Avatar>
                          )}
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {vehicle.mainDriver?.driverName || '-'}
                            </Typography>
                            {vehicle.mainDriver?.driverLicense && (
                              <Typography variant="caption" color="text.secondary">
                                ใบขับขี่: {vehicle.mainDriver.driverLicense}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>

                      {/* คนขับรอง */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {vehicle.backupDriver?.driverImage ? (
                            <Avatar
                              src={getImageUrl(vehicle.backupDriver.driverImage)}
                              sx={{ 
                                width: 48, 
                                height: 48,
                                border: '2px solid',
                                borderColor: 'grey.200'
                              }}
                              imgProps={{
                                loading: 'lazy',
                                style: { objectFit: 'cover' }
                              }}
                              onError={(e) => {
                                console.error('❌ Backup driver image load error:', vehicle.backupDriver?.driverImage);
                              }}
                              onLoad={() => {
                                console.log('✅ Backup driver image loaded successfully:', vehicle.backupDriver?.driverImage);
                              }}
                            />
                          ) : vehicle.backupDriver?.driverName ? (
                            <Avatar sx={{ 
                              width: 48, 
                              height: 48, 
                              bgcolor: 'grey.200',
                              color: 'grey.600',
                              fontSize: '1rem'
                            }}>
                              👤
                            </Avatar>
                          ) : (
                            <Box sx={{ 
                              width: 48, 
                              height: 48, 
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '2px dashed',
                              borderColor: 'grey.300',
                              borderRadius: '50%',
                              color: 'grey.400'
                            }}>
                              -
                            </Box>
                          )}
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {vehicle.backupDriver?.driverName || 'ไม่มี'}
                            </Typography>
                            {vehicle.backupDriver?.driverLicense && (
                              <Typography variant="caption" color="text.secondary">
                                ใบขับขี่: {vehicle.backupDriver.driverLicense}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>

                      {/* อัตราใช้น้ำมัน */}
                      <TableCell align="left">
                        {vehicle.fuelConsume ? (
                          <Typography sx={{ fontWeight: 500 }}>
                            {vehicle.fuelConsume} กม./ลิตร
                          </Typography>
                        ) : (
                          <Typography color="text.secondary">-</Typography>
                        )}
                      </TableCell>

                      {/* สี */}
                      <TableCell align="center">
                        <ColorChip color={vehicle.color || ''} size="medium" />
                      </TableCell>

                      {/* สถานะ */}
                      <TableCell>

                        <Chip
                            icon={vehicle.isActive ? <ActiveIcon /> : <InactiveIcon />}
                            label={vehicle.isActive ? 'ใช้งาน' : 'ยกเลิกการใช้งาน'}
                            color={vehicle.isActive ? 'success' : 'default'}
                            size="small"
                            variant="outlined"
                        />
                      </TableCell>

                      {/* จัดการ */}
                      <TableCell align="left">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'left' }}>
                          <IconButton
                            onClick={() => handleViewDetails(vehicle)}
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
                            onClick={() => router.push(`/vehicles/edit/${vehicle.id}`)}
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
                          
                          {/* isActive Toggle Button */}
                          <Tooltip title={vehicle.isActive ? 'ยกเลิกการใช้งาน' : 'เปิดใช้งาน'} arrow>
                            <IconButton
                              disabled={togglingStatus === vehicle.id}
                              onClick={() => handleToggleActiveStatus(vehicle)}
                              sx={{
                                color: vehicle.isActive ? 'warning.main' : 'success.main',
                                bgcolor: vehicle.isActive ? 'warning.50' : 'success.50',
                                '&:hover': {
                                  bgcolor: vehicle.isActive ? 'warning.100' : 'success.100',
                                  transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease',
                                width: 36,
                                height: 36
                              }}
                              size="small"
                            >
                              {togglingStatus === vehicle.id ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : vehicle.isActive ? (
                                <ToggleOffIcon sx={{ fontSize: 18 }} />
                              ) : (
                                <ToggleOnIcon sx={{ fontSize: 18 }} />
                              )}
                            </IconButton>
                          </Tooltip>
                          
                          {/* แสดง delete button เฉพาะรถที่ยังไม่ถูกใช้งาน */}
                          {(() => {
                            const usageInfo = vehicleUsageInfo.get(vehicle.id);
                            const canDelete = usageInfo?.canDelete ?? false;
                            const isInUse = usageInfo?.isInUse ?? false;
                            
                            // แสดงเฉพาะปุ่มลบจริง (Hard Delete) สำหรับรถที่ยังไม่ถูกใช้งาน
                            if (canDelete && !isInUse) {
                              return (
                                <Tooltip title="ลบรถถาวร (ลบข้อมูลและรูปภาพทั้งหมด)" arrow>
                                  <IconButton
                                    onClick={() => handleDeleteVehicle(vehicle, true)}
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
                                </Tooltip>
                              );
                            }
                            
                            // สำหรับรถที่ใช้งานแล้ว ให้ใช้ toggle button แทน
                            return null;
                          })()}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {!loading && vehicles.length > 0 && (
            <DataTablePagination
              component="div"
              count={pagination.total}
              page={pagination.page - 1}
              onPageChange={handlePageChange}
              rowsPerPage={pagination.limit}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[20, 50, 100, 200]}
              labelRowsPerPage="รายการต่อหน้า:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
              }
            />
          )}
          </Paper>
        )}

        {/* Pagination for Mobile */}
        {isMobileView && !loading && vehicles.length > 0 && (
          <Paper sx={{ borderRadius: 3, mt: 2, overflow: 'hidden' }}>
            <DataTablePagination
              component="div"
              count={pagination.total}
              page={pagination.page - 1}
              onPageChange={handlePageChange}
              rowsPerPage={pagination.limit}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[20, 50, 100, 200]}
              labelRowsPerPage="รายการต่อหน้า:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
              }
            />
          </Paper>
        )}



        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, vehicleId: null })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {(() => {
              const vehicle = deleteDialog.vehicle;
              if (!vehicle) return '';
              
              const isHardDelete = (vehicle as any).isHardDelete;
              if (isHardDelete) {
                return 'ลบรถถาวร';
              } else if (vehicle.isActive) {
                return 'ยกเลิกใช้งานรถ';
              } else {
                return 'เปิดใช้งานรถ';
              }
            })()}
          </DialogTitle>
          <DialogContent>
            <Typography>
              {(() => {
                const vehicle = deleteDialog.vehicle;
                if (!vehicle) return '';
                
                const isHardDelete = (vehicle as any).isHardDelete;
                const usageInfo = vehicleUsageInfo.get(vehicle.id);
                
                if (isHardDelete) {
                  return 'คุณต้องการลบรถคันนี้ถาวรหรือไม่? ข้อมูลและรูปภาพทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้';
                } else if (vehicle.isActive) {
                  let message = 'คุณต้องการยกเลิกใช้งานรถคันนี้หรือไม่? ข้อมูลและรูปภาพจะถูกเก็บไว้เป็นประวัติ';
                  if (usageInfo?.isInUse) {
                    message += ` (พบการใช้งาน ${usageInfo.tripRecordsCount} เที่ยวรถ และ ${usageInfo.fuelRecordsCount} รายการน้ำมัน)`;
                  }
                  return message;
                } else {
                  return 'คุณต้องการเปิดใช้งานรถคันนี้หรือไม่?';
                }
              })()}
            </Typography>
            {deleteDialog.vehicle && (
              <Box sx={{ 
                mt: 2, 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.200'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {deleteDialog.vehicle.licensePlate} - {deleteDialog.vehicle.brand} {deleteDialog.vehicle.model}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  คนขับ: {deleteDialog.vehicle?.mainDriver?.driverName || '-'}
                </Typography>
                
                {/* แสดงข้อมูลการใช้งานถ้ามี */}
                {(() => {
                  const usageInfo = vehicleUsageInfo.get(deleteDialog.vehicle!.id);
                  if (usageInfo?.isInUse) {
                    return (
                      <Typography variant="body2" color="warning.main" sx={{ mt: 1, fontWeight: 500 }}>
                        ⚠️ รถคันนี้มีการใช้งานแล้ว: {usageInfo.tripRecordsCount} เที่ยวรถ, {usageInfo.fuelRecordsCount} รายการน้ำมัน
                      </Typography>
                    );
                  }
                  return null;
                })()}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialog({ open: false, vehicleId: null, vehicle: null })}
              disabled={deleteLoading}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={confirmToggleStatus}
              color={(() => {
                const vehicle = deleteDialog.vehicle;
                const isHardDelete = vehicle && (vehicle as any).isHardDelete;
                if (isHardDelete) return 'error';
                return vehicle?.isActive ? 'error' : 'success';
              })()}
              variant="contained"
              startIcon={deleteLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (() => {
                const vehicle = deleteDialog.vehicle;
                const isHardDelete = vehicle && (vehicle as any).isHardDelete;
                if (isHardDelete) {
                  return <DeleteIcon />;
                } else if (vehicle?.isActive) {
                  return <DeleteIcon />;
                } else {
                  return <CheckCircleIcon />;
                }
              })()}
              disabled={deleteLoading}
            >
              {(() => {
                const vehicle = deleteDialog.vehicle;
                const isHardDelete = vehicle && (vehicle as any).isHardDelete;
                if (deleteLoading) {
                  if (isHardDelete) {
                    return 'กำลังลบ...';
                  } else if (vehicle?.isActive) {
                    return 'กำลังยกเลิก...';
                  } else {
                    return 'กำลังเปิดใช้งาน...';
                  }
                } else {
                  if (isHardDelete) {
                    return 'ลบถาวร';
                  } else if (vehicle?.isActive) {
                    return 'ยกเลิกใช้งาน';
                  } else {
                    return 'เปิดใช้งาน';
                  }
                }
              })()}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Vehicle Details Modal */}
        <Dialog
          open={detailsModal}
          onClose={handleCloseDetails}
          maxWidth="md"
          fullWidth
          fullScreen={isMobileView}
          PaperProps={{
            sx: {
              borderRadius: isMobileView ? 0 : 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              ...(isMobileView && {
                margin: 0,
                maxHeight: '100vh',
                height: '100vh'
              })
            }
          }}
        >
                     <DialogTitle sx={{
             background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
             color: 'white',
             display: 'flex',
             alignItems: 'center',
             gap: 2,
             py: 3
           }}>
             <VisibilityIcon />
             <Box component="span" sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
               ข้อมูลรถยนต์
             </Box>
           </DialogTitle>
          
          <DialogContent sx={{ p: 0 }}>
            {selectedVehicle && (
              <Box sx={{ p: 3 }}>
                {/* Header Card with Vehicle Overview */}
                <Box sx={{ 
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'grey.200',
                  borderRadius: 2,
                  p: 3,
                  mb: 3,
                  color: 'text.primary',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    right: 0, 
                    opacity: 0.2,
                    fontSize: '8rem',
                    lineHeight: 1,
                    color: 'grey.400'
                  }}>
                    {selectedVehicle.vehicleType === 'ForkLift' ?  (
                          <img src="/images/icon-forklift.png" alt="Forklift" width={150} height={150} />) :
                     selectedVehicle.vehicleType === 'Pickup' ? (<img src="/images/icon-pickup.png" alt="PickUp" width={150} height={150} />) :
                     selectedVehicle.vehicleType === 'Truck' ? (<img src="/images/icon-truck.png" alt="Truck" width={150} height={150} />) :
                     (<img src="/images/icon-car.png" alt="Car" width={150} height={150} />)}
                  </Box>
                  
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                      {selectedVehicle.licensePlate}
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2 }}>
                      {selectedVehicle.brand} {selectedVehicle.model}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Chip 
                        label={selectedVehicle.vehicleType} 
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          borderColor: 'primary.main',
                          color: 'primary.main',
                          fontWeight: 600
                        }} 
                      />
                      {selectedVehicle.color && (
                        <ColorChip color={selectedVehicle.color} size="small" />
                      )}
                      {selectedVehicle.mainDriver?.driverName && (
                        <Chip 
                          label={`คนขับ: ${selectedVehicle.mainDriver.driverName}`}
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            borderColor: 'grey.400',
                            color: 'text.secondary',
                            fontWeight: 500
                          }} 
                        />
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Images Section */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, 
                  gap: 2, 
                  mb: 3 
                }}>
                  {/* Car Image */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                      🚗 รูปรถ
                    </Typography>
                    {selectedVehicle.carImage ? (
                      <Box
                        component="img"
                        src={getImageUrl(selectedVehicle.carImage)}
                        alt="รูปรถ"
                        sx={{
                          width: '100%',
                          height: 'auto',
                          objectFit: 'contain',
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: 'grey.200'
                        }}
                      />
                    ) : (
                      <Box sx={{
                        width: '100%',
                        height: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'grey.50',
                        borderRadius: 1.5,
                        border: '1px dashed',
                        borderColor: 'grey.300'
                      }}>
                        {selectedVehicle.vehicleType === 'ForkLift' ? (
                          <img src="/images/icon-forklift.png" alt="Forklift" width={32} height={32} />
                        ) : selectedVehicle.vehicleType === 'Pickup' ? (
                          <img src="/images/icon-pickup.png" alt="PickUp" width={32} height={32} />
                        ) : selectedVehicle.vehicleType === 'Truck' ? (
                          <img src="/images/icon-truck.png" alt="Truck" width={32} height={32} />
                        ) : (
                          <img src="/images/icon-car.png" alt="Car" width={32} height={32} />
                        )}
                      </Box>
                    )}
                  </Box>

                  {/* Main Driver */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                      👤 คนขับหลัก
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Avatar
                        src={getImageUrl(selectedVehicle.mainDriver?.driverImage || '')}
                        sx={{ 
                          width: 150, 
                          height: 150,
                          mb: 1,
                          border: '2px solid',
                          borderColor: 'primary.light'
                        }}
                        onError={(e) => {
                          console.error('❌ Selected driver image load error:', selectedVehicle.mainDriver?.driverImage);
                        }}
                        onLoad={() => {
                          console.log('✅ Selected driver image loaded successfully:', selectedVehicle.mainDriver?.driverImage);
                        }}
                      >
                        {selectedVehicle.mainDriver?.driverName ? 
                          selectedVehicle.mainDriver.driverName.charAt(0).toUpperCase() : '👤'
                        }
                      </Avatar>
                      <Typography variant="caption" sx={{ textAlign: 'center', fontWeight: 500 , fontSize: '0.85rem'}}>
                        {selectedVehicle.mainDriver?.driverName || '-'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Backup Driver */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                      👥 คนขับรอง
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Avatar
                        src={getImageUrl(selectedVehicle.backupDriver?.driverImage || '')}
                        sx={{ 
                          width: 150, 
                          height: 150,
                          mb: 1,
                          border: '2px solid',
                          borderColor: 'secondary.light'
                        }}
                        onError={(e) => {
                          console.error('❌ Selected backup driver image load error:', selectedVehicle.backupDriver?.driverImage);
                        }}
                        onLoad={() => {
                          console.log('✅ Selected backup driver image loaded successfully:', selectedVehicle.backupDriver?.driverImage);
                        }}
                      >
                        {selectedVehicle.backupDriver?.driverName ? 
                          selectedVehicle.backupDriver.driverName.charAt(0).toUpperCase() : '👤'
                        }
                      </Avatar>
                      <Typography variant="caption" sx={{ textAlign: 'center', fontWeight: 500 , fontSize: '0.85rem'}}>
                        {selectedVehicle.backupDriver?.driverName || 'ไม่มี'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Information Cards */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2
                }}>
                  {/* Basic Vehicle Info Card */}
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'grey.100'
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ 
                      fontWeight: 600, 
                      mb: 2, 
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      🚗 ข้อมูลรถ
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">ทะเบียน</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedVehicle.licensePlate}
                        </Typography>
                      </Box>
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">ยี่ห้อ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedVehicle.brand}
                        </Typography>
                      </Box>
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">รุ่น</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedVehicle.model || '-'}
                        </Typography>
                      </Box>
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">ประเภท</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedVehicle.vehicleType}
                        </Typography>
                      </Box>
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">สี</Typography>
                        <ColorChip color={selectedVehicle.color || ''} size="small" />
                      </Box>
                    </Box>
                  </Paper>

                  {/* Technical Specifications Card */}
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'grey.100'
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ 
                      fontWeight: 600, 
                      mb: 2, 
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      🔧 ข้อมูลเทคนิค
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">น้ำหนัก</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedVehicle.weight ? `${selectedVehicle.weight} กก.` : '-'}
                        </Typography>
                      </Box>
                      <Divider />

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">ถังน้ำมัน</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedVehicle.fuelTank ? `${selectedVehicle.fuelTank} ลิตร` : '-'}
                        </Typography>
                      </Box>
                      <Divider />

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">อัตราใช้น้ำมัน</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedVehicle.fuelConsume ? `${selectedVehicle.fuelConsume} กม./ลิตร` : '-'}
                        </Typography>
                      </Box>
                      <Divider />

                      
                    </Box>
                  </Paper>
                </Box>

                {/* Driver Information Cards */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                  mt: 2
                }}>
                  {/* Main Driver Card */}
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'grey.100'
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ 
                      fontWeight: 600, 
                      mb: 2, 
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      👤 คนขับหลัก
                    </Typography>
                    {selectedVehicle.mainDriver?.driverName || selectedVehicle.mainDriver?.driverLicense ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {selectedVehicle.mainDriver?.driverName && (
                          <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">ชื่อ</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {selectedVehicle.mainDriver.driverName}
                              </Typography>
                            </Box>
                            <Divider />
                          </>
                        )}
                        {selectedVehicle.mainDriver?.driverLicense && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">ใบขับขี่</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {selectedVehicle.mainDriver.driverLicense}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        ไม่มีข้อมูลคนขับหลัก
                      </Typography>
                    )}
                  </Paper>

                  {/* Backup Driver Card */}
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'grey.100'
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ 
                      fontWeight: 600, 
                      mb: 2, 
                      color: 'secondary.main',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      👥 คนขับรอง
                    </Typography>
                    {selectedVehicle.backupDriver?.driverName || selectedVehicle.backupDriver?.driverLicense ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {selectedVehicle.backupDriver?.driverName && (
                          <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">ชื่อ</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {selectedVehicle.backupDriver.driverName}
                              </Typography>
                            </Box>
                            <Divider />
                          </>
                        )}
                        {selectedVehicle.backupDriver?.driverLicense && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">ใบขับขี่</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {selectedVehicle.backupDriver.driverLicense}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        ไม่มีคนขับรอง
                      </Typography>
                    )}
                  </Paper>
                </Box>

                {/* Remarks Card */}
                {selectedVehicle.remark && (
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'grey.100',
                      mt: 2
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ 
                      fontWeight: 600, 
                      mb: 2, 
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      📝 หมายเหตุ
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      lineHeight: 1.6,
                      color: 'text.secondary'
                    }}>
                      {selectedVehicle.remark}
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button onClick={handleCloseDetails} variant="outlined">
              ปิด
            </Button>
            <Button
              onClick={() => {
                const vehicleId = selectedVehicle?.id;
                setDetailsModal(false);
                setTimeout(() => {
                  setSelectedVehicle(null);
                  if (vehicleId) {
                    router.push(`/vehicles/edit/${vehicleId}`);
                  }
                }, 300);
              }}
              variant="contained"
              startIcon={<EditIcon />}
              sx={{
                background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                },
              }}
            >
              แก้ไข
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}

export default function VehiclesPage() {
  return <VehiclesPageContent />;
}

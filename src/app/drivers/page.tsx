'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from '../../contexts/SnackbarContext';

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
  Card,
  CardContent,
  CardActions,
  CardMedia,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  DriveEta as DriveIcon,
  Badge as BadgeIcon,
  Image as ImageIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Phone as PhoneIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import DataTablePagination from '../../components/DataTablePagination';

interface Driver {
  id: number;
  driverName: string;
  driverLicense: string;
  driverImage?: string;
  phone?: string;
  remark?: string;
  isActive: boolean;
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

function DriversPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // active, inactive, all
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // State สำหรับ Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'view'>('add');
  const [submitting, setSubmitting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState<number | null>(null);
  const [driverUsageInfo, setDriverUsageInfo] = useState<Map<number, {
    isInUse: boolean;
    canDelete: boolean;
    vehicleCount: number;
    tripRecordsCount: number;
    fuelRecordsCount: number;
    substituteCount: number;
    usageDetails: string;
  }>>(new Map());
  const [loadingUsageInfo, setLoadingUsageInfo] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ 
    open: boolean; 
    driverId: number | null;
    driver?: Driver | null;
  }>({
    open: false,
    driverId: null,
    driver: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [licenseValidation, setLicenseValidation] = useState<{
    isChecking: boolean;
    isDuplicate: boolean;
    message: string;
  }>({
    isChecking: false,
    isDuplicate: false,
    message: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    driverName: '',
    driverLicense: '',
    phone: '',
    remark: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [deleteImageDialogOpen, setDeleteImageDialogOpen] = useState(false);
  const [deleteImageLoading, setDeleteImageLoading] = useState(false);
  
  // State for driver's vehicles
  const [driverVehicles, setDriverVehicles] = useState<{
    mainDriver: Array<{ id: number; licensePlate: string; brand: string; model: string }>;
    backupDriver: Array<{ id: number; licensePlate: string; brand: string; model: string }>;
    substituteDriver: Array<{ id: number; licensePlate: string; brand: string; model: string }>;
  }>({ mainDriver: [], backupDriver: [], substituteDriver: [] });
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // ฟังก์ชันสำหรับจัดการ URL รูปภาพ
  const getImageUrl = (url: string) => {
    if (!url) return url;
    
    if (url.startsWith('blob:')) {
      return url;
    }
    
    if (url.startsWith('/uploads/')) {
      if (process.env.NODE_ENV === 'production') {
        return `/api/serve-image?path=${encodeURIComponent(url)}`;
      } else {
        return url;
      }
    }
    
    return url;
  };

  // โหลดข้อมูลคนขับ - Optimized like vehicles page
  const fetchDrivers = async (
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
      });
      
      console.log('Fetching drivers with params:', Object.fromEntries(params)); // Debug log

      // Optimized fetch with proper error handling and timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 วินาที timeout

      const response = await fetch(`/api/drivers?${params}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);

      console.log('Response status:', response.status); // Debug log
      console.log('Response headers:', Object.fromEntries(response.headers)); // Debug log

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('API Error Response:', errorData); // Debug log
        
        if (response.status === 401) {
          showSnackbar('กรุณาเข้าสู่ระบบใหม่', 'error');
          router.push('/login');
          return;
        } else if (response.status === 408) {
          showSnackbar('การตรวจสอบสิทธิ์หมดเวลา กรุณาลองใหม่', 'error');
        } else if (response.status === 504) {
          showSnackbar('การเชื่อมต่อฐานข้อมูลหมดเวลา กรุณาลองใหม่', 'error');
        } else {
          showSnackbar(errorData?.message || `เกิดข้อผิดพลาด: ${response.status}`, 'error');
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response data:', data); // Debug log

      if (data.drivers) {
        setDrivers(data.drivers);
        setPagination(data.pagination);
        
        // Load usage info and wait for it to complete before showing UI
        if (data.drivers.length > 0) {
          await fetchDriverUsageInfo(data.drivers).catch(error => {
            console.warn('Failed to fetch driver usage info:', error);
          });
        }
      } else {
        showSnackbar('ไม่สามารถดึงข้อมูลคนขับได้', 'error');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        showSnackbar('การเชื่อมต่อหมดเวลา กรุณาลองใหม่', 'error');
      } else {
        console.error('Error fetching drivers:', error);
        showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return; // รอ session โหลด
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (status === 'authenticated') {
      // Use debounced fetch for search terms
      if (searchTerm) {
        const delayedFetch = setTimeout(() => {
          fetchDrivers(1, pagination.limit, searchTerm);
        }, 300);
        return () => clearTimeout(delayedFetch);
      } else {
        // No debounce for filter changes or clearing search
        fetchDrivers(1, pagination.limit, searchTerm);
      }
    }
  }, [searchTerm, statusFilter, pagination.limit, status]);

  // Separate useEffect for pagination changes (no debounce needed)
  useEffect(() => {
    if (status === 'authenticated' && pagination.page > 1) {
      fetchDrivers(pagination.page, pagination.limit, searchTerm);
    }
  }, [pagination.page]);

  // Reset pagination when search term changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [searchTerm]);

  // Handle status filter
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // ตรวจสอบเลขใบขับขี่ซ้ำ
  const checkLicenseDuplicate = async (license: string, excludeId?: number) => {
    if (!license.trim()) {
      setLicenseValidation({
        isChecking: false,
        isDuplicate: false,
        message: '',
      });
      return false;
    }

    setLicenseValidation(prev => ({ ...prev, isChecking: true }));

    try {
      const params = new URLSearchParams({ 
        search: license,
        limit: '5'
      });

      const response = await fetch(`/api/drivers?${params}`);
      if (!response.ok) {
        throw new Error('Failed to check license');
      }

      const data = await response.json();
      
      if (data.drivers) {
        // หาคนขับที่มีเลขใบขับขี่เหมือนกัน (ไม่รวมตัวเอง)
        const duplicate = data.drivers.find((driver: Driver) => 
          driver.driverLicense === license && 
          driver.id !== excludeId
        );

        const isDuplicate = !!duplicate;
        setLicenseValidation({
          isChecking: false,
          isDuplicate,
          message: isDuplicate ? 'เลขใบขับขี่นี้มีอยู่แล้วในระบบ' : '',
        });

        return isDuplicate;
      }
    } catch (error) {
      console.error('Error checking license duplicate:', error);
      setLicenseValidation({
        isChecking: false,
        isDuplicate: false,
        message: 'ไม่สามารถตรวจสอบเลขใบขับขี่ได้',
      });
    }

    return false;
  };

  // อัพโหลดรูปภาพและลบรูปเดิม
  const uploadDriverImage = async (driverId: number, oldImagePath?: string) => {
    if (!imageFile) return null;

    const formData = new FormData();
    formData.append('driverImage', imageFile);
    formData.append('driverId', driverId.toString());
    if (oldImagePath) {
      formData.append('oldImagePath', oldImagePath);
    }

    const response = await fetch('/api/drivers/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const result = await response.json();
    return result.data.imagePath;
  };

  // Delete driver image
  const deleteDriverImage = async (driverId: number, imagePath: string) => {
    const response = await fetch('/api/drivers/delete-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        driverId,
        imagePath,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete image');
    }

    return response.json();
  };

  // Handle delete avatar with confirmation
  const handleDeleteAvatar = () => {
    setDeleteImageDialogOpen(true);
  };

  const confirmDeleteAvatar = async () => {
    if (!editingDriver?.driverImage) return;

    setDeleteImageLoading(true);

    try {
      await deleteDriverImage(editingDriver.id, editingDriver.driverImage!);
      
      // Update the editing driver state
      setEditingDriver(prev => prev ? { ...prev, driverImage: undefined } : null);
      
      // Clear image preview
      setImagePreview('');
      
      // Close dialog
      setDeleteImageDialogOpen(false);
      
      // Refresh drivers list
      await fetchDrivers();
      
      showSnackbar('ลบรูปภาพสำเร็จ', 'success');
    } catch (error) {
      console.error('Error deleting image:', error);
      showSnackbar('เกิดข้อผิดพลาดในการลบรูปภาพ', 'error');
      setDeleteImageDialogOpen(false);
    } finally {
      setDeleteImageLoading(false);
    }
  };

  // Handle pagination
  const handlePageChange = (event: unknown, newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage + 1 }));
  };

  const handleLimitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  // Dialog handlers
  const handleAddDriver = () => {
    setEditingDriver(null);
    setDialogMode('add');
    setFormData({
      driverName: '',
      driverLicense: '',
      phone: '',
      remark: '',
    });
    setImageFile(null);
    setImagePreview('');
    setLicenseValidation({
      isChecking: false,
      isDuplicate: false,
      message: '',
    });
    setDialogOpen(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setDialogMode('edit');
    setFormData({
      driverName: driver.driverName,
      driverLicense: driver.driverLicense,
      phone: driver.phone || '',
      remark: driver.remark || '',
    });
    setImageFile(null);
    setImagePreview(driver.driverImage ? getImageUrl(driver.driverImage) : '');
    setLicenseValidation({
      isChecking: false,
      isDuplicate: false,
      message: '',
    });
    setDialogOpen(true);
  };

  const handleViewDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setDialogMode('view');
    setFormData({
      driverName: driver.driverName,
      driverLicense: driver.driverLicense,
      phone: driver.phone || '',
      remark: driver.remark || '',
    });
    setImagePreview(driver.driverImage ? getImageUrl(driver.driverImage) : '');
    setDialogOpen(true);
    
    // Fetch vehicles that this driver drives
    fetchDriverVehicles(driver.id);
  };

  // Fetch vehicles for a driver
  const fetchDriverVehicles = async (driverId: number) => {
    try {
      setLoadingVehicles(true);
      const response = await fetch(`/api/drivers/${driverId}/vehicles`);
      
      if (response.ok) {
        const data = await response.json();
        setDriverVehicles({
          mainDriver: data.mainDriver || [],
          backupDriver: data.backupDriver || [],
          substituteDriver: data.substituteDriver || [],
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch driver vehicles:', response.status, errorData);
        setDriverVehicles({ mainDriver: [], backupDriver: [], substituteDriver: [] });
      }
    } catch (error) {
      console.error('Error fetching driver vehicles:', error);
      setDriverVehicles({ mainDriver: [], backupDriver: [], substituteDriver: [] });
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDriver(null);
    setImageFile(null);
    setImagePreview('');
    setDriverVehicles({ mainDriver: [], backupDriver: [], substituteDriver: [] });
    setLicenseValidation({
      isChecking: false,
      isDuplicate: false,
      message: '',
    });
  };

  // Image upload handler
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  // Submit form
  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Validate form
      if (!formData.driverName || !formData.driverLicense) {
        showSnackbar('กรุณากรอกชื่อคนขับและเลขใบขับขี่', 'error');
        return;
      }

      // ตรวจสอบเลขใบขับขี่ซ้ำก่อนส่งข้อมูล
      const isDuplicate = await checkLicenseDuplicate(
        formData.driverLicense, 
        editingDriver?.id
      );
      
      if (isDuplicate) {
        showSnackbar('เลขใบขับขี่นี้มีอยู่แล้วในระบบ', 'error');
        return;
      }

      // เตรียมข้อมูลสำหรับส่ง
      const dataToSend = {
        driverName: formData.driverName,
        driverLicense: formData.driverLicense,
        phone: formData.phone,
        remark: formData.remark,
        ...(dialogMode === 'edit' && { id: editingDriver?.id }),
      };

      const url = dialogMode === 'add' 
        ? '/api/drivers' 
        : `/api/drivers`;
      
      const method = dialogMode === 'add' ? 'POST' : 'PUT';

      // บันทึกข้อมูลพื้นฐานก่อน
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save driver');
      }

      const result = await response.json();
      const driverId = result.data.id;

      // หากมีการเปลี่ยนรูปภาพ ให้อัพโหลดรูปใหม่
      if (imageFile) {
        try {
          const oldImagePath = dialogMode === 'edit' ? editingDriver?.driverImage : undefined;
          const newImagePath = await uploadDriverImage(driverId, oldImagePath);
          
          if (newImagePath) {
            console.log('Image uploaded successfully:', newImagePath);
          }
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
          // แม้อัพโหลดรูปล้มเหลว แต่ข้อมูลหลักบันทึกสำเร็จแล้ว
          showSnackbar('บันทึกข้อมูลสำเร็จ แต่ไม่สามารถอัพโหลดรูปภาพได้', 'warning');
        }
      }
      
      showSnackbar(
        result.message || (dialogMode === 'add' ? 'เพิ่มข้อมูลคนขับสำเร็จ' : 'แก้ไขข้อมูลคนขับสำเร็จ'),
        'success'
      );
      
      handleCloseDialog();
      fetchDrivers(); // Reload current page
    } catch (error) {
      console.error('Error saving driver:', error);
      showSnackbar(
        error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete driver
  const handleDeleteDriver = async (driver: Driver) => {
    // Always open confirmation dialog
    // Usage validation will happen in confirmDeleteDriver
    setDeleteDialog({ 
      open: true, 
      driverId: driver.id, 
      driver: driver 
    });
  };

  // Confirm delete driver
  const confirmDeleteDriver = async () => {
    if (!deleteDialog.driverId || !deleteDialog.driver || deleteLoading) return;

    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/drivers/${deleteDialog.driverId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        // แสดง error message ที่ได้จาก API
        throw new Error(result.error || 'ไม่สามารถลบข้อมูลคนขับได้');
      }

      showSnackbar(result.message || 'ลบข้อมูลคนขับสำเร็จ', 'success');
      setDeleteDialog({ open: false, driverId: null, driver: null });
      fetchDrivers(); // Reload current page
    } catch (error) {
      console.error('Error deleting driver:', error);
      showSnackbar(
        error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบข้อมูล',
        'error'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteDialog({ open: false, driverId: null, driver: null });
  };

  // Toggle driver status
  const handleToggleStatus = async (driver: Driver) => {
    try {
      setTogglingStatus(driver.id);
      const response = await fetch(`/api/drivers/${driver.id}`, {
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
        fetchDrivers(); // Reload data
      } else {
        showSnackbar(result.error || 'ไม่สามารถเปลี่ยนสถานะได้', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', 'error');
    } finally {
      setTogglingStatus(null);
    }
  };

  // Fetch driver usage information - Wait for completion
  const fetchDriverUsageInfo = async (driversToCheck?: Driver[]) => {
    try {
      setLoadingUsageInfo(true);
      const driversList = driversToCheck || drivers;
      if (driversList.length === 0) {
        setLoadingUsageInfo(false);
        return;
      }

      const usageInfo = new Map<number, { 
        isInUse: boolean; 
        canDelete: boolean; 
        vehicleCount: number;
        tripRecordsCount: number; 
        fuelRecordsCount: number;
        substituteCount: number;
        usageDetails: string; 
      }>();

      // Batch process drivers with Promise.allSettled for better performance
      const usagePromises = driversList.map(async (driver) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 วินาที timeout per driver
          
          const response = await fetch(`/api/drivers/${driver.id}/usage`, {
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const result = await response.json();
            const vehicleCount = result.vehicleCount || 0;
            const tripCount = result.tripCount || 0;
            const fuelCount = result.fuelCount || 0;
            const substituteCount = result.substituteCount || 0;
            const isInUse = vehicleCount > 0 || tripCount > 0 || fuelCount > 0 || substituteCount > 0;
            
            return {
              id: driver.id,
              isInUse,
              canDelete: result.canDelete,
              vehicleCount,
              tripRecordsCount: tripCount,
              fuelRecordsCount: fuelCount,
              substituteCount,
              usageDetails: result.usageDetails || 'ไม่มีการใช้งาน'
            };
          } else {
            return {
              id: driver.id,
              isInUse: false,
              canDelete: true,
              vehicleCount: 0,
              tripRecordsCount: 0,
              fuelRecordsCount: 0,
              substituteCount: 0,
              usageDetails: 'ไม่สามารถตรวจสอบการใช้งานได้'
            };
          }
        } catch (error) {
          return {
            id: driver.id,
            isInUse: false,
            canDelete: true,
            vehicleCount: 0,
            tripRecordsCount: 0,
            fuelRecordsCount: 0,
            substituteCount: 0,
            usageDetails: 'ไม่สามารถตรวจสอบการใช้งานได้'
          };
        }
      });

      // Process all requests concurrently
      const results = await Promise.allSettled(usagePromises);
      
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { id, isInUse, canDelete, vehicleCount, tripRecordsCount, fuelRecordsCount, substituteCount, usageDetails } = result.value;
          usageInfo.set(id, { isInUse, canDelete, vehicleCount, tripRecordsCount, fuelRecordsCount, substituteCount, usageDetails });
        }
      });

      setDriverUsageInfo(usageInfo);
    } catch (error) {
      console.warn('Error fetching driver usage info:', error);
      // Don't show error to user as this is background process
    } finally {
      setLoadingUsageInfo(false);
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH');
  };

  // แสดง loading ระหว่างรอ authentication
  if (status === 'loading') {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 400 
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>กำลังตรวจสอบสิทธิ์...</Typography>
      </Box>
    );
  }

  // ถ้าไม่ได้ login ให้ redirect ไป login page
  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <>
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
          <Typography variant="h5" component="h1" gutterBottom>
            จัดการคนขับ
          </Typography>
          <Box sx={{ flex: '1', display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddDriver}
              >
                เพิ่มคนขับ
              </Button>
            </Box>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
           <Box sx={{ 
             display: 'grid', 
             gridTemplateColumns: { 
               xs: '1fr', 
               sm: '1fr',
               md: '4fr 1fr auto'
             },
             gap: 2, 
             mb: 2,
             alignItems: 'center'
           }}>
            
              <TextField
                fullWidth
                variant="outlined"
                placeholder="ค้นหาชื่อคนขับ, เลขใบขับขี่, หรือเบอร์โทร..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'grey.300' },
                    '&:hover fieldset': { borderColor: 'primary.main' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                  }
                }}
              />
            
            
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>สถานะ</InputLabel>
                <Select
                  value={statusFilter}
                  label="สถานะ"
                  onChange={(e) => handleStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">ทั้งหมด</MenuItem>
                  <MenuItem value="active">ใช้งานอยู่</MenuItem>
                  <MenuItem value="inactive">ไม่ใช้งาน</MenuItem>
                </Select>
              </FormControl>
            
            {/* Clear All Button */}
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
              ล้างตัวกรอง
            </Button>

          </Box>
        </Paper>

        {/* Desktop Table */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>รูปภาพ</TableCell>
                  <TableCell>ชื่อคนขับ</TableCell>
                  <TableCell>เลขใบขับขี่</TableCell>
                  <TableCell>เบอร์โทร</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell align="center">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton variant="circular" width={48} height={48} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={120} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={100} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={100} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={80} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={80} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : drivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        ไม่พบข้อมูลคนขับ
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  drivers.map((driver) => (
                    <TableRow key={driver.id} hover>
<TableCell>
  <Avatar
    src={driver.driverImage ? getImageUrl(driver.driverImage) : undefined}
    sx={{ width: 48, height: 48 }}
  >
    <PersonIcon />
  </Avatar>
</TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {driver.driverName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {driver.driverLicense}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {driver.phone || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={driver.isActive ? <ActiveIcon /> : <InactiveIcon />}
                          label={driver.isActive ? 'ใช้งานอยู่' : 'ไม่ใช้งาน'}
                          color={driver.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center" width={80}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'left' }}>
                          <Tooltip title="ดูรายละเอียด">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleViewDriver(driver)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="แก้ไข">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditDriver(driver)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          {/* Toggle Status Button */}
                          <Tooltip title={driver.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                            <IconButton
                              size="small"
                              disabled={togglingStatus === driver.id}
                              onClick={() => handleToggleStatus(driver)}
                              sx={{
                                color: driver.isActive ? 'warning.main' : 'success.main',
                                '&:hover': {
                                  bgcolor: driver.isActive ? 'warning.50' : 'success.50',
                                },
                              }}
                            >
                              {togglingStatus === driver.id ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : driver.isActive ? (
                                <ToggleOffIcon fontSize="small" />
                              ) : (
                                <ToggleOnIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>

                          {/* Delete Button - show only if driver has no vehicles, no fuel records, and no substitute driving */}
                          {!loadingUsageInfo && (() => {
                            const usageInfo = driverUsageInfo.get(driver.id);
                            // แสดงปุ่มลบเฉพาะเมื่อไม่มีรถ ไม่เคยเติมน้ำมัน และไม่เคยขับแทน
                            const hasNoVehicles = !usageInfo || usageInfo.vehicleCount === 0;
                            const hasNoFuelRecords = !usageInfo || usageInfo.fuelRecordsCount === 0;
                            const hasNoSubstitute = !usageInfo || usageInfo.substituteCount === 0;
                            const canDelete = hasNoVehicles && hasNoFuelRecords && hasNoSubstitute;
                            
                            return canDelete ? (
                              <Tooltip title="ลบ">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteDriver(driver)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : null;
                          })()}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Mobile Cards */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="circular" width={60} height={60} sx={{ mr: 2 }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="60%" />
                      <Skeleton variant="text" width="40%" />
                    </Box>
                  </Box>
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="70%" />
                </CardContent>
              </Card>
            ))
          ) : drivers.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                ไม่พบข้อมูลคนขับ
              </Typography>
            </Paper>
          ) : (
            drivers.map((driver) => (
              <Card key={driver.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      src={driver.driverImage ? getImageUrl(driver.driverImage) : undefined}
                      sx={{ width: 60, height: 60, mr: 2 }}
                    >
                      <PersonIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" component="div">
                        {driver.driverName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ใบขับขี่: {driver.driverLicense}
                      </Typography>
                    </Box>
                    <Chip
                      icon={driver.isActive ? <ActiveIcon /> : <InactiveIcon />}
                      label={driver.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                      color={driver.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  
                  {driver.phone && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <PhoneIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                      {driver.phone}
                    </Typography>
                  )}
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleViewDriver(driver)}
                  >
                    ดูรายละเอียด
                  </Button>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleEditDriver(driver)}
                    >
                      <EditIcon />
                    </IconButton>
                    
                    {/* Toggle Status Button */}
                    <Tooltip title={driver.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                      <IconButton
                        size="small"
                        disabled={togglingStatus === driver.id}
                        onClick={() => handleToggleStatus(driver)}
                        sx={{
                          color: driver.isActive ? 'warning.main' : 'success.main',
                        }}
                      >
                        {togglingStatus === driver.id ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : driver.isActive ? (
                          <ToggleOffIcon />
                        ) : (
                          <ToggleOnIcon />
                        )}
                      </IconButton>
                    </Tooltip>

                    {/* Delete Button - show only if driver has no vehicles, no fuel records, and no substitute driving */}
                    {!loadingUsageInfo && (() => {
                      const usageInfo = driverUsageInfo.get(driver.id);
                      // แสดงปุ่มลบเฉพาะเมื่อไม่มีรถ ไม่เคยเติมน้ำมัน และไม่เคยขับแทน
                      const hasNoVehicles = !usageInfo || usageInfo.vehicleCount === 0;
                      const hasNoFuelRecords = !usageInfo || usageInfo.fuelRecordsCount === 0;
                      const hasNoSubstitute = !usageInfo || usageInfo.substituteCount === 0;
                      const canDelete = hasNoVehicles && hasNoFuelRecords && hasNoSubstitute;
                      
                      return canDelete ? (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteDriver(driver)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      ) : null;
                    })()}
                  </Box>
                </CardActions>
              </Card>
            ))
          )}
        </Box>

        {/* Pagination */}
        {!loading && drivers.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <DataTablePagination
              count={pagination.total}
              rowsPerPage={pagination.limit}
              page={pagination.page - 1}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleLimitChange}
            />
          </Box>
        )}
      </Box>

      {/* Driver Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 3,
          }
        }}
      >
        <DialogTitle>
          {dialogMode === 'add' && 'เพิ่มคนขับใหม่'}
          {dialogMode === 'edit' && 'แก้ไขข้อมูลคนขับ'}
          {dialogMode === 'view' && 'รายละเอียดคนขับ'}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ 
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 3
            }}>
              {/* Driver Image */}
              <Box sx={{ flex: { xs: '1', md: '0 0 auto' }, minWidth: { md: '250px' } }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    รูปภาพคนขับ
                  </Typography>
                  
                  <Box
                    sx={{
                      width: 200,
                      height: 200,
                      mx: 'auto',
                      mb: 2,
                      border: '2px dashed #ccc',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      backgroundColor: '#f9f9f9',
                    }}
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Driver Preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: 8,
                        }}
                      />
                    ) : (
                      <Box sx={{ textAlign: 'center', color: '#999' }}>
                        <ImageIcon sx={{ fontSize: 48, mb: 1 }} />
                        <Typography variant="body2">
                          ไม่มีรูปภาพ
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  
                  {dialogMode !== 'view' && (
                    <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<ImageIcon />}
                        sx={{ mb: 1 }}
                      >
                        เลือกรูปภาพ
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </Button>
                      
                      {imagePreview && editingDriver?.driverImage && (
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={handleDeleteAvatar}
                          sx={{ mb: 1 }}
                        >
                          ลบรูปภาพ
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Driver Information */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(() => {
                    // เช็คว่าคนขับมีรถ, มีรายการเติมน้ำมัน หรือเคยขับแทนหรือไม่
                    const usageInfo = driverUsageInfo.get(editingDriver?.id || 0);
                    const hasVehicles = usageInfo && usageInfo.vehicleCount > 0;
                    const hasFuelRecords = usageInfo && usageInfo.fuelRecordsCount > 0;
                    const hasSubstitute = usageInfo && usageInfo.substituteCount > 0;
                    const isInUse = hasVehicles || hasFuelRecords || hasSubstitute;
                    const isNameDisabled = dialogMode === 'view' || (dialogMode === 'edit' && isInUse);
                    
                    
                    return (
                      <>
                        <TextField
                          fullWidth
                          label="ชื่อคนขับ"
                          size="small"
                          value={formData.driverName}
                          onChange={(e) => setFormData(prev => ({ ...prev, driverName: e.target.value }))}
                          disabled={isNameDisabled}
                          required
                          helperText={
                            dialogMode === 'edit' && isInUse 
                              ? '⚠️ ไม่สามารถแก้ไขชื่อได้ เนื่องจากคนขับมีการใช้งานแล้ว' 
                              : ''
                          }
                          FormHelperTextProps={{
                            sx: { color: 'warning.main', fontWeight: 500 }
                          }}
                        />
                      </>
                    );
                  })()}
                  
                  {(() => {
                    // เช็คว่าคนขับมีรถ, มีรายการเติมน้ำมัน หรือเคยขับแทนหรือไม่
                    const usageInfo = driverUsageInfo.get(editingDriver?.id || 0);
                    const hasVehicles = usageInfo && usageInfo.vehicleCount > 0;
                    const hasFuelRecords = usageInfo && usageInfo.fuelRecordsCount > 0;
                    const hasSubstitute = usageInfo && usageInfo.substituteCount > 0;
                    const isInUse = hasVehicles || hasFuelRecords || hasSubstitute;
                    const isLicenseDisabled = dialogMode === 'view' || (dialogMode === 'edit' && isInUse);
                    
                    return (
                      <TextField
                        fullWidth
                        label="เลขใบขับขี่"
                        size="small"
                        value={formData.driverLicense}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({ ...prev, driverLicense: value }));
                          
                          // ตรวจสอบเลขใบขับขี่ซ้ำแบบ debounce
                          if (value.trim()) {
                            const delayedCheck = setTimeout(() => {
                              checkLicenseDuplicate(value, editingDriver?.id);
                            }, 800); // รอ 800ms หลังจากผู้ใช้พิมพ์เสร็จ
                            
                            return () => clearTimeout(delayedCheck);
                          } else {
                            setLicenseValidation({
                              isChecking: false,
                              isDuplicate: false,
                              message: '',
                            });
                          }
                        }}
                        disabled={isLicenseDisabled}
                        required
                        error={licenseValidation.isDuplicate}
                        helperText={
                          dialogMode === 'edit' && isInUse 
                            ? '⚠️ ไม่สามารถแก้ไขเลขใบขับขี่ได้ เนื่องจากคนขับมีการใช้งานแล้ว'
                            : licenseValidation.message || ''
                        }
                        FormHelperTextProps={{
                          sx: dialogMode === 'edit' && isInUse 
                            ? { color: 'warning.main', fontWeight: 500 }
                            : undefined
                        }}
                        InputProps={{
                          endAdornment: licenseValidation.isChecking && (
                            <CircularProgress size={20} />
                          ),
                        }}
                      />
                    );
                  })()}
                  
                  <TextField
                    fullWidth
                    label="เบอร์โทร"
                    size="small"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={dialogMode === 'view'}
                  />
                  
                  <TextField
                    fullWidth
                    label="หมายเหตุ"
                    size="small"
                    value={formData.remark}
                    onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
                    disabled={dialogMode === 'view'}
                    multiline
                    rows={3}
                  />
                  
                  {/* แสดงรถที่คนขับขับอยู่ (เฉพาะโหมด view) */}
                  {dialogMode === 'view' && (
                    <Box sx={{ mt: 2 }}>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                        <DriveIcon sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
                        รถที่คนขับขับอยู่
                      </Typography>
                      
                      {loadingVehicles ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : (
                        <Box sx={{ mt: 1 }}>
                          {/* รถที่เป็นคนขับหลัก */}
                          {driverVehicles.mainDriver.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="primary" sx={{ fontWeight: 500, mb: 1 }}>
                                คนขับหลัก ({driverVehicles.mainDriver.length} คัน)
                              </Typography>
                              {driverVehicles.mainDriver.map((vehicle) => (
                                <Chip
                                  key={vehicle.id}
                                  icon={<DriveIcon />}
                                  label={`${vehicle.licensePlate} (${vehicle.brand} ${vehicle.model})`}
                                  size="small"
                                  sx={{ mr: 1, mb: 1 }}
                                  color="primary"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          )}
                          
                          {/* รถที่เป็นคนขับสำรอง */}
                          {driverVehicles.backupDriver.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="body2" color="secondary" sx={{ fontWeight: 500, mb: 1 }}>
                                คนขับสำรอง ({driverVehicles.backupDriver.length} คัน)
                              </Typography>
                              {driverVehicles.backupDriver.map((vehicle) => (
                                <Chip
                                  key={vehicle.id}
                                  icon={<DriveIcon />}
                                  label={`${vehicle.licensePlate} (${vehicle.brand} ${vehicle.model})`}
                                  size="small"
                                  sx={{ mr: 1, mb: 1 }}
                                  color="secondary"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          )}
                          
                          {/* รถที่เคยขับแทน */}
                          {driverVehicles.substituteDriver.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: 'warning.main' }}>
                                เคยขับแทน ({driverVehicles.substituteDriver.length} คัน)
                              </Typography>
                              {driverVehicles.substituteDriver.map((vehicle) => (
                                <Chip
                                  key={vehicle.id}
                                  icon={<DriveIcon />}
                                  label={`${vehicle.licensePlate} (${vehicle.brand} ${vehicle.model})`}
                                  size="small"
                                  sx={{ mr: 1, mb: 1 }}
                                  color="warning"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          )}
                          
                          {/* ไม่มีรถ */}
                          {driverVehicles.mainDriver.length === 0 && 
                           driverVehicles.backupDriver.length === 0 && 
                           driverVehicles.substituteDriver.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              ยังไม่มีรถที่กำหนดคนขับคนนี้
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} variant='outlined'>
            {dialogMode === 'view' ? 'ปิด' : 'ยกเลิก'}
          </Button>
          {dialogMode !== 'view' && (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={
                submitting || 
                licenseValidation.isChecking || 
                licenseValidation.isDuplicate ||
                !formData.driverName.trim() ||
                !formData.driverLicense.trim()
              }
              startIcon={submitting ? <CircularProgress size={16} /> : null}
            >
              {submitting ? 
                (imageFile ? 'กำลังบันทึกและอัพโหลดรูป...' : 'กำลังบันทึก...') : 
                'บันทึก'
              }
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, driverId: null, driver: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>ลบคนขับ</DialogTitle>
        <DialogContent>
          <Typography>
            คุณต้องการลบคนขับคนนี้หรือไม่? ข้อมูลและรูปภาพทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้
          </Typography>
          {deleteDialog.driver && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: 'grey.50', 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.200'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {deleteDialog.driver.driverName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                เลขใบขับขี่: {deleteDialog.driver.driverLicense}
              </Typography>
              {deleteDialog.driver.phone && (
                <Typography variant="body2" color="text.secondary">
                  โทรศัพท์: {deleteDialog.driver.phone}
                </Typography>
              )}
              
              {/* แสดงข้อมูลการใช้งานถ้ามี */}
              {(() => {
                const usageInfo = driverUsageInfo.get(deleteDialog.driver!.id);
                if (usageInfo?.isInUse) {
                  const details = [];
                  if (usageInfo.vehicleCount > 0) details.push(`${usageInfo.vehicleCount} คันรถ`);
                  if (usageInfo.tripRecordsCount > 0) details.push(`${usageInfo.tripRecordsCount} รายการเดินทาง`);
                  if (usageInfo.fuelRecordsCount > 0) details.push(`${usageInfo.fuelRecordsCount} รายการเติมน้ำมัน`);
                  if (usageInfo.substituteCount > 0) details.push(`${usageInfo.substituteCount} รายการขับแทน`);
                  
                  return (
                    <Typography variant="body2" color="warning.main" sx={{ mt: 1, fontWeight: 500 }}>
                      ⚠️ คนขับคนนี้มีการใช้งานแล้ว: {details.join(', ')}
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
            onClick={() => setDeleteDialog({ open: false, driverId: null, driver: null })}
            disabled={deleteLoading}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={confirmDeleteDriver}
            color="error"
            variant="contained"
            startIcon={deleteLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <DeleteIcon />
            )}
            disabled={deleteLoading}
          >
            {deleteLoading ? 'กำลังลบ...' : 'ลบคนขับ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Image Confirmation Dialog */}
      <Dialog
        open={deleteImageDialogOpen}
        onClose={() => setDeleteImageDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteIcon color="error" />
            ยืนยันการลบรูปภาพ
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            คุณต้องการลบรูปภาพคนขับนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteImageDialogOpen(false)}
            variant="outlined"
            disabled={deleteImageLoading}
          >
            ยกเลิก
          </Button>
          <Button 
            onClick={confirmDeleteAvatar}
            variant="contained"
            color="error"
            disabled={deleteImageLoading}
            startIcon={deleteImageLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleteImageLoading ? 'กำลังลบ...' : 'ลบรูปภาพ'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
 
export default function DriversNewPage() {
  return (
    <Layout showSidebar={false}>
      <DriversPageContent />
    </Layout>
  );
}
'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Avatar,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  Skeleton,
  FormHelperText,
} from '@mui/material';
import {
  ArrowBack,
  PhotoCamera,
  Save,
  Clear,
  Delete,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  DirectionsCar as DirectionsCarIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import Layout from '../../../components/Layout';
import ImageUploadDeferred, { uploadImageFile } from '../../../components/ImageUploadDeferred';
import ColorPickerCompact from '../../../../components/ColorPickerCompact';

const CAR_TYPES = [
  { value: 'Truck', label: 'รถบรรทุก (Truck)' },
  { value: 'ForkLift', label: 'รถโฟล์คลิฟท์ (ForkLift)' },
  { value: 'Pickup', label: 'รถกระบะ (Pickup)' },
];

const CAR_BRANDS = [
  { value: 'Audi', label: 'อาวดี้' },
  { value: 'BMW', label: 'บีเอ็มดับเบิ้ลยู' },
  { value: 'Chevrolet', label: 'เชฟโรเลต' },
  { value: 'Ford', label: 'ฟอร์ด' },
  { value: 'Honda', label: 'ฮอนด้า' },
  { value: 'Hyundai', label: 'ฮุนได' },
  { value: 'Heno', label: 'ฮีโน่' },
  { value: 'Isuzu', label: 'อีซูซุ' },
  { value: 'Kia', label: 'เกียร์' },
  { value: 'Lexus', label: 'เลกซัส' },
  { value: 'Mazda', label: 'มาสด้า' },
  { value: 'Mercedes-Benz', label: 'เมอร์เซเดส-เบนซ์' },
  { value: 'Mitsubishi', label: 'มิตซูบิชิ' },
  { value: 'Nissan', label: 'นิสสัน' },
  { value: 'Porsche', label: 'พอร์ช' },
  { value: 'Toyota', label: 'โตโยต้า' },
  { value: 'Volkswagen', label: 'โฟล์คสวาเกน' },
  { value: 'Other', label: 'อื่นๆ' }
];

// Helper function to generate driver initials
const getDriverInitials = (name: string): string => {
  if (!name) return '?';
  
  const words = name.trim().split(' ').filter(word => word.length > 0);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  } else if (words.length >= 2) {
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
};

// Helper function to get proper driver image URL
const getDriverImageUrl = (driverImage: string | null | undefined): string => {
  if (!driverImage || driverImage === 'undefined' || driverImage === 'null') {
    return '';
  }
  
  // If already a full URL (like ui-avatars.com), use as is
  if (driverImage.startsWith('http')) {
    return driverImage;
  }
  
  // Handle uploaded images with proper path
  let imagePath = driverImage;
  if (!imagePath.startsWith('/uploads/')) {
    imagePath = `/uploads/driver/${imagePath}`;
  }
  
  // Use serve-image API in production
  if (process.env.NODE_ENV === 'production') {
    return `/api/serve-image?path=${encodeURIComponent(imagePath)}`;
  }
  
  return imagePath;
};

// Optimized driver menu item rendering function (without React.memo wrapper to avoid Select issues)
const renderDriverMenuItem = (
  driver: { 
    id: number; 
    driverName: string; 
    driverLicense: string; 
    imageUrl: string; 
    initials: string; 
  },
  isDisabled: boolean,
  bgColor: string = 'primary.main'
) => {
  return (
    <MenuItem 
      key={driver.id}
      value={driver.id.toString()}
      disabled={isDisabled}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar 
          src={driver.imageUrl || undefined}
          imgProps={{
            loading: 'lazy',
            onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
              // Hide broken image, show initials instead
              e.currentTarget.style.display = 'none';
            }
          }}
          sx={{ 
            width: 32, 
            height: 32,
            bgcolor: driver.imageUrl ? 'transparent' : bgColor,
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 'bold'
          }}
        >
          {driver.initials}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {driver.driverName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ({driver.driverLicense})
          </Typography>
        </Box>
      </Box>
    </MenuItem>
  );
};

interface Driver {
  id: number;
  driverName: string;
  driverLicense: string;
  driverImage?: string;
}

interface CarFormData {
  licensePlate: string;
  brand: string;
  model: string;
  color: string;
  weight: string;
  fuelTank: string;
  fuelConsume: string;
  fuelConsumeMth: string;
  vehicleType: string;
  // คนขับ (ใช้ ID แทนข้อมูลโดยตรง)
  mainDriverId: string;
  backupDriverId: string;
  // อื่นๆ
  remark: string;
  carImage: string;
}

export default function EditCarPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [licensePlateExists, setLicensePlateExists] = useState(false);
  const [checkingLicense, setCheckingLicense] = useState(false);
  const [licensePlateFormatValid, setLicensePlateFormatValid] = useState(true);
  const [originalLicensePlate, setOriginalLicensePlate] = useState('');
  
  // Driver-related state
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  
  // State สำหรับเก็บไฟล์ที่จะอัปโหลด
  const [carImageFile, setCarImageFile] = useState<File | null>(null);

  // Refs for focusing
  const licensePlateRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const vehicleTypeRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<CarFormData>({
    licensePlate: '',
    brand: '',
    model: '',
    color: '',
    weight: '',
    fuelTank: '',
    fuelConsume: '',
    fuelConsumeMth: '',
    vehicleType: '',
    // คนขับ (ใช้ ID)
    mainDriverId: '',
    backupDriverId: '',
    // อื่นๆ
    remark: '',
    carImage: '',
  });
  
  // Fetch available drivers
  const fetchDrivers = async () => {
    setLoadingDrivers(true);
    try {
      const response = await fetch('/api/drivers/options?activeOnly=true');
      const result = await response.json();
      
      if (response.ok) {
        setDrivers(result.drivers || []);
      } else {
        showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลคนขับ', 'error');
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลคนขับ', 'error');
    } finally {
      setLoadingDrivers(false);
    }
  };

  // Fetch drivers on component mount
  useEffect(() => {
    fetchDrivers();
  }, []);

  // Memoize processed drivers to prevent re-render lag
  const processedDrivers = useMemo(() => {
    return drivers.map(driver => ({
      ...driver,
      imageUrl: getDriverImageUrl(driver.driverImage),
      initials: getDriverInitials(driver.driverName)
    }));
  }, [drivers]);

  // โหลดข้อมูลรถ
  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const resolvedParams = await params;
        const response = await fetch(`/api/vehicles/${resolvedParams.id}`);
        const result = await response.json();

        if (response.ok && result.vehicle) {
          const vehicle = result.vehicle;
          setOriginalLicensePlate(vehicle.licensePlate || '');
          setFormData({
            licensePlate: vehicle.licensePlate || '',
            brand: vehicle.brand || '',
            model: vehicle.model || '',
            color: vehicle.color || '',
            weight: vehicle.weight?.toString() || '',
            fuelTank: vehicle.fuelTank?.toString() || '',
            fuelConsume: vehicle.fuelConsume?.toString() || '',
            fuelConsumeMth: vehicle.fuelConsumeMth?.toString() || '',
            vehicleType: vehicle.vehicleType || '',
            // คนขับ (ใช้ ID จากข้อมูลที่ได้)
            mainDriverId: vehicle.mainDriverId?.toString() || '',
            backupDriverId: vehicle.backupDriverId?.toString() || '',
            // อื่นๆ
            remark: vehicle.remark || '',
            carImage: vehicle.carImage || '',
          });
        } else {
          showSnackbar(result.error || 'ไม่พบข้อมูลรถที่ต้องการแก้ไข', 'error');
          // Redirect ไปหน้า vehicles เมื่อไม่พบข้อมูล
          setTimeout(() => {
            router.push('/vehicles');
          }, 300);
        }
      } catch (error) {
        console.error('Error fetching vehicle:', error);
        showSnackbar('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        // Redirect ไปหน้า vehicles เมื่อเกิดข้อผิดพลาด
        setTimeout(() => {
          router.push('/vehicles');
        }, 300);
      } finally {
        setLoadingData(false);
      }
    };

    fetchVehicle();
  }, [params]);

  // ตรวจสอบรูปแบบทะเบียนรถไทย
  const validateThaiLicensePlate = (licensePlate: string, vehicleType: string): boolean => {
    if (!licensePlate.trim()) return true; // อนุญาตให้ว่างเปล่า
    
    // ถ้าเป็น Forklift ไม่ต้องตรวจสอบรูปแบบ
    if (vehicleType === 'ForkLift') return true;
    
    // รูปแบบทะเบียนรถไทย:
    // - 2-3 ตัวอักษร/ตัวเลข (ไทย, อังกฤษ, หรือตัวเลข) + เครื่องหมาย - + 1-4 ตัวเลข
    // เช่น กข-1234, abc-123, 12-3456, 123-4567, ก1-234
    const thaiLicensePattern = /^[ก-๙a-zA-Z0-9]{2,3}-\d{1,4}$/;
    return thaiLicensePattern.test(licensePlate.trim());
  };

  // ตรวจสอบทะเบียนรถเมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.licensePlate) {
        // ตรวจสอบรูปแบบก่อน (ถ้าไม่ใช่ Forklift)
        const isFormatValid = validateThaiLicensePlate(formData.licensePlate, formData.vehicleType);
        setLicensePlateFormatValid(isFormatValid);
        
        // ถ้ารูปแบบถูกต้องและไม่ใช่ทะเบียนเดิมค่อยตรวจสอบการซ้ำ
        if (isFormatValid && formData.licensePlate !== originalLicensePlate) {
          checkLicensePlate(formData.licensePlate);
        } else {
          setLicensePlateExists(false);
        }
      } else {
        setLicensePlateExists(false);
        setLicensePlateFormatValid(true);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.licensePlate, formData.vehicleType, originalLicensePlate]);

  // ตรวจสอบทะเบียนรถซ้ำ
  const checkLicensePlate = async (licensePlate: string) => {
    if (!licensePlate.trim()) {
      setLicensePlateExists(false);
      return;
    }

    setCheckingLicense(true);
    try {
      const response = await fetch(`/api/vehicles/check-license-plate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          licensePlate,
          excludeId: (await params).id // ไม่นับรถคันปัจจุบัน
        })
      });
      const result = await response.json();
      
      if (response.ok) {
        setLicensePlateExists(result.exists);
      } else {
        console.error('Error checking license plate:', result.error);
        setLicensePlateExists(false);
      }
    } catch (error) {
      console.error('Error checking license plate:', error);
      setLicensePlateExists(false);
    } finally {
      setCheckingLicense(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    
    // สำหรับทะเบียนรถ: ตรวจสอบรูปแบบตามมาตรฐานไทย (เว้นแต่เป็น Forklift)
    if (name === 'licensePlate') {
      // ถ้าเป็น Forklift ให้กรอกได้เลย
      if (formData.vehicleType === 'ForkLift') {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      } else {
        // อนุญาตเฉพาะตัวอักษรไทย, อังกฤษ, ตัวเลข, เครื่องหมาย - และช่องว่าง
        const validInput = value.replace(/[^ก-๙a-zA-Z0-9\-\s]/g, '');
        setFormData(prev => ({
          ...prev,
          [name]: validInput
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: ต้องเลือกประเภทรถก่อน
    if (!formData.vehicleType.trim()) {
      showSnackbar('กรุณาเลือกประเภทรถ', 'error');
      setTimeout(() => {
        if (vehicleTypeRef.current) {
          const input = vehicleTypeRef.current.querySelector('input, [role="combobox"]') as HTMLElement;
          if (input) input.focus();
        }
      }, 100);
      return;
    }
    
    // Validation: ทะเบียนรถ
    if (!formData.licensePlate.trim()) {
      showSnackbar('กรุณากรอกทะเบียนรถ', 'error');
      setTimeout(() => {
        if (licensePlateRef.current) {
          const input = licensePlateRef.current.querySelector('input') as HTMLElement;
          if (input) input.focus();
        }
      }, 100);
      return;
    }

    // ตรวจสอบรูปแบบทะเบียนรถ (ถ้าไม่ใช่ Forklift)
    if (formData.vehicleType !== 'ForkLift' && !licensePlateFormatValid) {
      showSnackbar('รูปแบบทะเบียนรถไม่ถูกต้อง (เช่น กข-1234, 1กก-3456)', 'error');
      setTimeout(() => {
        if (licensePlateRef.current) {
          const input = licensePlateRef.current.querySelector('input') as HTMLElement;
          if (input) input.focus();
        }
      }, 100);
      return;
    }

    if (!formData.brand.trim()) {
      showSnackbar('กรุณาเลือกยี่ห้อรถ', 'error');
      setTimeout(() => {
        if (brandRef.current) {
          const input = brandRef.current.querySelector('input, [role="combobox"]') as HTMLElement;
          if (input) input.focus();
        }
      }, 100);
      return;
    }
    
    // ตรวจสอบทะเบียนรถซ้ำก่อนส่ง
    if (licensePlateExists) {
      showSnackbar('ไม่สามารถอัปเดตรถได้ เนื่องจากทะเบียนรถนี้มีอยู่ในระบบแล้ว', 'error');
      setTimeout(() => {
        if (licensePlateRef.current) {
          const input = licensePlateRef.current.querySelector('input') as HTMLElement;
          if (input) input.focus();
        }
      }, 100);
      return;
    }
    
    setLoading(true);

    try {
      // อัปโหลดรูปภาพรถ (ถ้ามี)
      let carImageUrl = formData.carImage;

      if (carImageFile) {
        try {
          carImageUrl = await uploadImageFile(carImageFile, 'car');
          console.log('✅ Car image uploaded:', carImageUrl);
          // อัปเดต formData ให้ใช้ URL จริงแทน preview URL
          setFormData(prev => ({ ...prev, carImage: carImageUrl }));
        } catch (error) {
          console.error('Error uploading car image:', error);
          showSnackbar('เกิดข้อผิดพลาดในการอัปโหลดรูปรถ', 'error');
          setLoading(false);
          return;
        }
      }

      const resolvedParams = await params;
      const response = await fetch(`/api/vehicles/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          fuelTank: formData.fuelTank ? parseFloat(formData.fuelTank) : null,
          fuelConsume: formData.fuelConsume ? parseFloat(formData.fuelConsume) : null,
          fuelConsumeMth: formData.fuelConsumeMth ? parseFloat(formData.fuelConsumeMth) : null,
          carImage: carImageUrl,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar('อัปเดตข้อมูลรถสำเร็จ!', 'success');
        router.push('/vehicles');
      } else {
        showSnackbar(result.error || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showSnackbar('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('คุณแน่ใจว่าต้องการลบข้อมูลรถนี้?')) {
      setLoading(true);

      try {
        const resolvedParams = await params;
        const response = await fetch(`/api/vehicles/${resolvedParams.id}`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (response.ok) {
          showSnackbar('ลบข้อมูลรถสำเร็จ!', 'success');
          router.push('/vehicles');
        } else {
          showSnackbar(result.error || 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
        }
      } catch (error) {
        console.error('Error:', error);
        showSnackbar('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loadingData) {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton disabled sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Skeleton variant="text" width={200} height={40} />
          </Box>
          <Paper elevation={2} sx={{ p: 4 }}>
            <Skeleton variant="text" width={300} height={30} sx={{ mb: 3 }} />
            <Box>
              {Array.from({ length: 4 }).map((_, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2.5, flexDirection: { xs: 'column', md: 'row' } }}>
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="rectangular" height={56} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="rectangular" height={56} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
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
              <DirectionsCarIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                แก้ไขข้อมูลรถ
              </Typography>
            </Box>
            
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              href="/vehicles"
              sx={{ borderRadius: 2 }}
            >
              กลับ
            </Button>
          </Box>



        {/* Form */}
        <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
          <form onSubmit={handleSubmit}>
            {/* ข้อมูลรถ */}
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontSize: '1.1rem' }}>
              📋 ข้อมูลรถ
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              {/* แถวที่ 1: ประเภทรถ + ทะเบียน + ยี่ห้อ */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.5, mb: 2 }}>
                <Box ref={vehicleTypeRef}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>ประเภทรถ</InputLabel>
                    <Select
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={(e) => setFormData(prev => ({ ...prev, vehicleType: e.target.value }))}
                      label="ประเภทรถ"
                    >
                      {CAR_TYPES.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box ref={licensePlateRef}>
                  <TextField
                    fullWidth
                    required
                    label="ทะเบียนรถ"
                    name="licensePlate"
                    value={formData.licensePlate}
                    onChange={handleChange}
                    placeholder={formData.vehicleType === 'ForkLift' ? 'กรอกทะเบียนรถ' : 'เช่น กข-1234, abc-1234, 12-3456'}
                    size="small"
                    error={licensePlateExists || (!licensePlateFormatValid && formData.vehicleType !== 'ForkLift')}
                    helperText={
                      checkingLicense ? 'กำลังตรวจสอบ...' :
                      formData.vehicleType === 'ForkLift' ? (
                        licensePlateExists ? 'ทะเบียนรถนี้มีอยู่ในระบบแล้ว' :
                        formData.licensePlate === originalLicensePlate ? 'ทะเบียนรถเดิม' :
                        formData.licensePlate ? 'ทะเบียนรถนี้ใช้ได้' : 
                        'กรอกทะเบียนรถ (กรอกอะไรก็ได้)'
                      ) : (
                        !licensePlateFormatValid && formData.licensePlate ? 'รูปแบบทะเบียนรถไม่ถูกต้อง (เช่น กข-1234, 12-3456)' :
                        licensePlateExists ? 'ทะเบียนรถนี้มีอยู่ในระบบแล้ว' :
                        formData.licensePlate && formData.licensePlate !== originalLicensePlate && licensePlateFormatValid ? 'ทะเบียนรถนี้ใช้ได้' : 
                        formData.licensePlate === originalLicensePlate ? 'ทะเบียนรถเดิม' :
                        'รูปแบบ: 2-3 ตัวอักษร/ตัวเลข + เครื่องหมาย - + 1-4 ตัวเลข'
                      )
                    }
                    InputProps={{
                      endAdornment: checkingLicense ? (
                        <CircularProgress size={16} />
                      ) : licensePlateExists || (!licensePlateFormatValid && formData.vehicleType !== 'ForkLift') ? (
                        <ErrorIcon color="error" sx={{ fontSize: 20 }} />
                      ) : formData.licensePlate && formData.licensePlate !== originalLicensePlate && (formData.vehicleType === 'ForkLift' || licensePlateFormatValid) ? (
                        <CheckCircleIcon color="success" sx={{ fontSize: 20 }} />
                      ) : null
                    }}
                  />
                </Box>
                <Box ref={brandRef}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>ยี่ห้อรถ</InputLabel>
                    <Select
                      name="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      label="ยี่ห้อรถ"
                    >
                      {CAR_BRANDS.map((brand) => (
                        <MenuItem key={brand.value} value={brand.value}>
                          {brand.value} ({brand.label})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              
              {/* แถวที่ 2: รุ่นรถ + สีรถ */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr ', lg: '1fr 1fr 1fr 1fr 1fr' }, gap: 1.5, mb: 2 }}>
                <Box ref={modelRef}>
                  <TextField
                    fullWidth
                    label="รุ่นรถ"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    placeholder="ระบุรุ่นรถ (ไม่บังคับ)"
                    size="small"
                  />
                </Box>
                <ColorPickerCompact
                  label="สีรถ"
                  value={formData.color}
                  onChange={(color) => setFormData(prev => ({ ...prev, color }))}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="น้ำหนัก (กก.)"
                  name="weight"
                  type="number"
                  value={formData.weight}
                  onChange={handleChange}
                  inputProps={{ step: "0.01", min: "0" }}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="ถังน้ำมัน (ลิตร)"
                  name="fuelTank"
                  type="number"
                  value={formData.fuelTank}
                  onChange={handleChange}
                  inputProps={{ step: "0.01", min: "0" }}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="อัตราใช้น้ำมัน (กม./ลิตร)"
                  name="fuelConsume"
                  type="number"
                  value={formData.fuelConsume}
                  onChange={handleChange}
                  inputProps={{ step: "0.01", min: "0" }}
                  size="small"
                />
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* ข้อมูลคนขับ */}
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontSize: '1.1rem' }}>
              👤 ข้อมูลคนขับ
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              {/* คนขับหลัก */}
              <FormControl 
                fullWidth 
                size="small" 
                sx={{ mb: 2 }}
                error={!formData.mainDriverId}
              >
                <InputLabel>คนขับหลัก *</InputLabel>
                <Select
                  name="mainDriverId"
                  value={formData.mainDriverId}
                  label="คนขับหลัก *"
                  onChange={handleChange}
                  disabled={loadingDrivers}
                  required
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 400,
                      },
                    },
                    // Optimize menu rendering
                    disablePortal: false,
                    keepMounted: false,
                  }}
                >
                  <MenuItem value="">
                    <em>เลือกคนขับหลัก</em>
                  </MenuItem>
                  {processedDrivers.map((driver) => 
                    renderDriverMenuItem(
                      driver,
                      driver.id.toString() === formData.backupDriverId,
                      'primary.main'
                    )
                  )}
                </Select>
                {!formData.mainDriverId && (
                  <FormHelperText>กรุณาเลือกคนขับหลัก</FormHelperText>
                )}
              </FormControl>

              {/* คนขับรอง */}
              <FormControl fullWidth size="small">
                <InputLabel>คนขับรอง</InputLabel>
                <Select
                  name="backupDriverId"
                  value={formData.backupDriverId}
                  label="คนขับรอง"
                  onChange={handleChange}
                  disabled={loadingDrivers}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 400,
                      },
                    },
                    // Optimize menu rendering
                    disablePortal: false,
                    keepMounted: false,
                  }}
                >
                  <MenuItem value="">
                    <em>ไม่ระบุคนขับรอง</em>
                  </MenuItem>
                  {processedDrivers.map((driver) => 
                    renderDriverMenuItem(
                      driver,
                      driver.id.toString() === formData.mainDriverId,
                      'secondary.main'
                    )
                  )}
                </Select>
              </FormControl>
              
              {/* คนขับที่เลือก - เว้นระยะด้านบน */}
              {(formData.mainDriverId || formData.backupDriverId) && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                      คนขับที่เลือก
                  </Typography>
                  {/* คนขับหลักที่เลือก */}
                  {formData.mainDriverId && (
                    <Box sx={{ mb: 2 }}>
                      {(() => {
                        const selectedDriver = processedDrivers.find(d => d.id.toString() === formData.mainDriverId);
                        return selectedDriver ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar 
                              src={selectedDriver.imageUrl} 
                              sx={{ 
                                width: 48, 
                                height: 48,
                                bgcolor: selectedDriver.imageUrl ? 'transparent' : 'primary.main',
                                color: 'white',
                                fontSize: '1rem',
                                fontWeight: 'bold'
                              }}
                            >
                              {selectedDriver.initials}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                คนขับหลัก: {selectedDriver.driverName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ใบขับขี่: {selectedDriver.driverLicense}
                              </Typography>
                            </Box>
                          </Box>
                        ) : null;
                      })()}
                    </Box>
                  )}
                  
                  {/* คนขับรองที่เลือก */}
                  {formData.backupDriverId && (
                    <Box>
                      {(() => {
                        const selectedDriver = processedDrivers.find(d => d.id.toString() === formData.backupDriverId);
                        return selectedDriver ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar 
                              src={selectedDriver.imageUrl} 
                              sx={{ 
                                width: 48, 
                                height: 48,
                                bgcolor: selectedDriver.imageUrl ? 'transparent' : 'secondary.main',
                                color: 'white',
                                fontSize: '1rem',
                                fontWeight: 'bold'
                              }}
                            >
                              {selectedDriver.initials}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                คนขับรอง: {selectedDriver.driverName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ใบขับขี่: {selectedDriver.driverLicense}
                              </Typography>
                            </Box>
                          </Box>
                        ) : null;
                      })()}
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* รูปภาพและหมายเหตุ */}
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontSize: '1.1rem' }}>
              📷 รูปภาพและหมายเหตุ
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              {/* รูปภาพรถเท่านั้น */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr' }, gap: 2, mb: 2 }}>
                <ImageUploadDeferred
                  type="car"
                  value={formData.carImage}
                  onChange={(file, previewUrl) => {
                    setCarImageFile(file);
                    if (previewUrl) {
                      setFormData(prev => ({ ...prev, carImage: previewUrl }));
                    } else if (file === null) {
                      // กรณีลบรูป
                      setFormData(prev => ({ ...prev, carImage: '' }));
                    }
                  }}
                  label="รูปภาพรถ"
                  disabled={loading}
                />
              </Box>
              
              {/* หมายเหตุ */}
              <TextField
                fullWidth
                label="หมายเหตุ"
                name="remark"
                value={formData.remark}
                onChange={handleChange}
                multiline
                rows={2}
                placeholder="ระบุหมายเหตุเพิ่มเติม (ไม่บังคับ)"
                size="small"
              />
            </Box>

            {/* Buttons */}
            <Box sx={{ 
                display: 'flex', 
                gap: 1.5, 
                justifyContent: { xs: 'stretch', sm: 'flex-end' },
                mt: 3,
                pt: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
                flexDirection: { xs: 'column', sm: 'row' }
              }}>
              <Button
                variant="outlined"
                onClick={() => router.push('/vehicles')}
                disabled={loading}
                size="medium"
                sx={{ minWidth: { sm: '120px' } }}
              >
                ยกเลิก
              </Button>

              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={18} /> : <Save />}
                disabled={loading || licensePlateExists || checkingLicense || !licensePlateFormatValid}
                size="medium"
                sx={{ minWidth: { sm: '140px' } }}
              >
                {loading ? 'กำลังบันทึก...' : 
                 !licensePlateFormatValid && formData.licensePlate ? 'รูปแบบทะเบียนไม่ถูกต้อง' :
                 licensePlateExists ? 'ทะเบียนรถซ้ำ' :
                 checkingLicense ? 'กำลังตรวจสอบ...' :
                 'บันทึกการแก้ไข'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Layout>
  );
}

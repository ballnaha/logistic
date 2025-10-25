'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  InputAdornment,
  CircularProgress,
  Divider,
  Skeleton,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Timeline as MileageIcon,
  Notes as NotesIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Layout from '../../../components/Layout';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import AddressGeocoder from '../../../components/AddressGeocoder';

interface CustomerOption {
  code: string;
  name: string;
  fullName: string;
  address: string;
}

const salesOptions = [
  { value: 'M00-Center', label: 'M00-Center' },
  { value: 'M01-PSW', label: 'M01-PSW' },
  { value: 'M02-PSR', label: 'M02-PSR' },
  { value: 'M03-TSR', label: 'M03-TSR' },
  { value: 'M04-VB', label: 'M04-VB' },
  { value: 'M11-KS', label: 'M11-KS' },
];

function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const { showSnackbar } = useSnackbar();
  const customerId = params.id as string;
  const { data: session } = useSession();

  // Form state
  const [formData, setFormData] = useState({
    cmCode: '',
    cmName: '',
    cmAddress: '',
    cmPhone: '',
    cmMileage: '',
    cmRemark: '',
    lat: '',
    long: '',
    isActive: true, // เพิ่มฟิลด์สถานะการใช้งาน
  });

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  // Company location (PSC - Updated coordinates)
  const COMPANY_LAT = 13.537051;
  const COMPANY_LONG = 100.2173051;

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  };

  // Auto-calculate distance when lat/long changes
  const updateDistance = () => {
    if (formData.lat && formData.long) {
      const lat = parseFloat(formData.lat);
      const long = parseFloat(formData.long);
      if (!isNaN(lat) && !isNaN(long)) {
        const distance = calculateDistance(COMPANY_LAT, COMPANY_LONG, lat, long);
        setFormData(prev => ({
          ...prev,
          cmMileage: distance.toFixed(1)
        }));
      }
    }
  };

  // Fetch customer options from SQL Server
  useEffect(() => {
    const fetchCustomers = async () => {
      setCustomerLoading(true);
      
      // สร้าง AbortController สำหรับ timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 วินาที timeout
      
      try {
        const response = await fetch('/api/sqlserver-customers', {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache', // ป้องกัน cache ที่อาจเก่า
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const result = await response.json();
          setCustomerOptions(result.data || []);
        } else {
          showSnackbar('ไม่สามารถดึงข้อมูลลูกค้าได้', 'error');
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          showSnackbar('การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง', 'error');
        } else {
          showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลลูกค้า', 'error');
        }
        console.error('Customer fetch error:', error);
      } finally {
        setCustomerLoading(false);
      }
    };

    fetchCustomers();
  }, [showSnackbar]);

  // Handle customer selection
  const handleCustomerChange = (customer: CustomerOption | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        cmCode: customer.code,
        cmName: customer.name,
        cmAddress: customer.address,
        // Reset location data when customer changes
        lat: '',
        long: '',
        cmMileage: '',
      }));
      
      // Clear errors
      setErrors(prev => ({
        ...prev,
        cmCode: '',
        cmName: '',
        lat: '',
        long: '',
        cmMileage: '',
      }));
    } else {
      // When customer is cleared, reset location data as well
      setFormData(prev => ({
        ...prev,
        lat: '',
        long: '',
        cmMileage: '',
      }));
      
      // Clear location errors
      setErrors(prev => ({
        ...prev,
        lat: '',
        long: '',
        cmMileage: '',
      }));
    }
  };

  // Fetch customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      // สร้าง AbortController สำหรับ timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 วินาที timeout
      
      try {
        const response = await fetch(`/api/customers/${customerId}`, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache', // ป้องกัน cache ที่อาจเก่า
          }
        });
        
        clearTimeout(timeoutId);
        
        const result = await response.json();

        if (response.ok) {
          const customer = result.data;
          setFormData({
            cmCode: customer.cmCode || '',
            cmName: customer.cmName || '',
            cmAddress: customer.cmAddress || '',
            cmPhone: customer.cmPhone || '',
            cmMileage: customer.cmMileage ? customer.cmMileage.toString() : '',
            cmRemark: customer.cmRemark || '',
            lat: customer.lat ? customer.lat.toString() : '',
            long: customer.long ? customer.long.toString() : '',
            isActive: customer.isActive !== undefined ? customer.isActive : true, // เพิ่มฟิลด์ isActive
          });
        } else {
          showSnackbar('ไม่พบข้อมูลลูกค้า', 'error');
          router.push('/customers');
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          showSnackbar('การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง', 'error');
        } else {
          showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
        }
        console.error('Customer fetch error:', error);
        router.push('/customers');
      } finally {
        setFetchLoading(false);
      }
    };

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId, router, showSnackbar]);

  // Handle input change
  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // State for route distance from OSRM
  const [routeDistance, setRouteDistance] = useState<number | null>(null);

  // Handle lat/long change with distance calculation
  const handleLocationChange = (field: 'lat' | 'long') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: newValue
      };
      
      // Don't auto-calculate distance here to prevent flashing
      // Distance will be calculated by OSRM in MiniMap component
      
      return updated;
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle geocoder result
  const handleLocationSelect = async (lat: number, lng: number, formattedAddress?: string) => {
    // อัปเดตพิกัดใน form
    setFormData(prev => ({
      ...prev,
      lat: lat.toString(),
      long: lng.toString(),
      // อัปเดตที่อยู่ถ้าผู้ใช้ต้องการ (ไม่บังคับ)
      ...(formattedAddress && !prev.cmAddress && { cmAddress: formattedAddress }),
    }));
    
    // Clear errors
    setErrors(prev => ({
      ...prev,
      lat: '',
      long: '',
    }));

    // คำนวณระยะทางโดยใช้ Distance API ใหม่ (Google Maps หลัก) พร้อม timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 วินาที timeout สำหรับ Distance API
    
    try {
      const response = await fetch('/api/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          originLat: COMPANY_LAT,
          originLng: COMPANY_LONG,
          destLat: lat,
          destLng: lng,
        }),
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setFormData(prev => ({
            ...prev,
            lat: lat.toString(),
            long: lng.toString(),
            cmMileage: parseFloat(result.data.distance).toFixed(1),
          }));
          
          console.log(`✅ Distance calculated via ${result.data.source}: ${result.data.distance} km`);
        } else {
          throw new Error(result.error || 'Failed to calculate distance');
        }
      } else {
        throw new Error('Distance API request failed');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Fallback: ใช้ Haversine formula ถ้าเกิดข้อผิดพลาด
      if (error.name === 'AbortError') {
        console.warn('Distance API timeout, using Haversine fallback');
        showSnackbar('คำนวณระยะทางด้วยวิธีอื่น เนื่องจากการเชื่อมต่อหมดเวลา', 'warning');
      } else {
        console.error('Error calculating distance:', error);
      }
      
      const distance = calculateDistance(COMPANY_LAT, COMPANY_LONG, lat, lng);
      setFormData(prev => ({
        ...prev,
        lat: lat.toString(),
        long: lng.toString(),
        cmMileage: distance.toFixed(1),
      }));
      console.log(`⚠️ Distance calculated via Haversine fallback: ${distance.toFixed(1)} km`);
    }
  };

  // Update distance when route distance changes
  useEffect(() => {
    if (routeDistance !== null) {
      setFormData(prev => ({
        ...prev,
        cmMileage: routeDistance.toFixed(1)
      }));
    }
  }, [routeDistance]);

  // Clear distance when lat or long is incomplete
  useEffect(() => {
    if (!formData.lat || !formData.long) {
      setFormData(prev => ({
        ...prev,
        cmMileage: ''
      }));
      setRouteDistance(null);
    }
  }, [formData.lat, formData.long]);

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.cmCode.trim()) {
      newErrors.cmCode = 'กรุณากรอกรหัสลูกค้า';
    }

    if (!formData.cmName.trim()) {
      newErrors.cmName = 'กรุณากรอกชื่อลูกค้า';
    }

    if (formData.cmPhone && !/^[0-9-+\s()]+$/.test(formData.cmPhone)) {
      newErrors.cmPhone = 'รูปแบบเบอร์โทรไม่ถูกต้อง';
    }

    if (formData.cmMileage && (isNaN(parseFloat(formData.cmMileage)) || parseFloat(formData.cmMileage) < 0)) {
      newErrors.cmMileage = 'กรุณากรอกระยะทางเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0';
    }

    if (formData.lat && (isNaN(parseFloat(formData.lat)) || parseFloat(formData.lat) < -90 || parseFloat(formData.lat) > 90)) {
      newErrors.lat = 'ละติจูดต้องเป็นตัวเลขระหว่าง -90 ถึง 90';
    }

    if (formData.long && (isNaN(parseFloat(formData.long)) || parseFloat(formData.long) < -180 || parseFloat(formData.long) > 180)) {
      newErrors.long = 'ลองจิจูดต้องเป็นตัวเลขระหว่าง -180 ถึง 180';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      showSnackbar('กรุณาตรวจสอบข้อมูลที่กรอก', 'error');
      return;
    }

    setLoading(true);

    // สร้าง timeout สำหรับการบันทึกข้อมูล
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 วินาที timeout สำหรับการบันทึก
    
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          ...formData,
          cmMileage: formData.cmMileage ? parseFloat(formData.cmMileage) : null,
          lat: formData.lat ? parseFloat(formData.lat) : null,
          long: formData.long ? parseFloat(formData.long) : null,
          updatedBy: session?.user?.name || session?.user?.email || 'System',
        }),
      });

      clearTimeout(timeoutId);
      
      const result = await response.json();

      if (response.ok) {
        showSnackbar('อัพเดทข้อมูลลูกค้าสำเร็จ', 'success');
        router.push('/customers');
      } else {
        showSnackbar(result.error || 'ไม่สามารถอัพเดทข้อมูลลูกค้าได้', 'error');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        showSnackbar('การเชื่อมต่อหมดเวลา กรุณาลองบันทึกใหม่อีกครั้ง', 'error');
      } else {
        showSnackbar('เกิดข้อผิดพลาดในการอัพเดทข้อมูล', 'error');
      }
      console.error('Customer update error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push('/customers');
  };

  // Prevent scroll wheel on number inputs
  const handleNumberInputWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  if (fetchLoading) {
    return (
      <Layout showSidebar={false}>
        <Box>
          <Box sx={{ mb: 3 }}>
            <Skeleton variant="text" width={200} height={40} />
            <Skeleton variant="text" width={300} height={24} />
          </Box>
          <Paper sx={{ p: 4, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} variant="rectangular" height={56} />
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
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              แก้ไขข้อมูลลูกค้า
            </Typography>
            <Typography variant="body2" color="text.secondary">
              แก้ไขข้อมูลลูกค้า: {formData.cmCode} - {formData.cmName}
            </Typography>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            href="/customers"
            sx={{ borderRadius: 2 }}
          >
            กลับ
          </Button>
        </Box>

        {/* Form */}
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <BusinessIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  ข้อมูลพื้นฐาน
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                  <TextField
                    fullWidth
                    label="รหัสลูกค้า"
                    value={formData.cmCode}
                    onChange={handleChange('cmCode')}
                    error={!!errors.cmCode}
                    helperText={errors.cmCode || 'จะถูกกรอกอัตโนมัติเมื่อเลือกลูกค้า'}
                    required
                    disabled={!!selectedCustomer}
                    size="small"
                    InputProps={{
                      readOnly: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <BusinessIcon />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    label="ชื่อลูกค้า"
                    value={formData.cmName}
                    onChange={handleChange('cmName')}
                    error={!!errors.cmName}
                    helperText={errors.cmName || 'จะถูกกรอกอัตโนมัติเมื่อเลือกลูกค้า'}
                    required
                    disabled={!!selectedCustomer}
                    size="small"
                    InputProps={{
                      readOnly: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      ),
                    }}
                  />

                 <TextField
                    fullWidth
                    label="เบอร์โทรศัพท์"
                    value={formData.cmPhone}
                    onChange={handleChange('cmPhone')}
                    error={!!errors.cmPhone}
                    helperText={errors.cmPhone}
                    disabled={!!selectedCustomer}
                    size="small"
                    InputProps={{
                      readOnly: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <TextField
                  fullWidth
                  label="ที่อยู่"
                  value={formData.cmAddress}
                  onChange={handleChange('cmAddress')}
                  multiline
                  rows={2}
                  size="small"
                  disabled={!!selectedCustomer}
                  InputProps={{
                    readOnly: true,
                    startAdornment: (
                      <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
                        <LocationIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 4 }} />



            {/* Location Information */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <LocationIcon color="info" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  ข้อมูลตำแหน่ง (GPS)
                </Typography>
              </Box>

              {/* Geocoding Section */}
              <Box sx={{ mb: 2 }}>
                <AddressGeocoder
                  companyName={formData.cmName}
                  address={formData.cmAddress}
                  onLocationSelect={handleLocationSelect}
                  disabled={!formData.cmAddress?.trim()}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  label="ละติจูด (Latitude)"
                  value={formData.lat}
                  onChange={handleLocationChange('lat')}
                  onWheel={handleNumberInputWheel}
                  error={!!errors.lat}
                  helperText={errors.lat || "ตัวอย่าง: 13.7563471 หรือใช้ปุ่มค้นหาพิกัดด้านบน"}
                  type="number"
                  size="small"
                  inputProps={{ 
                    step: "any", 
                    min: "0", 
                    max: "90",
                    style: { textAlign: 'left' }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationIcon />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="ลองจิจูด (Longitude)"
                  value={formData.long}
                  onChange={handleLocationChange('long')}
                  onWheel={handleNumberInputWheel}
                  error={!!errors.long}
                  helperText={errors.long || "ตัวอย่าง: 100.5018347 หรือใช้ปุ่มค้นหาพิกัดด้านบน"}
                  type="number"
                  size="small"
                  inputProps={{ 
                    step: "any", 
                    min: "0", 
                    max: "180",
                    style: { textAlign: 'left' }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationIcon />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="ระยะทาง (กิโลเมตร)"
                  value={formData.cmMileage}
                  onChange={handleChange('cmMileage')}
                  onWheel={handleNumberInputWheel}
                  error={!!errors.cmMileage}
                  helperText={errors.cmMileage || "จะคำนวณอัตโนมัติเมื่อกรอก lat, long ครบถ้วน หรือกรอกเองได้"}
                  type="number"
                  size="small"
                  inputProps={{ step: "0.1", min: "0" }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MileageIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>


            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Remark */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <NotesIcon color="warning" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  หมายเหตุ
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="หมายเหตุ"
                value={formData.cmRemark}
                onChange={handleChange('cmRemark')}
                multiline
                rows={3}
                size="small"
                placeholder="กรอกหมายเหตุเพิ่มเติม..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
                      <NotesIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Action Buttons */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              justifyContent: 'flex-end',
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'grey.200'
            }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={loading}
                sx={{ minWidth: 120 }}
              >
                ยกเลิก
              </Button>
              
              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={loading}
                sx={{ minWidth: 120 }}
              >
                {loading ? 'กำลังอัพเดท...' : 'อัพเดท'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Layout>
  );
}

export default EditCustomerPage;

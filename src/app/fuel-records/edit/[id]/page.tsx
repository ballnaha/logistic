'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Divider,
  Alert,
  Autocomplete,
  Avatar,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as BackIcon,
  LocalGasStation as FuelIcon,
  DirectionsCar as CarIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { th } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Layout from '../../../components/Layout';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
// Interfaces
interface Driver {
  id: number;
  driverName: string;
  driverLicense: string;
  driverImage?: string;
}

interface Vehicle {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
  vehicleType: string;
  fuelTank: number;
  carImage?: string;
  mainDriver?: Driver | null;
  backupDriver?: Driver | null;
}

interface FuelRecord {
  id: number;
  vehicleId: number;
  fuelDate: string;
  fuelAmount: number;
  odometer?: number;
  remark?: string;
  driverType: string;
  driverName: string;
  driverLicense?: string;
}

interface FormData {
  vehicle: Vehicle | null;
  selectedDriver: 'main' | 'backup' | 'other' | null;
  fuelDate: Date | null;
  fuelAmount: string;
  odometer: string;
  remark: string;
  alternativeDriver: Driver | null;
}

export default function EditFuelRecord() {
  const router = useRouter();
  const { id } = useParams();
  const { showSnackbar } = useSnackbar();

  const [formData, setFormData] = useState<FormData>({
    vehicle: null,
    selectedDriver: null,
    fuelDate: new Date(),
    fuelAmount: '',
    odometer: '',
    remark: '',
    alternativeDriver: null
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
 

  // Refs
  const vehicleRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const fuelAmountRef = useRef<HTMLDivElement>(null);

  // Fetch data
  const fetchData = async () => {
    try {
      const [fuelResponse, vehiclesRes, driversRes] = await Promise.all([
        fetch(`/api/fuel-records/${id}`),
        fetch('/api/vehicles?status=active&limit=1000'),
        fetch('/api/drivers/options?activeOnly=true')
      ]);
      
      const fuelResult = await fuelResponse.json();
      const vehiclesData = await vehiclesRes.json();
      const driversData = await driversRes.json();

      if (fuelResponse.ok) {
        // Support both { fuelRecord: {...} } and { data: {...} }
        const rawRecord = fuelResult?.fuelRecord || fuelResult?.data;
        if (!rawRecord) {
          showSnackbar('รูปแบบข้อมูลการเติมน้ำมันไม่ถูกต้อง', 'error');
          setLoading(false);
          return;
        }
        const fuelRecord: FuelRecord = rawRecord;
        console.log('✅ Fuel record loaded:', fuelRecord);
        console.log('✅ Driver type:', fuelRecord.driverType);
        console.log('✅ Driver license:', fuelRecord.driverLicense);
        
        if (vehiclesRes.ok) {
          console.log('✅ Vehicles data loaded:', vehiclesData);
          // API returns { success: true, data: vehicles[] }
          const vehiclesList = vehiclesData?.success && vehiclesData?.data ? vehiclesData.data : [];
          setVehicles(Array.isArray(vehiclesList) ? vehiclesList : []);
          console.log('✅ Vehicles set to state:', vehiclesList.length, 'vehicles');
        } else {
          const errorText = await vehiclesRes.text();
          console.error('❌ Failed to load vehicles:', vehiclesRes.status, errorText);
          showSnackbar('ไม่สามารถโหลดข้อมูลรถได้', 'error');
        }
        
        if (driversRes.ok) {
          console.log('✅ Drivers data loaded:', driversData);
          // API returns { drivers: [...] }
          const driversList = driversData?.drivers || [];
          setAllDrivers(Array.isArray(driversList) ? driversList : []);
          console.log('✅ Drivers set to state:', driversList.length, 'drivers');
        } else {
          const errorText = await driversRes.text();
          console.error('❌ Failed to load drivers:', driversRes.status, errorText);
          showSnackbar('ไม่สามารถโหลดข้อมูลคนขับได้', 'error');
        }

        // Find the vehicle for this record
        const vehiclesList = vehiclesData?.success && vehiclesData?.data ? vehiclesData.data : [];
        const selectedVehicle = vehiclesList.find((v: Vehicle) => v.id === fuelRecord.vehicleId);
        
        if (selectedVehicle) {
          // Find alternative driver if driverType is 'other'
          let alternativeDriver = null;
          if (fuelRecord.driverType === 'other') {
            const driversList = driversData?.drivers || [];
            // Try to find by license first, then by name
            if (fuelRecord.driverLicense) {
              alternativeDriver = driversList.find((driver: Driver) => 
                driver.driverLicense === fuelRecord.driverLicense
              ) || null;
            }
            if (!alternativeDriver && fuelRecord.driverName) {
              alternativeDriver = driversList.find((driver: Driver) => 
                driver.driverName === fuelRecord.driverName
              ) || null;
            }
            console.log('✅ Alternative driver found:', alternativeDriver);
            console.log('✅ Searched by license:', fuelRecord.driverLicense);
            console.log('✅ Searched by name:', fuelRecord.driverName);
          }

          setFormData({
            vehicle: selectedVehicle,
            fuelDate: new Date(fuelRecord.fuelDate),
            fuelAmount: fuelRecord.fuelAmount.toString(),
            odometer: fuelRecord.odometer?.toString() || '',
            remark: fuelRecord.remark || '',
            selectedDriver: fuelRecord.driverType as 'main' | 'backup' | 'other',
            alternativeDriver: alternativeDriver,
          });
        }
      } else {
        showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลการเติมน้ำมัน', 'error');
        router.push('/fuel-records');
        return;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
      setVehicles([]);
      setAllDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter alternative drivers
  const getFilteredAlternativeDrivers = () => {
    if (!formData.vehicle || !Array.isArray(allDrivers) || !allDrivers.length) {
      return [];
    }
    
    try {
      const excludedLicenses = [
        formData.vehicle.mainDriver?.driverLicense,
        formData.vehicle.backupDriver?.driverLicense
      ].filter(Boolean);
      
      return allDrivers.filter(driver => 
        driver && driver.driverLicense && !excludedLicenses.includes(driver.driverLicense)
      );
    } catch (error) {
      console.error('Error filtering alternative drivers:', error);
      return [];
    }
  };

  // Handle form changes
  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear selected driver when vehicle changes
    if (field === 'vehicle') {
      setFormData(prev => ({ 
        ...prev, 
        [field]: value,
        selectedDriver: null,
        alternativeDriver: null
      }));
    }
  };

  // Get image URL - Production compatible
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    
    // If already an HTTP URL, return as is
    if (imagePath.startsWith('http')) return imagePath;
    
    // If it's a blob URL (preview), return as is
    if (imagePath.startsWith('blob:')) return imagePath;
    
    // Build the uploads path
    let cleanPath = imagePath.replace(/^\/+/, '');
    
    // Ensure path starts with uploads/
    if (!cleanPath.startsWith('uploads/')) {
      cleanPath = `uploads/${cleanPath}`;
    }
    
    const fullPath = `/${cleanPath}`;
    
    // In production, serve images through API to avoid static file issues
    if (process.env.NODE_ENV === 'production') {
      return `/api/serve-image?path=${encodeURIComponent(fullPath)}`;
    }
    
    return fullPath;
  };

  // Handle submit
  const handleSubmit = async () => {
    // Validation
    if (!formData.vehicle) {
      showSnackbar('กรุณาเลือกรถ', 'error');
      return;
    }

    if (!formData.selectedDriver) {
      showSnackbar('กรุณาเลือกคนขับ', 'error');
      return;
    }

    if (formData.selectedDriver === 'other' && !formData.alternativeDriver) {
      showSnackbar('กรุณาเลือกคนขับแทน', 'error');
      return;
    }

    if (!formData.fuelDate) {
      showSnackbar('กรุณาเลือกวันที่', 'error');
      return;
    }

    if (!formData.fuelAmount) {
      showSnackbar('กรุณากรอกปริมาณน้ำมัน', 'error');
      return;
    }

    if (parseFloat(formData.fuelAmount) <= 0) {
      showSnackbar('ปริมาณน้ำมันต้องมากกว่า 0', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/fuel-records/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: formData.vehicle.id,
          fuelDate: formData.fuelDate?.toISOString(),
          fuelAmount: parseFloat(formData.fuelAmount),
          odometer: formData.odometer ? parseInt(formData.odometer) : null,
          remark: formData.remark || null,
          driverType: formData.selectedDriver,
          driverName: formData.selectedDriver === 'main' 
            ? formData.vehicle.mainDriver?.driverName 
            : formData.selectedDriver === 'backup'
            ? formData.vehicle.backupDriver?.driverName
            : formData.alternativeDriver?.driverName,
          driverLicense: formData.selectedDriver === 'main'
            ? formData.vehicle.mainDriver?.driverLicense
            : formData.selectedDriver === 'backup'
            ? formData.vehicle.backupDriver?.driverLicense
            : formData.alternativeDriver?.driverLicense,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar('อัปเดตข้อมูลการเติมน้ำมันเรียบร้อยแล้ว', 'success');
        router.push('/fuel-records');
      } else {
        showSnackbar(result.message || 'ไม่สามารถอัปเดตข้อมูลได้', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout showSidebar={false}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
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
              <FuelIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                แก้ไขการเติมน้ำมัน
              </Typography>

            </Box>            
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              onClick={() => router.push('/fuel-records')}
              size="small"
            >
              กลับ
            </Button>
          </Box>

          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* 4-Column Layout: Vehicle, Main Driver, Backup Driver, Alternative Driver */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { 
                  xs: '1fr', 
                  sm: formData.vehicle ? '1fr 1fr' : '1fr',
                  md: formData.vehicle ? '1fr 1fr 1fr' : '1fr',
                  lg: formData.vehicle ? '1fr 1fr 1fr 1fr' : '1fr'
                },
                gap: 2,
                alignItems: 'flex-start'
              }}>
                {/* Vehicle Selection */}
                <Box ref={vehicleRef}>
                  <Typography variant="subtitle2" sx={{ 
                    mb: 1.5, 
                    fontWeight: 600,
                    color: 'text.primary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <CarIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                    เลือกรถ *
                  </Typography>
                  {loading && (
                    <Typography variant="caption" color="primary.main" sx={{ mb: 0.5, display: 'block' }}>
                      🔄 กำลังโหลดข้อมูลรถ...
                    </Typography>
                  )}

                  {!loading && vehicles.length === 0 && (
                    <Typography variant="caption" color="error.main" sx={{ mb: 0.5, display: 'block' }}>
                      ❌ ไม่พบรถในระบบ
                    </Typography>
                  )}
                  <Autocomplete
                    options={vehicles || []}
                    value={formData.vehicle}
                    onChange={(_, newValue) => handleChange('vehicle', newValue)}
                    getOptionLabel={(option) => {
                      if (!option) return '';
                      return `${option.licensePlate || 'ไม่มีทะเบียน'} - ${option.brand} ${option.model || ''}`;
                    }}
                    filterOptions={(options, { inputValue }) => {
                      if (!Array.isArray(options)) return [];
                      return options.filter((option) => {
                        const searchText = inputValue.toLowerCase();
                        const licensePlate = option.licensePlate?.toLowerCase() || '';
                        const brand = option.brand?.toLowerCase() || '';
                        const model = option.model?.toLowerCase() || '';
                        const driverName = option.mainDriver?.driverName?.toLowerCase() || '';
                        const backupDriverName = option.backupDriver?.driverName?.toLowerCase() || '';
                        
                        return (
                          licensePlate.includes(searchText) ||
                          brand.includes(searchText) ||
                          model.includes(searchText) ||
                          driverName.includes(searchText) ||
                          backupDriverName.includes(searchText)
                        );
                      });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="พิมพ์ทะเบียนรถ, ยี่ห้อ, รุ่น หรือชื่อคนขับ..."
                        required
                        autoFocus
                        size="small"
                        sx={{
                          '& .MuiInputBase-root': {
                            height: '56px',
                            borderRadius: 2,
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'grey.200',
                            '&:hover': {
                              borderColor: 'primary.main'
                            },
                            '&.Mui-focused': {
                              borderColor: 'primary.main',
                              boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.1)'
                            }
                          },
                          '& .MuiOutlinedInput-notchedOutline': {
                            border: 'none'
                          }
                        }}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <CarIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box component="li" key={key} {...otherProps}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {option.licensePlate || 'ไม่มีทะเบียน'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.vehicleType} - {option.brand} {option.model} - {option.mainDriver?.driverName || 'ไม่มีคนขับ'} , {option.backupDriver?.driverName || 'ไม่มีคนขับรอง'}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    }}
                    loading={loading}
                    noOptionsText={loading ? "กำลังโหลดรถ..." : vehicles.length === 0 ? "ไม่มีรถในระบบ" : "ไม่พบรถที่ตรงกับการค้นหา"}
                    loadingText="กำลังโหลดรถ..."
                    clearText="ล้าง"
                    openText="เปิด"
                    closeText="ปิด"
                  />
                </Box>

                {/* Main Driver Selection */}
                {formData.vehicle && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ 
                      mb: 1.5, 
                      fontWeight: 600,
                      color: 'text.primary',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                     
                      คนขับหลัก
                    </Typography>
                    
                    {formData.vehicle.mainDriver ? (
                      <Paper
                        onClick={() => {
                          // Disable clicking if alternative driver is selected
                          if (formData.alternativeDriver) return;
                          
                          const newValue = formData.selectedDriver === 'main' ? null : 'main';
                          setFormData(prev => ({ 
                            ...prev, 
                            selectedDriver: newValue,
                            // Clear alternative driver when selecting main driver
                            alternativeDriver: newValue === 'main' ? null : prev.alternativeDriver
                          }));
                        }}
                        sx={{
                          p: 2,
                          cursor: formData.alternativeDriver ? 'not-allowed' : 'pointer',
                          border: '2px solid',
                          borderColor: formData.selectedDriver === 'main' ? 'primary.main' : 'grey.200',
                          bgcolor: formData.selectedDriver === 'main' ? 'primary.50' : 'background.paper',
                          borderRadius: 2,
                          transition: 'all 0.2s ease-in-out',
                          height: '56px',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: formData.alternativeDriver ? 0.5 : 1,
                          '&:hover': {
                            borderColor: formData.alternativeDriver ? 'grey.200' : 'primary.main',
                            transform: formData.alternativeDriver ? 'none' : 'translateY(-1px)',
                            boxShadow: formData.alternativeDriver ? 'none' : '0 4px 12px rgba(0,0,0,0.1)'
                          },
                          ...(formData.selectedDriver === 'main' && {
                            boxShadow: '0 4px 16px rgba(25, 118, 210, 0.2)'
                          })
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                          <Avatar
                            src={getImageUrl(formData.vehicle.mainDriver.driverImage || '')}
                            sx={{ 
                              width: 36, 
                              height: 36,
                              border: '2px solid',
                              borderColor: formData.selectedDriver === 'main' ? 'primary.main' : 'grey.300'
                            }}
                          >
                            {formData.vehicle.mainDriver.driverName.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 600,
                                color: formData.selectedDriver === 'main' ? 'primary.main' : 'text.primary',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontSize: '0.875rem'
                              }}
                            >
                              {formData.vehicle.mainDriver.driverName}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: formData.selectedDriver === 'main' ? 'primary.main' : 'text.secondary',
                                fontWeight: 500,
                                fontSize: '0.75rem'
                              }}
                            >
                              คนขับหลัก
                            </Typography>
                          </Box>
                          {formData.selectedDriver === 'main' && (
                            <Box sx={{ 
                              width: 22, 
                              height: 22, 
                              borderRadius: '50%', 
                              bgcolor: 'primary.main',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Typography variant="caption" sx={{ color: 'white', fontSize: '0.7rem' }}>
                                ✓
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Paper>
                    ) : (
                      <Paper sx={{
                        p: 2,
                        border: '2px dashed',
                        borderColor: 'grey.300',
                        bgcolor: 'grey.50',
                        borderRadius: 2,
                        height: '56px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          ไม่มีคนขับหลัก
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                )}

                {/* Backup Driver Selection */}
                {formData.vehicle && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ 
                      mb: 1.5, 
                      fontWeight: 600,
                      color: 'text.primary',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                     
                      คนขับรอง
                    </Typography>
                    
                    {formData.vehicle.backupDriver ? (
                      <Paper
                        onClick={() => {
                          // Disable clicking if alternative driver is selected
                          if (formData.alternativeDriver) return;
                          
                          const newValue = formData.selectedDriver === 'backup' ? null : 'backup';
                          setFormData(prev => ({ 
                            ...prev, 
                            selectedDriver: newValue,
                            // Clear alternative driver when selecting backup driver
                            alternativeDriver: newValue === 'backup' ? null : prev.alternativeDriver
                          }));
                        }}
                        sx={{
                          p: 2,
                          cursor: formData.alternativeDriver ? 'not-allowed' : 'pointer',
                          border: '2px solid',
                          borderColor: formData.selectedDriver === 'backup' ? 'primary.main' : 'grey.200',
                          bgcolor: formData.selectedDriver === 'backup' ? 'primary.50' : 'background.paper',
                          borderRadius: 2,
                          transition: 'all 0.2s ease-in-out',
                          height: '56px',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: formData.alternativeDriver ? 0.5 : 1,
                          '&:hover': {
                            borderColor: formData.alternativeDriver ? 'grey.200' : 'primary.main',
                            transform: formData.alternativeDriver ? 'none' : 'translateY(-1px)',
                            boxShadow: formData.alternativeDriver ? 'none' : '0 4px 12px rgba(0,0,0,0.1)'
                          },
                          ...(formData.selectedDriver === 'backup' && {
                            boxShadow: '0 4px 16px rgba(25, 118, 210, 0.2)'
                          })
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                          <Avatar
                            src={getImageUrl(formData.vehicle.backupDriver.driverImage || '')}
                            sx={{ 
                              width: 36, 
                              height: 36,
                              border: '2px solid',
                              borderColor: formData.selectedDriver === 'backup' ? 'primary.main' : 'grey.300'
                            }}
                          >
                            {formData.vehicle.backupDriver.driverName.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 600,
                                color: formData.selectedDriver === 'backup' ? 'primary.main' : 'text.primary',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontSize: '0.875rem'
                              }}
                            >
                              {formData.vehicle.backupDriver.driverName}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: formData.selectedDriver === 'backup' ? 'primary.main' : 'text.secondary',
                                fontWeight: 500,
                                fontSize: '0.75rem'
                              }}
                            >
                              คนขับรอง
                            </Typography>
                          </Box>
                          {formData.selectedDriver === 'backup' && (
                            <Box sx={{ 
                              width: 22, 
                              height: 22, 
                              borderRadius: '50%', 
                              bgcolor: 'primary.main',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Typography variant="caption" sx={{ color: 'white', fontSize: '0.7rem' }}>
                                ✓
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Paper>
                    ) : (
                      <Paper sx={{
                        p: 2,
                        border: '2px dashed',
                        borderColor: 'grey.300',
                        bgcolor: 'grey.50',
                        borderRadius: 2,
                        height: '56px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          ไม่มีคนขับรอง
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                )}

                {/* Alternative Driver Selection - Always show when vehicle is selected */}
                {formData.vehicle && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ 
                      mb: 1.5, 
                      fontWeight: 600,
                      color: 'text.primary',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      
                      คนขับแทน
                    </Typography>
                    
                    <Autocomplete
                      fullWidth
                      size="small"
                      disabled={formData.selectedDriver === 'main' || formData.selectedDriver === 'backup'}
                      options={getFilteredAlternativeDrivers()}
                      getOptionLabel={(option) => `${option.driverName}`}
                      value={formData.alternativeDriver}
                      onChange={(_, newValue) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          alternativeDriver: newValue,
                          selectedDriver: newValue ? 'other' : null
                        }));
                      }}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          label="" 
                          size="small"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              height: '56px',
                              
                              
                            }
                          }}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <InputAdornment position="start">
                                {formData.alternativeDriver ? (
                                  <Avatar
                                    src={getImageUrl(formData.alternativeDriver.driverImage || '')}
                                    sx={{ 
                                      width: 28, 
                                      height: 28,
                                      bgcolor: 'success.main',
                                      color: 'white',
                                      fontSize: '0.7rem',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {formData.alternativeDriver.driverName.charAt(0).toUpperCase()}
                                  </Avatar>
                                ) : (
                                  <Box sx={{ 
                                    width: 28, 
                                    height: 28, 
                                    borderRadius: '50%', 
                                    bgcolor: 'grey.200',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                      👤
                                    </Typography>
                                  </Box>
                                )}
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                      renderOption={(props, option) => {
                        const { key, ...otherProps } = props;
                        return (
                          <Box component="li" key={key} {...otherProps} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1 }}>
                            <Avatar
                              src={getImageUrl(option.driverImage || '')}
                              sx={{ 
                                width: 32, 
                                height: 32,
                                bgcolor: 'success.main',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                              }}
                            >
                              {option.driverName.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
                                {option.driverName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                ใบขับขี่: {option.driverLicense}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      }}
                      isOptionEqualToValue={(option, value) => option.id === value?.id}
                      noOptionsText={getFilteredAlternativeDrivers().length === 0 ? "ไม่มีคนขับแทนให้เลือก" : "ไม่พบคนขับ"}
                    />
                    
                    
                    {getFilteredAlternativeDrivers().length === 0 && allDrivers.length > 0 && formData.selectedDriver !== 'main' && formData.selectedDriver !== 'backup' && (
                      <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, fontSize: '0.7rem', fontStyle: 'italic', display: 'block' }}>
                        💡 คนขับทั้งหมดเป็นคนขับของรถนี้แล้ว
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>

              {/* Show message when no vehicle selected */}
              {!formData.vehicle && (
                <Box sx={{ 
                  textAlign: 'center', 
                  py: 3,
                  color: 'text.secondary'
                }}>
                  <Typography variant="body2">
                    กรุณาเลือกรถก่อนเพื่อดูตัวเลือกคนขับ
                  </Typography>
                </Box>
              )}

              {/* Vehicle Info Display */}
              {formData.vehicle && (
                <Box sx={{ 
                  p: 2.5,
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                    ข้อมูลรถที่เลือก:
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: '1fr',
                      md: '250px 1fr'
                    },
                    gap: { xs: 2, sm: 2.5, md: 3 }
                  }}>
                    {/* Images Section */}
                    <Box sx={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      alignItems: 'center'
                    }}>
                      {/* Car Image - Always on top */}
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem' }}>
                          รูปรถ
                        </Typography>
                        <Avatar
                          src={getImageUrl(formData.vehicle.carImage || '')}
                          variant="rounded"
                          sx={{
                            width: 100,
                            height: 75,
                            bgcolor: 'grey.200',
                            border: '2px solid',
                            borderColor: 'grey.300',
                            borderRadius: 2
                          }}
                        >
                          <CarIcon sx={{ fontSize: 24, color: 'grey.500' }} />
                        </Avatar>
                      </Box>

                      {/* Drivers Images - Horizontal Row */}
                      <Box sx={{ 
                        display: 'grid',
                        gridTemplateColumns: formData.selectedDriver === 'other' ? '1fr 1fr 1fr' : '1fr 1fr',
                        gap: 1.5,
                        justifyItems: 'center',
                        width: '100%'
                      }}>
                        {/* Main Driver Image */}
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="caption" color={formData.selectedDriver === 'main' ? 'primary.main' : 'text.secondary'} sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem', fontWeight: formData.selectedDriver === 'main' ? 600 : 400 }}>
                            คนขับหลัก {formData.selectedDriver === 'main' ? '✓' : ''}
                          </Typography>
                          <Avatar
                            src={getImageUrl(formData.vehicle.mainDriver?.driverImage || '')}
                            sx={{
                              width: 55,
                              height: 55,
                              bgcolor: formData.selectedDriver === 'main' ? 'primary.light' : 'grey.200',
                              border: formData.selectedDriver === 'main' ? '3px solid' : '1px solid',
                              borderColor: formData.selectedDriver === 'main' ? 'primary.main' : 'grey.300',
                              fontSize: '0.9rem',
                              boxShadow: formData.selectedDriver === 'main' ? '0 2px 8px rgba(25, 118, 210, 0.3)' : 'none'
                            }}
                          >
                            {formData.vehicle.mainDriver?.driverName ? 
                              formData.vehicle.mainDriver.driverName.charAt(0).toUpperCase() : 
                              '👤'
                            }
                          </Avatar>
                         
                        </Box>

                        {/* Backup Driver Image */}
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="caption" color={formData.selectedDriver === 'backup' ? 'primary.main' : 'text.secondary'} sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem', fontWeight: formData.selectedDriver === 'backup' ? 600 : 400 }}>
                            คนขับรอง {formData.selectedDriver === 'backup' ? '✓' : ''}
                          </Typography>
                          <Avatar
                            src={getImageUrl(formData.vehicle.backupDriver?.driverImage || '')}
                            sx={{
                              width: 55,
                              height: 55,
                              bgcolor: formData.selectedDriver === 'backup' ? 'primary.light' : 'grey.200',
                              border: formData.selectedDriver === 'backup' ? '3px solid' : '1px solid',
                              borderColor: formData.selectedDriver === 'backup' ? 'primary.main' : 'grey.300',
                              fontSize: '0.9rem',
                              boxShadow: formData.selectedDriver === 'backup' ? '0 2px 8px rgba(25, 118, 210, 0.3)' : 'none'
                            }}
                          >
                            {formData.vehicle.backupDriver?.driverName ? 
                              formData.vehicle.backupDriver.driverName.charAt(0).toUpperCase() : 
                              '👤'
                            }
                          </Avatar>
                          
                        </Box>

                        {/* Alternative Driver Image */}
                        {formData.selectedDriver === 'other' && formData.alternativeDriver && (
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="success.main" sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>
                              คนขับแทน
                            </Typography>
                            <Avatar
                              src={getImageUrl(formData.alternativeDriver.driverImage || '')}
                              sx={{
                                width: 55,
                                height: 55,
                                bgcolor: 'success.light',
                                border: '3px solid',
                                borderColor: 'success.main',
                                fontSize: '0.9rem',
                                boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
                              }}
                            >
                              {formData.alternativeDriver.driverName.charAt(0).toUpperCase()}
                            </Avatar>
                            
                          </Box>
                        )}
                      </Box>
                    </Box>
                    
                    {/* Vehicle Info Section */}
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { 
                        xs: '1fr 1fr', 
                        sm: formData.selectedDriver === 'other' ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr',
                        md: formData.selectedDriver === 'other' ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr'
                      }, 
                      gap: { xs: 1.5, sm: 2 },
                      alignContent: 'start'
                    }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          ทะเบียนรถ
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                          {formData.vehicle.licensePlate || 'ไม่มีทะเบียน'}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          ยี่ห้อ/รุ่น
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                          {formData.vehicle.brand} {formData.vehicle.model || ''}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          ประเภทรถ
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                          {formData.vehicle.vehicleType === 'ForkLift' ? 'รถโฟล์คลิฟท์' :
                           formData.vehicle.vehicleType === 'Pickup' ? 'รถกระบะ' :
                           formData.vehicle.vehicleType === 'Truck' ? 'รถบรรทุก' :
                           formData.vehicle.vehicleType || '-'}
                        </Typography>
                      </Box>

                      {/* Fuel Tank Capacity - Always last */}
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          ความจุถัง
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                          {formData.vehicle.fuelTank || '-'} ลิตร
                        </Typography>
                      </Box>

                      {/* Driver Information Row */}
                      <Box>
                        <Typography variant="caption" color={formData.selectedDriver === 'main' ? 'primary.main' : 'text.secondary'} sx={{ fontSize: '0.7rem', fontWeight: formData.selectedDriver === 'main' ? 600 : 400 }}>
                          คนขับหลัก {formData.selectedDriver === 'main' ? '✓' : ''}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: formData.selectedDriver === 'main' ? 600 : 500, fontSize: '0.875rem', color: formData.selectedDriver === 'main' ? 'primary.main' : 'inherit' }}>
                          {formData.vehicle.mainDriver?.driverName || 'ไม่มีคนขับ'}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color={formData.selectedDriver === 'backup' ? 'primary.main' : 'text.secondary'} sx={{ fontSize: '0.7rem', fontWeight: formData.selectedDriver === 'backup' ? 600 : 400 }}>
                          คนขับรอง {formData.selectedDriver === 'backup' ? '✓' : ''}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: formData.selectedDriver === 'backup' ? 600 : 500, fontSize: '0.875rem', color: formData.selectedDriver === 'backup' ? 'primary.main' : 'inherit' }}>
                          {formData.vehicle.backupDriver?.driverName || 'ไม่มีคนขับรอง'}
                        </Typography>
                      </Box>

                      {/* Alternative Driver Info - Always show as third column when selected */}
                      {formData.selectedDriver === 'other' && formData.alternativeDriver && (
                        <Box>
                          <Typography variant="caption" color="success.main" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                            คนขับแทน ✓
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'success.main' }}>
                            {formData.alternativeDriver.driverName}
                          </Typography>
                          
                        </Box>
                      )}

                      
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Form Fields Grid */}
              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                gap: 2
              }}>
                <Box ref={dateRef}>
                  <DatePicker
                    label="วันที่เติมน้ำมัน *"
                    value={formData.fuelDate}
                    onChange={(date) => handleChange('fuelDate', date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        size: 'small',
                        InputProps: formData.fuelDate ? {
                          endAdornment: (
                            <Button
                              onClick={() => handleChange('fuelDate', null)}
                              size="small"
                              sx={{
                                minWidth: 0,
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                lineHeight: 1,
                                fontWeight: 'bold',
                                bgcolor: 'grey.200',
                                color: 'grey.700',
                                '&:hover': { bgcolor: 'grey.300' },
                                fontSize: 14,
                                p: 0
                              }}
                            >
                              x
                            </Button>
                          )
                        } : undefined
                      },
                    }}
                  />
                </Box>
                
                <Box ref={fuelAmountRef}>
                  <TextField
                    label="ปริมาณน้ำมัน *"
                    value={formData.fuelAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        handleChange('fuelAmount', value);
                      }
                    }}
                    type="text"
                    required
                    fullWidth
                    size="small"
                    inputProps={{ inputMode: 'decimal' }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ลิตร</InputAdornment>,
                    }}
                  />
                </Box>

                <Box>
                  <TextField
                    label="เลขไมล์"
                    value={formData.odometer}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d+$/.test(value)) {
                        handleChange('odometer', value);
                      }
                    }}
                    type="text"
                    fullWidth
                    size="small"
                    inputProps={{ inputMode: 'numeric' }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">กม.</InputAdornment>,
                    }}
                  />
                </Box>
              </Box>

              {/* Remark Field */}
              <Box>
                <TextField
                  label="หมายเหตุ"
                  value={formData.remark}
                  onChange={(e) => handleChange('remark', e.target.value)}
                  fullWidth
                  size="medium"
                  multiline
                  rows={2}
                  placeholder="หมายเหตุเพิ่มเติม..."
                />
              </Box>

              {/* Submit Buttons */}
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                justifyContent: 'flex-end', 
                mt: 3,
                pt: 2.5,
                borderTop: '1px solid',
                borderColor: 'divider'
              }}>
                <Button
                  variant="outlined"
                  onClick={() => router.push('/fuel-records')}
                  disabled={submitting}
                  size="medium"
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={submitting}
                  size="medium"
                  startIcon={submitting ? <CircularProgress size={16} /> : <SaveIcon />}
                >
                  {submitting ? 'กำลังอัปเดต...' : 'อัปเดตข้อมูล'}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      </LocalizationProvider>
    </Layout>
  );
}
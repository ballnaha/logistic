'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  InputAdornment,
  CircularProgress,
  Divider,
  Autocomplete,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { th } from 'date-fns/locale';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  ArrowBack as BackIcon,
  Assessment as AssessmentIcon,
  AttachMoney as MoneyIcon,
  LocalShipping as TruckIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  CalendarToday as CalendarIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import { useSnackbar } from '../../../contexts/SnackbarContext';

interface VendorOption {
  code: string;
  name: string;
  fullName: string;
  address: string;
  group: string;
  purchaseOrg: string;
  email: string;
  telephone: string;
}

interface FormData {
  contractorName: string; // ชื่อผู้รับจ้างช่วง
  vehiclePlate: string; // ทะเบียนรถ
  evaluationDate: Date | null; // วันที่ประเมิน
  evaluationTime: Date | null; // เวลาที่ประเมิน
  site: string; // psc หรือ ps
  driverCooperation: string; // 1-4
  vehicleCondition: string; // 0 or 3
  damageFound: string; // yes or no
  damageValue: string; // ถ้าพบปัญหา
  remark: string;
}

export default function AddEvaluationPage() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { data: session } = useSession();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    contractorName: '',
    vehiclePlate: '',
    evaluationDate: new Date(),
    evaluationTime: new Date(), // Default เป็นเวลาปัจจุบัน
    site: '',
    driverCooperation: '',
    vehicleCondition: '',
    damageFound: '',
    damageValue: '',
    remark: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [licensePlateFormatValid, setLicensePlateFormatValid] = useState(true);
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorOption | null>(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [searchResults, setSearchResults] = useState<VendorOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [damageScore, setDamageScore] = useState<number | null>(null);
  
  // Pagination states
  const [vendorPage, setVendorPage] = useState(1);
  const [vendorHasMore, setVendorHasMore] = useState(true);
  const [vehicleHistory, setVehicleHistory] = useState<{
    damageCount: number;
    totalDamageValue: number;
    isLoadingHistory: boolean;
  }>({
    damageCount: 0,
    totalDamageValue: 0,
    isLoadingHistory: false
  });

  // Fetch vendor options with pagination
  const fetchVendors = async (page: number = 1, append: boolean = false) => {
    setVendorLoading(true);
    
    try {
      const response = await fetch(`/api/vendors/paginated?page=${page}&limit=100`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (append) {
          setVendorOptions(prev => [...prev, ...result.data]);
        } else {
          setVendorOptions(result.data || []);
        }
        
        setVendorHasMore(result.pagination?.hasMore || false);
        setVendorPage(page);
      } else {
        showSnackbar('ไม่สามารถดึงข้อมูลผู้รับจ้างช่วงได้', 'error');
      }
    } catch (error: any) {
      showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลผู้รับจ้างช่วง', 'error');
      console.error('Vendor fetch error:', error);
    } finally {
      setVendorLoading(false);
    }
  };

  // Load more vendors for infinite scroll
  const loadMoreVendors = () => {
    if (!vendorLoading && vendorHasMore) {
      fetchVendors(vendorPage + 1, true);
    }
  };

  // Initial vendor fetch
  useEffect(() => {
    fetchVendors();
  }, [showSnackbar]);

  // ตรวจสอบรูปแบบทะเบียนรถไทย
  const validateThaiLicensePlate = (licensePlate: string): boolean => {
    if (!licensePlate.trim()) return true; // อนุญาตให้ว่างเปล่า
    
    // รูปแบบทะเบียนรถไทย:
    // - 2-3 ตัวอักษร/ตัวเลข (ไทย, อังกฤษ, หรือตัวเลข) + เครื่องหมาย - + 1-4 ตัวเลข
    // เช่น กข-1234, abc-123, 12-3456, 123-4567, ก1-234
    const thaiLicensePattern = /^[ก-๙a-zA-Z0-9]{2,3}-\d{1,4}$/;
    return thaiLicensePattern.test(licensePlate.trim());
  };

  // ตรวจสอบรูปแบบทะเบียนรถเมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.vehiclePlate) {
        const isFormatValid = validateThaiLicensePlate(formData.vehiclePlate);
        setLicensePlateFormatValid(isFormatValid);
      } else {
        setLicensePlateFormatValid(true);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [formData.vehiclePlate]);

  // Search vendors real-time
  const searchVendors = async (searchTerm: string) => {
    setVendorSearch(searchTerm);
    
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/vendors/search?q=${encodeURIComponent(searchTerm)}&limit=20`);
      if (response.ok) {
        const result = await response.json();
        setSearchResults(result.data);
      }
    } catch (error) {
      console.error('Error searching vendors:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const debouncedSearch = (searchTerm: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      searchVendors(searchTerm);
    }, 300);
    
    setSearchTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Clear vendor search
  const clearVendorSearch = () => {
    setVendorSearch('');
    setSearchResults([]);
    setIsSearching(false);
    // Reload vendors if needed
    if (vendorOptions.length === 0) {
      fetchVendors();
    }
  };

  // Handle vendor selection
  const handleVendorChange = (vendor: VendorOption | null) => {
    setSelectedVendor(vendor);
    if (vendor) {
      setFormData(prev => ({
        ...prev,
        contractorName: vendor.name,
      }));
      
      // Clear error
      setErrors(prev => ({
        ...prev,
        contractorName: '',
      }));
    } else {
      // เมื่อ clear vendor ให้ล้างการค้นหา
      setFormData(prev => ({
        ...prev,
        contractorName: '',
      }));
      clearVendorSearch();
    }
  };

  // ฟังก์ชันดึงประวัติความเสียหายของทะเบียนรถในปี/เดือนที่ประเมิน
  const fetchVehicleHistory = async (vehiclePlate: string, evaluationDate?: Date | null) => {
    if (!vehiclePlate.trim()) {
      setVehicleHistory({
        damageCount: 0,
        totalDamageValue: 0,
        isLoadingHistory: false
      });
      return;
    }
    
    setVehicleHistory(prev => ({ ...prev, isLoadingHistory: true }));
    
    try {
      const evalDate = evaluationDate || formData.evaluationDate || new Date();
      
      // คำนวณวันที่เริ่มต้นของเดือนที่ประเมิน
      const startOfMonth = new Date(evalDate.getFullYear(), evalDate.getMonth(), 1);
      
      const url = `/api/evaluation/vehicle-history?vehiclePlate=${encodeURIComponent(vehiclePlate)}&startDate=${startOfMonth.toISOString()}`;
      console.log('Fetching vehicle history from:', url);
      console.log('Evaluation month/year:', evalDate.getFullYear(), evalDate.getMonth() + 1);
      
      const response = await fetch(url);
      console.log('Vehicle history response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Vehicle history result:', result);
        
        // ข้อมูลจริงอยู่ใน result.data
        const data = result.data || {};
        
        // กรองเฉพาะข้อมูลในเดือน/ปีที่ประเมิน (ไม่นับรายการปัจจุบันถ้ามี)
        const evaluations = data.evaluations || [];
        const currentEvalMonth = evalDate.getMonth();
        const currentEvalYear = evalDate.getFullYear();
        
        const monthlyEvaluations = evaluations.filter((evaluation: any) => {
          const evalItemDate = new Date(evaluation.evaluationDate);
          return evalItemDate.getMonth() === currentEvalMonth && 
                 evalItemDate.getFullYear() === currentEvalYear;
        });
        
        const monthlyDamageCount = monthlyEvaluations.length;
        const monthlyTotalDamageValue = monthlyEvaluations.reduce((sum: number, evaluation: any) => {
          return sum + Number(evaluation.damageValue || 0);
        }, 0);
        
        setVehicleHistory({
          damageCount: monthlyDamageCount,
          totalDamageValue: monthlyTotalDamageValue,
          isLoadingHistory: false
        });
      } else {
        const errorText = await response.text();
        console.error('Vehicle history API error:', response.status, errorText);
        
        // ถ้าไม่มีข้อมูลหรือ API error ให้ใช้ค่าเริ่มต้น
        setVehicleHistory({
          damageCount: 0,
          totalDamageValue: 0,
          isLoadingHistory: false
        });
        
        // แสดง snackbar เฉพาะเมื่อมี error จริง ๆ (ไม่ใช่ 404)
        if (response.status !== 404) {
          showSnackbar('ไม่สามารถดึงประวัติทะเบียนรถได้', 'warning');
        }
      }
    } catch (error) {
      console.error('Error fetching vehicle history:', error);
      setVehicleHistory({
        damageCount: 0,
        totalDamageValue: 0,
        isLoadingHistory: false
      });
      showSnackbar('เกิดข้อผิดพลาดในการดึงประวัติทะเบียนรถ', 'warning');
    }
  };

  // ฟังก์ชันคำนวณคะแนนความเสียหาย
  const calculateDamageScore = () => {
    if (formData.damageFound === 'no') {
      return 3; // ไม่พบปัญหาได้ 3 คะแนน
    }
    
    if (formData.damageFound === 'yes') {
      const currentDamageValue = parseFloat(formData.damageValue) || 0;
      const totalDamageThisMonth = vehicleHistory.totalDamageValue + currentDamageValue;
      const totalDamageCount = vehicleHistory.damageCount + 1;
      
      // เงื่อนไข: มากกว่า 1 ครั้งต่อเดือน หรือ มากกว่า 300k ได้ 0 คะแนน
      if (totalDamageCount > 1 || totalDamageThisMonth > 300000) {
        return 0;
      }
      
      // เงื่อนไข: 1 ครั้งใน 1 เดือน และ ไม่เกิน 300k ได้ 1 คะแนน
      if (totalDamageCount === 1 && totalDamageThisMonth <= 300000) {
        return 1;
      }
    }
    
    return 0;
  };

  // Effect สำหรับคำนวณคะแนนเมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    const score = calculateDamageScore();
    setDamageScore(score);
  }, [formData.damageFound, formData.damageValue, vehicleHistory]);

  // Effect สำหรับดึงประวัติเมื่อทะเบียนรถหรือวันที่ประเมินเปลี่ยน
  useEffect(() => {
    console.log('Vehicle history effect triggered:', {
      vehiclePlate: formData.vehiclePlate,
      evaluationDate: formData.evaluationDate
    });
    
    if (formData.vehiclePlate.trim() && formData.evaluationDate) {
      console.log('Fetching history with both vehicle and date');
      fetchVehicleHistory(formData.vehiclePlate, formData.evaluationDate);
    } else if (formData.vehiclePlate.trim()) {
      // ถ้ายังไม่มีวันที่ประเมิน ให้ใช้วันปัจจุบัน
      console.log('Fetching history with vehicle and current date');
      fetchVehicleHistory(formData.vehiclePlate, new Date());
    } else {
      // Reset ประวัติเมื่อไม่มีทะเบียนรถ
      console.log('Resetting vehicle history');
      setVehicleHistory({
        damageCount: 0,
        totalDamageValue: 0,
        isLoadingHistory: false
      });
    }
  }, [formData.vehiclePlate, formData.evaluationDate]);

  // Handle input change
  const handleChange = (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    
    // สำหรับทะเบียนรถ: ตรวจสอบรูปแบบตามมาตรฐานไทย
    if (field === 'vehiclePlate') {
      // อนุญาตเฉพาะตัวอักษรไทย, อังกฤษ, ตัวเลข, เครื่องหมาย - และช่องว่าง
      const validInput = value.replace(/[^ก-๙a-zA-Z0-9\-\s]/g, '');
      setFormData(prev => ({
        ...prev,
        [field]: validInput
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Reset damage value if no damage found
    if (field === 'damageFound' && value === 'no') {
      setFormData(prev => ({
        ...prev,
        damageValue: ''
      }));
    }
  };

  // Handle date change
  const handleDateChange = (date: Date | null) => {
    setFormData(prev => ({
      ...prev,
      evaluationDate: date
    }));
    
    // Clear error when user selects date
    if (errors.evaluationDate) {
      setErrors(prev => ({
        ...prev,
        evaluationDate: ''
      }));
    }
  };

  // Handle time change
  const handleTimeChange = (time: Date | null) => {
    setFormData(prev => ({
      ...prev,
      evaluationTime: time
    }));
    
    // Clear error when user selects time
    if (errors.evaluationTime) {
      setErrors(prev => ({
        ...prev,
        evaluationTime: ''
      }));
    }
  };

  // Prevent scroll wheel on number inputs
  const handleNumberInputWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.site) {
      newErrors.site = 'กรุณาเลือก Plant';
    }

    if (!formData.contractorName.trim()) {
      newErrors.contractorName = 'กรุณากรอกชื่อผู้รับจ้างช่วง';
    }

    if (!formData.vehiclePlate.trim()) {
      newErrors.vehiclePlate = 'กรุณากรอกทะเบียนรถ';
    } else if (!licensePlateFormatValid) {
      newErrors.vehiclePlate = 'รูปแบบทะเบียนรถไม่ถูกต้อง (เช่น กข-1234, 12-3456)';
    }

    if (!formData.evaluationDate) {
      newErrors.evaluationDate = 'กรุณาเลือกวันที่ประเมิน';
    }

    if (!formData.evaluationTime) {
      newErrors.evaluationTime = 'กรุณาเลือกเวลาที่ประเมิน';
    }


    if (!formData.driverCooperation) {
      newErrors.driverCooperation = 'กรุณาเลือกระดับการให้ความร่วมมือของคนรถ';
    }

    if (!formData.vehicleCondition) {
      newErrors.vehicleCondition = 'กรุณาเลือกสภาพความพร้อมของรถขนส่ง';
    }

    if (!formData.damageFound) {
      newErrors.damageFound = 'กรุณาเลือกว่าพบปัญหาความเสียหายหรือไม่';
    }

    if (formData.damageFound === 'yes') {
      if (!formData.damageValue.trim()) {
        newErrors.damageValue = 'กรุณากรอกมูลค่าความเสียหาย';
      } else if (isNaN(parseFloat(formData.damageValue)) || parseFloat(formData.damageValue) < 0) {
        newErrors.damageValue = 'กรุณากรอกมูลค่าความเสียหายเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0';
      }
    }

    setErrors(newErrors);

    // แสดง snackbar สำหรับ validation errors
    if (Object.keys(newErrors).length > 0) {
      const errorMessages = Object.values(newErrors);
      if (newErrors.site) {
        showSnackbar('กรุณาเลือก Site (PSC หรือ PS)', 'error');
      } else if (newErrors.evaluationTime) {
        showSnackbar('กรุณาเลือกเวลาที่ประเมิน', 'error');
      } else {
        showSnackbar(errorMessages[0], 'error');
      }
    }

    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const driverCooperation = parseInt(formData.driverCooperation);
      const vehicleCondition = parseInt(formData.vehicleCondition);
      
      // เช็คว่าการแปลงข้อมูลถูกต้อง
      if (isNaN(driverCooperation) || isNaN(vehicleCondition)) {
        console.error('Invalid form data:', {
          driverCooperationRaw: formData.driverCooperation,
          vehicleConditionRaw: formData.vehicleCondition,
          driverCooperationParsed: driverCooperation,
          vehicleConditionParsed: vehicleCondition
        });
        showSnackbar('ข้อมูลการประเมินไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง', 'error');
        return;
      }

      // รวมวันที่และเวลาเป็น DateTime เดียว
      let combinedDateTime: Date;
      if (formData.evaluationDate && formData.evaluationTime) {
        // ใช้วันที่จาก evaluationDate และเวลาจาก evaluationTime
        combinedDateTime = new Date(formData.evaluationDate);
        combinedDateTime.setHours(formData.evaluationTime.getHours());
        combinedDateTime.setMinutes(formData.evaluationTime.getMinutes());
        combinedDateTime.setSeconds(0);
        combinedDateTime.setMilliseconds(0);
      } else {
        // Fallback ไปใช้ current datetime
        combinedDateTime = new Date();
      }

      const evaluationData = {
        contractorName: formData.contractorName,
        vehiclePlate: formData.vehiclePlate,
        site: formData.site,
        driverCooperation: driverCooperation,
        vehicleCondition: vehicleCondition,
        damageFound: formData.damageFound === 'yes',
        damageValue: formData.damageFound === 'yes' ? parseFloat(formData.damageValue) : 0,
        damageScore: damageScore || 0, // เพิ่มคะแนนความเสียหาย
        remark: formData.remark,
        evaluatedBy: session?.user?.name || '',
        evaluationDate: combinedDateTime.toISOString()
      };

      console.log('Evaluation data to send:', evaluationData);

      const response = await fetch('/api/evaluation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evaluationData),
      });

      if (!response.ok) {
        let errorMessage = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        
        console.error('API Error:', response.status, errorMessage);
        throw new Error(errorMessage);
      }

      showSnackbar('บันทึกแบบประเมินเรียบร้อยแล้ว', 'success');
      router.push('/evaluation');
    } catch (error: any) {
      console.error('Error saving evaluation:', error);
      showSnackbar(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push('/evaluation');
  };

  const getDriverCooperationLabel = (value: string) => {
    switch (value) {
      case '4': return 'ดีมาก';
      case '3': return 'ดี';
      case '2': return 'ปานกลาง';
      case '1': return 'ไม่ดี';
      default: return '';
    }
  };

  const getVehicleConditionLabel = (value: string) => {
    switch (value) {
      case '3': return 'สะอาด';
      case '0': return 'ไม่สะอาด';
      default: return '';
    }
  };

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
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon color="primary" />
              เพิ่มแบบประเมินใหม่
            </Typography>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            href="/evaluation"
            sx={{ borderRadius: 2 }}
          >
            กลับ
          </Button>
        </Box>

        {/* Form */}
        <Paper sx={{ p: 4, borderRadius: 3 }}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
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
                  {/* Site - ย้ายมาไว้ก่อน */}
                  <FormControl fullWidth size="small" error={!!errors.site} required>
                    <Typography variant="body2" fontWeight="500" sx={{ mb: 1.5 }}>
                      Plant <span style={{ color: '#d32f2f' }}>*</span>
                    </Typography>
                    <Box sx={{ 
                      border: '1px solid',
                      borderColor: errors.site ? 'error.main' : 'grey.300',
                      borderRadius: 1,
                      p: 1,
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <RadioGroup
                        value={formData.site}
                        onChange={handleChange('site')}
                        row
                        sx={{ justifyContent: 'flex-start', gap: 3, margin: 0 }}
                      >
                        <FormControlLabel value="psc" control={<Radio size="small" />} label="PSC" />
                        <FormControlLabel value="ps" control={<Radio size="small" />} label="PS" />
                      </RadioGroup>
                    </Box>
                    {errors.site && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {errors.site}
                      </Typography>
                    )}
                  </FormControl>

                  {/* Vendor Selection - ในบรรทัดเดียวกัน */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                    gap: 2 
                  }}>
                    {/* Vendor Dropdown */}
                    <Autocomplete
                      fullWidth
                      options={vendorSearch.trim() ? searchResults : vendorOptions}
                      getOptionLabel={(option) => option.fullName}
                      value={selectedVendor}
                      onChange={(_, newValue) => handleVendorChange(newValue)}
                      loading={vendorLoading || isSearching}
                      filterOptions={(options) => options}
                      onInputChange={(event, newInputValue) => {
                        if (event && event.type === 'change') {
                          debouncedSearch(newInputValue);
                        }
                      }}
                      ListboxProps={vendorSearch.trim() ? {} : {
                        onScroll: (event: React.SyntheticEvent) => {
                          const listboxNode = event.currentTarget;
                          if (
                            listboxNode.scrollTop + listboxNode.clientHeight >=
                            listboxNode.scrollHeight - 1 &&
                            vendorHasMore &&
                            !vendorLoading
                          ) {
                            loadMoreVendors();
                          }
                        },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="เลือกหรือค้นหาผู้รับจ้างช่วง"
                          placeholder="ค้นหารหัสหรือชื่อผู้รับจ้างช่วง..."
                          size="small"
                          error={!!errors.contractorName}
                          
                          required
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <InputAdornment position="start">
                                  <BusinessIcon />
                                </InputAdornment>
                              ),
                              endAdornment: (
                                <>
                                  
                                  {(vendorLoading || isSearching) ? <CircularProgress color="inherit" size={20} /> : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                        />
                      )}
                      renderOption={(props, option) => {
                        const { key, ...otherProps } = props;
                        return (
                          <Box component="li" key={key} {...otherProps}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {option.code}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {option.name}
                              </Typography>
                              {option.address && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  {option.address}
                                </Typography>
                              )}
                              {vendorSearch.trim() && (
                                <Typography variant="caption" color="primary">
                                  ผลการค้นหา
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      }}
                      noOptionsText={
                        vendorSearch.trim() ? 
                          (isSearching ? 'กำลังค้นหา...' : 'ไม่พบผลการค้นหา') : 
                          'ไม่มีข้อมูล'
                      }
                    />

                    {/* ชื่อผู้รับจ้างช่วงที่เลือก (แสดงผลเสมอ) */}
                    <TextField
                      fullWidth
                      label="ชื่อผู้รับจ้างช่วงที่เลือก"
                      value={selectedVendor ? selectedVendor.fullName : ''}
                      size="small"
                      disabled
                      placeholder="ยังไม่ได้เลือกผู้รับจ้างช่วง"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          backgroundColor: 'grey.50',
                        }
                      }}
                    />
                  </Box>

                  {/* ทะเบียนรถ, วันที่ประเมิน และ เวลาประเมิน ใน 3 คอลัมน์ */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, 
                    gap: 2 
                  }}>
                    {/* ทะเบียนรถ */}
                    <TextField
                      fullWidth
                      label="ทะเบียนรถ"
                      value={formData.vehiclePlate}
                      onChange={handleChange('vehiclePlate')}
                      error={!!errors.vehiclePlate || !licensePlateFormatValid}
                      helperText={
                        !licensePlateFormatValid && formData.vehiclePlate ? 'รูปแบบทะเบียนรถไม่ถูกต้อง (เช่น กข-1234, 1กก-3456)' :
                        errors.vehiclePlate ||
                        'รูปแบบ: เช่น กข-1234, 1กก-3456'
                      }
                      required
                      size="small"
                      placeholder="เช่น กข-1234, 1กก-3456"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <TruckIcon />
                          </InputAdornment>
                        ),
                      }}
                    />

                    {/* วันที่ประเมิน */}
                    <DatePicker
                      label="วันที่ประเมิน"
                      value={formData.evaluationDate}
                      onChange={handleDateChange}
                      format="dd/MM/yyyy"
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                          error: !!errors.evaluationDate,
                          helperText: errors.evaluationDate,
                          required: true,
                          InputProps: formData.evaluationDate ? {
                            endAdornment: (
                              <Button
                                onClick={() => handleDateChange(null)}
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
                                  p: 0,
                                  ml: 0.5
                                }}
                              >x</Button>
                            )
                          } : undefined
                        }
                      }}
                    />

                    {/* เวลาประเมิน */}
                    <TimePicker
                      label="เวลาประเมิน"
                      value={formData.evaluationTime}
                      onChange={handleTimeChange}
                      ampm={false}
                      format="HH:mm"
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                          error: !!errors.evaluationTime,
                          helperText: errors.evaluationTime,
                          required: true,
                          InputProps: formData.evaluationTime ? {
                            endAdornment: (
                              <Button
                                onClick={() => handleTimeChange(null)}
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
                                  p: 0,
                                  ml: 0.5
                                }}
                              >x</Button>
                            )
                          } : undefined
                        }
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              {/* Evaluation Sections */}
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <PersonIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  รายการประเมิน
                </Typography>
                    </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {/* 1. ความร่วมมือของคนรถ */}
                  <Box>
                    <Typography variant="body1" fontWeight="500" sx={{ mb: 2 }}>
                      1. การให้ความร่วมมือของคนรถ *
                    </Typography>
                    <FormControl error={!!errors.driverCooperation} fullWidth>
                    <RadioGroup
                      value={formData.driverCooperation}
                      onChange={handleChange('driverCooperation')}
                    >
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                          {[
                            { value: '4', label: 'ดีมาก', color: 'success' },
                            { value: '3', label: 'ดี', color: 'info' },
                            { value: '2', label: 'ปานกลาง', color: 'warning' },
                            { value: '1', label: 'ไม่ดี', color: 'error' }
                        ].map((option) => (
                          <FormControlLabel 
                            key={option.value}
                            value={option.value} 
                              control={<Radio size="small" />}
                            label={
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="body2" fontWeight="500">
                                  {option.label}
                                </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                  ({option.value} คะแนน)
                                </Typography>
                              </Box>
                            }
                            sx={{
                                m: 0,
                                p: 2,
                                border: '1px solid',
                                borderColor: 'grey.300',
                              borderRadius: 1,
                              bgcolor: formData.driverCooperation === option.value ? 'primary.50' : 'white',
                              '&:hover': { bgcolor: 'primary.50' }
                            }}
                          />
                        ))}
                      </Box>
                    </RadioGroup>
                    {errors.driverCooperation && (
                        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                        {errors.driverCooperation}
                      </Typography>
                    )}
                  </FormControl>
                    </Box>

                  {/* 2. สภาพรถขนส่ง */}
                  <Box>
                    <Typography variant="body1" fontWeight="500" sx={{ mb: 2 }}>
                      2. สภาพความพร้อมของรถขนส่ง *
                    </Typography>
                    <FormControl error={!!errors.vehicleCondition} fullWidth>
                    <RadioGroup
                      value={formData.vehicleCondition}
                      onChange={handleChange('vehicleCondition')}
                    >
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, maxWidth: 400 }}>
                          {[
                            { value: '3', label: 'สะอาด', color: 'success' },
                            { value: '0', label: 'ไม่สะอาด', color: 'error' }
                        ].map((option) => (
                          <FormControlLabel 
                            key={option.value}
                            value={option.value} 
                              control={<Radio size="small" />}
                            label={
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="body2" fontWeight="500">
                                  {option.label}
                                </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                  ({option.value} คะแนน)
                                </Typography>
                              </Box>
                            }
                            sx={{
                                m: 0,
                                p: 2,
                                border: '1px solid',
                                borderColor: 'grey.300',
                              borderRadius: 1,
                              bgcolor: formData.vehicleCondition === option.value ? 'primary.50' : 'white',
                              '&:hover': { bgcolor: 'primary.50' }
                            }}
                          />
                        ))}
                      </Box>
                    </RadioGroup>
                    {errors.vehicleCondition && (
                        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                        {errors.vehicleCondition}
                      </Typography>
                    )}
                  </FormControl>
                  </Box>

                {/* 3. ความเสียหายของพัสดุ */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Typography variant="body1" fontWeight="500">
                        3. ความเสียหายของพัสดุ *
                      </Typography>
                      {damageScore !== null && (
                        <Box sx={{ 
                          px: 2, 
                          py: 0.5, 
                          borderRadius: 1, 
                          bgcolor: damageScore === 3 ? 'success.light' : damageScore === 1 ? 'warning.light' : 'error.light',
                          color: 'white'
                        }}>
                          <Typography variant="body2" fontWeight="600">
                            {damageScore} คะแนน
                          </Typography>
                        </Box>
                      )}
                      {vehicleHistory.isLoadingHistory && (
                        <CircularProgress size={16} />
                      )}
                    </Box>

                    {/* แสดงประวัติทะเบียนรถ */}
                    {formData.vehiclePlate && !vehicleHistory.isLoadingHistory && (
                      <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          ประวัติในเดือน/ปีที่ประเมินของทะเบียน <strong>{formData.vehiclePlate}</strong>
                          {formData.evaluationDate && (
                            <span> ({new Date(formData.evaluationDate).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })})</span>
                          )}:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 3 }}>
                          <Typography variant="body2">
                            จำนวนครั้งที่พบปัญหา: <strong>{vehicleHistory.damageCount} ครั้ง</strong>
                          </Typography>
                          <Typography variant="body2">
                            มูลค่าเสียหายรวม: <strong>{vehicleHistory.totalDamageValue.toLocaleString()} บาท</strong>
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {/* เงื่อนไขการให้คะแนน */}
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
                      <Typography variant="body2" fontWeight="500" sx={{ mb: 1 }}>
                        เงื่อนไขการให้คะแนน (ดูจากเดือน/ปีที่ประเมิน):
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                          <strong>3 คะแนน:</strong> ไม่พบปัญหาเสียหาย
                        </Typography>
                        <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                          <strong>1 คะแนน:</strong> พบปัญหา 1 ครั้งในเดือนที่ประเมิน และมูลค่าเสียหายรวมไม่เกิน 300,000 บาท
                        </Typography>
                        <Typography component="li" variant="body2">
                          <strong>0 คะแนน:</strong> พบปัญหามากกว่า 1 ครั้งในเดือนที่ประเมิน หรือมูลค่าเสียหายรวมเกิน 300,000 บาท
                        </Typography>
                      </Box>
                    </Box>

                    <FormControl error={!!errors.damageFound} fullWidth>
                      <RadioGroup
                        value={formData.damageFound}
                        onChange={handleChange('damageFound')}
                      >
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, maxWidth: 400 }}>
                          {[
                            { value: 'no', label: 'ไม่พบปัญหา', score: 3 },
                            { value: 'yes', label: 'พบปัญหา', score: '' }
                          ].map((option) => (
                            <FormControlLabel 
                              key={option.value}
                              value={option.value} 
                              control={<Radio size="small" />}
                              label={
                                <Box>
                                  <Typography variant="body2" fontWeight="500">
                                    {option.label}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {option.score !== '' ? `(${option.score} คะแนน)` : ''}
                                  </Typography>
                                </Box>
                              }
                              sx={{
                                m: 0,
                                p: 2,
                                border: '1px solid',
                                borderColor: 'grey.300',
                                borderRadius: 1,
                                bgcolor: formData.damageFound === option.value ? 'primary.50' : 'white',
                                '&:hover': { bgcolor: 'primary.50' }
                              }}
                            />
                          ))}
                        </Box>
                      </RadioGroup>
                      {errors.damageFound && (
                        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                          {errors.damageFound}
                        </Typography>
                      )}
                    </FormControl>

                    {/* มูลค่าความเสียหาย */}
                    {formData.damageFound === 'yes' && (
                      <Box sx={{ mt: 2 }}>
                        <TextField
                          label="มูลค่าความเสียหาย"
                          value={formData.damageValue}
                          onChange={handleChange('damageValue')}
                          onWheel={handleNumberInputWheel}
                          type="number"
                          inputProps={{ min: 0, step: "0.01" }}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">บาท</InputAdornment>,
                          }}
                          error={!!errors.damageValue}
                          helperText={errors.damageValue}
                          size="small"
                          sx={{ maxWidth: 300 }}
                          required
                        />
                      </Box>
                    )}
                  </Box>

                {/* หมายเหตุ */}
                  <Box>
                    <Typography variant="body1" fontWeight="500" sx={{ mb: 2 }}>
                    หมายเหตุ
                  </Typography>
                  <TextField
                    label="หมายเหตุเพิ่มเติม (ถ้ามี)"
                    value={formData.remark}
                    onChange={handleChange('remark')}
                    multiline
                    rows={3}
                    fullWidth
                      size="small"
                    placeholder="กรอกหมายเหตุเพิ่มเติม..."
                  />
                  </Box>
                </Box>
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
                  {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                  </Button>
                </Box>
            </form>
          </LocalizationProvider>
        </Paper>

      </Box>
    </Layout>
  );
}

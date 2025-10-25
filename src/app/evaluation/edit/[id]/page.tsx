'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  InputAdornment,
  CircularProgress,
  Divider,
  Alert,
  Autocomplete,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
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
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Layout from '../../../components/Layout';
import { useSnackbar } from '../../../../contexts/SnackbarContext';

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
  contractorName: string;
  vehiclePlate: string;
  evaluationDate: Date | null;
  evaluationTime: Date | null;
  site: string;
  driverCooperation: string;
  vehicleCondition: string;
  damageFound: string;
  damageValue: string;
  remark: string;
}

interface Evaluation {
  id: number;
  contractorName: string;
  vehiclePlate: string;
  evaluationDate: string;
  site: string;
  driverCooperation: number;
  vehicleCondition: number;
  damageFound: boolean;
  damageValue: number;
  damageScore: number;
  remark: string;
  evaluatedBy: string;
}

export default function EditEvaluationPage() {
  const router = useRouter();
  const params = useParams();
  const { showSnackbar } = useSnackbar();
  const { data: session } = useSession();

  const evaluationId = params.id as string;

  // Form state
  const [formData, setFormData] = useState<FormData>({
    contractorName: '',
    vehiclePlate: '',
    evaluationDate: null,
    evaluationTime: null,
    site: '',
    driverCooperation: '',
    vehicleCondition: '',
    damageFound: '',
    damageValue: '',
    remark: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [licensePlateFormatValid, setLicensePlateFormatValid] = useState(true);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorOption | null>(null);
  const [vendorPage, setVendorPage] = useState(1);
  const [vendorHasMore, setVendorHasMore] = useState(true);
  const [vendorSearch, setVendorSearch] = useState('');
  const [searchResults, setSearchResults] = useState<VendorOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [damageScore, setDamageScore] = useState<number | null>(null);
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
  const fetchVendors = async (page = 1, search = '', append = false) => {
    if (!vendorHasMore && page > 1) return;
    
    setVendorLoading(true);
    
    try {
      const response = await fetch(`/api/vendors/paginated?page=${page}&limit=100&search=${encodeURIComponent(search)}`, {
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลผู้รับจ้างช่วงได้');
      }
      
      const result = await response.json();
      
      if (append) {
        setVendorOptions(prev => [...prev, ...result.data]);
      } else {
        setVendorOptions(result.data);
      }
      
      setVendorHasMore(result.pagination.hasMore);
      setVendorPage(page);
    } catch (error: any) {
      showSnackbar('ไม่สามารถดึงข้อมูลผู้รับจ้างช่วงได้ สามารถพิมพ์ชื่อได้', 'info');
      console.error('Error fetching vendors:', error);
    } finally {
      setVendorLoading(false);
    }
  };

  // Load more vendors when scrolling
  const loadMoreVendors = () => {
    if (vendorHasMore && !vendorLoading) {
      fetchVendors(vendorPage + 1, vendorSearch, true);
    }
  };

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
    }, 300); // รอ 300ms หลังจากพิมพ์เสร็จ
    
    setSearchTimeout(timeout);
  };

  // Initial vendor fetch
  useEffect(() => {
    fetchVendors(1, '');
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Calculate damage score (realtime with current input value)
  const calculateDamageScore = (
    damageFound: string,
    currentDamageValueStr: string,
    vehicleHistory: { damageCount: number, totalDamageValue: number }
  ) => {
    if (damageFound === 'no') {
      return 3;
    }

    // Include current input damage value into this month's totals
    const currentDamageValue = parseFloat(currentDamageValueStr) || 0;
    const totalDamageCount = (vehicleHistory.damageCount || 0) + 1;
    const totalDamageThisMonth = (vehicleHistory.totalDamageValue || 0) + currentDamageValue;

    if (totalDamageCount > 1 || totalDamageThisMonth > 300000) {
      return 0;
    }
    if (totalDamageCount === 1 && totalDamageThisMonth <= 300000) {
      return 1;
    }
    return 0;
  };

  // Fetch vehicle history for damage calculation
  const fetchVehicleHistory = async (vehiclePlate: string, evaluationDate: Date) => {
    if (!vehiclePlate.trim()) {
      setVehicleHistory({ damageCount: 0, totalDamageValue: 0, isLoadingHistory: false });
      return;
    }

    setVehicleHistory(prev => ({ ...prev, isLoadingHistory: true }));

    try {
      // Calculate start of evaluation month/year
      const evalYear = evaluationDate.getFullYear();
      const evalMonth = evaluationDate.getMonth();
      const startDate = new Date(evalYear, evalMonth, 1);
      const endDate = new Date(evalYear, evalMonth + 1, 0, 23, 59, 59);

      const params = new URLSearchParams({
        vehiclePlate: vehiclePlate,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      if (evaluationId) {
        params.append('excludeId', String(evaluationId));
      }

      const response = await fetch(`/api/evaluation/vehicle-history?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('ไม่สามารถดึงประวัติความเสียหายได้');
      }
      
      const result = await response.json();
      const historyData = result.data || { damageCount: 0, totalDamageValue: 0 };
      
      setVehicleHistory({
        damageCount: historyData.damageCount || 0,
        totalDamageValue: historyData.totalDamageValue || 0,
        isLoadingHistory: false
      });

      // Auto-calculate damage score when history is loaded
      if (formData.damageFound) {
        const score = calculateDamageScore(formData.damageFound, formData.damageValue, historyData);
        setDamageScore(score);
      }
    } catch (error) {
      console.error('Error fetching vehicle history:', error);
      showSnackbar('ไม่สามารถดึงประวัติความเสียหายได้', 'error');
      setVehicleHistory({ damageCount: 0, totalDamageValue: 0, isLoadingHistory: false });
    }
  };

  // Clear vendor search and reload
  const clearVendorSearch = () => {
    setVendorSearch('');
    setSearchResults([]);
    setIsSearching(false);
    // Reload vendors if needed
    if (vendorOptions.length === 0) {
      fetchVendors();
    }
  };

  // Handle vendor change
  const handleVendorChange = (event: any, newValue: VendorOption | string | null) => {
    if (typeof newValue === 'string') {
      // User typed manually
      setSelectedVendor(null);
      setFormData(prev => ({
        ...prev,
        contractorName: newValue
      }));
    } else {
      // User selected from dropdown
      setSelectedVendor(newValue);
      setFormData(prev => ({
        ...prev,
        contractorName: newValue ? newValue.name : ''
      }));
      
      // เมื่อ clear vendor (newValue = null) ให้ล้างการค้นหาและโหลดใหม่
      if (!newValue) {
        clearVendorSearch();
      }
    }
    
    // Clear error
    if (errors.contractorName) {
      setErrors(prev => ({
        ...prev,
        contractorName: ''
      }));
    }
  };

  // Load evaluation data
  const loadEvaluation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/evaluation/${evaluationId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('ไม่พบแบบประเมินที่ระบุ');
        }
        throw new Error('ไม่สามารถโหลดข้อมูลได้');
      }
      
      const data = await response.json();
      setEvaluation(data);
      
      // Set form data
      setFormData({
        contractorName: data.contractorName || '',
        vehiclePlate: data.vehiclePlate || '',
        evaluationDate: data.evaluationDate ? new Date(data.evaluationDate) : null,
        evaluationTime: data.evaluationDate ? new Date(data.evaluationDate) : null, // ใช้เวลาเดียวกับวันที่สำหรับข้อมูลเก่า
        site: data.site || '',
        driverCooperation: data.driverCooperation.toString(),
        vehicleCondition: data.vehicleCondition.toString(),
        damageFound: data.damageFound ? 'yes' : 'no',
        damageValue: data.damageValue.toString(),
        remark: data.remark || ''
      });

      // Selected vendor will be set in separate useEffect after vendors are loaded

      // Set damage score
      setDamageScore(data.damageScore || null);

      // Fetch vehicle history if we have the data
      if (data.vehiclePlate && data.evaluationDate) {
        fetchVehicleHistory(data.vehiclePlate, new Date(data.evaluationDate));
      }
    } catch (error: any) {
      console.error('Error loading evaluation:', error);
      showSnackbar(error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
      router.push('/evaluation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (evaluationId) {
      loadEvaluation();
    }
  }, [evaluationId]);

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

  // Load vendor data after evaluation is loaded (lazy loading)
  useEffect(() => {
    if (evaluation && vendorOptions.length > 0) {
      // Set selected vendor after both evaluation and vendors are loaded
      if (evaluation.contractorName) {
        const vendor = vendorOptions.find(v => v.name === evaluation.contractorName);
        setSelectedVendor(vendor || null);
      }
    }
  }, [evaluation, vendorOptions]);

  // Auto-calculate damage score when relevant fields change
  useEffect(() => {
    if (formData.damageFound && formData.vehiclePlate && formData.evaluationDate) {
      fetchVehicleHistory(formData.vehiclePlate, formData.evaluationDate);
    }
  }, [formData.damageFound, formData.vehiclePlate, formData.evaluationDate]);

  // Calculate damage score when damage status, value, or history changes
  useEffect(() => {
    if (formData.damageFound) {
      const score = calculateDamageScore(formData.damageFound, formData.damageValue, vehicleHistory);
      setDamageScore(score);
    }
  }, [formData.damageFound, formData.damageValue, vehicleHistory]);

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

  // Prevent scroll wheel on number inputs
  const handleNumberInputWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.contractorName.trim()) {
      newErrors.contractorName = 'กรุณาเลือกผู้รับจ้างช่วง';
    }

    if (!formData.vehiclePlate.trim()) {
      newErrors.vehiclePlate = 'กรุณากรอกทะเบียนรถ';
    } else if (!licensePlateFormatValid) {
      newErrors.vehiclePlate = 'รูปแบบทะเบียนรถไม่ถูกต้อง (เช่น กข-1234, 1กก-3456)';
    }

    if (!formData.evaluationDate) {
      newErrors.evaluationDate = 'กรุณาเลือกวันที่ประเมิน';
    }

    if (!formData.evaluationTime) {
      newErrors.evaluationTime = 'กรุณาเลือกเวลาประเมิน';
    }

    if (!formData.site) {
      newErrors.site = 'กรุณาเลือก Plant';
      showSnackbar('กรุณาเลือก Plant (PSC หรือ PS)', 'error');
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
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      showSnackbar('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
      return;
    }

    setSaving(true);

    try {
      // Check for NaN values before sending
      if (isNaN(parseInt(formData.driverCooperation)) || isNaN(parseInt(formData.vehicleCondition))) {
        showSnackbar('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
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
      } else if (formData.evaluationDate) {
        // ถ้ามีแต่วันที่ ใช้เวลาปัจจุบัน
        combinedDateTime = new Date(formData.evaluationDate);
      } else {
        // Fallback ไปใช้ current datetime
        combinedDateTime = new Date();
      }

      const updateData = {
        contractorName: formData.contractorName,
        vehiclePlate: formData.vehiclePlate.toUpperCase(),
        evaluationDate: combinedDateTime.toISOString(),
        site: formData.site,
        driverCooperation: parseInt(formData.driverCooperation),
        vehicleCondition: parseInt(formData.vehicleCondition),
        damageFound: formData.damageFound === 'yes',
        damageValue: formData.damageFound === 'yes' ? parseFloat(formData.damageValue) : 0,
        damageScore: damageScore || 0,
        remark: formData.remark
      };

      const response = await fetch(`/api/evaluation/${evaluationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
      }

      showSnackbar('แก้ไขแบบประเมินเรียบร้อยแล้ว', 'success');
      router.push(`/evaluation`);
    } catch (error: any) {
      console.error('Error updating evaluation:', error);
      showSnackbar(error.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push(`/evaluation`);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  if (loading) {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (!evaluation) {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">ไม่พบข้อมูลแบบประเมิน</Alert>
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
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon color="primary" />
              แก้ไขแบบประเมิน
            </Typography>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={handleCancel}
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
                      getOptionLabel={(option) => typeof option === 'string' ? option : option.fullName}
                      value={selectedVendor}
                      onChange={handleVendorChange}
                      loading={vendorLoading || isSearching}
                      freeSolo
                      filterOptions={(options) => options} // ปิด default filtering เพราะเราทำเอง
                      onInputChange={(event, newInputValue) => {
                        if (event && event.type === 'change') {
                          debouncedSearch(newInputValue);
                        }
                      }}
                      ListboxProps={vendorSearch.trim() ? {} : {
                        onScroll: (event: React.SyntheticEvent) => {
                          const listboxNode = event.currentTarget;
                          if (listboxNode.scrollTop + listboxNode.clientHeight === listboxNode.scrollHeight) {
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

                  {/* ทะเบียนรถ และ วันที่ประเมิน เวลาประเมิน ในบรรทัดเดียวกัน - 3 คอลัมน์เท่ากัน */}
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
                      onChange={(newValue) => {
                        setFormData(prev => ({ ...prev, evaluationDate: newValue }));
                        if (errors.evaluationDate) {
                          setErrors(prev => ({ ...prev, evaluationDate: '' }));
                        }
                      }}
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
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, evaluationDate: null }));
                                  if (errors.evaluationDate) {
                                    setErrors(prev => ({ ...prev, evaluationDate: '' }));
                                  }
                                }}
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
                      onChange={(newValue) => {
                        setFormData(prev => ({ ...prev, evaluationTime: newValue }));
                        if (errors.evaluationTime) {
                          setErrors(prev => ({ ...prev, evaluationTime: '' }));
                        }
                      }}
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
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, evaluationTime: null }));
                                  if (errors.evaluationTime) {
                                    setErrors(prev => ({ ...prev, evaluationTime: '' }));
                                  }
                                }}
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
                  disabled={saving}
                  sx={{ minWidth: 120 }}
                >
                  ยกเลิก
                </Button>
                
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  disabled={saving}
                  sx={{ minWidth: 120 }}
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </Box>
          </form>
        </LocalizationProvider>
        </Paper>

      </Box>
    </Layout>
  );
}

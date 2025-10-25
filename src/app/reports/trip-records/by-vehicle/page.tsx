'use client';
import React, { useState, useEffect } from 'react';
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
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Avatar,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { th } from 'date-fns/locale';
import {
  Assessment as ReportIcon,
  DirectionsCar as CarIcon,
  RouteOutlined as TripIcon,
  LocalGasStation as FuelIcon,
  AttachMoney as MoneyIcon,
  Timeline as StatsIcon,
  DateRange as DateIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Clear as ClearIcon,
  TrendingUp as TrendingUpIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import Layout from '../../../components/Layout';
import DataTablePagination from '../../../../components/DataTablePagination';
import ColorChip from '../../../../components/ColorChip';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import ReportSidebar from './ReportSidebar';
import { report } from 'process';

interface Vehicle {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
  vehicleType: string;
  color?: string;
  driverName?: string;
  backupDriverName?: string;
  carImage?: string;
  driverImage?: string;
  backupDriverImage?: string;
  fuelTank?: number;
  fuelConsume?: number;
  weight?: number;
}

interface TripRecord {
  id: number;
  vehicleId: number;
  customerId: number;
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
  odometerBefore?: number;
  odometerAfter?: number;
  actualDistance?: number;
  estimatedDistance: number;
  days: number;
  allowanceRate: number;
  totalAllowance: number;
  loadingDate?: string;
  distanceCheckFee?: number;
  fuelCost?: number;
  tollFee?: number;
  repairCost?: number;
  documentNumber?: string;
  remark?: string;
  vehicle: {
    id: number;
    licensePlate: string;
    brand: string;
    model: string;
    vehicleType: string;
    driverName?: string;
    backupDriverName?: string;
    carImage?: string;
  };
  customer: {
    id: number;
    cmCode: string;
    cmName: string;
    cmAddress: string;
    cmRegion: string;
    cmMileage: number;
  };
  tripItems?: Array<{
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
    };
  }>;
}

interface ReportSummary {
  totalTrips: number;
  totalDistance: number;
  averageDistance: number;
  averageDays: number;
  costs: {
    allowance: number;
    fuel: number;
    toll: number;
    repair: number;
    distanceCheck: number;
  };
  grandTotal: number;
}

interface ReportData {
  vehicle: Vehicle;
  tripRecords: TripRecord[];
  summary: ReportSummary;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    recordsPerPage: number;
  };
}

export default function TripRecordsByVehiclePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showSnackbar } = useSnackbar();

  // State
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedTrip, setSelectedTrip] = useState<TripRecord | null>(null);
  const [tripDetailDialog, setTripDetailDialog] = useState(false);
  const [mobileVehicles, setMobileVehicles] = useState<Vehicle[]>([]);
  const [mobileVehiclesLoading, setMobileVehiclesLoading] = useState(false);

  // Handle vehicle selection from sidebar
  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setPage(1);
  };

  // Fetch vehicles for mobile dropdown
  const fetchMobileVehicles = async () => {
    try {
      setMobileVehiclesLoading(true);
      const response = await fetch('/api/vehicles?status=active&limit=100');
      const result = await response.json();
      
      if (result.success) {
        setMobileVehicles(result.data);
      } else {
        showSnackbar('ไม่สามารถดึงข้อมูลรถได้', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลรถ', 'error');
    } finally {
      setMobileVehiclesLoading(false);
    }
  };

  // Helper function to format date for API
  const formatDateForAPI = (date: Date | null): string => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Fetch report data
  const fetchReportData = async (resetPage = false) => {
    if (!selectedVehicleId) return;

    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        vehicleId: selectedVehicleId,
        page: resetPage ? '1' : page.toString(),
        limit: '10',
      });

      // ส่งวันที่ในรูปแบบไทย (DD/MM/YYYY) ไปยัง API 
      if (startDate) params.append('startDate', formatDateForAPI(startDate));
      if (endDate) params.append('endDate', formatDateForAPI(endDate));

      const response = await fetch(`/api/trip-records/reports/by-vehicle?${params}`);
      const result = await response.json();

      if (result.success) {
        setReportData(result.data);
        if (resetPage) setPage(1);
      } else {
        showSnackbar(result.error || 'ไม่สามารถดึงข้อมูลรายงานได้', 'error');
        setReportData(null);
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน', 'error');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  // Load mobile vehicles on mount if mobile
  useEffect(() => {
    if (isMobile) {
      fetchMobileVehicles();
    }
  }, [isMobile]);

  // Load report when filters change
  useEffect(() => {
    if (selectedVehicleId) {
      fetchReportData(true);
    } else {
      setReportData(null);
    }
  }, [selectedVehicleId, startDate, endDate]);

  // Load report when page changes
  useEffect(() => {
    if (selectedVehicleId && page > 1) {
      fetchReportData(false);
    }
  }, [page]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  const formatDateThai = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleViewTripDetail = (trip: TripRecord) => {
    setSelectedTrip(trip);
    setTripDetailDialog(true);
  };

  const handleClearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setPage(1);
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'ForkLift':
        return <img src="/images/icon-forklift.png" alt="Forklift" width={24} height={24} />;
      case 'Pickup':
        return <img src="/images/icon-pickup.png" alt="PickUp" width={24} height={24} />;
      case 'Truck':
        return <img src="/images/icon-truck.png" alt="Truck" width={24} height={24} />;
      default:
        return <img src="/images/icon-car.png" alt="Car" width={24} height={24} />;
    }
  };

  return (
    <Layout 
      showSidebar={false}
      customSidebar={
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <ReportSidebar
            selectedVehicleId={selectedVehicleId}
            onVehicleSelect={handleVehicleSelect}
          />
        </Box>
      }
    >
      <Box>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                รายงานการเดินทาง
              </Typography>
              
            </Box>
          </Box>
        </Box>

        {/* Mobile Vehicle Selector */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CarIcon color="primary" />
              เลือกรถ
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>เลือกรถ</InputLabel>
              <Select
                value={selectedVehicleId}
                label="เลือกรถ"
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                disabled={mobileVehiclesLoading}
                startAdornment={
                  <InputAdornment position="start">
                    <CarIcon color="primary" />
                  </InputAdornment>
                }
              >
                <MenuItem value="">
                  <em>-- เลือกรถ --</em>
                </MenuItem>
                {mobileVehicles.map((vehicle) => (
                  <MenuItem key={vehicle.id} value={vehicle.id.toString()}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getVehicleIcon(vehicle.vehicleType)}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {vehicle.licensePlate}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {vehicle.brand} {vehicle.model}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        </Box>

        {/* Date Filters */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <DateIcon color="primary" />
            กรองตามช่วงวันที่
          </Typography>
          
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 3,
              alignItems: { xs: 'stretch', sm: 'flex-end' }
            }}>
              <Box sx={{ flex: 1 }}>
                <DatePicker
                  label="วันที่เริ่มต้น"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  format="dd/MM/yyyy"
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      InputProps: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <DateIcon color="primary" />
                          </InputAdornment>
                        ),
                        endAdornment: startDate ? (
                          <Button
                            onClick={() => setStartDate(null)}
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
                        ) : undefined
                      },
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <DatePicker
                  label="วันที่สิ้นสุด"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  format="dd/MM/yyyy"
                  minDate={startDate || undefined}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      InputProps: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <DateIcon color="primary" />
                          </InputAdornment>
                        ),
                        endAdornment: endDate ? (
                          <Button
                            onClick={() => setEndDate(null)}
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
                        ) : undefined
                      },
                    }
                  }}
                />
              </Box>
              
              <Box sx={{ flex: 0 }}>
                <Button
                  variant="outlined"
                  onClick={handleClearFilters}
                  startIcon={<ClearIcon />}
                  sx={{ height: '40px', whiteSpace: 'nowrap' }}
                >
                  ล้างวันที่
                </Button>
              </Box>
            </Box>
          </LocalizationProvider>
        </Paper>

        {/* Report Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        ) : !selectedVehicleId ? (
          <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 3 }}>
            <Box sx={{ mb: 3 }}>
              <ReportIcon sx={{ fontSize: 80, color: 'grey.300' }} />
            </Box>
            <Typography variant="h5" color="text.secondary" sx={{ mb: 2 }}>
              เลือกรถเพื่อดูรายงาน
            </Typography>
            <Typography variant="body1" color="text.secondary">
              กรุณาเลือกรถจากรายการด้านซ้ายเพื่อดูรายงานการเดินทาง
            </Typography>
          </Paper>
        ) : !reportData ? (
          <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 3 }}>
            <Typography variant="h6" color="text.secondary">
              ไม่พบข้อมูลรายงาน
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Vehicle Info Header */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: 'center',
                gap: 3
              }}>
                <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
                  {reportData.vehicle.carImage ? (
                    <Avatar
                      src={reportData.vehicle.carImage}
                      sx={{ 
                        width: 100, 
                        height: 100, 
                        mx: 'auto',
                        border: '3px solid',
                        borderColor: 'primary.main'
                      }}
                      variant="rounded"
                    />
                  ) : (
                    <Box sx={{
                      width: 100,
                      height: 100,
                      mx: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.100',
                      borderRadius: 2,
                      border: '3px solid',
                      borderColor: 'primary.main'
                    }}>
                      {getVehicleIcon(reportData.vehicle.vehicleType)}
                    </Box>
                  )}
                </Box>
                
                <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    {reportData.vehicle.licensePlate}
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    {reportData.vehicle.brand} {reportData.vehicle.model}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                    <Chip 
                      label={reportData.vehicle.vehicleType} 
                      color="primary" 
                      size="small"
                      icon={<CarIcon />}
                    />
                    {reportData.vehicle.color && (
                      <ColorChip color={reportData.vehicle.color} size="small" />
                    )}
                    {reportData.vehicle.driverName && (
                      <Chip 
                        label={`คนขับ: ${reportData.vehicle.driverName}`}
                        variant="outlined"
                        size="small"
                      />
                    )}
                    {reportData.vehicle.backupDriverName && (
                      <Chip 
                        label={`คนช่วยขับ: ${reportData.vehicle.backupDriverName}`}
                        variant="outlined"
                        size="small"
                      />
                    )}
                  </Box>
                </Box>
                
                <Box sx={{ textAlign: { xs: 'center', md: 'right' }, flexShrink: 0 }}>
                  <Typography variant="body2" color="text.secondary">
                    ช่วงวันที่ในรายงาน
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {startDate && endDate ? 
                      `${formatDateForAPI(startDate)} - ${formatDateForAPI(endDate)}` :
                      startDate ? `จาก ${formatDateForAPI(startDate)}` :
                      endDate ? `ถึง ${formatDateForAPI(endDate)}` :
                      'ทั้งหมด'
                    }
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Summary Statistics */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 3,
              mb: 3,
              flexWrap: 'wrap'
            }}>
              <Box sx={{ flex: { xs: 1, sm: 1, md: 1 } }}>
                <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)', color: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <TripIcon fontSize="large" />
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {reportData.summary.totalTrips}
                        </Typography>
                        <Typography variant="body2">
                          รายการเดินทาง
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
              
              <Box sx={{ flex: { xs: 1, sm: 1, md: 1 } }}>
                <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)', color: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <StatsIcon fontSize="large" />
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {Math.round(reportData.summary.totalDistance).toLocaleString()}
                        </Typography>
                        <Typography variant="body2">
                          กิโลเมตรรวม
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
              
              <Box sx={{ flex: { xs: 1, sm: 1, md: 1 } }}>
                <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)', color: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <TrendingUpIcon fontSize="large" />
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {Math.round(reportData.summary.averageDistance)}
                        </Typography>
                        <Typography variant="body2">
                          กม.เฉลี่ย/เที่ยว
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
              
              <Box sx={{ flex: { xs: 1, sm: 1, md: 1 } }}>
                <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)', color: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <MoneyIcon fontSize="large" />
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700}}>
                          {formatCurrency(reportData.summary.grandTotal).replace('THB', '฿')}
                        </Typography>
                        <Typography variant="body2">
                          ค่าใช้จ่ายรวม
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>

            {/* Cost Breakdown */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PieChartIcon color="primary" />
                รายละเอียดค่าใช้จ่าย
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                flexWrap: 'wrap'
              }}>
                <Box sx={{ flex: { xs: 1, sm: 1, md: 1 } }}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">ค่าเบี้ยเลี้ยง</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                      {formatCurrency(reportData.summary.costs.allowance).replace('THB', '฿')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: { xs: 1, sm: 1, md: 1 } }}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">ค่าน้ำมัน</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                      {formatCurrency(reportData.summary.costs.fuel).replace('THB', '฿')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: { xs: 1, sm: 1, md: 1 } }}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">ค่าทางด่วน</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'info.main' }}>
                      {formatCurrency(reportData.summary.costs.toll).replace('THB', '฿')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: { xs: 1, sm: 1, md: 1 } }}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">ค่าซ่อมแซม</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>
                      {formatCurrency(reportData.summary.costs.repair).replace('THB', '฿')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: { xs: 1, sm: 1, md: 1 } }}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">ค่าเช็คระยะ</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                      {formatCurrency(reportData.summary.costs.distanceCheck).replace('THB', '฿')}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: { xs: 1, sm: 1, md: 1 } }}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 2 }}>
                    <Typography variant="body2">รวมทั้งหมด</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {formatCurrency(reportData.summary.grandTotal).replace('THB', '฿')}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>

            {/* Trip Records Table */}
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'grey.200' }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BarChartIcon color="primary" />
                  รายการเดินทาง ({reportData.pagination.totalRecords} รายการ)
                </Typography>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>วันที่เดินทาง</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>ลูกค้า</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>ระยะทาง (กม.)</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>จำนวนวัน</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>เบี้ยเลี้ยง</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>จัดการ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.tripRecords.map((trip) => (
                      <TableRow key={trip.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatDate(trip.departureDate)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {trip.departureTime} - {formatDate(trip.returnDate)} {trip.returnTime}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {trip.customer.cmName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {trip.customer.cmCode} 
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {trip.actualDistance ? Math.round(trip.actualDistance) : Math.round(trip.estimatedDistance)} กม.
                            </Typography>
                            
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {trip.days} วัน
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(
                              Number(trip.totalAllowance) + 
                              Number(trip.fuelCost || 0) + 
                              Number(trip.tollFee || 0) + 
                              Number(trip.repairCost || 0) + 
                              Number(trip.distanceCheckFee || 0)
                            ).replace('THB', '฿')}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ViewIcon />}
                            onClick={() => handleViewTripDetail(trip)}
                          >
                            ดูรายละเอียด
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Pagination */}
              {reportData.pagination.totalRecords > 0 && (
                <DataTablePagination
                  component="div"
                  count={reportData.pagination.totalRecords}
                  rowsPerPage={reportData.pagination.recordsPerPage}
                  page={reportData.pagination.currentPage - 1}
                  onPageChange={(_, newPage) => setPage(newPage + 1)}
                  onRowsPerPageChange={() => {}} // Fixed page size for now
                  rowsPerPageOptions={[10]}
                  labelRowsPerPage="แสดงต่อหน้า:"
                  labelDisplayedRows={({ from, to, count }) => 
                    `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
                  }
                />
              )}
            </Paper>
          </>
        )}

        {/* Trip Detail Dialog */}
        <Dialog
          open={tripDetailDialog}
          onClose={() => setTripDetailDialog(false)}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle sx={{
            background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <TripIcon />
            รายละเอียดการเดินทาง
          </DialogTitle>
          
          <DialogContent sx={{ p: 3 }}>
            {selectedTrip && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: 3,
                  mt: 2
                }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                      ข้อมูลการเดินทาง
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">วันที่ออกเดินทาง:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatDate(selectedTrip.departureDate)} {selectedTrip.departureTime}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">วันที่กลับ:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatDate(selectedTrip.returnDate)} {selectedTrip.returnTime}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">จำนวนวัน:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedTrip.days} วัน
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">ระยะทางจริง:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedTrip.actualDistance ? Math.round(selectedTrip.actualDistance) : '-'} กม.
                        </Typography>
                      </Box>
                      
                    </Box>
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                      ข้อมูลลูกค้า
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">รหัสลูกค้า:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedTrip.customer.cmCode}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">ชื่อลูกค้า:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedTrip.customer.cmName}
                        </Typography>
                      </Box>
                      
                    </Box>
                  </Box>
                </Box>
                
                <Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                    ค่าใช้จ่าย
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2,
                    flexWrap: 'wrap'
                  }}>
                    <Box sx={{ flex: { xs: 1, sm: 1 } }}>
                      <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">ค่าเบี้ยเลี้ยง</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {formatCurrency(Number(selectedTrip.totalAllowance)).replace('THB', '฿')}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ flex: { xs: 1, sm: 1 } }}>
                      <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">ค่าน้ำมัน</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                          {formatCurrency(Number(selectedTrip.fuelCost || 0)).replace('THB', '฿')}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ flex: { xs: 1, sm: 1 } }}>
                      <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">ค่าทางด่วน</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'info.main' }}>
                          {formatCurrency(Number(selectedTrip.tollFee || 0)).replace('THB', '฿')}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ flex: { xs: 1, sm: 1 } }}>
                      <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">ค่าซ่อมแซม</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>
                          {formatCurrency(Number(selectedTrip.repairCost || 0)).replace('THB', '฿')}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ flex: { xs: 1, sm: 1 } }}>
                      <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">ค่าเช็คระยะ</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                          {formatCurrency(Number(selectedTrip.distanceCheckFee || 0)).replace('THB', '฿')}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ flex: { xs: 1, sm: 1 } }}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 2 }}>
                        <Typography variant="caption">รวมทั้งหมด</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {formatCurrency(
                            Number(selectedTrip.totalAllowance) + 
                            Number(selectedTrip.fuelCost || 0) + 
                            Number(selectedTrip.tollFee || 0) + 
                            Number(selectedTrip.repairCost || 0) + 
                            Number(selectedTrip.distanceCheckFee || 0)
                          ).replace('THB', '฿')}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
                
                {selectedTrip.remark && (
                  <Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>
                      หมายเหตุ
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      p: 2, 
                      bgcolor: 'grey.50', 
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}>
                      {selectedTrip.remark}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setTripDetailDialog(false)} variant="outlined">
              ปิด
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}

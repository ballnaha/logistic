'use client';
import React, { useState, useEffect, useRef, use } from 'react';
import { getAllowanceRate } from '@/utils/allowance';
import { getDistanceRate, calculateDistanceCost } from '@/utils/distanceRate';
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
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as BackIcon,
  RouteOutlined as TripIcon,
  DirectionsCar as CarIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { th } from 'date-fns/locale';
import { parse, format } from 'date-fns';
import Layout from '../../../components/Layout';
import { useSnackbar } from '../../../../contexts/SnackbarContext';

// Helper function to get image URL (production-safe)
const getImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  // Preview blobs
  if (url.startsWith('blob:')) return url;
  // Proxy uploads via API in production for caching and path safety
  if (url.startsWith('/uploads/')) {
    if (process.env.NODE_ENV === 'production') {
      return `/api/serve-image?path=${encodeURIComponent(url)}`;
    }
    return url;
  }
  return url;
};

// Helper function to get driver initials
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

interface Vehicle {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
  vehicleType: string;
  driverName?: string; // Keep for backwards compatibility with current API
  driverLicense?: string; // Driver license number
  driverImage?: string; // Driver image URL
  backupDriverName?: string; // Keep for backwards compatibility with current API
  backupDriverLicense?: string; // Backup driver license number
  backupDriverImage?: string; // Backup driver image URL
  carImage?: string;
  // New driver relationships (optional for now)  
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
}

interface Driver {
  id: number;
  driverName: string;
  driverLicense: string;
  driverImage?: string;
  isActive: boolean;
}

interface Customer {
  id: number;
  cmCode: string;
  cmName: string;
  cmAddress: string;
  cmMileage: number;
}

interface Item {
  id: number;
  ptPart: string;
  ptDesc1: string;
  ptDesc2?: string;
  ptUm: string;
  ptPrice?: number;
}

interface TripItem {
  id?: string; // temporary ID for frontend
  itemId: number;
  item?: Item;
  quantity: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
  remark: string;
}

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
  loadingDate?: string;
  distanceCheckFee?: number;
  fuelCost?: number;
  tollFee?: number;
  repairCost?: number;
  documentNumber: string;
  remark: string;
  driverLicense?: string; // เลขใบขับขี่ของคนขับที่เลือก
  driverName?: string; // ชื่อคนขับที่เลือก
  driverType?: string; // ประเภทคนขับ 'main' | 'backup' | 'other'
  vehicle: Vehicle;
  customer: Customer;
  tripItems?: TripItem[];
}

interface FormData {
  vehicle: Vehicle | null;
  customer: Customer | null;
  selectedDriver: 'main' | 'backup' | 'other' | null; // เลือกคนขับหลักหรือรอง หรือคนขับอื่น
  alternativeDriver?: Driver | null; // เก็บข้อมูลคนขับแทนที่เลือกจาก dropdown
  departureDate: Date | null;
  departureTime: string;
  returnDate: Date | null;
  returnTime: string;
  odometerBefore: string;
  odometerAfter: string;
  actualDistance: string;
  loadingDate: Date | null;
  distanceCheckFee: string;
  fuelCost: string;
  tollFee: string;
  repairCost: string;
  documentNumber: string;
  remark: string;
  driverLicense?: string; // เลขใบขับขี่ของคนขับที่เลือก
  driverName?: string; // ชื่อคนขับที่เลือก
  driverType?: string; // เก็บประเภทคนขับ 'main' | 'backup' | 'other'
}

export default function EditTripRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const tripId = parseInt(resolvedParams.id);
  const { showSnackbar } = useSnackbar();
  
  // Refs for form validation
  const vehicleRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);
  const departureDateRef = useRef<HTMLDivElement>(null);
  const returnDateRef = useRef<HTMLDivElement>(null);
  const departureTimeRef = useRef<HTMLInputElement>(null);
  const returnTimeRef = useRef<HTMLInputElement>(null);
  const estimatedDistanceRef = useRef<HTMLDivElement>(null);
  const documentNumberRef = useRef<HTMLDivElement>(null);

  // States
  const [tripRecord, setTripRecord] = useState<TripRecord | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [tripItems, setTripItems] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Driver validation state (string message like add page)
  const [driverLicenseError, setDriverLicenseError] = useState<string>('');
  const [documentNumberError, setDocumentNumberError] = useState<string>('');
  const [validatingDocumentNumber, setValidatingDocumentNumber] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    vehicle: null,
    customer: null,
    selectedDriver: null,
    alternativeDriver: null,
    departureDate: null,
    departureTime: '',
    returnDate: null,
    returnTime: '',
    odometerBefore: '',
    odometerAfter: '',
    actualDistance: '',
    loadingDate: null,
    distanceCheckFee: '',
    fuelCost: '',
    tollFee: '',
    repairCost: '',
    documentNumber: '',
    remark: '',
    driverLicense: undefined,
    driverName: '',
    driverType: undefined,
  });

  // Calculated values
  const [calculatedDays, setCalculatedDays] = useState<number>(0);
  const [calculatedAllowance, setCalculatedAllowance] = useState<number>(0);
  const [allowanceRate, setAllowanceRate] = useState<number>(0); // เริ่มต้นที่ 0 แล้วดึงจากระบบ
  const [actualDistance, setActualDistance] = useState<number>(0);
  const [estimatedDistanceFromSystem, setEstimatedDistanceFromSystem] = useState<number>(0);
  const [distanceRate, setDistanceRate] = useState<number>(0); // อัตราค่าระยะทางต่อกิโลเมตร
  const [calculatedDistanceCost, setCalculatedDistanceCost] = useState<number>(0); // ค่าระยะทางที่คำนวณได้
  const [tripFeeRate, setTripFeeRate] = useState<number>(0); // อัตราค่าเที่ยว
  const [includeTripFee, setIncludeTripFee] = useState<boolean>(true); // เริ่มต้นเช็คไว้
  const [tripFeeLoaded, setTripFeeLoaded] = useState<boolean>(false); // สถานะการโหลดค่าเที่ยว
  
  // UI States
  const [showAllowanceDetails, setShowAllowanceDetails] = useState<boolean>(false);

  // Load trip record and options
  const loadTripRecord = async () => {
    try {
      console.log('Loading trip record with ID:', tripId);
      const response = await fetch(`/api/trip-records/${tripId}`);
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        setTripRecord(data.trip);
        // Set form data from loaded trip
        const dep = new Date(data.trip.departureDate);
        const ret = data.trip.returnDate ? new Date(data.trip.returnDate) : null;
        // Determine if return fields were effectively not provided originally (fallback values)
        const formatLocalDate = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        const isFallbackReturn = !!ret && formatLocalDate(dep) === formatLocalDate(ret)
          && (!data.trip.returnTime || data.trip.returnTime === data.trip.departureTime)
          && data.trip.days === 0;
        // Blank out return fields if they were not truly provided
        const shouldBlankReturn = !ret || isFallbackReturn;
        
        // Determine correct driverLicense based on existing data
        let correctDriverLicense = data.trip.driverLicense;
        let correctDriverName = data.trip.driverName;
        let correctDriverType = data.trip.driverType;
        
        if (!correctDriverLicense && data.trip.vehicle) {
          // Try to get driver license from vehicle's driver objects (new structure)
          const vehicle = data.trip.vehicle;
          
          if (data.trip.driverType === 'main') {
            correctDriverLicense = vehicle.mainDriver?.driverLicense || vehicle.driverLicense;
            correctDriverName = vehicle.mainDriver?.driverName || vehicle.driverName;
          } else if (data.trip.driverType === 'backup') {
            correctDriverLicense = vehicle.backupDriver?.driverLicense || vehicle.backupDriverLicense;
            correctDriverName = vehicle.backupDriver?.driverName || vehicle.backupDriverName;
          }
        }
        
        // If still no driverLicense, try to match by driverName
        if (!correctDriverLicense && correctDriverName && data.trip.vehicle) {
          const vehicle = data.trip.vehicle;
          
          // Check if driverName matches main driver
          const mainDriverName = vehicle.mainDriver?.driverName || vehicle.driverName;
          if (mainDriverName === correctDriverName) {
            correctDriverLicense = vehicle.mainDriver?.driverLicense || vehicle.driverLicense;
            correctDriverType = 'main';
          } else {
            // Check if driverName matches backup driver
            const backupDriverName = vehicle.backupDriver?.driverName || vehicle.backupDriverName;
            if (backupDriverName === correctDriverName) {
              correctDriverLicense = vehicle.backupDriver?.driverLicense || vehicle.backupDriverLicense;
              correctDriverType = 'backup';
            } else {
              // If not main or backup, it might be an alternative driver
              correctDriverType = 'other';
            }
          }
        }
        
        // Determine selectedDriver and alternativeDriver
        let selectedDriver: 'main' | 'backup' | 'other' | null = null;
        let alternativeDriver: Driver | null = null;
        
        if (correctDriverType === 'main') {
          selectedDriver = 'main';
        } else if (correctDriverType === 'backup') {
          selectedDriver = 'backup';
        } else if (correctDriverType === 'other' && correctDriverLicense) {
          selectedDriver = 'other';
          // We'll need to match this with the drivers list later after fetch
        }
        
        setFormData({
          vehicle: data.trip.vehicle,
            customer: data.trip.customer,
            selectedDriver: selectedDriver,
            alternativeDriver: alternativeDriver,
            departureDate: dep,
            departureTime: data.trip.departureTime || '',
            returnDate: shouldBlankReturn ? null : ret,
            returnTime: shouldBlankReturn ? '' : (data.trip.returnTime || ''),
            odometerBefore: data.trip.odometerBefore?.toString() || '',
            odometerAfter: data.trip.odometerAfter?.toString() || '',
            actualDistance: data.trip.actualDistance?.toString() || '',
            loadingDate: data.trip.loadingDate ? new Date(data.trip.loadingDate) : null,
            distanceCheckFee: data.trip.distanceCheckFee?.toString() || '',
            fuelCost: data.trip.fuelCost?.toString() || '',
            tollFee: data.trip.tollFee?.toString() || '',
            repairCost: data.trip.repairCost?.toString() || '',
            documentNumber: data.trip.documentNumber || '',
            remark: data.trip.remark || '',
            driverLicense: correctDriverLicense || undefined,
            driverName: correctDriverName || '',
            driverType: correctDriverType || undefined,
        });

        // Load trip items
        if (data.trip.tripItems && data.trip.tripItems.length > 0) {
          const loadedItems = data.trip.tripItems.map((item: any, index: number) => ({
            id: `existing-${index}`,
            itemId: item.itemId,
            item: item.item,
            quantity: item.quantity.toString(),
            unit: item.unit,
            unitPrice: item.unitPrice?.toString() || '',
            totalPrice: item.totalPrice?.toString() || '',
            remark: item.remark || '',
          }));
          setTripItems(loadedItems);
        }

        // ตั้งค่าเบี้ยเลี้ยงและข้อมูลที่คำนวณแล้วจากข้อมูลเดิม
        setAllowanceRate(Number(data.trip.allowanceRate));
        setCalculatedDays(data.trip.days);
        setCalculatedAllowance(Number(data.trip.totalAllowance));
        
        // ตั้งค่า trip fee จากข้อมูลเดิม
        const existingTripFee = Number(data.trip.tripFee || 0);
        setIncludeTripFee(existingTripFee > 0);
      } else {
        showSnackbar(data.error || 'ไม่พบข้อมูลการเดินทางที่ระบุ', 'error');
        console.error('API Error:', data.error || 'ไม่พบข้อมูลการเดินทางที่ระบุ');
        // Don't throw error, just log and show snackbar
        return;
      }
    } catch (error) {
      console.error('Error loading trip record:', error);
      showSnackbar('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
      // Don't re-throw error, just log
    }
  };

  const fetchOptions = async () => {
    try {
      const [optionsResponse, driversResponse] = await Promise.all([
        fetch('/api/trip-records/options'),
        fetch('/api/drivers/options?activeOnly=true')
      ]);

      const [optionsData, driversData] = await Promise.all([
        optionsResponse.json(),
        driversResponse.json()
      ]);

      if (optionsResponse.ok) {
        setVehicles(optionsData.vehicles);
        setCustomers(optionsData.customers);
        setItems(optionsData.items || []);
      } else {
        console.error('Failed to fetch options:', optionsData.error);
        showSnackbar('ไม่สามารถโหลดข้อมูลได้', 'error');
      }

      if (driversResponse.ok) {
        setAllDrivers(driversData.drivers);
      } else {
        console.error('Failed to fetch drivers:', driversData.error);
        showSnackbar('ไม่สามารถโหลดรายการคนขับได้', 'error');
      }
    } catch (error) {
      console.error('Error fetching options:', error);
      showSnackbar('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
  };

  // Calculate days and allowance when dates change
  useEffect(() => {
    const calculateAllowance = () => {
      if (formData.departureDate && formData.returnDate && tripRecord) {
        const depDate = new Date(formData.departureDate);
        const retDate = new Date(formData.returnDate);
        const timeDiff = retDate.getTime() - depDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        setCalculatedDays(daysDiff);
        
        // ใช้อัตราเบี้ยเลี้ยงเดิมจาก tripRecord (ไม่ดึงจากระบบใหม่)
        const originalAllowanceRate = Number(tripRecord.allowanceRate);
        setAllowanceRate(originalAllowanceRate);
        const totalAllowance = daysDiff >= 1 ? daysDiff * originalAllowanceRate : 0;
        setCalculatedAllowance(totalAllowance);
      } else {
        setCalculatedDays(0);
        setCalculatedAllowance(0);
      }
    };

    calculateAllowance();
  }, [formData.departureDate, formData.returnDate, tripRecord]);

  // Calculate estimated distance when customer changes, but use saved value if customer is the same
  useEffect(() => {
    if (!tripRecord) return;
    
    // Check if customer has changed from the original trip record
    const isCustomerChanged = formData.customer && formData.customer.id !== tripRecord.customerId;
    
    if (isCustomerChanged && formData.customer?.cmMileage) {
      // Customer changed - calculate new distance from new customer data
      setEstimatedDistanceFromSystem(formData.customer.cmMileage * 2);
    } else {
      // Same customer - use saved value from trip record
      setEstimatedDistanceFromSystem(Number(tripRecord.estimatedDistance || 0));
    }
  }, [formData.customer, tripRecord]);

  // Calculate actual distance from odometer readings
  useEffect(() => {
    if (formData.odometerBefore && formData.odometerAfter) {
      const before = parseInt(formData.odometerBefore);
      const after = parseInt(formData.odometerAfter);
      if (after > before) {
        const distance = after - before;
        setActualDistance(distance);
        // Auto-fill actual distance field
        setFormData(prev => ({ 
          ...prev, 
          actualDistance: distance.toString() 
        }));
      } else {
        setActualDistance(0);
        // Reset actual distance if calculation fails
        setFormData(prev => ({ 
          ...prev, 
          actualDistance: '' 
        }));
      }
    } else {
      setActualDistance(0);
      // Reset actual distance if missing odometer values
      setFormData(prev => ({ 
        ...prev, 
        actualDistance: '' 
      }));
    }
  }, [formData.odometerBefore, formData.odometerAfter]);

  // Match alternative driver when drivers are loaded and trip has driverType = 'other'
  useEffect(() => {
    if (allDrivers.length > 0 && tripRecord && 
        tripRecord.driverType === 'other' && 
        tripRecord.driverLicense &&
        formData.selectedDriver === 'other' && 
        !formData.alternativeDriver) {
      
      const matchedDriver = allDrivers.find(driver => 
        driver.driverLicense === tripRecord.driverLicense
      );
      
      if (matchedDriver) {
        setFormData(prev => ({ 
          ...prev, 
          alternativeDriver: matchedDriver 
        }));
      }
    }
  }, [allDrivers, tripRecord, formData.selectedDriver, formData.alternativeDriver]);

  // Calculate distance cost when customer or distance rate changes
  useEffect(() => {
    const calculateDistanceCostValue = async () => {
      if (formData.customer?.cmMileage && distanceRate > 0) {
        const estimatedDistance = formData.customer.cmMileage * 2; // ไป-กลับ
        const cost = await calculateDistanceCost(estimatedDistance, distanceRate);
        setCalculatedDistanceCost(cost);
      } else {
        setCalculatedDistanceCost(0);
      }
    };

    calculateDistanceCostValue();
  }, [formData.customer, distanceRate]);

  // Load distance rate when component mounts
  useEffect(() => {
    const loadDistanceRate = async () => {
      try {
        const rate = await getDistanceRate();
        setDistanceRate(rate);
      } catch (error) {
        console.error('Error loading distance rate:', error);
        setDistanceRate(0);
      }
    };

    loadDistanceRate();
  }, []);

  // Load trip fee rate when component mounts
  useEffect(() => {
    const loadTripFeeRate = async () => {
      try {
        const response = await fetch('/api/system-settings/trip_fee');
        const data = await response.json();
        if (response.ok && data.success) {
          setTripFeeRate(parseFloat(data.value) || 0);
        } else {
          setTripFeeRate(0);
        }
      } catch (error) {
        console.error('Error loading trip fee rate:', error);
        setTripFeeRate(0);
      } finally {
        setTripFeeLoaded(true);
      }
    };

    loadTripFeeRate();
  }, []);

  // Trip Items Functions
  const addTripItem = () => {
    const newItem: TripItem = {
      id: Date.now().toString(),
      itemId: 0,
      quantity: '',
      unit: '',
      unitPrice: '',
      totalPrice: '',
      remark: '',
    };
    setTripItems([newItem, ...tripItems]);
  };

  const removeTripItem = (id: string) => {
    setTripItems(tripItems.filter(item => item.id !== id));
  };

  const updateTripItem = (id: string, field: keyof TripItem, value: any) => {
    setTripItems(tripItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Auto-calculate total price when quantity or unitPrice changes
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = parseFloat(field === 'quantity' ? value : updated.quantity) || 0;
          const price = parseFloat(field === 'unitPrice' ? value : updated.unitPrice) || 0;
          updated.totalPrice = (qty * price).toFixed(2);
        }
        
        return updated;
      }
      return item;
    }));
  };

  const calculateTotalItemsValue = () => {
    return tripItems
      .filter(item => item.itemId > 0)
      .reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
  };

  const calculateTotalCosts = () => {
    const distanceCheck = parseFloat(formData.distanceCheckFee) || 0;
    const fuel = parseFloat(formData.fuelCost) || 0;
    const toll = parseFloat(formData.tollFee) || 0;
    const repair = parseFloat(formData.repairCost) || 0;
    const distanceCost = calculatedDistanceCost || 0; // ค่าระยะทาง
    const itemsValue = calculateTotalItemsValue();
    const tripFee = includeTripFee ? tripFeeRate : 0; // ค่าเที่ยว
    
    // ค่าใช้จ่ายที่ต้องจ่ายพนักงานขับรถ = ค่าเบี้ยเลี้ยง + ค่าพัสดุ + ค่าระยะทาง + ค่าเที่ยว
    const driverExpenses = calculatedAllowance + itemsValue + distanceCost + tripFee;
    
    // ค่าใช้จ่ายของบริษัท = ค่าซ่อมแซม + ค่าทางด่วน + ค่าน้ำมัน + ค่าเช็คระยะ
    const companyExpenses = repair + toll + fuel + distanceCheck;
    
    return {
      // สำหรับ backward compatibility
      costs: distanceCheck + fuel + toll + repair + distanceCost,
      distanceCost, // เพิ่มค่าระยะทางแยกออกมา
      itemsValue,
      total: distanceCheck + fuel + toll + repair + distanceCost + itemsValue,
      
      // หมวดหมู่ใหม่
      driverExpenses,     // ค่าใช้จ่ายที่ต้องจ่ายพนักงานขับรถ
      companyExpenses,    // ค่าใช้จ่ายของบริษัท
      grandTotal: driverExpenses + companyExpenses
    };
  };


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Validate document number for duplicates
  const validateDocumentNumber = async (documentNumber: string) => {
    if (!documentNumber.trim()) {
      setDocumentNumberError('');
      return true;
    }

    try {
      setValidatingDocumentNumber(true);
      const response = await fetch(`/api/trip-records/validate-document?documentNumber=${encodeURIComponent(documentNumber.trim())}&excludeId=${tripId}`);
      const data = await response.json();

      if (response.ok) {
        if (data.exists) {
          const existingRecord = data.existingRecord;
          const errorMessage = `เลขที่เอกสาร "${documentNumber}" มีอยู่แล้วในระบบ\nรถ: ${existingRecord.vehicle.licensePlate}\nลูกค้า: ${existingRecord.customer.cmCode} - ${existingRecord.customer.cmName}\nวันที่: ${new Date(existingRecord.departureDate).toLocaleDateString('th-TH')}`;
          setDocumentNumberError(errorMessage);
          return false;
        } else {
          setDocumentNumberError('');
          return true;
        }
      } else {
        console.error('Validation error:', data);
        setDocumentNumberError('ไม่สามารถตรวจสอบเลขที่เอกสารได้');
        return false;
      }
    } catch (error) {
      console.error('Validation error:', error);
      setDocumentNumberError('เกิดข้อผิดพลาดในการตรวจสอบ');
      return false;
    } finally {
      setValidatingDocumentNumber(false);
    }
  };

  // Filter alternative drivers to exclude main and backup drivers of the selected vehicle
  const getFilteredAlternativeDrivers = () => {
    if (!formData.vehicle) return allDrivers;
    
    const excludedLicenses = [
      formData.vehicle.mainDriver?.driverLicense || formData.vehicle.driverLicense,
      formData.vehicle.backupDriver?.driverLicense || formData.vehicle.backupDriverLicense
    ].filter(license => license && license.trim() !== '');
    
    return allDrivers.filter(driver => 
      !excludedLicenses.includes(driver.driverLicense)
    );
  };

  // Handle field changes with driver reset when vehicle changes
  const handleChange = (field: keyof FormData, value: any) => {
    if (field === 'vehicle') {
      // Reset selected driver when vehicle changes
      setFormData(prev => ({ 
        ...prev, 
        [field]: value, 
        selectedDriver: null,
        driverLicense: undefined,
        driverName: '',
        driverType: undefined,
        alternativeDriver: null
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    // Validation with auto focus
    if(!formData.documentNumber) {
      showSnackbar('กรุณากรอกเลขที่เอกสาร', 'error');
      setTimeout(() => {
        if (documentNumberRef.current) {
          const input = documentNumberRef.current.querySelector('input');
          if (input) input.focus();
        }
      }, 100);
      return;
    }

    // Validate document number for duplicates
    const isDocumentNumberValid = await validateDocumentNumber(formData.documentNumber);
    if (!isDocumentNumberValid) {
      showSnackbar('เลขที่เอกสารซ้ำกับเที่ยวรถที่มีอยู่แล้ว', 'error');
      setTimeout(() => {
        if (documentNumberRef.current) {
          const input = documentNumberRef.current.querySelector('input');
          if (input) input.focus();
        }
      }, 100);
      return;
    }

    if (!formData.vehicle) {
      showSnackbar('กรุณาเลือกรถ', 'error');
      return;
    }

    // Validate driver selection
    if (formData.vehicle) {
      if (!formData.selectedDriver) {
        setDriverLicenseError('กรุณาเลือกคนขับ');
        showSnackbar('กรุณาเลือกคนขับ', 'error');
        return;
      }
    }

    if (!formData.customer) {
      showSnackbar('กรุณาเลือกลูกค้า', 'error');
      return;
    }

    if (!formData.departureDate) {
      showSnackbar('กรุณาเลือกวันที่ออกเดินทาง', 'error');
      return;
    }

    // กฎใหม่ (สมมาตร): มีวันที่ต้องมีเวลา / มีเวลาต้องมีวันที่ (แยกคู่)
    if (formData.departureDate && !formData.departureTime) {
      showSnackbar('กรุณาใส่เวลาออกเดินทาง', 'error');
      setTimeout(() => departureTimeRef.current?.focus(), 50);
      return;
    }
    if (formData.returnDate && !formData.returnTime) {
      showSnackbar('กรุณาใส่เวลากลับ', 'error');
      setTimeout(() => returnTimeRef.current?.focus(), 50);
      return;
    }
    if (formData.departureTime && !formData.departureDate) {
      showSnackbar('มีเวลาออกเดินทาง แต่ยังไม่ได้เลือกวันที่ออก', 'error');
      setTimeout(() => departureDateRef.current?.querySelector('input')?.focus(), 50);
      return;
    }
    if (formData.returnTime && !formData.returnDate) {
      showSnackbar('มีเวลากลับ แต่ยังไม่ได้เลือกวันที่กลับ', 'error');
      setTimeout(() => returnDateRef.current?.querySelector('input')?.focus(), 50);
      return;
    }
    // returnDate optional now
    // ยกเลิก validation ระยะทางจริง เพื่อให้สร้างวันเดินทางก่อนได้แม้ยังไม่รู้วันกลับ
    // if (!formData.actualDistance) {
    //   showSnackbar('กรุณากรอกระยะทางจริง', 'error');
    //   return;
    // }

    // if (parseFloat(formData.actualDistance) <= 0) {
    //   showSnackbar('ระยะทางจริงต้องมากกว่า 0', 'error');
    //   return;
    // }

    setSubmitting(true);
    
    // Debug: แสดงข้อมูล tripItems ที่จะส่งไป
    const itemsToSend = tripItems.filter(item => item.itemId > 0).map(item => ({
      itemId: item.itemId,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice || null,
      totalPrice: item.totalPrice || null,
      remark: item.remark || null,
    }));
    console.log('Sending tripItems:', itemsToSend);
    
    // Determine driver information based on selectedDriver
    let driverName = '';
    let driverType = '';
    let driverLicense = '';
    
    if (formData.selectedDriver === 'main' && formData.vehicle) {
      const mainDriverData = formData.vehicle.mainDriver || {
        driverName: formData.vehicle.driverName,
        driverLicense: formData.vehicle.driverLicense
      };
      driverName = mainDriverData.driverName || '';
      driverType = 'main';
      driverLicense = mainDriverData.driverLicense || '';
    } else if (formData.selectedDriver === 'backup' && formData.vehicle) {
      const backupDriverData = formData.vehicle.backupDriver || {
        driverName: formData.vehicle.backupDriverName,
        driverLicense: formData.vehicle.backupDriverLicense
      };
      driverName = backupDriverData.driverName || '';
      driverType = 'backup';
      driverLicense = backupDriverData.driverLicense || '';
    } else if (formData.selectedDriver === 'other' && formData.alternativeDriver) {
      driverName = formData.alternativeDriver.driverName || '';
      driverType = 'other';
      driverLicense = formData.alternativeDriver.driverLicense || '';
    }

    try {
      const response = await fetch(`/api/trip-records/${tripId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: formData.vehicle.id,
          customerId: formData.customer.id,
          departureDate: formData.departureDate ? `${formData.departureDate.getFullYear()}-${String(formData.departureDate.getMonth()+1).padStart(2,'0')}-${String(formData.departureDate.getDate()).padStart(2,'0')}` : null,
          departureTime: formData.departureTime,
          returnDate: formData.returnDate ? `${formData.returnDate.getFullYear()}-${String(formData.returnDate.getMonth()+1).padStart(2,'0')}-${String(formData.returnDate.getDate()).padStart(2,'0')}` : null,
          returnTime: formData.returnTime || null,
          odometerBefore: formData.odometerBefore || null,
          odometerAfter: formData.odometerAfter || null,
          actualDistance: formData.actualDistance || null,
          estimatedDistance: estimatedDistanceFromSystem || 0,
          loadingDate: formData.loadingDate ? `${formData.loadingDate.getFullYear()}-${String(formData.loadingDate.getMonth()+1).padStart(2,'0')}-${String(formData.loadingDate.getDate()).padStart(2,'0')}` : null,
          distanceCheckFee: formData.distanceCheckFee || null,
          fuelCost: formData.fuelCost || null,
          tollFee: formData.tollFee || null,
          repairCost: formData.repairCost || null,
          tripFee: includeTripFee ? tripFeeRate : 0,
          tripItems: itemsToSend,
          documentNumber: formData.documentNumber || null,
          remark: formData.remark || null,
          driverLicense: driverLicense || null,
          driverName: driverName || null,
          driverType: driverType || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar('อัปเดตบันทึกการเดินทางสำเร็จ', 'success');
        // Redirect to trip records list
        window.location.href = '/trip-records';
      } else {
        showSnackbar(result.error || 'ไม่สามารถอัปเดตข้อมูลได้', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการอัปเดตข้อมูล', 'error');
    } finally {
      setSubmitting(false);
    }
  };



  useEffect(() => {
    const loadData = async () => {
      if (tripId) {
        try {
          setLoading(true);
          await Promise.all([loadTripRecord(), fetchOptions()]);
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadData();
  }, [tripId]);

  if (loading || !tripFeeLoaded) {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '60vh',
          gap: 3
        }}>

          <CircularProgress size={40} thickness={4} />

        </Box>
      </Layout>
    );
  }

  if (!tripRecord) {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '60vh',
          gap: 3,
          px: 3
        }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}>
            <TripIcon sx={{ fontSize: 48, color: 'error.main' }} />
            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 500 }}>
              ไม่พบข้อมูลการเดินทาง
            </Typography>
          </Box>
          
          <Alert severity="error" sx={{ maxWidth: 400 }}>
            ไม่พบข้อมูลการเดินทางที่ระบุ กรุณาตรวจสอบรหัสการเดินทางหรือลองใหม่อีกครั้ง
          </Alert>
          
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            href="/trip-records"
            sx={{ mt: 2 }}
          >
            กลับไปหน้ารายการ
          </Button>
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
            mb: 2,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TripIcon sx={{ color: 'primary.main', fontSize: 32 }} />
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                แก้ไขบันทึกการเดินทาง
              </Typography>
            </Box>
            
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              href="/trip-records"
              sx={{ borderRadius: 2 }}
            >
              กลับ
            </Button>
          </Box>

          {/* Form */}
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', lg: 'row' } }}>
            {/* Main Form */}
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CarIcon />
                  ข้อมูลการเดินทาง
                </Typography>

                {/* Document Number */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    ref={documentNumberRef}
                    fullWidth
                    label="เลขที่เอกสาร *"
                    size="small"
                    value={formData.documentNumber}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, documentNumber: e.target.value }));
                      setDocumentNumberError(''); // Clear error when user types
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        validateDocumentNumber(e.target.value);
                      }
                    }}
                    required
                    error={!!documentNumberError}
                    helperText={documentNumberError || ''}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          📄
                        </InputAdornment>
                      ),
                      endAdornment: validatingDocumentNumber ? (
                        <InputAdornment position="end">
                          <CircularProgress size={20} />
                        </InputAdornment>
                      ) : undefined,
                      inputProps: { maxLength: 10 },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: documentNumberError ? 'error.50' : 'primary.50',
                        borderRadius: 2,
                        '&:hover': {
                          backgroundColor: documentNumberError ? 'error.100' : 'primary.100',
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'background.paper',
                        }
                      },
                      '& .MuiFormHelperText-root': {
                        whiteSpace: 'pre-line', // Allow line breaks in error message
                        fontSize: '0.75rem',
                      }
                    }}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Vehicle Selection */}
                <Box sx={{ mb: 2 }}>
                  <Autocomplete
                    ref={vehicleRef}
                    fullWidth
                    size="small"
                    options={vehicles}
                    getOptionLabel={(option) => `${option.licensePlate} - ${option.brand} ${option.model}`}
                    value={formData.vehicle}
                    onChange={(_, newValue) => {
                      setDriverLicenseError('');
                      handleChange('vehicle', newValue);
                    }}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="เลือกรถ *" 
                        size="small"
                        required
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <CarIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box component="li" key={key} {...otherProps}>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {option.licensePlate} - {option.brand} {option.model}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.vehicleType}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    }}
                  />
                </Box>

                {/* Driver Selection (using vehicle table data) */}
                {formData.vehicle && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ 
                        fontWeight: 600,
                        color: 'text.primary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        เลือกคนขับ *
                      </Typography>
                      
                    </Box>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 1.5, 
                      flexDirection: { xs: 'column', sm: 'row' }
                    }}>
                      {/* Main Driver Card */}
                      {(() => {
                        const vehicle = formData.vehicle!;
                        const mainDriverData = vehicle.mainDriver || {
                          driverName: vehicle.driverName,
                          driverLicense: vehicle.driverLicense,
                          driverImage: vehicle.driverImage
                        };
                        
                        if (mainDriverData.driverName && mainDriverData.driverLicense) {
                          return (
                            <Paper
                              onClick={() => {
                                // ถ้ามีคนขับแทนอยู่ ห้ามเลือกคนขับหลัก
                                if (formData.alternativeDriver) {
                                  return;
                                }
                                
                                if (formData.selectedDriver === 'main') {
                                  // ถ้าเลือกคนขับหลักอยู่แล้ว คลิกอีกครั้งเพื่อยกเลิก
                                  handleChange('selectedDriver', null);
                                } else {
                                  // เลือกคนขับหลักและยกเลิกคนขับแทน
                                  handleChange('selectedDriver', 'main');
                                  setFormData(prev => ({ ...prev, alternativeDriver: null }));
                                }
                              }}
                              sx={{
                                flex: 1,
                                p: 2,
                                cursor: formData.alternativeDriver ? 'not-allowed' : 'pointer',
                                border: '2px solid',
                                borderColor: formData.selectedDriver === 'main' ? 'primary.main' : formData.alternativeDriver ? 'grey.300' : 'grey.200',
                                bgcolor: formData.selectedDriver === 'main' ? 'primary.50' : formData.alternativeDriver ? 'grey.50' : 'background.paper',
                                borderRadius: 2,
                                transition: 'all 0.2s ease-in-out',
                                minHeight: '80px',
                                display: 'flex',
                                alignItems: 'center',
                                position: 'relative',
                                opacity: formData.alternativeDriver ? 0.5 : 1,
                                '&:hover': !formData.alternativeDriver ? {
                                  borderColor: 'primary.main',
                                  transform: 'translateY(-1px)',
                                  boxShadow: formData.selectedDriver === 'main' 
                                    ? '0 6px 20px rgba(25, 118, 210, 0.3)' 
                                    : '0 4px 12px rgba(0,0,0,0.1)'
                                } : {},
                                ...(formData.selectedDriver === 'main' && {
                                  boxShadow: '0 4px 16px rgba(25, 118, 210, 0.2)',
                                  '&:hover::after': {
                                    content: '"คลิกอีกครั้งเพื่อยกเลิก"',
                                    position: 'absolute',
                                    top: '-30px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    whiteSpace: 'nowrap',
                                    zIndex: 1000
                                  }
                                }),
                                ...(formData.alternativeDriver && {
                                  '&:hover::after': {
                                    content: '"ต้องยกเลิกคนขับแทนก่อน"',
                                    position: 'absolute',
                                    top: '-30px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'rgba(255,152,0,0.9)',
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    whiteSpace: 'nowrap',
                                    zIndex: 1000
                                  }
                                })
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                                <Avatar
                                  src={getImageUrl(mainDriverData.driverImage)}
                                  sx={{ 
                                    width: 48, 
                                    height: 48,
                                    border: '2px solid',
                                    borderColor: formData.selectedDriver === 'main' ? 'primary.main' : 'grey.300',
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {getDriverInitials(mainDriverData.driverName)}
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
                                    {mainDriverData.driverName}
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
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: formData.selectedDriver === 'main' ? 'primary.main' : 'text.secondary',
                                      fontFamily: 'monospace',
                                      fontSize: '0.7rem',
                                      display: 'block'
                                    }}
                                  >
                                    ใบขับขี่: {mainDriverData.driverLicense}
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
                          );
                        }
                        return null;
                      })()}

                      {/* Backup Driver Card */}
                      {(() => {
                        const vehicle = formData.vehicle!;
                        const backupDriverData = vehicle.backupDriver || {
                          driverName: vehicle.backupDriverName,
                          driverLicense: vehicle.backupDriverLicense,
                          driverImage: vehicle.backupDriverImage
                        };
                        
                        if (backupDriverData.driverName && backupDriverData.driverLicense) {
                          return (
                            <Paper
                              onClick={() => {
                                // ถ้ามีคนขับแทนอยู่ ห้ามเลือกคนขับรอง
                                if (formData.alternativeDriver) {
                                  return;
                                }
                                
                                if (formData.selectedDriver === 'backup') {
                                  // ถ้าเลือกคนขับรองอยู่แล้ว คลิกอีกครั้งเพื่อยกเลิก
                                  handleChange('selectedDriver', null);
                                } else {
                                  // เลือกคนขับรองและยกเลิกคนขับแทน
                                  handleChange('selectedDriver', 'backup');
                                  setFormData(prev => ({ ...prev, alternativeDriver: null }));
                                }
                              }}
                              sx={{
                                flex: 1,
                                p: 2,
                                cursor: formData.alternativeDriver ? 'not-allowed' : 'pointer',
                                border: '2px solid',
                                borderColor: formData.selectedDriver === 'backup' ? 'primary.main' : formData.alternativeDriver ? 'grey.300' : 'grey.200',
                                bgcolor: formData.selectedDriver === 'backup' ? 'primary.50' : formData.alternativeDriver ? 'grey.50' : 'background.paper',
                                borderRadius: 2,
                                transition: 'all 0.2s ease-in-out',
                                minHeight: '80px',
                                display: 'flex',
                                alignItems: 'center',
                                position: 'relative',
                                opacity: formData.alternativeDriver ? 0.5 : 1,
                                '&:hover': !formData.alternativeDriver ? {
                                  borderColor: 'primary.main',
                                  transform: 'translateY(-1px)',
                                  boxShadow: formData.selectedDriver === 'backup' 
                                    ? '0 6px 20px rgba(25, 118, 210, 0.3)' 
                                    : '0 4px 12px rgba(0,0,0,0.1)'
                                } : {},
                                ...(formData.selectedDriver === 'backup' && {
                                  boxShadow: '0 4px 16px rgba(25, 118, 210, 0.2)',
                                  '&:hover::after': {
                                    content: '"คลิกอีกครั้งเพื่อยกเลิก"',
                                    position: 'absolute',
                                    top: '-30px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    whiteSpace: 'nowrap',
                                    zIndex: 1000
                                  }
                                }),
                                ...(formData.alternativeDriver && {
                                  '&:hover::after': {
                                    content: '"ต้องยกเลิกคนขับแทนก่อน"',
                                    position: 'absolute',
                                    top: '-30px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'rgba(255,152,0,0.9)',
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    whiteSpace: 'nowrap',
                                    zIndex: 1000
                                  }
                                })
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                                <Avatar
                                  src={getImageUrl(backupDriverData.driverImage)}
                                  sx={{ 
                                    width: 48, 
                                    height: 48,
                                    border: '2px solid',
                                    borderColor: formData.selectedDriver === 'backup' ? 'primary.main' : 'grey.300',
                                    bgcolor: 'secondary.main',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {getDriverInitials(backupDriverData.driverName)}
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
                                    {backupDriverData.driverName}
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
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: formData.selectedDriver === 'backup' ? 'primary.main' : 'text.secondary',
                                      fontFamily: 'monospace',
                                      fontSize: '0.7rem',
                                      display: 'block'
                                    }}
                                  >
                                    ใบขับขี่: {backupDriverData.driverLicense}
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
                          );
                        }
                        return null;
                      })()}
                    </Box>

                    {/* Alternative Driver Dropdown */}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
                        เลือกคนขับแทน (กรณีคนขับหลัก/รองไม่ว่าง)
                        
                      </Typography>
                      
                      <Autocomplete
                        fullWidth
                        size="small"
                        disabled={formData.selectedDriver === 'main' || formData.selectedDriver === 'backup'}
                        options={getFilteredAlternativeDrivers()}
                        getOptionLabel={(option) => `${option.driverName} - ${option.driverLicense}`}
                        value={formData.alternativeDriver}
                        onChange={(_, newValue) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            alternativeDriver: newValue,
                            selectedDriver: newValue ? 'other' : null
                          }));
                          setDriverLicenseError('');
                        }}
                        renderInput={(params) => (
                          <TextField 
                            {...params} 
                            label={formData.alternativeDriver ? "คนขับแทน" : "คนขับแทน"} 
                            size="small"
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <InputAdornment position="start">
                                  👤
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
                                src={getImageUrl(option.driverImage)}
                                sx={{ 
                                  width: 32, 
                                  height: 32,
                                  bgcolor: 'success.main',
                                  color: 'white',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold'
                                }}
                              >
                                {getDriverInitials(option.driverName)}
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
                        noOptionsText={getFilteredAlternativeDrivers().length === 0 ? "ไม่มีคนขับแทนให้เลือก (คนขับทั้งหมดเป็นคนขับของรถคันนี้)" : "ไม่พบคนขับ"}
                      />
                      {getFilteredAlternativeDrivers().length === 0 && allDrivers.length > 0 && (
                        <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                          💡 คนขับทั้งหมดเป็นคนขับของรถคันนี้แล้ว
                        </Typography>
                      )}
                      
                      
                    </Box>
                    
                    {driverLicenseError && (
                      <Typography variant="caption" color="error" sx={{ ml: 0.5, mt: 1, display: 'block' }}>
                        {driverLicenseError}
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Customer Selection */}
                <Box sx={{ mb: 2 }}>
                  <Autocomplete
                    ref={customerRef}
                    fullWidth
                    size="small"
                    options={customers}
                    getOptionLabel={(option) => `${option.cmCode} - ${option.cmName}`}
                    value={formData.customer}
                    onChange={(_, newValue) => setFormData(prev => ({ ...prev, customer: newValue }))}
                    renderInput={(params) => (
                      <TextField {...params} label="เลือกลูกค้า *" size="small" required />
                    )}
                  />
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Date and Time */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                  {/* 70% Date / 30% Time on md+ */}
                  <Box sx={{ flex: { xs: 1, md: 7 } }}>
                    <DatePicker
                      ref={departureDateRef}
                      label="วันที่ออกเดินทาง *"
                      value={formData.departureDate}
                      onChange={(newValue) => setFormData(prev => ({ ...prev, departureDate: newValue }))}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                          required: true,                          
                          InputProps: formData.departureDate ? {
                            endAdornment: (
                              <Button
                                onClick={() => setFormData(prev => ({ ...prev, departureDate: null }))}
                                size="small"
                                sx={{
                                  minWidth: 0,
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  lineHeight: 1,
                                  fontWeight: '400',
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
                        }
                      }}
                    />
                  </Box>
                  <Box sx={{ flex: { xs: 1, md: 3 } }}>
                    <TimePicker
                      label={formData.departureDate ? 'เวลาออกเดินทาง *' : 'เวลาออกเดินทาง'}
                      value={formData.departureTime ? parse(formData.departureTime, 'HH:mm', new Date()) : null}
                      onChange={(newValue) => {
                        const timeString = newValue ? format(newValue, 'HH:mm') : '';
                        setFormData(prev => ({ ...prev, departureTime: timeString }));
                      }}
                      ampm={false}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                          inputRef: departureTimeRef,
                          InputProps: formData.departureTime ? {
                            endAdornment: (
                              <InputAdornment position="end" sx={{ mr: -0.5 }}>
                                <Button
                                  onClick={() => setFormData(prev => ({ ...prev, departureTime: '' }))}
                                  size="small"
                                  sx={{
                                    minWidth: 0,
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    lineHeight: 1,
                                    fontWeight: '400',
                                    bgcolor: 'grey.200',
                                    color: 'grey.700',
                                    '&:hover': { bgcolor: 'grey.300' },
                                    fontSize: 12,
                                    p: 0
                                  }}
                                >
                                  x
                                </Button>
                              </InputAdornment>
                            )
                          } : undefined
                        }
                      }}
                    />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                  {/* 70% Date / 30% Time on md+ */}
                  <Box sx={{ flex: { xs: 1, md: 7 } }}>
                    <DatePicker
                      ref={returnDateRef}
                      label="วันที่กลับ (ไม่บังคับ)"
                      value={formData.returnDate}
                      onChange={(newValue) => setFormData(prev => ({ ...prev, returnDate: newValue }))}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                          InputProps: formData.returnDate ? {
                            endAdornment: (
                              <Button
                                onClick={() => setFormData(prev => ({ ...prev, returnDate: null }))}
                                size="small"
                                sx={{
                                  minWidth: 0,
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  lineHeight: 1,
                                  fontWeight: '400',
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
                        }
                      }}
                      minDate={formData.departureDate || undefined}
                    />
                  </Box>
                  <Box sx={{ flex: { xs: 1, md: 3 } }}>
                    <TimePicker
                      label={formData.returnDate ? 'เวลากลับ *' : 'เวลากลับ'}
                      value={formData.returnTime ? parse(formData.returnTime, 'HH:mm', new Date()) : null}
                      onChange={(newValue) => {
                        const timeString = newValue ? format(newValue, 'HH:mm') : '';
                        setFormData(prev => ({ ...prev, returnTime: timeString }));
                      }}
                      ampm={false}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                          inputRef: returnTimeRef,
                          InputProps: formData.returnTime ? {
                            endAdornment: (
                              <InputAdornment position="end" sx={{ mr: -0.5 }}>
                                <Button
                                  onClick={() => setFormData(prev => ({ ...prev, returnTime: '' }))}
                                  size="small"
                                  sx={{
                                    minWidth: 0,
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    lineHeight: 1,
                                    fontWeight: 'bold',
                                    bgcolor: 'grey.200',
                                    color: 'grey.700',
                                    '&:hover': { bgcolor: 'grey.300' },
                                    fontSize: 12,
                                    p: 0
                                  }}
                                >
                                  x
                                </Button>
                              </InputAdornment>
                            )
                          } : undefined
                        }
                      }}
                    />
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                
                {/* Additional Information */}
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  ข้อมูลเพิ่มเติม
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <DatePicker
                    label="วันที่ขึ้นของ"
                    value={formData.loadingDate}
                    onChange={(newValue) => setFormData(prev => ({ ...prev, loadingDate: newValue }))}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: 'small',
                        InputProps: formData.loadingDate ? {
                          endAdornment: (
                            <Button
                              onClick={() => setFormData(prev => ({ ...prev, loadingDate: null }))}
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
                      }
                    }}
                  />
                </Box>

                {/* Cost Fields */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="ค่าเช็คระยะ"
                      type="text"
                      size="small"
                      value={formData.distanceCheckFee}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setFormData(prev => ({ ...prev, distanceCheckFee: value }));
                        }
                      }}
                      inputProps={{ inputMode: 'decimal' }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">บาท</InputAdornment>,
                      }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="ค่าน้ำมันรถ"
                      type="text"
                      size="small"
                      value={formData.fuelCost}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setFormData(prev => ({ ...prev, fuelCost: value }));
                        }
                      }}
                      inputProps={{ inputMode: 'decimal' }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">บาท</InputAdornment>,
                      }}
                    />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="ค่าทางด่วน"
                      type="text"
                      size="small"
                      value={formData.tollFee}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setFormData(prev => ({ ...prev, tollFee: value }));
                        }
                      }}
                      inputProps={{ inputMode: 'decimal' }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">บาท</InputAdornment>,
                      }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="ค่าซ่อมแซม"
                      type="text"
                      size="small"
                      value={formData.repairCost}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setFormData(prev => ({ ...prev, repairCost: value }));
                        }
                      }}
                      inputProps={{ inputMode: 'decimal' }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">บาท</InputAdornment>,
                      }}
                    />
                  </Box>
                </Box>

                {/* Trip Fee Checkbox */}
                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={includeTripFee}
                        onChange={(e) => setIncludeTripFee(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          คิดค่าเที่ยว {tripFeeRate} บาท
                        </Typography>
                        
                      </Box>
                    }
                  />
                  
                </Box>


                <Divider sx={{ my: 3 }} />

                {/* Odometer Section */}
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  เลขไมล์และระยะทาง
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="เลขไมล์ก่อนไป"
                      type="text"
                      size="small"
                      value={formData.odometerBefore}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d+$/.test(value)) {
                          setFormData(prev => ({ ...prev, odometerBefore: value }));
                        }
                      }}
                      inputProps={{ inputMode: 'numeric' }}
                      helperText="บันทึกเลขไมล์ก่อนออกเดินทาง"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">กม.</InputAdornment>,
                      }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="เลขไมล์หลังกลับ"
                      type="text"
                      size="small"
                      value={formData.odometerAfter}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d+$/.test(value)) {
                          setFormData(prev => ({ ...prev, odometerAfter: value }));
                        }
                      }}
                      inputProps={{ inputMode: 'numeric' }}
                      helperText="บันทึกเลขไมล์หลังกลับ"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">กม.</InputAdornment>,
                      }}
                    />
                  </Box>

                  {/* Actual Distance - User Input */}
                    <Box sx={{ flex: 1 }}>
                      <TextField
                        fullWidth
                        label="ระยะทางจริง (กิโลเมตร)"
                        type="text"
                        size="small"
                        value={formData.actualDistance}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setFormData(prev => ({ ...prev, actualDistance: value }));
                          }
                        }}
                        inputProps={{ inputMode: 'decimal' }}
                        helperText="ระบุระยะทางจริงที่ใช้ในการเดินทาง (ไม่บังคับ)"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">กม.</InputAdornment>,
                          readOnly: true,
                        }}
                      />
                    </Box>
                </Box>

                


                {/* Distance Comparison - Professional Thai with Shadow */}
                {(actualDistance > 0 || (estimatedDistanceFromSystem > 0 || (tripRecord && tripRecord.estimatedDistance > 0))) && (
                  <Box sx={{ 
                    mb: 3,
                    p: 2,
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    {/* Header */}
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        mb: 2,
                        fontWeight: 500,
                        color: 'text.primary',
                        fontSize: '1rem',
                        letterSpacing: '0.02em'
                      }}
                    >
                      เปรียบเทียบระยะทาง
                    </Typography>

                    {/* Data Grid */}
                    <Box sx={{ 
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                      gap: { xs: 1.5, md: 3 },
                      py: 1
                    }}>
                      {/* Actual Distance */}
                      <Box sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        backgroundColor: 'grey.50',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                          transform: 'translateY(-1px)'
                        }
                      }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            color: 'text.secondary',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            mb: 0.5,
                            display: 'block'
                          }}
                        >
                          ระยะทางจริง
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                          <Typography 
                            variant="h4" 
                            sx={{ 
                              fontWeight: 300,
                              color: 'text.primary',
                              lineHeight: 1,
                              fontSize: { xs: '1.5rem', md: '1.8rem' },
                              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}
                          >
                            {actualDistance > 0 ? actualDistance.toLocaleString('th-TH') : parseFloat(formData.actualDistance || '0').toLocaleString('th-TH')}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'text.secondary',
                              fontWeight: 400,
                              fontSize: '0.8rem'
                            }}
                          >
                            กม.
                          </Typography>
                        </Box>
                      </Box>

                      {/* System Distance */}
                      <Box sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        backgroundColor: 'grey.50',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                          transform: 'translateY(-1px)'
                        }
                      }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            color: 'text.secondary',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            mb: 0.5,
                            display: 'block'
                          }}
                        >
                          ระยะทางระบบ
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                          <Typography 
                            variant="h4" 
                            sx={{ 
                              fontWeight: 300,
                              color: 'text.primary',
                              lineHeight: 1,
                              fontSize: { xs: '1.5rem', md: '1.8rem' },
                              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}
                          >
                            {estimatedDistanceFromSystem.toLocaleString('th-TH')}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'text.secondary',
                              fontWeight: 400,
                              fontSize: '0.8rem'
                            }}
                          >
                            กม.
                          </Typography>
                        </Box>
                        {(() => {
                          const isCustomerChanged = formData.customer && tripRecord && formData.customer.id !== tripRecord.customerId;
                          if (isCustomerChanged && formData.customer?.cmMileage) {
                            return (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: 'warning.main',
                                  fontSize: '0.65rem',
                                  mt: 0.25,
                                  display: 'block',
                                  fontWeight: 500
                                }}
                              >
                                {formData.customer.cmMileage} × 2 
                              </Typography>
                            );
                          } else if (tripRecord?.estimatedDistance) {
                            const oneWayDistance = Number(tripRecord.estimatedDistance) / 2;
                            return (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: 'text.secondary',
                                  fontSize: '0.65rem',
                                  mt: 0.25,
                                  display: 'block'
                                }}
                              >
                                ระยะทางที่บันทึกไว้ {oneWayDistance.toLocaleString('th-TH')} × 2
                              </Typography>
                            );
                          } else {
                            return null;
                          }
                        })()}
                      </Box>

                      {/* Difference */}
                      <Box sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        backgroundColor: 'grey.50',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                          transform: 'translateY(-1px)'
                        }
                      }}>
                        {(() => {
                          const systemDistance = estimatedDistanceFromSystem;
                          const actualDist = actualDistance > 0 ? actualDistance : parseFloat(formData.actualDistance || '0');
                          const difference = actualDist - systemDistance;
                          const percentDiff = systemDistance > 0 
                            ? ((Math.abs(difference) / systemDistance) * 100).toFixed(1) 
                            : '0';
                          const isOver = difference > 0;
                          const isSignificant = Math.abs(difference) > systemDistance * 0.1;
                          
                          return (
                            <>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontSize: '0.7rem',
                                  fontWeight: 500,
                                  color: 'text.secondary',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.08em',
                                  mb: 0.5,
                                  display: 'block'
                                }}
                              >
                                ผลต่าง
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                <Typography 
                                  variant="h4" 
                                  sx={{ 
                                    fontWeight: 300,
                                    color: isSignificant 
                                      ? (isOver ? 'error.main' : 'grey.600')
                                      : 'text.primary',
                                    lineHeight: 1,
                                    fontSize: { xs: '1.5rem', md: '1.8rem' },
                                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                  }}
                                >
                                  {difference > 0 ? '+' : ''}{Math.abs(difference).toFixed(1)}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'text.secondary',
                                    fontWeight: 400,
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  กม.
                                </Typography>
                              </Box>
                              <Box sx={{ 
                                mt: 0.75,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.75,
                                px: 1,
                                py: 0.25,
                                borderRadius: 0.75,
                                backgroundColor: isSignificant 
                                  ? (isOver ? 'error.light' : 'grey.200')
                                  : 'grey.100',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}>
                                <Box sx={{
                                  width: 3,
                                  height: 3,
                                  borderRadius: '50%',
                                  backgroundColor: isSignificant 
                                    ? (isOver ? 'error.main' : 'grey.600')
                                    : 'text.disabled'
                                }} />
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    color: isSignificant 
                                      ? (isOver ? 'white' : 'grey.700')
                                      : 'text.secondary',
                                    fontSize: '0.65rem',
                                    fontWeight: 500
                                  }}
                                >
                                  {isOver ? 'เกิน' : 'น้อย'} {percentDiff}%
                                </Typography>
                              </Box>
                            </>
                          );
                        })()}
                      </Box>
                    </Box>
                  </Box>
                )}

               

                {/* Trip Items */}
                <Divider sx={{ my: 3 }} />
                
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 3,
                  p: 2,
                  bgcolor: 'primary.50',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'primary.200'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      bgcolor: 'primary.main', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <Typography variant="h6" color="white">📦</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        พัสดุที่นำกลับ
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        เพิ่มรายการพัสดุและเอกสารที่นำกลับจากลูกค้า
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="contained"
                    size="medium"
                    onClick={addTripItem}
                    startIcon={<>➕</>}
                    sx={{ 
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 600,
                      boxShadow: 2,
                      '&:hover': {
                        boxShadow: 4,
                      }
                    }}
                  >
                    เพิ่มพัสดุ
                  </Button>
                </Box>

                {tripItems.length === 0 && (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 6, 
                    bgcolor: 'grey.50', 
                    borderRadius: 3,
                    border: '2px dashed',
                    borderColor: 'grey.300',
                    mb: 3
                  }}>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                      📦 ยังไม่มีพัสดุที่นำกลับ
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      คลิกปุ่ม "เพิ่มพัสดุ" เพื่อเพิ่มรายการพัสดุที่นำกลับจากลูกค้า
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={addTripItem}
                      startIcon={<>➕</>}
                      sx={{ borderRadius: 3 }}
                    >
                      เพิ่มพัสดุแรก
                    </Button>
                  </Box>
                )}

                {tripItems.map((tripItem, index) => (
                  <Paper 
                    key={tripItem.id} 
                    sx={{ 
                      p: 3, 
                      mb: 3, 
                      bgcolor: 'background.paper',
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'grey.200',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      '&:hover': {
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        borderColor: 'primary.300',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: '50%', 
                          bgcolor: 'success.main', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}>
                          {index + 1}
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                          รายการพัสดุที่ {index + 1}
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => removeTripItem(tripItem.id!)}
                        startIcon={<>🗑️</>}
                        sx={{ 
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600
                        }}
                      >
                        ลบรายการ
                      </Button>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', lg: 'row' } }}>
                      <Box sx={{ flex: 3 }}>
                        <Autocomplete
                          fullWidth
                          size="small"
                          options={items}
                          getOptionLabel={(option) => `${option.ptPart} - ${option.ptDesc1}`}
                          value={tripItem.item || null}
                          getOptionDisabled={(option) => {
                            // disable if already selected in another tripItem
                            return tripItems.some(ti => ti.id !== tripItem.id && ti.itemId === option.id);
                          }}
                          onChange={(_, newValue) => {
                            setTripItems(tripItems.map(item => {
                              if (item.id === tripItem.id) {
                                if (newValue) {
                                  return {
                                    ...item,
                                    itemId: newValue.id,
                                    item: newValue,
                                    unit: newValue.ptUm,
                                    unitPrice: newValue.ptPrice?.toString() || '0',
                                    quantity: '',
                                    totalPrice: '0',
                                  };
                                } else {
                                  return {
                                    ...item,
                                    itemId: 0,
                                    item: undefined,
                                    unit: '',
                                    unitPrice: '',
                                    totalPrice: '',
                                    quantity: '',
                                  };
                                }
                              }
                              return item;
                            }));
                          }}
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          renderInput={(params) => (
                            <TextField 
                              {...params} 
                              label="เลือกพัสดุ *"
                              size="small"
                              required
                            />
                          )}
                          renderOption={(props, option) => {
                            const { key, ...otherProps } = props;
                            return (
                              <Box component="li" key={key} {...otherProps}>
                                <Box>
                                  <Typography variant="body2" fontWeight="bold">
                                    {option.ptPart} - {option.ptDesc1}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    หน่วย: {option.ptUm} | ราคา: {option.ptPrice ? `${option.ptPrice.toLocaleString('th-TH')} บาท` : '-'}
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          }}
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <TextField
                          fullWidth
                          label="จำนวน"
                          type="text"
                          size="small"
                          value={tripItem.quantity}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              updateTripItem(tripItem.id!, 'quantity', value);
                            }
                          }}
                          inputProps={{ inputMode: 'decimal' }}
                          required
                          sx={{
    "& .MuiInputLabel-root": {
      fontSize: 13, // 👈 ปรับขนาด label
      fontWeight: 400,
    },
  }}
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <TextField
                          fullWidth
                          label="หน่วย"
                          size="small"
                          value={tripItem.unit}
                          onChange={(e) => updateTripItem(tripItem.id!, 'unit', e.target.value)}
                          required
                          InputProps={{
                            readOnly: true,
                          }}
                          sx={{
    "& .MuiInputLabel-root": {
      fontSize: 13, // 👈 ปรับขนาด label
      fontWeight: 400,
    },
  }}
                        />
                      </Box>
                      <Box sx={{ flex: 1.2 }}>
                        <TextField
                          fullWidth
                          label="ราคาต่อหน่วย"
                          type="text"
                          size="small"
                          value={tripItem.unitPrice}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              updateTripItem(tripItem.id!, 'unitPrice', value);
                            }
                          }}
                          inputProps={{ inputMode: 'decimal' }}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">บาท</InputAdornment>,
                            readOnly: true,
                            
                          }}
                          sx={{
    "& .MuiInputLabel-root": {
      fontSize: 12, // 👈 ปรับขนาด label
      fontWeight: 400,
    },
  }}
                        />
                      </Box>
                      <Box sx={{ flex: 1.2 }}>
                        <TextField
                          fullWidth
                          label="ราคารวม"
                          type="text"
                          size="small"
                          value={parseFloat(tripItem.totalPrice).toFixed(2)}
                          InputProps={{
                            readOnly: true,
                            style: { backgroundColor: '#f5f5f5' },
                            endAdornment: <InputAdornment position="end">บาท</InputAdornment>,
                          }}
                          sx={{
    "& .MuiInputLabel-root": {
      fontSize: 13, // 👈 ปรับขนาด label
      fontWeight: 400,
    },
  }}
                        />
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <TextField
                        fullWidth
                        label="หมายเหตุ"
                        size="small"
                        value={tripItem.remark}
                        onChange={(e) => updateTripItem(tripItem.id!, 'remark', e.target.value)}
                        placeholder="รายละเอียดเพิ่มเติม..."
                      />
                    </Box>
                  </Paper>
                ))}

                {/* Remark */}
                <Divider sx={{ my: 3 }} />
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    label="หมายเหตุ"
                    multiline
                    rows={3}
                    size="small"
                    value={formData.remark}
                    onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
                    placeholder="ข้อมูลเพิ่มเติมเกี่ยวกับการเดินทาง..."
                  />
                </Box>

                {/* Submit Buttons */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    href="/trip-records"
                    disabled={submitting}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={16} /> : <SaveIcon />}
                  >
                    {submitting ? 'กำลังอัปเดต...' : 'อัปเดตข้อมูล'}
                  </Button>
                </Box>
              </Paper>

              
            </Box>

            {/* Calculation Summary */}
            <Box sx={{ width: { xs: '100%', lg: 320 } }}>
              <Paper sx={{ p: 2, borderRadius: 2, position: 'sticky', top: 24 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalculateIcon />
                  สรุปการคำนวณ
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    จำนวนวัน
                  </Typography>
                  <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                    {calculatedDays} วัน
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    อัตราค่าเบี้ยเลี้ยง
                  </Typography>
                  <Typography variant="h6">
                    {allowanceRate > 0 ? allowanceRate.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '...'} บาท/วัน
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    อัตราค่าระยะทาง 
                  </Typography>
                  <Typography variant="h6">
                    {distanceRate > 0 ? distanceRate.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '...'} บาท/กม.
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Main Values Section */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 3 }}>
                  {/* Allowance Card */}
                  <Paper sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    bgcolor: calculatedAllowance > 0 ? 'success.50' : 'grey.50',
                    border: '2px solid',
                    borderColor: calculatedAllowance > 0 ? 'success.200' : 'grey.200',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: '50%', 
                        bgcolor: calculatedAllowance > 0 ? 'success.main' : 'grey.400',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px'
                      }}>
                        💰
                      </Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        ค่าเบี้ยเลี้ยงรวม
                      </Typography>
                    </Box>
                    <Typography 
                      variant="h4" 
                      color={calculatedAllowance > 0 ? 'success.main' : 'text.secondary'}
                      sx={{ fontWeight: 'bold', textAlign: 'center' }}
                    >
                      {formatCurrency(calculatedAllowance)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mt: 1 }}>
                      {calculatedDays >= 1 
                        ? `${calculatedDays} วัน × ${allowanceRate.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`
                        : 'ต้อง ≥ 1 วัน จึงได้เบี้ยเลี้ยง'
                      }
                    </Typography>
                  </Paper>

                  {/* Distance Cost Card */}
                  <Paper sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    bgcolor: calculatedDistanceCost > 0 ? 'info.50' : 'grey.50',
                    border: '2px solid',
                    borderColor: calculatedDistanceCost > 0 ? 'info.200' : 'grey.200',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: '50%', 
                        bgcolor: calculatedDistanceCost > 0 ? 'info.main' : 'grey.400',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px'
                      }}>
                        🛣️
                      </Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        ค่าระยะทางรวม
                      </Typography>
                    </Box>
                    <Typography 
                      variant="h4" 
                      color={calculatedDistanceCost > 0 ? 'info.main' : 'text.secondary'}
                      sx={{ fontWeight: 'bold', textAlign: 'center' }}
                    >
                      {formatCurrency(calculatedDistanceCost)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mt: 1 }}>
                      {formData.customer && formData.customer.cmMileage 
                        ? `${estimatedDistanceFromSystem} กม. × ${distanceRate > 0 ? distanceRate.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '...'} บาท`
                        : 'เลือกลูกค้าเพื่อคำนวณค่าระยะทาง'
                      }
                    </Typography>
                  </Paper>

                  {/* Items Value Card */}
                  {(() => {
                    const totals = calculateTotalCosts();
                    return totals.itemsValue > 0 && (
                      <Paper sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: 'primary.50',
                        border: '2px solid',
                        borderColor: 'primary.200',
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Box sx={{ 
                            width: 24, 
                            height: 24, 
                            borderRadius: '50%', 
                            bgcolor: 'primary.main',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px'
                          }}>
                            📦
                          </Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            มูลค่าพัสดุที่นำกลับ
                          </Typography>
                        </Box>
                        <Typography 
                          variant="h4" 
                          color="primary.main"
                          sx={{ fontWeight: 'bold', textAlign: 'center' }}
                        >
                          {formatCurrency(totals.itemsValue)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mt: 1 }}>
                          {tripItems.filter(item => item.itemId > 0).length} รายการ
                        </Typography>
                      </Paper>
                    );
                  })()}

                  {/* Trip Fee Card */}
                  <Paper sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    bgcolor: includeTripFee ? 'warning.50' : 'grey.50',
                    border: '2px solid',
                    borderColor: includeTripFee ? 'warning.200' : 'grey.200',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: '50%', 
                        bgcolor: includeTripFee ? 'warning.main' : 'grey.400',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px'
                      }}>
                        🚗
                      </Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        ค่าเที่ยว
                      </Typography>
                    </Box>
                    <Typography 
                      variant="h4" 
                      color={includeTripFee ? 'warning.main' : 'text.secondary'}
                      sx={{ fontWeight: 'bold', textAlign: 'center' }}
                    >
                      {includeTripFee ? formatCurrency(tripFeeRate) : formatCurrency(0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mt: 1 }}>
                      {includeTripFee ? 'คิดค่าเที่ยว' : 'ไม่คิดค่าเที่ยว'}
                    </Typography>
                  </Paper>
                </Box>

                {/* Item Details */}
                {tripItems.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      รายละเอียดพัสดุ ({tripItems.filter(item => item.itemId > 0).length} รายการ)
                    </Typography>
                    <Box sx={{ maxHeight: 200, overflowY: 'auto', mb: 2 }}>
                      {tripItems.filter(item => item.itemId > 0).map((item, index) => {
                        const selectedItem = items.find(i => i.id === item.itemId);
                        const itemTotal = parseFloat(item.totalPrice) || 0;
                        return (
                          <Box key={item.id} sx={{ 
                            mt: 1, 
                            p: 1.5, 
                            bgcolor: 'grey.50', 
                            borderRadius: 1, 
                            border: '1px solid', 
                            borderColor: 'grey.200',
                            '&:hover': {
                              bgcolor: 'grey.100',
                            }
                          }}>
                            <Typography variant="caption" display="block" fontWeight="bold" color="primary.main">
                              {selectedItem?.ptPart}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                              {selectedItem?.ptDesc1}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary">
                                {item.quantity} {item.unit}
                              </Typography>
                              <Typography variant="caption" fontWeight="bold" color="success.main" fontSize="0.9rem">
                                {formatCurrency(itemTotal)}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </>
                )}

                {/* Grand Total */}
                {(() => {
                  const totals = calculateTotalCosts();
                  
                  return (totals.driverExpenses > 0 || totals.companyExpenses >= 0) && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      
                      {/* ค่าใช้จ่ายที่ต้องจ่ายพนักงานขับรถ */}
                      {totals.driverExpenses > 0 && (
                        <Paper sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          bgcolor: 'success.50',
                          border: '2px solid',
                          borderColor: 'success.200',
                          mb: 2
                        }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom textAlign="center">
                            ค่าใช้จ่ายที่ต้องจ่ายพนักงานขับรถ
                          </Typography>
                          <Typography 
                            variant="h4" 
                            color="success.main"
                            sx={{ fontWeight: 'bold', textAlign: 'center', mb: 2 }}
                          >
                            {formatCurrency(totals.driverExpenses)}
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption">ค่าเบี้ยเลี้ยง:</Typography>
                              <Typography variant="caption" fontWeight="bold">{formatCurrency(calculatedAllowance)}</Typography>
                            </Box>
                            {totals.itemsValue > 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption">ค่าพัสดุ:</Typography>
                                <Typography variant="caption" fontWeight="bold">{formatCurrency(totals.itemsValue)}</Typography>
                              </Box>
                            )}
                            {calculatedDistanceCost > 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption">ค่าระยะทาง:</Typography>
                                <Typography variant="caption" fontWeight="bold">{formatCurrency(calculatedDistanceCost)}</Typography>
                              </Box>
                            )}
                            {includeTripFee && tripFeeRate > 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption">ค่าเที่ยว:</Typography>
                                <Typography variant="caption" fontWeight="bold">{formatCurrency(tripFeeRate)}</Typography>
                              </Box>
                            )}
                          </Box>
                        </Paper>
                      )}

                      {/* ค่าใช้จ่ายของบริษัท */}
                      <Paper sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: totals.companyExpenses > 0 ? 'warning.50' : 'grey.50',
                        border: '2px solid',
                        borderColor: totals.companyExpenses > 0 ? 'warning.200' : 'grey.200',
                        mb: 2
                      }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom textAlign="center">
                          ค่าใช้จ่ายของบริษัท
                        </Typography>
                        <Typography 
                          variant="h4" 
                          color={totals.companyExpenses > 0 ? 'warning.main' : 'text.secondary'}
                          sx={{ fontWeight: 'bold', textAlign: 'center', mb: 2 }}
                        >
                          {totals.companyExpenses > 0 ? formatCurrency(totals.companyExpenses) : formatCurrency(0)}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">ค่าซ่อมแซม:</Typography>
                            <Typography variant="caption" fontWeight="bold">
                              {parseFloat(formData.repairCost) > 0 ? formatCurrency(parseFloat(formData.repairCost)) : formatCurrency(0)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">ค่าทางด่วน:</Typography>
                            <Typography variant="caption" fontWeight="bold">
                              {parseFloat(formData.tollFee) > 0 ? formatCurrency(parseFloat(formData.tollFee)) : formatCurrency(0)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">ค่าน้ำมัน:</Typography>
                            <Typography variant="caption" fontWeight="bold">
                              {parseFloat(formData.fuelCost) > 0 ? formatCurrency(parseFloat(formData.fuelCost)) : formatCurrency(0)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">ค่าเช็คระยะ:</Typography>
                            <Typography variant="caption" fontWeight="bold">
                              {parseFloat(formData.distanceCheckFee) > 0 ? formatCurrency(parseFloat(formData.distanceCheckFee)) : formatCurrency(0)}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>

                      {/* มูลค่ารวมทั้งหมด */}
                      <Paper sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: 'info.50',
                        border: '2px solid',
                        borderColor: 'info.200',
                      }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom textAlign="center">
                          มูลค่ารวมทั้งหมด
                        </Typography>
                        <Typography 
                          variant="h4" 
                          color="info.main"
                          sx={{ fontWeight: 'bold', textAlign: 'center' }}
                        >
                          {formatCurrency(totals.grandTotal)}
                        </Typography>
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">จ่ายพนักงานขับรถ:</Typography>
                            <Typography variant="caption" fontWeight="bold" color="success.main">
                              {totals.driverExpenses > 0 ? formatCurrency(totals.driverExpenses) : formatCurrency(0)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">ค่าใช้จ่ายบริษัท:</Typography>
                            <Typography variant="caption" fontWeight="bold" color="warning.main">
                              {totals.companyExpenses > 0 ? formatCurrency(totals.companyExpenses) : formatCurrency(0)}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </>
                  );
                })()}


                {/* Vehicle Info */}
                {formData.vehicle && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        รถที่เลือก
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formData.vehicle.licensePlate}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formData.vehicle.brand} {formData.vehicle.model}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formData.vehicle.vehicleType}
                      </Typography>
                      {formData.driverName && (
                        <Typography variant="body2" color="text.secondary">
                          คนขับเที่ยวรถนี้: {formData.driverName}
                          {formData.driverLicense && (
                            <Typography component="span" variant="caption" sx={{ ml: 1, fontFamily: 'monospace' }}>
                              (ใบขับขี่: {formData.driverLicense})
                            </Typography>
                          )}
                        </Typography>
                      )}
                    </Box>
                  </>
                )}

                {/* Customer Info */}
                {formData.customer && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        ข้อมูลลูกค้า
                      </Typography>
                      <Typography variant="body2">
                        {formData.customer.cmCode} - {formData.customer.cmName}
                      </Typography>
                      {formData.customer.cmAddress && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          ที่อยู่: {formData.customer.cmAddress}
                        </Typography>
                      )}
                      {formData.customer.cmMileage && (
                        <Typography variant="body2" color="text.secondary">
                          ระยะทางทางเดียว: {formData.customer.cmMileage} กม.
                        </Typography>
                      )}
                      {formData.customer.cmMileage && (
                        <Typography variant="body2" color="text.secondary">
                          ระยะทางไป-กลับ: {(formData.customer.cmMileage * 2).toLocaleString('th-TH')} กม.
                        </Typography>
                      )}
                      
                    </Box>
                  </>
                )}
              </Paper>
            </Box>
          </Box>
        </Box>
      </LocalizationProvider>
    </Layout>
  );
}
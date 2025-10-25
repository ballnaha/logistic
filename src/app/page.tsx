'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Layout from './components/Layout';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  LinearProgress,
  Pagination,
  Fade,
  Skeleton,
} from '@mui/material';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import {
  DirectionsCar as CarIcon,
  RouteOutlined as TripIcon,
  LocalGasStation as FuelIcon,
  Assessment as EvalIcon,
  Add as AddIcon,
  OpenInNew as OpenIcon,
  Route as RouteIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { CalendarIcon } from '@mui/x-date-pickers';

// Register ChartJS components
ChartJS.register(ArcElement, ChartTooltip, Legend);

interface TripSummaryItem {
  id: number;
  vehicle: { 
    licensePlate: string;
    driverName: string | null;
    backupDriverName: string | null;
  };
  customer: { cmName: string };
  departureDate: string;
  returnDate: string;
  driverType: string | null;
  driverName: string | null;
  actualDistance: number | null;
  documentNumber: string | null;
}

interface FuelSummaryItem {
  id: number;
  fuelDate: string;
  fuelAmount: number;
  odometer?: number;
  remark?: string;
  vehicle: { 
    licensePlate: string;
    driverName: string | null;
    backupDriverName: string | null;
    brand: string;
    model: string;
    fuelTank: number | null;
    fuelConsume: number | null;
  };
  driverType: string | null;
  driverName: string | null;
}

interface EvaluationItem {
  id: number;
  vehiclePlate: string;
  contractorName: string;
  evaluationDate: string;
  totalScore: number;
  driverCooperation: number;
  vehicleCondition: number;
  damageScore: number;
  damageValue: number;
  damageFound: boolean;
  remark?: string;
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [vehicleCount, setVehicleCount] = useState<number>(0);
  const [vehicleTypeCounts, setVehicleTypeCounts] = useState({
    truck: 0,
    pickup: 0,
    forklift: 0,
    total: 0
  });
  const [tripCountThisMonth, setTripCountThisMonth] = useState<number>(0);
  const [totalActualDistance, setTotalActualDistance] = useState<number>(0);
  const [totalEstimatedDistance, setTotalEstimatedDistance] = useState<number>(0);
  const [fuelTotalCount, setFuelTotalCount] = useState<number>(0);
  const [evaluationCountThisMonth, setEvaluationCountThisMonth] = useState<number>(0);
  const [evaluationResults, setEvaluationResults] = useState({
    passed: 0,
    failed: 0,
    total: 0
  });
  const [failedContractors, setFailedContractors] = useState<Array<{
    contractorName: string;
    failedCount: number;
    averageScore: number;
  }>>([]);
  const [selectedContractor, setSelectedContractor] = useState<string | null>(null);
  const [contractorEvaluations, setContractorEvaluations] = useState<EvaluationItem[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // Vehicle drilldown state
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [vehicleTrips, setVehicleTrips] = useState<TripSummaryItem[]>([]);
  const [vehicleDetailLoading, setVehicleDetailLoading] = useState(false);

  // Fuel Vehicle drilldown state
  const [selectedFuelVehicle, setSelectedFuelVehicle] = useState<string | null>(null);
  const [vehicleFuelRecords, setVehicleFuelRecords] = useState<FuelSummaryItem[]>([]);
  const [fuelDetailLoading, setFuelDetailLoading] = useState(false);

  // Items drilldown state
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [driverItems, setDriverItems] = useState<any[]>([]);
  const [itemDetailLoading, setItemDetailLoading] = useState(false);

  // State สำหรับจัดการ window resize
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  const [recentTrips, setRecentTrips] = useState<TripSummaryItem[]>([]);
  const [recentFuels, setRecentFuels] = useState<FuelSummaryItem[]>([]);
  const [recentEvaluations, setRecentEvaluations] = useState<EvaluationItem[]>([]);
  
  // Store all filtered trips for drilldown
  const [allFilteredTrips, setAllFilteredTrips] = useState<any[]>([]);
  
  const [driverStats, setDriverStats] = useState<Array<{
    vehicleType: string;
    licensePlate: string;
    carImage: string | null;
    days: number;
    distance: number;
    tripCount: number;
  }>>([]);
  const [fuelStats, setFuelStats] = useState<Array<{
    vehicleType: string;
    licensePlate: string;
    carImage: string | null;
    fuelAmount: number;
    fuelCount: number;
    avgFuelAmount: number;
  }>>([]);
  const [itemStats, setItemStats] = useState<Array<{
    driverName: string;
    quantity: number;
    itemName: string;
    driverImage?: string;
  }>>([]);
  const [availableItems, setAvailableItems] = useState<Array<{
    id: number;
    name: string;
  }>>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');

  // Filters: Year / Month
  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<string>(now.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth() + 1));
  const months = [
    { value: '1', label: 'มกราคม' },
    { value: '2', label: 'กุมภาพันธ์' },
    { value: '3', label: 'มีนาคม' },
    { value: '4', label: 'เมษายน' },
    { value: '5', label: 'พฤษภาคม' },
    { value: '6', label: 'มิถุนายน' },
    { value: '7', label: 'กรกฎาคม' },
    { value: '8', label: 'สิงหาคม' },
    { value: '9', label: 'กันยายน' },
    { value: '10', label: 'ตุลาคม' },
    { value: '11', label: 'พฤศจิกายน' },
    { value: '12', label: 'ธันวาคม' },
  ];
  const availableYears = useMemo(() => {
    const current = now.getFullYear();
    const startYear = 2025; // ปีเริ่มต้นของระบบ สามารถปรับได้ตามข้อมูลจริง
    const years: number[] = [];
    for (let y = current; y >= startYear; y -= 1) {
      years.push(y);
    }
    return years;
  }, [now]);

  // Effect สำหรับจัดการ window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      // Force re-render ของ Material-UI components
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  // Helper function สำหรับการจัดการ responsive breakpoints
  const getGridColumns = () => {
    if (windowWidth < 600) return 1; // Mobile: 1 column
    if (windowWidth < 900) return 2; // Tablet: 2 columns  
    return 3; 
  };

  const handleContractorClick = async (contractorName: string) => {
    setSelectedContractor(contractorName);
    setDrilldownLoading(true);
    
    try {
      // Fetch detailed evaluations for this contractor
      const response = await fetch(`/api/evaluation`);
      if (response.ok) {
        const evaluations = await response.json();
        
        // Filter evaluations for this contractor within the selected time range
        const selectedYearNum = parseInt(selectedYear);
        const monthNum = selectedMonth ? parseInt(selectedMonth) : null;
        
        const contractorEvals = evaluations.filter((item: any) => {
          const d = new Date(item.evaluationDate);
          const isCorrectContractor = item.contractorName === contractorName;
          const isFailedScore = item.totalScore < 8.0;
          
          let isCorrectTimeRange;
          if (monthNum === null) {
            isCorrectTimeRange = d.getFullYear() === selectedYearNum;
          } else {
            isCorrectTimeRange = d.getFullYear() === selectedYearNum && (d.getMonth() + 1) === monthNum;
          }
          
          return isCorrectContractor && isFailedScore && isCorrectTimeRange;
        });
        
        setContractorEvaluations(contractorEvals);
      }
    } catch (error) {
      console.error('Failed to fetch contractor evaluations:', error);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const handleBackToChart = () => {
    setSelectedContractor(null);
    setContractorEvaluations([]);
  };

  const handleVehicleClick = async (licensePlate: string) => {
    console.log('Clicked vehicle:', licensePlate);
    setSelectedVehicle(licensePlate);
    setVehicleDetailLoading(true);
    
    try {
      // Use already filtered trips instead of fetching new data
      console.log('Using filtered trips:', allFilteredTrips);
      
      // Filter trips for this specific vehicle
      const vehicleTrips = allFilteredTrips.filter((trip: any) => {
        // Validate trip object structure
        if (!trip || !trip.vehicle) {
          console.warn('Invalid trip object:', trip);
          return false;
        }
        
        const isCorrectVehicle = trip.vehicle.licensePlate === licensePlate;
        
        if (isCorrectVehicle) {
          console.log('Matching trip:', trip);
        }
        
        return isCorrectVehicle;
      });
      
      console.log('Filtered vehicle trips:', vehicleTrips);
      setVehicleTrips(vehicleTrips);
      
    } catch (error) {
      console.error('Error filtering vehicle trips:', error);
      setVehicleTrips([]);
    } finally {
      setVehicleDetailLoading(false);
    }
  };

  const handleBackToVehicles = () => {
    setSelectedVehicle(null);
    setVehicleTrips([]);
  };

  const handleFuelVehicleClick = async (licensePlate: string) => {
    console.log('Clicked fuel vehicle:', licensePlate);
    console.log('Selected year:', selectedYear, 'Selected month:', selectedMonth);
    setSelectedFuelVehicle(licensePlate);
    setFuelDetailLoading(true);
    
    try {
      // สร้างช่วงวันที่จากปีและเดือนที่เลือก
      const year = parseInt(selectedYear);
      const month = selectedMonth ? parseInt(selectedMonth) : null;
      
      let startDate = '';
      let endDate = '';
      
      if (month) {
        // ถ้าเลือกเดือน ให้แสดงข้อมูลของเดือนนั้น
        startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
      } else {
        // ถ้าไม่เลือกเดือน ให้แสดงข้อมูลทั้งปี
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
      }
      
      console.log('Date range:', startDate, 'to', endDate);
      
      const filterParams = new URLSearchParams({
        startDate,
        endDate,
        search: licensePlate, // ค้นหาตามทะเบียนรถ
        limit: '1000' // เพิ่ม limit เพื่อให้ได้ข้อมูลทั้งหมด
      });
      
      console.log('API URL:', `/api/fuel-records?${filterParams.toString()}`);
      
      const response = await fetch(`/api/fuel-records?${filterParams}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to fetch fuel records: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Full API response:', data);
      console.log('Fuel records found:', data.data?.length || 0);
      
      // ตรวจสอบว่าข้อมูลที่ได้มามีทะเบียนรถที่ตรงกันหรือไม่
      if (data.data && data.data.length > 0) {
        const matchingRecords = data.data.filter((record: any) => 
          record.vehicle?.licensePlate === licensePlate
        );
        console.log('Matching records for', licensePlate, ':', matchingRecords.length);
        setVehicleFuelRecords(matchingRecords);
      } else {
        console.log('No fuel records found');
        setVehicleFuelRecords([]);
      }
      
    } catch (error) {
      console.error('Error fetching vehicle fuel records:', error);
      setVehicleFuelRecords([]);
    } finally {
      setFuelDetailLoading(false);
    }
  };

  const handleBackToFuelVehicles = () => {
    setSelectedFuelVehicle(null);
    setVehicleFuelRecords([]);
  };

  const handleDriverClick = async (driverName: string) => {
    console.log('Clicked driver:', driverName);
    setSelectedDriver(driverName);
    setItemDetailLoading(true);
    
    try {
      // Use already filtered trips instead of fetching new data
      console.log('Using filtered trips for items:', allFilteredTrips);
      console.log('Selected item filter:', selectedItem);
      
      // Filter trips for this specific driver and get trip items
      const driverTrips = allFilteredTrips.filter((trip: any) => {
        if (!trip || !trip.driverName) {
          return false;
        }
        return trip.driverName === driverName;
      });
      
      // Extract all trip items from driver's trips
      const allTripItems: any[] = [];
      driverTrips.forEach((trip: any) => {
        if (trip.tripItems && Array.isArray(trip.tripItems)) {
          trip.tripItems.forEach((tripItem: any) => {
            // Get correct item name (same logic as in itemStats calculation)
            const itemName = tripItem.item?.ptDesc1 || tripItem.item?.ptPart || 'ไม่ระบุ';
            
            // Filter by selected item if not "ทั้งหมด"
            if (selectedItem === 'ทั้งหมด' || itemName === selectedItem) {
              console.log('Raw tripItem data:', tripItem);
              allTripItems.push({
                ...tripItem,
                itemName: itemName, // Add the correct item name
                tripId: trip.id,
                tripDate: trip.departureDate,
                vehiclePlate: trip.vehicle?.licensePlate,
                customerName: trip.customer?.cmName
              });
            }
          });
        }
      });
      
      console.log('Filtered driver trip items:', allTripItems);
      setDriverItems(allTripItems);
      
      // Smooth scroll to top after state update
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error('Error filtering driver items:', error);
      setDriverItems([]);
    } finally {
      setItemDetailLoading(false);
    }
  };

  const handleBackToDrivers = () => {
    setSelectedDriver(null);
    setDriverItems([]);
  };

  const monthRange = useMemo(() => {
    const yearNum = parseInt(selectedYear);
    const monthNum = selectedMonth ? parseInt(selectedMonth) : 0; // 1-12 or 0 for whole year
    const start = monthNum > 0
      ? new Date(yearNum, monthNum - 1, 1)
      : new Date(yearNum, 0, 1);
    const end = monthNum > 0
      ? new Date(yearNum, monthNum, 0)
      : new Date(yearNum, 11, 31);
    const toIsoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { start: toIsoDate(start), end: toIsoDate(end) };
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // ดึงข้อมูลแบบขนาน ลดเวลา total โดยไม่รอทีละคำขอ
        const vehiclesPromise = fetch(`/api/vehicles?status=active&page=1&limit=1000`).then(async (res) => ({ ok: res.ok, json: await res.json().catch(() => ({})) }));
        const vehiclesTruckPromise = fetch(`/api/vehicles?status=active&vehicleType=Truck&page=1&limit=1`).then(async (res) => ({ ok: res.ok, json: await res.json().catch(() => ({})) }));
        const vehiclesPickupPromise = fetch(`/api/vehicles?status=active&vehicleType=Pickup&page=1&limit=1`).then(async (res) => ({ ok: res.ok, json: await res.json().catch(() => ({})) }));
        const vehiclesForkliftPromise = fetch(`/api/vehicles?status=active&vehicleType=ForkLift&page=1&limit=1`).then(async (res) => ({ ok: res.ok, json: await res.json().catch(() => ({})) }));
        const tripsPromise = fetch(`/api/trip-records?startDate=${monthRange.start}&endDate=${monthRange.end}&vehicleType=truck&page=1&limit=5`).then(async (res) => ({ ok: res.ok, json: await res.json().catch(() => ({})) }));
        const allTripsPromise = fetch(`/api/trip-records?startDate=${monthRange.start}&endDate=${monthRange.end}&vehicleType=truck&page=1&limit=1000`).then(async (res) => ({ ok: res.ok, json: await res.json().catch(() => ({})) }));
        const fuelsPromise = fetch(`/api/fuel-records?page=1&limit=5&sortBy=fuelDate&sortOrder=desc&startDate=${monthRange.start}&endDate=${monthRange.end}`).then(async (res) => ({ ok: res.ok, json: await res.json().catch(() => ({})) }));
        const allFuelsPromise = fetch(`/api/fuel-records?page=1&limit=1000&startDate=${monthRange.start}&endDate=${monthRange.end}`).then(async (res) => ({ ok: res.ok, json: await res.json().catch(() => ({})) }));
        const evalPromise = fetch(`/api/evaluation`).then(async (res) => ({ ok: res.ok, json: await res.json().catch(() => []) }));
        const itemsPromise = fetch(`/api/items?isActive=true&page=1&limit=1000`).then(async (res) => ({ ok: res.ok, json: await res.json().catch(() => ({})) }));

        const [vehiclesRes, vehiclesTruckRes, vehiclesPickupRes, vehiclesForkliftRes, tripsRes, allTripsRes, fuelsRes, allFuelsRes, evalRes, itemsRes] = await Promise.allSettled([
          vehiclesPromise,
          vehiclesTruckPromise,
          vehiclesPickupPromise,
          vehiclesForkliftPromise,
          tripsPromise,
          allTripsPromise,
          fuelsPromise,
          allFuelsPromise,
          evalPromise,
          itemsPromise,
        ]);

        // Vehicles - ใช้ข้อมูลจาก API calls แยกตามประเภท
        const totalCount = vehiclesRes.status === 'fulfilled' && vehiclesRes.value.ok 
          ? (vehiclesRes.value.json?.pagination?.total || 0) : 0;
        
        const truckCount = vehiclesTruckRes.status === 'fulfilled' && vehiclesTruckRes.value.ok
          ? (vehiclesTruckRes.value.json?.pagination?.total || 0) : 0;
          
        const pickupCount = vehiclesPickupRes.status === 'fulfilled' && vehiclesPickupRes.value.ok
          ? (vehiclesPickupRes.value.json?.pagination?.total || 0) : 0;
          
        const forkliftCount = vehiclesForkliftRes.status === 'fulfilled' && vehiclesForkliftRes.value.ok
          ? (vehiclesForkliftRes.value.json?.pagination?.total || 0) : 0;

        const counts = {
          truck: truckCount,
          pickup: pickupCount,
          forklift: forkliftCount,
          total: totalCount
        };
        
        setVehicleTypeCounts(counts);
        setVehicleCount(totalCount);

        // Trips
        if (tripsRes.status === 'fulfilled') {
          const t = tripsRes.value;
          if (t.ok) {
            setTripCountThisMonth(t.json?.pagination?.total || 0);
            setRecentTrips((t.json?.trips || []).slice(0, 5));
          }
        }

        // All Trips for Distance Calculation
        if (allTripsRes.status === 'fulfilled') {
          const allT = allTripsRes.value;
          if (allT.ok && allT.json?.trips) {
            const trips = allT.json.trips;
            
            // Store filtered trips for drilldown
            setAllFilteredTrips(trips);
            
            const actualDistance = trips.reduce((sum: number, trip: any) => {
              const distance = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance || 0;
              return sum + distance;
            }, 0);
            
            const estimatedDistance = trips.reduce((sum: number, trip: any) => {
              const distance = typeof trip.estimatedDistance === 'string' ? parseFloat(trip.estimatedDistance) || 0 : trip.estimatedDistance || 0;
              return sum + distance;
            }, 0);
            
            setTotalActualDistance(actualDistance);
            setTotalEstimatedDistance(estimatedDistance);

            // Calculate Vehicle Statistics (group by license plate only)
            const vehicleStatsMap = new Map<string, { vehicleType: string; licensePlate: string; carImage: string | null; days: number; distance: number; tripCount: number; }>();
            
            trips.forEach((trip: any) => {
              const licensePlate = trip.vehicle?.licensePlate || 'ไม่ระบุ';
              const vehicleType = trip.vehicle?.vehicleType || 'Truck';
              const carImage = trip.vehicle?.carImage || null;
              const distance = typeof trip.actualDistance === 'string' ? parseFloat(trip.actualDistance) || 0 : trip.actualDistance || 0;
              const days = trip.days || 0;
              
              const key = licensePlate; // Group by license plate only
              
              if (vehicleStatsMap.has(key)) {
                const existing = vehicleStatsMap.get(key)!;
                existing.days += days;
                existing.distance += distance;
                existing.tripCount += 1; // Count each trip
              } else {
                vehicleStatsMap.set(key, {
                  vehicleType,
                  licensePlate,
                  carImage,
                  days,
                  distance,
                  tripCount: 1 // Start with 1 trip
                });
              }
            });

            // Convert to array and sort by distance (descending)
            const statsArray = Array.from(vehicleStatsMap.values())
              .sort((a, b) => b.distance - a.distance)
              .slice(0, 6); // Take top 6

            setDriverStats(statsArray);

            // Calculate Item Statistics from TripItems
            const itemStatsMap = new Map<string, {quantity: number; driverImage?: string}>();
            
            trips.forEach((trip: any) => {
              const driverName = trip.driverName || 'ไม่ระบุ';
              
              // Get driver image based on driver name and vehicle data
              let driverImage = null;
              if (trip.vehicle) {
                // Check if this driver is the main driver
                if (trip.vehicle.mainDriver && trip.vehicle.mainDriver.driverName === driverName) {
                  driverImage = trip.vehicle.mainDriver.driverImage;
                }
                // Check if this driver is the backup driver
                else if (trip.vehicle.backupDriver && trip.vehicle.backupDriver.driverName === driverName) {
                  driverImage = trip.vehicle.backupDriver.driverImage;
                }
              }
              
              // Process trip items if they exist
              if (trip.tripItems && Array.isArray(trip.tripItems)) {
                trip.tripItems.forEach((tripItem: any) => {
                  const itemName = tripItem.item?.ptDesc1 || tripItem.item?.ptPart || 'ไม่ระบุ';
                  const quantity = typeof tripItem.quantity === 'string' ? parseFloat(tripItem.quantity) || 0 : tripItem.quantity || 0;
                  
                  const key = `${driverName}-${itemName}`;
                  const existing = itemStatsMap.get(key);
                  itemStatsMap.set(key, {
                    quantity: (existing?.quantity || 0) + quantity,
                    driverImage: existing?.driverImage || driverImage
                  });
                });
              }
            });

            // Convert to array format for display
            const itemStatsArray: Array<{driverName: string; quantity: number; itemName: string; driverImage?: string}> = [];
            itemStatsMap.forEach((data, key) => {
              const [driverName, itemName] = key.split('-');
              itemStatsArray.push({ 
                driverName, 
                itemName, 
                quantity: data.quantity,
                driverImage: data.driverImage 
              });
            });

            setItemStats(itemStatsArray);
          }
        }

        // Calculate Fuel Statistics (group by license plate)
        if (allFuelsRes.status === 'fulfilled') {
          const allF = allFuelsRes.value;
          console.log('All fuels response:', allF);
          if (allF.ok && allF.json?.data) {
            const fuels = allF.json.data;
            console.log('Fuels data:', fuels, 'Length:', fuels.length);
            
            // Calculate Vehicle Fuel Statistics (group by license plate only)
            const fuelStatsMap = new Map<string, { vehicleType: string; licensePlate: string; carImage: string | null; fuelAmount: number; fuelCount: number; }>();
            
            fuels.forEach((fuel: any) => {
              const licensePlate = fuel.vehicle?.licensePlate || 'ไม่ระบุ';
              const vehicleType = fuel.vehicle?.vehicleType || 'Truck';
              const carImage = fuel.vehicle?.carImage || null;
              const fuelAmount = typeof fuel.fuelAmount === 'string' ? parseFloat(fuel.fuelAmount) || 0 : fuel.fuelAmount || 0;
              
              console.log('Processing fuel:', licensePlate, fuelAmount);
              
              const key = licensePlate; // Group by license plate only
              
              if (fuelStatsMap.has(key)) {
                const existing = fuelStatsMap.get(key)!;
                existing.fuelAmount += fuelAmount;
                existing.fuelCount += 1; // Count each fuel record
              } else {
                fuelStatsMap.set(key, {
                  vehicleType,
                  licensePlate,
                  carImage,
                  fuelAmount,
                  fuelCount: 1 // Start with 1 fuel record
                });
              }
            });

            // Convert to array and sort by fuelAmount (descending)
            const fuelStatsArray = Array.from(fuelStatsMap.values())
              .map(stat => ({
                ...stat,
                avgFuelAmount: stat.fuelAmount / stat.fuelCount
              }))
              .sort((a, b) => b.fuelAmount - a.fuelAmount)
              .slice(0, 6); // Take top 6

            console.log('Final fuel stats array:', fuelStatsArray);
            setFuelStats(fuelStatsArray);
          } else {
            console.log('No fuel data or API error:', allF);
          }
        } else {
          console.log('allFuelsRes failed:', allFuelsRes);
        }

        // Items for filter dropdown
        if (itemsRes.status === 'fulfilled') {
          const items = itemsRes.value;
          if (items.ok && items.json?.data) {
            const itemList = items.json.data.map((item: any) => ({
              id: item.id,
              name: item.ptDesc1 || item.ptPart || 'ไม่ระบุ'
            }));
            setAvailableItems(itemList);
            
            // Set default selected item to "ทั้งหมด"
            if (itemList.length > 0 && !selectedItem) {
              setSelectedItem('ทั้งหมด');
            }
          }
        }

        // Fuels
        if (fuelsRes.status === 'fulfilled') {
          const f = fuelsRes.value;
          if (f.ok) {
            setFuelTotalCount(f.json?.pagination?.total || 0);
            setRecentFuels((f.json?.data || []).slice(0, 5));
          }
        }

        // Evaluations
        if (evalRes.status === 'fulfilled') {
          const e = evalRes.value;
          if (e.ok && Array.isArray(e.json)) {
            // รองรับกรณีเลือก "ทุกเดือน" (selectedMonth = '') ให้ดึงทั้งปี ไม่ใช่เฉพาะเดือน 01
            const selectedYearNum = parseInt(selectedYear);
            const monthNum = selectedMonth ? parseInt(selectedMonth) : null;

            const filteredEvaluations = e.json.filter((item: any) => {
              const d = new Date(item.evaluationDate);
              if (monthNum === null) { // ทุกเดือนของปีนั้น
                return d.getFullYear() === selectedYearNum;
              }
              return d.getFullYear() === selectedYearNum && (d.getMonth() + 1) === monthNum;
            });

            // คำนวณผลประเมิน: ผ่าน (>= 8.0) vs ไม่ผ่าน (< 8.0)
            const passedEvaluations = filteredEvaluations.filter((item: any) => item.totalScore >= 8.0);
            const failedEvaluations = filteredEvaluations.filter((item: any) => item.totalScore < 8.0);

            // คำนวณข้อมูลผู้รับจ้างช่วงที่ไม่ผ่าน
            const contractorFailStats = failedEvaluations.reduce((acc: any, item: any) => {
              const contractorName = item.contractorName || 'ไม่ระบุ';
              if (!acc[contractorName]) {
                acc[contractorName] = {
                  contractorName,
                  failedCount: 0,
                  totalScore: 0,
                  evaluationCount: 0
                };
              }
              acc[contractorName].failedCount += 1;
              acc[contractorName].totalScore += item.totalScore;
              acc[contractorName].evaluationCount += 1;
              return acc;
            }, {});

            const failedContractorsData = Object.values(contractorFailStats).map((contractor: any) => ({
              contractorName: contractor.contractorName,
              failedCount: contractor.failedCount,
              averageScore: contractor.totalScore / contractor.evaluationCount
            })).sort((a: any, b: any) => b.failedCount - a.failedCount);

            setEvaluationCountThisMonth(filteredEvaluations.length);
            setEvaluationResults({
              passed: passedEvaluations.length,
              failed: failedEvaluations.length,
              total: filteredEvaluations.length
            });
            setFailedContractors(failedContractorsData);
            setRecentEvaluations(filteredEvaluations.slice(0, 5));
          }
        }
      } catch (e) {
        // เงียบ error ในหน้า dashboard
        console.error('Failed to load dashboard data', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [monthRange]);

  return (
    <Layout showSidebar={false}>
      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        
        /* ป้องกันปัญหา layout shift ขณะ resize */
        .MuiGrid-root, .dashboard-grid {
          box-sizing: border-box !important;
          width: 100% !important;
        }
        
        .MuiPaper-root {
          box-sizing: border-box !important;
          min-width: 0 !important;
          flex: 1 !important;
        }
        
        /* Force immediate recalculation ขณะ resize */
        .dashboard-grid > * {
          transition: all 0.3s ease-in-out;
          width: 100%;
          min-width: 0;
        }
        
        /* รับรองว่า grid จะ recalculate ทันทีขณะ resize */
        @media (max-width: 599px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
        
        @media (min-width: 600px) and (max-width: 899px) {
          .dashboard-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        
        @media (min-width: 900px) {
          .dashboard-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
      `}</style>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 3,
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
        boxSizing: 'border-box',
        
      }}>
        {/* Header + Filters + Quick Actions */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2, 
          flexWrap: 'wrap',
          mt: 2,
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            DASHBOARD
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            flexWrap: 'wrap', 
            alignItems: 'center',
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'flex-start', sm: 'flex-end' }
          }}>
            {/* Filters */}
            <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 180 }, flex: { xs: 1, sm: 'none' } }}>
              <InputLabel>เดือน</InputLabel>
              <Select 
                value={selectedMonth} 
                label="เดือน" 
                onChange={(e) => setSelectedMonth(e.target.value)}
                MenuProps={{
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left',
                  },
                  transformOrigin: {
                    vertical: 'top',
                    horizontal: 'left',
                  },
                  PaperProps: {
                    style: {
                      minWidth: '180px',
                      width: 'max-content'
                    },
                    sx: {
                      '& .MuiList-root': {
                        padding: 0,
                        width: '100%'
                      },
                      '& .MuiMenuItem-root': {
                        width: '100%',
                        minWidth: '180px',
                        paddingX: 2,
                        paddingY: 1,
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        justifyContent: 'flex-start',
                        boxSizing: 'border-box'
                      }
                    }
                  }
                }}
              >
                <MenuItem value="">ทุกเดือน</MenuItem>
                {months.map(m => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 180 }, flex: { xs: 1, sm: 'none' } }}>
              <InputLabel>ปี</InputLabel>
              <Select 
                value={selectedYear} 
                label="ปี" 
                onChange={(e) => setSelectedYear(e.target.value)}
                MenuProps={{
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left',
                  },
                  transformOrigin: {
                    vertical: 'top',
                    horizontal: 'left',
                  },
                  PaperProps: {
                    style: {
                      minWidth: '180px',
                      width: 'max-content'
                    },
                    sx: {
                      '& .MuiList-root': {
                        padding: 0,
                        width: '100%'
                      },
                      '& .MuiMenuItem-root': {
                        width: '100%',
                        minWidth: '180px',
                        paddingX: 2,
                        paddingY: 1,
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        justifyContent: 'flex-start',
                        boxSizing: 'border-box'
                      }
                    }
                  }
                }}
              >
                {availableYears.map(y => (
                  <MenuItem key={y} value={y.toString()}>{y + 543}</MenuItem>
                ))}
              </Select>
            </FormControl>
            

          </Box>
        </Box>

        {/* KPI Cards */}
        <Box 
          key={`kpi-grid-${windowWidth}`}
          sx={{
            display: 'grid',
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: 'repeat(2, 1fr)', 
              md: 'repeat(3, 1fr)', 
              lg: 'repeat(5, 1fr)' 
            },
            gap: { xs: 1.5, sm: 2 },
            width: '100%',
            transition: 'all 0.3s ease-in-out',
            '& > .MuiPaper-root': {
              minWidth: 0,
              boxSizing: 'border-box'
            }
          }}>
          <Paper sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              mb: { xs: 1, sm: 1.5 },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 0.5, sm: 0 }
            }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 600, 
                  fontSize: { xs: '0.85rem', sm: '1rem' },
                  textAlign: { xs: 'center', sm: 'left' },
                  lineHeight: 1.2
                }}
              >
                รถที่ขึ้นทะเบียนทั้งหมด
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', sm: '2rem' }
                }}
              >
                {loading ? <Skeleton width={60} height={40} /> : vehicleTypeCounts.total}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: { xs: 0.3, sm: 0.5 } }}>
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <img 
                  src="/images/icon-truck.png" 
                  alt="รถบรรทุก" 
                  style={{ 
                    width: 32, 
                    height: 32, 
                    marginBottom: 2 
                  }}
                />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: 600, 
                    display: 'block', 
                    fontSize: { xs: '0.85rem', sm: '1rem' }
                  }}
                >
                  
                  {loading ? <Skeleton width={20} height={24} sx={{ display: 'inline-block', ml: 1 }} /> : vehicleTypeCounts.truck}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.primary" 
                  sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                >
                  รถบรรทุก
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                
                <img 
                  src="/images/icon-pickup.png" 
                  alt="รถกระบะ" 
                  style={{ 
                    width: 32, 
                    height: 32, 
                    marginBottom: 2 
                  }}
                />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: 600, 
                    display: 'block', 
                    fontSize: { xs: '0.85rem', sm: '1rem' }
                  }}
                >
                  {loading ? <Skeleton width={20} height={24} sx={{ display: 'inline-block', ml: 1 }} /> : vehicleTypeCounts.pickup}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.primary" 
                  sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                >
                  รถกระบะ
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <img 
                  src="/images/icon-forklift.png" 
                  alt="โฟล์คลิฟท์" 
                  style={{ 
                    width: 32, 
                    height: 32, 
                    marginBottom: 2 
                  }}
                />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: 600, 
                    display: 'block', 
                    fontSize: { xs: '0.85rem', sm: '1rem' }
                  }}
                >
                  {loading ? <Skeleton width={20} height={24} sx={{ display: 'inline-block', ml: 1 }} /> : vehicleTypeCounts.forklift}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.primary" 
                  sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                >
                  โฟล์คลิฟท์
                </Typography>
              </Box>
            </Box>
            
          </Paper>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1, sm: 0 }
              }}>
                <Tooltip 
                  title={`จำนวนเที่ยวรถทั้งหมดในช่วง ${selectedMonth ? months.find(m => m.value === selectedMonth)?.label : 'ทุกเดือน'} ${parseInt(selectedYear) + 543} (รวมเฉพาะรถบรรทุก)`}
                  arrow
                  placement="top"
                >
                  <Box sx={{ cursor: 'help', textAlign: { xs: 'center', sm: 'left' } }}>
                    <Typography 
                      variant="caption" 
                      sx={{
                        fontWeight: 600, 
                        fontSize: { xs: '0.85rem', sm: '1rem' },
                        display: 'block'
                      }}
                    >
                      จำนวนเที่ยวรถ
                    </Typography>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 700,
                        fontSize: { xs: '1.75rem', sm: '2rem' }
                      }}
                    >
                      {loading ? <Skeleton width={60} height={35} /> : tripCountThisMonth}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{
                        fontWeight: 400, 
                        fontSize: { xs: '0.7rem', sm: '0.75rem' }
                      }}
                    >
                      (เที่ยว)
                    </Typography>
                  </Box>
                </Tooltip>
                <Chip 
                  icon={<TripIcon />} 
                  label="Trips" 
                  color="success" 
                  variant="outlined"
                  size="small"
                />
              </Box>
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button 
                  href="/trip-records" 
                  size="small" 
                  endIcon={<OpenIcon />}
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                >
                  ดูการเดินทาง
                </Button>
              </Box>
          </Paper>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 0.5, sm: 0 }
            }}>
              <Tooltip 
                  title={(`รวมเฉพาะรถบรรทุก | สำหรับส่วนต่าง(%) จะคำนวณจาก (จริง - ระบบ) / ระบบ x 100`)}
                  arrow
                  placement="top"
                >
              <Box sx={{ cursor: 'help', textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  fontWeight: 600, 
                  fontSize: { xs: '0.85rem', sm: '1rem' },
                  display: 'block'
                }}
              >
                ระยะทางสะสม
              </Typography>
              </Box>
              </Tooltip>
              
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              mb: 1,
              mt: { xs: 0.5, sm: 0 }
            }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  fontWeight: 400, 
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                }}
              >
                (Actual vs Estimated)
              </Typography>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              gap: 1, 
              mb: 1,
              flexDirection: { xs: 'column', sm: 'row' }
            }}>
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography 
                  variant="caption" 
                  color="text.primary" 
                  sx={{ 
                    fontSize: { xs: '0.85rem', sm: '1rem' },
                    display: 'block'
                  }}
                >
                  จริง
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 500, 
                    color: 'success.main',
                    fontSize: { xs: '0.85rem', sm: '1rem' }
                  }}
                >
                  {loading ? <Skeleton width={50} height={20} sx={{display: 'inline-block'}} /> : totalActualDistance.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                >
                  กม.
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography 
                  variant="caption" 
                  color="text.primary" 
                  sx={{ 
                    fontSize: { xs: '0.85rem', sm: '1rem' },
                    display: 'block'
                  }}
                >
                  ระบบ
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 500, 
                    color: 'warning.main',
                    fontSize: { xs: '0.85rem', sm: '1rem' }
                  }}
                >
                  {loading ? <Skeleton width={50} height={20} sx={{ display: 'inline-block' }} /> : totalEstimatedDistance.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                >
                  กม.
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography 
                  variant="caption" 
                  color="text.primary" 
                  sx={{ 
                    fontSize: { xs: '0.85rem', sm: '1rem' },
                    display: 'block'
                  }}
                >
                  ส่วนต่าง
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 500, 
                    color: (() => {
                      if (loading || totalEstimatedDistance === 0) return 'text.primary';
                      const diff = ((totalActualDistance - totalEstimatedDistance) / totalEstimatedDistance) * 100;
                      return diff > 0 ? 'error.main' : diff < 0 ? 'info.main' : 'text.primary';
                    })(),
                    fontSize: { xs: '0.85rem', sm: '1rem' }
                  }}
                >
                  {loading || totalEstimatedDistance === 0 ? <Skeleton width={50} height={20} sx={{ display: 'inline-block' }} /> : 
                    `${Math.abs(((totalActualDistance - totalEstimatedDistance) / totalEstimatedDistance) * 100).toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`
                  }
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                >
                  (%)
                </Typography>
              </Box>

            </Box>
            
          </Paper>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1, sm: 0 }
            }}>
            <Tooltip 
                  title={`รถทุกประเภท`}
                  arrow
                  placement="top"
                >
                  <Box sx={{ cursor: 'help', textAlign: { xs: 'center', sm: 'left' } }}>
              <Box>
                <Typography 
                  variant="caption" 
                  sx={{
                    fontWeight: 600, 
                    fontSize: { xs: '0.85rem', sm: '1rem' },
                    display: 'block'
                  }}
                >
                  บันทึกเติมน้ำมัน
                </Typography>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700,
                    fontSize: { xs: '1.75rem', sm: '2rem' }
                  }}
                >
                  {loading ? <Skeleton width={60} height={35} /> : fuelTotalCount}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{
                    fontWeight: 400, 
                    fontSize: { xs: '0.7rem', sm: '0.75rem' }
                  }}
                >
                  (ครั้ง)
                </Typography>
              </Box>
              </Box>
              </Tooltip>
              <Chip 
                icon={<FuelIcon />} 
                label="Fuels" 
                color="warning" 
                variant="outlined"
                size="small"
              />
            </Box>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button 
                href="/fuel-records" 
                size="small" 
                endIcon={<OpenIcon />}
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                ดูเติมน้ำมัน
              </Button>
            </Box>
          </Paper>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              mb: 1,
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 0.5, sm: 0 }
            }}>
              <Tooltip 
                  title={`คะแนนมากกว่า 80% ขึ้นไป = ผ่าน / ต่ำกว่า 80% = ไม่ผ่าน`}
                  arrow
                  placement="top"
                >
                  <Box sx={{ cursor: 'help', textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  fontWeight: 600, 
                  fontSize: { xs: '0.8rem', sm: '1rem' },
                  lineHeight: 1.2,
                  display: 'block'
                }}
              >
                แบบประเมิน Subcontract
              </Typography>
              </Box>
              </Tooltip>
              
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              gap: 1, 
              mb: 1,
              flexDirection: { xs: 'column', sm: 'row' }
            }}>
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography 
                  variant="caption" 
                  color="text.primary" 
                  sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    display: 'block'
                  }}
                >
                  ผ่าน
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    color: 'success.main',
                    fontSize: { xs: '1rem', sm: '1.125rem' }
                  }}
                >
                  {loading ? <Skeleton width={40} height={22} sx={{ display: 'inline-block' }} /> : evaluationResults.passed}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                >
                  ≥80%
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography 
                  variant="caption" 
                  color="text.primary" 
                  sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    display: 'block'
                  }}
                >
                  ไม่ผ่าน
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    color: 'error.main',
                    fontSize: { xs: '1rem', sm: '1.125rem' }
                  }}
                >
                  {loading ? <Skeleton width={40} height={22} sx={{ display: 'inline-block' }} /> : evaluationResults.failed}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                >
                  &lt;80%
                </Typography>
              </Box>
              
              
            </Box>
            
            <Button 
              href="/evaluation" 
              size="small" 
              endIcon={<OpenIcon />} 
              fullWidth
              sx={{ 
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                mt: { xs: 1, sm: 0 }
              }}
            >
              ดูแบบประเมิน
            </Button>
          </Paper>
        </Box>

        {/* Recent Sections */}
        <Box 
          key={`dashboard-grid-${windowWidth}`}
          className="dashboard-grid"
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`,
            gap: { xs: 1.5, sm: 2 },
            alignItems: 'stretch',
            width: '100%',
            transition: 'all 0.3s ease-in-out',
            '& > .MuiPaper-root': {
              minHeight: { sm: 300, md: 450 },
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              boxSizing: 'border-box',
              flex: 1
            }
        }}>
          <Paper sx={{ 
            p: { xs: 1.5, sm: 2 }, 
            borderRadius: 2,
            minHeight: { md: 400 },
            display: 'flex',
            flexDirection: 'column'
          }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1, sm: 0 }
              }}>
                <Tooltip 
                  title="แสดงเที่ยวรถเฉพาะรถบรรทุก"
                  arrow
                  placement="top"
                >
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 500, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1, 
                      cursor: 'help',
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}
                  >
                    <TripIcon fontSize="small" /> เที่ยวรถล่าสุด
                  </Typography>
                </Tooltip>
                <Button 
                  href="/trip-records" 
                  size="small"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                >
                  ทั้งหมด
                </Button>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <List dense>
                  {recentTrips.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>ยังไม่มีข้อมูล</Typography>
                  ) : recentTrips.map((t) => {
                    // ใช้ชื่อคนขับจาก trip_records (driverName ที่บันทึกในเที่ยวรถ) ไม่อิงจาก vehicle*
                    // หาก backend บันทึก driverName ทุกกรณี (รวม main/backup) จะถูกแสดงตรง ๆ
                    // ถ้ายังไม่ได้บันทึก ให้พิจารณาปรับ API ตอนสร้างเที่ยวรถให้ copy ชื่อคนขับมาเก็บใน field driverName
                    const driverDisplay = t.driverName || '';
                    
                    return (
                    <ListItem 
                      key={t.id} 
                      sx={{ 
                        px: 0,
                        py: 0.5,
                        borderBottom: 1,
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 'none' }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <TripIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                            <Chip label={t.vehicle.licensePlate} size="small" color="primary" variant="outlined" />
                            {driverDisplay && <Chip label={driverDisplay} size="small" color="info" variant="outlined" />}
                            <Typography variant="body2" fontWeight="medium">{t.customer?.cmName || '-'}</Typography>
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary" component="span">
                              {formatDate(t.departureDate)} - {formatDate(t.returnDate)}
                            </Typography>
                            {t.actualDistance && (
                              <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                                ระยะทางจากไมล์รถ: {t.actualDistance.toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                              </Typography>
                            )}
                            
                          </>
                        }
                      />
                    </ListItem>
                    );
                  })}
                </List>
              )}
          </Paper>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1, sm: 0 }
              }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 500, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }}
                >
                  <FuelIcon fontSize="small" /> เติมน้ำมันล่าสุด
                </Typography>
                <Button 
                  href="/fuel-records" 
                  size="small"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                >
                  ทั้งหมด
                </Button>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <List dense>
                  {recentFuels.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>ยังไม่มีข้อมูล</Typography>
                  ) : recentFuels.map((f) => {
                    // ใช้ชื่อคนขับจาก fuel_records (driverName) ไม่ใช้จาก vehicle
                    const driverDisplay = f.driverName || '';
                    
                    return (
                    <ListItem key={f.id} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <FuelIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Chip label={f.vehicle.licensePlate} size="small" color="primary" variant="outlined" />
                            {driverDisplay && <Chip label={driverDisplay} size="small" color="info" variant="outlined" />}
                            <Typography variant="body2">{Number(f.fuelAmount).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลิตร</Typography>
                          </Box>
                        }
                        secondary={formatDate(f.fuelDate)}
                      />
                    </ListItem>
                    );
                  })}
                </List>
              )}
          </Paper>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1, sm: 0 }
              }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 500, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }}
                >
                  <EvalIcon fontSize="small" /> แบบประเมินผลล่าสุด
                </Typography>
                <Button 
                  href="/evaluation" 
                  size="small"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                >
                  ทั้งหมด
                </Button>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <List dense>
                  {recentEvaluations.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>ยังไม่มีข้อมูล</Typography>
                  ) : recentEvaluations.map((e) => (
                    <ListItem key={e.id} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <EvalIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Chip label={e.vehiclePlate} size="small" color="primary" variant="outlined" />
                            <Typography variant="body2">{e.contractorName || '-'}</Typography>
                            <Chip label={`${e.totalScore}/10`} size="small" color={e.totalScore >= 8 ? 'success' : 'error'} />
                          </Box>
                        }
                        secondary={formatDate(e.evaluationDate)}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          <Paper sx={{ p: 2, borderRadius: 2 , mb:2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TripIcon fontSize="small" /> 
                {selectedVehicle ? `${selectedVehicle}` : 'เที่ยวรถแยกตามทะเบียนรถ'}
                {!selectedVehicle && (
                  <img 
                    src="/images/icon-drilldown.png" 
                    alt="drilldown" 
                    style={{ 
                      width: 20, 
                      height: 20, 
                      marginLeft: 4,
                      opacity: 1 
                    }} 
                  />
                )}
              </Typography>
              {selectedVehicle && (
                <Button
                  size="small"
                  onClick={handleBackToVehicles}
                  sx={{ 
                    minWidth: 'auto', 
                    px: 1,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateX(-2px)',
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  ← กลับ
                </Button>
              )}
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : driverStats.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                ยังไม่มีข้อมูล
              </Typography>
            ) : !selectedVehicle ? (
              <Fade in={!selectedVehicle} timeout={300}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {(() => {
                    const maxDistance = Math.max(...driverStats.map(d => d.distance));
                    return driverStats.map((vehicle, index) => {
                      const percentage = maxDistance > 0 ? (vehicle.distance / maxDistance) * 100 : 0;
                      
                      // Determine vehicle icon based on type or use database image
                      const getVehicleImage = (vehicle: any) => {
                        // If carImage exists in database, use it with proper path
                        if (vehicle.carImage) {
                          // Ensure the path starts with / for proper routing
                          const imagePath = vehicle.carImage.startsWith('/') ? vehicle.carImage : `/${vehicle.carImage}`;
                          
                          // ใน production ใช้ serve-image API
                          if (process.env.NODE_ENV === 'production' && imagePath.startsWith('/uploads/')) {
                            return `/api/serve-image?path=${encodeURIComponent(imagePath)}`;
                          }
                          
                          return imagePath;
                        }
                        
                        // Fallback to default icons based on vehicle type
                        switch (vehicle.vehicleType?.toLowerCase()) {
                          case 'truck': return '/images/icon-truck.png';
                          case 'pickup': return '/images/icon-pickup.png';
                          case 'forklift': return '/images/icon-forklift.png';
                          default: return '/images/icon-truck.png';
                        }
                      };

                      const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        // If image fails to load, fallback to vehicle type icon
                        const img = e.target as HTMLImageElement;
                        console.error('❌ Image load failed:', img.src);
                        
                        // หากเป็น API serve-image ที่ล้มเหลว และไม่ใช่ production ลอง static file
                        if (img.src.includes('api/serve-image') && process.env.NODE_ENV !== 'production') {
                          console.log('🔄 API failed in dev, trying static file');
                          const urlParams = new URLSearchParams(img.src.split('?')[1]);
                          const originalPath = urlParams.get('path');
                          if (originalPath) {
                            img.src = originalPath;
                            return;
                          }
                        }
                        
                        // Fallback to vehicle type icon
                        switch (vehicle.vehicleType?.toLowerCase()) {
                          case 'truck': 
                            img.src = '/images/icon-truck.png';
                            break;
                          case 'pickup': 
                            img.src = '/images/icon-pickup.png';
                            break;
                          case 'forklift': 
                            img.src = '/images/icon-forklift.png';
                            break;
                          default: 
                            img.src = '/images/icon-truck.png';
                        }
                      };
                      
                      return (
                        <Box 
                          key={vehicle.licensePlate} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            cursor: 'pointer',
                            p: 1,
                            borderRadius: 1,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                              transform: 'translateX(4px)',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }
                          }}
                          onClick={() => handleVehicleClick(vehicle.licensePlate)}
                        >
                          {/* Vehicle Icon + License Plate */}
                          <Box sx={{ width: 110, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <img 
                              src={getVehicleImage(vehicle)} 
                              alt={vehicle.vehicleType}
                              onError={handleImageError}
                              style={{ 
                                width: 40, 
                                height: 40,
                                objectFit: 'cover',
                                borderRadius: vehicle.carImage ? '4px' : '0px' // Round corners for actual car photos
                              }}
                            />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                {vehicle.licensePlate}
                              </Typography>
                              
                            </Box>
                          </Box>

                          {/* Trip Count */}
                          <Box sx={{ minWidth: 60, textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'primary.main' }}>
                              {vehicle.tripCount}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              เที่ยว
                            </Typography>
                          </Box>
                          
                         
                          {/* Progress Bar */}
                          <Box sx={{ flex: 1, mx: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={percentage} 
                              sx={{ 
                                height: 10, 
                                borderRadius: 3,
                                backgroundColor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 3,
                                  backgroundColor: 'primary.main'
                                }
                              }} 
                            />
                          </Box>
                          
                          {/* Distance */}
                          <Box sx={{ minWidth: 50, textAlign: 'right' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                              {vehicle.distance.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              กม.
                            </Typography>
                          </Box>
                        </Box>
                      );
                    });
                  })()}
                </Box>
              </Fade>
            ) : (
              /* Drilldown View */
              <Fade in={!!selectedVehicle} timeout={300}>
                <Box>
                  {vehicleDetailLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : vehicleTrips.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      ไม่พบข้อมูลเที่ยวรถในช่วงเวลาที่เลือก
                    </Typography>
                  ) : (
                    <Box>
                      {/* Summary for selected vehicle */}
                      <Box sx={{ mb: 1.5, p: 1.5, backgroundColor: 'primary.50', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          จำนวนเที่ยวรถทั้งหมด: {vehicleTrips.length} เที่ยว
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                          ระยะทางรวม: {vehicleTrips.reduce((sum, trip) => {
                            const distance = Number(trip.actualDistance) || 0;
                            return sum + distance;
                          }, 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                        </Typography>
                      </Box>

                      {/* Detailed trip list */}
                      <List dense>
                        {vehicleTrips.map((trip) => (
                          <ListItem 
                            key={trip.id} 
                            sx={{ 
                              px: 0,
                              py: 1,
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              '&:last-child': {
                                borderBottom: 'none'
                              }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <TripIcon fontSize="small" color="primary" />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                                  {trip.driverName && (
                                    <Chip 
                                      label={trip.driverName} 
                                      size="small" 
                                      color="info" 
                                      variant="outlined" 
                                    />
                                  )}
                                  <Typography variant="body2" fontWeight="medium">
                                    {trip.customer?.cmName || '-'}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <>
                                  <Typography variant="body2" color="text.secondary" component="span">
                                    📅 {trip.departureDate ? formatDate(trip.departureDate) : 'ไม่ระบุ'}
                                    {trip.returnDate && ` - ${formatDate(trip.returnDate)}`}
                                  </Typography>
                                  {trip.actualDistance && (
                                    <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                                      🛣️ ระยะทางจากไมล์รถ: {Number(trip.actualDistance).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                                    </Typography>
                                  )}
                                  {trip.documentNumber && (
                                    <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                                      📄 เลขที่เอกสาร: {trip.documentNumber}
                                    </Typography>
                                  )}
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              </Fade>
            )}
          </Paper>
          <Paper sx={{ p: 2, borderRadius: 2 , mb:2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FuelIcon fontSize="small" /> 
                {selectedFuelVehicle ? `${selectedFuelVehicle}` : 'การเติมน้ำมันแยกตามทะเบียนรถ'}
                {!selectedFuelVehicle && (
                  <img 
                    src="/images/icon-drilldown.png" 
                    alt="drilldown" 
                    style={{ 
                      width: 20, 
                      height: 20, 
                      marginLeft: 4,
                      opacity: 1 
                    }} 
                  />
                )}
              </Typography>
              {selectedFuelVehicle && (
                <Button
                  size="small"
                  onClick={handleBackToFuelVehicles}
                  sx={{ 
                    minWidth: 'auto', 
                    px: 1,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateX(-2px)',
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  ← กลับ
                </Button>
              )}
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : fuelStats.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                ยังไม่มีข้อมูล
              </Typography>
            ) : !selectedFuelVehicle ? (
              <Fade in={!selectedFuelVehicle} timeout={300}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {(() => {
                    const maxFuelAmount = Math.max(...fuelStats.map(v => v.fuelAmount));
                    return fuelStats.map((vehicle, index) => {
                      const percentage = maxFuelAmount > 0 ? (vehicle.fuelAmount / maxFuelAmount) * 100 : 0;
                      
                      // Determine vehicle icon based on type or use database image
                      const getVehicleImage = (vehicle: any) => {
                        // If carImage exists in database, use it with proper path
                        if (vehicle.carImage) {
                          // Ensure the path starts with / for proper routing
                          const imagePath = vehicle.carImage.startsWith('/') ? vehicle.carImage : `/${vehicle.carImage}`;
                          
                          // ใน production ใช้ serve-image API
                          if (process.env.NODE_ENV === 'production' && imagePath.startsWith('/uploads/')) {
                            return `/api/serve-image?path=${encodeURIComponent(imagePath)}`;
                          }
                          
                          return imagePath;
                        }
                        
                        // Fallback to default icons based on vehicle type
                        switch (vehicle.vehicleType?.toLowerCase()) {
                          case 'truck': return '/images/icon-truck.png';
                          case 'pickup': return '/images/icon-pickup.png';
                          case 'forklift': return '/images/icon-forklift.png';
                          default: return '/images/icon-truck.png';
                        }
                      };

                      const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        // If image fails to load, fallback to vehicle type icon
                        const img = e.target as HTMLImageElement;
                        console.error('❌ Image load failed:', img.src);
                        
                        // หากเป็น API serve-image ที่ล้มเหลว และไม่ใช่ production ลอง static file
                        if (img.src.includes('api/serve-image') && process.env.NODE_ENV !== 'production') {
                          console.log('🔄 API failed in dev, trying static file');
                          const urlParams = new URLSearchParams(img.src.split('?')[1]);
                          const originalPath = urlParams.get('path');
                          if (originalPath) {
                            img.src = originalPath;
                            return;
                          }
                        }
                        
                        // Fallback to vehicle type icon
                        switch (vehicle.vehicleType?.toLowerCase()) {
                          case 'truck': 
                            img.src = '/images/icon-truck.png';
                            break;
                          case 'pickup': 
                            img.src = '/images/icon-pickup.png';
                            break;
                          case 'forklift': 
                            img.src = '/images/icon-forklift.png';
                            break;
                          default: 
                            img.src = '/images/icon-truck.png';
                        }
                      };
                      
                      return (
                        <Box 
                          key={vehicle.licensePlate} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            cursor: 'pointer',
                            p: 1,
                            borderRadius: 1,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                              transform: 'translateX(4px)',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }
                          }}
                          onClick={() => handleFuelVehicleClick(vehicle.licensePlate)}
                        >
                          {/* Vehicle Icon + License Plate */}
                          <Box sx={{ width: 100, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <img 
                              src={getVehicleImage(vehicle)} 
                              alt={vehicle.vehicleType}
                              onError={handleImageError}
                              style={{ 
                                width: 36, 
                                height: 36,
                                objectFit: 'cover',
                                borderRadius: vehicle.carImage ? '4px' : '0px' // Round corners for actual car photos
                              }}
                            />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                                {vehicle.licensePlate}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Fuel Count */}
                          <Box sx={{ minWidth: 60, textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'info.main' }}>
                              {vehicle.fuelCount}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              ครั้ง
                            </Typography>
                          </Box>
                          
     
                          {/* Progress Bar */}
                          <Box sx={{ flex: 1, mx: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={percentage} 
                              sx={{ 
                                height: 10, 
                                borderRadius: 3,
                                backgroundColor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 3,
                                  backgroundColor: 'info.main'
                                }
                              }} 
                            />
                          </Box>
                          
                          {/* Fuel Amount */}
                          <Box sx={{ minWidth: 70, textAlign: 'right' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                              {vehicle.fuelAmount.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              ลิตร
                            </Typography>
                          </Box>
                        </Box>
                      );
                    });
                  })()}
                </Box>
              </Fade>
            ) : (
              /* Drilldown View */
              <Fade in={!!selectedFuelVehicle} timeout={300}>
                <Box>
                  {fuelDetailLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : vehicleFuelRecords.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      ไม่พบข้อมูลการเติมน้ำมันในช่วงเวลาที่เลือก
                    </Typography>
                  ) : (
                    <Box>
                      {/* Summary for selected vehicle */}
                      <Box sx={{ mb: 1.5, p: 1.5, backgroundColor: 'info.50', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main' }}>
                          จำนวนการเติมน้ำมันทั้งหมด: {vehicleFuelRecords.length} ครั้ง
                        </Typography>
                        <Typography variant="caption" color="text.primary" sx={{ fontSize: '0.85rem',fontWeight: 500 }}>
                          ปริมาณรวม: {vehicleFuelRecords.reduce((sum, fuel) => {
                            const amount = Number(fuel.fuelAmount) || 0;
                            return sum + amount;
                          }, 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลิตร
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.85rem', display: 'block', fontWeight: 400 }}>
                          ค่าเฉลี่ย: {vehicleFuelRecords.length > 0 ? (vehicleFuelRecords.reduce((sum, fuel) => {
                            const amount = Number(fuel.fuelAmount) || 0;
                            return sum + amount;
                          }, 0) / vehicleFuelRecords.length).toLocaleString('th-TH', { maximumFractionDigits: 1 }) : '0'} ลิตร/ครั้ง
                        </Typography>
                      </Box>

                      {/* Detailed fuel list */}
                      <List dense>
                        {vehicleFuelRecords.map((fuel) => (
                          <ListItem 
                            key={fuel.id} 
                            sx={{ 
                              px: 0,
                              py: 1,
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              '&:last-child': {
                                borderBottom: 'none'
                              }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <FuelIcon fontSize="small" color="info" />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                                  {fuel.driverName && (
                                    <Chip 
                                      label={fuel.driverName} 
                                      size="small" 
                                      color="info" 
                                      variant="outlined" 
                                    />
                                  )}
                                  <Typography variant="body2" fontWeight="medium">
                                    {Number(fuel.fuelAmount).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลิตร
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <>
                                  <Typography variant="body2" color="text.secondary" component="span">
                                    📅 {fuel.fuelDate ? formatDate(fuel.fuelDate) : 'ไม่ระบุ'}
                                  </Typography>
                                  {fuel.odometer && (
                                    <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                                      🛣️ เลขไมล์: {Number(fuel.odometer).toLocaleString('th-TH', { maximumFractionDigits: 2 })} กม.
                                    </Typography>
                                  )}
                                  {fuel.remark && (
                                    <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                                      📝 {fuel.remark}
                                    </Typography>
                                  )}
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              </Fade>
            )}
          </Paper>
          <Paper sx={{ p: 2, borderRadius: 2 , mb:2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                <InventoryIcon fontSize="small" /> 
                {selectedDriver ? `${selectedDriver}` : 'พัสดุนำกลับ'}
                {!selectedDriver && (
                  <img 
                    src="/images/icon-drilldown.png" 
                    alt="drilldown" 
                    style={{ 
                      width: 20, 
                      height: 20, 
                      marginLeft: 4,
                      opacity: 1 
                    }} 
                  />
                )}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectedDriver && (
                  <Button
                    size="small"
                    onClick={handleBackToDrivers}
                    sx={{ 
                      minWidth: 'auto', 
                      px: 1,
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateX(-2px)',
                        backgroundColor: 'action.hover'
                      }
                    }}
                  >
                    ← กลับ
                  </Button>
                )}
                
                {/* Item Filter - ซ่อนเมื่ออยู่ใน drilldown mode */}
                {!selectedDriver && (
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>พัสดุ</InputLabel>
                    <Select 
                      value={selectedItem} 
                      label="พัสดุ" 
                      onChange={(e) => setSelectedItem(e.target.value)}
                    >
                      <MenuItem value="ทั้งหมด">ทั้งหมด</MenuItem>
                      {availableItems.map(item => (
                        <MenuItem key={item.id} value={item.name}>{item.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : !selectedDriver ? (
              <Fade in={!selectedDriver} timeout={300}>
                <Box>
                  {(() => {
                    // Handle all items or specific item filter
                    let filteredItems;
                    if (selectedItem === 'ทั้งหมด') {
                      // Aggregate all items by driver
                      const driverTotals = itemStats.reduce((acc, item) => {
                        if (!acc[item.driverName]) {
                          acc[item.driverName] = { 
                            driverName: item.driverName, 
                            quantity: 0,
                            driverImage: item.driverImage
                          };
                        }
                        acc[item.driverName].quantity += item.quantity;
                        // Keep the first driver image found for this driver
                        if (!acc[item.driverName].driverImage && item.driverImage) {
                          acc[item.driverName].driverImage = item.driverImage;
                        }
                        return acc;
                      }, {} as Record<string, { driverName: string; quantity: number; driverImage?: string }>);
                      
                      filteredItems = Object.values(driverTotals);
                    } else {
                      // Filter by selected item
                      filteredItems = itemStats.filter(item => item.itemName === selectedItem);
                    }
                    
                    if (filteredItems.length === 0) {
                      return (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                          ยังไม่มีข้อมูล
                        </Typography>
                      );
                    }

                    // Sort by quantity (remove slice to show all items)
                    const sortedItems = filteredItems
                      .sort((a, b) => b.quantity - a.quantity);
                    
                    const maxQuantity = Math.max(...sortedItems.map(item => item.quantity));

                    return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {sortedItems.map((item, index) => {
                          const percentage = maxQuantity > 0 ? (item.quantity / maxQuantity) * 100 : 0;
                          
                          return (
                            <Box 
                              key={`${item.driverName}-${index}`} 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1,
                                cursor: 'pointer',
                                p: 1,
                                borderRadius: 1,
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                  backgroundColor: 'action.hover',
                                  transform: 'translateX(4px)',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }
                              }}
                              onClick={() => handleDriverClick(item.driverName)}
                            >
                              {/* Driver Image + Name */}
                              <Box sx={{ width: 140, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <img 
                                  src={(() => {
                                    // If no driver image or invalid values, use avatar API
                                    if (!item.driverImage || 
                                        item.driverImage === 'undefined' || 
                                        item.driverImage === 'null') {
                                      return `https://ui-avatars.com/api/?name=${encodeURIComponent(item.driverName)}&background=0d47a1&color=fff&size=128`;
                                    }
                                    
                                    // If already a full URL (avatar API or external), use as is
                                    if (item.driverImage.startsWith('http')) {
                                      return item.driverImage;
                                    }
                                    
                                    // Handle uploaded images with proper path
                                    let imagePath = item.driverImage;
                                    if (!imagePath.startsWith('/uploads/')) {
                                      imagePath = `/uploads/driver/${imagePath}`;
                                    }
                                    
                                    // Use serve-image API in production
                                    if (process.env.NODE_ENV === 'production') {
                                      return `/api/serve-image?path=${encodeURIComponent(imagePath)}`;
                                    }
                                    
                                    return imagePath;
                                  })()}
                                  alt={item.driverName}
                                  onError={(e) => {
                                    // Fallback to avatar API if image fails to load
                                    const img = e.target as HTMLImageElement;
                                    console.error('❌ Driver image load failed:', img.src);
                                    img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.driverName)}&background=0d47a1&color=fff&size=128`;
                                  }}
                                  style={{ 
                                    width: 40, 
                                    height: 40,
                                    objectFit: 'cover',
                                    borderRadius: '50%'
                                  }}
                                />
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                    {item.driverName}
                                  </Typography>
                                  
                                </Box>
                              </Box>
                              
                              {/* Progress Bar */}
                              <Box sx={{ flex: 1, mx: 1 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={percentage} 
                                  sx={{ 
                                    height: 10, 
                                    borderRadius: 3,
                                    backgroundColor: 'grey.200',
                                    '& .MuiLinearProgress-bar': {
                                      borderRadius: 3,
                                      backgroundColor: 'info.main'
                                    }
                                  }} 
                                />
                              </Box>
                              
                              {/* Quantity */}
                              <Box sx={{ minWidth: 60, textAlign: 'right' }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                  {item.quantity.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                  ชิ้น
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    );
                  })()}
                </Box>
              </Fade>
            ) : (
              /* Drilldown View */
              <Fade in={!!selectedDriver} timeout={300}>
                <Box>
                  {itemDetailLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : driverItems.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      {selectedItem === 'ทั้งหมด' 
                        ? 'ไม่พบข้อมูลพัสดุในช่วงเวลาที่เลือก'
                        : `ไม่พบข้อมูล ${selectedItem} ในช่วงเวลาที่เลือก`
                      }
                    </Typography>
                  ) : (
                    <Box>
                      {/* Summary for selected driver */}
                      <Box sx={{ mb: 1.5, p: 1.5, backgroundColor: 'info.50', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main' }}>
                          {selectedItem === 'ทั้งหมด' 
                            ? `จำนวนพัสดุทั้งหมด: ${driverItems.length} รายการ`
                            : `จำนวน ${selectedItem}: ${driverItems.length} รายการ`
                          }
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.85rem', display: 'block' }}>
                          ปริมาณรวม: {driverItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ชิ้น
                        </Typography>
                        <Typography variant="caption" color="text.primary" sx={{ fontSize: '0.85rem', display: 'block', fontWeight: 500 }}>
                          มูลค่ารวม: {(() => {
                            console.log('Driver items for value calculation:', driverItems);
                            const totalValue = driverItems.reduce((sum, item) => {
                              const quantity = Number(item.quantity) || 0;
                              const price = Number(item.unitPrice) || Number(item.price) || 0;
                              console.log(`Item: ${item.itemName}, Quantity: ${quantity}, UnitPrice: ${item.unitPrice}, Price: ${item.price}, Used Price: ${price}, Value: ${quantity * price}`);
                              return sum + (quantity * price);
                            }, 0);
                            console.log('Total value:', totalValue);
                            return totalValue.toLocaleString('th-TH', { maximumFractionDigits: 2 });
                          })()} บาท
                        </Typography>
                      </Box>

                      {/* Detailed item list */}
                      <List dense>
                        {driverItems.map((item, index) => (
                          <ListItem 
                            key={`${item.tripId}-${item.itemId}-${index}`} 
                            sx={{ 
                              px: 0,
                              py: 1,
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              '&:last-child': {
                                borderBottom: 'none'
                              }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <TripIcon fontSize="small" color="info" />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                                  <Chip 
                                    label={item.itemName || 'ไม่ระบุ'} 
                                    size="small" 
                                    color="primary" 
                                     
                                  />
                                  <Typography variant="body2" fontWeight="medium">
                                    {Number(item.quantity || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ชิ้น
                                  </Typography>
                                  {item.vehiclePlate && (
                                    <Chip 
                                      label={item.vehiclePlate} 
                                      size="small" 
                                      color="info" 
                                      variant="outlined" 
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                <>
                                  <Typography variant="body2" color="text.secondary" component="span">
                                    📅 {item.tripDate ? formatDate(item.tripDate) : 'ไม่ระบุ'}
                                  </Typography>
                                  {item.customerName && (
                                    <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                                      🏢 ลูกค้า: {item.customerName}
                                    </Typography>
                                  )}
                                  {(item.unitPrice && Number(item.unitPrice) > 0) || (item.price && Number(item.price) > 0) ? (
                                    <>
                                      <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                                        💰 ราคา: {Number(item.unitPrice || item.price || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท/ชิ้น
                                      </Typography>
                                      <Typography variant="body2" color="success.main" component="span" sx={{ display: 'block', fontWeight: 600 }}>
                                        💵 มูลค่า: {(Number(item.quantity || 0) * Number(item.unitPrice || item.price || 0)).toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท
                                      </Typography>
                                    </>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                                      💰 ราคา: ไม่ระบุ
                                    </Typography>
                                  )}
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              </Fade>
            )}
          </Paper>
          {/* Failed Contractors Pie Chart */}
          <Paper sx={{ p: 2, borderRadius: 2 , mb:2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EvalIcon fontSize="small" /> 
                {selectedContractor ? `${selectedContractor}` : 'แบบประเมินที่ไม่ผ่านแยกตาม Subcontract'}
                {!selectedContractor && (
                  <img 
                    src="/images/icon-drilldown.png" 
                    alt="drilldown" 
                    style={{ 
                      width: 20, 
                      height: 20, 
                      marginLeft: 4,
                      opacity: 1 
                    }} 
                  />
                )}
                
              </Typography>
              
             
              {selectedContractor && (
                <Button
                  size="small"
                  onClick={handleBackToChart}
                  sx={{ 
                    minWidth: 'auto', 
                    px: 1,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateX(-2px)',
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  ← กลับ
                </Button>
              )}
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : failedContractors.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                ไม่มีการประเมินที่ไม่ผ่าน
              </Typography>
            ) : (
              <Box sx={{ minHeight: 400, position: 'relative' }}>
                {!selectedContractor ? (
                  <Fade in={!selectedContractor} timeout={300}>
                    <Box>
                      {/* Chart.js Pie Chart */}
                      <Box sx={{ 
                        height: 200, 
                        mb: 2, 
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'scale(1.01)'
                      }
                    }}>
                      <Pie
                        data={{
                          labels: failedContractors.slice(0, 5).map(contractor => contractor.contractorName),
                          datasets: [{
                            data: failedContractors.slice(0, 5).map(contractor => contractor.failedCount),
                            backgroundColor: [
                              'rgba(54, 162, 235, 1)',   // Blue
                              'rgba(255, 99, 255, 1)',   // Pink
                              'rgba(153, 102, 255, 1)',  // Purple
                              'rgba(75, 192, 192, 1)',   // Teal
                              
                              'rgba(255, 159, 64, 1)',   // Orange
                              'rgba(199, 199, 199, 1)',  // Grey
                              'rgba(83, 102, 255, 1)',   // Indigo
                              
                              'rgba(99, 255, 132, 1)',   // Green
                              'rgba(255, 206, 84, 1)',   // Amber
                              'rgba(75, 192, 255, 1)',   // Light Blue
                              'rgba(153, 255, 102, 1)',  // Light Green
                              'rgba(255, 153, 102, 1)',  // Peach
                              'rgba(102, 153, 255, 1)'   // Lavender
                            ],
                            borderColor: '#ffffff',
                            borderWidth: 2,
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context: any) {
                                  const contractor = failedContractors[context.dataIndex];
                                  const total = failedContractors.slice(0, 5).reduce((sum, c) => sum + c.failedCount, 0);
                                  const percentage = ((contractor.failedCount / total) * 100).toLocaleString('th-TH', { maximumFractionDigits: 1 });
                                  return [
                                    
                                    `จำนวนครั้งที่ไม่ผ่าน: ${contractor.failedCount} ครั้ง`,
                                    `คะแนนเฉลี่ย: ${contractor.averageScore.toLocaleString('th-TH', { maximumFractionDigits: 1 })}/10`,
                                    `สัดส่วน: ${percentage}%`,
                                    'คลิกเพื่อดูรายละเอียด'
                                  ];
                                }
                              }
                            }
                          },
                          elements: {
                            arc: {
                              borderWidth: 2
                            }
                          },
                          onClick: (event: any, elements: any) => {
                            if (elements.length > 0) {
                              const index = elements[0].index;
                              const contractorName = failedContractors[index].contractorName;
                              handleContractorClick(contractorName);
                            }
                          },
                          // Add percentage labels in pie slices
                          layout: {
                            padding: 0
                          }
                        }}
                        plugins={[{
                          id: 'percentageLabels',
                          afterDatasetsDraw: function(chart: any) {
                            const ctx = chart.ctx;
                            const data = chart.data.datasets[0].data;
                            const total = data.reduce((sum: number, value: number) => sum + value, 0);
                            
                            chart.data.datasets.forEach((dataset: any, i: number) => {
                              const meta = chart.getDatasetMeta(i);
                              meta.data.forEach((element: any, index: number) => {
                                const percentage = ((data[index] / total) * 100);
                                
                                // Only show percentage if > 5%
                                if (percentage > 5) {
                                  const { x, y } = element.tooltipPosition();
                                  
                                  ctx.save();
                                  ctx.fillStyle = '#ffffff';
                                  ctx.font = 'bold 14px Arial';
                                  ctx.textAlign = 'center';
                                  ctx.textBaseline = 'middle';
                                  ctx.fillText(`${percentage.toFixed(0)}%`, x, y);
                                  ctx.restore();
                                }
                              });
                            });
                          }
                        }]}
                      />
                    </Box>

                    {/* Summary */}
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                        {failedContractors.reduce((sum, contractor) => sum + contractor.failedCount, 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        ครั้งที่ไม่ผ่าน
                      </Typography>
                    </Box>

                    {/* Legend */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {failedContractors.slice(0, 5).map((contractor, index) => {
                        const colors = [
                          'rgba(54, 162, 235, 1)',   // Blue
                          'rgba(255, 99, 255, 1)',   // Pink
                          'rgba(153, 102, 255, 1)',  // Purple
                          'rgba(75, 192, 192, 1)',   // Teal
                          
                          'rgba(255, 159, 64, 1)',   // Orange
                          'rgba(199, 199, 199, 1)',  // Grey
                          'rgba(83, 102, 255, 1)',   // Indigo
                          
                          'rgba(99, 255, 132, 1)',   // Green
                          'rgba(255, 206, 84, 1)',   // Amber
                          'rgba(75, 192, 255, 1)',   // Light Blue
                          'rgba(153, 255, 102, 1)',  // Light Green
                          'rgba(255, 153, 102, 1)',  // Peach
                          'rgba(102, 153, 255, 1)'   // Lavender
                        ];
                        const total = failedContractors.slice(0, 5).reduce((sum, c) => sum + c.failedCount, 0);
                        const percentage = (contractor.failedCount / total) * 100;
                        
                        return (
                          <Box 
                            key={contractor.contractorName} 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 0.5,
                              cursor: 'pointer',
                              p: 0.5,
                              borderRadius: 1,
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                backgroundColor: 'action.hover',
                                transform: 'translateX(4px)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }
                            }}
                            onClick={() => handleContractorClick(contractor.contractorName)}
                          >
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                backgroundColor: colors[index % colors.length],
                                borderRadius: '2px'
                              }}
                            />
                            <Typography variant="caption" sx={{ flex: 1, fontSize: '0.75rem' }}>
                              {contractor.contractorName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              {contractor.failedCount} ({percentage.toFixed(0)}%)
                            </Typography>
                          </Box>
                        );
                      })}
                      
                      
                    </Box>
                    </Box>
                  </Fade>
                ) : (
                  /* Drilldown View */
                  <Fade in={!!selectedContractor} timeout={300}>
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                  {drilldownLoading ? (
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      py: 3,
                      transition: 'all 0.3s ease-in-out'
                    }}>
                      <CircularProgress 
                        size={24} 
                        sx={{
                          animation: 'pulse 1.5s ease-in-out infinite alternate'
                        }}
                      />
                    </Box>
                  ) : contractorEvaluations.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      ไม่พบข้อมูลการประเมิน
                    </Typography>
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column'
                    }}>
                      {/* Summary for selected contractor */}
                      <Box sx={{ mb: 1.5, p: 1.5, backgroundColor: 'error.50', borderRadius: 1, flexShrink: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                          จำนวนการประเมินที่ไม่ผ่าน: {contractorEvaluations.length} ครั้ง
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.85rem' }}>
                          คะแนนเฉลี่ย: {(contractorEvaluations.reduce((sum, e) => sum + e.totalScore, 0) / contractorEvaluations.length).toFixed(1)}/10
                        </Typography>
                      </Box>

                      {/* Detailed evaluation list without pagination */}
                      <Box>
                        <List dense>
                          {contractorEvaluations.map((evaluation) => (
                                <ListItem 
                                  key={evaluation.id} 
                                  sx={{ 
                                    px: 0,
                                    py: 1,
                                    transition: 'all 0.2s ease-in-out',
                                    borderRadius: 1,
                                    flexDirection: 'column',
                                    alignItems: 'stretch',
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    '&:last-child': {
                                      borderBottom: 'none'
                                    }
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                    <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                                      <EvalIcon fontSize="small" color="error" />
                                    </ListItemIcon>
                                    <Box sx={{ flex: 1 }}>
                                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.primary" sx={{ fontSize: '0.9rem' }}>
                                          {formatDate(evaluation.evaluationDate)}
                                        </Typography>
                                        <Chip label={evaluation.vehiclePlate} size="small" color="primary" variant="outlined" />
                                        <Chip 
                                          label={`รวม: ${evaluation.totalScore}/10`} 
                                          size="small" 
                                          color="error" 
                                          sx={{ fontWeight: 600 }}
                                        />
                                        
                                      </Box>
                                      
                                      {/* รายละเอียดคะแนนแต่ละหัวข้อ */}
                                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                                        <Chip 
                                          label={`ความร่วมมือ: ${evaluation.driverCooperation}/4`} 
                                          size="small" 
                                          variant="outlined"
                                          color={evaluation.driverCooperation >= 3 ? 'success' : 'warning'}
                                          sx={{ fontSize: '0.65rem', height: 24 }}
                                        />
                                        <Chip 
                                          label={`สภาพรถ: ${evaluation.vehicleCondition}/3`} 
                                          size="small" 
                                          variant="outlined"
                                          color={evaluation.vehicleCondition >= 2 ? 'success' : 'warning'}
                                          sx={{ fontSize: '0.65rem', height: 24 }}
                                        />
                                        <Chip 
                                          label={`ความเสียหาย: ${evaluation.damageScore}/3`} 
                                          size="small" 
                                          variant="outlined"
                                          color={evaluation.damageScore >= 2 ? 'success' : 'error'}
                                          sx={{ fontSize: '0.65rem', height: 24 }}
                                        />
                                      </Box>
                                      
                                      {/* ค่าความเสียหาย */}
                                      {evaluation.damageFound && evaluation.damageValue > 0 && (
                                        <Typography variant="caption" color="error.main" fontWeight="medium" sx={{ display: 'block', mb: 0.3 }}>
                                          💰 ค่าความเสียหาย: {evaluation.damageValue.toLocaleString('th-TH')} บาท
                                        </Typography>
                                      )}
                                      
                                      {/* หมายเหตุ */}
                                      {evaluation.remark && (
                                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block' }}>
                                          📝 {evaluation.remark}
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                    </Box>
                  )}
                    </Box>
                  </Fade>
                )}
              </Box>
            )}
          </Paper>
        </Box>


      </Box>
    </Layout>
  );
}

'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  LinearProgress,
  Alert,
  AlertTitle,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  CircularProgress,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Route as RouteIcon,
  Business as BusinessIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  SaveAs as SaveAsIcon,
  CloudDownload as CloudDownloadIcon,
  Speed as SpeedIcon,
  DeleteSweep as DeleteSweepIcon,
  Block as BlockIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as ManagerIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Layout from '../../components/Layout';
import DataTablePagination from '../../../components/DataTablePagination';
import { useSnackbar } from '../../../contexts/SnackbarContext';

interface CustomerOption {
  code: string;
  name: string;
  fullName: string;
  address: string;
  phone: string;
}

interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  currentDistance: number | null;
}

interface CalculationResult {
  customerCode: string;
  customerName: string;
  distance: number | null;
  durationMinutes: number | null;
  previousDistance: number | null;
  status: 'success' | 'failed';
  error?: string;
}

export default function AutoDistancePage() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { data: session } = useSession();

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<CalculationResult[]>([]);
  const [filter, setFilter] = useState<'all' | 'no-distance' | 'with-distance'>('all');
  
  // SQL Server customer options
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomerOption, setSelectedCustomerOption] = useState<CustomerOption | null>(null);

  // Bulk import states
  const [bulkImporting, setBulkImporting] = useState(false);
  const [startCode, setStartCode] = useState('');
  const [endCode, setEndCode] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // Bulk delete states
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // ดึงข้อมูลลูกค้าจาก SQL Server สำหรับ dropdown
  useEffect(() => {
    const fetchCustomerOptions = async () => {
      setCustomerLoading(true);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await fetch('/api/sqlserver-customers', {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
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

    fetchCustomerOptions();
  }, [showSnackbar]);

  // โหลดรายการลูกค้าที่มี GPS
  const fetchCustomers = async (currentFilter: string = filter) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/auto-calculate-distance?filter=${currentFilter}`);
      const data = await response.json();

      if (data.success) {
        setCustomers(data.data || []);
        
        let message = '';
        if (data.count === 0) {
          if (currentFilter === 'no-distance') {
            message = 'ไม่พบลูกค้าที่ยังไม่มีระยะทาง (ทุกรายมีระยะทางแล้ว)';
          } else if (currentFilter === 'with-distance') {
            message = 'ไม่พบลูกค้าที่มีระยะทางแล้ว';
          } else {
            message = 'ไม่พบลูกค้าที่มีพิกัด GPS';
          }
          showSnackbar(message, 'info');
        } 
      } else {
        showSnackbar('ไม่สามารถโหลดข้อมูลได้', 'error');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      showSnackbar('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [filter]);

  // จัดการเมื่อเลือกลูกค้าจาก dropdown
  const handleCustomerSelect = (customer: CustomerOption | null) => {
    setSelectedCustomerOption(customer);
    if (customer) {
      // ตรวจสอบว่ามีในรายการแล้วหรือไม่
      if (selectedCustomers.has(customer.code)) {
        showSnackbar(`${customer.name} อยู่ในรายการแล้ว`, 'info');
        setTimeout(() => setSelectedCustomerOption(null), 500);
        return;
      }
      
      // เพิ่มลูกค้าที่เลือกเข้าไปในรายการที่เลือก
      setSelectedCustomers(prev => {
        const newSet = new Set(prev);
        newSet.add(customer.code);
        return newSet;
      });
      showSnackbar(`เพิ่ม ${customer.name} เข้าในรายการคำนวณ`, 'success');
      // ล้างการเลือก
      setTimeout(() => setSelectedCustomerOption(null), 500);
    }
  };

  // ลบลูกค้าออกจากรายการที่เลือก
  const handleRemoveCustomer = (code: string) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      newSet.delete(code);
      return newSet;
    });
  };

  // ล้างรายการที่เลือกทั้งหมด
  const handleClearAll = () => {
    setSelectedCustomers(new Set());
    showSnackbar('ล้างรายการเรียบร้อย', 'info');
  };

  // ดึงข้อมูลลูกค้าที่เลือกไว้
  const getSelectedCustomersInfo = () => {
    const selectedList: Array<{code: string; name: string; address: string; phone: string}> = [];
    
    selectedCustomers.forEach(code => {
      // หาจาก customerOptions ก่อน (จาก SQL Server)
      const fromOptions = customerOptions.find(c => c.code === code);
      if (fromOptions) {
        selectedList.push({
          code: fromOptions.code,
          name: fromOptions.name,
          address: fromOptions.address,
          phone: fromOptions.phone
        });
        return;
      }
      
      // หาจาก customers (จาก MySQL)
      const fromCustomers = customers.find(c => c.customerCode === code);
      if (fromCustomers) {
        selectedList.push({
          code: fromCustomers.customerCode,
          name: fromCustomers.customerName,
          address: fromCustomers.address || '',
          phone: ''
        });
      }
    });
    
    return selectedList;
  };

  // จัดการการเลือกทั้งหมด (เฉพาะในหน้าปัจจุบัน)
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const currentPageCodes = paginatedCustomers.map(c => c.customerCode);
      const newSelected = new Set([...selectedCustomers, ...currentPageCodes]);
      setSelectedCustomers(newSelected);
    } else {
      const currentPageCodes = new Set(paginatedCustomers.map(c => c.customerCode));
      const newSelected = new Set([...selectedCustomers].filter(code => !currentPageCodes.has(code)));
      setSelectedCustomers(newSelected);
    }
  };

  // Pagination handlers
  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // จัดการการเลือกแต่ละรายการ
  const handleSelectCustomer = (code: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(code)) {
      newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    setSelectedCustomers(newSelected);
  };

  // บันทึกและคำนวณระยะทางพร้อมกัน
  const handleSaveAndCalculate = async () => {
    if (selectedCustomers.size === 0) {
      showSnackbar('กรุณาเลือกลูกค้าอย่างน้อย 1 ราย', 'warning');
      return;
    }

    setSaving(true);
    setResults([]);

    try {
      // เตรียมข้อมูลลูกค้าจาก customerOptions
      const customersToSave = getSelectedCustomersInfo().map(c => ({
        code: c.code,
        name: c.name,
        address: c.address,
        phone: c.phone,
        salesname: '' // ถ้ามีข้อมูล salesname ใน customerOptions ให้เพิ่มเข้าไป
      }));

      const response = await fetch('/api/batch-add-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customers: customersToSave,
          createdBy: session?.user?.name || session?.user?.email || 'System'
        })
      });

      const data = await response.json();

      if (data.success) {
        const summary = data.summary;
        
        let message = `ประมวลผลเสร็จสิ้น:\n`;
        message += `✅ บันทึกสำเร็จ: ${summary.success} ราย\n`;
        
        if (summary.withGps > 0) {
          message += `📍 พบพิกัด GPS: ${summary.withGps} ราย\n`;
        }
        
        if (summary.withDistance > 0) {
          message += `📏 คำนวณระยะทาง: ${summary.withDistance} ราย\n`;
        }
        
        if (summary.skipped > 0) {
          message += `⏭️ มีในระบบแล้ว: ${summary.skipped} ราย\n`;
        }
        
        if (summary.failed > 0) {
          message += `❌ ล้มเหลว: ${summary.failed} ราย`;
        }

        // แสดงรายละเอียดผลลัพธ์
        const resultsList = data.results.map((r: any) => {
          let status = '';
          if (r.status === 'success') {
            status = r.distance 
              ? `✅ ${r.code} - บันทึก + คำนวณ (${r.distance} กม.)` 
              : r.hasGps
              ? `✅ ${r.code} - บันทึก + พิกัด GPS`
              : `✅ ${r.code} - บันทึก (ไม่มีที่อยู่)`;
          } else if (r.status === 'skipped') {
            status = `⏭️ ${r.code} - ${r.message}`;
          }
          return status;
        });

        // แสดง errors ถ้ามี
        if (data.errors && data.errors.length > 0) {
          data.errors.forEach((e: any) => {
            resultsList.push(`❌ ${e.code} - ${e.error}`);
          });
        }

        showSnackbar(message, summary.failed > 0 ? 'warning' : 'success');

        // แสดงผลลัพธ์ในรูปแบบ CalculationResult
        const formattedResults: CalculationResult[] = data.results.map((r: any) => ({
          customerCode: r.code,
          customerName: r.name,
          distance: r.distance,
          durationMinutes: null,
          previousDistance: null,
          status: r.status === 'success' ? 'success' : 'failed',
          error: r.status === 'skipped' ? r.message : undefined
        }));

        setResults(formattedResults);

        // รีเฟรชข้อมูล
        await fetchCustomers();
        
        // ล้างรายการที่เลือก
        setSelectedCustomers(new Set());
      } else {
        showSnackbar(data.error || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
      }
    } catch (error) {
      console.error('Error saving customers:', error);
      showSnackbar('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Preview function
  const handlePreview = async () => {
    if (!startCode.trim() || !endCode.trim()) {
      showSnackbar('กรุณากรอกรหัสลูกค้าเริ่มต้นและสิ้นสุด', 'warning');
      return;
    }

    setPreviewing(true);
    try {
      // Create a simple API call to count customers in range
      const response = await fetch('/api/bulk-import-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startCode: startCode.trim(),
          endCode: endCode.trim(),
          previewOnly: true // Add flag for preview
        })
      });

      const data = await response.json();
      if (data.success) {
        setPreviewCount(data.summary?.total || 0);
        if (data.summary?.total === 0) {
          showSnackbar(`ไม่พบลูกค้าในช่วงรหัส ${startCode.trim()} - ${endCode.trim()}`, 'info');
        }
      }
    } catch (error) {
      console.error('Error previewing:', error);
      setPreviewCount(null);
    } finally {
      setPreviewing(false);
    }
  };

  // Bulk import function
  const handleBulkImport = async () => {
    if (!startCode.trim() || !endCode.trim()) {
      showSnackbar('กรุณากรอกรหัสลูกค้าเริ่มต้นและสิ้นสุด', 'warning');
      return;
    }

    if (startCode.trim() > endCode.trim()) {
      showSnackbar('รหัสลูกค้าเริ่มต้นต้องน้อยกว่าหรือเท่ากับรหัสสิ้นสุด', 'warning');
      return;
    }

    setBulkImporting(true);
    setResults([]);

    try {
      const response = await fetch('/api/bulk-import-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startCode: startCode.trim(),
          endCode: endCode.trim(),
          createdBy: session?.user?.name || session?.user?.email || 'System'
        })
      });

      const data = await response.json();

      if (data.success) {
        const summary = data.summary;
        
        let message = `🚀 นำเข้าเสร็จสิ้น (${startCode} - ${endCode}):\n`;
        message += `📊 พบทั้งหมด: ${summary.total} ราย\n`;
        message += `✅ บันทึกสำเร็จ: ${summary.success} ราย\n`;
        
        if (summary.withGps > 0) {
          message += `📍 ค้นหา GPS สำเร็จ: ${summary.withGps} ราย\n`;
        }
        
        if (summary.withDistance > 0) {
          message += `📏 คำนวณระยะทาง: ${summary.withDistance} ราย\n`;
        }
        
        if (summary.skipped > 0) {
          message += `⏭️ มีในระบบแล้ว: ${summary.skipped} ราย\n`;
        }
        
        if (summary.failed > 0) {
          message += `❌ ล้มเหลว: ${summary.failed} ราย`;
        }

        showSnackbar(message, summary.failed > 0 ? 'warning' : 'success');

        // แสดงผลลัพธ์
        if (data.results && data.results.length > 0) {
          const formattedResults: CalculationResult[] = data.results.map((r: any) => ({
            customerCode: r.code,
            customerName: r.name,
            distance: r.distance,
            durationMinutes: r.duration ? Math.round(r.duration / 60) : null,
            previousDistance: null,
            status: r.status === 'success' ? 'success' : 'failed',
            error: r.status === 'skipped' ? r.message : undefined
          }));

          setResults(formattedResults);
        }

        // รีเฟรชข้อมูล
        await fetchCustomers();
        
        // ล้างฟอร์ม
        setStartCode('');
        setEndCode('');
        setPreviewCount(null);
        setShowBulkImport(false);
      } else {
        showSnackbar(data.error || 'ไม่สามารถนำเข้าข้อมูลได้', 'error');
      }
    } catch (error) {
      console.error('Error bulk importing customers:', error);
      showSnackbar('เกิดข้อผิดพลาดในการนำเข้าข้อมูล', 'error');
    } finally {
      setBulkImporting(false);
    }
  };

  // คำนวณระยะทางแบบ batch (สำหรับลูกค้าที่มีในระบบแล้ว)
  const handleCalculateDistances = async () => {
    if (selectedCustomers.size === 0) {
      showSnackbar('กรุณาเลือกลูกค้าอย่างน้อย 1 ราย', 'warning');
      return;
    }

    setCalculating(true);
    setResults([]);

    try {
      const response = await fetch('/api/batch-update-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerCodes: Array.from(selectedCustomers)
        })
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results || []);
        
        // แสดงข้อความรายละเอียด
        let message = `คำนวณเสร็จสิ้น: สำเร็จ ${data.summary.successful} รายการ`;
        
        if (data.summary.failed > 0) {
          message += `, ล้มเหลว ${data.summary.failed} รายการ`;
        }
        
        if (data.warnings) {
          if (data.warnings.notFoundCodes?.length > 0) {
            message += ` | ไม่พบในระบบ: ${data.warnings.notFoundCodes.length} ราย`;
          }
          if (data.warnings.noGpsCustomers?.length > 0) {
            message += ` | ไม่มี GPS: ${data.warnings.noGpsCustomers.length} ราย`;
          }
        }
        
        showSnackbar(
          message,
          data.summary.failed > 0 || data.warnings ? 'warning' : 'success'
        );

        // รีเฟรชข้อมูล
        await fetchCustomers();
        
        // ลบเฉพาะลูกค้าที่คำนวณสำเร็จออกจากรายการที่เลือก
        if (data.summary.successful > 0) {
          const successCodes = data.results
            .filter((r: any) => r.status === 'success')
            .map((r: any) => r.customerCode);
          
          setSelectedCustomers(prev => {
            const newSet = new Set(prev);
            successCodes.forEach((code: string) => newSet.delete(code));
            return newSet;
          });
        }
      } else {
        // แสดง error พร้อมรายละเอียด
        let errorMessage = data.error || 'ไม่สามารถคำนวณระยะทางได้';
        
        if (data.details) {
          errorMessage += `\n${data.details}`;
        }
        
        if (data.notFound?.length > 0) {
          errorMessage += `\n\nไม่พบในระบบ: ${data.notFound.join(', ')}`;
        }
        
        if (data.noGps?.length > 0) {
          const noGpsList = data.noGps.map((c: any) => `${c.code} (${c.name})`).join(', ');
          errorMessage += `\n\nต้องเพิ่มพิกัด GPS ก่อน: ${noGpsList}`;
        }
        
        showSnackbar(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error calculating distances:', error);
      showSnackbar('เกิดข้อผิดพลาดในการคำนวณระยะทาง', 'error');
    } finally {
      setCalculating(false);
    }
  };

  // Bulk delete function
  const handleBulkDelete = async () => {
    if (selectedCustomers.size === 0) {
      showSnackbar('กรุณาเลือกลูกค้าอย่างน้อย 1 ราย', 'warning');
      return;
    }

    // แสดง confirmation dialog
    setShowDeleteConfirm(true);
  };

  // Confirm delete function
  const confirmBulkDelete = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    setResults([]);

    try {
      const response = await fetch('/api/delete-customers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerCodes: Array.from(selectedCustomers),
          deletedBy: session?.user?.name || session?.user?.email || 'System'
        })
      });

      const data = await response.json();

      if (data.success) {
        const summary = data.summary;
        
        let message = `🗑️ ลบลูกค้าเสร็จสิ้น:\n`;
        message += `✅ ลบสำเร็จ: ${summary.deleted} ราย\n`;
        
        if (summary.failed > 0) {
          message += `❌ ไม่สามารถลบได้: ${summary.failed} ราย`;
          if (summary.cannotDelete > 0) {
            message += ` (มีบันทึกการเดินทาง)`;
          }
        }

        showSnackbar(message, summary.failed > 0 ? 'warning' : 'success');

        // แสดงผลลัพธ์
        if (data.results && data.results.length > 0) {
          const formattedResults: CalculationResult[] = data.results.map((r: any) => ({
            customerCode: r.code,
            customerName: r.name,
            distance: null,
            durationMinutes: null,
            previousDistance: null,
            status: r.status === 'deleted' ? 'success' : 'failed',
            error: r.status !== 'deleted' ? 'ลบแล้ว' : undefined
          }));

          setResults(formattedResults);
        }

        // รีเฟรชข้อมูล
        await fetchCustomers();
        
        // ล้างรายการที่เลือก
        setSelectedCustomers(new Set());
      } else {
        showSnackbar(data.error || 'ไม่สามารถลบลูกค้าได้', 'error');
      }
    } catch (error) {
      console.error('Error deleting customers:', error);
      showSnackbar('เกิดข้อผิดพลาดในการลบลูกค้า', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ค้นหา
  const filteredCustomers = customers.filter(c =>
    c.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination calculations
  const totalCustomers = filteredCustomers.length;
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  const isAllSelected = paginatedCustomers.length > 0 &&
    paginatedCustomers.every(c => selectedCustomers.has(c.customerCode));

  // การคำนวณ isIndeterminate สำหรับ checkbox header
  const isIndeterminate = selectedCustomers.size > 0 && 
    selectedCustomers.size < filteredCustomers.length &&
    !isAllSelected;

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <AdminIcon />;
      case 'manager':
        return <ManagerIcon />;
      default:
        return <PersonIcon />;
    }
  };

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'manager':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get role label
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'ผู้ดูแลระบบ';
      case 'manager':
        return 'ผู้จัดการ';
      default:
        return 'ผู้ใช้งานทั่วไป';
    }
  };

  // Show loading while session is loading
  if (session === undefined) {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  // Check admin permission after session is loaded
  if (session && session.user?.role !== 'admin') {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '60vh',
          p: 3 
        }}>
          <Paper
            sx={{
              p: 6,
              borderRadius: 4,
              textAlign: 'center',
              maxWidth: 500,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              border: '1px solid',
              borderColor: 'grey.200',
              background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)',
            }}
          >
            {/* Icon */}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'error.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                border: '2px solid',
                borderColor: 'error.100',
              }}
            >
              <BlockIcon sx={{ fontSize: 40, color: 'error.main' }} />
            </Box>

            {/* Main Message */}
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 600,
                mb: 2,
                color: 'text.primary',
                fontSize: { xs: '1.5rem', sm: '2rem' }
              }}
            >
              ไม่มีสิทธิ์เข้าถึง
            </Typography>

            <Typography 
              variant="body1" 
              sx={{ 
                color: 'text.secondary',
                mb: 3,
                lineHeight: 1.6,
                fontSize: '1.1rem'
              }}
            >
              คุณต้องเป็นผู้ดูแลระบบเท่านั้น<br />
              จึงจะสามารถเข้าถึงหน้าคำนวณระยะทางอัตโนมัติได้
            </Typography>

            {/* Role Badge */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                สิทธิ์ปัจจุบันของคุณ
              </Typography>
              <Chip
                label={getRoleLabel(session?.user?.role || 'user')}
                color={getRoleColor(session?.user?.role || 'user') as any}
                icon={getRoleIcon(session?.user?.role || 'user')}
                sx={{ 
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  px: 1
                }}
              />
            </Box>

            {/* Back Button */}
            <Button
              variant="contained"
              onClick={() => router.push('/')}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                }
              }}
            >
              กลับสู่หน้าหลัก
            </Button>
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
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2
        }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              
              คำนวณระยะทางอัตโนมัติ
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600, lineHeight: 1.5 }}>
              ใช้ GOOGLE MAP API ในการค้นหาพิกัด GPS และคำนวณระยะทางจากที่อยู่ลูกค้า<br />
            </Typography>
            
          </Box>
        </Box>

        {/* Bulk Import Section */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#fff3e0', border: '2px solid #ff9800' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SpeedIcon color="warning" />
              <Typography variant="h6" color="warning.main" fontWeight="bold">
                🚀 นำเข้าลูกค้าจำนวนมาก
              </Typography>
            </Box>
            <Button
              variant={showBulkImport ? "outlined" : "contained"}
              color="warning"
              onClick={() => setShowBulkImport(!showBulkImport)}
              startIcon={showBulkImport ? <CloseIcon /> : <CloudDownloadIcon />}
            >
              {showBulkImport ? 'ซ่อน' : 'แสดงฟอร์ม'}
            </Button>
          </Box>

          {showBulkImport && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <AlertTitle>⚡ สำหรับลูกค้าจำนวนมาก (แนะนำสำหรับมากกว่า 50 ราย)</AlertTitle>
                <Typography variant="body2">
                  • ระบุช่วงรหัสลูกค้าจาก SQL Server เพื่อนำเข้าพร้อมกัน<br />
                  • ระบบจะค้นหา GPS และคำนวณระยะทางอัตโนมัติ<br />
                  • เร็วกว่าการเลือกทีละราย สำหรับลูกค้า {customerOptions.length.toLocaleString()} ราย
                </Typography>
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  label="รหัสลูกค้าเริ่มต้น"
                  placeholder="เช่น A001"
                  value={startCode}
                  onChange={(e) => {
                    setStartCode(e.target.value.toUpperCase());
                    setPreviewCount(null);
                  }}
                  size="small"
                  sx={{ minWidth: 150 }}
                  disabled={bulkImporting || previewing}
                />
                <Typography variant="body1" color="text.secondary">ถึง</Typography>
                <TextField
                  label="รหัสลูกค้าสิ้นสุด"
                  placeholder="เช่น A999"
                  value={endCode}
                  onChange={(e) => {
                    setEndCode(e.target.value.toUpperCase());
                    setPreviewCount(null);
                  }}
                  size="small"
                  sx={{ minWidth: 150 }}
                  disabled={bulkImporting || previewing}
                />
                <Button
                  variant="outlined"
                  color="info"
                  onClick={handlePreview}
                  disabled={bulkImporting || previewing || !startCode.trim() || !endCode.trim()}
                  startIcon={<SearchIcon />}
                >
                  {previewing ? 'กำลังตรวจสอบ...' : 'ตรวจสอบจำนวน'}
                </Button>
                {previewCount !== null && (
                  <Chip
                    label={`พบ ${previewCount.toLocaleString()} ราย`}
                    color={previewCount > 0 ? "success" : "default"}
                    size="small"
                  />
                )}
              </Box>

              {previewCount !== null && previewCount > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    📊 พบลูกค้า <strong>{previewCount.toLocaleString()}</strong> ราย ในช่วงรหัส {startCode} - {endCode}<br />
                    ⏱️ ประมาณเวลาที่ใช้: {Math.ceil(previewCount * 0.5 / 60)} นาที (ขึ้นอยู่กับการค้นหา GPS และคำนวณระยะทาง)
                  </Typography>
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  color="warning"
                  onClick={handleBulkImport}
                  disabled={bulkImporting || previewing || !startCode.trim() || !endCode.trim()}
                  startIcon={<CloudDownloadIcon />}
                  sx={{ minWidth: 200 }}
                >
                  {bulkImporting ? 'กำลังนำเข้า...' : 'เริ่มนำเข้า'}
                </Button>
                {previewCount !== null && previewCount === 0 && (
                  <Typography variant="body2" color="error" sx={{ display: 'flex', alignItems: 'center' }}>
                    ไม่พบลูกค้าในช่วงรหัสที่ระบุ
                  </Typography>
                )}
              </Box>

              {bulkImporting && (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    <Typography variant="body2" color="warning.main" fontWeight="medium">
                      กำลังนำเข้าลูกค้าจาก {startCode} ถึง {endCode}...
                    </Typography>
                  </Box>
                  <LinearProgress color="warning" />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    กรุณารอสักครู่ ระบบกำลังดึงข้อมูล ค้นหา GPS และคำนวณระยะทาง...
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>

        {/* Customer Statistics */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" color="primary">
              📊 สถิติลูกค้า
            </Typography>
            <Chip 
              label={`รวม ${customers.length} ราย`}
              color="primary" 
              size="small"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BusinessIcon color="action" />
              <Typography variant="body2">
                ทั้งหมด: <strong>{customers.length}</strong> ราย
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ErrorIcon color="warning" />
              <Typography variant="body2">
                ไม่มีระยะทาง: <strong>{customers.filter(c => !c.currentDistance).length}</strong> ราย
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="success" />
              <Typography variant="body2">
                มีระยะทางแล้ว: <strong>{customers.filter(c => c.currentDistance).length}</strong> ราย
              </Typography>
            </Box>
            {selectedCustomers.size > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                <LocationIcon color="primary" />
                <Typography variant="body2" color="primary">
                  เลือกไว้: <strong>{selectedCustomers.size}</strong> ราย
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Actions */}
        <Paper sx={{ p: 2, mb: 2 }}>
          {/* Customer Dropdown */}
          <Box sx={{ mb: 2 }}>
            <Autocomplete
              fullWidth
              options={customerOptions}
              getOptionLabel={(option) => option.fullName}
              value={selectedCustomerOption}
              onChange={(_, newValue) => handleCustomerSelect(newValue)}
              loading={customerLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="เลือกลูกค้าเพื่อเพิ่มในรายการคำนวณ"
                  placeholder="ค้นหารหัสหรือชื่อลูกค้า..."
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <BusinessIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <>
                        {customerLoading ? <CircularProgress color="inherit" size={20} /> : null}
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
                      {option.phone && (
                        <Typography variant="caption" color="primary.main">
                          📞 {option.phone}
                        </Typography>
                      )}
                      {option.address && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          📍 {option.address}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              }}
            />
          </Box>

          {/* Selected Customers List */}
          {selectedCustomers.size > 0 && (
            <Box sx={{ mb: 2, mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" color="primary">
                  รายการที่เลือก ({selectedCustomers.size} ราย)
                </Typography>
                <Button
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={handleClearAll}
                  color="error"
                  variant="text"
                >
                  ล้างทั้งหมด
                </Button>
              </Box>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto', bgcolor: '#f5f5f5' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {getSelectedCustomersInfo().map((customer, index) => (
                    <Paper
                      key={customer.code}
                      sx={{
                        p: 1.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        bgcolor: 'white',
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip
                            label={`#${index + 1}`}
                            size="small"
                            color="primary"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                          <Typography variant="body2" fontWeight="bold">
                            {customer.code}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {customer.name}
                          </Typography>
                        </Box>
                        {customer.address && (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, ml: 4 }}>
                            <LocationIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.2 }} />
                            <Typography variant="caption" color="text.secondary">
                              {customer.address}
                            </Typography>
                          </Box>
                        )}
                        {customer.phone && (
                          <Typography variant="caption" color="primary.main" sx={{ ml: 4 }}>
                            📞 {customer.phone}
                          </Typography>
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveCustomer(customer.code)}
                        color="error"
                        sx={{ ml: 1 }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  ))}
                </Box>
              </Paper>
            </Box>
          )}

          {/* Filter Toggle Buttons */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={filter}
              exclusive
              onChange={(_, newFilter) => {
                if (newFilter !== null) {
                  setFilter(newFilter);
                }
              }}
              aria-label="customer filter"
              size="small"
            >
              <ToggleButton value="all" aria-label="all customers">
                <BusinessIcon sx={{ mr: 1 }} />
                ทั้งหมด
              </ToggleButton>
              <ToggleButton value="no-distance" aria-label="no distance">
                <ErrorIcon sx={{ mr: 1 }} />
                ไม่มีระยะทาง
              </ToggleButton>
              <ToggleButton value="with-distance" aria-label="with distance">
                <CheckCircleIcon sx={{ mr: 1 }} />
                มีระยะทางแล้ว
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="ค้นหารหัส, ชื่อ, หรือที่อยู่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1, minWidth: 250 }}
            />

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => fetchCustomers(filter)}
              disabled={loading || calculating || saving}
            >
              รีเฟรช
            </Button>

            <Button
              variant="contained"
              startIcon={<SaveAsIcon />}
              onClick={handleSaveAndCalculate}
              disabled={loading || calculating || saving || selectedCustomers.size === 0}
              color="success"
            >
              บันทึก + คำนวณ ({selectedCustomers.size})
            </Button>


            <Button
              variant="contained"
              startIcon={<DeleteSweepIcon />}
              onClick={handleBulkDelete}
              disabled={loading || calculating || saving || deleting || selectedCustomers.size === 0}
              color="error"
            >
              ลบที่เลือก ({selectedCustomers.size})
            </Button>
          </Box>

          {(calculating || saving || deleting) && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography variant="body2" color="primary" fontWeight="medium">
                  {saving 
                    ? 'กำลังบันทึกและคำนวณระยะทาง...' 
                    : deleting
                    ? 'กำลังลบลูกค้า...'
                    : 'กำลังคำนวณระยะทาง...'
                  }
                </Typography>
              </Box>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {saving 
                  ? `กำลังประมวลผล ${selectedCustomers.size} รายการ กรุณารอสักครู่...` 
                  : deleting
                  ? `กำลังลบ ${selectedCustomers.size} รายการ กรุณารอสักครู่...`
                  : `กำลังคำนวณ ${selectedCustomers.size} รายการ กรุณารอสักครู่...`
                }
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Results Summary */}
        {results.length > 0 && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8f9ff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" color="primary">
                📋 ผลการประมวลผล
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip 
                  icon={<CheckCircleIcon />}
                  label={`สำเร็จ ${results.filter(r => r.status === 'success').length}`}
                  color="success" 
                  size="small" 
                  variant="outlined"
                />
                {results.filter(r => r.status === 'failed').length > 0 && (
                  <Chip 
                    icon={<ErrorIcon />}
                    label={`ล้มเหลว ${results.filter(r => r.status === 'failed').length}`}
                    color="error" 
                    size="small" 
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {results.map((result, index) => (
                <Box key={index} sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  p: 1, 
                  mb: 0.5,
                  bgcolor: result.status === 'success' ? '#e8f5e8' : '#fff3e0',
                  borderRadius: 1,
                  border: 1,
                  borderColor: result.status === 'success' ? '#c8e6c9' : '#ffcc02'
                }}>
                  {result.status === 'success' ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <ErrorIcon color="error" fontSize="small" />
                  )}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {result.customerCode} - {result.customerName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {result.status === 'success'
                        ? result.distance 
                          ? `✅ คำนวณระยะทางแล้ว: ${result.distance} กม.${result.durationMinutes ? ` (${result.durationMinutes} นาที)` : ''}`
                          : '✅ บันทึกลูกค้าแล้ว (รอคำนวณระยะทาง)'
                        : `❌ ${result.error}`
                      }
                    </Typography>
                  </Box>
                  {result.status === 'success' && result.distance && (
                    <Chip 
                      label={`${result.distance} กม.`}
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  )}
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        {/* Customer List */}
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onChange={handleSelectAll}
                    disabled={loading || calculating || paginatedCustomers.length === 0}
                  />
                </TableCell>
                <TableCell>รหัสลูกค้า</TableCell>
                <TableCell>ชื่อลูกค้า</TableCell>
                <TableCell>ที่อยู่</TableCell>
                <TableCell align="center">พิกัด GPS</TableCell>
                <TableCell align="right">ระยะทางปัจจุบัน</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <CircularProgress size={50} />
                      <Typography variant="h6" color="text.secondary">
                        กำลังโหลดข้อมูลลูกค้า...
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        กรุณารอสักครู่
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      {searchTerm ? (
                        <>
                          <SearchIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                          <Typography variant="h6" color="text.secondary">
                            ไม่พบข้อมูลที่ค้นหา
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ลองค้นหาด้วยคำอื่น หรือ <Button size="small" onClick={() => setSearchTerm('')}>ล้างการค้นหา</Button>
                          </Typography>
                        </>
                      ) : (
                        <>
                          <BusinessIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                          <Typography variant="h6" color="text.secondary">
                            {filter === 'no-distance' 
                              ? 'ไม่มีลูกค้าที่ยังไม่มีระยะทาง' 
                              : filter === 'with-distance'
                              ? 'ไม่มีลูกค้าที่มีระยะทางแล้ว'
                              : 'ไม่มีลูกค้าที่มีพิกัด GPS'
                            }
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {filter === 'no-distance' 
                              ? 'ทุกรายมีระยะทางแล้ว หรือเลือกดูข้อมูลทั้งหมด' 
                              : filter === 'with-distance'
                              ? 'ยังไม่มีข้อมูลลูกค้าที่คำนวณระยะทางแล้ว'
                              : 'เพิ่มลูกค้าใหม่จาก dropdown ด้านบน'
                            }
                          </Typography>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    hover
                    onClick={() => handleSelectCustomer(customer.customerCode)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: selectedCustomers.has(customer.customerCode) ? 'primary.light' : 'action.hover'
                      },
                      ...(selectedCustomers.has(customer.customerCode) && {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '& .MuiTableCell-root': {
                          color: 'primary.contrastText'
                        }
                      })
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedCustomers.has(customer.customerCode)}
                        disabled={loading || calculating}
                        sx={{
                          ...(selectedCustomers.has(customer.customerCode) && {
                            color: 'primary.contrastText',
                            '&.Mui-checked': {
                              color: 'primary.contrastText'
                            }
                          })
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {customer.customerCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{customer.customerName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {customer.address || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={`Lat: ${customer.lat}, Lng: ${customer.lng}`}>
                        <Chip
                          icon={<LocationIcon />}
                          label="มี GPS"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      {customer.currentDistance ? (
                        <Chip
                          label={`${customer.currentDistance} กม.`}
                          size="small"
                          color="primary"
                          variant="filled"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          ยังไม่มีข้อมูล
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {!loading && totalCustomers > 0 && (
          <DataTablePagination
            component="div"
            count={totalCustomers}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[10, 20, 50, 100]}
            labelRowsPerPage="รายการต่อหน้า:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
            }
          />
        )}

        {/* Info */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>ข้อมูลการใช้งาน</AlertTitle>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            🆕 ฟีเจอร์บันทึกและคำนวณอัตโนมัติ:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20, marginBottom: 12 }}>
            <li><strong>นำเข้าจำนวนมาก</strong>: ระบุช่วงรหัสลูกค้า (เช่น A001-A999) เพื่อนำเข้าพร้อมกันจาก SQL Server (เร็วกว่าสำหรับลูกค้าจำนวนมาก)</li>
            <li><strong>บันทึก + คำนวณ</strong>: บันทึกลูกค้าจาก SQL Server ลงฐานข้อมูล MySQL พร้อมค้นหาพิกัด GPS และคำนวณระยะทางอัตโนมัติทีละหลายรายพร้อมกัน</li>
            <li><strong>คำนวณอย่างเดียว</strong>: คำนวณระยะทางเฉพาะลูกค้าที่มีในระบบและมีพิกัด GPS อยู่แล้ว</li>
            <li><strong>ลบที่เลือก</strong>: ลบลูกค้าทีละหลายรายพร้อมกัน (เฉพาะลูกค้าที่ไม่มีบันทึกการเดินทาง)</li>
          </ul>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            📋 วิธีใช้งาน:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li><strong>สำหรับลูกค้าจำนวนมาก (แนะนำ {'>'}50 ราย)</strong>: ใช้ฟีเจอร์ "นำเข้าจำนวนมาก" ระบุช่วงรหัสลูกค้า</li>
            <li><strong>สำหรับลูกค้าน้อยราย</strong>: เลือกลูกค้าจาก dropdown ด้านบน (ดึงข้อมูลจาก SQL Server) เพื่อเพิ่มเข้ารายการ</li>
            <li>สามารถเลือกได้หลายรายพร้อมกัน (แสดงในรายการที่เลือก)</li>
            <li>กดปุ่ม <strong>"บันทึก + คำนวณ"</strong> เพื่อบันทึกลูกค้าใหม่และคำนวณระยะทางพร้อมกัน</li>
            <li>ระบบจะค้นหาพิกัด GPS จากที่อยู่อัตโนมัติ (ถ้ามี)</li>
            <li>ระบบจะคำนวณระยะทางจริงโดยใช้เส้นทางขับรถจาก Google Maps</li>
            <li>สามารถเลือกคำนวณทีละหลายรายได้ (Google Maps รองรับสูงสุด 25 รายต่อครั้ง)</li>
            <li>การใช้งาน Google Maps API จะถูกติดตามและแจ้งเตือนเมื่อใกล้เกินโควต้า</li>
          </ul>
        </Alert>

        {/* Floating Quick Stats */}
        {selectedCustomers.size > 0 && (
          <Paper 
            sx={{ 
              position: 'fixed', 
              bottom: 20, 
              right: 20, 
              p: 2, 
              minWidth: 200,
              boxShadow: 3,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              zIndex: 1000
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              📊 รายการที่เลือก
            </Typography>
            <Typography variant="body2">
              ✅ เลือกไว้: <strong>{selectedCustomers.size}</strong> ราย
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                sx={{ 
                  color: 'primary.contrastText', 
                  borderColor: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    borderColor: 'primary.contrastText'
                  }
                }}
                onClick={handleClearAll}
              >
                ล้าง
              </Button>
            </Box>
          </Paper>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          aria-labelledby="delete-confirm-dialog-title"
          aria-describedby="delete-confirm-dialog-description"
        >
          <DialogTitle id="delete-confirm-dialog-title">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DeleteSweepIcon color="error" />
              ยืนยันการลบลูกค้า
            </Box>
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-confirm-dialog-description">
              คุณต้องการลบลูกค้า <strong>{selectedCustomers.size}</strong> ราย ใช่หรือไม่?
            </DialogContentText>
            
            {/* แสดงรายชื่อลูกค้าที่เลือก */}
            {selectedCustomers.size <= 10 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  รายการที่จะลบ:
                </Typography>
                {getSelectedCustomersInfo().map((customer, index) => (
                  <Typography key={customer.code} variant="body2" sx={{ ml: 1 }}>
                    {index + 1}. {customer.code} - {customer.name}
                  </Typography>
                ))}
              </Box>
            )}
            
            <Alert severity="warning" sx={{ mt: 2 }}>
              <AlertTitle>⚠️ คำเตือน</AlertTitle>
              <Typography variant="body2">
                • ลูกค้าที่มีบันทึกการเดินทางจะไม่สามารถลบได้<br />
                • การลบข้อมูลไม่สามารถย้อนกลับได้<br />
                • กรุณาตรวจสอบข้อมูลให้แน่ใจก่อนยืนยัน
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setShowDeleteConfirm(false)}
              color="inherit"
              variant="outlined"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={confirmBulkDelete}
              color="error"
              variant="contained"
              startIcon={<DeleteSweepIcon />}
            >
              ยืนยันการลบ ({selectedCustomers.size} ราย)
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}

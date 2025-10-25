'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  Skeleton,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  CardActions,
  Divider,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Clear as ClearIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import DataTablePagination from '../../components/DataTablePagination';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useRouter } from 'next/navigation';

export interface Customer {
  id: number;
  cmCode: string;
  cmName: string;
  cmAddress?: string | null;
  cmPhone?: string | null;
  cmSalesname?: string | null;
  cmMileage?: any;
  cmRemark?: string | null;
  lat?: any;
  long?: any;
  isActive: boolean;
  hasReferences: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function CustomersPage() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('true'); // '' for all, 'true' for active, 'false' for inactive
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    customer: Customer | null;
  }>({
    open: false,
    customer: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toggle status
  const [togglingStatus, setTogglingStatus] = useState<number | null>(null);

  // Customer detail dialog
  const [detailDialog, setDetailDialog] = useState<{
    open: boolean;
    customer: Customer | null;
  }>({
    open: false,
    customer: null,
  });

  // Fetch customers
  const fetchCustomers = async (
    page = pagination.page,
    limit = pagination.limit,
    search = searchTerm,
    status = statusFilter
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: search || '',
      });

      if (status !== '') {
        params.append('isActive', status);
      }

      const response = await fetch(`/api/customers?${params}`);
      const result = await response.json();

      if (result.success) {
        setCustomers(result.data || []);
        setPagination(result.pagination);
      } else {
        throw new Error(result.error || 'ไม่สามารถดึงข้อมูลลูกค้าได้');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      showSnackbar(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchCustomers(1, pagination.limit, searchTerm, statusFilter);
  }, []);

  // Search effect
  useEffect(() => {
    if (searchTerm.trim()) {
      const timeoutId = setTimeout(() => {
        fetchCustomers(1, pagination.limit, searchTerm, statusFilter);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      fetchCustomers(1, pagination.limit, searchTerm, statusFilter);
    }
  }, [searchTerm, pagination.limit, statusFilter]);

  // Handle pagination
  const handlePageChange = (event: unknown, newPage: number) => {
    fetchCustomers(newPage + 1, pagination.limit, searchTerm, statusFilter);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    setPagination(prev => ({ ...prev, limit: newLimit }));
    fetchCustomers(1, newLimit, searchTerm, statusFilter);
  };

  // Handle delete
  const handleDelete = (customer: Customer) => {
    if (customer.hasReferences) {
      showSnackbar('ไม่สามารถลบลูกค้าที่มีการใช้งานแล้ว', 'warning');
      return;
    }
    setDeleteDialog({ open: true, customer });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.customer || deleteLoading) return;
    setDeleteLoading(true);

    try {
      const response = await fetch(`/api/customers/${deleteDialog.customer.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        showSnackbar('ลบข้อมูลลูกค้าสำเร็จ', 'success');
        fetchCustomers(pagination.page, pagination.limit, searchTerm, statusFilter);
      } else {
        throw new Error(result.error || 'ไม่สามารถลบข้อมูลลูกค้าได้');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showSnackbar(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    } finally {
      setDeleteLoading(false);
      setDeleteDialog({ open: false, customer: null });
    }
  };

  // Toggle active status
  const handleToggleActive = async (customer: Customer) => {
    if (togglingStatus === customer.id) return;
    
    setTogglingStatus(customer.id);
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-status' })
      });

      const result = await response.json();
      if (result.success) {
        showSnackbar(`${!customer.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}ลูกค้าสำเร็จ`, 'success');
        fetchCustomers(pagination.page, pagination.limit, searchTerm, statusFilter);
      } else {
        throw new Error(result.error || 'ไม่สามารถอัปเดตสถานะได้');
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      showSnackbar(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'error');
    } finally {
      setTogglingStatus(null);
    }
  };

  // Handle status filter change
  const handleStatusFilterChange = (event: SelectChangeEvent<string>) => {
    setStatusFilter(event.target.value);
  };

  // Handle view customer details
  const handleViewDetails = (customer: Customer) => {
    setDetailDialog({ open: true, customer });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
  };

  return (
    <Layout showSidebar={false}>
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
          <Typography 
            variant={isMobile ? 'h5' : 'h5'} 
            sx={{ fontWeight: 600 }}
          >
            จัดการข้อมูลลูกค้า
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, width: { xs: 'auto', sm: 'auto' } }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/customers/add')}
              fullWidth={isMobile}
              sx={{
                background: `linear-gradient(135deg, #2196f3 0%, #1976d2 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, #1976d2 0%, #1565c0 100%)`,
                },
              }}
            >
              เพิ่มลูกค้าใหม่
            </Button>
          </Box>
        </Box>
        {/* Search */}
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
              placeholder="ค้นหาลูกค้า"
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
                onChange={handleStatusFilterChange}
                
              >
                
                <MenuItem value="true">ใช้งาน</MenuItem>
                <MenuItem value="false">ยกเลิกการใช้งาน</MenuItem>
                <MenuItem value="">ทั้งหมด</MenuItem>
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
              ล้างทั้งหมด
            </Button>
            
          </Box>
        </Paper>

        {/* Data Display */}
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: theme.shadows[2] }}>
          {/* Desktop Table */}
          {!isMobile ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>รหัสลูกค้า</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>ชื่อลูกค้า</TableCell>                   
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>ระยะทาง</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>สถานะ</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 140, textAlign: 'center' }}>จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 7 }).map((_, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <Skeleton variant="text" width="100%" height={32} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="h6" color="text.secondary">
                          ไม่พบข้อมูลลูกค้า
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => (
                      <TableRow key={customer.id} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                        <TableCell sx={{ fontWeight: 500 }}>{customer.cmCode}</TableCell>
                        <TableCell>{customer.cmName}</TableCell>
                        
                        <TableCell>
                          {customer.cmMileage ? `${parseFloat(customer.cmMileage.toString()).toFixed(2)} กม.` : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={customer.isActive ? <ActiveIcon /> : <InactiveIcon />}
                            label={customer.isActive ? 'ใช้งาน' : 'ยกเลิกการใช้งาน'}
                            color={customer.isActive ? 'success' : 'default'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="ดูรายละเอียด">
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetails(customer)}
                                sx={{ color: 'info.main' }}
                              >
                                <VisibilityIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="แก้ไข">
                              <IconButton
                                size="small"
                                onClick={() => router.push(`/customers/edit/${customer.id}`)}
                                sx={{ color: 'primary.main' }}
                              >
                                <EditIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={customer.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleActive(customer)}
                                sx={{ color: customer.isActive ? 'warning.main' : 'success.main' }}
                                disabled={togglingStatus === customer.id}
                              >
                                {togglingStatus === customer.id ? (
                                  <CircularProgress size={16} />
                                ) : customer.isActive ? (
                                  <ToggleOffIcon sx={{ fontSize: 18 }} />
                                ) : (
                                  <ToggleOnIcon sx={{ fontSize: 18 }} />
                                )}
                              </IconButton>
                            </Tooltip>
                            {!customer.hasReferences && (
                              <Tooltip title="ลบ">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(customer)}
                                  sx={{ color: 'error.main' }}
                                >
                                  <DeleteIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            /* Mobile Cards */
            <Box sx={{ p: 2 }}>
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} sx={{ mb: 2 }}>
                    <CardContent>
                      <Skeleton variant="text" width="60%" height={24} />
                      <Skeleton variant="text" width="40%" height={20} />
                      <Skeleton variant="text" width="80%" height={20} />
                    </CardContent>
                  </Card>
                ))
              ) : customers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary">
                    ไม่พบข้อมูลลูกค้า
                  </Typography>
                </Box>
              ) : (
                customers.map((customer) => (
                  <Card key={customer.id} sx={{ mb: 2, borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {customer.cmName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            รหัส: {customer.cmCode}
                          </Typography>
                          {customer.cmPhone && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              โทร: {customer.cmPhone}
                            </Typography>
                          )}
                          {customer.cmSalesname && (
                            <Typography variant="body2" color="text.secondary">
                              เซลส์: {customer.cmSalesname}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          icon={customer.isActive ? <ActiveIcon /> : <InactiveIcon />}
                          label={customer.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                          color={customer.isActive ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      {customer.cmMileage && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          ระยะทาง: {parseFloat(customer.cmMileage.toString()).toFixed(2)} กม.
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(customer)}
                        sx={{ color: 'info.main' }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => router.push(`/customers/edit/${customer.id}`)}
                        sx={{ color: 'primary.main' }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleActive(customer)}
                        sx={{ color: customer.isActive ? 'warning.main' : 'success.main' }}
                        disabled={togglingStatus === customer.id}
                      >
                        {togglingStatus === customer.id ? (
                          <CircularProgress size={16} />
                        ) : customer.isActive ? (
                          <ToggleOffIcon />
                        ) : (
                          <ToggleOnIcon />
                        )}
                      </IconButton>
                      {!customer.hasReferences && (
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(customer)}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </CardActions>
                  </Card>
                ))
              )}
            </Box>
          )}

          {/* Pagination */}
          {!loading && customers.length > 0 && (
            <DataTablePagination
              component="div"
              count={pagination.total}
              page={pagination.page - 1}
              onPageChange={handlePageChange}
              rowsPerPage={pagination.limit}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[20, 50, 100, 200]}
              labelRowsPerPage="รายการต่อหน้า:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
              }
            />
          )}
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, customer: null })}>
          <DialogTitle>ยืนยันการลบ</DialogTitle>
          <DialogContent>
            <Typography>
              คุณแน่ใจหรือไม่ที่จะลบลูกค้า "{deleteDialog.customer?.cmName}" ?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialog({ open: false, customer: null })}
              disabled={deleteLoading}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={confirmDelete}
              color="error"
              variant="contained"
              disabled={deleteLoading}
            >
              {deleteLoading ? <CircularProgress size={20} /> : 'ลบ'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Customer Detail Dialog */}
        <Dialog 
          open={detailDialog.open} 
          onClose={() => setDetailDialog({ open: false, customer: null })}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PersonIcon color="primary" />
              <Typography variant="h6">
                รายละเอียดลูกค้า
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {detailDialog.customer && (
              <Box sx={{ pt: 1 }}>
                <Stack spacing={3}>
                  {/* Basic Information */}
                  <Paper sx={{ p: 3, borderRadius: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                      ข้อมูลพื้นฐาน
                    </Typography>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">รหัสลูกค้า</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {detailDialog.customer.cmCode}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">ชื่อลูกค้า</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {detailDialog.customer.cmName}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {(detailDialog.customer.cmAddress || detailDialog.customer.cmPhone) && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">ที่อยู่</Typography>
                            <Typography variant="body1">
                              {detailDialog.customer.cmAddress || '-'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2" color="text.secondary">เบอร์โทร</Typography>
                            <Typography variant="body1">
                              {detailDialog.customer.cmPhone || '-'}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">ระยะทาง</Typography>
                          <Typography variant="body1">
                            {detailDialog.customer.cmMileage ? `${parseFloat(detailDialog.customer.cmMileage.toString()).toFixed(2)} กม.` : '-'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">สถานะ</Typography>
                          <Chip
                            icon={detailDialog.customer.isActive ? <ActiveIcon /> : <InactiveIcon />}
                            label={detailDialog.customer.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                            color={detailDialog.customer.isActive ? 'success' : 'default'}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                      
                      
                        <Box>
                          <Typography variant="body2" color="text.secondary">หมายเหตุ</Typography>
                          <Typography variant="body1">
                            {detailDialog.customer.cmRemark ? detailDialog.customer.cmRemark : '-'}
                          </Typography>
                        </Box>
                      
                    </Stack>
                  </Paper>
                  {(detailDialog.customer.lat || detailDialog.customer.long) && (
                    <Paper sx={{ p: 3, borderRadius: 2 }}>
                      <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                        <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        ข้อมูลตำแหน่ง
                      </Typography>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">ละติจูด</Typography>
                            <Typography variant="body1">
                              {detailDialog.customer.lat ? parseFloat(detailDialog.customer.lat.toString()).toFixed(6) : '-'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2" color="text.secondary">ลองจิจูด</Typography>
                            <Typography variant="body1">
                              {detailDialog.customer.long ? parseFloat(detailDialog.customer.long.toString()).toFixed(6) : '-'}
                            </Typography>
                          </Box>
                        </Box>
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button 
              variant="outlined"
              onClick={() => setDetailDialog({ open: false, customer: null })}
            >
              ปิด
            </Button>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => {
                if (detailDialog.customer) {
                  router.push(`/customers/edit/${detailDialog.customer.id}`);
                }
              }}
            >
              แก้ไข
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}



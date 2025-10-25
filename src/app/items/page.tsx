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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Skeleton,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  CardActions,
  Divider,
  Stack,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  Category as CategoryIcon,
  Clear as ClearIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import Layout from '../components/Layout';
import DataTablePagination from '../../components/DataTablePagination';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface Item {
  id: number;
  ptPart: string;
  ptDesc1: string;
  ptDesc2: string | null;
  ptUm: string;
  ptPrice: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  _count?: {
    tripItems: number;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function ItemsPage() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('true'); // 'true' for active, 'false' for inactive, '' for all
  const [activeFilters, setActiveFilters] = useState<Array<{id: string, label: string, value: string}>>([]);
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
    item: Item | null;
  }>({
    open: false,
    item: null,
  });
  const [deleting, setDeleting] = useState(false);

  // Toggle status loading
  const [togglingStatus, setTogglingStatus] = useState<number | null>(null);

  // Remove menu functionality - use direct edit/delete buttons
  
  // Ref to track if fetch is in progress
  const fetchingRef = useRef(false);

  // Fetch items (Optimized with timeout and error handling)
  const fetchItems = async (
    page = pagination.page,
    limit = pagination.limit,
    search = searchTerm,
    status = statusFilter
  ) => {
    // Prevent multiple simultaneous fetches
    if (fetchingRef.current) return;
    
    try {
      fetchingRef.current = true;
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });

      // Add status filter
      if (status !== '') {
        params.append('isActive', status);
      }

      // Optimized fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`/api/items?${params}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setItems(result.data);
        setPagination(result.pagination);
      } else {
        showSnackbar(result.error || 'ไม่สามารถดึงข้อมูลพัสดุได้', 'error');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        showSnackbar('การเชื่อมต่อหมดเวลา กรุณาลองใหม่', 'error');
      } else {
        showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Update active filters
  const updateActiveFilters = () => {
    const filters: Array<{id: string, label: string, value: string}> = [];
    
    if (searchTerm) {
      filters.push({
        id: 'search',
        label: `ค้นหา: "${searchTerm}"`,
        value: searchTerm
      });
    }

    setActiveFilters(filters);
  };

  // Clear filter
  const clearFilter = (filterId: string) => {
    if (filterId === 'search') {
      setSearchTerm('');
    } else if (filterId === 'status') {
      setStatusFilter('');
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('true'); // รีเซ็ตกลับไป default (ใช้งาน) แทนที่จะเป็น ''
  };

  // Handle status filter change
  const handleStatusFilterChange = (event: SelectChangeEvent<string>) => {
    setStatusFilter(event.target.value);
  };

  // Load data on mount
  useEffect(() => {
    fetchItems();
  }, []);

  // Update active filters when search or status changes
  useEffect(() => {
    updateActiveFilters();
  }, [searchTerm, statusFilter]);

  // Handle search and status changes with debounce for search
  useEffect(() => {
    if (searchTerm) {
      // Debounce search
      const delayedFetch = setTimeout(() => {
        fetchItems(1, pagination.limit, searchTerm, statusFilter);
      }, 500);
      return () => clearTimeout(delayedFetch);
    } else {
      // No debounce for status changes or clearing search
      fetchItems(1, pagination.limit, searchTerm, statusFilter);
    }
  }, [searchTerm, statusFilter, pagination.limit]);

  // Handle search form submit (now just focuses next input)
  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    // Do nothing - search happens automatically via useEffect
  };

  // Handle pagination
  const handlePageChange = (event: unknown, newPage: number) => {
    fetchItems(newPage + 1, pagination.limit, searchTerm, statusFilter);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    fetchItems(1, newLimit, searchTerm, statusFilter);
  };

  // Handle toggle status
  const handleToggleStatus = async (item: Item) => {
    try {
      setTogglingStatus(item.id);
      const response = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle-status',
          updatedBy: 'admin', // TODO: Get from auth context
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar(result.message, 'success');
        fetchItems(pagination.page, pagination.limit, searchTerm, statusFilter); // Reload data
      } else {
        showSnackbar(result.error || 'ไม่สามารถเปลี่ยนสถานะได้', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', 'error');
    } finally {
      setTogglingStatus(null);
    }
  };

  // Handle delete
  const handleDeleteClick = (item: Item) => {
    setDeleteDialog({ open: true, item });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.item) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/items/${deleteDialog.item.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar('ลบข้อมูลพัสดุสำเร็จ', 'success');
        fetchItems(pagination.page, pagination.limit, searchTerm, statusFilter); // Reload data
        setDeleteDialog({ open: false, item: null });
      } else {
        showSnackbar(result.error || 'ไม่สามารถลบข้อมูลพัสดุได้', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Handle edit
  const handleEdit = (item: Item) => {
    router.push(`/items/edit/${item.id}`);
  };

  // Format currency
  const formatPrice = (price: number | null) => {
    if (price === null) return '-';
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(price);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ItemCard component for mobile view
  const ItemCard = ({ item }: { item: Item }) => (
    <Card
      sx={{
        mb: 2,
        opacity: item.isActive ? 1 : 0.6,
        backgroundColor: item.isActive ? 'transparent' : 'grey.50',
        borderRadius: 2,
        boxShadow: 1,
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* Header with Part Number and Status */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            {item.ptPart}
          </Typography>
          <Chip
            icon={item.isActive ? <ActiveIcon /> : <InactiveIcon />}
            label={item.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
            color={item.isActive ? 'success' : 'default'}
            size="small"
            sx={{ fontWeight: 500 }}
          />
        </Box>

        {/* Description */}
        <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
          {item.ptDesc1}
        </Typography>
        
        {item.ptDesc2 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {item.ptDesc2}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Details */}
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              หน่วยนับ:
            </Typography>
            <Chip 
              label={item.ptUm} 
              size="small" 
              color="info"
              icon={<CategoryIcon />}
              sx={{ fontSize: '0.75rem' }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              ราคา:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 600,
                color: item.ptPrice ? 'success.main' : 'text.secondary'
              }}
            >
              {formatPrice(item.ptPrice)}
            </Typography>
          </Box>
        </Stack>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="แก้ไข">
            <IconButton
              size="small"
              onClick={() => handleEdit(item)}
              sx={{
                color: 'primary.main',
                '&:hover': { bgcolor: 'primary.50' },
              }}
            >
              <EditIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title={item.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
            <IconButton
              size="small"
              disabled={togglingStatus === item.id}
              onClick={() => handleToggleStatus(item)}
              sx={{
                color: item.isActive ? 'warning.main' : 'success.main',
                '&:hover': {
                  bgcolor: item.isActive ? 'warning.50' : 'success.50',
                },
              }}
            >
              {togglingStatus === item.id ? (
                <CircularProgress size={20} color="inherit" />
              ) : item.isActive ? (
                <ToggleOffIcon sx={{ fontSize: 20 }} />
              ) : (
                <ToggleOnIcon sx={{ fontSize: 20 }} />
              )}
            </IconButton>
          </Tooltip>

          {/* แสดงปุ่มลบเฉพาะเมื่อ item ไม่เคยถูกใช้งาน */}
          {(!item._count?.tripItems || item._count.tripItems === 0) && (
            <Tooltip title="ลบ">
              <IconButton
                size="small"
                onClick={() => handleDeleteClick(item)}
                sx={{
                  color: 'error.main',
                  '&:hover': { bgcolor: 'error.50' },
                }}
              >
                <DeleteIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Typography variant="caption" color="text.secondary">
          สร้าง: {formatDate(item.createdAt)}
        </Typography>
      </CardActions>
    </Card>
  );

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
              
              จัดการข้อมูลพัสดุ
            </Typography>
            
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              href="/items/add"
              sx={{ borderRadius: 2 }}
            >
              เพิ่มพัสดุใหม่
            </Button>
          </Box>
        </Box>

        {/* Search and Filter */}
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
              placeholder="ค้นหาด้วยรหัส, ชื่อ, หรือหน่วยนับ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchTerm('')}
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" >
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

        {/* Content - Table for Desktop, Cards for Mobile */}
        {isMobile ? (
          /* Mobile Card View */
          <Box>
            {loading ? (
              // Skeleton loading cards
              Array.from({ length: 5 }).map((_, index) => (
                <Card key={`skeleton-card-${index}`} sx={{ mb: 2, borderRadius: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Skeleton width={100} height={24} />
                      <Skeleton width={80} height={24} />
                    </Box>
                    <Skeleton width="100%" height={20} sx={{ mb: 1 }} />
                    <Skeleton width="70%" height={16} sx={{ mb: 2 }} />
                    <Skeleton width="100%" height={1} sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Skeleton width={60} height={20} />
                      <Skeleton width={40} height={20} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Skeleton width={40} height={20} />
                      <Skeleton width={60} height={20} />
                    </Box>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Skeleton variant="circular" width={32} height={32} />
                      <Skeleton variant="circular" width={32} height={32} />
                      <Skeleton variant="circular" width={32} height={32} />
                    </Box>
                  </CardActions>
                </Card>
              ))
            ) : items.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <InventoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  {searchTerm ? 'ไม่พบข้อมูลพัสดุที่ค้นหา' : 'ยังไม่มีข้อมูลพัสดุ'}
                </Typography>
                {!searchTerm && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    href="/items/add"
                    sx={{ mt: 2 }}
                  >
                    เพิ่มพัสดุใหม่
                  </Button>
                )}
              </Paper>
            ) : (
              items.map((item) => <ItemCard key={item.id} item={item} />)
            )}
          </Box>
        ) : (
          /* Desktop Table View */
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>รหัสพัสดุ</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>คำอธิบายหลัก</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>คำอธิบายรอง</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>หน่วยนับ</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>ราคา</TableCell>
                    <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>สถานะ</TableCell>
                    <TableCell sx={{ fontWeight: 600, textAlign: 'left' }}>จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                {loading ? (
                  // Skeleton loading rows
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <Skeleton width={100} height={20} />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Skeleton width={150} height={20} />
                          <Skeleton width={120} height={16} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Skeleton width={40} height={20} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={60} height={20} />
                      </TableCell>
                      <TableCell align="right">
                        <Skeleton width={80} height={20} />
                      </TableCell>
                      <TableCell align="center">
                        <Skeleton variant="circular" width={32} height={32} />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Skeleton variant="circular" width={32} height={32} />
                          <Skeleton variant="circular" width={32} height={32} />
                          <Skeleton variant="circular" width={32} height={32} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                      <InventoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                      <Typography variant="body1" color="text.secondary">
                        {searchTerm ? 'ไม่พบข้อมูลพัสดุที่ค้นหา' : 'ยังไม่มีข้อมูลพัสดุ'}
                      </Typography>
                      {!searchTerm && (
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          href="/items/add"
                          sx={{ mt: 2 }}
                        >
                          เพิ่มพัสดุใหม่
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow 
                      key={item.id} 
                      hover
                      sx={{
                        opacity: item.isActive ? 1 : 0.6,
                        backgroundColor: item.isActive ? 'transparent' : 'grey.50'
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {item.ptPart}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.ptDesc1}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.ptDesc2 || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={item.ptUm} 
                          size="small" 
                          color="info"
                          icon={<CategoryIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 600,
                            color: item.ptPrice ? 'success.main' : 'text.secondary'
                          }}
                        >
                          {formatPrice(item.ptPrice)}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ textAlign: 'center' }}>
                        <Tooltip title={item.isActive ? 'พัสดุเปิดใช้งาน' : 'พัสดุยกเลิกใช้งาน'}>
                          <Chip
                            icon={item.isActive ? <ActiveIcon /> : <InactiveIcon />}
                            label={item.isActive ? 'ใช้งาน' : 'ยกเลิกการใช้งาน'}
                            color={item.isActive ? 'success' : 'default'}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 500,
                            }}
                          />
                        </Tooltip>
                      </TableCell>
                      
                      <TableCell sx={{ textAlign: 'left' }}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'left' }}>
                          <Tooltip title="แก้ไข">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(item)}
                              sx={{
                                color: 'primary.main',
                                '&:hover': {
                                  bgcolor: 'primary.50',
                                },
                              }}
                            >
                              <EditIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title={item.isActive ? 'ยกเลิกการใช้งาน' : 'เปิดใช้งาน'}>
                            <IconButton
                              size="small"
                              disabled={togglingStatus === item.id}
                              onClick={() => handleToggleStatus(item)}
                              sx={{
                                color: item.isActive ? 'warning.main' : 'success.main',
                                '&:hover': {
                                  bgcolor: item.isActive ? 'warning.50' : 'success.50',
                                },
                              }}
                            >
                              {togglingStatus === item.id ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : item.isActive ? (
                                <ToggleOffIcon sx={{ fontSize: 18 }} />
                              ) : (
                                <ToggleOnIcon sx={{ fontSize: 18 }} />
                              )}
                            </IconButton>
                          </Tooltip>

                          {/* แสดงปุ่มลบเฉพาะเมื่อ item ไม่เคยถูกใช้งาน */}
                          {(!item._count?.tripItems || item._count.tripItems === 0) && (
                            <Tooltip title="ลบ">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick(item)}
                                sx={{
                                  color: 'error.main',
                                  '&:hover': {
                                    bgcolor: 'error.50',
                                  },
                                }}
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

          {/* Pagination */}
          {!loading && items.length > 0 && (
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
        )}

        {/* Pagination for Mobile */}
        {isMobile && !loading && items.length > 0 && (
          <Paper sx={{ borderRadius: 3, mt: 2, overflow: 'hidden' }}>
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
          </Paper>
        )}

        {/* Removed Action Menu - using direct edit/delete buttons */}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => !deleting && setDeleteDialog({ open: false, item: null })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DeleteIcon color="error" />
              ยืนยันการลบข้อมูล
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              คุณต้องการลบข้อมูลพัสดุต่อไปนี้หรือไม่?
            </Typography>
            {deleteDialog.item && (
              <Box sx={{ 
                p: 2, 
                backgroundColor: 'grey.50', 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  รหัส: {deleteDialog.item.ptPart}
                </Typography>
                <Typography variant="body2">
                  ชื่อ: {deleteDialog.item.ptDesc1}
                </Typography>
              </Box>
            )}
            <Typography variant="body2" color="warning.main" sx={{ mt: 2, fontStyle: 'italic' }}>
              หมายเหตุ: ปุ่มลบจะไม่แสดงสำหรับพัสดุที่เคยถูกใช้ในการบันทึก Trip แล้ว 
              หากต้องการหยุดการใช้งาน กรุณาใช้การปิดใช้งานแทน
            </Typography>
            
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => setDeleteDialog({ open: false, item: null })}
              disabled={deleting}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
            >
              {deleting ? 'กำลังลบ...' : 'ลบข้อมูล'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}

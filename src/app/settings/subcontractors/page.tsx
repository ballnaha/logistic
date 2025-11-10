'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  InputAdornment,
  useMediaQuery,
  useTheme,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Divider,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Block as BlockIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Phone as PhoneIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Description as DescriptionIcon,
  LocalShipping as LocalShippingIcon,
} from '@mui/icons-material';
import Layout from '../../components/Layout';
import { useSnackbar } from '../../../contexts/SnackbarContext';

interface Subcontractor {
  id: number;
  subcontractorCode: string;
  subcontractorName: string;
  contactPerson?: string | null;
  phone?: string | null;
  address?: string | null;
  remark?: string | null;
  isActive: boolean;
  hasReferences: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SubcontractorsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showSnackbar } = useSnackbar();

  // State
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('true');

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    subcontractor: Subcontractor | null;
  }>({
    open: false,
    subcontractor: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Detail dialog
  const [detailDialog, setDetailDialog] = useState<{
    open: boolean;
    subcontractor: Subcontractor | null;
  }>({
    open: false,
    subcontractor: null,
  });

  // Toggle status
  const [togglingStatus, setTogglingStatus] = useState<number | null>(null);

  // Helper functions for role display
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'ผู้ดูแลระบบ';
      case 'user':
        return 'ผู้ใช้งานทั่วไป';
      default:
        return 'ไม่ระบุ';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'user':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <AdminIcon />;
      case 'user':
        return <PersonIcon />;
      default:
        return <PersonIcon />;
    }
  };

  // Fetch subcontractors
  const fetchSubcontractors = async (search = searchTerm, status = statusFilter) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: search || '',
      });

      // status = 'true' (ใช้งาน) -> showInactive = false -> แสดงเฉพาะ active
      // status = 'false' (ยกเลิก) -> showInactive = true -> แสดงทั้งหมด แล้วต้อง filter ฝั่ง client
      // status = '' (ทั้งหมด) -> showInactive = true -> แสดงทั้งหมด
      if (status === '') {
        params.append('showInactive', 'true');
      } else if (status === 'false') {
        params.append('showInactive', 'true');
      }
      // ถ้า status === 'true' ไม่ต้องส่ง showInactive (default จะเป็น false)

      const response = await fetch(`/api/subcontractors?${params}`);
      const result = await response.json();

      if (result.success) {
        let filteredData = result.data || [];
        
        // Filter ฝั่ง client ถ้าเลือก "ยกเลิกการใช้งาน"
        if (status === 'false') {
          filteredData = filteredData.filter((s: Subcontractor) => !s.isActive);
        }
        
        setSubcontractors(filteredData);
      } else {
        throw new Error(result.error || 'ไม่สามารถดึงข้อมูลผู้รับจ้างช่วงได้');
      }
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
      showSnackbar(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSubcontractors();
  }, []);

  // Search effect
  useEffect(() => {
    if (searchTerm.trim()) {
      const timeoutId = setTimeout(() => {
        fetchSubcontractors(searchTerm, statusFilter);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      fetchSubcontractors(searchTerm, statusFilter);
    }
  }, [searchTerm, statusFilter]);

  // Handle status filter change
  const handleStatusFilterChange = (event: any) => {
    setStatusFilter(event.target.value);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('true');
  };

  // Handle delete
  const handleDelete = (subcontractor: Subcontractor) => {
    if (subcontractor.hasReferences) {
      showSnackbar('ไม่สามารถลบผู้รับจ้างช่วงที่มีการใช้งานแล้ว', 'warning');
      return;
    }
    setDeleteDialog({ open: true, subcontractor });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.subcontractor) return;

    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/subcontractors/${deleteDialog.subcontractor.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        showSnackbar('ลบผู้รับจ้างช่วงเรียบร้อยแล้ว', 'success');
        setDeleteDialog({ open: false, subcontractor: null });
        fetchSubcontractors();
      } else {
        showSnackbar(result.error || 'ไม่สามารถลบผู้รับจ้างช่วงได้', 'error');
      }
    } catch (error) {
      console.error('Error deleting subcontractor:', error);
      showSnackbar('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle detail view
  const handleViewDetail = (subcontractor: Subcontractor) => {
    setDetailDialog({ open: true, subcontractor });
  };

  // Toggle active status
  const handleToggleActive = async (subcontractor: Subcontractor) => {
    if (togglingStatus === subcontractor.id) return;

    setTogglingStatus(subcontractor.id);
    try {
      const response = await fetch(`/api/subcontractors/${subcontractor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...subcontractor,
          isActive: !subcontractor.isActive,
        }),
      });

      const result = await response.json();
      if (result.success) {
        showSnackbar(
          `${!subcontractor.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}ผู้รับจ้างช่วงสำเร็จ`,
          'success'
        );
        fetchSubcontractors();
      } else {
        throw new Error(result.error || 'ไม่สามารถอัปเดตสถานะได้');
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      showSnackbar(
        error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปเดตสถานะ',
        'error'
      );
    } finally {
      setTogglingStatus(null);
    }
  };

  // Loading state
  if (session === undefined) {
    return (
      <Layout showSidebar={false}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  // Check admin permission
  if (session && session.user?.role !== 'admin') {
    return (
      <Layout showSidebar={false}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            p: 3,
          }}
        >
          <Paper
            sx={{
              p: 6,
              borderRadius: 4,
              textAlign: 'center',
              maxWidth: 500,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            }}
          >
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
              }}
            >
              <LocalShippingIcon sx={{ fontSize: 40, color: 'error.main' }} />
            </Box>

            <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
              ไม่มีสิทธิ์เข้าถึง
            </Typography>

            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
              คุณต้องเป็นผู้ดูแลระบบเท่านั้น
              <br />
              จึงจะสามารถเข้าถึงหน้าจัดการผู้รับจ้างช่วงได้
            </Typography>

            <Box sx={{ mb: 4 }}>
              <Chip
                label={getRoleLabel(session?.user?.role || 'user')}
                color={getRoleColor(session?.user?.role || 'user') as any}
                icon={getRoleIcon(session?.user?.role || 'user')}
              />
            </Box>

            <Button variant="contained" onClick={() => router.push('/')}>
              กลับหน้าหลัก
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
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              
              <Box>
                <Typography variant={isMobile ? 'h5' : 'h5'} sx={{ fontWeight: 600 }}>
                  จัดการผู้รับจ้างช่วง
                </Typography>
                
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/settings/subcontractors/add')}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: theme.shadows[2],
                '&:hover': {
                  boxShadow: theme.shadows[4],
                },
              }}
            >
              เพิ่มผู้รับจ้างช่วงใหม่
            </Button>
          </Box>
        </Box>

        {/* Search */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr',
                md: '4fr 1fr auto',
              },
              gap: 2,
              mb: 2,
              alignItems: 'center',
            }}
          >
            <TextField
              fullWidth
              variant="outlined"
              placeholder="ค้นหาผู้รับจ้างช่วง (รหัส, ชื่อ, ผู้ติดต่อ, เบอร์โทร)"
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
            />

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>สถานะ</InputLabel>
              <Select value={statusFilter} label="สถานะ" onChange={handleStatusFilterChange}>
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
                  borderColor: 'error.main',
                },
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
              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                  <CircularProgress />
                </Box>
              ) : subcontractors.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <BusinessIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    ไม่พบข้อมูลผู้รับจ้างช่วง
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    เริ่มต้นโดยการเพิ่มผู้รับจ้างช่วงใหม่
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => router.push('/settings/subcontractors/add')}
                  >
                    เพิ่มผู้รับจ้างช่วงใหม่
                  </Button>
                </Box>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>รหัส</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>ชื่อผู้รับจ้างช่วง</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>ผู้ติดต่อ</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>เบอร์โทร</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>สถานะ</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: 140, textAlign: 'center' }}>
                        จัดการ
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subcontractors.map((subcontractor) => (
                      <TableRow
                        key={subcontractor.id}
                        hover
                        sx={{
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <TableCell>
                          {subcontractor.subcontractorCode}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {subcontractor.subcontractorName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {subcontractor.contactPerson || '-'}
                        </TableCell>
                        <TableCell>
                          {subcontractor.phone || '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={subcontractor.isActive ? <ActiveIcon /> : <InactiveIcon />}
                            label={subcontractor.isActive ? 'ใช้งาน' : 'ปิดการใช้งาน'}
                            color={subcontractor.isActive ? 'success' : 'default'}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title="ดูรายละเอียด">
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetail(subcontractor)}
                                sx={{ color: 'info.main' }}
                              >
                                <VisibilityIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="แก้ไข">
                              <IconButton
                                size="small"
                                onClick={() => router.push(`/settings/subcontractors/edit/${subcontractor.id}`)}
                                sx={{ color: 'primary.main' }}
                              >
                                <EditIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={subcontractor.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleActive(subcontractor)}
                                sx={{ color: subcontractor.isActive ? 'warning.main' : 'success.main' }}
                                disabled={togglingStatus === subcontractor.id}
                              >
                                {togglingStatus === subcontractor.id ? (
                                  <CircularProgress size={16} />
                                ) : subcontractor.isActive ? (
                                  <ToggleOffIcon sx={{ fontSize: 18 }} />
                                ) : (
                                  <ToggleOnIcon sx={{ fontSize: 18 }} />
                                )}
                              </IconButton>
                            </Tooltip>
                            {!subcontractor.hasReferences && (
                              <Tooltip title="ลบ">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(subcontractor)}
                                  sx={{ color: 'error.main' }}
                                >
                                  <DeleteIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          ) : (
            /* Mobile Cards */
            <Box sx={{ p: 2 }}>
              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : subcontractors.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <BusinessIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    ไม่พบข้อมูลผู้รับจ้างช่วง
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => router.push('/settings/subcontractors/add')}
                    sx={{ mt: 2 }}
                  >
                    เพิ่มผู้รับจ้างช่วงใหม่
                  </Button>
                </Box>
              ) : (
                subcontractors.map((subcontractor) => (
                  <Card key={subcontractor.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          {subcontractor.subcontractorCode}
                        </Typography>
                        <Chip
                          icon={subcontractor.isActive ? <ActiveIcon /> : <InactiveIcon />}
                          label={subcontractor.isActive ? 'ใช้งาน' : 'ปิด'}
                          color={subcontractor.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        {subcontractor.subcontractorName}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {subcontractor.contactPerson || 'ไม่ระบุ'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PhoneIcon fontSize="small" color="action" />
                        <Typography variant="body2">{subcontractor.phone || 'ไม่ระบุ'}</Typography>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewDetail(subcontractor)}
                      >
                        ดูรายละเอียด
                      </Button>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => router.push(`/settings/subcontractors/edit/${subcontractor.id}`)}
                      >
                        แก้ไข
                      </Button>
                      {!subcontractor.hasReferences && (
                        <IconButton size="small" color="error" onClick={() => handleDelete(subcontractor)}>
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </CardActions>
                  </Card>
                ))
              )}
            </Box>
          )}
        </Paper>

        {/* Delete Dialog */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, subcontractor: null })}>
          <DialogTitle>ยืนยันการลบ</DialogTitle>
          <DialogContent>
            <Typography>
              คุณแน่ใจหรือไม่ที่จะลบผู้รับจ้างช่วง "{deleteDialog.subcontractor?.subcontractorName}" ?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialog({ open: false, subcontractor: null })} 
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

        {/* Detail Dialog */}
        <Dialog
          open={detailDialog.open}
          onClose={() => setDetailDialog({ open: false, subcontractor: null })}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BusinessIcon color="primary" />
              <Typography variant="h6">รายละเอียดผู้รับจ้างช่วง</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {detailDialog.subcontractor && (
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
                          <Typography variant="body2" color="text.secondary">รหัสผู้รับจ้างช่วง</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {detailDialog.subcontractor.subcontractorCode}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">ชื่อผู้รับจ้างช่วง</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {detailDialog.subcontractor.subcontractorName}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            <PersonIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                            ผู้ติดต่อ
                          </Typography>
                          <Typography variant="body1">
                            {detailDialog.subcontractor.contactPerson || '-'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            <PhoneIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                            เบอร์โทรศัพท์
                          </Typography>
                          <Typography variant="body1">
                            {detailDialog.subcontractor.phone || '-'}
                          </Typography>
                        </Box>
                      </Box>

                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          <LocationIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                          ที่อยู่
                        </Typography>
                        <Typography variant="body1">
                          {detailDialog.subcontractor.address || '-'}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            <DescriptionIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                            หมายเหตุ
                          </Typography>
                          <Typography variant="body1">
                            {detailDialog.subcontractor.remark || '-'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">สถานะ</Typography>
                          <Chip
                            icon={detailDialog.subcontractor.isActive ? <ActiveIcon /> : <InactiveIcon />}
                            label={detailDialog.subcontractor.isActive ? 'ใช้งาน' : 'ปิดการใช้งาน'}
                            color={detailDialog.subcontractor.isActive ? 'success' : 'default'}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    </Stack>
                  </Paper>
                </Stack>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button 
              variant="outlined"
              onClick={() => setDetailDialog({ open: false, subcontractor: null })}
            >
              ปิด
            </Button>
            {detailDialog.subcontractor && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => {
                  router.push(`/settings/subcontractors/edit/${detailDialog.subcontractor?.id}`);
                  setDetailDialog({ open: false, subcontractor: null });
                }}
              >
                แก้ไข
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}

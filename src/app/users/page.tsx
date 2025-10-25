'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  Avatar,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Clear as ClearIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import DataTablePagination from '../../components/DataTablePagination';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface User {
  id: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

interface ActiveFilter {
  id: string;
  label: string;
  value: string;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    user?: User | null;
  }>({
    open: false,
    user: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Delete user dialog
  const [deleteUserDialog, setDeleteUserDialog] = useState<{
    open: boolean;
    user?: User | null;
  }>({
    open: false,
    user: null,
  });
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);

  const fetchingRef = useRef(false);

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';

  const fetchUsers = async (
    page = pagination.page,
    limit = pagination.limit,
    search = searchTerm
  ) => {
    // Prevent multiple simultaneous fetches
    if (fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
        status: statusFilter,
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
      });

      const response = await fetch(`/api/users?${params}`);
      const result = await response.json();

      if (response.ok) {
        setUsers(result.data);
        setPagination(result.pagination);
      } else {
        showSnackbar(result.error || 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Update active filters
  const updateActiveFilters = () => {
    const filters: ActiveFilter[] = [];

    if (searchTerm) {
      filters.push({
        id: 'search',
        label: `ค้นหา: "${searchTerm}"`,
        value: searchTerm,
      });
    }

    if (roleFilter) {
      const roleLabels: { [key: string]: string } = {
        admin: 'ผู้ดูแลระบบ',
        user: 'ผู้ใช้งานทั่วไป',
      };
      filters.push({
        id: 'role',
        label: `บทบาท: ${roleLabels[roleFilter] || roleFilter}`,
        value: roleFilter,
      });
    }

    setActiveFilters(filters);
  };

  // Clear filter
  const clearFilter = (filterId: string) => {
    if (filterId === 'search') {
      setSearchTerm('');
    }
    if (filterId === 'role') {
      setRoleFilter('');
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setStatusFilter('active');
  };

  // Handle delete/toggle status
  const handleToggleStatus = (user: User) => {
    setDeleteDialog({ open: true, user });
  };

  const confirmToggleStatus = async () => {
    if (!deleteDialog.user || deleteLoading) return;

    setDeleteLoading(true);
    try {
      const method = deleteDialog.user.isActive ? 'DELETE' : 'PATCH';
      const response = await fetch(`/api/users/${deleteDialog.user.id}`, {
        method,
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar(result.message, 'success');
        fetchUsers();
      } else {
        showSnackbar(result.error || 'ไม่สามารถดำเนินการได้', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการดำเนินการ', 'error');
    } finally {
      setDeleteLoading(false);
      setDeleteDialog({ open: false, user: null });
    }
  };

  // Handle edit
  const handleEdit = (user: User) => {
    router.push(`/users/edit/${user.id}`);
  };

  // Handle delete user
  const handleDeleteUser = (user: User) => {
    setDeleteUserDialog({ open: true, user });
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserDialog.user || deleteUserLoading) return;

    setDeleteUserLoading(true);
    try {
      const response = await fetch(`/api/users/${deleteUserDialog.user.id}?permanent=true`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar('ลบผู้ใช้งานสำเร็จ', 'success');
        fetchUsers(); // Refresh the list
      } else {
        showSnackbar(result.error || 'ไม่สามารถลบผู้ใช้งานได้', 'error');
      }
    } catch (error) {
      showSnackbar('เกิดข้อผิดพลาดในการลบผู้ใช้งาน', 'error');
    } finally {
      setDeleteUserLoading(false);
      setDeleteUserDialog({ open: false, user: null });
    }
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

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <AdminIcon sx={{ fontSize: 18 }} />;
      default:
        return <PersonIcon sx={{ fontSize: 18 }} />;
    }
  };

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'info';
      default:
        return 'default';
    }
  };

  // Get role label
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'ผู้ดูแลระบบ';
      default:
        return 'ผู้ใช้งานทั่วไป';
    }
  };

  // Load data on mount
  useEffect(() => {
    // Only check when session has loaded (not undefined)
    if (session === undefined) return;
    
    // If no session, redirect to login
    if (!session) {
      router.push('/login');
      return;
    }
    
    // If admin, fetch users
    if (session.user?.role === 'admin') {
      fetchUsers();
    }
  }, [session, router]);

  // Update active filters when search or role changes
  useEffect(() => {
    updateActiveFilters();
  }, [searchTerm, roleFilter]);

  // Handle search and sort changes with debounce for search
  useEffect(() => {
    if (searchTerm) {
      // Debounce search
      const delayedFetch = setTimeout(() => {
        fetchUsers(1, pagination.limit, searchTerm);
      }, 500);
      return () => clearTimeout(delayedFetch);
    } else {
      // No debounce for sort changes or clearing search
      fetchUsers(1, pagination.limit, searchTerm);
    }
  }, [searchTerm, sortBy, sortOrder, pagination.limit, roleFilter, statusFilter]);

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    const page = newPage + 1;
    setPagination(prev => ({ ...prev, page }));
    fetchUsers(page, pagination.limit, searchTerm);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const limit = parseInt(event.target.value, 10);
    setPagination(prev => ({ ...prev, limit, page: 1 }));
    fetchUsers(1, limit, searchTerm);
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
              จึงจะสามารถเข้าถึงหน้าจัดการผู้ใช้งานได้
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

  if (loading && users.length === 0) {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
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
              
              จัดการผู้ใช้งาน
            </Typography>
            
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              href="/users/add"
              sx={{ borderRadius: 2 }}
            >
              เพิ่มผู้ใช้งานใหม่
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
              md: '2fr 1fr 1fr 1fr auto'
            },
            gap: 2, 
            mb: 2,
            alignItems: 'center'
          }}>
            <TextField
              placeholder="ค้นหา username, email, ชื่อ, นามสกุล..."
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

            <FormControl size="small">
              <InputLabel>บทบาท</InputLabel>
              <Select
                value={roleFilter}
                label="บทบาท"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="">ทั้งหมด</MenuItem>
                <MenuItem value="admin">ผู้ดูแลระบบ</MenuItem>
                
                <MenuItem value="user">ผู้ใช้งานทั่วไป</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small">
              <InputLabel>สถานะ</InputLabel>
              <Select
                value={statusFilter}
                label="สถานะ"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                <MenuItem value="active">ใช้งานอยู่</MenuItem>
                <MenuItem value="inactive">ปิดใช้งาน</MenuItem>
                
              </Select>
            </FormControl>

            <FormControl size="small">
              <InputLabel>เรียงตาม</InputLabel>
              <Select
                value={sortBy}
                label="เรียงตาม"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="createdAt">วันที่สร้าง</MenuItem>
                <MenuItem value="username">Username</MenuItem>
                <MenuItem value="role">บทบาท</MenuItem>
                <MenuItem value="lastLogin">เข้าสู่ระบบล่าสุด</MenuItem>
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

          {/* Active Filters Chips */}
          {activeFilters.length > 0 && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              mb: 2,
              flexWrap: 'wrap'
            }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                ตัวกรอง:
              </Typography>
              {activeFilters.map((filter) => (
                <Chip
                  key={filter.id}
                  label={filter.label}
                  onDelete={() => clearFilter(filter.id)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
              <Button
                size="small"
                onClick={clearAllFilters}
                sx={{ ml: 1, textTransform: 'none' }}
              >
                ล้างทั้งหมด
              </Button>
            </Box>
          )}
        </Paper>

        {/* Table */}
        <TableContainer 
          component={Paper} 
          sx={{ 
            borderRadius: 3,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>ผู้ใช้งาน</TableCell>
                <TableCell>บทบาท</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell>เข้าสู่ระบบล่าสุด</TableCell>
                <TableCell align="center">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: getRoleColor(user.role) + '.main' }}>
                        {getRoleIcon(user.role)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {user.username}
                        </Typography>
                        {user.email && (
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        )}
                        {(user.firstName || user.lastName) && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getRoleLabel(user.role)}
                      color={getRoleColor(user.role) as any}
                      size="small"
                      icon={getRoleIcon(user.role)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                      color={user.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {user.lastLogin ? formatDate(user.lastLogin) : 'ยังไม่เคยเข้าสู่ระบบ'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Tooltip title="แก้ไข">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(user)}
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
                      {parseInt(session?.user?.id || '0') !== user.id && (
                        <>
                          <Tooltip title={user.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleStatus(user)}
                              sx={{
                                color: user.isActive ? 'warning.main' : 'success.main',
                                '&:hover': {
                                  bgcolor: user.isActive ? 'warning.50' : 'success.50',
                                },
                              }}
                            >
                              {user.isActive ? (
                                <ToggleOffIcon sx={{ fontSize: 18 }} />
                              ) : (
                                <ToggleOnIcon sx={{ fontSize: 18 }} />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="ลบผู้ใช้งาน">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteUser(user)}
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
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <DataTablePagination
            component="div"
            count={pagination.total}
            rowsPerPage={pagination.limit}
            page={pagination.page - 1}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="แสดงต่อหน้า:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
            }
          />
        </TableContainer>

        {/* Delete/Toggle Status Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, user: null })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {deleteDialog.user?.isActive ? 'ปิดใช้งานผู้ใช้งาน' : 'เปิดใช้งานผู้ใช้งาน'}
          </DialogTitle>
          <DialogContent>
            <Typography>
              {deleteDialog.user?.isActive 
                ? `คุณต้องการปิดใช้งานผู้ใช้งาน "${deleteDialog.user?.username}" หรือไม่?`
                : `คุณต้องการเปิดใช้งานผู้ใช้งาน "${deleteDialog.user?.username}" หรือไม่?`
              }
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialog({ open: false, user: null })}
              disabled={deleteLoading}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={confirmToggleStatus}
              variant="contained"
              color={deleteDialog.user?.isActive ? 'error' : 'success'}
              disabled={deleteLoading}
              startIcon={deleteLoading ? <CircularProgress size={16} /> : undefined}
            >
              {deleteDialog.user?.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog
          open={deleteUserDialog.open}
          onClose={() => setDeleteUserDialog({ open: false, user: null })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ color: 'error.main' }}>
            ⚠️ ลบผู้ใช้งาน
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              คุณต้องการลบผู้ใช้งาน <strong>"{deleteUserDialog.user?.username}"</strong> หรือไม่?
            </Typography>
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>
              คำเตือน: การลบผู้ใช้งานจะไม่สามารถย้อนกลับได้
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • ข้อมูลผู้ใช้งานทั้งหมดจะถูกลบอย่างถาวร<br/>
              • บันทึกการเข้าสู่ระบบจะถูกลบ<br/>
              • การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteUserDialog({ open: false, user: null })}
              disabled={deleteUserLoading}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={confirmDeleteUser}
              variant="contained"
              color="error"
              disabled={deleteUserLoading}
              startIcon={deleteUserLoading ? <CircularProgress size={16} /> : <DeleteIcon />}
            >
              ลบผู้ใช้งาน
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}

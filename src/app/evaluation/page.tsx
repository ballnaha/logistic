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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Assessment as AssessmentIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  LocalShipping as TruckIcon,
  Warning as WarningIcon,
  Business as BusinessIcon,
  FilterList as FilterIcon,
  Analytics as AnalyticsIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Layout from '../components/Layout';
import { useSnackbar } from '../../contexts/SnackbarContext';
import DataTablePagination from '../../components/DataTablePagination';
import ViewEvaluationDialog from './components/ViewEvaluationDialog';
import { ClockIcon } from '@mui/x-date-pickers';

interface Evaluation {
  id: number;
  contractorName: string;
  vehiclePlate: string;
  site: string;
  driverCooperation: number;
  vehicleCondition: number;
  damageFound: boolean;
  damageValue: number;
  damageScore: number;
  remark: string;
  evaluatedBy: string;
  evaluationDate: string;
  totalScore: number;
}

export default function EvaluationPage() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { data: session } = useSession();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // View dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewEvaluationId, setViewEvaluationId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  
  // Filter states
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedVehiclePlate, setSelectedVehiclePlate] = useState<string>('');
  const [selectedContractor, setSelectedContractor] = useState<string>('');

  // Load evaluations
  const loadEvaluations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/evaluation');
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }
      const data = await response.json();
      setEvaluations(data);
      setFilteredEvaluations(data);
    } catch (error: any) {
      console.error('Error loading evaluations:', error);
      showSnackbar(error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvaluations();
  }, []);

  // Helper: all vehicle plates available (cascade based on contractor selection)
  const getAvailableVehiclePlatesForFilter = () => {
    // Filter by date first
    let filteredByDate = evaluations;
    if (selectedMonth && selectedYear) {
      filteredByDate = evaluations.filter(evaluation => {
        const evalDate = new Date(evaluation.evaluationDate);
        const evalMonth = (evalDate.getMonth() + 1).toString();
        const evalYear = evalDate.getFullYear().toString();
        return evalMonth === selectedMonth && evalYear === selectedYear;
      });
    } else if (selectedYear) {
      filteredByDate = evaluations.filter(evaluation => {
        const evalDate = new Date(evaluation.evaluationDate);
        const evalYear = evalDate.getFullYear().toString();
        return evalYear === selectedYear;
      });
    }

    // Then filter by contractor if selected
    const filteredByContractor = selectedContractor
      ? filteredByDate.filter(e => e.contractorName === selectedContractor)
      : filteredByDate;
    
    const plates = filteredByContractor.map(e => e.vehiclePlate).filter(Boolean);
    return Array.from(new Set(plates)).sort((a, b) => a.localeCompare(b));
  };

  // Helper: all contractors available (filtered by selected month/year)
  const getAvailableContractorsForFilter = () => {
    // Filter by date
    let filteredByDate = evaluations;
    if (selectedMonth && selectedYear) {
      filteredByDate = evaluations.filter(evaluation => {
        const evalDate = new Date(evaluation.evaluationDate);
        const evalMonth = (evalDate.getMonth() + 1).toString();
        const evalYear = evalDate.getFullYear().toString();
        return evalMonth === selectedMonth && evalYear === selectedYear;
      });
    } else if (selectedYear) {
      filteredByDate = evaluations.filter(evaluation => {
        const evalDate = new Date(evaluation.evaluationDate);
        const evalYear = evalDate.getFullYear().toString();
        return evalYear === selectedYear;
      });
    }

    const contractors = filteredByDate.map(e => e.contractorName).filter(Boolean);
    return Array.from(new Set(contractors)).sort((a, b) => a.localeCompare(b));
  };


  // Apply filters
  useEffect(() => {
    let filtered = [...evaluations];

    // Date filter
    if (selectedMonth && selectedYear) {
      filtered = filtered.filter(evaluation => {
        const evalDate = new Date(evaluation.evaluationDate);
        const evalMonth = (evalDate.getMonth() + 1).toString();
        const evalYear = evalDate.getFullYear().toString();
        return evalMonth === selectedMonth && evalYear === selectedYear;
      });
    } else if (selectedYear) {
      filtered = filtered.filter(evaluation => {
        const evalDate = new Date(evaluation.evaluationDate);
        const evalYear = evalDate.getFullYear().toString();
        return evalYear === selectedYear;
      });
    }

    // Vehicle plate filter (only if selected)
    if (selectedVehiclePlate) {
      filtered = filtered.filter(evaluation => evaluation.vehiclePlate === selectedVehiclePlate);
    }

    // Contractor filter (only if selected)
    if (selectedContractor) {
      filtered = filtered.filter(evaluation => evaluation.contractorName === selectedContractor);
    }

    setFilteredEvaluations(filtered);
    setPage(0); // Reset to first page when filter changes
  }, [evaluations, selectedMonth, selectedYear, selectedVehiclePlate, selectedContractor]);

  // Reset vehicle plate when contractor changes (cascade effect)
  useEffect(() => {
    // Always reset vehicle plate when contractor changes
    if (selectedContractor) {
      // Check if the selected vehicle plate belongs to the selected contractor
      const availablePlates = evaluations
        .filter(e => e.contractorName === selectedContractor)
        .map(e => e.vehiclePlate);
      
      // If the selected plate is not in the available plates for this contractor, reset it
      if (selectedVehiclePlate && !availablePlates.includes(selectedVehiclePlate)) {
        setSelectedVehiclePlate('');
      }
    }
  }, [selectedContractor, evaluations]);

  // Reset contractor and vehicle plate when date filter changes
  useEffect(() => {
    const availableContractors = getAvailableContractorsForFilter();
    
    // If selected contractor is not in the available list, reset it
    if (selectedContractor && !availableContractors.includes(selectedContractor)) {
      setSelectedContractor('');
      setSelectedVehiclePlate('');
    } else if (selectedContractor) {
      // If contractor is still valid, check vehicle plate
      const availablePlates = getAvailableVehiclePlatesForFilter();
      if (selectedVehiclePlate && !availablePlates.includes(selectedVehiclePlate)) {
        setSelectedVehiclePlate('');
      }
    }
  }, [selectedMonth, selectedYear]);

  // Get unique years from evaluations
  const getAvailableYears = () => {
    const years = evaluations.map(evaluation => 
      new Date(evaluation.evaluationDate).getFullYear()
    );
    return [...new Set(years)].sort((a, b) => b - a); // Sort descending
  };

  // Get months data
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

  // Handle delete
  const handleDelete = async () => {
    if (!selectedEvaluation) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/evaluation/${selectedEvaluation.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถลบข้อมูลได้');
      }

  showSnackbar('ลบแบบประเมินเรียบร้อยแล้ว', 'success');
  // ปิด dialog ก่อน แล้วค่อยล้าง state หลัง animation เพื่อไม่ให้ modal ว่างชั่วคราว
  setDeleteDialogOpen(false);
  loadEvaluations();
    } catch (error: any) {
      console.error('Error deleting evaluation:', error);
      showSnackbar(error.message || 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Handle view evaluation
  const handleView = (evaluationId: number) => {
    setViewEvaluationId(evaluationId);
    setViewDialogOpen(true);
  };

  // Handle filter reset
  const handleResetFilter = () => {
    setSelectedMonth('');
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedVehiclePlate('');
    setSelectedContractor('');
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

  // Get cooperation level label
  const getCooperationLabel = (score: number) => {
    switch (score) {
      case 4: return 'ดีมาก';
      case 3: return 'ดี';
      case 2: return 'ปานกลาง';
      case 1: return 'ไม่ดี';
      default: return '-';
    }
  };

  // Get cooperation color
  const getCooperationColor = (score: number) => {
    switch (score) {
      case 4: return 'success';
      case 3: return 'info';
      case 2: return 'warning';
      case 1: return 'error';
      default: return 'default';
    }
  };

  // Get vehicle condition label
  const getVehicleConditionLabel = (score: number) => {
    return score === 3 ? 'สะอาด' : 'ไม่สะอาด';
  };

  // Get score color
  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage > 90) return 'success';
    if (percentage >= 80) return 'warning';
    if (percentage >= 0) return 'error';
    return 'error';
  };

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Paginated data
  const paginatedEvaluations = filteredEvaluations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout showSidebar={false}>
      <Box>
        {/* Header - Responsive */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 1 }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon sx={{ color: 'primary.main', fontSize: { xs: 28, sm: 24 } }} />
            <Typography 
              variant={isMobile ? "h5" : "h6"} 
              component="h1" 
              fontWeight="bold"
              sx={{ fontSize: { xs: '1.25rem', sm: '1.125rem' } }}
            >
              แบบประเมิน ({filteredEvaluations.length} รายการ)
            </Typography>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            width: { xs: '100%', sm: 'auto' },
            flexDirection: { xs: 'column', sm: 'row' }
          }}>
           

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              href="/evaluation/add"
              sx={{ 
                borderRadius: 2,
                minHeight: { xs: 44, sm: 36 },
                fontSize: { xs: '0.875rem', sm: '0.8125rem' }
              }}
              fullWidth={isMobile}
            >
              สร้างแบบประเมิน
            </Button>
          </Box>
        </Box>

        {/* Search & Filters */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon color="primary" />
            ตัวกรองข้อมูล
          </Typography>
          
          {/* Filters Row */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <Box sx={{ minWidth: 200, flex: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>ผู้รับจ้างช่วง</InputLabel>
                <Select
                  value={selectedContractor}
                  label="ผู้รับจ้างช่วง"
                  onChange={(e) => {
                    setSelectedContractor(e.target.value);
                    // Reset vehicle plate when contractor changes
                    setSelectedVehiclePlate('');
                  }}
                >
                  <MenuItem value="">ทั้งหมด</MenuItem>
                  {getAvailableContractorsForFilter().map((contractor) => (
                    <MenuItem key={contractor} value={contractor}>
                      {contractor}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ minWidth: 200 }}>
              <FormControl fullWidth size="small">
                <InputLabel>ทะเบียนรถ</InputLabel>
                <Select
                  value={selectedVehiclePlate}
                  label="ทะเบียนรถ"
                  onChange={(e) => setSelectedVehiclePlate(e.target.value)}
                  disabled={!selectedContractor}
                >
                  <MenuItem value="">ทั้งหมด</MenuItem>
                  {getAvailableVehiclePlatesForFilter().map((plate) => (
                    <MenuItem key={plate} value={plate}>
                      {plate}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ minWidth: 150 }}>
              <FormControl fullWidth size="small">
                <InputLabel>เดือน</InputLabel>
                <Select
                  value={selectedMonth}
                  label="เดือน"
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <MenuItem value="">ทั้งหมด</MenuItem>
                  {months.map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ minWidth: 120 }}>
              <FormControl fullWidth size="small">
                <InputLabel>ปี</InputLabel>
                <Select
                  value={selectedYear}
                  label="ปี"
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {getAvailableYears().map((year) => (
                    <MenuItem key={year} value={year.toString()}>
                      {year + 543}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Active Filters */}
          {(selectedContractor || selectedVehiclePlate || selectedMonth || selectedYear !== new Date().getFullYear().toString()) && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderTopColor: 'grey.200' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                ตัวกรอง:
              </Typography>
              
              {selectedContractor && (
                <Chip
                  label={`ผู้รับจ้างช่วง: ${selectedContractor}`}
                  onDelete={() => {
                    setSelectedContractor('');
                    setSelectedVehiclePlate('');
                  }}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}

              {selectedVehiclePlate && (
                <Chip
                  label={`ทะเบียนรถ: ${selectedVehiclePlate}`}
                  onDelete={() => setSelectedVehiclePlate('')}
                  color="info"
                  variant="outlined"
                  size="small"
                />
              )}

              {selectedMonth && (
                <Chip
                  label={`เดือน: ${months.find(m => m.value === selectedMonth)?.label || selectedMonth}`}
                  onDelete={() => setSelectedMonth('')}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}

              {selectedYear !== new Date().getFullYear().toString() && (
                <Chip
                  label={`ปี: ${parseInt(selectedYear) + 543}`}
                  onDelete={() => setSelectedYear(new Date().getFullYear().toString())}
                  color="warning"
                  variant="outlined"
                  size="small"
                />
              )}

              <Chip
                label="ล้างทั้งหมด"
                onClick={handleResetFilter}
                variant="outlined"
                size="small"
                sx={{ 
                  color: 'text.secondary',
                  borderColor: 'grey.300',
                  '&:hover': { 
                    color: 'error.main',
                    borderColor: 'error.main' 
                  }
                }}
              />
            </Box>
          )}
        </Paper>

        {/* Desktop Table / Mobile Cards */}
        {!isMobile ? (
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', overflow: 'hidden' }}>
            {filteredEvaluations.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <AssessmentIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {evaluations.length === 0 ? 'ยังไม่มีแบบประเมิน' : 'ไม่พบผลการค้นหา'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {evaluations.length === 0 
                    ? 'คลิกปุ่ม "สร้างแบบประเมิน" เพื่อเริ่มต้น'
                    : 'ลองเปลี่ยนคำค้นหาหรือตัวกรองอื่น ๆ'
                  }
                </Typography>
                {evaluations.length === 0 && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    href="/evaluation/add"
                    sx={{ borderRadius: 2 }}
                  >
                    สร้างแบบประเมิน
                  </Button>
                )}
              </Box>
            ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>วันที่</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>ผู้รับจ้างช่วง</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>ทะเบียนรถ</TableCell>
                      
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>ความร่วมมือ</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>สภาพรถ</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>ความเสียหาย</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>คะแนนรวม</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', fontSize: '0.875rem' }}>จัดการ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedEvaluations.map((evaluation) => (
                      <TableRow key={evaluation.id} hover>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2">
                            {new Date(evaluation.evaluationDate).toLocaleDateString('th-TH', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit'
                            })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <ClockIcon sx={{ fontSize: 12, mr: 0.5 }} />
                            {new Date(evaluation.evaluationDate).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit'
                          })}
                          </Typography>
                        </TableCell>
                        
                        <TableCell sx={{ py: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <BusinessIcon sx={{ color: 'primary.main', fontSize: 16 }} />
                            <Typography variant="body2">
                              {evaluation.contractorName || '-'}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell sx={{ py: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TruckIcon sx={{ color: 'primary.main', fontSize: 16 }} />
                            <Typography variant="body2" fontWeight="500">
                              {evaluation.vehiclePlate || '-'}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell sx={{ py: 1 }}>
                          <Chip
                            label={`${getCooperationLabel(evaluation.driverCooperation)} (${evaluation.driverCooperation})`}
                            color={getCooperationColor(evaluation.driverCooperation) as any}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Chip
                            label={`${getVehicleConditionLabel(evaluation.vehicleCondition)} (${evaluation.vehicleCondition})`}
                            color={evaluation.vehicleCondition === 3 ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {evaluation.damageFound ? (
                            <WarningIcon 
                              sx={{ 
                                color: 'error.main' , 
                                fontSize: 16 
                              }} 
                            />
                            ) : (
                              <CheckIcon 
                                sx={{ 
                                  color: 'success.main' , 
                                  fontSize: 16 
                                }} 
                              />
                            )}
                            <Box>
                              <Typography variant="caption">
                                {evaluation.damageFound ? `พบ (${evaluation.damageScore})` : `ไม่พบ (${evaluation.damageScore})`}
                              </Typography>
                              {evaluation.damageFound && evaluation.damageValue > 0 && (
                                <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                                  {evaluation.damageValue.toLocaleString()}฿
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Chip
                            label={`${evaluation.totalScore}/10`}
                            color={getScoreColor(evaluation.totalScore, 10) as any}
                            size="small"
                          />
                        </TableCell>

                        <TableCell sx={{ textAlign: 'center', py: 1 }}>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title="ดู">
                              <IconButton
                                size="small"
                                onClick={() => handleView(evaluation.id)}
                                sx={{ color: 'primary.main', p: 0.5 }}
                              >
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="แก้ไข">
                              <IconButton
                                size="small"
                                onClick={() => router.push(`/evaluation/edit/${evaluation.id}`)}
                                sx={{ color: 'warning.main', p: 0.5 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="ลบ">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedEvaluation(evaluation);
                                  setDeleteDialogOpen(true);
                                }}
                                sx={{ color: 'error.main', p: 0.5 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Pagination */}
              <DataTablePagination
                component="div"
                count={filteredEvaluations.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[20, 50, 100, 200]}
                labelRowsPerPage="แสดงต่อหน้า:"
                labelDisplayedRows={({ from, to, count }) => 
                  `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
                }
              />
            </>
          )}
        </Paper>
        ) : (
          /* Mobile Cards */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loading ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <CircularProgress size={40} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  กำลังโหลดข้อมูล...
                </Typography>
              </Paper>
            ) : filteredEvaluations.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <AssessmentIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                  {evaluations.length === 0 ? 'ยังไม่มีแบบประเมิน' : 'ไม่พบผลการค้นหา'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                  {evaluations.length === 0 
                    ? 'เริ่มต้นสร้างแบบประเมินของคุณ'
                    : 'ลองเปลี่ยนคำค้นหาหรือตัวกรองอื่น ๆ'
                  }
                </Typography>
                {evaluations.length === 0 && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    href="/evaluation/add"
                    fullWidth
                    sx={{ borderRadius: 2 }}
                  >
                    สร้างแบบประเมิน
                  </Button>
                )}
              </Paper>
            ) : (
              paginatedEvaluations.map((evaluation) => (
                <Paper 
                  key={evaluation.id}
                  sx={{ 
                    p: 3, 
                    borderRadius: 3,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    '&:hover': {
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Header with Date and Actions */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    mb: 2
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssessmentIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {new Date(evaluation.evaluationDate).toLocaleDateString('th-TH', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit'
                        })}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="ดู">
                        <IconButton
                          size="small"
                          onClick={() => handleView(evaluation.id)}
                          sx={{
                            color: 'primary.main',
                            bgcolor: 'primary.50',
                            '&:hover': { bgcolor: 'primary.100' }
                          }}
                        >
                          <ViewIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="แก้ไข">
                        <IconButton
                          size="small"
                          onClick={() => router.push(`/evaluation/edit/${evaluation.id}`)}
                          sx={{
                            color: 'warning.main',
                            bgcolor: 'warning.50',
                            '&:hover': { bgcolor: 'warning.100' }
                          }}
                        >
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ลบ">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedEvaluation(evaluation);
                            setDeleteDialogOpen(true);
                          }}
                          sx={{
                            color: 'error.main',
                            bgcolor: 'error.50',
                            '&:hover': { bgcolor: 'error.100' }
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  {/* Vehicle and Contractor Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: 2, 
                      bgcolor: 'primary.main', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'white',
                      border: '2px solid #e0e0e0'
                    }}>
                      <TruckIcon sx={{ fontSize: 24 }} />
                    </Box>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {evaluation.vehiclePlate || '-'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {evaluation.contractorName || '-'}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        คะแนนรวม
                      </Typography>
                      <Chip
                        label={`${evaluation.totalScore}/10`}
                        color={getScoreColor(evaluation.totalScore, 10) as any}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                  </Box>

                  {/* Evaluation Details */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: 2, 
                    py: 2,
                    borderTop: '1px solid',
                    borderBottom: '1px solid',
                    borderColor: 'grey.100'
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        ความร่วมมือ
                      </Typography>
                      <Chip
                        label={`${getCooperationLabel(evaluation.driverCooperation)} (${evaluation.driverCooperation})`}
                        color={getCooperationColor(evaluation.driverCooperation) as any}
                        size="small"
                        variant="outlined"
                        sx={{ mt: 0.5, fontSize: '0.75rem' }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        สภาพรถ
                      </Typography>
                      <Chip
                        label={`${getVehicleConditionLabel(evaluation.vehicleCondition)} (${evaluation.vehicleCondition})`}
                        color={evaluation.vehicleCondition === 3 ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                        sx={{ mt: 0.5, fontSize: '0.75rem' }}
                      />
                    </Box>
                  </Box>

                  {/* Damage Information */}
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        ความเสียหาย
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {evaluation.damageFound ? (
                          <WarningIcon 
                            sx={{ 
                              color: 'error.main' , 
                              fontSize: 16 
                            }} 
                          />
                        ) : (
                          <CheckIcon 
                            sx={{ 
                              color: 'success.main' , 
                              fontSize: 16 
                            }} 
                          />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {evaluation.damageFound ? `พบ (${evaluation.damageScore})` : `ไม่พบ (${evaluation.damageScore})`}
                        </Typography>
                      </Box>
                    </Box>
                    {evaluation.damageFound && evaluation.damageValue > 0 && (
                      <Typography variant="body2" color="error.main" sx={{ 
                        textAlign: 'right',
                        fontWeight: 600,
                        bgcolor: 'error.50',
                        p: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'error.200'
                      }}>
                        มูลค่าความเสียหาย: {evaluation.damageValue.toLocaleString()}฿
                      </Typography>
                    )}
                  </Box>

                  {/* Site and Evaluator */}
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.100' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        สถานที่
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {evaluation.site || '-'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        ผู้ประเมิน
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {evaluation.evaluatedBy || '-'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Remark */}
                  {evaluation.remark && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.100' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        หมายเหตุ
                      </Typography>
                      <Typography variant="body2" sx={{
                        bgcolor: 'grey.50',
                        p: 2,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.200'
                      }}>
                        {evaluation.remark}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              ))
            )}
          </Box>
        )}

        {/* Pagination - Responsive */}
        {filteredEvaluations.length > 0 && isMobile && (
          <Paper sx={{ borderRadius: 2, overflow: 'hidden', mt: 2 }}>
            <DataTablePagination
              component="div"
              count={filteredEvaluations.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[20, 50, 100, 200]}
              labelRowsPerPage="แสดงต่อหน้า:"
              labelDisplayedRows={({ from, to, count }) => 
                `${from}-${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
              }
            />
          </Paper>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => !deleting && setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
          keepMounted
          TransitionProps={{
            // ล้างข้อมูลหลัง dialog ปิดสนิท เพื่อลดการกะพริบของเนื้อหา
            onExited: () => setSelectedEvaluation(null)
          }}
          PaperProps={{
            sx: {
              height: isMobile ? '100vh' : 'auto',
              m: isMobile ? 0 : 2,
              borderRadius: isMobile ? 0 : 2,
            }
          }}
        >
          <DialogTitle sx={{ color: 'error.main' }}>
            ยืนยันการลบแบบประเมิน
          </DialogTitle>
          <DialogContent sx={{ 
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 1.5 },
            flex: isMobile ? 1 : 'none'
          }}>
            <Typography variant={isMobile ? "h6" : "body1"} sx={{ mb: 2 }}>
              คุณต้องการลบแบบประเมินนี้หรือไม่?
            </Typography>
            {selectedEvaluation && (
              <Box sx={{ 
                mt: 2, 
                p: { xs: 2, sm: 2 }, 
                bgcolor: 'grey.50', 
                borderRadius: 2 , 
                border: '1px solid', 
                borderColor: 'grey.200' 
              }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  วันที่ประเมิน: {formatDate(selectedEvaluation.evaluationDate)}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  ทะเบียนรถ: {selectedEvaluation.vehiclePlate}
                </Typography>
                <Typography variant="body2">
                  ผู้รับจ้างช่วง: {selectedEvaluation.contractorName}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ 
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 1.5 },
            gap: { xs: 2, sm: 1 },
            flexDirection: { xs: 'column', sm: 'row' }
          }}>
            <Button 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              variant="outlined"
              fullWidth={isMobile}
              sx={{ 
                order: { xs: 2, sm: 1 },
                minHeight: { xs: 44, sm: 36 }
              }}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleDelete}
              color="error"
              variant="contained"
              disabled={deleting}
              startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
              fullWidth={isMobile}
              sx={{ 
                order: { xs: 1, sm: 2 },
                minHeight: { xs: 44, sm: 36 }
              }}
            >
              {deleting ? 'กำลังลบ...' : 'ลบ'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Evaluation Dialog */}
        <ViewEvaluationDialog
          open={viewDialogOpen}
          onClose={() => {
            setViewDialogOpen(false);
            setViewEvaluationId(null);
          }}
          evaluationId={viewEvaluationId}
        />
      </Box>
    </Layout>
  );
}

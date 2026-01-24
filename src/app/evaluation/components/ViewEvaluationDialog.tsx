'use client';
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  Assessment as AssessmentIcon,
  Person as PersonIcon,
  LocalShipping as TruckIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  Grade as GradeIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useRouter } from 'next/navigation';

interface Evaluation {
  id: number;
  // Common
  transportType?: string;
  contractorName: string;
  vehiclePlate: string;
  site: string;
  remark: string;
  evaluatedBy: string;
  evaluationDate: string;
  totalScore: number;
  createdAt: string;
  updatedAt: string;

  // Domestic
  driverCooperation: number | null;
  vehicleCondition: number | null;
  damageFound: boolean;
  damageValue: number;
  damageScore: number;

  // International
  containerCondition?: number | null;
  punctuality?: number | null;
  productDamage?: number | null;
}

interface ViewEvaluationDialogProps {
  open: boolean;
  onClose: () => void;
  evaluationId: number | null;
}

export default function ViewEvaluationDialog({
  open,
  onClose,
  evaluationId,
}: ViewEvaluationDialogProps) {
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);

  // Load evaluation data
  const loadEvaluation = async (id: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/evaluation/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('ไม่พบแบบประเมินที่ระบุ');
        }
        throw new Error('ไม่สามารถโหลดข้อมูลได้');
      }

      const data = await response.json();
      setEvaluation(data);
    } catch (error: any) {
      console.error('Error loading evaluation:', error);
      showSnackbar(error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
      // ปิด dialog และ clear state เมื่อเกิด error
      setEvaluation(null);
      setLoading(false);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && evaluationId) {
      loadEvaluation(evaluationId);
    } else if (!open) {
      // ล้างข้อมูลหลังจาก dialog ปิดแล้ว (หลัง animation)
      const timer = setTimeout(() => {
        setEvaluation(null);
        setLoading(false);
      }, 300); // รอ dialog close animation

      return () => clearTimeout(timer);
    }
  }, [open, evaluationId]);

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

  // Get cooperation level label and color
  const getCooperationInfo = (score: number) => {
    switch (score) {
      case 4: return { label: 'ดีมาก', color: 'success' };
      case 3: return { label: 'ดี', color: 'info' };
      case 2: return { label: 'พอใช้', color: 'warning' };
      case 1: return { label: 'ควรปรับปรุง', color: 'error' };
      default: return { label: 'ไม่ระบุ', color: 'default' };
    }
  };

  // Get vehicle condition label and color
  const getVehicleConditionInfo = (score: number) => {
    switch (score) {
      case 3: return { label: 'ดีมาก', color: 'success' };
      case 2: return { label: 'ปกติ', color: 'info' };
      case 1: return { label: 'ควรปรับปรุง', color: 'warning' };
      case 0: return { label: 'ไม่ผ่าน', color: 'error' };
      default: return { label: 'ไม่ระบุ', color: 'default' };
    }
  };

  // Get damage score label and color
  const getDamageScoreInfo = (score: number) => {
    switch (score) {
      case 3: return { label: 'ไม่เสียหาย', color: 'success' };
      case 1: return { label: 'เสียหายเล็กน้อย', color: 'warning' };
      case 0: return { label: 'เสียหายมาก', color: 'error' };
      default: return { label: 'ไม่ระบุ', color: 'default' };
    }
  };

  // Get total score color
  const getTotalScoreColor = (score: number) => {
    if (score > 9) return 'success';
    if (score >= 8) return 'warning';
    if (score >= 0) return 'error';
    return 'error';
  };

  // Get evaluation status based on percentage
  const getEvaluationStatus = (score: number) => {
    const percentage = (score / 10) * 100;
    if (percentage > 90) {
      return { label: 'ผ่าน', color: 'success', percentage };
    } else if (percentage >= 80 && percentage <= 90) {
      return { label: 'ต้องปรับปรุง', color: 'warning', percentage };
    } else {
      return { label: 'ไม่ผ่าน', color: 'error', percentage };
    }
  };

  // Get site display
  const getSiteDisplay = (site: string) => {
    switch (site) {
      case 'psc': return 'PSC';
      case 'ps': return 'PS';
      default: return site?.toUpperCase() || 'ไม่ระบุ';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionProps={{
        // ล้างข้อมูลหลัง dialog ปิด เพื่อไม่ให้เห็น modal ว่างก่อนปิด
        onExited: () => {
          setEvaluation(null);
          setLoading(false);
        }
      }}
      keepMounted
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          height: fullScreen ? '100vh' : 'auto',
          maxHeight: fullScreen ? '100vh' : '90vh',
          m: fullScreen ? 0 : 2,
          borderRadius: fullScreen ? 0 : 2,
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            รายละเอียดการประเมิน
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{
        pt: 3,
        pb: 2,
        px: { xs: 2, sm: 3 },
        flex: 1,
        overflow: 'auto'
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !evaluation ? (
          <Alert severity="error">ไม่พบข้อมูลการประเมิน</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Basic Information */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon fontSize="small" />
                  ข้อมูลพื้นฐาน
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TruckIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">ทะเบียนรถ:</Typography>
                    <Typography variant="body2" fontWeight={500}>{evaluation.vehiclePlate}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">Plant:</Typography>
                    <Chip
                      label={getSiteDisplay(evaluation.site)}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, gridColumn: { xs: '1', sm: '1 / -1' } }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">ผู้รับจ้างช่วง:</Typography>
                    <Typography variant="body2" fontWeight={500}>{evaluation.contractorName}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">วันที่ประเมิน:</Typography>
                    <Typography variant="body2">{formatDate(evaluation.evaluationDate)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">ผู้ประเมิน:</Typography>
                    <Typography variant="body2">{evaluation.evaluatedBy}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Evaluation Scores */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GradeIcon fontSize="small" />
                  คะแนนการประเมิน
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: 2
                }}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {evaluation.transportType === 'international' ? 'สภาพตู้คอนเทนเนอร์ (เต็ม 3)' : 'การใช้ความร่วมมือของคนขับรถ (เต็ม 4)'}
                    </Typography>
                    <Chip
                      label={`${(evaluation.transportType === 'international' ? evaluation.containerCondition : evaluation.driverCooperation) || 0}/${evaluation.transportType === 'international' ? 3 : 4}`}
                      color={getCooperationInfo((evaluation.transportType === 'international' ? evaluation.containerCondition : evaluation.driverCooperation) || 0).color as any}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {evaluation.transportType === 'international' ? 'การตรงต่อเวลา (เต็ม 3)' : 'สภาพความพร้อมของรถขนส่ง (เต็ม 3)'}
                    </Typography>
                    <Chip
                      label={`${(evaluation.transportType === 'international' ? evaluation.punctuality : evaluation.vehicleCondition) || 0}/3`}
                      color={(evaluation.transportType === 'international'
                        ? getCooperationInfo(evaluation.punctuality || 0)
                        : getVehicleConditionInfo(evaluation.vehicleCondition || 0)
                      ).color as any}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {evaluation.transportType === 'international' ? 'ความเสียหายของสินค้า (เต็ม 4)' : 'ความเสียหายของสินค้า (เต็ม 3)'}
                    </Typography>
                    <Chip
                      label={`${(evaluation.transportType === 'international' ? evaluation.productDamage : evaluation.damageScore) || 0}/${evaluation.transportType === 'international' ? 4 : 3}`}
                      color={(evaluation.transportType === 'international'
                        ? (evaluation.productDamage === 4 ? { color: 'success' } : { color: 'error' }) // Custom logic for product damage
                        : getDamageScoreInfo(evaluation.damageScore || 0)
                      ).color as any}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Total Score */}
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    คะแนนรวม
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={`${evaluation.totalScore}/10`}
                      color={getTotalScoreColor(evaluation.totalScore) as any}
                      size="medium"
                      sx={{
                        fontSize: '1.1rem',
                        height: '40px',
                        px: 2,
                        '& .MuiChip-label': {
                          fontWeight: 600,
                          fontSize: '1.1rem'
                        }
                      }}
                    />
                    {/* Evaluation Status */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        ผลการประเมิน ({getEvaluationStatus(evaluation.totalScore).percentage.toFixed(1)}%)
                      </Typography>
                      <Chip
                        label={getEvaluationStatus(evaluation.totalScore).label}
                        color={getEvaluationStatus(evaluation.totalScore).color as any}
                        size="medium"
                        sx={{
                          fontWeight: 600,
                          px: 2,
                          '& .MuiChip-label': {
                            fontSize: '1rem'
                          }
                        }}
                      />
                      {/* Evaluation Criteria */}
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, width: '100%', maxWidth: '400px' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                          เกณฑ์การประเมิน:
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="body2" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label="ผ่าน" color="success" size="small" />
                            <span>&gt; 90%</span>
                          </Typography>
                          <Typography variant="body2" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label="ต้องปรับปรุง" color="warning" size="small" />
                            <span>80-90% </span>
                          </Typography>
                          <Typography variant="body2" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label="ไม่ผ่าน" color="error" size="small" />
                            <span>&lt; 80% </span>
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Damage Information */}
            {evaluation.damageFound && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon fontSize="small" color="warning" />
                    ข้อมูลความเสียหาย
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

                    {evaluation.transportType === 'international' ? (
                      <>
                        <Typography variant="body2" color="text.secondary">สถานะ:</Typography>
                        <Typography variant="body2" fontWeight={500} color="error">
                          สินค้าเสียหาย (คะแนน: {evaluation.productDamage})
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" color="text.secondary">มูลค่าความเสียหาย:</Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {evaluation.damageValue.toLocaleString()} บาท
                        </Typography>
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Remarks */}
            {evaluation.remark && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" />
                    หมายเหตุ
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {evaluation.remark}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{
        px: 3,
        py: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
        gap: 1
      }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          onClick={onClose}
          variant="outlined"
          size="medium"
        >
          ปิด
        </Button>
        <Button
          onClick={() => {
            router.push(`/evaluation/edit/${evaluation?.id}`);
          }}
          startIcon={<EditIcon />}
          variant="contained"
          disabled={!evaluation}
          size="medium"
        >
          แก้ไข
        </Button>

      </DialogActions>
    </Dialog >
  );
}

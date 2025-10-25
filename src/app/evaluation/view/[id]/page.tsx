'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Assessment as AssessmentIcon,
  Person as PersonIcon,
  LocalShipping as TruckIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  AttachMoney as MoneyIcon,
  Notes as NotesIcon,
  CalendarToday as CalendarIcon,
  Grade as GradeIcon,
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import Layout from '../../../components/Layout';
import { useSnackbar } from '../../../../contexts/SnackbarContext';

interface Evaluation {
  id: number;
  driverCooperation: number;
  vehicleCondition: number;
  damageFound: boolean;
  damageValue: number;
  remark: string;
  evaluatedBy: string;
  evaluationDate: string;
  totalScore: number;
  createdAt: string;
  updatedAt: string;
}

export default function ViewEvaluationPage() {
  const router = useRouter();
  const params = useParams();
  const { showSnackbar } = useSnackbar();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);

  const evaluationId = params.id as string;

  // Load evaluation data
  const loadEvaluation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/evaluation/${evaluationId}`);
      
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
      router.push('/evaluation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (evaluationId) {
      loadEvaluation();
    }
  }, [evaluationId]);

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
      case 2: return { label: 'ปานกลาง', color: 'warning' };
      case 1: return { label: 'ไม่ดี', color: 'error' };
      default: return { label: '-', color: 'default' };
    }
  };

  // Get vehicle condition info
  const getVehicleConditionInfo = (score: number) => {
    return score === 3 
      ? { label: 'สะอาด', color: 'success' }
      : { label: 'ไม่สะอาด', color: 'error' };
  };

  // Get score color
  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'info';
    if (percentage >= 40) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (!evaluation) {
    return (
      <Layout showSidebar={false}>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">ไม่พบข้อมูลแบบประเมิน</Alert>
        </Box>
      </Layout>
    );
  }

  const cooperationInfo = getCooperationInfo(evaluation.driverCooperation);
  const vehicleInfo = getVehicleConditionInfo(evaluation.vehicleCondition);

  return (
    <Layout showSidebar={false}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              onClick={() => router.push('/evaluation')}
              sx={{ 
                borderColor: 'grey.300',
                color: 'grey.700',
                '&:hover': { borderColor: 'grey.400' }
              }}
            >
              ย้อนกลับ
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon sx={{ color: 'primary.main', fontSize: 28 }} />
              <Typography variant="h5" component="h1" fontWeight="bold">
                รายละเอียดแบบประเมิน
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => router.push(`/evaluation/edit/${evaluation.id}`)}
            sx={{ 
              background: 'linear-gradient(45deg, #FF9800 30%, #FFB74D 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #F57C00 30%, #FF9800 90%)',
              }
            }}
          >
            แก้ไข
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {/* Summary Card */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 32%' }, minWidth: { xs: '100%', md: 300 } }}>
            <Card 
              elevation={0} 
              sx={{ 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <GradeIcon />
                  <Typography variant="h6" fontWeight="bold">
                    คะแนนรวม
                  </Typography>
                </Box>
                <Typography variant="h2" fontWeight="bold" sx={{ mb: 1 }}>
                  {evaluation.totalScore}/7
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  คะแนนการประเมินโดยรวม
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Basic Info Card */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 65%' }, minWidth: { xs: '100%', md: 400 } }}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <CalendarIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  ข้อมูลพื้นฐาน
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 48%' }, minWidth: { xs: '100%', sm: 200 }, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    วันที่ประเมิน
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatDate(evaluation.evaluationDate)}
                  </Typography>
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 48%' }, minWidth: { xs: '100%', sm: 200 }, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    ผู้ประเมิน
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {evaluation.evaluatedBy || 'ไม่ระบุ'}
                  </Typography>
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 48%' }, minWidth: { xs: '100%', sm: 200 }, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    สร้างเมื่อ
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(evaluation.createdAt)}
                  </Typography>
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 48%' }, minWidth: { xs: '100%', sm: 200 }, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    แก้ไขล่าสุด
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(evaluation.updatedAt)}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>

          {/* Evaluation Details */}
          <Box sx={{ width: '100%', mt: 3 }}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 4, 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200'
              }}
            >
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                รายละเอียดการประเมิน
              </Typography>

              {/* 1. การให้ความร่วมมือของคนรถ */}
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PersonIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="subtitle1" fontWeight="bold">
                    1. การให้ความร่วมมือของคนรถ
                  </Typography>
                </Box>
                <Box sx={{ pl: 4 }}>
                  <Chip
                    label={`${cooperationInfo.label} (${evaluation.driverCooperation} คะแนน)`}
                    color={cooperationInfo.color as any}
                    size="medium"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 2. สภาพความพร้อมของรถขนส่ง */}
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TruckIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="subtitle1" fontWeight="bold">
                    2. สภาพความพร้อมของรถขนส่ง
                  </Typography>
                </Box>
                <Box sx={{ pl: 4 }}>
                  <Chip
                    label={`${vehicleInfo.label} (${evaluation.vehicleCondition} คะแนน)`}
                    color={vehicleInfo.color as any}
                    size="medium"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 3. ความเสียหายของพัสดุ */}
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <WarningIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="subtitle1" fontWeight="bold">
                    3. ความเสียหายของพัสดุ
                  </Typography>
                </Box>
                <Box sx={{ pl: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Chip
                      label={evaluation.damageFound ? 'พบปัญหา' : 'ไม่พบปัญหา'}
                      color={evaluation.damageFound ? 'error' : 'success'}
                      size="medium"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                  
                  {evaluation.damageFound && evaluation.damageValue > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                      <MoneyIcon sx={{ color: 'error.main' }} />
                      <Typography variant="body1" color="error" fontWeight="bold">
                        มูลค่าความเสียหาย: {evaluation.damageValue.toLocaleString()} บาท
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* หมายเหตุ */}
              {evaluation.remark && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <NotesIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="subtitle1" fontWeight="bold">
                        หมายเหตุ
                      </Typography>
                    </Box>
                    <Box 
                      sx={{ 
                        pl: 4, 
                        p: 2, 
                        bgcolor: 'grey.50', 
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.200'
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {evaluation.remark}
                      </Typography>
                    </Box>
                  </Box>
                </>
              )}
            </Paper>
          </Box>

          {/* Score Breakdown */}
          <Box sx={{ width: '100%', mt: 3 }}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
                backgroundColor: 'grey.50'
              }}
            >
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                สรุปคะแนน
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 23%' }, minWidth: { xs: '100%', sm: 180 }, textAlign: 'center', p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    การให้ความร่วมมือ
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    {evaluation.driverCooperation}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    จาก 4 คะแนน
                  </Typography>
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 23%' }, minWidth: { xs: '100%', sm: 180 }, textAlign: 'center', p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    สภาพรถขนส่ง
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    {evaluation.vehicleCondition}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    จาก 3 คะแนน
                  </Typography>
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 23%' }, minWidth: { xs: '100%', sm: 180 }, textAlign: 'center', p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    คะแนนรวม
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {evaluation.totalScore}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    จาก 7 คะแนน
                  </Typography>
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 23%' }, minWidth: { xs: '100%', sm: 180 }, textAlign: 'center', p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    เปอร์เซ็นต์
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {Math.round((evaluation.totalScore / 7) * 100)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ประสิทธิภาพ
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
  </Box>
      </Box>
    </Layout>
  );
}

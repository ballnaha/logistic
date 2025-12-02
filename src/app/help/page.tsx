'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Alert,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  ArrowBack as BackIcon,
  Calculate as CalculateIcon,
  AttachMoney as MoneyIcon,
  LocalShipping as TruckIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Tag as TagIcon,
} from '@mui/icons-material';

import Layout from '../components/Layout';

export default function HelpPage() {
  const router = useRouter();
  const [allowanceRate, setAllowanceRate] = useState<number | null>(null);
  const [distanceRate, setDistanceRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tripFee, setTripFee] = useState<number | null>(null);
  const [freeDistanceThreshold, setFreeDistanceThreshold] = useState<number | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const [allowanceRes, distanceRes, tripFeeRes, freeDistanceRes] = await Promise.all([
          fetch('/api/settings/allowance'),
          fetch('/api/settings/distance-rate'),
          fetch('/api/settings/trip-fee'),
          fetch('/api/settings/free-distance-threshold'),
        ]);

        // Parse only if response is ok and content-type is JSON
        const parseJsonSafely = async (response: Response) => {
          if (!response.ok) return null;
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return await response.json();
          }
          return null;
        };

        const allowanceData = await parseJsonSafely(allowanceRes);
        const distanceData = await parseJsonSafely(distanceRes);
        const tripFeeData = await parseJsonSafely(tripFeeRes);
        const freeDistanceData = await parseJsonSafely(freeDistanceRes);

        if (tripFeeData?.success) {
          setTripFee(tripFeeData.data.tripFee);
        }
        if (allowanceData?.success) {
          setAllowanceRate(allowanceData.data.allowanceRate);
        }
        if (distanceData?.success) {
          setDistanceRate(distanceData.data.distanceRate);
        }
        if (freeDistanceData?.success) {
          setFreeDistanceThreshold(freeDistanceData.data.freeDistanceThreshold);
        }
      } catch (error) {
        console.error('Error fetching rates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

  return (
    <Layout showSidebar={false}>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                คู่มือการใช้งาน
              </Typography>
              
            </Box>
          </Box>
          
        </Box>

        {/* Content */}
        <Stack spacing={2}>
          
          {/* Section 1: Driver Payment Calculation */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <MoneyIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  การคำนวณเงินที่ต้องจ่ายคนขับรถ
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  เงินที่บริษัทต้องจ่ายให้กับคนขับรถคิดเป็นรายเดือน คำนวณจาก:
                </Typography>

                <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.main' }}>
                  <Typography variant="body2" fontWeight={600} color="primary.main" textAlign="center" gutterBottom>
                    สูตรการคำนวณ
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={600} textAlign="center">
                    เงินจ่ายคนขับ = ค่าเบี้ยเลี้ยง + ค่าพัสดุ + ค่าระยะทาง + ค่าเที่ยว
                  </Typography>
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        ค่าเบี้ยเลี้ยง
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        เงินค่าเบี้ยเลี้ยงสำหรับคนขับในแต่ละเที่ยว จ่ายวันละ{' '}
                        <strong>{allowanceRate ? allowanceRate.toLocaleString() : '150'} บาท</strong>
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        ค่าพัสดุ
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ค่าใช้จ่ายเกี่ยวกับการจัดการพัสดุที่นำกลับ
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        ค่าระยะทาง
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ค่าใช้จ่ายตามระยะทางไปหาลูกค้า โดย 0-{freeDistanceThreshold ? freeDistanceThreshold.toLocaleString() : '1,500'} กม.แรก ไม่คิดค่าระยะทาง และ ตั้งแต่{' '}
                        {freeDistanceThreshold ? (freeDistanceThreshold + 1).toLocaleString() : '1,501'} กม.ขึ้นไป คิดจากระยะทางจากระบบ x{' '}
                        <strong>{distanceRate ? distanceRate.toLocaleString() : '1.2'} บาท/กม.</strong>
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        ค่าเที่ยว
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ค่าใช้จ่ายเหมาจ่ายต่อเที่ยว จ่ายคนขับเที่ยวละ{' '}
                        <strong>{tripFee ? tripFee.toLocaleString() : '30'} บาท</strong>
                      </Typography>
                    </Box>
                  </Stack>
                )}

              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Section 2: Company Expenses Calculation */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TruckIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  การคำนวณค่าใช้จ่ายบริษัท
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  ค่าใช้จ่ายที่บริษัทต้องรับผิดชอบในแต่ละเที่ยว คำนวณจาก:
                </Typography>

                <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.main' }}>
                  <Typography variant="body2" fontWeight={600} color="primary.main" textAlign="center" gutterBottom>
                    สูตรการคำนวณ
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={600} textAlign="center">
                    ค่าใช้จ่ายบริษัท = ค่าน้ำมัน + ค่าทางด่วน + ค่าเช็คระยะ + ค่าซ่อมแซม
                  </Typography>
                </Box>

                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      ค่าน้ำมัน
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ค่าน้ำมันเชื้อเพลิงที่ใช้ในการเดินทางของเที่ยวนั้นๆ
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      ค่าทางด่วน
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ค่าใช้จ่ายในการผ่านทางด่วนหรือทางพิเศษต่างๆ
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      ค่าเช็คระยะ
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ค่าบำรุงรักษาตามระยะทาง เช่น เปลี่ยนถ่ายน้ำมันเครื่อง ตรวจเช็คสภาพรถ
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      ค่าซ่อมแซม
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ค่าใช้จ่ายในการซ่อมแซมหรือแก้ไขปัญหาที่เกิดขึ้นระหว่างเดินทาง
                    </Typography>
                  </Box>
                </Stack>

                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>หมายเหตุ:</strong> ค่าใช้จ่ายเหล่านี้เป็นต้นทุนที่บริษัทต้องรับผิดชอบ และไม่รวมอยู่ในเงินที่จ่ายให้คนขับรถ
                  </Typography>
                </Alert>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Section 3: Condition Add ID */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TagIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  การตั้งรหัสลูกค้า , ผู้รับจ้างช่วง , รหัสพัสดุ
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>

                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      รหัสลูกค้า
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ถ้าเป็นลูกค้าที่ยังไม่มีในระบบ ให้ทำการตั้ง รหัสลูกค้าใหม่ โดยขึ้นต้นด้วย 9xxxx เช่น 90001
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      รหัสผู้รับจ้างช่วง
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ถ้าเป็นผู้รับจ้างช่วงที่ยังไม่มีในระบบ ให้ทำการตั้ง รหัสผู้รับจ้างช่วงใหม่ โดยขึ้นต้นด้วย 8xxxx เช่น 80001
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      รหัสพัสดุ
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ถ้าต้องการเพิ่มรหัสพัสดุ ที่ยังไม่มีในระบบ ให้ขึ้นต้นด้วย 0x เช่น 01
                    </Typography>
                  </Box>
                  
                </Stack>

               
              </Stack>
            </AccordionDetails>
          </Accordion>

        </Stack>
      </Box>
    </Layout>
  );
}

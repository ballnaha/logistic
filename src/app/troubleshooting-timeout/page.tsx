'use client';
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  Timer as TimerIcon,
  Wifi as WifiIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';

export default function TroubleshootingTimeoutPage() {
  const timeoutIssues = [
    {
      issue: 'การเรียกข้อมูลลูกค้าจาก SQL Server',
      timeout: '15 วินาที',
      symptoms: ['โหลดรายการลูกค้าช้า', 'แสดง "การเชื่อมต่อหมดเวลา" เมื่อเปิดหน้า Customer'],
      icon: <StorageIcon color="warning" />,
      solutions: [
        'ตรวจสอบการเชื่อมต่อ SQL Server',
        'เพิ่มประสิทธิภาพ database index',
        'ลดจำนวนข้อมูลที่ดึงมาครั้งละครั้ง'
      ]
    },
    {
      issue: 'การค้นหาพิกัด (Geocoding API)',
      timeout: '15 วินาที',
      symptoms: ['ปุ่ม "ค้นหาพิกัด" ค้างนาน', 'แสดง "การค้นหาหมดเวลา"'],
      icon: <CloudIcon color="info" />,
      solutions: [
        'ใช้ที่อยู่ที่สั้นและชัดเจน',
        'ตรวจสอบ Google Maps API key',
        'ระบบจะใช้ OpenStreetMap เป็น fallback'
      ]
    },
    {
      issue: 'การคำนวณระยะทาง (Distance API)',
      timeout: '10 วินาที',
      symptoms: ['คำนวณระยะทางช้า', 'แสดงระยะทางแบบเส้นตรง'],
      icon: <SpeedIcon color="success" />,
      solutions: [
        'ระบบจะใช้ Haversine formula เป็น fallback',
        'ตรวจสอบ Google Distance Matrix API',
        'ระยะทางจาก fallback ยังแม่นยำ ±10%'
      ]
    },
    {
      issue: 'การบันทึกข้อมูลลูกค้า',
      timeout: '20 วินาที',
      symptoms: ['บันทึกข้อมูลช้า', 'แสดง "การเชื่อมต่อหมดเวลา" เมื่อกดบันทึก'],
      icon: <StorageIcon color="error" />,
      solutions: [
        'ตรวจสอบการเชื่อมต่อ database',
        'ลองบันทึกข้อมูลใหม่อีกครั้ง',
        'ติดต่อผู้ดูแลระบบหากยังมีปัญหา'
      ]
    }
  ];

  const improvementsMade = [
    {
      title: 'เพิ่ม Timeout Management',
      description: 'กำหนดระยะเวลา timeout ที่เหมาะสมสำหรับแต่ละ API',
      icon: <TimerIcon color="primary" />
    },
    {
      title: 'AbortController',
      description: 'ใช้ AbortController เพื่อยกเลิก request ที่ใช้เวลานานเกินไป',
      icon: <CheckIcon color="success" />
    },
    {
      title: 'Fallback Mechanisms',
      description: 'มีระบบสำรองเมื่อ API หลักไม่สามารถใช้งานได้',
      icon: <WifiIcon color="info" />
    },
    {
      title: 'Error Handling',
      description: 'ปรับปรุงการแสดงข้อความ error ให้ชัดเจนยิ่งขึ้น',
      icon: <WarningIcon color="warning" />
    }
  ];

  return (
    <Layout showSidebar={false}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          แก้ไขปัญหาการเชื่อมต่อหมดเวลา
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          คู่มือแก้ไขและป้องกันปัญหา timeout ในระบบ Logistics
        </Typography>

        {/* สรุปการปรับปรุง */}
        <Alert severity="success" sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            ✅ ระบบได้รับการปรับปรุงแล้ว!
          </Typography>
          <Typography variant="body2">
            เพิ่มระบบจัดการ timeout และ fallback mechanism เพื่อลดปัญหาการเชื่อมต่อหมดเวลา
          </Typography>
        </Alert>

        {/* การปรับปรุงที่ทำ */}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            การปรับปรุงที่ทำ
          </Typography>
          <Grid container spacing={2}>
            {improvementsMade.map((improvement, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {improvement.icon}
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {improvement.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {improvement.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* รายละเอียดแต่ละปัญหา */}
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          ปัญหาที่อาจเกิดขึ้นและวิธีแก้ไข
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {timeoutIssues.map((item, index) => (
            <Paper key={index} sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {item.icon}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {item.issue}
                  </Typography>
                  <Chip 
                    label={`Timeout: ${item.timeout}`} 
                    size="small" 
                    variant="outlined" 
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'error.main' }}>
                    🚨 อาการที่พบ:
                  </Typography>
                  <List dense>
                    {item.symptoms.map((symptom, idx) => (
                      <ListItem key={idx} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <WarningIcon fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={symptom}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'success.main' }}>
                    💡 วิธีแก้ไข:
                  </Typography>
                  <List dense>
                    {item.solutions.map((solution, idx) => (
                      <ListItem key={idx} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <CheckIcon fontSize="small" color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={solution}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* คำแนะนำทั่วไป */}
        <Box sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="info" />
            คำแนะนำทั่วไป
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต"
                secondary="การเชื่อมต่อช้าอาจเป็นสาเหตุของ timeout"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="ลองรีเฟรชหน้าเว็บ"
                secondary="บางครั้งการรีเฟรชจะช่วยแก้ปัญหาชั่วคราว"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="ใช้ข้อมูลที่เรียบง่าย"
                secondary="ใช้ที่อยู่ที่สั้นและชัดเจน เพื่อลดเวลาในการประมวลผล"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="รอให้ระบบทำงาน"
                secondary="หากมี fallback ระบบจะทำงานต่อไปได้ แม้ API หลักจะช้า"
              />
            </ListItem>
          </List>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              💡 <strong>หมายเหตุ:</strong> หากยังพบปัญหาอย่างต่อเนื่อง กรุณาติดต่อผู้ดูแลระบบ 
              พร้อมระบุเวลาและรายละเอียดของปัญหาที่เกิดขึ้น
            </Typography>
          </Alert>
        </Box>
      </Box>
    </Layout>
  );
}

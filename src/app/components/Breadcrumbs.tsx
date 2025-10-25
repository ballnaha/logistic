'use client';
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Breadcrumbs as MuiBreadcrumbs,
  Typography,
  Link,
  Box,
  Chip,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  DirectionsCar as VehicleIcon,
  LocalGasStation as FuelIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Person as CustomerIcon,
  Person as PersonIcon,
  RouteOutlined as RouteOutlinedIcon,
  Assessment as ReportsIcon,
  Assessment as AssessmentIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

const Breadcrumbs: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  // กำหนด breadcrumb mapping
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      {
        label: 'หน้าหลัก',
        href: '/',
        icon: <HomeIcon sx={{ fontSize: 16 }} />,
      },
    ];

    // สร้าง breadcrumbs ตาม path segments
    let currentPath = '';
    
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;

      switch (segment) {
        case 'vehicles':
          breadcrumbs.push({
            label: 'จัดการรถ',
            href: isLast ? undefined : '/vehicles',
            icon: <VehicleIcon sx={{ fontSize: 16 }} />,
            isActive: isLast,
          });
          break;

        case 'fuel-records':
          breadcrumbs.push({
            label: 'บันทึกการเติมน้ำมัน',
            href: isLast ? undefined : '/fuel-records',
            icon: <FuelIcon sx={{ fontSize: 16 }} />,
            isActive: isLast,
          });
          break;

        case 'customers':
          breadcrumbs.push({
            label: 'ลูกค้า',
            href: isLast ? undefined : '/customers',
            icon: <CustomerIcon sx={{ fontSize: 16 }} />,
            isActive: isLast,
          });
          break;

        case 'auto-distance':
          if (segments.includes('customers')) {
            breadcrumbs.push({
              label: 'คำนวณระยะทางอัตโนมัติ',
              href: isLast ? undefined : '/customers/auto-distance',
              icon: <RouteOutlinedIcon sx={{ fontSize: 16 }} />,
              isActive: isLast,
            });
          }
          break;

        case 'users':
          breadcrumbs.push({
            label: 'ผู้ใช้งาน',
            href: isLast ? undefined : '/users',
            icon: <PersonIcon sx={{ fontSize: 16 }} />,
            isActive: isLast,
          });
          break;

        case 'drivers':
          breadcrumbs.push({
            label: 'คนขับรถ',
            href: isLast ? undefined : '/drivers',
            icon: <PersonIcon sx={{ fontSize: 16 }} />,
            isActive: isLast,
          });
          break;
        
        case 'trip-records':
          breadcrumbs.push({
            label: 'บันทึกการเดินทาง',
            href: isLast ? undefined : '/trip-records',
            icon: <RouteOutlinedIcon sx={{ fontSize: 16 }} />,
            isActive: isLast,
          });
          break;

        case 'evaluation':
          breadcrumbs.push({
            label: 'แบบประเมิน',
            href: isLast ? undefined : '/evaluation',
            icon: <AssessmentIcon sx={{ fontSize: 16 }} />,
            isActive: isLast,
          });
          break;

        case 'reports':
          breadcrumbs.push({
            label: 'รายงาน',
            href: isLast ? undefined : '/reports',
            icon: <ReportsIcon sx={{ fontSize: 16 }} />,
            isActive: false,
          });
          break;

        case 'by-vehicle':
          if (segments.includes('trip-records')) {
            breadcrumbs.push({
              label: 'รายงานการเดินทางตามรถ',
              href: isLast ? undefined : '/reports/trip-records/by-vehicle',
              icon: <ReportsIcon sx={{ fontSize: 16 }} />,
              isActive: isLast,
            });
          }
          break;

        case 'all-vehicle':
          if (segments.includes('trip-records')) {
            breadcrumbs.push({
              label: 'รายงานรถทั้งหมด',
              href: isLast ? undefined : '/reports/trip-records/all-vehicle',
              icon: <ReportsIcon sx={{ fontSize: 16 }} />,
              isActive: isLast,
            });
          }
          break;
        
        case 'reports-fuel-records':
          if (segments.includes('reports')) {
            breadcrumbs.push({
              label: 'รายงานการเติมน้ำมัน',
              href: isLast ? undefined : '/reports/fuel-records',
              icon: <ReportsIcon sx={{ fontSize: 16 }} />,
              isActive: isLast,
            });
          }
          break;
        
        case 'reports-driver':
          if (segments.includes('reports')) {
            breadcrumbs.push({
              label: 'รายงานคนขับรถ',
              href: isLast ? undefined : '/reports/reports-driver',
              icon: <ReportsIcon sx={{ fontSize: 16 }} />,
              isActive: isLast,
            });
          }
          break;

        case 'items':
          breadcrumbs.push({
            label: 'พัสดุ',
            href: isLast ? undefined : '/items',
            icon: <InventoryIcon sx={{ fontSize: 16 }} />,
            isActive: isLast,
          });
          break;
        
        case 'report':
          breadcrumbs.push({
            label: 'รายงานแบบประเมิน',
            href: isLast ? undefined : '/evaluation/report',
            icon: <ReportsIcon sx={{ fontSize: 16 }} />,
            isActive: isLast,
          });
          break;

        case 'allowance':
          breadcrumbs.push({
            label: 'ค่าเบี้ยเลี้ยง',
            href: isLast ? undefined : '/settings/allowance',
            icon: <ReportsIcon sx={{ fontSize: 16 }} />,
            isActive: isLast,
          });
          break;

        case 'distance-rate':
          breadcrumbs.push({
            label: 'ค่าระยะทาง',
            href: isLast ? undefined : '/settings/distance-rate',
            icon: <ReportsIcon sx={{ fontSize: 16 }} />,
            isActive: isLast,
          });
        break;

        case 'settings':
          breadcrumbs.push({
            label: 'ตั้งค่าระบบ',
            href: isLast ? undefined : '/settings',
            icon: <ReportsIcon sx={{ fontSize: 16 }} />,
            isActive: isLast,
          });
          break;

        case 'add':
          // ตรวจสอบ parent path เพื่อกำหนด label ที่เหมาะสม
          const parentPath = segments[index - 1];
            breadcrumbs.push({
              label: 'เพิ่มข้อมูล',
              icon: <AddIcon sx={{ fontSize: 16 }} />,
              isActive: true,
            });
          
          break;
          
        case 'edit':
          // ตรวจสอบ parent path เพื่อกำหนด label ที่เหมาะสม
          const editParentPath = segments[index - 2]; // skip ID segment

            breadcrumbs.push({
              label: 'แก้ไขข้อมูล',
              icon: <EditIcon sx={{ fontSize: 16 }} />,
              isActive: true,
            });
          
          break;
          
          
        default:
          // สำหรับ dynamic segments เช่น ID
          if (/^\d+$/.test(segment)) {
            // ถ้าเป็นตัวเลข (ID) ไม่ต้องแสดงใน breadcrumb
            return;
          }
          
          breadcrumbs.push({
            label: segment,
            href: isLast ? undefined : currentPath,
            isActive: isLast,
          });
          break;
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // ไม่แสดง breadcrumb ถ้าอยู่ที่หน้าหลัก
  if (pathname === '/') {
    return null;
  }

  const handleBreadcrumbClick = (href: string) => {
    router.push(href);
  };

  return (
    <Box
      sx={{
        py: 1.5,
        px: 0,
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fafafa',
        mb: 2,
      }}
    >
      <MuiBreadcrumbs
        separator={<NavigateNextIcon fontSize="small" sx={{ color: '#999' }} />}
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            mx: 1,
          },
        }}
      >
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          if (isLast || !item.href) {
            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                {item.icon}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: item.isActive ? 600 : 400,
                    color: item.isActive ? 'primary.main' : 'text.primary',
                    fontSize: '0.875rem',
                  }}
                >
                  {item.label}
                </Typography>
                
              </Box>
            );
          }

          return (
            <Link
              key={index}
              component="button"
              variant="body2"
              onClick={() => handleBreadcrumbClick(item.href!)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                textDecoration: 'none',
                color: 'text.secondary',
                fontSize: '0.875rem',
                '&:hover': {
                  color: 'primary.main',
                  textDecoration: 'underline',
                },
                '&:focus': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                  borderRadius: 1,
                },
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                p: 0.5,
                borderRadius: 1,
                transition: 'all 0.2s ease',
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};

export default Breadcrumbs;

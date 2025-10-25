'use client';
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Avatar,
  Divider,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
} from '@mui/icons-material';
import ColorChip from '../../components/ColorChip';

interface Vehicle {
  id: number;
  licensePlate?: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  engineNumber?: string;
  chassisNumber?: string;
  vehicleType: string;
  fuelType?: string;
  capacity?: number;
  weight?: number;
  registrationDate?: string;
  insuranceExpiry?: string;
  taxExpiry?: string;
  inspectionExpiry?: string;
  status?: string;
  notes?: string;
  isActive: boolean;
  // คนขับหลัก
  driverName?: string;
  driverLicense?: string;
  driverImage?: string;
  // คนขับรอง
  backupDriverName?: string;
  backupDriverLicense?: string;
  backupDriverImage?: string;
  // รูปภาพ
  carImage?: string;
  fuelConsume?: number;
  fuelTank?: number;
  fuelConsumeMth?: number;
  remark?: string;
  owner: {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface VehicleMobileCardProps {
  vehicle: Vehicle;
  onView?: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onToggleStatus: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
  onToggleActiveStatus?: (vehicle: Vehicle) => void;
  canDelete?: boolean;
  togglingStatus?: number | null;
  usageInfo?: {
    isInUse: boolean;
    canDelete: boolean;
    tripRecordsCount: number;
    fuelRecordsCount: number;
  };
}

const VehicleMobileCard: React.FC<VehicleMobileCardProps> = ({
  vehicle,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  onToggleActiveStatus,
  canDelete = false,
  togglingStatus = null,
  usageInfo,
}) => {
  // ฟังก์ชันสำหรับจัดการ URL รูปภาพ
  const getImageUrl = (url: string) => {
    if (!url) return url;
    
    // หาก URL เป็น blob: (preview) ให้ใช้เลย
    if (url.startsWith('blob:')) {
      return url;
    }
    
    // หาก URL เป็น /uploads/... ในโหมด production ให้ใช้ API เลย
    if (url.startsWith('/uploads/')) {
      if (process.env.NODE_ENV === 'production') {
        return `/api/serve-image?path=${encodeURIComponent(url)}`;
      } else {
        return url;
      }
    }
    
    return url;
  };
  const getVehicleIcon = (type: string) => {
    // ใช้รูปภาพเหมือนหน้าหลัก
    switch (type) {
      case 'ForkLift':
        return (
          <Typography sx={{ fontSize: 32, lineHeight: 1 }}>
            <img src="/images/icon-forklift.png" alt="Forklift" width={32} height={32} />
          </Typography>
        );
      case 'Pickup':
        return (
          <Typography sx={{ fontSize: 32, lineHeight: 1 }}>
            <img src="/images/icon-pickup.png" alt="PickUp" width={32} height={32} />
          </Typography>
        );
      case 'Truck':
        return (
          <Typography sx={{ fontSize: 32, lineHeight: 1 }}>
            <img src="/images/icon-truck.png" alt="Truck" width={32} height={32} />
          </Typography>
        );
      default:
        return (
          <Typography sx={{ fontSize: 32, lineHeight: 1 }}>
            <img src="/images/icon-car.png" alt="Car" width={32} height={32} />
          </Typography>
        );
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'default';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Truck':
        return '#1976d2';
      case 'ForkLift':
        return '#ed6c02';
      case 'Pickup':
        return '#2e7d32';
      default:
        return '#757575';
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2,
        border: '1px solid #e0e0e0',
        '&:hover': {
          boxShadow: (theme) => theme.shadows[4],
          borderColor: 'primary.main',
        },
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header with vehicle icon and actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: 'transparent',
              width: 48,
              height: 48,
              border: '2px solid #e0e0e0',
            }}
          >
            {vehicle.carImage ? (
              <img
                src={getImageUrl(vehicle.carImage)}
                alt={`${vehicle.brand} ${vehicle.model}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                onError={(e) => {
                  console.error('❌ Mobile car image load error:', vehicle.carImage);
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
                onLoad={() => {
                  console.log('✅ Mobile car image loaded successfully:', vehicle.carImage);
                }}
              />
            ) : null}
            <Box sx={{ display: vehicle.carImage ? 'none' : 'block' }}>
              {getVehicleIcon(vehicle.vehicleType)}
            </Box>
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem', lineHeight: 1.2 }}>
              {vehicle.brand} {vehicle.model}
            </Typography>
            {vehicle.licensePlate && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                ทะเบียน: {vehicle.licensePlate}
              </Typography>
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onView && (
            <IconButton
              onClick={() => onView(vehicle)}
              color="info"
              size="small"
              sx={{ 
                '&:hover': { 
                  backgroundColor: 'rgba(2, 136, 209, 0.08)' 
                } 
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton
            onClick={() => onEdit(vehicle)}
            color="primary"
            size="small"
            sx={{ 
              '&:hover': { 
                backgroundColor: 'rgba(25, 118, 210, 0.08)' 
              } 
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>

          {/* isActive Toggle Button */}
          {onToggleActiveStatus && (
            <Tooltip title={vehicle.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'} arrow>
              <IconButton
                disabled={togglingStatus === vehicle.id}
                onClick={() => onToggleActiveStatus(vehicle)}
                color={vehicle.isActive ? "warning" : "success"}
                size="small"
                sx={{ 
                  '&:hover': { 
                    backgroundColor: vehicle.isActive 
                      ? 'rgba(237, 108, 2, 0.08)'
                      : 'rgba(46, 125, 50, 0.08)'
                  } 
                }}
              >
                {togglingStatus === vehicle.id ? (
                  <CircularProgress size={20} color="inherit" />
                ) : vehicle.isActive ? (
                  <ToggleOffIcon fontSize="small" />
                ) : (
                  <ToggleOnIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          )}

          {/* แสดงปุ่มที่เหมาะสมตามสถานะและการใช้งาน */}
          {(() => {
            const isInUse = usageInfo?.isInUse ?? false;
            
            // แสดงเฉพาะปุ่มลบจริง (Hard Delete) สำหรับรถที่ยังไม่ถูกใช้งาน
            if (canDelete && !isInUse && onDelete) {
              return (
                <Tooltip title="ลบรถถาวร (ลบข้อมูลและรูปภาพทั้งหมด)" arrow>
                  <IconButton
                    onClick={() => onDelete(vehicle)}
                    color="error"
                    size="small"
                    sx={{ 
                      '&:hover': { 
                        backgroundColor: 'rgba(211, 47, 47, 0.08)'
                      } 
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              );
            }
            
            // สำหรับรถที่ใช้งานแล้ว ให้ใช้ toggle button แทน
            return null;
          })()}
        </Box>
      </Box>

      {/* Vehicle details */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Chip
          label={vehicle.vehicleType}
          size="small"
          sx={{
            backgroundColor: getTypeColor(vehicle.vehicleType),
            color: 'white',
            fontWeight: 500,
            fontSize: '0.75rem',
          }}
        />
        <Chip
          label={vehicle.isActive ? 'ใช้งานอยู่' : 'ยกเลิกใช้งาน'}
          size="small"
          color={getStatusColor(vehicle.isActive)}
          sx={{ fontWeight: 500, fontSize: '0.75rem' }}
        />
        <ColorChip color={vehicle.color || ''} size="small" />
      </Box>

      {/* Additional details */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

        
        {vehicle.fuelConsume && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              การใช้น้ำมัน:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {vehicle.fuelConsume} กม./ลิตร
            </Typography>
          </Box>
        )}
        
        {vehicle.weight && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              น้ำหนัก:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {vehicle.weight} กก.
            </Typography>
          </Box>
        )}

        {(vehicle.driverName || vehicle.backupDriverName) && (
          <>
            <Divider sx={{ my: 1 }} />
            
            {/* คนขับหลัก */}
            {vehicle.driverName && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  คนขับหลัก:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {vehicle.driverImage && (
                    <Avatar
                      src={getImageUrl(vehicle.driverImage)}
                      sx={{ width: 28, height: 28 }}
                      onError={(e) => {
                        console.error('❌ Mobile driver image load error:', vehicle.driverImage);
                      }}
                      onLoad={() => {
                        console.log('✅ Mobile driver image loaded successfully:', vehicle.driverImage);
                      }}
                    />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {vehicle.driverName}
                  </Typography>
                </Box>
              </Box>
            )}
            
            {/* คนขับรอง */}
            {vehicle.backupDriverName && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  คนขับรอง:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {vehicle.backupDriverImage && (
                    <Avatar
                      src={getImageUrl(vehicle.backupDriverImage)}
                      sx={{ width: 24, height: 24 }}
                      onError={(e) => {
                        console.error('❌ Mobile backup driver image load error:', vehicle.backupDriverImage);
                      }}
                      onLoad={() => {
                        console.log('✅ Mobile backup driver image loaded successfully:', vehicle.backupDriverImage);
                      }}
                    />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                    {vehicle.backupDriverName}
                  </Typography>
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>
    </Paper>
  );
};

export default VehicleMobileCard;

'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  Collapse,
  IconButton,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  Search as SearchIcon,
  ExpandLess,
  ExpandMore,
  Clear as ClearIcon,
} from '@mui/icons-material';
import ColorChip from '../../../../components/ColorChip';
import { useNavigation } from '../../../components/NavigationContext';

interface Vehicle {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
  vehicleType: string;
  color?: string;
  driverName?: string;
  carImage?: string;
}

interface ReportSidebarProps {
  selectedVehicleId: string;
  onVehicleSelect: (vehicleId: string) => void;
}

interface VehicleGroup {
  type: string;
  vehicles: Vehicle[];
  icon: React.ReactNode;
  color: string;
}

const ReportSidebar: React.FC<ReportSidebarProps> = ({
  selectedVehicleId,
  onVehicleSelect,
}) => {
  const { isNavExpanded } = useNavigation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({
    ForkLift: true,
    Truck: true,
    Pickup: true,
    Car: true,
  });

  // Fetch vehicles
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vehicles?status=active&limit=100');
      const result = await response.json();
      
      if (result.success) {
        setVehicles(result.data);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const getVehicleIcon = (type: string, size: number = 24) => {
    switch (type) {
      case 'ForkLift':
        return <img src="/images/icon-forklift.png" alt="Forklift" width={size} height={size} />;
      case 'Pickup':
        return <img src="/images/icon-pickup.png" alt="PickUp" width={size} height={size} />;
      case 'Truck':
        return <img src="/images/icon-truck.png" alt="Truck" width={size} height={size} />;
      default:
        return <img src="/images/icon-car.png" alt="Car" width={size} height={size} />;
    }
  };

  const getVehicleTypeColor = (type: string) => {
    switch (type) {
      case 'ForkLift':
        return '#FF9800';
      case 'Truck':
        return '#2196F3';
      case 'Pickup':
        return '#4CAF50';
      default:
        return '#9C27B0';
    }
  };

  const getVehicleTypeName = (type: string) => {
    switch (type) {
      case 'ForkLift':
        return 'รถโฟล์คลิฟท์';
      case 'Truck':
        return 'รถบรรทุก';
      case 'Pickup':
        return 'รถกระบะ';
      default:
        return 'รถยนต์';
    }
  };

  // Filter vehicles by search term
  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vehicle.driverName && vehicle.driverName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group vehicles by type
  const vehicleGroups: VehicleGroup[] = [
    {
      type: 'ForkLift',
      vehicles: filteredVehicles.filter(v => v.vehicleType === 'ForkLift'),
      icon: getVehicleIcon('ForkLift'),
      color: getVehicleTypeColor('ForkLift'),
    },
    {
      type: 'Truck',
      vehicles: filteredVehicles.filter(v => v.vehicleType === 'Truck'),
      icon: getVehicleIcon('Truck'),
      color: getVehicleTypeColor('Truck'),
    },
    {
      type: 'Pickup',
      vehicles: filteredVehicles.filter(v => v.vehicleType === 'Pickup'),
      icon: getVehicleIcon('Pickup'),
      color: getVehicleTypeColor('Pickup'),
    },
    {
      type: 'Car',
      vehicles: filteredVehicles.filter(v => !['ForkLift', 'Truck', 'Pickup'].includes(v.vehicleType)),
      icon: getVehicleIcon('Car'),
      color: getVehicleTypeColor('Car'),
    },
  ].filter(group => group.vehicles.length > 0);

  const toggleGroup = (groupType: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupType]: !prev[groupType],
    }));
  };

  const handleVehicleClick = (vehicleId: number) => {
    const newSelectedId = vehicleId.toString();
    onVehicleSelect(selectedVehicleId === newSelectedId ? '' : newSelectedId);
  };

  const clearSelection = () => {
    onVehicleSelect('');
  };

  return (
    <Box sx={{ 
      width: 280, 
      height: '100vh', 
      backgroundColor: '#1a1a1a', 
      color: 'white',
      borderRight: '1px solid #333',
      position: 'fixed',
      left: isNavExpanded ? 240 : 70,
      top: 0,
      transition: 'left 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 1000
    }}>
      {/* Search */}
      <Box sx={{ p: 1.5 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="ค้นหาทะเบียน, ยี่ห้อ, คนขับ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#999', fontSize: '1.25rem' }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchTerm('')}
                  sx={{ color: 'grey.400' }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
            sx: {
              backgroundColor: '#2c2c2c',
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '& input': {
                color: 'white',
                fontSize: '0.875rem',
                '&::placeholder': {
                  color: '#999',
                  opacity: 1,
                },
              },
            }
          }}
        />
      </Box>

      {/* Selected Vehicle Info */}
      {selectedVehicleId && (
        <Box sx={{ px: 1.5 }}>
          <Paper sx={{ 
            p: 1.5, 
            bgcolor: '#2c2c2c', 
            color: 'white',
            border: '1px solid #4CAF50',
            borderRadius: 2
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="#4CAF50" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                รถที่เลือก
              </Typography>
              <IconButton
                size="small"
                onClick={clearSelection}
                sx={{ color: 'grey.400', p: 0.5 }}
              >
                <ClearIcon sx={{ fontSize: '16px' }} />
              </IconButton>
            </Box>
            {(() => {
              const selectedVehicle = vehicles.find(v => v.id.toString() === selectedVehicleId);
              return selectedVehicle ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ flexShrink: 0 }}>
                    {selectedVehicle.carImage ? (
                      <Avatar
                        src={selectedVehicle.carImage}
                        sx={{ width: 40, height: 40 }}
                        variant="rounded"
                      />
                    ) : (
                      <Box sx={{
                        width: 40,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'grey.700',
                        borderRadius: 1
                      }}>
                        {getVehicleIcon(selectedVehicle.vehicleType, 16)}
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.2 }} noWrap>
                      {selectedVehicle.licensePlate}
                    </Typography>
                    <Typography variant="caption" color="grey.400" sx={{ fontSize: '0.75rem', lineHeight: 1.1 }} noWrap>
                      {selectedVehicle.brand} {selectedVehicle.model}
                    </Typography>
                  </Box>
                </Box>
              ) : null;
            })()}
          </Paper>
        </Box>
      )}

      {/* Scrollable Content */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={40} sx={{ color: 'grey.400' }} />
          </Box>
        ) : vehicleGroups.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="grey.400">
              {searchTerm ? 'ไม่พบรถที่ค้นหา' : 'ไม่มีรถในระบบ'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {vehicleGroups.map((group, groupIndex) => (
              <Box key={group.type}>
                {/* Group Header */}
                <ListItemButton
                  onClick={() => toggleGroup(group.type)}
                  sx={{
                    py: 1.25,
                    px: 0,
                    bgcolor: '#2c2c2c',
                    borderRadius: 2,
                    mb: 1,
                    '&:hover': {
                      bgcolor: '#333',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {group.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {getVehicleTypeName(group.type)}
                        </Typography>
                        <Chip
                          label={group.vehicles.length}
                          size="small"
                          sx={{
                            bgcolor: group.color,
                            color: 'white',
                            fontSize: '0.7rem',
                            height: 18,
                            minWidth: 18,
                          }}
                        />
                      </Box>
                    }
                  />
                  {expandedGroups[group.type] ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>

                {/* Vehicles in Group */}
                <Collapse in={expandedGroups[group.type]} timeout="auto" unmountOnExit>
                  <List sx={{ py: 0, pl: 1.5 }}>
                    {group.vehicles.map((vehicle) => {
                      const isSelected = vehicle.id.toString() === selectedVehicleId;
                      return (
                        <ListItem key={vehicle.id} sx={{ py: 0 }}>
                          <ListItemButton
                            onClick={() => handleVehicleClick(vehicle.id)}
                            sx={{
                              py: 0.75,
                              px: 1,
                              borderRadius: 1.5,
                              bgcolor: isSelected ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                              border: isSelected ? '1px solid #4CAF50' : '1px solid transparent',
                              mb: 0.5,
                              minHeight: 'auto',
                              '&:hover': {
                                bgcolor: isSelected ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              {vehicle.carImage ? (
                                <Avatar
                                  src={vehicle.carImage}
                                  sx={{ width: 40, height: 40 }}
                                  variant="rounded"
                                />
                              ) : (
                                <Box sx={{
                                  width: 40,
                                  height: 40,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: 'grey.700',
                                  borderRadius: 1,
                                  
                                }}>
                                  {getVehicleIcon(vehicle.vehicleType, 14)}
                                </Box>
                              )}
                            </ListItemIcon>
                            
                            <Box sx={{ flex: 1, minWidth: 0, paddingLeft: 1 }}>
                              {/* ทะเบียนรถ */}
                              <Typography variant="body2" sx={{ 
                                fontWeight: isSelected ? 600 : 500,
                                color: isSelected ? '#4CAF50' : 'white',
                                fontSize: '0.8rem',
                                lineHeight: 1.2,
                                mb: 0.5
                              }} noWrap>
                                {vehicle.licensePlate}
                              </Typography>
                              
                              {/* ยี่ห้อ-รุ่น และคนขับในบรรทัดเดียว */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption" color="grey.400" sx={{ 
                                  fontSize: '0.7rem',
                                  lineHeight: 1.1,
                                  flex: 1,
                                  minWidth: 0
                                }} noWrap>
                                  {vehicle.brand} {vehicle.model}
                                </Typography>
                                
                                {vehicle.color && (
                                  <Box sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    bgcolor: getVehicleTypeColor(vehicle.vehicleType),
                                    border: '1px solid #444',
                                    flexShrink: 0
                                  }} />
                                )}
                              </Box>
                              
                              {/* คนขับ (ถ้ามี) */}
                              {vehicle.driverName && (
                                <Typography variant="caption" color="grey.500" sx={{ 
                                  fontSize: '0.65rem',
                                  lineHeight: 1.1,
                                  display: 'block',
                                  mt: 0.25
                                }} noWrap>
                                  👤 {vehicle.driverName}
                                </Typography>
                              )}
                            </Box>
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                </Collapse>
              </Box>
            ))}
          </List>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ p: 1.5, borderTop: '1px solid #333' }}>
        <Typography variant="caption" color="grey.500" sx={{ textAlign: 'center', display: 'block' }}>
          รวม {vehicles.length} คัน
        </Typography>
      </Box>
    </Box>
  );
};

export default ReportSidebar;

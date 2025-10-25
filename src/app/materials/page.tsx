'use client';
import React, { useState, useEffect } from 'react';
import DynamicLayout from '../components/DynamicLayout';
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,

  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Refresh,
  Storage,
} from '@mui/icons-material';

interface Material {
  mat_id: number;
  mat_code: string | null;
  mat_name_en: string | null;
  mat_name_th: string | null;
  flg: string | null;
  created_user: string | null;
  lastupdated_user: string | null;
  created_date: Date | null;
  lastupdated_date: Date | null;
  matgroup_id: number | null;
  matgroup_m?: {
    matgroup_id: number;
    matgroup_code: string | null;
    matgroup_name_en: string | null;
    matgroup_name_th: string | null;
  } | null;
}

interface MaterialGroup {
  matgroup_id: number;
  matgroup_code: string | null;
  matgroup_name_en: string | null;
  matgroup_name_th: string | null;
  _count: {
    material_m: number;
  };
}

interface MaterialForm {
  materialCode: string;
  materialNameTh: string;
  materialNameEn: string;
  description: string;
  unit: string;
  price: string;
  cost: string;
  stockQty: string;
  minStock: string;
  maxStock: string;
  sourceMaterialId: string; // อ้างอิงจาก SQL Server material
  sourceGroupId: string;    // อ้างอิงจาก SQL Server group
}

export default function MaterialMasterPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialGroups, setMaterialGroups] = useState<MaterialGroup[]>([]);
  const [dropdownMaterials, setDropdownMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [matgroupFilter, setMatgroupFilter] = useState('');
  
  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState<MaterialForm>({
    materialCode: '',
    materialNameTh: '',
    materialNameEn: '',
    description: '',
    unit: '',
    price: '',
    cost: '',
    stockQty: '0',
    minStock: '0',
    maxStock: '0',
    sourceMaterialId: '',
    sourceGroupId: '',
  });

  // โหลดข้อมูล Materials จาก SQL Server
  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: searchTerm,
        matgroup_id: matgroupFilter,
        source: 'sqlserver', // ระบุให้ดึงจาก SQL Server
      });

      const response = await fetch(`/api/materials?${params}`);
      const result = await response.json();

      if (result.success) {
        setMaterials(result.data);
        setTotalPages(result.pagination.pages);
        setTotal(result.pagination.total);
        
        // อัปเดต material groups ถ้ามีข้อมูล
        if (result.materialGroups && result.materialGroups.length > 0) {
          setMaterialGroups(result.materialGroups);
        }
      } else {
        setError(result.error || 'Failed to fetch materials');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  // โหลดข้อมูล Material Groups แยก (เผื่อต้องการ refresh)
  const fetchMaterialGroups = async () => {
    try {
      const response = await fetch('/api/materials?limit=1'); // ดึงแค่ page แรกเพื่อให้ได้ materialGroups
      const result = await response.json();

      if (result.success && result.materialGroups) {
        setMaterialGroups(result.materialGroups);
      }
    } catch (err) {
      console.error('Error fetching material groups:', err);
    }
  };

  // โหลดข้อมูล Materials สำหรับ dropdown
  const fetchDropdownMaterials = async () => {
    try {
      const response = await fetch('/api/materials/dropdown');
      const result = await response.json();

      if (result.success) {
        setDropdownMaterials(result.materials);
        if (result.materialGroups && materialGroups.length === 0) {
          setMaterialGroups(result.materialGroups);
        }
      }
    } catch (err) {
      console.error('Error fetching dropdown materials:', err);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [page, searchTerm, matgroupFilter]);

  useEffect(() => {
    // โหลด dropdown materials และ material groups ในครั้งแรก
    fetchDropdownMaterials();
  }, []);

  // เปิด Dialog สำหรับสร้างจาก SQL Server material
  const handleOpenDialog = (material?: Material) => {
    if (material) {
      // เมื่อเลือก material จาก SQL Server มาสร้างใหม่
      setEditingMaterial(material);
      setFormData({
        materialCode: material.mat_code || '',
        materialNameTh: material.mat_name_th || '',
        materialNameEn: material.mat_name_en || '',
        description: '',
        unit: '',
        price: '',
        cost: '',
        stockQty: '0',
        minStock: '0',
        maxStock: '0',
        sourceMaterialId: material.mat_id?.toString() || '',
        sourceGroupId: material.matgroup_id?.toString() || '',
      });
    } else {
      setEditingMaterial(null);
      setFormData({
        materialCode: '',
        materialNameTh: '',
        materialNameEn: '',
        description: '',
        unit: '',
        price: '',
        cost: '',
        stockQty: '0',
        minStock: '0',
        maxStock: '0',
        sourceMaterialId: '',
        sourceGroupId: '',
      });
    }
    setDialogOpen(true);
  };

  // ปิด Dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMaterial(null);
    setError('');
    setSuccess('');
  };

  // บันทึกข้อมูลลง MySQL
  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          createdBy: 'admin', // ใส่ user ที่ login
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('บันทึกข้อมูลเรียบร้อยแล้ว');
        handleCloseDialog();
        // ไม่ต้อง refresh เพราะเราแสดงข้อมูลจาก SQL Server
      } else {
        setError(result.error || 'Failed to save material');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  // เลือก Material จาก dropdown
  const handleSelectMaterial = (materialId: string) => {
    const selectedMaterial = dropdownMaterials.find(m => m.mat_id?.toString() === materialId);
    if (selectedMaterial) {
      setFormData(prev => ({
        ...prev,
        materialCode: selectedMaterial.mat_code || '',
        materialNameTh: selectedMaterial.mat_name_th || '',
        materialNameEn: selectedMaterial.mat_name_en || '',
        sourceMaterialId: selectedMaterial.mat_id?.toString() || '',
        sourceGroupId: selectedMaterial.matgroup_id?.toString() || '',
      }));
    }
  };

  // Refresh ข้อมูล
  const handleRefresh = () => {
    fetchMaterials();
  };

  return (
    <DynamicLayout>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Storage sx={{ fontSize: 32, color: '#007bff' }} />
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Material Master
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: '#007bff' }}
          >
            สร้าง Material ใหม่
          </Button>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Search & Filter */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="ค้นหา"
              placeholder="รหัสวัสดุ, ชื่อภาษาอังกฤษ, หรือชื่อภาษาไทย"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>กลุ่มวัสดุ</InputLabel>
              <Select
                value={matgroupFilter}
                onChange={(e) => setMatgroupFilter(e.target.value)}
                label="กลุ่มวัสดุ"
              >
                <MenuItem value="">ทั้งหมด</MenuItem>
                {materialGroups.map((group) => (
                  <MenuItem key={group.matgroup_id} value={group.matgroup_id.toString()}>
                    {group.matgroup_code} - {group.matgroup_name_th || group.matgroup_name_en}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton onClick={handleRefresh} color="primary">
              <Refresh />
            </IconButton>
          </Box>
        </Paper>

        {/* Summary Cards */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                {total.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                วัสดุทั้งหมด
              </Typography>
            </Paper>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" color="success.main">
                {materialGroups.length.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                กลุ่มวัสดุ
              </Typography>
            </Paper>
          </Box>
        </Box>

        {/* Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>รหัสวัสดุ</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>ชื่อวัสดุ</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>กลุ่มวัสดุ</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>สถานะ</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>สร้างโดย</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>วันที่สร้าง</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : materials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  materials.map((material) => (
                    <TableRow key={material.mat_id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {material.mat_code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {material.mat_name_th || material.mat_name_en}
                          </Typography>
                          {material.mat_name_en && material.mat_name_th && (
                            <Typography variant="caption" color="text.secondary">
                              {material.mat_name_en}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {material.matgroup_m ? (
                          <Box>
                            <Typography variant="body2">
                              {material.matgroup_m.matgroup_code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {material.matgroup_m.matgroup_name_th || material.matgroup_m.matgroup_name_en}
                            </Typography>
                          </Box>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={material.flg === '1' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                          color={material.flg === '1' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{material.created_user || '-'}</TableCell>
                      <TableCell>
                        {material.created_date 
                          ? new Date(material.created_date).toLocaleDateString('th-TH')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(material)}
                            color="primary"
                            title="สร้าง Material จากข้อมูลนี้"
                          >
                            <Add />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </Paper>

        {/* Dialog สำหรับสร้าง Material ใหม่ */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
          <DialogTitle>
            {editingMaterial ? `สร้าง Material จาก: ${editingMaterial.mat_code}` : 'สร้าง Material ใหม่'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              {/* เลือก Material จาก SQL Server */}
              <Typography variant="h6" sx={{ mt: 2 }}>เลือกจาก SQL Server</Typography>
              <Autocomplete
                options={dropdownMaterials}
                getOptionLabel={(option) => 
                  `${option.mat_code} - ${option.mat_name_th || option.mat_name_en}`
                }
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {option.mat_code} - {option.mat_name_th || option.mat_name_en}
                      </Typography>
                      {option.matgroup_m && (
                        <Typography variant="caption" color="text.secondary">
                          กลุ่ม: {option.matgroup_m.matgroup_code} - {option.matgroup_m.matgroup_name_th}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
                value={dropdownMaterials.find(m => m.mat_id?.toString() === formData.sourceMaterialId) || null}
                onChange={(e, newValue) => {
                  if (newValue) {
                    handleSelectMaterial(newValue.mat_id?.toString() || '');
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      materialCode: '',
                      materialNameTh: '',
                      materialNameEn: '',
                      sourceMaterialId: '',
                      sourceGroupId: '',
                    }));
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="เลือก Material จาก SQL Server"
                    placeholder="ค้นหารหัสหรือชื่อ material..."
                    helperText="พิมพ์เพื่อค้นหา material จาก SQL Server"
                  />
                )}
                isOptionEqualToValue={(option, value) => option.mat_id === value.mat_id}
                noOptionsText="ไม่พบ Material"
                loadingText="กำลังโหลด..."
                clearText="ล้างข้อมูล"
                closeText="ปิด"
                openText="เปิด"
              />
              
              {/* ข้อมูลพื้นฐาน */}
              <Typography variant="h6" sx={{ mt: 2 }}>ข้อมูลพื้นฐาน</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="รหัส Material *"
                    fullWidth
                    value={formData.materialCode}
                    onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="หน่วย"
                    fullWidth
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="ชิ้น, กิโลกรัม, ลิตร"
                  />
                </Box>
              </Box>
              
              <TextField
                label="ชื่อ Material (ภาษาไทย) *"
                fullWidth
                value={formData.materialNameTh}
                onChange={(e) => setFormData({ ...formData, materialNameTh: e.target.value })}
              />
              
              <TextField
                label="ชื่อ Material (ภาษาอังกฤษ)"
                fullWidth
                value={formData.materialNameEn}
                onChange={(e) => setFormData({ ...formData, materialNameEn: e.target.value })}
              />
              
              <TextField
                label="คำอธิบาย"
                fullWidth
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              {/* ข้อมูลราคาและต้นทุน */}
              <Typography variant="h6" sx={{ mt: 2 }}>ราคาและต้นทุน</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="ราคาขาย"
                    type="number"
                    fullWidth
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    InputProps={{ startAdornment: '฿' }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="ต้นทุน"
                    type="number"
                    fullWidth
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    InputProps={{ startAdornment: '฿' }}
                  />
                </Box>
              </Box>

              {/* ข้อมูลสต็อก */}
              <Typography variant="h6" sx={{ mt: 2 }}>จัดการสต็อก</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="สต็อกปัจจุบัน"
                    type="number"
                    fullWidth
                    value={formData.stockQty}
                    onChange={(e) => setFormData({ ...formData, stockQty: e.target.value })}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="สต็อกต่ำสุด"
                    type="number"
                    fullWidth
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="สต็อกสูงสุด"
                    type="number"
                    fullWidth
                    value={formData.maxStock}
                    onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                  />
                </Box>
              </Box>

              {/* ข้อมูลอ้างอิง (แสดงอย่างเดียว) */}
              {editingMaterial && (
                <>
                  <Typography variant="h6" sx={{ mt: 2 }}>ข้อมูลอ้างอิง (จาก SQL Server)</Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                    <TextField
                      label="Source Material ID"
                      fullWidth
                      value={formData.sourceMaterialId}
                      disabled
                      helperText={`อ้างอิงจาก: ${editingMaterial.mat_code}`}
                    />
                    <TextField
                      label="Source Group ID"
                      fullWidth
                      value={formData.sourceGroupId}
                      disabled
                      helperText={editingMaterial.matgroup_m ? 
                        `กลุ่ม: ${editingMaterial.matgroup_m.matgroup_code}` : 'ไม่มีกลุ่ม'}
                    />
                  </Box>
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>ยกเลิก</Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={loading || !formData.materialCode || !formData.materialNameTh}
              sx={{ bgcolor: '#28a745' }}
            >
              {loading ? <CircularProgress size={20} /> : 'บันทึกลง MySQL'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DynamicLayout>
  );
}

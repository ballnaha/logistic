// Driver interfaces และ types
export interface Driver {
  id: number;
  driverName: string;
  driverLicense: string;
  driverImage?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  licenseExpiry?: string;
  remark?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateDriverRequest {
  driverName: string;
  driverLicense: string;
  driverImage?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  licenseExpiry?: string;
  remark?: string;
}

export interface UpdateDriverRequest extends Partial<CreateDriverRequest> {
  id: number;
}

export interface DriverListResponse {
  drivers: Driver[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DriverOption {
  id: number;
  driverName: string;
  driverLicense: string;
  driverImage?: string;
  isActive: boolean;
}

// Extended types สำหรับ API responses ที่ต้องการข้อมูลเพิ่มเติม
export interface DriverWithStats extends Driver {
  stats: {
    totalTrips: number;
    totalFuelRecords: number;
    lastTripDate?: string;
    lastFuelDate?: string;
  };
}

// สำหรับ dropdown selection
export interface DriverSelectOption {
  value: number;
  label: string;
  license: string;
  image?: string;
  disabled?: boolean;
}
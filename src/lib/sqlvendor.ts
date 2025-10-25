import sql from 'mssql';

// ตั้งค่าการเชื่อมต่อ SQL Server
const config = {
  server: '192.168.18.2',
  port: 52601,
  database: 'PSC_K2_PR',
  user: 'sa',
  password: 'P@ssw0rd',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Interface สำหรับข้อมูล Vendor จาก PR_M_VendorTable
export interface PR_M_VendorTable {
  VendorCode?: string;
  VendorGroup?: string;
  Name1?: string;
  Name2?: string;
  Name3?: string;
  SearchTerm?: string;
  Street4?: string;
  Street5?: string;
  District?: string;
  City?: string;
  PostalCode?: string;
  Region?: string;
  Country?: string;
  Telephone?: string;
  Fax?: string;
  Email?: string;
  Address?: string;
  TaxId?: string;
  PurchaseOrg?: string;
  OrderCurrency?: string;
  DeleteFlagPurchaseOrg?: string;
  CreateDate?: Date;
  CreateBy?: string;
  ModifiedDate?: Date;
  ModifiedBy?: string;
  ISActive?: boolean;
  MobilePhone?: string;
  [key: string]: any; // เพื่อรองรับ field อื่นๆ ที่อาจมี
}
  
let pool: sql.ConnectionPool | null = null;

export async function getSqlVendorConnection() {
  try {
    // ตรวจสอบว่า pool มีอยู่และเชื่อมต่ออยู่หรือไม่
    if (pool && pool.connected) {
      console.log('♻️ ใช้ connection pool ที่มีอยู่');
      return pool;
    }

    // หาก pool ไม่เชื่อมต่อหรือไม่มีอยู่ ให้สร้างใหม่
    if (pool && !pool.connected) {
      console.log('🔄 ปิด connection pool เก่าที่ไม่ได้เชื่อมต่อ');
      await pool.close().catch(() => {}); // ปิด connection เก่าอย่างปลอดภัย
      pool = null;
    }

    if (!pool) {
      console.log('🔧 สร้าง connection pool ใหม่สำหรับ SQL Server...');
      pool = new sql.ConnectionPool(config);
      
      // เพิ่ม event listeners สำหรับจัดการ connection events
      pool.on('connect', () => {
        console.log('✅ เชื่อมต่อ SQL Server สำเร็จ');
      });
      
      pool.on('close', () => {
        console.log('🔌 SQL Server connection ถูกปิด');
        pool = null;
      });
      
      pool.on('error', (err) => {
        console.error('❌ SQL Server connection error:', err);
        pool = null;
      });

      console.log('⏳ กำลังเชื่อมต่อไปยัง SQL Server...');
      await pool.connect();
      
      // รอสักครู่เพื่อให้ connection เสถียร
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // ตรวจสอบสถานะ connection อีกครั้ง
      if (!pool.connected) {
        throw new Error('Connection established but not in connected state');
      }
      
      console.log('🎯 Connection pool พร้อมใช้งาน');
    }
    
    return pool;
  } catch (error) {
    console.error('❌ ไม่สามารถเชื่อมต่อ SQL Server ได้:', error);
    pool = null;
    throw error;
  }
}

export async function closeSqlVendorConnection() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

// ฟังก์ชัน helper สำหรับ retry กับ connection errors
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  operationName: string = 'SQL operation'
): Promise<T> {
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      retryCount++;
      console.error(`❌ เกิดข้อผิดพลาดใน ${operationName} (ครั้งที่ ${retryCount}/${maxRetries}):`, error?.message || error);
      
      // ถ้าเป็น connection error ให้รีเซ็ต pool และลองใหม่
      const isConnectionError = error?.code === 'ECONNCLOSED' || 
                               error?.code === 'ECONNRESET' || 
                               error?.code === 'ENOTFOUND' ||
                               error?.code === 'ETIMEOUT' ||
                               error?.code === 'ECONNREFUSED' ||
                               error?.message?.includes('Connection is closed') ||
                               error?.message?.includes('Connection is not available') ||
                               !pool?.connected;
      
      if (isConnectionError && retryCount < maxRetries) {
        console.log(`🔄 กำลัง reset connection pool และลองเชื่อมต่อใหม่... (ครั้งที่ ${retryCount})`);
        pool = null;
        
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000); // exponential backoff แต่ไม่เกิน 5 วินาทีี
        console.log(`⏱️ รอ ${delay}ms ก่อนลองใหม่...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (retryCount >= maxRetries) {
        console.error(`💥 ล้มเหลวหลังจากลอง ${maxRetries} ครั้ง: ${operationName}`);
        throw error;
      }
      
      // สำหรับ error อื่นๆ ที่ไม่ใช่ connection error ให้ throw ทันที
      if (!isConnectionError) {
        console.error(`🚫 Error ที่ไม่สามารถ retry ได้: ${error?.message || error}`);
        throw error;
      }
    }
  }
  
  throw new Error(`ไม่สามารถดำเนินการ ${operationName} ได้หลังจากลองหลายครั้ง`);
}

// ฟังก์ชันทดสอบการเชื่อมต่อ SQL Server
export async function testSqlVendorConnection(): Promise<boolean> {
  try {
    return await executeWithRetry(async () => {
      const connection = await getSqlVendorConnection();
      await connection.request().query('SELECT 1 as test');
      console.log('✅ เชื่อมต่อ SQL Server สำเร็จ');
      return true;
    }, 3, 'การทดสอบการเชื่อมต่อ SQL Server');
  } catch (error) {
    console.error('❌ เชื่อมต่อ SQL Server ล้มเหลว:', error);
    return false;
  }
}

// ฟังก์ชันดึงข้อมูล vendor ทั้งหมด (distinct VendorCode)
export async function getAllVendors(search = '', page = 1, limit = 10): Promise<{
  data: PR_M_VendorTable[];
  total: number;
  totalPages: number;
  currentPage: number;
}> {
  try {
    const connection = await getSqlVendorConnection();
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const params: any = {};

    if (search) {
      whereClause += " AND (VendorCode LIKE @search OR Name1 LIKE @search OR Name2 LIKE @search OR SearchTerm LIKE @search OR Email LIKE @search)";
      params.search = `%${search}%`;
    }

    const query = `
      WITH RankedVendors AS (
        SELECT 
          VendorCode,
          VendorGroup,
          Name1,
          Name2,
          Name3,
          SearchTerm,
          Street4,
          Street5,
          District,
          City,
          PostalCode,
          Region,
          Country,
          Telephone,
          Fax,
          Email,
          Address,
          TaxId,
          PurchaseOrg,
          OrderCurrency,
          DeleteFlagPurchaseOrg,
          CreateDate,
          CreateBy,
          ModifiedDate,
          ModifiedBy,
          ISActive,
          MobilePhone,
          ROW_NUMBER() OVER (PARTITION BY VendorCode ORDER BY ModifiedDate DESC, CreateDate DESC) as rn
        FROM PR_M_VendorTable
        ${whereClause}
      )
      SELECT 
        VendorCode,
        VendorGroup,
        Name1,
        Name2,
        Name3,
        SearchTerm,
        Street4,
        Street5,
        District,
        City,
        PostalCode,
        Region,
        Country,
        Telephone,
        Fax,
        Email,
        Address,
        TaxId,
        PurchaseOrg,
        OrderCurrency,
        DeleteFlagPurchaseOrg,
        CreateDate,
        CreateBy,
        ModifiedDate,
        ModifiedBy,
        ISActive,
        MobilePhone
      FROM RankedVendors 
      WHERE rn = 1
      ORDER BY VendorCode
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT VendorCode) as total
      FROM PR_M_VendorTable
      ${whereClause}
    `;

    const request = connection.request();
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });

    const countRequest = connection.request();
    Object.keys(params).forEach(key => {
      countRequest.input(key, params[key]);
    });

    const [result, countResult] = await Promise.all([
      request.query(query),
      countRequest.query(countQuery)
    ]);

    const total = countResult.recordset[0].total;

    return {
      data: result.recordset,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    };
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูล vendors:', error);
    throw error;
  }
}

// ฟังก์ชันดึงข้อมูล vendor ตาม VendorCode
export async function getVendorByCode(vendorCode: string): Promise<PR_M_VendorTable | null> {
  try {
    const connection = await getSqlVendorConnection();
    
    const query = `
      WITH RankedVendors AS (
        SELECT 
          VendorCode,
          VendorGroup,
          Name1,
          Name2,
          Name3,
          SearchTerm,
          Street4,
          Street5,
          District,
          City,
          PostalCode,
          Region,
          Country,
          Telephone,
          Fax,
          Email,
          Address,
          TaxId,
          PurchaseOrg,
          OrderCurrency,
          DeleteFlagPurchaseOrg,
          CreateDate,
          CreateBy,
          ModifiedDate,
          ModifiedBy,
          ISActive,
          MobilePhone,
          ROW_NUMBER() OVER (PARTITION BY VendorCode ORDER BY ModifiedDate DESC, CreateDate DESC) as rn
        FROM PR_M_VendorTable
        WHERE VendorCode = @vendorCode
      )
      SELECT 
        VendorCode,
        VendorGroup,
        Name1,
        Name2,
        Name3,
        SearchTerm,
        Street4,
        Street5,
        District,
        City,
        PostalCode,
        Region,
        Country,
        Telephone,
        Fax,
        Email,
        Address,
        TaxId,
        PurchaseOrg,
        OrderCurrency,
        DeleteFlagPurchaseOrg,
        CreateDate,
        CreateBy,
        ModifiedDate,
        ModifiedBy,
        ISActive,
        MobilePhone
      FROM RankedVendors 
      WHERE rn = 1
    `;

    const result = await connection.request()
      .input('vendorCode', vendorCode)
      .query(query);

    return result.recordset.length > 0 ? result.recordset[0] : null;
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูล vendor ตาม Code:', error);
    throw error;
  }
}

// ฟังก์ชันค้นหา vendor ตามเงื่อนไข
export async function searchVendors(searchTerm: string, field: string = 'Name1'): Promise<PR_M_VendorTable[]> {
  try {
    const connection = await getSqlVendorConnection();
    
    const query = `
      WITH RankedVendors AS (
        SELECT 
          VendorCode,
          VendorGroup,
          Name1,
          Name2,
          Name3,
          SearchTerm,
          Street4,
          Street5,
          District,
          City,
          PostalCode,
          Region,
          Country,
          Telephone,
          Fax,
          Email,
          Address,
          TaxId,
          PurchaseOrg,
          OrderCurrency,
          DeleteFlagPurchaseOrg,
          CreateDate,
          CreateBy,
          ModifiedDate,
          ModifiedBy,
          ISActive,
          MobilePhone,
          ROW_NUMBER() OVER (PARTITION BY VendorCode ORDER BY ModifiedDate DESC, CreateDate DESC) as rn
        FROM PR_M_VendorTable
        WHERE ${field} LIKE @searchTerm
      )
      SELECT 
        VendorCode,
        VendorGroup,
        Name1,
        Name2,
        Name3,
        SearchTerm,
        Street4,
        Street5,
        District,
        City,
        PostalCode,
        Region,
        Country,
        Telephone,
        Fax,
        Email,
        Address,
        TaxId,
        PurchaseOrg,
        OrderCurrency,
        DeleteFlagPurchaseOrg,
        CreateDate,
        CreateBy,
        ModifiedDate,
        ModifiedBy,
        ISActive,
        MobilePhone
      FROM RankedVendors 
      WHERE rn = 1
      ORDER BY VendorCode
    `;

    const result = await connection.request()
      .input('searchTerm', `%${searchTerm}%`)
      .query(query);

    return result.recordset;
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการค้นหา vendors:', error);
    throw error;
  }
}

// ฟังก์ชันดึงข้อมูล vendor แบบไม่มี pagination (ทั้งหมด)
export async function getAllVendorsNoPaging(): Promise<PR_M_VendorTable[]> {
  return executeWithRetry(async () => {
    const connection = await getSqlVendorConnection();
    
    // ตรวจสอบสถานะ connection อีกครั้งก่อน query
    if (!connection || !connection.connected) {
      throw new Error('Connection is not available or not connected');
    }

    const query = `
      WITH RankedVendors AS (
        SELECT 
          VendorCode,
          VendorGroup,
          Name1,
          Name2,
          Name3,
          SearchTerm,
          Street4,
          Street5,
          District,
          City,
          PostalCode,
          Region,
          Country,
          Telephone,
          Fax,
          Email,
          Address,
          TaxId,
          PurchaseOrg,
          OrderCurrency,
          DeleteFlagPurchaseOrg,
          CreateDate,
          CreateBy,
          ModifiedDate,
          ModifiedBy,
          ISActive,
          MobilePhone,
          ROW_NUMBER() OVER (PARTITION BY VendorCode ORDER BY ModifiedDate DESC, CreateDate DESC) as rn
        FROM PR_M_VendorTable
      )
      SELECT 
        VendorCode,
        VendorGroup,
        Name1,
        Name2,
        Name3,
        SearchTerm,
        Street4,
        Street5,
        District,
        City,
        PostalCode,
        Region,
        Country,
        Telephone,
        Fax,
        Email,
        Address,
        TaxId,
        PurchaseOrg,
        OrderCurrency,
        DeleteFlagPurchaseOrg,
        CreateDate,
        CreateBy,
        ModifiedDate,
        ModifiedBy,
        ISActive,
        MobilePhone
      FROM RankedVendors 
      WHERE rn = 1
      ORDER BY VendorCode
    `;

    console.log('🔍 กำลังเรียก query หาข้อมูล vendors...');
    const result = await connection.request().query(query);
    console.log(`✅ ดึงข้อมูลสำเร็จ จำนวน ${result.recordset.length} รายการ`);
    return result.recordset;
  }, 3, 'การดึงข้อมูล vendors ทั้งหมด');
}

// ฟังก์ชันดึง distinct VendorCode เท่านั้น
export async function getDistinctVendorCodes(): Promise<{ VendorCode: string }[]> {
  return executeWithRetry(async () => {
    const connection = await getSqlVendorConnection();
    
    const query = `
      SELECT DISTINCT VendorCode
      FROM PR_M_VendorTable
      WHERE VendorCode IS NOT NULL
        AND VendorCode != ''
      ORDER BY VendorCode
    `;

    const result = await connection.request().query(query);
    return result.recordset;
  }, 3, 'การดึงข้อมูล vendor codes');
}

// ฟังก์ชันดึง distinct VendorGroup
export async function getDistinctVendorGroups(): Promise<{ VendorGroup: string }[]> {
  try {
    const connection = await getSqlVendorConnection();
    
    const query = `
      SELECT DISTINCT VendorGroup
      FROM PR_M_VendorTable
      WHERE VendorGroup IS NOT NULL
        AND VendorGroup != ''
      ORDER BY VendorGroup
    `;

    const result = await connection.request().query(query);
    return result.recordset;
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูล vendor groups:', error);
    throw error;
  }
}

// ฟังก์ชันดึง distinct PurchaseOrg
export async function getDistinctPurchaseOrgs(): Promise<{ PurchaseOrg: string }[]> {
  try {
    const connection = await getSqlVendorConnection();
    
    const query = `
      SELECT DISTINCT PurchaseOrg
      FROM PR_M_VendorTable
      WHERE PurchaseOrg IS NOT NULL
        AND PurchaseOrg != ''
      ORDER BY PurchaseOrg
    `;

    const result = await connection.request().query(query);
    return result.recordset;
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูล purchase organizations:', error);
    throw error;
  }
}

// ฟังก์ชันดึงข้อมูล vendor แบบ pagination
export async function getVendorsPaginated(page: number = 1, limit: number = 100, search: string = '') {
  return executeWithRetry(async () => {
    const connection = await getSqlVendorConnection();
    
    if (!connection || !connection.connected) {
      throw new Error('Connection is not available or not connected');
    }

    const offset = (page - 1) * limit;
    
    // สร้าง WHERE clause สำหรับการค้นหา
    let whereClause = '';
    if (search.trim()) {
      whereClause = `
        WHERE (
          Name1 LIKE @search OR 
          VendorCode LIKE @search OR 
          SearchTerm LIKE @search
        )
      `;
    }

    const dataQuery = `
      WITH RankedVendors AS (
        SELECT 
          VendorCode,
          VendorGroup,
          Name1,
          Name2,
          Name3,
          SearchTerm,
          Street4,
          Street5,
          District,
          City,
          PostalCode,
          Region,
          Country,
          Telephone,
          Fax,
          Email,
          Address,
          TaxId,
          PurchaseOrg,
          OrderCurrency,
          DeleteFlagPurchaseOrg,
          CreateDate,
          CreateBy,
          ModifiedDate,
          ModifiedBy,
          ISActive,
          MobilePhone,
          ROW_NUMBER() OVER (PARTITION BY VendorCode ORDER BY ModifiedDate DESC, CreateDate DESC) as rn
        FROM PR_M_VendorTable
        ${whereClause}
      )
      SELECT *
      FROM RankedVendors 
      WHERE rn = 1
      ORDER BY VendorCode
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const countQuery = `
      WITH RankedVendors AS (
        SELECT 
          VendorCode,
          ROW_NUMBER() OVER (PARTITION BY VendorCode ORDER BY ModifiedDate DESC, CreateDate DESC) as rn
        FROM PR_M_VendorTable
        ${whereClause}
      )
      SELECT COUNT(*) as total
      FROM RankedVendors 
      WHERE rn = 1
    `;

    const dataRequest = connection.request();
    const countRequest = connection.request();
    
    if (search.trim()) {
      const searchPattern = `%${search}%`;
      dataRequest.input('search', sql.NVarChar, searchPattern);
      countRequest.input('search', sql.NVarChar, searchPattern);
    }
    
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('limit', sql.Int, limit);

    const [dataResult, countResult] = await Promise.all([
      dataRequest.query(dataQuery),
      countRequest.query(countQuery)
    ]);

    return {
      vendors: dataResult.recordset,
      total: countResult.recordset[0].total,
      page,
      limit
    };
  }, 3, 'การดึงข้อมูล vendors แบบ pagination');
}

// ฟังก์ชันค้นหา vendor ตามชื่อ
export async function searchVendorsByName(searchTerm: string): Promise<PR_M_VendorTable[]> {
  return executeWithRetry(async () => {
    const connection = await getSqlVendorConnection();
    
    if (!connection || !connection.connected) {
      throw new Error('Connection is not available or not connected');
    }

    const query = `
      WITH RankedVendors AS (
        SELECT 
          VendorCode,
          VendorGroup,
          Name1,
          Name2,
          Name3,
          SearchTerm,
          Street4,
          Street5,
          District,
          City,
          PostalCode,
          Region,
          Country,
          Telephone,
          Fax,
          Email,
          Address,
          TaxId,
          PurchaseOrg,
          OrderCurrency,
          DeleteFlagPurchaseOrg,
          CreateDate,
          CreateBy,
          ModifiedDate,
          ModifiedBy,
          ISActive,
          MobilePhone,
          ROW_NUMBER() OVER (PARTITION BY VendorCode ORDER BY ModifiedDate DESC, CreateDate DESC) as rn
        FROM PR_M_VendorTable
        WHERE (
          Name1 LIKE @searchTerm OR 
          VendorCode LIKE @searchTerm OR 
          SearchTerm LIKE @searchTerm
        )
      )
      SELECT *
      FROM RankedVendors 
      WHERE rn = 1
      ORDER BY 
        CASE 
          WHEN Name1 LIKE @exactMatch THEN 1
          WHEN VendorCode LIKE @exactMatch THEN 2
          WHEN Name1 LIKE @startsWith THEN 3
          WHEN VendorCode LIKE @startsWith THEN 4
          ELSE 5
        END,
        Name1
    `;

    const request = connection.request();
    const searchPattern = `%${searchTerm}%`;
    const exactMatch = searchTerm;
    const startsWith = `${searchTerm}%`;
    
    request.input('searchTerm', sql.NVarChar, searchPattern);
    request.input('exactMatch', sql.NVarChar, exactMatch);
    request.input('startsWith', sql.NVarChar, startsWith);

    const result = await request.query(query);
    return result.recordset;
  }, 3, 'การค้นหา vendors ตามชื่อ');
}

// ฟังก์ชันสำหรับ execute query แบบกำหนดเอง
export async function executeVendorQuery(query: string, params: any = {}): Promise<any> {
  try {
    const connection = await getSqlVendorConnection();
    const request = connection.request();
    
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการ execute query:', error);
    throw error;
  }
}
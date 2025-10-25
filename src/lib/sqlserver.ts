import sql from 'mssql';

// ตั้งค่าการเชื่อมต่อ SQL Server
const config = {
  server: '192.168.18.2',
  port: 52601,
  database: 'PSC_K2_Packtest',
  user: 'sa',
  password: 'P@ssw0rd',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Interface สำหรับข้อมูล Customer จาก PT_M_CustomerTable
export interface PT_M_CustomerTable {
  BusinessPartnerCustomerCode?: string;
  CustomerAccountGroup?: string;
  Name_1?: string;
  Name_2?: string;
  Name_3?: string;
  Name_4?: string;
  SearchTerm_1?: string;
  SearchTerm_2?: string;
  Street?: string;
  Street_4?: string;
  Street_5?: string;
  District?: string;
  PostCode?: string;
  City?: string;
  CountryCode?: string;
  TelephoneNoMobilePhone?: string;
  [key: string]: any; // เพื่อรองรับ field อื่นๆ ที่อาจมี
}

let pool: sql.ConnectionPool | null = null;

export async function getSqlServerConnection() {
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

export async function closeSqlServerConnection() {
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
export async function testSqlServerConnection(): Promise<boolean> {
  try {
    return await executeWithRetry(async () => {
      const connection = await getSqlServerConnection();
      await connection.request().query('SELECT 1 as test');
      console.log('✅ เชื่อมต่อ SQL Server สำเร็จ');
      return true;
    }, 3, 'การทดสอบการเชื่อมต่อ SQL Server');
  } catch (error) {
    console.error('❌ เชื่อมต่อ SQL Server ล้มเหลว:', error);
    return false;
  }
}

// ฟังก์ชันดึงข้อมูล customer ทั้งหมด (distinct BusinessPartnerCustomerCode)
export async function getAllCustomers(search = '', page = 1, limit = 10): Promise<{
  data: PT_M_CustomerTable[];
  total: number;
  totalPages: number;
  currentPage: number;
}> {
  try {
    const connection = await getSqlServerConnection();
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const params: any = {};

    if (search) {
      whereClause += " AND (BusinessPartnerCustomerCode LIKE @search OR Name_1 LIKE @search OR Name_2 LIKE @search OR SearchTerm_1 LIKE @search OR SearchTerm_2 LIKE @search)";
      params.search = `%${search}%`;
    }

    const query = `
      SELECT DISTINCT
        BusinessPartnerCustomerCode,
        CustomerAccountGroup,
        Name_1,
        Name_2,
        Name_3,
        Name_4,
        SearchTerm_1,
        SearchTerm_2,
        Street,
        Street_4,
        Street_5,
        District,
        PostCode,
        City,
        CountryCode,
        TelephoneNoMobilePhone
      FROM PT_M_CustomerTable
      ${whereClause}
      ORDER BY BusinessPartnerCustomerCode
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT BusinessPartnerCustomerCode) as total
      FROM PT_M_CustomerTable
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
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูล customers:', error);
    throw error;
  }
}

// ฟังก์ชันดึงข้อมูล customer ตาม BusinessPartnerCustomerCode
export async function getCustomerByCode(customerCode: string): Promise<PT_M_CustomerTable | null> {
  try {
    const connection = await getSqlServerConnection();
    
    const query = `
      SELECT DISTINCT
        BusinessPartnerCustomerCode,
        CustomerAccountGroup,
        Name_1,
        Name_2,
        Name_3,
        Name_4,
        SearchTerm_1,
        SearchTerm_2,
        Street,
        Street_4,
        Street_5,
        District,
        PostCode,
        City,
        CountryCode,
        TelephoneNoMobilePhone
      FROM PT_M_CustomerTable
      WHERE BusinessPartnerCustomerCode = @customerCode
    `;

    const result = await connection.request()
      .input('customerCode', customerCode)
      .query(query);

    return result.recordset.length > 0 ? result.recordset[0] : null;
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูล customer ตาม Code:', error);
    throw error;
  }
}

// ฟังก์ชันค้นหา customer ตามเงื่อนไข
export async function searchCustomers(searchTerm: string, field: string = 'Name_1'): Promise<PT_M_CustomerTable[]> {
  try {
    const connection = await getSqlServerConnection();
    
    const query = `
      SELECT DISTINCT
        BusinessPartnerCustomerCode,
        CustomerAccountGroup,
        Name_1,
        Name_2,
        Name_3,
        Name_4,
        SearchTerm_1,
        SearchTerm_2,
        Street,
        Street_4,
        Street_5,
        District,
        PostCode,
        City,
        CountryCode,
        TelephoneNoMobilePhone
      FROM PT_M_CustomerTable
      WHERE ${field} LIKE @searchTerm
      ORDER BY BusinessPartnerCustomerCode
    `;

    const result = await connection.request()
      .input('searchTerm', `%${searchTerm}%`)
      .query(query);

    return result.recordset;
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการค้นหา customers:', error);
    throw error;
  }
}

// ฟังก์ชันดึงข้อมูล customer แบบไม่มี pagination (ทั้งหมด)
export async function getAllCustomersNoPaging(): Promise<PT_M_CustomerTable[]> {
  return executeWithRetry(async () => {
    const connection = await getSqlServerConnection();
    
    // ตรวจสอบสถานะ connection อีกครั้งก่อน query
    if (!connection || !connection.connected) {
      throw new Error('Connection is not available or not connected');
    }

    const query = `
      SELECT DISTINCT
        BusinessPartnerCustomerCode,
        CustomerAccountGroup,
        Name_1,
        Name_2,
        Name_3,
        Name_4,
        SearchTerm_1,
        SearchTerm_2,
        Street,
        Street_4,
        Street_5,
        District,
        PostCode,
        City,
        CountryCode,
        TelephoneNoMobilePhone
      FROM PT_M_CustomerTable
      ORDER BY BusinessPartnerCustomerCode
    `;

    console.log('🔍 กำลังเรียก query หาข้อมูล customers...');
    const result = await connection.request().query(query);
    console.log(`✅ ดึงข้อมูลสำเร็จ จำนวน ${result.recordset.length} รายการ`);
    return result.recordset;
  }, 3, 'การดึงข้อมูล customers ทั้งหมด');
}

// ฟังก์ชันดึงข้อมูล customer ตาม range ของ customer code
export async function getCustomersByCodeRange(startCode: string, endCode: string): Promise<PT_M_CustomerTable[]> {
  return executeWithRetry(async () => {
    const connection = await getSqlServerConnection();
    
    // ตรวจสอบสถานะ connection อีกครั้งก่อน query
    if (!connection || !connection.connected) {
      throw new Error('Connection is not available or not connected');
    }

    const query = `
      SELECT DISTINCT
        BusinessPartnerCustomerCode,
        CustomerAccountGroup,
        Name_1,
        Name_2,
        Name_3,
        Name_4,
        SearchTerm_1,
        SearchTerm_2,
        Street,
        Street_4,
        Street_5,
        District,
        PostCode,
        City,
        CountryCode,
        TelephoneNoMobilePhone
      FROM PT_M_CustomerTable
      WHERE BusinessPartnerCustomerCode >= @startCode
        AND BusinessPartnerCustomerCode <= @endCode
        AND BusinessPartnerCustomerCode IS NOT NULL
        AND BusinessPartnerCustomerCode != ''
      ORDER BY BusinessPartnerCustomerCode
    `;

    console.log(`🔍 กำลังค้นหาลูกค้า จาก ${startCode} ถึง ${endCode}...`);
    const result = await connection.request()
      .input('startCode', startCode)
      .input('endCode', endCode)
      .query(query);
    
    console.log(`✅ พบลูกค้า ${result.recordset.length} รายการ ในช่วง ${startCode} - ${endCode}`);
    return result.recordset;
  }, 3, `การดึงข้อมูล customers ในช่วง ${startCode} - ${endCode}`);
}

// ฟังก์ชันดึง distinct BusinessPartnerCustomerCode เท่านั้น
export async function getDistinctCustomerCodes(): Promise<{ BusinessPartnerCustomerCode: string }[]> {
  return executeWithRetry(async () => {
    const connection = await getSqlServerConnection();
    
    const query = `
      SELECT DISTINCT BusinessPartnerCustomerCode
      FROM PT_M_CustomerTable
      WHERE BusinessPartnerCustomerCode IS NOT NULL
        AND BusinessPartnerCustomerCode != ''
      ORDER BY BusinessPartnerCustomerCode
    `;

    const result = await connection.request().query(query);
    return result.recordset;
  }, 3, 'การดึงข้อมูล customer codes');
}

// ฟังก์ชันดึง distinct CustomerAccountGroup
export async function getDistinctAccountGroups(): Promise<{ CustomerAccountGroup: string }[]> {
  try {
    const connection = await getSqlServerConnection();
    
    const query = `
      SELECT DISTINCT CustomerAccountGroup
      FROM PT_M_CustomerTable
      WHERE CustomerAccountGroup IS NOT NULL
        AND CustomerAccountGroup != ''
      ORDER BY CustomerAccountGroup
    `;

    const result = await connection.request().query(query);
    return result.recordset;
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูล account groups:', error);
    throw error;
  }
}

// ฟังก์ชันสำหรับ execute query แบบกำหนดเอง
export async function executeCustomerQuery(query: string, params: any = {}): Promise<any> {
  try {
    const connection = await getSqlServerConnection();
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

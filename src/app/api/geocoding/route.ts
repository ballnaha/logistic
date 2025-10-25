import { NextRequest, NextResponse } from 'next/server';

// ใช้ OpenStreetMap Nominatim API สำหรับ geocoding (ฟรี)
// หรือ Google Maps Geocoding API (ต้องมี API key)

const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search';
const GOOGLE_GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// ฟังก์ชันเช็คโควต้า Google Maps (ไม่บล็อกการใช้งาน)
async function checkGoogleMapsQuota(): Promise<{ canUse: boolean; message?: string }> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/quota-tracker`);
    const result = await response.json();
    
    if (result.success) {
      return {
        canUse: true, // ไม่บล็อกการใช้งาน ให้ Google Maps จัดการเอง
        message: result.data.status.is_quota_exceeded 
          ? `แจ้งเตือน: เกินโควต้าติดตาม (${result.data.usage.total}/${result.data.limits.quota_limit})`
          : result.data.status.is_near_limit
          ? `แจ้งเตือน: ใกล้เกินโควต้า (${result.data.usage.total}/${result.data.limits.quota_limit})`
          : `การใช้งาน: ${result.data.usage.total}/${result.data.limits.quota_limit}`
      };
    }
    
    return { canUse: true, message: 'ระบบติดตามโควต้าไม่พร้อม' };
  } catch (error) {
    console.error('Error checking Google Maps quota:', error);
    return { canUse: true, message: 'ระบบติดตามโควต้าไม่พร้อม' };
  }
}

// ฟังก์ชันอัปเดตการใช้งาน Google Maps (แบบ optional - ไม่บล็อกการทำงาน)
async function updateGoogleMapsUsage(type: 'geocoding' | 'distance', count: number = 1) {
  // ใช้ setTimeout เพื่อไม่ให้บล็อก main request และจับ error ได้ดีขึ้น
  setTimeout(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/quota-tracker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, count })
      });
      
      if (response.ok) {
        console.log(`✅ Quota tracking updated: ${type} +${count}`);
      } else {
        console.log(`⚠️ Quota tracker responded with ${response.status}, continuing without tracking`);
      }
    } catch (error: any) {
      // ซ่อน error details ที่ไม่จำเป็น เพื่อไม่ให้ console รกเกินไป
      if (error.code === 'ECONNREFUSED') {
        console.log('⚠️ Quota tracker offline, continuing without tracking');
      } else {
        console.log('⚠️ Quota tracking unavailable, continuing without tracking');
      }
    }
  }, 150); // เพิ่มเวลารอเป็น 150ms เพื่อให้ main request ส่งกลับก่อน
}

// ฟังก์ชัน geocoding ด้วย Google Maps
async function geocodeWithGoogle(query: string): Promise<any[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  // ปรับปรุงการส่ง query ไปยัง Google Maps เพื่อความแม่นยำสูงสุด
  const url = `${GOOGLE_GEOCODING_API_URL}?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&region=th&language=th&components=country:TH`;
  console.log('🌐 Google Geocoding URL:', url.replace(GOOGLE_MAPS_API_KEY || '', 'API_KEY_HIDDEN'));
  
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Geocoding API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('🌐 Google Geocoding response:', JSON.stringify(data, null, 2));
  
  if (data.status !== 'OK') {
    if (data.status === 'OVER_QUERY_LIMIT') {
      throw new Error('OVER_QUOTA');
    }
    throw new Error(`Google Geocoding error: ${data.status}`);
  }

  const results = data.results.map((result: any) => ({
    lat: result.geometry.location.lat,
    lon: result.geometry.location.lng,
    display_name: result.formatted_address,
    place_id: result.place_id,
    importance: 0.9, // Google มักจะแม่นยำกว่า
    address: result.address_components.reduce((acc: any, comp: any) => {
      const types = comp.types;
      if (types.includes('country')) acc.country = comp.long_name;
      if (types.includes('administrative_area_level_1')) acc.state = comp.long_name;
      if (types.includes('locality')) acc.city = comp.long_name;
      if (types.includes('administrative_area_level_2')) acc.district = comp.long_name;
      if (types.includes('sublocality_level_1')) acc.subdistrict = comp.long_name;
      if (types.includes('postal_code')) acc.postcode = comp.long_name;
      if (types.includes('route')) acc.road = comp.long_name;
      if (types.includes('street_number')) acc.house_number = comp.long_name;
      return acc;
    }, {}),
    query_used: query,
    source: 'google'
  }));

  console.log(`✅ Google Geocoding results (${results.length} found):`);
  results.forEach((result: any, index: number) => {
    console.log(`  ${index + 1}. ${result.display_name} → (${result.lat}, ${result.lon})`);
  });

  return results;
}

// ฟังก์ชันสำหรับกำหนดระดับการแมทช์
function getMatchLevel(queryUsed: string, originalAddress: string, companyName?: string): string {
  if (!queryUsed) return 'unknown';
  
  // ตรวจสอบว่าเป็นการค้นหาแบบเต็ม (บริษัท + ที่อยู่)
  if (companyName && queryUsed.includes(companyName) && queryUsed.includes(originalAddress)) {
    return 'exact'; // แม่นยำมาก
  }
  
  // ตรวจสอบว่าเป็นการค้นหาที่อยู่เต็ม
  if (queryUsed.includes(originalAddress)) {
    return 'full_address'; // ที่อยู่เต็ม
  }
  
  // ตรวจสอบว่าเป็นการค้นหาระดับอำเภอ/จังหวัด
  const addressParts = originalAddress.split(/[,.\s]+/).filter(part => part.trim().length > 0);
  if (addressParts.length >= 2) {
    const lastTwoParts = addressParts.slice(-2).join(' ');
    if (queryUsed.includes(lastTwoParts)) {
      return 'district_province'; // อำเภอ/จังหวัด
    }
  }
  
  // ตรวจสอบว่าเป็นการค้นหาระดับจังหวัด
  if (addressParts.length >= 1) {
    const lastPart = addressParts[addressParts.length - 1];
    if (queryUsed.includes(lastPart)) {
      return 'province_only'; // จังหวัดเท่านั้น
    }
  }
  
  return 'partial'; // บางส่วน
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, companyName } = body;

    if (!address) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'กรุณาระบุที่อยู่' 
        },
        { status: 400 }
      );
    }

    // ฟังก์ชันสำหรับการค้นหาแบบ fallback
    const searchWithFallback = async (searchQueries: string[]): Promise<any[]> => {
      for (const query of searchQueries) {
        console.log('Trying geocoding query:', query);
        
        const params = new URLSearchParams({
          q: query,
          format: 'json',
          limit: '10', // เพิ่มจำนวนผลลัพธ์
          countrycodes: 'th',
          'accept-language': 'th,en',
          addressdetails: '1',
          extratags: '1',
          namedetails: '1',
        });

        const response = await fetch(`${NOMINATIM_API_URL}?${params}`, {
          headers: {
            'User-Agent': 'Logistics-System/1.0 (contact@yourcompany.com)',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            return data.map((item: any) => ({ ...item, query_used: query }));
          }
        }
        
        // รอ 1 วินาทีก่อนค้นหาครั้งถัดไป (เพื่อเคารพ rate limit)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      return [];
    };

    // สร้าง query strings หลายแบบสำหรับ fallback (เพิ่มความแม่นยำสำหรับธุรกิจการขนส่ง)
    const searchQueries: string[] = [];

    // 1. ความแม่นยำสูงสุด: ค้นหาเฉพาะที่อยู่ (ที่อยู่มักแม่นยำกว่าชื่อบริษัท)
    searchQueries.push(`${address}, Thailand`);
    
    // 2. ถ้ามีชื่อบริษัท ให้ลองรูปแบบต่างๆ
    if (companyName) {
      // 2.1 ย่อชื่อบริษัท + ที่อยู่ (ได้ผลดีสำหรับบริษัททั่วไป)
      const shortCompanyName = companyName.replace(/บริษัท\s*/g, '').replace(/จำกัด.*$/g, '').trim();
      if (shortCompanyName !== companyName && shortCompanyName.length > 0) {
        searchQueries.push(`${shortCompanyName} ${address}, Thailand`);
        console.log(`🎯 Using successful strategy: Short company name "${shortCompanyName}"`);
      }
      
      // 2.2 ชื่อบริษัทเต็ม + ที่อยู่
      searchQueries.push(`${companyName} ${address}, Thailand`);
      
      // 2.3 ลองค้นหาเฉพาะชื่อบริษัท ถ้าเป็นบริษัทที่มีชื่อเสียง
      if (companyName.length > 10) { // ชื่อยาวมักเป็นบริษัทที่มีชื่อเสียง
        searchQueries.push(`${companyName}, Thailand`);
      }
    }

    // 3. เพิ่มการค้นหาเฉพาะที่อยู่พร้อม variations ของจังหวัด
    if (address.includes('ปทุมธานี')) {
      searchQueries.push(`${address.replace(/จ\.\s*ปทุมธานี/g, '')}, Pathum Thani, Thailand`);
      searchQueries.push(`${address.replace(/จ\.\s*ปทุมธานี/g, '')}, ปทุมธานี, ประเทศไทย`);
    }
    
    // 4. เพิ่มการค้นหาด้วยชื่อย่อ + English mix (ถ้ามีชื่อบริษัท)
    if (companyName) {
      const shortCompanyName = companyName.replace(/บริษัท\s*/g, '').replace(/จำกัด.*$/g, '').trim();
      if (shortCompanyName.includes('เค. เอส') || shortCompanyName.includes('เค.เอส')) {
        searchQueries.push(`K.S. Metal Printing ${address}, Thailand`);
      }
    }

    // 3. แยกส่วนที่อยู่และค้นหาแบบ step-by-step
    const addressParts = address.split(/[,.\s]+/).filter((part: string) => part.trim().length > 0);
    
    // สร้างการค้นหาจากกว้างไปแคบ
    if (addressParts.length >= 3) {
      // ค้นหาจากอำเภอ + จังหวัด
      const districtProvince = addressParts.slice(-2).join(' ');
      searchQueries.push(`${districtProvince}, Thailand`);
      
      // ค้นหาจากตำบล + อำเภอ + จังหวัด  
      if (addressParts.length >= 4) {
        const subdistrictDistrictProvince = addressParts.slice(-3).join(' ');
        searchQueries.push(`${subdistrictDistrictProvince}, Thailand`);
      }
    }

    // 4. ค้นหาเฉพาะจังหวัด (fallback สุดท้าย)
    const provinceKeywords = ['จ.', 'จังหวัด', 'กรุงเทพ', 'กทม', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ'];
    for (const keyword of provinceKeywords) {
      if (address.includes(keyword)) {
        const provincePart = address.substring(address.lastIndexOf(keyword));
        searchQueries.push(`${provincePart}, Thailand`);
        break;
      }
    }

    // 5. ค้นหาเฉพาะคำสุดท้าย (อาจเป็นจังหวัด)
    if (addressParts.length > 0) {
      searchQueries.push(`${addressParts[addressParts.length - 1]}, Thailand`);
    }

    console.log('Search queries to try:', searchQueries);

    let data: any[] = [];
    let usedSource = 'openstreetmap';
    let quotaMessage = '';

    // ใช้ Google Maps เป็นหลัก (ถ้ามี API key)
    if (GOOGLE_MAPS_API_KEY) {
      try {
        console.log('Using Google Maps as primary geocoding service...');
        
        // ลองหลาย query และเลือกผลลัพธ์ที่ดีที่สุด
        let bestResults: any[] = [];
        let bestScore = 0;
        let bestQueryIndex = -1;
        
        for (let i = 0; i < searchQueries.length; i++) {
          console.log(`🔍 Google Maps search query ${i + 1}/${searchQueries.length}:`, searchQueries[i]);
          const tempData = await geocodeWithGoogle(searchQueries[i]);
          
          if (tempData.length > 0) {
            const firstResult = tempData[0];
            
            // คำนวณคะแนนความเหมาะสม
            let score = 0;
            
            // คะแนนตามความแม่นยำของ query (query แรกได้คะแนนสูงสุด)
            score += (searchQueries.length - i) * 10;
            
            // คะแนนตาม importance/confidence ของ Google Maps
            score += (firstResult.importance || 0) * 50;
            
            // คะแนนพิเศษถ้าอยู่ในประเทศไทย (ตรวจจากพิกัด)
            const isInThailand = firstResult.lat >= 5.0 && firstResult.lat <= 21.0 && 
                                 firstResult.lng >= 97.0 && firstResult.lng <= 106.0;
            if (isInThailand) score += 20;
            
            // คะแนนพิเศษถ้าผลลัพธ์มี "Thailand" ใน formatted_address
            if (firstResult.display_name.includes('Thailand') || firstResult.display_name.includes('ประเทศไทย')) {
              score += 15;
            }
            
            // คะแนนพิเศษถ้าเป็นการค้นหาเฉพาะที่อยู่ (มักแม่นยำกว่า)
            if (i === 0) score += 5; // query แรกคือที่อยู่เฉพาะ
            
            console.log(`📍 Result ${i + 1}: (${firstResult.lat}, ${firstResult.lng}) - Score: ${score.toFixed(1)} - ${firstResult.display_name.substring(0, 100)}...`);
            
            if (score > bestScore) {
              bestResults = tempData;
              bestScore = score;
              bestQueryIndex = i;
            }
            
            // ถ้าได้คะแนนสูงมากและเป็นผลลัพธ์แรก ให้ใช้เลย
            if (score > 80 && i < 3) {
              console.log(`✅ Using excellent result from query ${i + 1} (score: ${score.toFixed(1)})`);
              break;
            }
          }
        }
        
        if (bestResults.length > 0) {
          data = bestResults;
          console.log(`✅ Best result: Query ${bestQueryIndex + 1} "${searchQueries[bestQueryIndex]}" (score: ${bestScore.toFixed(1)})`);
        }
        
        usedSource = 'google';
        quotaMessage = '🌟 ใช้ Google Maps สำหรับความแม่นยำสูงสุด';
        
        // อัปเดตการใช้งานโควต้า (แบบ async ไม่บล็อก)
        updateGoogleMapsUsage('geocoding', 1);
        
      } catch (error: any) {
        console.log('Google Maps failed, falling back to OpenStreetMap:', error.message);
        
        if (error.message === 'OVER_QUOTA') {
          quotaMessage = '⚠️ เกินโควต้า Google Maps แล้ว ใช้ OpenStreetMap แทน';
        } else if (error.message.includes('GOOGLE_GEOCODING_API_URL')) {
          quotaMessage = '⚠️ Google Maps API มีปัญหา ใช้ OpenStreetMap แทน';
        } else {
          quotaMessage = '⚠️ Google Maps ไม่สามารถใช้งานได้ ใช้ OpenStreetMap แทน';
        }
        
        // ถ้า Google Maps ล้มเหลว ให้ลอง OpenStreetMap
        console.log('Falling back to OpenStreetMap...');
        data = await searchWithFallback(searchQueries);
        usedSource = 'openstreetmap';
      }
    } else {
      // ไม่มี Google Maps API key ให้ใช้ OpenStreetMap
      quotaMessage = '⚠️ ใช้ OpenStreetMap เนื่องจากไม่มี Google Maps API key';
      console.log('No Google Maps API key, using OpenStreetMap...');
      data = await searchWithFallback(searchQueries);
      usedSource = 'openstreetmap';
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'ไม่พบข้อมูลพิกัดสำหรับที่อยู่นี้ กรุณาตรวจสอบการสะกดหรือลองใช้ที่อยู่ที่ง่ายกว่า',
        suggestions: [
          'ลองใส่เฉพาะอำเภอและจังหวัด',
          'ตรวจสอบการสะกดของชื่อที่อยู่',
          'ใช้ที่อยู่แบบย่อ เช่น "อ.เมือง จ.กรุงเทพ"'
        ],
        source: usedSource,
        quota_message: quotaMessage
      });
    }

    // แปลงข้อมูลให้อยู่ในรูปแบบที่ใช้งานง่าย
    const results = data.slice(0, 8).map((item: any) => {
      const result = {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        formatted_address: item.display_name,
        place_id: item.place_id,
        confidence: parseFloat(item.importance || 0),
        query_used: item.query_used, // บันทึกว่าใช้ query ไหนในการค้นหา
        match_level: getMatchLevel(item.query_used, address, companyName), // ระดับการแมท
        address_components: {
          country: item.address?.country || 'Thailand',
          state: item.address?.state || item.address?.province,
          city: item.address?.city || item.address?.town || item.address?.village,
          district: item.address?.county || item.address?.district,
          subdistrict: item.address?.suburb || item.address?.subdistrict,
          postcode: item.address?.postcode,
          road: item.address?.road,
          house_number: item.address?.house_number,
        },
        type: item.type,
        osm_type: item.osm_type,
      };
      
      // คำนวณคะแนนความเหมาะสมใหม่สำหรับการเรียงลำดับผลลัพธ์
      let finalScore = result.confidence;
      
      // เพิ่มคะแนนตาม match_level
      switch (result.match_level) {
        case 'exact': finalScore += 0.5; break;
        case 'full_address': finalScore += 0.3; break;
        case 'district_province': finalScore += 0.1; break;
        case 'province_only': finalScore += 0.05; break;
      }
      
      // เพิ่มคะแนนถ้าเป็นผลลัพธ์จาก Google Maps
      if (usedSource === 'google') {
        finalScore += 0.2;
      }
      
      // เพิ่มคะแนนถ้าข้อมูลครบถ้วน
      if (result.address_components.road && result.address_components.district) {
        finalScore += 0.1;
      }
      
      return { ...result, final_score: finalScore };
    });

    // เรียงลำดับตามคะแนนรวม
    results.sort((a, b) => b.final_score - a.final_score);

    return NextResponse.json({
      success: true,
      data: results,
      message: `พบ ${results.length} ผลลัพธ์`,
      meta: {
        source: usedSource,
        quota_message: quotaMessage,
        is_google_maps: usedSource === 'google'
      }
    });

  } catch (error: any) {
    console.error('Geocoding error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'เกิดข้อผิดพลาดในการค้นหาพิกัด กรุณาลองใหม่อีกครั้ง',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// GET สำหรับ reverse geocoding (หาที่อยู่จากพิกัด)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'กรุณาระบุพิกัด lat และ lng' 
        },
        { status: 400 }
      );
    }

    const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
    
    const params = new URLSearchParams({
      lat: lat,
      lon: lng,
      format: 'json',
      'accept-language': 'th,en',
      addressdetails: '1',
      extratags: '1',
      namedetails: '1',
    });

    const response = await fetch(`${REVERSE_URL}?${params}`, {
      headers: {
        'User-Agent': 'Logistics-System/1.0 (contact@yourcompany.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.error) {
      return NextResponse.json({
        success: false,
        error: 'ไม่พบข้อมูลที่อยู่สำหรับพิกัดนี้',
      });
    }

    const result = {
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
      formatted_address: data.display_name,
      address_components: {
        country: data.address?.country || 'Thailand',
        state: data.address?.state || data.address?.province,
        city: data.address?.city || data.address?.town || data.address?.village,
        district: data.address?.county || data.address?.district,
        subdistrict: data.address?.suburb || data.address?.subdistrict,
        postcode: data.address?.postcode,
        road: data.address?.road,
        house_number: data.address?.house_number,
      },
    };

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error: any) {
    console.error('Reverse geocoding error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'เกิดข้อผิดพลาดในการค้นหาที่อยู่',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

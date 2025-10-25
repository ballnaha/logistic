import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testCase = 'default' } = body;

    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Google Maps API key not configured'
      });
    }

    // สร้าง test queries หลายแบบสำหรับ "บริษัท เค. เอส โลหะการพิมพ์ จำกัด"
    const testQueries = [
      // Original
      'บริษัท เค. เอส โลหะการพิมพ์ จำกัด 27 หมู่ 4 ถนนพหลโยธิน จ. ปทุมธานี, Thailand',
      
      // Short company name
      'เค. เอส โลหะการพิมพ์ 27 หมู่ 4 ถนนพหลโยธิน จ. ปทุมธานี, Thailand',
      
      // Address only
      '27 หมู่ 4 ถนนพหลโยธิน จ. ปทุมธานี, Thailand',
      
      // English mix
      'K.S. Metal Printing 27 หมู่ 4 ถนนพหลโยธิน Pathum Thani, Thailand',
      
      // More specific
      '27 หมู่ 4 ถนนพหลโยธิน ตำบลบึงยี่โถ อำเภอธัญบุรี จังหวัดปทุมธานี, Thailand',
      
      // Road focus
      'ถนนพหลโยธิน หมู่ 4 ปทุมธานี, Thailand',
      
      // Simple
      '27 Moo 4 Phahonyothin Road Pathum Thani Thailand',
      
      // Area focus
      'ธัญบุรี ปทุมธานี Thailand',
      
      // Landmark approach
      'ปทุมธานี เค เอส โลหะการพิมพ์',
      
      // Alternative spelling
      'บริษัท เค.เอส.โลหะการพิมพ์ จำกัด ปทุมธานี'
    ];

    const results = [];

    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      
      try {
        console.log(`🔍 Testing query ${i + 1}/${testQueries.length}: ${query}`);
        
        const url = `${GOOGLE_GEOCODING_API_URL}?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&region=th&language=th`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.status === 'OK' && data.results.length > 0) {
            const topResult = data.results[0];
            const lat = topResult.geometry.location.lat;
            const lng = topResult.geometry.location.lng;
            
            // ตรวจสอบว่าอยู่ในย่านปทุมธานี (latitude ประมาณ 13.8-14.2, longitude ประมาณ 100.4-100.7)
            const isInPathumThani = lat >= 13.8 && lat <= 14.2 && lng >= 100.4 && lng <= 100.7;
            
            results.push({
              query: query,
              success: true,
              location: {
                lat: lat,
                lng: lng,
                formatted_address: topResult.formatted_address,
                place_id: topResult.place_id,
                types: topResult.types
              },
              isInPathumThani: isInPathumThani,
              score: isInPathumThani ? 100 : 0,
              totalResults: data.results.length
            });

            console.log(`  ✅ Result: ${topResult.formatted_address} → (${lat}, ${lng}) ${isInPathumThani ? '✅ ในปทุมธานี' : '❌ นอกปทุมธานี'}`);
          } else {
            results.push({
              query: query,
              success: false,
              error: `Google returned: ${data.status}`,
              score: 0
            });
            console.log(`  ❌ No results: ${data.status}`);
          }
        } else {
          results.push({
            query: query,
            success: false,
            error: `HTTP ${response.status}`,
            score: 0
          });
          console.log(`  ❌ HTTP error: ${response.status}`);
        }
        
        // รอสักครู่เพื่อไม่ให้ hit rate limit
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error: any) {
        results.push({
          query: query,
          success: false,
          error: error.message,
          score: 0
        });
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    // หาผลลัพธ์ที่ดีที่สุด
    const bestResults = results
      .filter(r => r.success && r.isInPathumThani)
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      data: {
        totalQueries: testQueries.length,
        successfulQueries: results.filter(r => r.success).length,
        pathumThaniResults: results.filter(r => r.success && r.isInPathumThani).length,
        bestResults: bestResults.slice(0, 3), // top 3
        allResults: results
      },
      message: `Tested ${testQueries.length} queries, found ${bestResults.length} results in Pathum Thani`
    });

  } catch (error: any) {
    console.error('Test geocoding error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการทดสอบ',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

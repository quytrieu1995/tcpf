const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get provinces (Tỉnh/Thành phố)
router.get('/provinces', authenticate, async (req, res) => {
  try {
    // Using a public API or static data
    // For now, we'll use a simple approach with common provinces
    const provinces = [
      { code: '01', name: 'Hà Nội' },
      { code: '79', name: 'Hồ Chí Minh' },
      { code: '31', name: 'Hải Phòng' },
      { code: '48', name: 'Đà Nẵng' },
      { code: '92', name: 'Cần Thơ' },
      { code: '02', name: 'Hà Giang' },
      { code: '04', name: 'Cao Bằng' },
      { code: '06', name: 'Bắc Kạn' },
      { code: '08', name: 'Tuyên Quang' },
      { code: '10', name: 'Lào Cai' },
      { code: '11', name: 'Điện Biên' },
      { code: '12', name: 'Lai Châu' },
      { code: '14', name: 'Sơn La' },
      { code: '15', name: 'Yên Bái' },
      { code: '17', name: 'Hoà Bình' },
      { code: '19', name: 'Thái Nguyên' },
      { code: '20', name: 'Lạng Sơn' },
      { code: '22', name: 'Quảng Ninh' },
      { code: '24', name: 'Bắc Giang' },
      { code: '25', name: 'Phú Thọ' },
      { code: '26', name: 'Vĩnh Phúc' },
      { code: '27', name: 'Bắc Ninh' },
      { code: '30', name: 'Hải Dương' },
      { code: '33', name: 'Hưng Yên' },
      { code: '34', name: 'Thái Bình' },
      { code: '35', name: 'Hà Nam' },
      { code: '36', name: 'Nam Định' },
      { code: '37', name: 'Ninh Bình' },
      { code: '38', name: 'Thanh Hóa' },
      { code: '40', name: 'Nghệ An' },
      { code: '42', name: 'Hà Tĩnh' },
      { code: '44', name: 'Quảng Bình' },
      { code: '45', name: 'Quảng Trị' },
      { code: '46', name: 'Thừa Thiên Huế' },
      { code: '49', name: 'Quảng Nam' },
      { code: '51', name: 'Quảng Ngãi' },
      { code: '52', name: 'Bình Định' },
      { code: '54', name: 'Phú Yên' },
      { code: '56', name: 'Khánh Hòa' },
      { code: '58', name: 'Ninh Thuận' },
      { code: '60', name: 'Bình Thuận' },
      { code: '62', name: 'Kon Tum' },
      { code: '64', name: 'Gia Lai' },
      { code: '66', name: 'Đắk Lắk' },
      { code: '67', name: 'Đắk Nông' },
      { code: '68', name: 'Lâm Đồng' },
      { code: '70', name: 'Bình Phước' },
      { code: '72', name: 'Tây Ninh' },
      { code: '74', name: 'Bình Dương' },
      { code: '75', name: 'Đồng Nai' },
      { code: '77', name: 'Bà Rịa - Vũng Tàu' },
      { code: '80', name: 'Long An' },
      { code: '82', name: 'Tiền Giang' },
      { code: '83', name: 'Bến Tre' },
      { code: '84', name: 'Trà Vinh' },
      { code: '86', name: 'Vĩnh Long' },
      { code: '87', name: 'Đồng Tháp' },
      { code: '89', name: 'An Giang' },
      { code: '91', name: 'Kiên Giang' },
      { code: '93', name: 'Hậu Giang' },
      { code: '94', name: 'Sóc Trăng' },
      { code: '95', name: 'Bạc Liêu' },
      { code: '96', name: 'Cà Mau' }
    ];
    
    res.json(provinces);
  } catch (error) {
    console.error('Get provinces error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get districts (Quận/Huyện) by province
router.get('/districts/:provinceCode', authenticate, async (req, res) => {
  try {
    const { provinceCode } = req.params;
    
    // This is a simplified version. In production, you should use a proper address API
    // or maintain a database with all districts
    // For now, we'll return common districts for major cities
    
    const districtsByProvince = {
      '01': [ // Hà Nội
        { code: '001', name: 'Ba Đình' },
        { code: '002', name: 'Hoàn Kiếm' },
        { code: '003', name: 'Tây Hồ' },
        { code: '004', name: 'Long Biên' },
        { code: '005', name: 'Cầu Giấy' },
        { code: '006', name: 'Đống Đa' },
        { code: '007', name: 'Hai Bà Trưng' },
        { code: '008', name: 'Hoàng Mai' },
        { code: '009', name: 'Thanh Xuân' },
        { code: '016', name: 'Sóc Sơn' },
        { code: '017', name: 'Đông Anh' },
        { code: '018', name: 'Gia Lâm' },
        { code: '019', name: 'Nam Từ Liêm' },
        { code: '020', name: 'Bắc Từ Liêm' },
        { code: '021', name: 'Mê Linh' },
        { code: '250', name: 'Hà Đông' },
        { code: '268', name: 'Sơn Tây' },
        { code: '269', name: 'Ba Vì' },
        { code: '271', name: 'Phúc Thọ' },
        { code: '272', name: 'Đan Phượng' },
        { code: '273', name: 'Hoài Đức' },
        { code: '274', name: 'Quốc Oai' },
        { code: '275', name: 'Thạch Thất' },
        { code: '276', name: 'Chương Mỹ' },
        { code: '277', name: 'Thanh Oai' },
        { code: '278', name: 'Thường Tín' },
        { code: '279', name: 'Phú Xuyên' },
        { code: '280', name: 'Ứng Hòa' },
        { code: '281', name: 'Mỹ Đức' }
      ],
      '79': [ // Hồ Chí Minh
        { code: '760', name: 'Quận 1' },
        { code: '761', name: 'Quận 2' },
        { code: '762', name: 'Quận 3' },
        { code: '763', name: 'Quận 4' },
        { code: '764', name: 'Quận 5' },
        { code: '765', name: 'Quận 6' },
        { code: '766', name: 'Quận 7' },
        { code: '767', name: 'Quận 8' },
        { code: '768', name: 'Quận 9' },
        { code: '769', name: 'Quận 10' },
        { code: '770', name: 'Quận 11' },
        { code: '771', name: 'Quận 12' },
        { code: '772', name: 'Bình Thạnh' },
        { code: '773', name: 'Tân Bình' },
        { code: '774', name: 'Tân Phú' },
        { code: '775', name: 'Phú Nhuận' },
        { code: '776', name: 'Thủ Đức' },
        { code: '777', name: 'Bình Tân' },
        { code: '778', name: 'Củ Chi' },
        { code: '783', name: 'Hóc Môn' },
        { code: '784', name: 'Bình Chánh' },
        { code: '785', name: 'Nhà Bè' },
        { code: '786', name: 'Cần Giờ' }
      ],
      '48': [ // Đà Nẵng
        { code: '490', name: 'Hải Châu' },
        { code: '491', name: 'Thanh Khê' },
        { code: '492', name: 'Sơn Trà' },
        { code: '493', name: 'Ngũ Hành Sơn' },
        { code: '494', name: 'Liên Chiểu' },
        { code: '495', name: 'Cẩm Lệ' },
        { code: '497', name: 'Hòa Vang' },
        { code: '498', name: 'Hoàng Sa' }
      ]
    };

    const districts = districtsByProvince[provinceCode] || [];
    res.json(districts);
  } catch (error) {
    console.error('Get districts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get wards (Phường/Xã) by district
router.get('/wards/:districtCode', authenticate, async (req, res) => {
  try {
    const { districtCode } = req.params;
    
    // Simplified version - in production, use proper address API
    // For now, return common wards for major districts
    const wardsByDistrict = {
      '001': [ // Ba Đình, Hà Nội
        { code: '00001', name: 'Phúc Xá' },
        { code: '00004', name: 'Trúc Bạch' },
        { code: '00006', name: 'Vĩnh Phúc' },
        { code: '00007', name: 'Cống Vị' },
        { code: '00008', name: 'Liễu Giai' },
        { code: '00010', name: 'Nguyễn Trung Trực' },
        { code: '00013', name: 'Quán Thánh' },
        { code: '00016', name: 'Ngọc Hà' },
        { code: '00019', name: 'Điện Biên' },
        { code: '00022', name: 'Đội Cấn' },
        { code: '00025', name: 'Ngọc Khánh' },
        { code: '00028', name: 'Kim Mã' },
        { code: '00031', name: 'Giảng Võ' },
        { code: '00034', name: 'Thành Công' }
      ],
      '760': [ // Quận 1, HCM
        { code: '26734', name: 'Tân Định' },
        { code: '26737', name: 'Đa Kao' },
        { code: '26740', name: 'Bến Nghé' },
        { code: '26743', name: 'Bến Thành' },
        { code: '26746', name: 'Nguyễn Thái Bình' },
        { code: '26749', name: 'Phạm Ngũ Lão' },
        { code: '26752', name: 'Cầu Ông Lãnh' },
        { code: '26755', name: 'Cô Giang' },
        { code: '26758', name: 'Nguyễn Cư Trinh' },
        { code: '26761', name: 'Cầu Kho' }
      ],
      '490': [ // Hải Châu, Đà Nẵng
        { code: '20305', name: 'Thanh Bình' },
        { code: '20308', name: 'Thuận Phước' },
        { code: '20311', name: 'Thạch Thang' },
        { code: '20314', name: 'Hải Châu I' },
        { code: '20317', name: 'Hải Châu II' },
        { code: '20320', name: 'Phước Ninh' },
        { code: '20323', name: 'Hòa Thuận Đông' },
        { code: '20326', name: 'Hòa Thuận Tây' },
        { code: '20329', name: 'Nam Dương' },
        { code: '20332', name: 'Bình Hiên' },
        { code: '20335', name: 'Bình Thuận' },
        { code: '20338', name: 'Hòa Cường Bắc' },
        { code: '20341', name: 'Hòa Cường Nam' }
      ]
    };

    const wards = wardsByDistrict[districtCode] || [];
    res.json(wards);
  } catch (error) {
    console.error('Get wards error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search address (autocomplete)
router.get('/search', authenticate, async (req, res) => {
  try {
    const { query, province_code, district_code } = req.query;
    
    if (!query || query.length < 2) {
      return res.json([]);
    }

    const results = [];
    const lowerQuery = query.toLowerCase();
    
    // Search provinces
    const provincesResult = await db.pool.query(
      "SELECT code, name FROM (SELECT '01' as code, 'Hà Nội' as name UNION ALL SELECT '79', 'Hồ Chí Minh' UNION ALL SELECT '48', 'Đà Nẵng' UNION ALL SELECT '92', 'Cần Thơ') as provinces WHERE LOWER(name) LIKE $1 LIMIT 5",
      [`%${lowerQuery}%`]
    );
    
    provincesResult.rows.forEach(province => {
      results.push({
        type: 'province',
        code: province.code,
        name: province.name,
        display: province.name
      });
    });

    // Search districts if province_code provided
    if (province_code) {
      const districtsResult = await db.pool.query(
        `SELECT code, name FROM (
          SELECT '001' as code, 'Ba Đình' as name, '01' as province_code UNION ALL
          SELECT '002', 'Hoàn Kiếm', '01' UNION ALL
          SELECT '760', 'Quận 1', '79' UNION ALL
          SELECT '761', 'Quận 2', '79'
        ) as districts WHERE province_code = $1 AND LOWER(name) LIKE $2 LIMIT 10`,
        [province_code, `%${lowerQuery}%`]
      );
      
      districtsResult.rows.forEach(district => {
        results.push({
          type: 'district',
          code: district.code,
          name: district.name,
          display: district.name
        });
      });
    }

    // Search wards if district_code provided
    if (district_code) {
      const wardsResult = await db.pool.query(
        `SELECT code, name FROM (
          SELECT '00001' as code, 'Phúc Xá' as name, '001' as district_code UNION ALL
          SELECT '00004', 'Trúc Bạch', '001' UNION ALL
          SELECT '26734', 'Tân Định', '760'
        ) as wards WHERE district_code = $1 AND LOWER(name) LIKE $2 LIMIT 10`,
        [district_code, `%${lowerQuery}%`]
      );
      
      wardsResult.rows.forEach(ward => {
        results.push({
          type: 'ward',
          code: ward.code,
          name: ward.name,
          display: ward.name
        });
      });
    }
    
    res.json(results.slice(0, 20)); // Limit to 20 results
  } catch (error) {
    console.error('Address search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


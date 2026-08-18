const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\phamm\\.gemini\\antigravity\\scratch\\admin-staff\\src';

const settingsTabPath = path.join(dir, 'tabs', 'SettingsTab.jsx');
const employeesTabPath = path.join(dir, 'tabs', 'EmployeesTab.jsx');

// SettingsTab.jsx replacements
let settingsCode = fs.readFileSync(settingsTabPath, 'utf8');

settingsCode = settingsCode.replace(
  "import React, { useState, useEffect } from 'react';",
  "import React, { useState, useEffect } from 'react';\nimport { useTranslation } from 'react-i18next';"
);

settingsCode = settingsCode.replace(
  "const { storeId, storeData } = useStore();",
  "const { storeId, storeData } = useStore();\n  const { t } = useTranslation();"
);

const settingsReplacements = [
  ['<h2 className="text-2xl font-bold text-gray-900">Cấu Hình Cửa Hàng</h2>', '<h2 className="text-2xl font-bold text-gray-900">{t(\'settingsTab.title\')}</h2>'],
  ['<p className="text-gray-500 mt-1">Cập nhật thông tin cửa hàng, Wi-Fi và tọa độ định vị để nhân viên chấm công.</p>', '<p className="text-gray-500 mt-1">{t(\'settingsTab.description\')}</p>'],
  ['<h3 className="text-lg font-semibold">Thông tin chung</h3>', '<h3 className="text-lg font-semibold">{t(\'settingsTab.generalInfo\')}</h3>'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Tên cửa hàng / Quán</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'settingsTab.storeName\')}</label>'],
  ['placeholder="VD: Cà Phê Mộc"', 'placeholder={t(\'settingsTab.storeNamePlaceholder\')}'],
  ['<h3 className="text-lg font-semibold">Cấu hình Vị trí GPS</h3>', '<h3 className="text-lg font-semibold">{t(\'settingsTab.gpsConfig\')}</h3>'],
  ['Lấy vị trí hiện tại', '{t(\'settingsTab.getCurrentLocation\')}'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Vĩ độ (Latitude)</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'settingsTab.latitude\')}</label>'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Kinh độ (Longitude)</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'settingsTab.longitude\')}</label>'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Bán kính cho phép (m)</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'settingsTab.allowedRadius\')}</label>'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Mở khóa điểm danh trước ca làm (phút)</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'settingsTab.allowCheckInBefore\')}</label>'],
  ['<label className="block text-sm font-medium text-gray-900">Cho phép nhân viên chụp ảnh quán khi checkout</label>', '<label className="block text-sm font-medium text-gray-900">{t(\'settingsTab.requireCheckoutPhoto\')}</label>'],
  ['<p className="text-xs text-gray-500 mt-1">Bắt buộc nhân viên gửi ảnh xác nhận trước khi check-out.</p>', '<p className="text-xs text-gray-500 mt-1">{t(\'settingsTab.requireCheckoutPhotoDesc\')}</p>'],
  ['<p className="text-sm font-bold text-gray-500">Tính năng Pro</p>', '<p className="text-sm font-bold text-gray-500">{t(\'settingsTab.proFeature\')}</p>'],
  ['<p className="text-xs text-gray-400">Nâng cấp gói Pro để sử dụng</p>', '<p className="text-xs text-gray-400">{t(\'settingsTab.upgradeToPro\')}</p>'],
  ['<h3 className="text-lg font-semibold">Cấu hình Lương & Ứng tiền</h3>', '<h3 className="text-lg font-semibold">{t(\'settingsTab.payrollConfig\')}</h3>'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Ngày nhận lương hàng tháng (Payday)</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'settingsTab.payday\')}</label>'],
  ['<p className="text-xs text-gray-500 mt-1">Giao diện chốt lương sẽ xuất hiện vào ngày này.</p>', '<p className="text-xs text-gray-500 mt-1">{t(\'settingsTab.paydayDesc\')}</p>'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Phần trăm lương được phép ứng (%)</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'settingsTab.maxAdvancePercent\')}</label>'],
  ['<p className="text-xs text-gray-500 mt-1">Hạn mức ứng = (Tổng lương đã làm) x (%)</p>', '<p className="text-xs text-gray-500 mt-1">{t(\'settingsTab.maxAdvancePercentDesc\')}</p>'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Số ngày làm tối thiểu để được ứng tiền</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'settingsTab.minAdvanceDays\')}</label>'],
  ['<p className="text-xs text-gray-500 mt-1">Nếu nhân viên chưa làm đủ số ngày này trong tháng, họ sẽ không thể gửi yêu cầu ứng tiền.</p>', '<p className="text-xs text-gray-500 mt-1">{t(\'settingsTab.minAdvanceDaysDesc\')}</p>'],
  ['{isSaving ? \'Đang lưu...\' : \'Lưu Cấu Hình\'}', '{isSaving ? t(\'settingsTab.saving\') : t(\'settingsTab.saveSettings\')}']
];

settingsReplacements.forEach(([from, to]) => {
  settingsCode = settingsCode.replace(from, to);
});

fs.writeFileSync(settingsTabPath, settingsCode);

// EmployeesTab.jsx replacements
let employeesCode = fs.readFileSync(employeesTabPath, 'utf8');

employeesCode = employeesCode.replace(
  "import React, { useState, useEffect } from 'react';",
  "import React, { useState, useEffect } from 'react';\nimport { useTranslation } from 'react-i18next';"
);

employeesCode = employeesCode.replace(
  "const { storeId, storeData } = useStore();",
  "const { storeId, storeData } = useStore();\n  const { t } = useTranslation();"
);

const empReplacements = [
  ['<h2 className="text-2xl font-bold text-gray-900">Quản Lý Nhân Sự</h2>', '<h2 className="text-2xl font-bold text-gray-900">{t(\'employeesTab.title\')}</h2>'],
  ['<p className="text-gray-500 mt-1">Danh sách thông tin nhân viên và mức lương.</p>', '<p className="text-gray-500 mt-1">{t(\'employeesTab.description\')}</p>'],
  ['Thêm Nhân Viên', '{t(\'employeesTab.addEmployee\')}'],
  ['placeholder="Tìm kiếm theo Tên hoặc Mã NV..."', 'placeholder={t(\'employeesTab.searchPlaceholder\')}'],
  ['>Mã NV</th>', '>{t(\'employeesTab.empCode\')}</th>'],
  ['>Họ và Tên</th>', '>{t(\'employeesTab.fullName\')}</th>'],
  ['>Chức vụ</th>', '>{t(\'employeesTab.position\')}</th>'],
  ['>Quê Quán</th>', '>{t(\'employeesTab.hometown\')}</th>'],
  ['>CCCD</th>', '>{t(\'employeesTab.idCard\')}</th>'],
  ['>Hình thức lương</th>', '>{t(\'employeesTab.salaryType\')}</th>'],
  ['>Mức lương</th>', '>{t(\'employeesTab.salaryRate\')}</th>'],
  ['>Ngân hàng</th>', '>{t(\'employeesTab.bank\')}</th>'],
  ['>Trạng thái</th>', '>{t(\'employeesTab.status\')}</th>'],
  ['>Thao tác</th>', '>{t(\'employeesTab.actions\')}</th>'],
  ['Không tìm thấy nhân viên nào.', '{t(\'employeesTab.noEmployeesFound\')}'],
  ['{modalMode === \'add\' ? \'Thêm Nhân Viên Mới\' : \'Cập Nhật Nhân Viên\'}', '{modalMode === \'add\' ? t(\'employeesTab.addEmployeeNew\') : t(\'employeesTab.updateEmployee\')}'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại (Mã PIN) *</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'employeesTab.phonePin\')} *</label>'],
  ['<p className="text-xs text-gray-500 mt-1">Dùng để nhân viên đăng nhập điểm danh.</p>', '<p className="text-xs text-gray-500 mt-1">{t(\'employeesTab.loginPinDesc\')}</p>'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Họ và Tên *</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'employeesTab.fullName\')} *</label>'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Chức vụ</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'employeesTab.position\')}</label>'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Số CCCD</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'employeesTab.idCard\')}</label>'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Quê Quán</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'employeesTab.hometown\')}</label>'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Hình thức trả lương *</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'employeesTab.salaryTypeForm\')} *</label>'],
  ['Theo giờ (HOURLY)', '{t(\'employeesTab.hourly\')}'],
  ['Theo ngày (DAILY)', '{t(\'employeesTab.daily\')}'],
  ['Theo tháng (MONTHLY)', '{t(\'employeesTab.monthly\')}'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Mức lương (VNĐ) *</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'employeesTab.salaryRateForm\')} *</label>'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Tên Ngân Hàng</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'employeesTab.bankName\')}</label>'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Số Tài Khoản</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'employeesTab.bankAccount\')}</label>'],
  ['<p className="font-semibold text-red-800 text-sm">Tạm khóa tài khoản</p>', '<p className="font-semibold text-red-800 text-sm">{t(\'employeesTab.lockAccount\')}</p>'],
  ['<p className="text-xs text-red-600 mt-0.5">Nhân viên sẽ bị đăng xuất và không thể đăng nhập cho đến khi được mở khóa.</p>', '<p className="text-xs text-red-600 mt-0.5">{t(\'employeesTab.lockAccountDesc\')}</p>'],
  ['Hủy\n                </button>', '{t(\'employeesTab.cancel\')}\n                </button>'],
  ['{modalMode === \'add\' ? \'Lưu Nhân Viên\' : \'Cập Nhật\'}', '{modalMode === \'add\' ? t(\'employeesTab.saveEmployee\') : t(\'employeesTab.update\')}'],
  ['Điều chỉnh lương', '{t(\'employeesTab.adjustSalary\')}'],
  ['Điều Chỉnh Lương', '{t(\'employeesTab.adjustSalary\')}'],
  ['<TrendingUp className="w-4 h-4"/> Tăng Lương', '<TrendingUp className="w-4 h-4"/> {t(\'employeesTab.increaseSalary\')}'],
  ['<Gift className="w-4 h-4"/> Thưởng', '<Gift className="w-4 h-4"/> {t(\'employeesTab.bonus\')}'],
  ['<TrendingDown className="w-4 h-4"/> Trừ Lương', '<TrendingDown className="w-4 h-4"/> {t(\'employeesTab.decreaseSalary\')}'],
  ['<p className="font-semibold mb-1">Cập nhật Lương Cơ Bản</p>', '<p className="font-semibold mb-1">{t(\'employeesTab.updateBaseSalary\')}</p>'],
  ['<p className="font-semibold mb-1">Thưởng nóng</p>', '<p className="font-semibold mb-1">{t(\'employeesTab.bonusHeader\')}</p>'],
  ['<p className="font-semibold mb-1">Tạo phiếu phạt</p>', '<p className="font-semibold mb-1">{t(\'employeesTab.penaltyHeader\')}</p>'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Hình thức trả lương mới</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'employeesTab.newSalaryType\')}</label>'],
  ['{adjustForm.type === \'increase\' ? \'Mức lương mới (VNĐ)\' : adjustForm.type === \'bonus\' ? \'Số tiền thưởng (VNĐ)\' : \'Số tiền phạt (VNĐ)\'}', '{adjustForm.type === \'increase\' ? t(\'employeesTab.newSalaryRate\') : adjustForm.type === \'bonus\' ? t(\'employeesTab.bonusAmount\') : t(\'employeesTab.penaltyAmount\')}'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Lý do / Ghi chú</label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'employeesTab.reason\')}</label>'],
  ['Xác nhận', '{t(\'employeesTab.confirm\')}'],
  ['Khóa tài khoản', '{t(\'employeesTab.lockAccountTitle\')}'],
  ['Bạn đang <strong>khóa tài khoản</strong> của nhân viên', '{t(\'employeesTab.lockingAccountOf\')}'],
  ['<label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú / Lý do khóa <span className="text-red-500">*</span></label>', '<label className="block text-sm font-medium text-gray-700 mb-1">{t(\'employeesTab.lockReason\')} <span className="text-red-500">*</span></label>'],
  ['Xác nhận Khóa', '{t(\'employeesTab.confirmLock\')}'],
  ['title: \'Nhận Thưởng\',', 'title: t(\'employeesTab.receiveBonus\'),'],
  ['title: \'Thông Báo Phạt / Trừ Lương\',', 'title: t(\'employeesTab.penaltyNotice\'),'],
  ['title: \'Cập Nhật Lương Cơ Bản\',', 'title: t(\'employeesTab.baseSalaryUpdate\'),'],
];

empReplacements.forEach(([from, to]) => {
  employeesCode = employeesCode.split(from).join(to);
});

fs.writeFileSync(employeesTabPath, employeesCode);

console.log('Success!');

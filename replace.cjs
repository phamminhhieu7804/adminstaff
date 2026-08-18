const fs = require('fs');
let content = fs.readFileSync('src/tabs/ShiftsTab.jsx', 'utf8');

// Imports
content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { useTranslation } from 'react-i18next';");

// Hook
content = content.replace("export default function ShiftsTab() {", "export default function ShiftsTab() {\n  const { t } = useTranslation();");

// JS Messages
content = content.replace("showToast(modalMode === 'add' ? 'Thêm ca làm thành công!' : 'Cập nhật ca làm thành công!');", "showToast(modalMode === 'add' ? t('shiftsTab.addSuccess') : t('shiftsTab.updateSuccess'));");
content = content.replace('showToast("Có lỗi xảy ra khi lưu thông tin.", "error");', "showToast(t('shiftsTab.saveError'), 'error');");

content = content.replace("'Xóa ca làm'", "t('shiftsTab.deleteShiftTitle')");
content = content.replace("'Bạn có chắc chắn muốn xóa ca làm này?'", "t('shiftsTab.deleteShiftConfirm')");
content = content.replace("showToast('Đã xóa ca làm.')", "showToast(t('shiftsTab.deleteShiftSuccess'))");
content = content.replace('showToast("Có lỗi xảy ra khi xóa.", "error")', "showToast(t('shiftsTab.deleteError'), 'error')");

content = content.replace("'Xóa nhân viên khỏi ca'", "t('shiftsTab.deleteEmpTitle')");
content = content.replace("'Bạn có chắc muốn xóa nhân viên khỏi ca này?'", "t('shiftsTab.deleteEmpConfirm')");
content = content.replace("showToast('Đã xóa xếp ca.')", "showToast(t('shiftsTab.deleteEmpSuccess'))");
content = content.replace("'Có lỗi xảy ra'", "t('shiftsTab.error')");

content = content.replace("showToast('Đã xóa ca và khóa tài khoản nhân viên.')", "showToast(t('shiftsTab.lockEmpSuccess'))");
content = content.replace("showToast('Có lỗi xảy ra khi khóa.', 'error')", "showToast(t('shiftsTab.lockEmpError'), 'error')");

content = content.replace("showToast('Cập nhật cấu hình đăng ký ca thành công!')", "showToast(t('shiftsTab.updateRegSuccess'))");
content = content.replace('showToast("Không thể cập nhật cấu hình.", "error")', "showToast(t('shiftsTab.updateRegError'), 'error')");

content = content.replace("showToast('Đã thêm nhân viên vào ca!')", "showToast(t('shiftsTab.addEmpSuccess'))");
content = content.replace('showToast("Lỗi khi thêm lịch", "error")', "showToast(t('shiftsTab.addEmpError'), 'error')");

content = content.replace("'Đang Mở Đăng Ký Ca'", "t('shiftsTab.regOpen')");
content = content.replace("'Đã Khóa Đăng Ký Ca'", "t('shiftsTab.regClosed')");
content = content.replace("`Đang Mở (${dayNames[openDay]} - ${dayNames[closeDay]})`", "`\\${t('shiftsTab.regOpenAuto')} (\\${dayNames[openDay]} - \\${dayNames[closeDay]})`");
content = content.replace("`Đã Khóa (${dayNames[openDay]} - ${dayNames[closeDay]})`", "`\\${t('shiftsTab.regClosedAuto')} (\\${dayNames[openDay]} - \\${dayNames[closeDay]})`");
content = content.replace("const dayNames = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];", "const dayNames = ['', t('shiftsTab.day2'), t('shiftsTab.day3'), t('shiftsTab.day4'), t('shiftsTab.day5'), t('shiftsTab.day6'), t('shiftsTab.day7'), t('shiftsTab.day8')];");

// JSX replacements
content = content.replace(/>Lên Lịch Làm Việc</g, ">{t('shiftsTab.scheduleTitle')}<");
content = content.replace(/>Xếp ca làm cho nhân viên hoặc mở để nhân viên tự đăng ký\.</g, ">{t('shiftsTab.scheduleDesc')}<");
content = content.replace(/> Lịch Tuần</g, "> {t('shiftsTab.weeklySchedule')}<");
content = content.replace(/>Ca \\ Ngày</g, ">{t('shiftsTab.shiftDay')}<");
content = content.replace(/>Tối đa: /g, ">{t('shiftsTab.max')}: ");
content = content.replace(/>Danh Sách Ca Làm</g, ">{t('shiftsTab.shiftListTitle')}<");
content = content.replace(/>Thiết lập các ca làm việc cho nhân viên\.</g, ">{t('shiftsTab.shiftListDesc')}<");

content = content.replace(/Thêm Ca Làm\n\s+<\/button>/g, "{t('shiftsTab.addShift')}\n          </button>");

content = content.replace(/>Tên Ca Làm</g, ">{t('shiftsTab.shiftName')}<");
content = content.replace(/>Thời gian</g, ">{t('shiftsTab.time')}<");
content = content.replace(/>Giới hạn NV</g, ">{t('shiftsTab.empLimit')}<");
content = content.replace(/>Thiết lập thêm</g, ">{t('shiftsTab.extraSettings')}<");
content = content.replace(/>Thao tác</g, ">{t('shiftsTab.action')}<");

content = content.replace(/>\s*Chưa có ca làm nào được thiết lập\.\s*</g, ">{t('shiftsTab.noShifts')}<");

content = content.replace(/>Phạt trễ: /g, ">{t('shiftsTab.latePenalty')}: ");
content = content.replace(/>Không phạt trễ</g, ">{t('shiftsTab.noLatePenalty')}<");
content = content.replace(/>Tăng ca: /g, ">{t('shiftsTab.overtime')}: ");
content = content.replace(/>Không tính tăng ca</g, ">{t('shiftsTab.noOvertime')}<");

content = content.replace(/\{modalMode === 'add' \? 'Thêm Ca Làm Mới' : 'Cập Nhật Ca Làm'\}/g, "{modalMode === 'add' ? t('shiftsTab.addNewShift') : t('shiftsTab.updateShift')}");
content = content.replace(/>Tên Ca Làm \*</g, ">{t('shiftsTab.shiftNameReq')}<");
content = content.replace(/placeholder="VD: Ca Sáng\.\.\."/g, "placeholder={t('shiftsTab.shiftNamePlaceholder')}");
content = content.replace(/>Giờ bắt đầu \*</g, ">{t('shiftsTab.startTimeReq')}<");
content = content.replace(/>Giờ kết thúc \*</g, ">{t('shiftsTab.endTimeReq')}<");
content = content.replace(/>Giới hạn số nhân viên \(Người \/ Ca\) \*</g, ">{t('shiftsTab.empLimitReq')}<");
content = content.replace(/>Phạt đi trễ \(VNĐ\)</g, ">{t('shiftsTab.latePenaltyVND')}<");
content = content.replace(/placeholder="Trống = 0"/g, "placeholder={t('shiftsTab.emptyIsZero')}");
content = content.replace(/Cho phép tăng ca/g, "{t('shiftsTab.allowOvertime')}");
content = content.replace(/placeholder="Mức lương \/ 1 giờ"/g, "placeholder={t('shiftsTab.wagePerHour')}");

content = content.replace(/>Hủy</g, ">{t('shiftsTab.cancel')}<");
content = content.replace(/\{modalMode === 'add' \? 'Lưu Ca Làm' : 'Cập Nhật'\}/g, "{modalMode === 'add' ? t('shiftsTab.saveShift') : t('shiftsTab.update')}");

content = content.replace(/>\s*Khóa tài khoản\s*</g, "> {t('shiftsTab.lockAccount')}<");

content = content.replace(/Bạn đang xóa ca và <strong>khóa tài khoản<\/strong> của nhân viên <span/g, "{t('shiftsTab.lockWarning1')} <span");
content = content.replace(/>\{lockEmpModal.employeeName\}<\/span>\. Nhân viên sẽ bị văng ra khỏi hệ thống ngay lập tức\./g, ">{lockEmpModal.employeeName}</span>{t('shiftsTab.lockWarning2')}");

content = content.replace(/>Ghi chú \/ Lý do vi phạm <span/g, ">{t('shiftsTab.reasonViolation')} <span");
content = content.replace(/placeholder="VD: Vi phạm quy định giờ giấc\.\.\."/g, "placeholder={t('shiftsTab.reasonPlaceholder')}");
content = content.replace(/>\s*Xác nhận Khóa\s*</g, ">{t('shiftsTab.confirmLock')}<");

content = content.replace(/Xếp ca <span/g, "{t('shiftsTab.assignShift')} <span");
content = content.replace(/Ngày \{format/g, "{t('shiftsTab.date')} {format");
content = content.replace(/Danh sách nhân viên \(Tối đa /g, "{t('shiftsTab.empListMax')}");
content = content.replace(/Đã chọn: /g, "{t('shiftsTab.selected')}: ");
content = content.replace(/>Chưa có ai đăng ký ca này\.</g, ">{t('shiftsTab.noRegistration')}<");
content = content.replace(/title="Xóa khỏi ca và Khóa tài khoản"/g, "title={t('shiftsTab.deleteAndLock')}");
content = content.replace(/title="Xóa khỏi ca"/g, "title={t('shiftsTab.removeFromShift')}");

content = content.replace(/-- Bấm để chọn nhân viên --/g, "-- {t('shiftsTab.clickToSelectEmp')} --");
content = content.replace(/>Thêm<\/button>/g, ">{t('shiftsTab.add')}</button>");

content = content.replace(/>Cấu hình Đăng ký Ca</g, ">{t('shiftsTab.regSettings')}<");
content = content.replace(/>Chế độ Mở\/Đóng</g, ">{t('shiftsTab.openCloseMode')}<");
content = content.replace(/>Thủ công \(Tự Mở\/Khóa bằng tay\)</g, ">{t('shiftsTab.manualMode')}<");
content = content.replace(/>Tự động \(Theo ngày trong tuần\)</g, ">{t('shiftsTab.autoMode')}<");
content = content.replace(/>Đang cho phép đăng ký ca \(Mở khóa\)</g, ">{t('shiftsTab.allowReg')}<");
content = content.replace(/>Nhân viên có thể vào app để đăng ký ca làm khi mục này được bật\.</g, ">{t('shiftsTab.allowRegDesc')}<");

content = content.replace(/<p className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-100">\s*Hệ thống sẽ tự động mở và khóa đăng ký ca hằng tuần theo các ngày bạn chọn\. Nhân viên sẽ đăng ký cho <b>tuần làm việc tiếp theo<\/b>\.\s*<\/p>/g, "<p className=\"text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-100\" dangerouslySetInnerHTML={{ __html: t('shiftsTab.autoRegDesc') }} />");

content = content.replace(/>Mở vào thứ</g, ">{t('shiftsTab.openOnDay')}<");
content = content.replace(/>Đóng vào thứ</g, ">{t('shiftsTab.closeOnDay')}<");
content = content.replace(/\{isSubmitting \? 'Đang lưu\.\.\.' : 'Lưu cấu hình'\}/g, "{isSubmitting ? t('shiftsTab.saving') : t('shiftsTab.saveConfig')}");

// Days
content = content.replace(/>Thứ 2</g, ">{t('shiftsTab.day2')}<");
content = content.replace(/>Thứ 3</g, ">{t('shiftsTab.day3')}<");
content = content.replace(/>Thứ 4</g, ">{t('shiftsTab.day4')}<");
content = content.replace(/>Thứ 5</g, ">{t('shiftsTab.day5')}<");
content = content.replace(/>Thứ 6</g, ">{t('shiftsTab.day6')}<");
content = content.replace(/>Thứ 7</g, ">{t('shiftsTab.day7')}<");
content = content.replace(/>Chủ nhật</g, ">{t('shiftsTab.day8')}<");

fs.writeFileSync('src/tabs/ShiftsTab.jsx', content);

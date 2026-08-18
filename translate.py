import json

# ShiftsTab replacements
shifts_replacements = [
    ("import { vi } from 'date-fns/locale';", "import { vi } from 'date-fns/locale';\nimport { useTranslation } from 'react-i18next';"),
    ("export default function ShiftsTab() {", "export default function ShiftsTab() {\n  const { t } = useTranslation();"),
    
    # Toast messages
    ("'Thêm ca làm thành công!'", "t('shiftsTab.addSuccess')"),
    ("'Cập nhật ca làm thành công!'", "t('shiftsTab.updateSuccess')"),
    ('"Có lỗi xảy ra khi lưu thông tin."', "t('shiftsTab.saveError')"),
    ("'Xóa ca làm'", "t('shiftsTab.deleteShiftTitle')"),
    ("'Bạn có chắc chắn muốn xóa ca làm này?'", "t('shiftsTab.deleteShiftConfirm')"),
    ("'Đã xóa ca làm.'", "t('shiftsTab.deleteShiftSuccess')"),
    ('"Có lỗi xảy ra khi xóa."', "t('shiftsTab.deleteError')"),
    ("'Xóa nhân viên khỏi ca'", "t('shiftsTab.deleteEmpTitle')"),
    ("'Bạn có chắc muốn xóa nhân viên khỏi ca này?'", "t('shiftsTab.deleteEmpConfirm')"),
    ("'Đã xóa xếp ca.'", "t('shiftsTab.deleteEmpSuccess')"),
    ("'Có lỗi xảy ra'", "t('shiftsTab.error')"),
    ("'Đã xóa ca và khóa tài khoản nhân viên.'", "t('shiftsTab.lockEmpSuccess')"),
    ("'Có lỗi xảy ra khi khóa.'", "t('shiftsTab.lockEmpError')"),
    ("'Cập nhật cấu hình đăng ký ca thành công!'", "t('shiftsTab.updateRegSuccess')"),
    ('"Không thể cập nhật cấu hình."', "t('shiftsTab.updateRegError')"),
    ("'Đã thêm nhân viên vào ca!'", "t('shiftsTab.addEmpSuccess')"),
    ('"Lỗi khi thêm lịch"', "t('shiftsTab.addEmpError')"),

    # Registration status
    ("'Đang Mở Đăng Ký Ca'", "t('shiftsTab.regOpen')"),
    ("'Đã Khóa Đăng Ký Ca'", "t('shiftsTab.regClosed')"),
    ("`Đang Mở (${dayNames[openDay]} - ${dayNames[closeDay]})`", "`\\${t('shiftsTab.regOpenAuto')} (${dayNames[openDay]} - ${dayNames[closeDay]})`"),
    ("`Đã Khóa (${dayNames[openDay]} - ${dayNames[closeDay]})`", "`\\${t('shiftsTab.regClosedAuto')} (${dayNames[openDay]} - ${dayNames[closeDay]})`"),
    ("['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']", "[t('shiftsTab.day0'), t('shiftsTab.day2'), t('shiftsTab.day3'), t('shiftsTab.day4'), t('shiftsTab.day5'), t('shiftsTab.day6'), t('shiftsTab.day7'), t('shiftsTab.day8')]"),

    # Text nodes
    (">Lên Lịch Làm Việc<", ">{t('shiftsTab.scheduleTitle')}<"),
    (">Xếp ca làm cho nhân viên hoặc mở để nhân viên tự đăng ký.<", ">{t('shiftsTab.scheduleDesc')}<"),
    ("> Lịch Tuần<", "> {t('shiftsTab.weeklySchedule')}<"),
    (">Ca \\ Ngày<", ">{t('shiftsTab.shiftDay')}<"),
    (">Tối đa: ", ">{t('shiftsTab.max')}: "),
    (">Danh Sách Ca Làm<", ">{t('shiftsTab.shiftListTitle')}<"),
    (">Thiết lập các ca làm việc cho nhân viên.<", ">{t('shiftsTab.shiftListDesc')}<"),
    (">Thêm Ca Làm\\n", ">{t('shiftsTab.addShift')}\\n"),
    ("Thêm Ca Làm<", "{t('shiftsTab.addShift')}<"),
    (">Tên Ca Làm<", ">{t('shiftsTab.shiftName')}<"),
    (">Thời gian<", ">{t('shiftsTab.time')}<"),
    (">Giới hạn NV<", ">{t('shiftsTab.empLimit')}<"),
    (">Thiết lập thêm<", ">{t('shiftsTab.extraSettings')}<"),
    (">Thao tác<", ">{t('shiftsTab.action')}<"),
    (">Chưa có ca làm nào được thiết lập.<", ">{t('shiftsTab.noShifts')}<"),
    (">Phạt trễ: ", ">{t('shiftsTab.latePenalty')}: "),
    (">Không phạt trễ<", ">{t('shiftsTab.noLatePenalty')}<"),
    (">Tăng ca: ", ">{t('shiftsTab.overtime')}: "),
    (">Không tính tăng ca<", ">{t('shiftsTab.noOvertime')}<"),
    ("modalMode === 'add' ? 'Thêm Ca Làm Mới' : 'Cập Nhật Ca Làm'", "modalMode === 'add' ? t('shiftsTab.addNewShift') : t('shiftsTab.updateShift')"),
    (">Tên Ca Làm *<", ">{t('shiftsTab.shiftNameReq')}<"),
    ('placeholder="VD: Ca Sáng..."', 'placeholder={t("shiftsTab.shiftNamePlaceholder")}'),
    (">Giờ bắt đầu *<", ">{t('shiftsTab.startTimeReq')}<"),
    (">Giờ kết thúc *<", ">{t('shiftsTab.endTimeReq')}<"),
    (">Giới hạn số nhân viên (Người / Ca) *<", ">{t('shiftsTab.empLimitReq')}<"),
    (">Phạt đi trễ (VNĐ)<", ">{t('shiftsTab.latePenaltyVND')}<"),
    ('placeholder="Trống = 0"', 'placeholder={t("shiftsTab.emptyIsZero")}'),
    (">Cho phép tăng ca\\n", ">{t('shiftsTab.allowOvertime')}\\n"),
    ('placeholder="Mức lương / 1 giờ"', 'placeholder={t("shiftsTab.wagePerHour")}'),
    (">Hủy<", ">{t('shiftsTab.cancel')}<"),
    ("modalMode === 'add' ? 'Lưu Ca Làm' : 'Cập Nhật'", "modalMode === 'add' ? t('shiftsTab.saveShift') : t('shiftsTab.update')"),
    ("> Khóa tài khoản\\n", "> {t('shiftsTab.lockAccount')}\\n"),
    ("Bạn đang xóa ca và <strong>khóa tài khoản</strong> của nhân viên ", "t('shiftsTab.lockWarning1') "),
    (". Nhân viên sẽ bị văng ra khỏi hệ thống ngay lập tức.", " t('shiftsTab.lockWarning2')"),
    (">Ghi chú / Lý do vi phạm <", ">{t('shiftsTab.reasonViolation')} <"),
    ('placeholder="VD: Vi phạm quy định giờ giấc..."', 'placeholder={t("shiftsTab.reasonPlaceholder")}'),
    (">Xác nhận Khóa\\n", ">{t('shiftsTab.confirmLock')}\\n"),
    ("Xếp ca ", "{t('shiftsTab.assignShift')} "),
    ("Ngày ", "{t('shiftsTab.date')} "),
    (">Danh sách nhân viên (Tối đa ", ">{t('shiftsTab.empListMax')} ("),
    ("Đã chọn: ", "{t('shiftsTab.selected')}: "),
    (">Chưa có ai đăng ký ca này.<", ">{t('shiftsTab.noRegistration')}<"),
    ('title="Xóa khỏi ca và Khóa tài khoản"', 'title={t("shiftsTab.deleteAndLock")}'),
    ('title="Xóa khỏi ca"', 'title={t("shiftsTab.removeFromShift")}'),
    ("-- Bấm để chọn nhân viên --", "-- {t('shiftsTab.clickToSelectEmp')} --"),
    (">Thêm<", ">{t('shiftsTab.add')}<"),
    (">Cấu hình Đăng ký Ca<", ">{t('shiftsTab.regSettings')}<"),
    (">Chế độ Mở/Đóng<", ">{t('shiftsTab.openCloseMode')}<"),
    (">Thủ công (Tự Mở/Khóa bằng tay)<", ">{t('shiftsTab.manualMode')}<"),
    (">Tự động (Theo ngày trong tuần)<", ">{t('shiftsTab.autoMode')}<"),
    (">Đang cho phép đăng ký ca (Mở khóa)<", ">{t('shiftsTab.allowReg')}<"),
    (">Nhân viên có thể vào app để đăng ký ca làm khi mục này được bật.<", ">{t('shiftsTab.allowRegDesc')}<"),
    ("Hệ thống sẽ tự động mở và khóa đăng ký ca hằng tuần theo các ngày bạn chọn. Nhân viên sẽ đăng ký cho <b>tuần làm việc tiếp theo</b>.", "t('shiftsTab.autoRegDesc')"),
    (">Mở vào thứ<", ">{t('shiftsTab.openOnDay')}<"),
    (">Thứ 2<", ">{t('shiftsTab.day2')}<"),
    (">Thứ 3<", ">{t('shiftsTab.day3')}<"),
    (">Thứ 4<", ">{t('shiftsTab.day4')}<"),
    (">Thứ 5<", ">{t('shiftsTab.day5')}<"),
    (">Thứ 6<", ">{t('shiftsTab.day6')}<"),
    (">Thứ 7<", ">{t('shiftsTab.day7')}<"),
    (">Chủ nhật<", ">{t('shiftsTab.day8')}<"),
    (">Đóng vào thứ<", ">{t('shiftsTab.closeOnDay')}<"),
    (">Đang lưu...<", ">{t('shiftsTab.saving')}<"),
    (">Lưu cấu hình<", ">{t('shiftsTab.saveConfig')}<"),
    ("isSubmitting ? 'Đang lưu...' : 'Lưu cấu hình'", "isSubmitting ? t('shiftsTab.saving') : t('shiftsTab.saveConfig')")
]

shifts_translations = {
    'addSuccess': ('Thêm ca làm thành công!', 'Shift added successfully!'),
    'updateSuccess': ('Cập nhật ca làm thành công!', 'Shift updated successfully!'),
    'saveError': ('Có lỗi xảy ra khi lưu thông tin.', 'Error saving information.'),
    'deleteShiftTitle': ('Xóa ca làm', 'Delete Shift'),
    'deleteShiftConfirm': ('Bạn có chắc chắn muốn xóa ca làm này?', 'Are you sure you want to delete this shift?'),
    'deleteShiftSuccess': ('Đã xóa ca làm.', 'Shift deleted.'),
    'deleteError': ('Có lỗi xảy ra khi xóa.', 'Error deleting.'),
    'deleteEmpTitle': ('Xóa nhân viên khỏi ca', 'Remove employee from shift'),
    'deleteEmpConfirm': ('Bạn có chắc muốn xóa nhân viên khỏi ca này?', 'Are you sure you want to remove this employee?'),
    'deleteEmpSuccess': ('Đã xóa xếp ca.', 'Schedule deleted.'),
    'error': ('Có lỗi xảy ra', 'An error occurred'),
    'lockEmpSuccess': ('Đã xóa ca và khóa tài khoản nhân viên.', 'Shift deleted and account locked.'),
    'lockEmpError': ('Có lỗi xảy ra khi khóa.', 'Error locking account.'),
    'updateRegSuccess': ('Cập nhật cấu hình đăng ký ca thành công!', 'Registration settings updated successfully!'),
    'updateRegError': ('Không thể cập nhật cấu hình.', 'Could not update settings.'),
    'addEmpSuccess': ('Đã thêm nhân viên vào ca!', 'Employee added to shift!'),
    'addEmpError': ('Lỗi khi thêm lịch', 'Error adding schedule'),
    'regOpen': ('Đang Mở Đăng Ký Ca', 'Shift Registration Open'),
    'regClosed': ('Đã Khóa Đăng Ký Ca', 'Shift Registration Closed'),
    'regOpenAuto': ('Đang Mở', 'Open'),
    'regClosedAuto': ('Đã Khóa', 'Closed'),
    'day0': ('', ''),
    'day2': ('Thứ 2', 'Mon'),
    'day3': ('Thứ 3', 'Tue'),
    'day4': ('Thứ 4', 'Wed'),
    'day5': ('Thứ 5', 'Thu'),
    'day6': ('Thứ 6', 'Fri'),
    'day7': ('Thứ 7', 'Sat'),
    'day8': ('Chủ nhật', 'Sun'),
    'scheduleTitle': ('Lên Lịch Làm Việc', 'Work Schedule'),
    'scheduleDesc': ('Xếp ca làm cho nhân viên hoặc mở để nhân viên tự đăng ký.', 'Assign shifts or open for self-registration.'),
    'weeklySchedule': ('Lịch Tuần', 'Weekly Schedule'),
    'shiftDay': ('Ca \\ Ngày', 'Shift \\ Day'),
    'max': ('Tối đa', 'Max'),
    'shiftListTitle': ('Danh Sách Ca Làm', 'Shift List'),
    'shiftListDesc': ('Thiết lập các ca làm việc cho nhân viên.', 'Configure work shifts for employees.'),
    'addShift': ('Thêm Ca Làm', 'Add Shift'),
    'shiftName': ('Tên Ca Làm', 'Shift Name'),
    'time': ('Thời gian', 'Time'),
    'empLimit': ('Giới hạn NV', 'Emp Limit'),
    'extraSettings': ('Thiết lập thêm', 'Extra Settings'),
    'action': ('Thao tác', 'Action'),
    'noShifts': ('Chưa có ca làm nào được thiết lập.', 'No shifts configured yet.'),
    'latePenalty': ('Phạt trễ', 'Late Penalty'),
    'noLatePenalty': ('Không phạt trễ', 'No late penalty'),
    'overtime': ('Tăng ca', 'Overtime'),
    'noOvertime': ('Không tính tăng ca', 'No overtime'),
    'addNewShift': ('Thêm Ca Làm Mới', 'Add New Shift'),
    'updateShift': ('Cập Nhật Ca Làm', 'Update Shift'),
    'shiftNameReq': ('Tên Ca Làm *', 'Shift Name *'),
    'shiftNamePlaceholder': ('VD: Ca Sáng...', 'Ex: Morning Shift...'),
    'startTimeReq': ('Giờ bắt đầu *', 'Start Time *'),
    'endTimeReq': ('Giờ kết thúc *', 'End Time *'),
    'empLimitReq': ('Giới hạn số nhân viên (Người / Ca) *', 'Employee Limit (Person / Shift) *'),
    'latePenaltyVND': ('Phạt đi trễ (VNĐ)', 'Late Penalty (VND)'),
    'emptyIsZero': ('Trống = 0', 'Empty = 0'),
    'allowOvertime': ('Cho phép tăng ca', 'Allow Overtime'),
    'wagePerHour': ('Mức lương / 1 giờ', 'Wage / 1 hour'),
    'cancel': ('Hủy', 'Cancel'),
    'saveShift': ('Lưu Ca Làm', 'Save Shift'),
    'update': ('Cập Nhật', 'Update'),
    'lockAccount': ('Khóa tài khoản', 'Lock Account'),
    'lockWarning1': ('Bạn đang xóa ca và <strong>khóa tài khoản</strong> của nhân viên ', 'You are deleting the shift and <strong>locking the account</strong> of employee '),
    'lockWarning2': ('. Nhân viên sẽ bị văng ra khỏi hệ thống ngay lập tức.', '. The employee will be kicked out of the system immediately.'),
    'reasonViolation': ('Ghi chú / Lý do vi phạm', 'Note / Violation Reason'),
    'reasonPlaceholder': ('VD: Vi phạm quy định giờ giấc...', 'Ex: Time violation...'),
    'confirmLock': ('Xác nhận Khóa', 'Confirm Lock'),
    'assignShift': ('Xếp ca', 'Assign shift'),
    'date': ('Ngày', 'Date'),
    'empListMax': ('Danh sách nhân viên (Tối đa ', 'Employee list (Max '),
    'selected': ('Đã chọn', 'Selected'),
    'noRegistration': ('Chưa có ai đăng ký ca này.', 'No one has registered for this shift.'),
    'deleteAndLock': ('Xóa khỏi ca và Khóa tài khoản', 'Remove from shift and Lock account'),
    'removeFromShift': ('Xóa khỏi ca', 'Remove from shift'),
    'clickToSelectEmp': ('Bấm để chọn nhân viên', 'Click to select employee'),
    'add': ('Thêm', 'Add'),
    'regSettings': ('Cấu hình Đăng ký Ca', 'Registration Settings'),
    'openCloseMode': ('Chế độ Mở/Đóng', 'Open/Close Mode'),
    'manualMode': ('Thủ công (Tự Mở/Khóa bằng tay)', 'Manual (Toggle manually)'),
    'autoMode': ('Tự động (Theo ngày trong tuần)', 'Auto (By day of week)'),
    'allowReg': ('Đang cho phép đăng ký ca (Mở khóa)', 'Allowing shift registration (Unlocked)'),
    'allowRegDesc': ('Nhân viên có thể vào app để đăng ký ca làm khi mục này được bật.', 'Employees can register for shifts when this is enabled.'),
    'autoRegDesc': ('Hệ thống sẽ tự động mở và khóa đăng ký ca hằng tuần theo các ngày bạn chọn. Nhân viên sẽ đăng ký cho <b>tuần làm việc tiếp theo</b>.', 'System will automatically open and close shift registration weekly. Employees will register for the <b>next week</b>.'),
    'openOnDay': ('Mở vào thứ', 'Open on'),
    'closeOnDay': ('Đóng vào thứ', 'Close on'),
    'saving': ('Đang lưu...', 'Saving...'),
    'saveConfig': ('Lưu cấu hình', 'Save config')
}

status_replacements = [
    ("import { useStore } from '../StoreContext';", "import { useStore } from '../StoreContext';\nimport { useTranslation } from 'react-i18next';"),
    ("export default function StatusTab() {", "export default function StatusTab() {\n  const { t } = useTranslation();"),
    
    ("'Nghỉ có phép'", "t('statusTab.approvedLeave')"),
    ("'Vắng không phép'", "t('statusTab.unexcusedAbsence')"),
    ("'Đã gửi thông báo cảnh cáo tới nhân viên!'", "t('statusTab.warningSent')"),
    ("'Lỗi khi gửi thông báo'", "t('statusTab.errorSending')"),

    (">Theo Dõi Trạng Thái<", ">{t('statusTab.statusTrackingTitle')}<"),
    (">Quản lý trạng thái làm việc và gửi cảnh báo đi trễ cho nhân viên.<", ">{t('statusTab.statusTrackingDesc')}<"),
    ('placeholder="Tìm theo Mã NV hoặc Tên NV..."', 'placeholder={t("statusTab.searchPlaceholder")}'),
    (">Đang làm ca: ", ">{t('statusTab.workingShift')}: "),
    (' "(Trễ)"', ' ` (${t("statusTab.late")})`'),
    (">Offline<", ">{t('statusTab.offline')}<"),
    (">Đúng giờ<", ">{t('statusTab.onTime')}<"),
    (">Đi trễ<", ">{t('statusTab.late')}<"),
    (">Bỏ ca<", ">{t('statusTab.skipped')}<"),
    (">Chi tiết Check-in: ", ">{t('statusTab.checkinDetails')}: "),
    (">Tháng này: Đúng giờ (", ">{t('statusTab.thisMonth')}: {t('statusTab.onTime')} ("),
    (") - Đi trễ (", ") - {t('statusTab.late')} ("),
    (">Thời gian<", ">{t('statusTab.time')}<"),
    (">Ca làm<", ">{t('statusTab.shift')}<"),
    (">Trạng thái<", ">{t('statusTab.status')}<"),
    (">Thao tác<", ">{t('statusTab.action')}<"),
    (">Không có dữ liệu hoạt động tháng này<", ">{t('statusTab.noData')}<"),
    ("|| 'Không rõ'", "|| t('statusTab.unknown')"),
    ("> Bỏ ca\\n", "> {t('statusTab.skipped')}\\n"),
    ("> Trễ ", "> {t('statusTab.late')} "),
    (" phút\\n", " {t('statusTab.minutes')}\\n"),
    ("> Đúng giờ\\n", "> {t('statusTab.onTime')}\\n"),
    ("> Gửi cảnh cáo\\n", "> {t('statusTab.sendWarning')}\\n"),
    ("> Gửi nhắc nhở\\n", "> {t('statusTab.sendReminder')}\\n"),
    (">Lịch sử điều chỉnh lương<", ">{t('statusTab.salaryAdjHistory')}<"),
    (">Chưa có dữ liệu biến động lương.<", ">{t('statusTab.noSalaryData')}<"),
    ("adj.type === 'increase' ? 'TĂNG LƯƠNG GỐC' : adj.type === 'bonus' ? 'THƯỞNG' : 'PHẠT'", "adj.type === 'increase' ? t('statusTab.baseSalaryIncrease') : adj.type === 'bonus' ? t('statusTab.bonus') : t('statusTab.penalty')"),
    (">Lý do: ", ">{t('statusTab.reason')}: "),
    ("adj.type === 'increase' ? 'Lên ' : (adj.type === 'bonus' ? '+' : '-')", "adj.type === 'increase' ? t('statusTab.upTo') + ' ' : (adj.type === 'bonus' ? '+' : '-')"),
    ("> Soạn cảnh cáo<", "> {t('statusTab.composeWarning')}<"),
    ("Thông báo này sẽ được gửi trực tiếp đến nhân viên <b>", "{t('statusTab.warningDesc1')} <b>"),
    ("</b>.", "</b> {t('statusTab.warningDesc2')}"),
    (">Nội dung thông báo<", ">{t('statusTab.warningContent')}<"),
    (">Hủy<", ">{t('statusTab.cancel')}<"),
    ("> Gửi ngay\\n", "> {t('statusTab.sendNow')}\\n"),

    ("title: 'Cảnh cáo đi trễ'", "title: t('statusTab.lateWarningTitle')"),
    ("message: `Nhắc nhở: Bạn đã check-in trễ ${log.lateMinutes} phút vào ca [${log.shiftName}] lúc ${format(log.dateObj, 'HH:mm dd/MM/yyyy')}. Yêu cầu bạn đi làm đúng giờ.`", "message: t('statusTab.lateWarningMsg', { minutes: log.lateMinutes, shift: log.shiftName, time: format(log.dateObj, 'HH:mm dd/MM/yyyy') })"),
    ("message: `Nhắc nhở: Bạn đã không đi làm ca [${log.shiftName}] ngày ${format(log.dateObj, 'dd/MM/yyyy')}. Vui lòng giải trình lý do với Quản lý.`", "message: t('statusTab.skipWarningMsg', { shift: log.shiftName, date: format(log.dateObj, 'dd/MM/yyyy') })"),
]

status_translations = {
    'approvedLeave': ('Nghỉ có phép', 'Approved Leave'),
    'unexcusedAbsence': ('Vắng không phép', 'Unexcused Absence'),
    'warningSent': ('Đã gửi thông báo cảnh cáo tới nhân viên!', 'Warning notification sent to employee!'),
    'errorSending': ('Lỗi khi gửi thông báo', 'Error sending notification'),
    'statusTrackingTitle': ('Theo Dõi Trạng Thái', 'Status Tracking'),
    'statusTrackingDesc': ('Quản lý trạng thái làm việc và gửi cảnh báo đi trễ cho nhân viên.', 'Manage working status and send late warnings to employees.'),
    'searchPlaceholder': ('Tìm theo Mã NV hoặc Tên NV...', 'Search by Emp Code or Name...'),
    'workingShift': ('Đang làm ca', 'Working shift'),
    'late': ('Trễ', 'Late'),
    'offline': ('Offline', 'Offline'),
    'onTime': ('Đúng giờ', 'On time'),
    'skipped': ('Bỏ ca', 'Skipped'),
    'checkinDetails': ('Chi tiết Check-in', 'Check-in Details'),
    'thisMonth': ('Tháng này', 'This month'),
    'time': ('Thời gian', 'Time'),
    'shift': ('Ca làm', 'Shift'),
    'status': ('Trạng thái', 'Status'),
    'action': ('Thao tác', 'Action'),
    'noData': ('Không có dữ liệu hoạt động tháng này', 'No activity data this month'),
    'unknown': ('Không rõ', 'Unknown'),
    'minutes': ('phút', 'minutes'),
    'sendWarning': ('Gửi cảnh cáo', 'Send warning'),
    'sendReminder': ('Gửi nhắc nhở', 'Send reminder'),
    'salaryAdjHistory': ('Lịch sử điều chỉnh lương', 'Salary Adjustment History'),
    'noSalaryData': ('Chưa có dữ liệu biến động lương.', 'No salary fluctuation data.'),
    'baseSalaryIncrease': ('TĂNG LƯƠNG GỐC', 'BASE SALARY INCREASE'),
    'bonus': ('THƯỞNG', 'BONUS'),
    'penalty': ('PHẠT', 'PENALTY'),
    'reason': ('Lý do', 'Reason'),
    'upTo': ('Lên', 'Up to'),
    'composeWarning': ('Soạn cảnh cáo', 'Compose warning'),
    'warningDesc1': ('Thông báo này sẽ được gửi trực tiếp đến nhân viên', 'This notice will be sent directly to employee'),
    'warningDesc2': ('.', '.'),
    'warningContent': ('Nội dung thông báo', 'Notification content'),
    'cancel': ('Hủy', 'Cancel'),
    'sendNow': ('Gửi ngay', 'Send now'),
    'lateWarningTitle': ('Cảnh cáo đi trễ', 'Late Warning'),
    'lateWarningMsg': ('Nhắc nhở: Bạn đã check-in trễ {{minutes}} phút vào ca [{{shift}}] lúc {{time}}. Yêu cầu bạn đi làm đúng giờ.', 'Reminder: You checked in {{minutes}} minutes late for shift [{{shift}}] at {{time}}. Please be on time.'),
    'skipWarningMsg': ('Nhắc nhở: Bạn đã không đi làm ca [{{shift}}] ngày {{date}}. Vui lòng giải trình lý do với Quản lý.', 'Reminder: You missed shift [{{shift}}] on {{date}}. Please explain the reason to your Manager.')
}

def apply_replacements(filepath, reps):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    # Handle literal newlines that might exist in script replacements
    for old, new in reps:
        old = old.replace("\\n", "\n")
        new = new.replace("\\n", "\n")
        content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

apply_replacements('C:/Users/phamm/.gemini/antigravity/scratch/admin-staff/src/tabs/ShiftsTab.jsx', shifts_replacements)
apply_replacements('C:/Users/phamm/.gemini/antigravity/scratch/admin-staff/src/tabs/StatusTab.jsx', status_replacements)

# Load existing JSON
def load_json(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

vi_json = load_json('C:/Users/phamm/.gemini/antigravity/scratch/admin-staff/src/locales/vi/translation.json')
en_json = load_json('C:/Users/phamm/.gemini/antigravity/scratch/admin-staff/src/locales/en/translation.json')

vi_json['shiftsTab'] = {k: v[0] for k, v in shifts_translations.items()}
en_json['shiftsTab'] = {k: v[1] for k, v in shifts_translations.items()}

vi_json['statusTab'] = {k: v[0] for k, v in status_translations.items()}
en_json['statusTab'] = {k: v[1] for k, v in status_translations.items()}

save_json('C:/Users/phamm/.gemini/antigravity/scratch/admin-staff/src/locales/vi/translation.json', vi_json)
save_json('C:/Users/phamm/.gemini/antigravity/scratch/admin-staff/src/locales/en/translation.json', en_json)

print("Done")

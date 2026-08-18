import re

with open(r'C:\Users\phamm\.gemini\antigravity\scratch\admin-staff\src\tabs\EmployeesTab.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import useTranslation
content = re.sub(
    r"import \{ useUI \} from '../contexts/UIContext';",
    "import { useTranslation } from 'react-i18next';\nimport { useUI } from '../contexts/UIContext';",
    content
)

# 2. Add const { t } = useTranslation();
content = re.sub(
    r"export default function EmployeesTab\(\) \{\n  const \{ storeId, storeData \} = useStore\(\);",
    "export default function EmployeesTab() {\n  const { t } = useTranslation();\n  const { storeId, storeData } = useStore();",
    content
)

# Replacements list
replacements = [
    ("Cập Nhật Lương Cơ Bản", "t('update_base_salary')"),
    ("'Cập Nhật Lương Cơ Bản'", "t('update_base_salary')"),
    ("`Mức lương của bạn đã được quản lý cập nhật thành ${new Intl.NumberFormat('vi-VN').format(amount)}đ (${adjustForm.salaryType === 'HOURLY' ? 'Theo giờ' : adjustForm.salaryType === 'DAILY' ? 'Theo ngày' : 'Theo tháng'}).`", "t('salary_updated_message', { amount: new Intl.NumberFormat('vi-VN').format(amount), type: adjustForm.salaryType === 'HOURLY' ? t('hourly') : adjustForm.salaryType === 'DAILY' ? t('daily') : t('monthly') })"),
    ("'Nhận Thưởng'", "t('receive_bonus')"),
    ("`Bạn được thưởng ${new Intl.NumberFormat('vi-VN').format(amount)}đ. Lý do: ${adjustForm.reason || 'Không có ghi chú'}`", "t('bonus_received_message', { amount: new Intl.NumberFormat('vi-VN').format(amount), reason: adjustForm.reason || t('no_note') })"),
    ("'Thông Báo Phạt / Trừ Lương'", "t('penalty_notice')"),
    ("`Bạn bị trừ ${new Intl.NumberFormat('vi-VN').format(amount)}đ vào lương tháng này. Lý do: ${adjustForm.reason}`", "t('penalty_message', { amount: new Intl.NumberFormat('vi-VN').format(amount), reason: adjustForm.reason })"),
    ("'Thao tác thành công!'", "t('operation_success')"),
    ("'Lỗi khi điều chỉnh lương.'", "t('error_adjusting_salary')"),
    ("'Cập Nhật Chức Vụ'", "t('update_position')"),
    ("`Bạn đã được quản lý phong chức vụ mới: ${empData.position}`", "t('new_position_message', { position: empData.position })"),
    ("modalMode === 'add' ? 'Thêm nhân viên thành công!' : 'Cập nhật nhân viên thành công!'", "modalMode === 'add' ? t('add_employee_success') : t('update_employee_success')"),
    ("'Có lỗi xảy ra khi lưu thông tin.'", "t('error_saving_info')"),
    ("'Xóa nhân viên'", "t('delete_employee')"),
    ("'Bạn có chắc chắn muốn xóa nhân viên này và toàn bộ dữ liệu liên quan? Dữ liệu không thể khôi phục.'", "t('confirm_delete_employee')"),
    ("'Đã xóa nhân viên và dọn dẹp toàn bộ dữ liệu lịch sử.'", "t('employee_deleted_success')"),
    ("'Có lỗi xảy ra khi xóa.'", "t('error_deleting')"),
    ("'Đồng ý xóa'", "t('agree_delete')"),
    ("'Hủy'", "t('cancel')"),
    ("'Đã mở khóa tài khoản nhân viên!'", "t('account_unlocked')"),
    ("'Có lỗi xảy ra khi mở khóa.'", "t('error_unlocking')"),
    ("'Đã khóa tài khoản nhân viên.'", "t('account_locked')"),
    ("'Có lỗi xảy ra khi khóa.'", "t('error_locking')"),
    (">Quản Lý Nhân Sự<", ">{t('personnel_management')}<"),
    (">Danh sách thông tin nhân viên và mức lương.<", ">{t('employee_list_description')}<"),
    (">Thêm Nhân Viên<", ">{t('add_employee')}<"),
    ("placeholder=\"Tìm kiếm theo Tên hoặc Mã NV...\"", "placeholder={t('search_employee_placeholder')}"),
    (">Mã NV<", ">{t('emp_code')}<"),
    (">Họ và Tên<", ">{t('full_name')}<"),
    (">Chức vụ<", ">{t('position')}<"),
    (">Quê Quán<", ">{t('hometown')}<"),
    (">CCCD<", ">{t('id_card')}<"),
    (">Hình thức lương<", ">{t('salary_type')}<"),
    (">Mức lương<", ">{t('salary')}<"),
    (">Ngân hàng<", ">{t('bank')}<"),
    (">Trạng thái<", ">{t('status')}<"),
    (">Thao tác<", ">{t('actions')}<"),
    (">Không tìm thấy nhân viên nào.<", ">{t('no_employees_found')}<"),
    ("title=\"Bấm để khóa tài khoản\"", "title={t('click_to_lock')}"),
    ("title=\"Mở khóa tài khoản\"", "title={t('click_to_unlock')}"),
    (">Nhân viên<", ">{t('employee')}<"),
    ("emp.salaryType === 'HOURLY' ? 'Theo giờ' : emp.salaryType === 'DAILY' ? 'Theo ngày' : 'Theo tháng'", "emp.salaryType === 'HOURLY' ? t('hourly') : emp.salaryType === 'DAILY' ? t('daily') : t('monthly')"),
    (">Chưa có<", ">{t('not_available')}<"),
    (">Bị khóa (Nhấn mở)<", ">{t('locked_click_to_unlock')}<"),
    ("emp.isOnline ? 'Hoạt động' : 'Offline'", "emp.isOnline ? t('active') : t('offline')"),
    ("> Điều chỉnh lương<", ">{t('adjust_salary')}<"),
    ("modalMode === 'add' ? 'Thêm Nhân Viên Mới' : 'Cập Nhật Nhân Viên'", "modalMode === 'add' ? t('add_new_employee') : t('update_employee')"),
    (">Số điện thoại (Mã PIN) *<", ">{t('phone_pin')} *<"),
    ("placeholder=\"VD: 0901234567\"", "placeholder={t('placeholder_phone')}"),
    (">Dùng để nhân viên đăng nhập điểm danh.<", ">{t('pin_usage_note')}<"),
    ("placeholder=\"Nguyễn Văn A\"", "placeholder={t('placeholder_name')}"),
    ("placeholder=\"VD: Quản lý, Pha chế...\"", "placeholder={t('placeholder_position')}"),
    (">Số CCCD<", ">{t('id_card_number')}<"),
    ("placeholder=\"0123456789\"", "placeholder={t('placeholder_id_card')}"),
    ("placeholder=\"TP.HCM\"", "placeholder={t('placeholder_hometown')}"),
    (">Hình thức trả lương *<", ">{t('salary_payment_type')} *<"),
    (">Theo giờ (HOURLY)<", ">{t('hourly_option')}<"),
    (">Theo ngày (DAILY)<", ">{t('daily_option')}<"),
    (">Theo tháng (MONTHLY)<", ">{t('monthly_option')}<"),
    (">Mức lương (VNĐ) *<", ">{t('salary_vnd')} *<"),
    ("placeholder=\"VD: 25.000\"", "placeholder={t('placeholder_salary')}"),
    (">Tên Ngân Hàng<", ">{t('bank_name')}<"),
    ("placeholder=\"VD: Vietcombank\"", "placeholder={t('placeholder_bank')}"),
    (">Số Tài Khoản<", ">{t('bank_account')}<"),
    ("placeholder=\"VD: 0123456789\"", "placeholder={t('placeholder_account')}"),
    (">Tạm khóa tài khoản<", ">{t('temp_lock_account')}<"),
    (">Nhân viên sẽ bị đăng xuất và không thể đăng nhập cho đến khi được mở khóa.<", ">{t('lock_account_note')}<"),
    (">Hủy<", ">{t('cancel')}<"),
    ("modalMode === 'add' ? 'Lưu Nhân Viên' : 'Cập Nhật'", "modalMode === 'add' ? t('save_employee') : t('update')"),
    (">Điều Chỉnh Lương<", ">{t('adjust_salary_title')}<"),
    ("> Tăng Lương<", ">{t('increase_salary')}<"),
    ("> Thưởng<", ">{t('bonus')}<"),
    ("> Trừ Lương<", ">{t('deduct_salary')}<"),
    (">Cập nhật Lương Cơ Bản<", ">{t('update_base_salary_title')}<"),
    ("Lương hiện tại: <b>", "{t('current_salary')}: <b>"),
    ("</b> ({adjustTarget?.salaryType}). Hành động này sẽ thay đổi vĩnh viễn hình thức và mức lương gốc.", "</b> ({adjustTarget?.salaryType}). {t('change_salary_note')}"),
    (">Thưởng nóng<", ">{t('instant_bonus')}<"),
    ("Số tiền này sẽ được <b>cộng thêm</b> vào phiếu lương tháng hiện tại của <b>{adjustTarget?.fullName}</b>.", "{t('bonus_note_1')} <b>{t('added')}</b> {t('bonus_note_2')} <b>{adjustTarget?.fullName}</b>."),
    (">Tạo phiếu phạt<", ">{t('create_penalty_slip')}<"),
    ("Số tiền này sẽ được <b>khấu trừ</b> trực tiếp vào Tiền Lương Thực Nhận trong tháng này.", "{t('penalty_note_1')} <b>{t('deducted')}</b> {t('penalty_note_2')}"),
    (">Hình thức trả lương mới<", ">{t('new_salary_type')}<"),
    ("{adjustForm.type === 'increase' ? 'Mức lương mới (VNĐ)' : adjustForm.type === 'bonus' ? 'Số tiền thưởng (VNĐ)' : 'Số tiền phạt (VNĐ)'}", "{adjustForm.type === 'increase' ? t('new_salary_vnd') : adjustForm.type === 'bonus' ? t('bonus_amount_vnd') : t('penalty_amount_vnd')}"),
    ("placeholder={adjustForm.type === 'increase' ? \"VD: 30000\" : \"VD: 50000\"}", "placeholder={adjustForm.type === 'increase' ? t('placeholder_salary_increase') : t('placeholder_salary_bonus')}"),
    (">Lý do / Ghi chú<", ">{t('reason_note')}<"),
    ("placeholder={adjustForm.type === 'decrease' ? \"VD: Đi trễ, làm hỏng đồ...\" : \"VD: Làm tốt, đạt doanh thu...\"}", "placeholder={adjustForm.type === 'decrease' ? t('placeholder_penalty_reason') : t('placeholder_bonus_reason')}"),
    (">Xác nhận<", ">{t('confirm')}<"),
    ("> Khóa tài khoản<", ">{t('lock_account')}<"),
    ("Bạn đang <strong>khóa tài khoản</strong> của nhân viên <span className=\"font-bold text-gray-900\">{lockEmpModal.employeeName}</span>.", "{t('locking_account_for')} <span className=\"font-bold text-gray-900\">{lockEmpModal.employeeName}</span>."),
    (">Ghi chú / Lý do khóa <span className=\"text-red-500\">*</span><", ">{t('lock_reason')} <span className=\"text-red-500\">*</span><"),
    ("placeholder=\"VD: Vi phạm quy định...\"", "placeholder={t('placeholder_lock_reason')}"),
    (">Xác nhận Khóa<", ">{t('confirm_lock')}<")
]

for old, new_str in replacements:
    content = content.replace(old, new_str)

with open(r'C:\Users\phamm\.gemini\antigravity\scratch\admin-staff\src\tabs\EmployeesTab.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Translation applied successfully!')

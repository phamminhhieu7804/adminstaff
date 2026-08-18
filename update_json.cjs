const fs = require('fs');
const path = require('path');
const dir = 'C:\\Users\\phamm\\.gemini\\antigravity\\scratch\\admin-staff\\src';
const viPath = path.join(dir, 'locales', 'vi', 'translation.json');
const enPath = path.join(dir, 'locales', 'en', 'translation.json');
const vi = JSON.parse(fs.readFileSync(viPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

vi.employeesTab.receiveBonus = "Nhận Thưởng";
vi.employeesTab.penaltyNotice = "Thông Báo Phạt / Trừ Lương";
vi.employeesTab.baseSalaryUpdate = "Cập Nhật Lương Cơ Bản";

en.employeesTab.receiveBonus = "Bonus Received";
en.employeesTab.penaltyNotice = "Penalty Notice / Salary Deduction";
en.employeesTab.baseSalaryUpdate = "Base Salary Updated";

fs.writeFileSync(viPath, JSON.stringify(vi, null, 2));
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
console.log('JSON updated!');

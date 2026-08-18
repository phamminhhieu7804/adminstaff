const fs = require('fs');

const targetFile = 'src/tabs/EmployeesTab.jsx';
let content = fs.readFileSync(targetFile, 'utf8');

const replacements = [
  { from: /doc\(db, 'employees', adjustTarget\.employeeCode\)/g, to: 'doc(db, \'employees\', `${storeId}_${adjustTarget.employeeCode}`)' },
  { from: /doc\(db, 'employees', empData\.employeeCode\)/g, to: 'doc(db, \'employees\', `${storeId}_${empData.employeeCode}`)' },
  { from: /doc\(db, 'employees', employeeCode\)/g, to: 'doc(db, \'employees\', `${storeId}_${employeeCode}`)' },
  { from: /doc\(db, 'employees', emp\.employeeCode\)/g, to: 'doc(db, \'employees\', `${storeId}_${emp.employeeCode}`)' },
  { from: /doc\(db, 'employees', selectedEmployee\.employeeCode\)/g, to: 'doc(db, \'employees\', `${storeId}_${selectedEmployee.employeeCode}`)' },
  { from: /doc\(db, 'employees', lockEmpModal\.employeeCode\)/g, to: 'doc(db, \'employees\', `${storeId}_${lockEmpModal.employeeCode}`)' }
];

replacements.forEach(({ from, to }) => {
  content = content.replace(from, to);
});

fs.writeFileSync(targetFile, content);
console.log('Document IDs updated successfully.');

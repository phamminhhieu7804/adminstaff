const fs = require('fs');
let code = fs.readFileSync('src/tabs/ShiftsTab.jsx', 'utf8');

const target = `            const dayOfWeek = day.getDay().toString();
            const isOffDay = offDays.some(od => 
               (od.type === 'date' && od.date === dateStr) || 
               (od.type === 'weekday' && od.weekday === dayOfWeek)
                        return (`;

const replacement = `            const dayOfWeek = day.getDay().toString();
            const isOffDay = offDays.some(od => 
               (od.type === 'date' && od.date === dateStr) || 
               (od.type === 'weekday' && od.weekday === dayOfWeek)
            );
            const isFull = cellSchedules.length >= (shift.maxEmployees || 1);
                        return (`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/tabs/ShiftsTab.jsx', code);
    console.log('Fixed syntax error successfully.');
} else {
    console.log('Target not found');
}

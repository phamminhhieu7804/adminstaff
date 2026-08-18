const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const tabsDir = path.join(srcDir, 'tabs');
const compDir = path.join(srcDir, 'components');

const collectionsToUpdate = [
    'shifts', 'employees', 'schedules', 'attendance_logs', 'leave_requests',
    'advance_requests', 'payslips', 'salary_adjustments', 'checkout_photos', 'notifications'
];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const isTab = filePath.includes('tabs');
    const isComp = filePath.includes('components');

    // 1. Add import if not present
    if (!content.includes('useStore')) {
        const importPath = isTab ? "'../StoreContext'" : "'../../StoreContext'";
        const importStmt = `import { useStore } from ${importPath};\n`;
        // Insert after the last import
        const lastImportIndex = content.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
            const endOfLastImport = content.indexOf('\n', lastImportIndex) + 1;
            content = content.slice(0, endOfLastImport) + importStmt + content.slice(endOfLastImport);
        } else {
            content = importStmt + content;
        }
    }

    // 2. Add const { storeId } = useStore(); inside the component
    // Assuming standard "export default function Component(...) {"
    const funcMatch = content.match(/export default function \w+\s*\([^)]*\)\s*\{/);
    if (funcMatch) {
        const insertIndex = funcMatch.index + funcMatch[0].length;
        // Check if already there
        const snippet = content.slice(insertIndex, insertIndex + 200);
        if (!snippet.includes('const { storeId }') && !snippet.includes('const { storeId, storeData }')) {
            content = content.slice(0, insertIndex) + '\n  const { storeId } = useStore();' + content.slice(insertIndex);
        }
    }

    // 3. Update collection and doc refs
    // collection(db, 'NAME') -> collection(db, 'stores', storeId, 'NAME')
    // doc(db, 'NAME', ID) -> doc(db, 'stores', storeId, 'NAME', ID)
    collectionsToUpdate.forEach(coll => {
        // collections
        const collRegex = new RegExp(`collection\\(db,\\s*['"\`]${coll}['"\`]\\)`, 'g');
        content = content.replace(collRegex, `collection(db, 'stores', storeId, '${coll}')`);
        
        // docs
        const docRegex = new RegExp(`doc\\(db,\\s*['"\`]${coll}['"\`],\\s*([^)]+)\\)`, 'g');
        content = content.replace(docRegex, (match, p1) => {
            return `doc(db, 'stores', storeId, '${coll}', ${p1})`;
        });
    });

    // 4. Clean up the `${storeId}_${id}` prefixes in doc() that we just made
    // Now it looks like doc(db, 'stores', storeId, 'employees', `${storeId}_${employeeCode}`)
    // We want to replace `${storeId}_${var}` with `var`, but there might be other forms like `${storeId}_${var1}_${var2}`.
    // Wait, let's just handle `${storeId}_${` -> `${` and \`${storeId}_\${var}\` -> \`${var}\`
    // Actually, `\x60${storeId}_\${` -> `\x60\${`
    content = content.replace(/`\$\{storeId\}_\$\{/g, '`${');
    
    // Sometimes it's `${storeId}_` + var, e.g. `${storeId}_someString`
    // Let's do a more robust string replacement for template literals:
    // \`${storeId}_XXX\` -> \`XXX\`
    content = content.replace(/`\$\{storeId\}_([^`]+)`/g, '`$1`');
    
    // Also remove where('storeId', '==', storeId)
    content = content.replace(/,\s*where\('storeId',\s*'==',\s*storeId\)/g, '');
    content = content.replace(/where\('storeId',\s*'==',\s*storeId\),?\s*/g, '');

    // Cleanup: if there's any stray const { storeId } = useStore(); when we already had one, wait, we checked for it.

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
}

const tabFiles = fs.readdirSync(tabsDir).filter(f => f.endsWith('.jsx'));
tabFiles.forEach(f => processFile(path.join(tabsDir, f)));

const compFilesToUpdate = ['NotificationBell.jsx', 'PaymentModal.jsx'];
compFilesToUpdate.forEach(f => {
    const p = path.join(compDir, f);
    if (fs.existsSync(p)) {
        processFile(p);
    }
});

console.log("Done");

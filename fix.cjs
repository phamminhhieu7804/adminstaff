const fs = require('fs');
let code = fs.readFileSync('src/tabs/EmployeesTab.jsx', 'utf8');

const anchor = "showToast(modalMode === 'add' ? t('add_employee_success') : t('update_employee_success'));\n      handleCloseModal();\n      fetchEmployees(); // Refresh list";

const toReplace = anchor + "\n      await setDoc(doc(db, 'stores', storeId, 'employees', `${employeeCode}`), { isLocked: false, failedAttempts: 0, lockedUntil: null }, { merge: true });\n      showToast(t('account_unlocked'));";

const goodPart = anchor + `
    } catch (error) {
      console.error('Error saving employee:', error);
      showToast(t('error_saving_info'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (employeeCode) => {
    showConfirm(
      t('delete_employee'),
      t('confirm_delete_employee'),
      async () => {
        try {
          setIsSubmitting(true);
          // 1. Delete employee document
          await deleteDoc(doc(db, 'stores', storeId, 'employees', \`\${employeeCode}\`));
          
          // 2. Cascade delete related records
          const collectionsToClean = ['attendance_logs', 'payslips', 'advance_requests', 'leave_requests', 'notifications', 'schedules'];
          for (const col of collectionsToClean) {
            const q = query(collection(db, 'stores', storeId, col), where('employeeCode', '==', employeeCode));
            const snap = await getDocs(q);
            await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'stores', storeId, col, d.id))));
          }

          // 3. Remove from all shifts
          const shiftsSnap = await getDocs(collection(db, 'stores', storeId, 'shifts'));
          const updateShiftPromises = shiftsSnap.docs.map(async (shiftDoc) => {
             const shiftData = shiftDoc.data();
             if (shiftData.employees && shiftData.employees.includes(employeeCode)) {
                const newEmployees = shiftData.employees.filter(e => e !== employeeCode);
                return updateDoc(doc(db, 'stores', storeId, 'shifts', shiftDoc.id), { employees: newEmployees });
             }
          });
          await Promise.all(updateShiftPromises);

          showToast(t('employee_deleted_success'));
          fetchEmployees(); // Refresh list
        } catch (error) {
          console.error('Error deleting employee:', error);
          showToast(t('error_deleting'), 'error');
        } finally {
          setIsSubmitting(false);
        }
      },
      t('agree_delete'),
      t('cancel')
    );
  };

  const handleToggleLock = async (employeeCode, currentStatus) => {
    if (!currentStatus) return;
    try {
      await setDoc(doc(db, 'stores', storeId, 'employees', \`\${employeeCode}\`), { isLocked: false, failedAttempts: 0, lockedUntil: null }, { merge: true });
      showToast(t('account_unlocked'));`;

if (code.includes(anchor)) {
  code = code.replace(toReplace, goodPart);
  fs.writeFileSync('src/tabs/EmployeesTab.jsx', code);
  console.log('Fixed EmployeesTab.jsx');
} else {
  console.log('Could not find anchor.');
}

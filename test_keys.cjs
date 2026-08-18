const fs = require('fs');
['src/tabs/EmployeesTab.jsx', 'src/tabs/SettingsTab.jsx'].forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /t\(['"`]([a-zA-Z0-9_.]+)['"`]\)/g;
  const matches = new Set();
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.add(match[1]);
  }
  console.log(`Keys in ${file}:`, Array.from(matches));
});

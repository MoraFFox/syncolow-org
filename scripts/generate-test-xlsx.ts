import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const data = [
  {
    'Customer Name': 'Test Company A',
    'Cust Account': '1001',
    'Item Name': 'Widget A',
    'Inv. Qty': 10,
    'Price': 100,
    'Amount': 1000
  },
  {
    'Customer Name': 'Test Company B',
    'Cust Account': '1002',
    'Item Name': 'Widget B',
    'Inv. Qty': 5,
    'Price': 50,
    'Amount': 250
  }
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

const fixturesDir = path.join(process.cwd(), 'src', 'test', 'fixtures');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

const filePath = path.join(fixturesDir, 'products.xlsx');
XLSX.writeFile(wb, filePath);

console.log(`Generated ${filePath}`);

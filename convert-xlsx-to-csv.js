const XLSX = require('xlsx');
const fs = require('fs');

function convertXlsxToCsv(xlsxFilePath, csvFilePath) {
  try {
    // Read the XLSX file
    const workbook = XLSX.readFile(xlsxFilePath);
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert the worksheet to CSV
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    // Write the CSV to file
    fs.writeFileSync(csvFilePath, csv);
    
    console.log(`Successfully converted ${xlsxFilePath} to ${csvFilePath}`);
  } catch (error) {
    console.error('Error converting XLSX to CSV:', error);
  }
}

// If this script is run directly, use command line arguments
if (require.main === module) {
  if (process.argv.length < 4) {
    console.log('Usage: node convert-xlsx-to-csv.js <input.xlsx> <output.csv>');
    process.exit(1);
  }
  
  const xlsxFile = process.argv[2];
  const csvFile = process.argv[3];
  
  convertXlsxToCsv(xlsxFile, csvFile);
}

module.exports = { convertXlsxToCsv };
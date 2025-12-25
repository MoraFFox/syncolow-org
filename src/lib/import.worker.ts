
import { read, utils } from 'xlsx';
import Papa from 'papaparse';

/* eslint-disable no-restricted-globals */
// We export an empty object to make this a module, though it runs as a worker
// properly via the new Worker(new URL(...)) syntax.

export type ImportWorkerMessage =
    | { type: 'PARSE_CSV'; file: File }
    | { type: 'PARSE_EXCEL'; file: ArrayBuffer };

export type ImportWorkerResponse =
    | { type: 'SUCCESS'; data: any[] }
    | { type: 'ERROR'; error: string };

self.onmessage = async (e: MessageEvent<ImportWorkerMessage>) => {
    const { type } = e.data;

    try {
        if (type === 'PARSE_CSV') {
            const file = (e.data as any).file;
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header: string) => header.trim(),
                complete: (results: any) => {
                    if (results.errors.length > 0) {
                        self.postMessage({ type: 'ERROR', error: `CSV parsing errors: ${results.errors.map((e: any) => e.message).join(', ')}` });
                    } else {
                        self.postMessage({ type: 'SUCCESS', data: results.data });
                    }
                },
                error: (error: any) => {
                    self.postMessage({ type: 'ERROR', error: error.message });
                }
            });
        } else if (type === 'PARSE_EXCEL') {
            const buffer = (e.data as any).file; // ArrayBuffer for Excel

            // XLSX read is synchronous and heavy, so running it here prevents UI block
            const workbook = read(buffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const jsonData = utils.sheet_to_json(worksheet, {
                header: 1,
                defval: ''
            });

            if (jsonData.length === 0) {
                self.postMessage({ type: 'SUCCESS', data: [] });
                return;
            }

            const headers = jsonData[0] as string[];
            const result = [];

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i] as any[];
                const rowObject: any = {};
                let hasData = false;

                for (let j = 0; j < headers.length; j++) {
                    const val = row[j];
                    if (val !== undefined && val !== '') {
                        hasData = true;
                    }
                    rowObject[headers[j]] = val;
                }

                if (hasData) {
                    result.push(rowObject);
                }
            }

            self.postMessage({ type: 'SUCCESS', data: result });
        }
    } catch (err: any) {
        self.postMessage({ type: 'ERROR', error: err.message || 'Unknown worker error' });
    }
};

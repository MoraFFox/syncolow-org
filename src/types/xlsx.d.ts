// types/xlsx.d.ts
declare module 'xlsx' {
  export interface WorkSheet {
    '!cols'?: Array<{ wch?: number }>;
    '!merges'?: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }>;
    [key: string]: unknown;
  }

  export interface WorkBook {
    SheetNames: string[];
    Sheets: { [key: string]: WorkSheet };
  }

  export function read(data: ArrayBuffer | Uint8Array | string, opts?: {
    type?: 'base64' | 'binary' | 'buffer' | 'file' | 'array' | 'string';
    [key: string]: unknown;
  }): WorkBook;

  export function writeFile(workbook: WorkBook, filename: string, opts?: Record<string, unknown>): void;

  export const utils: {
    sheet_to_json<T = unknown[]>(worksheet: WorkSheet, opts?: {
      header?: number | 'A' | 1 | string[];
      defval?: unknown;
      [key: string]: unknown;
    }): T[];
    aoa_to_sheet(data: unknown[][], opts?: Record<string, unknown>): WorkSheet;
    book_new(): WorkBook;
    book_append_sheet(workbook: WorkBook, worksheet: WorkSheet, sheetName?: string): void;
    [key: string]: unknown;
  };

  const xlsx: {
    read: typeof read;
    utils: typeof utils;
    writeFile: typeof writeFile;
  };
  export default xlsx;
}

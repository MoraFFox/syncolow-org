// src/types/tough-cookie-compat.d.ts
declare module "tough-cookie/dist/index" {
  // أعد تصدير كل شيء من الحزمة الرسمية so TypeScript يشوف نفس الأسماء
  import * as tc from "tough-cookie";
  export = tc;
}

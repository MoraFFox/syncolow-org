

"use client";

import React from 'react';
import type { Order, Company } from '@/lib/types';
import { format } from 'date-fns';

interface DailyOrdersReportProps {
  orders: Order[];
  companies: Company[];
}

export const DailyOrdersReport: React.FC<DailyOrdersReportProps> = ({ orders, companies }) => {

  const getBranchLocation = (branchId: string | null | undefined) => {
    if (!branchId) return 'غير متوفر';
    const branch = companies.find(c => c.id === branchId);
    return branch?.location || 'غير متوفر';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  };
  
  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }
          body > *:not(#daily-orders-print-container) {
            display: none;
          }
          #daily-orders-print-container {
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }
          .order-page {
            page-break-after: always;
            font-family: 'Helvetica Neue', 'Arial', sans-serif;
            font-size: 12px;
            direction: rtl;
          }
          .order-page:last-child {
            page-break-after: auto;
          }
          h1, h2, h3 {
            color: #111;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: right;
          }
          th {
            background-color: #f2f2f2;
          }
        }
      `}</style>
      {orders.map(order => (
        <div key={order.id} className="order-page">
          <h2>طلب رقم #{order.id.slice(0, 7)}</h2>
          <p><strong>التاريخ:</strong> {format(new Date(order.orderDate), 'PPP')}</p>
          <p><strong>العميل:</strong> {order.companyName}</p>
          <p><strong>الفرع:</strong> {order.branchName}</p>
          <p><strong>عنوان التوصيل:</strong> {getBranchLocation(order.branchId)}</p>
          
          <h3 style={{marginTop: '1rem'}}>محتويات الطلب</h3>
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={`${order.id}-item-${index}`}>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.price)}</td>
                  <td>{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{textAlign: 'left', fontWeight: 'bold'}}>المجموع الكلي</td>
                <td style={{fontWeight: 'bold'}}>{formatCurrency(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ))}
    </>
  );
};

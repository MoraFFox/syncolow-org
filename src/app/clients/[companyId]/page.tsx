
"use client";

import { useParams } from 'next/navigation';
import CompanyDetails from './_components/company-details';
import { useCompanyStore } from '@/store/use-company-store';
import { useEffect } from 'react';

export default function CompanyDetailsPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const { fetchBranchesForCompany } = useCompanyStore();

  useEffect(() => {
    if(companyId){
      // This might be needed if branch data isn't always loaded initially
      // fetchBranchesForCompany(companyId);
    }
  }, [companyId, fetchBranchesForCompany])
  
  return <CompanyDetails companyId={companyId} />;
}

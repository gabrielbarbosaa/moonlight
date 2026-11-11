'use client';

import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageEditor } from '@/components/editor/page-editor';
import { pagesApi } from '@/lib/api';

export default function EditorPage() {
  const router = useRouter();
  const pageQuery = useQuery({
    queryKey: ['page-editor'],
    queryFn: pagesApi.getMine,
    staleTime: Infinity,
    gcTime: 0,
  });

  const status = isAxiosError(pageQuery.error) ? pageQuery.error.response?.status : undefined;

  useEffect(() => {
    if (status === 401) router.replace('/admin/login');
    if (status === 404) router.replace('/admin');
  }, [status, router]);

  if (pageQuery.isPending || status === 401 || status === 404) {
    return (
      <main style={{ maxWidth: 640, margin: '80px auto', padding: '0 16px' }}>
        <p>Carregando...</p>
      </main>
    );
  }

  if (pageQuery.isError) {
    return (
      <main style={{ maxWidth: 640, margin: '80px auto', padding: '0 16px' }}>
        <p>Não foi possível carregar o editor.</p>
        <button type="button" onClick={() => pageQuery.refetch()}>
          Tentar de novo
        </button>
      </main>
    );
  }

  return <PageEditor initial={pageQuery.data} />;
}

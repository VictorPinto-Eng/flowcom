'use client';

/**
 * ⚠️ LEGACY — Mantido por compatibilidade.
 *
 * A criação de atividade agora acontece em página dedicada:
 *   /dashboard/activity/new?workspaceId=X
 *
 * Este componente foi refatorado para redirecionar ao invés de abrir
 * um modal. A UI inline foi removida. Use a página diretamente.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface SectorType {
  id: number;
  name: string;
  acronym: string;
  active: boolean;
}

interface CreateActivityModalProps {
  workspaceName: string;
  sectors: SectorType[];
  onSubmit: (name: string, sectorId?: number, detalhes?: string, dtatv?: string, previsto?: string) => void;
  onClose: () => void;
}

export default function CreateActivityModal({ onClose, ...rest }: CreateActivityModalProps) {
  const router = useRouter();

  useEffect(() => {
    // Redireciona para a nova página e fecha o wrapper (se houver).
    onClose();
    router.replace('/dashboard/activity/new');
  }, [router, onClose]);

  // Não renderiza nada — a página dedicada cuida do UI.
  // Mantém props (workspaceName, sectors, onSubmit) na assinatura por
  // compatibilidade com consumidores que ainda passam este componente.
  void rest;
  return null;
}
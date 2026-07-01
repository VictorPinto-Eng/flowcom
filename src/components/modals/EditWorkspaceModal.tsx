'use client';

import { useState, useEffect } from 'react';
import styles from './CreateWorkspaceModal.module.css';
import Swal from 'sweetalert2';
import {
  getWorkspaceMembersWithRolesAction,
  getWorkspaceInvitesAction,
  sendWorkspaceInviteAction,
  cancelWorkspaceInviteAction,
  removeWorkspaceMemberAction,
  updateWorkspaceMemberRoleAction
} from '@/app/actions/workspaceActions';

interface EditWorkspaceModalProps {
  workspace: {
    id: string;
    name: string;
    description?: string | null;
    type: {
      id?: string;
      name: string;
    };
  };
  types: any[];
  currentUserSeqid: string;
  onSubmit: (data: { name: string, typeId: string, description: string }) => void;
  onClose: () => void;
  initialTab?: 'general' | 'collaborators';
}

export default function EditWorkspaceModal({ workspace, types, currentUserSeqid, onSubmit, onClose, initialTab = 'general' }: EditWorkspaceModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'collaborators'>(initialTab);
  const [name, setName] = useState(workspace.name);
  const [typeId, setTypeId] = useState('');
  const [description, setDescription] = useState(workspace.description || '');

  // Collaborator States
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    // Tenta encontrar o ID do tipo baseado no nome se o ID não vier direto
    if (workspace.type) {
      const foundType = types.find(t => t.name === workspace.type.name || t.id === (workspace.type as any).id);
      if (foundType) setTypeId(foundType.id);
    }
  }, [workspace, types]);

  const loadMembersAndInvites = async () => {
    setLoadingMembers(true);
    try {
      const [membersData, invitesData] = await Promise.all([
        getWorkspaceMembersWithRolesAction(workspace.id),
        getWorkspaceInvitesAction(workspace.id)
      ]);
      setMembers(membersData);
      setInvites(invitesData);
    } catch (err) {
      console.error('Erro ao carregar dados de colaboradores:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'collaborators') {
      loadMembersAndInvites();
    }
  }, [activeTab, workspace.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && typeId) {
      onSubmit({ name, typeId, description });
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await sendWorkspaceInviteAction(workspace.id, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      await loadMembersAndInvites();
      Swal.fire({
        title: 'Enviado!',
        text: 'Convite enviado com sucesso.',
        icon: 'success',
        confirmButtonColor: '#7c3aed'
      });
    } catch (err: any) {
      console.error('Erro ao enviar convite:', err);
      Swal.fire({
        title: 'Erro!',
        text: 'Erro ao enviar convite.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelInvite = async (inviteSeqid: string) => {
    const confirmCancel = await Swal.fire({
      title: 'Cancelar convite?',
      text: 'Tem certeza de que deseja cancelar este convite?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar',
      cancelButtonText: 'Não',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    });

    if (!confirmCancel.isConfirmed) return;

    try {
      await cancelWorkspaceInviteAction(inviteSeqid);
      await loadMembersAndInvites();
      Swal.fire({
        title: 'Cancelado!',
        text: 'O convite foi cancelado com sucesso.',
        icon: 'success',
        confirmButtonColor: '#7c3aed'
      });
    } catch (err: any) {
      console.error('Erro ao cancelar convite:', err);
      Swal.fire({
        title: 'Erro!',
        text: 'Erro ao cancelar convite.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const handleRemoveMember = async (userSeqid: string, userName: string) => {
    const confirmRemove = await Swal.fire({
      title: 'Remover colaborador?',
      text: `Tem certeza de que deseja remover ${userName} deste workspace?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, remover',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    });

    if (!confirmRemove.isConfirmed) return;

    try {
      await removeWorkspaceMemberAction(workspace.id, userSeqid);
      await loadMembersAndInvites();
      Swal.fire({
        title: 'Removido!',
        text: 'Colaborador removido com sucesso.',
        icon: 'success',
        confirmButtonColor: '#7c3aed'
      });
    } catch (err: any) {
      console.error('Erro ao remover membro:', err);
      Swal.fire({
        title: 'Erro!',
        text: 'Erro ao remover colaborador.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const handleUpdateRole = async (userSeqid: string, role: string) => {
    try {
      await updateWorkspaceMemberRoleAction(workspace.id, userSeqid, role);
      await loadMembersAndInvites();
      Swal.fire({
        title: 'Função Atualizada!',
        text: 'Função do colaborador atualizada com sucesso.',
        icon: 'success',
        confirmButtonColor: '#7c3aed',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('Erro ao atualizar cargo:', err);
      Swal.fire({
        title: 'Erro!',
        text: 'Erro ao atualizar função.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        
        <div className={styles.content}>
          <div className={styles.formSection}>
            <h2>Editar Área de trabalho</h2>
            <p className={styles.subtitle}>
              Atualize as informações e gerencie os colaboradores da sua organização.
            </p>

            <div className={styles.tabs}>
              <button 
                type="button" 
                className={`${styles.tabButton} ${activeTab === 'general' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('general')}
              >
                Dados Gerais
              </button>
              <button 
                type="button" 
                className={`${styles.tabButton} ${activeTab === 'collaborators' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('collaborators')}
              >
                Colaboradores
              </button>
            </div>

            {activeTab === 'general' ? (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                  <label>Nome da Área de trabalho</label>
                  <input 
                    type="text" 
                    placeholder="Ex: HV5 Imóveis" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label>Tipo de área de trabalho</label>
                  <select 
                    value={typeId}
                    onChange={(e) => setTypeId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Escolher...</option>
                    {types.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label>Descrição <span>Opcional</span></label>
                  <textarea 
                    placeholder="Descreva brevemente esta área..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className={styles.submitBtn}
                  disabled={!name || !typeId}
                >
                  Salvar Alterações
                </button>
              </form>
            ) : (
              <div className={styles.membersTab}>
                {/* Invite Section */}
                <div className={styles.inviteSection}>
                  <h3>Convidar Novo Colaborador</h3>
                  <form onSubmit={handleSendInvite} className={styles.inviteForm}>
                    <input
                      type="email"
                      placeholder="E-mail do colaborador"
                      className={styles.inviteInput}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                    <select
                      className={styles.inviteSelect}
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                    >
                      <option value="MEMBER">Membro</option>
                      <option value="ADMIN">Administrador</option>
                      <option value="VIEWER">Visualizador</option>
                    </select>
                    <button
                      type="submit"
                      className={styles.inviteBtn}
                      disabled={isInviting || !inviteEmail}
                    >
                      {isInviting ? 'Enviando...' : 'Convidar'}
                    </button>
                  </form>
                </div>

                {/* Members List */}
                <div className={styles.listSection}>
                  <h3>Membros do Workspace ({members.length})</h3>
                  {loadingMembers ? (
                    <p className={styles.noItems}>Carregando membros...</p>
                  ) : members.length === 0 ? (
                    <p className={styles.noItems}>Nenhum membro encontrado.</p>
                  ) : (
                    members.map((member) => {
                      const isMe = member.userSeqid === currentUserSeqid;
                      const userRole = members.find(m => m.userSeqid === currentUserSeqid)?.role || 'MEMBER';
                      const canManage = (userRole === 'OWNER' || userRole === 'ADMIN') && !isMe && member.role !== 'OWNER';
                      
                      return (
                        <div key={member.seqid} className={styles.memberCard}>
                          <div className={styles.memberMeta}>
                            <div className={styles.avatar}>
                              {member.user.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className={styles.memberInfo}>
                              <span className={styles.memberName}>
                                {member.user.name} {isMe && <strong>(Você)</strong>}
                              </span>
                              <span className={styles.memberEmail}>{member.user.email}</span>
                            </div>
                          </div>
                          
                          <div className={styles.memberControls}>
                            {canManage ? (
                              <>
                                <select
                                  className={styles.memberRoleSelect}
                                  value={member.role}
                                  onChange={(e) => handleUpdateRole(member.userSeqid, e.target.value)}
                                >
                                  <option value="MEMBER">Membro</option>
                                  <option value="ADMIN">Administrador</option>
                                  <option value="VIEWER">Visualizador</option>
                                </select>
                                <button
                                  type="button"
                                  className={styles.removeBtn}
                                  onClick={() => handleRemoveMember(member.userSeqid, member.user.name)}
                                >
                                  Remover
                                </button>
                              </>
                            ) : (
                              <span className={`${styles.roleBadge} ${
                                member.role === 'OWNER' ? styles.roleOwner :
                                member.role === 'ADMIN' ? styles.roleAdmin :
                                member.role === 'MEMBER' ? styles.roleMember :
                                styles.roleViewer
                              }`}>
                                {member.role === 'OWNER' ? 'Proprietário' :
                                 member.role === 'ADMIN' ? 'Administrador' :
                                 member.role === 'MEMBER' ? 'Membro' :
                                 'Visualizador'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pending Invites List */}
                <div className={styles.listSection}>
                  <h3>Convites Pendentes ({invites.length})</h3>
                  {loadingMembers ? (
                    <p className={styles.noItems}>Carregando convites...</p>
                  ) : invites.length === 0 ? (
                    <p className={styles.noItems}>Nenhum convite pendente.</p>
                  ) : (
                    invites.map((invite) => {
                      const userRole = members.find(m => m.userSeqid === currentUserSeqid)?.role || 'MEMBER';
                      const canCancel = userRole === 'OWNER' || userRole === 'ADMIN';

                      return (
                        <div key={invite.seqid} className={styles.inviteCard}>
                          <div className={styles.inviteMeta}>
                            <span className={styles.inviteEmailText}>{invite.email}</span>
                            <span className={styles.inviteExpiryText}>
                              Papel: {invite.role} • Expira em: {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          {canCancel && (
                            <button
                              type="button"
                              className={styles.cancelInviteBtn}
                              onClick={() => handleCancelInvite(invite.seqid)}
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={styles.visualSection}>
            <div className={styles.previewContainer}>
              <div className={styles.previewCard}>
                <div className={styles.previewHeader}>
                  <div className={styles.previewDots}>
                    <span className={styles.dotRed} />
                    <span className={styles.dotYellow} />
                    <span className={styles.dotGreen} />
                  </div>
                  <span className={styles.previewBoardName}>{name || 'Área de Trabalho'}</span>
                </div>
                <div className={styles.previewColumns}>
                   <div className={styles.previewColumn}>
                    <div className={styles.columnHeader}>A Fazer</div>
                    <div className={`${styles.previewTaskCard}`}>
                       <p className={styles.taskTitle}>Exemplo de Fluxo</p>
                    </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


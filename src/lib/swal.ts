/**
 * Configuração centralizada do SweetAlert2 com visual premium dark.
 * Todos os dialogs da aplicação devem usar estas funções para manter consistência.
 */

const getSwal = async () => {
  const module = await import('sweetalert2');
  return module.default;
};

// Tema base premium dark
const premiumTheme = {
  background: '#1e293b',
  color: '#e2e8f0',
  borderRadius: '12px',
  fontFamily: 'inherit',
  confirmButtonColor: '#6366f1',
  cancelButtonColor: '#334155',
  confirmButtonBorderColor: 'rgba(99, 102, 241, 0.3)',
  cancelButtonBorderColor: 'rgba(148, 163, 184, 0.2)',
  buttonsStyling: true,
  customClass: {
    popup: 'swal2-premium',
    title: 'swal2-premium-title',
    htmlContainer: 'swal2-premium-text',
    confirmButton: 'swal2-premium-confirm',
    cancelButton: 'swal2-premium-cancel'
  }
};

// Estilo CSS inject uma única vez
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = `
    .swal2-premium {
      border: 1px solid rgba(99, 102, 241, 0.2) !important;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4) !important;
      backdrop-filter: blur(12px) !important;
      padding: 1.5rem !important;
      max-width: 380px !important;
    }
    .swal2-premium-title {
      font-size: 1rem !important;
      font-weight: 700 !important;
      color: #e2e8f0 !important;
      padding-bottom: 0.25rem !important;
    }
    .swal2-premium-text {
      font-size: 0.8rem !important;
      color: #94a3b8 !important;
      line-height: 1.5 !important;
    }
    .swal2-premium-confirm {
      background: #6366f1 !important;
      border: none !important;
      border-radius: 8px !important;
      padding: 0.5rem 1.25rem !important;
      font-size: 0.8rem !important;
      font-weight: 600 !important;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3) !important;
      transition: all 0.2s ease !important;
    }
    .swal2-premium-confirm:hover {
      background: #4f46e5 !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4) !important;
    }
    .swal2-premium-cancel {
      background: rgba(51, 65, 85, 0.5) !important;
      border: 1px solid rgba(148, 163, 184, 0.15) !important;
      border-radius: 8px !important;
      padding: 0.5rem 1.25rem !important;
      font-size: 0.8rem !important;
      font-weight: 600 !important;
      color: #94a3b8 !important;
      transition: all 0.2s ease !important;
    }
    .swal2-premium-cancel:hover {
      background: rgba(51, 65, 85, 0.8) !important;
      color: #e2e8f0 !important;
    }
    .swal2-premium .swal2-icon {
      margin: 0.5rem auto 0.75rem !important;
      width: 48px !important;
      height: 48px !important;
      border-width: 2px !important;
    }
    .swal2-premium .swal2-icon .swal2-icon-content {
      font-size: 1.5rem !important;
    }
    .swal2-premium .swal2-input,
    .swal2-premium .swal2-select,
    .swal2-premium .swal2-textarea {
      background: rgba(15, 23, 42, 0.6) !important;
      border: 1px solid rgba(99, 102, 241, 0.2) !important;
      border-radius: 8px !important;
      color: #e2e8f0 !important;
      font-size: 0.85rem !important;
      padding: 0.6rem 0.8rem !important;
    }
    .swal2-premium .swal2-input:focus,
    .swal2-premium .swal2-select:focus,
    .swal2-premium .swal2-textarea:focus {
      border-color: #6366f1 !important;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
    }
    .swal2-timer-progress-bar {
      background: #6366f1 !important;
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

/**
 * Toast discreto (canto superior direito, some sozinho)
 */
export async function swalToast(title: string, options?: { icon?: 'success' | 'error' | 'warning' | 'info'; timer?: number }) {
  injectStyles();
  const Swal = await getSwal();
  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon: options?.icon || 'success',
    title,
    showConfirmButton: false,
    timer: options?.timer || 2500,
    timerProgressBar: true,
    ...premiumTheme
  });
}

/**
 * Confirmação discreta (pináculo visual reduzido)
 */
export async function swalConfirm(title: string, text: string, options?: {
  confirmText?: string;
  cancelText?: string;
  icon?: 'warning' | 'question' | 'info';
  confirmColor?: string;
}): Promise<boolean> {
  injectStyles();
  const Swal = await getSwal();
  const result = await Swal.fire({
    ...premiumTheme,
    title,
    text,
    icon: options?.icon || 'question',
    showCancelButton: true,
    confirmButtonText: options?.confirmText || 'Confirmar',
    cancelButtonText: options?.cancelText || 'Cancelar',
    confirmButtonColor: options?.confirmColor || '#6366f1'
  });
  return result.isConfirmed;
}

/**
 * Erro discreto
 */
export async function swalError(title: string, text?: string) {
  injectStyles();
  const Swal = await getSwal();
  return Swal.fire({
    ...premiumTheme,
    title,
    text: text || '',
    icon: 'error'
  });
}

/**
 * Sucesso discreto
 */
export async function swalSuccess(title: string, text?: string) {
  injectStyles();
  const Swal = await getSwal();
  return Swal.fire({
    ...premiumTheme,
    title,
    text: text || '',
    icon: 'success'
  });
}

/**
 * Input (select, text, etc.) com visual premium
 */
export async function swalInput(config: {
  title: string;
  input: 'select' | 'text' | 'textarea' | 'email' | 'password' | 'number';
  inputOptions?: Record<string, string>;
  inputPlaceholder?: string;
  confirmText?: string;
  cancelText?: string;
  inputValidator?: (value: string) => string | null;
}): Promise<{ isConfirmed: boolean; value?: any }> {
  injectStyles();
  const Swal = await getSwal();
  return Swal.fire({
    ...premiumTheme,
    title: config.title,
    input: config.input,
    inputOptions: config.inputOptions,
    inputPlaceholder: config.inputPlaceholder,
    showCancelButton: true,
    confirmButtonText: config.confirmText || 'Confirmar',
    cancelButtonText: config.cancelText || 'Cancelar',
    inputValidator: config.inputValidator
  });
}

/**
 * Acesso direto ao Swal (para casos avançados)
 * Use apenas quando as helpers acima não atendem.
 */
export async function getSwalInstance() {
  injectStyles();
  return getSwal();
}

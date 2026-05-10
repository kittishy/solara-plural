export const LANGUAGE_STORAGE_KEY = 'solara.language';
export const LANGUAGE_COOKIE_KEY = 'solara.locale';

export const LANGUAGES = [
  { code: 'en', label: 'English', shortLabel: 'EN', htmlLang: 'en' },
  { code: 'pt-BR', label: 'Português brasileiro', shortLabel: 'PT-BR', htmlLang: 'pt-BR' },
  { code: 'es', label: 'Español', shortLabel: 'ES', htmlLang: 'es' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];
export const SUPPORTED_LANGUAGES = LANGUAGES.map((language) => language.code);

export const DEFAULT_LANGUAGE: Language = 'en';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && LANGUAGES.some((language) => language.code === value);
}

export function normalizePreferredLanguage(value: string | null | undefined): Language | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.startsWith('pt')) return 'pt-BR';
  if (normalized.startsWith('es')) return 'es';
  if (normalized.startsWith('en')) return 'en';
  if (isLanguage(value)) return value;
  return null;
}

export function detectLanguageFromAcceptLanguage(headerValue: string | null | undefined): Language {
  if (!headerValue) return DEFAULT_LANGUAGE;

  const candidates = headerValue
    .split(',')
    .map((entry) => {
      const [tag, qValue] = entry.trim().split(';');
      const parsedWeight = qValue?.trim().startsWith('q=')
        ? Number.parseFloat(qValue.trim().slice(2))
        : 1;
      return {
        tag,
        weight: Number.isFinite(parsedWeight) ? parsedWeight : 1,
      };
    })
    .sort((a, b) => b.weight - a.weight);

  for (const candidate of candidates) {
    const matched = normalizePreferredLanguage(candidate.tag);
    if (matched) return matched;
  }

  return DEFAULT_LANGUAGE;
}

export function getLanguageFromPathname(pathname: string): {
  language: Language | null;
  pathnameWithoutLanguage: string;
} {
  const segments = pathname.split('/').filter(Boolean);
  const maybeLanguage = segments[0];

  if (!maybeLanguage || !isLanguage(maybeLanguage)) {
    return {
      language: null,
      pathnameWithoutLanguage: pathname || '/',
    };
  }

  const rest = segments.slice(1).join('/');
  return {
    language: maybeLanguage,
    pathnameWithoutLanguage: rest ? `/${rest}` : '/',
  };
}

export function localizePathname(pathname: string, language: Language): string {
  const { pathnameWithoutLanguage } = getLanguageFromPathname(pathname);
  if (pathnameWithoutLanguage === '/') return `/${language}`;
  return `/${language}${pathnameWithoutLanguage}`;
}

export function stripLanguageFromPathname(pathname: string): string {
  return getLanguageFromPathname(pathname).pathnameWithoutLanguage;
}

export const translations = {
  en: {
    language: {
      label: 'Language',
      helper: 'Choose the language used across Solara.',
      current: 'Current language',
    },
    auth: {
      login: {
        tagline: 'Your warm space, waiting for you',
        title: 'Welcome back',
        email: 'Email',
        password: 'Password',
        signIn: 'Sign in',
        signingIn: 'Signing in...',
        invalid: 'That email or password did not match. Try again?',
        newHere: 'New here?',
        createAccount: 'Create a system or singlet account',
        forgotPassword: 'Forgot your password?',
        safeSpace: 'Solara Plural - a safe space for plural systems',
      },
      forgot: {
        tagline: 'A quiet way back in',
        title: 'Reset your password',
        helper: 'Enter your account email to receive a reset link.',
        send: 'Create reset link',
        sending: 'Creating link...',
        sent: 'Reset link sent! Check your email.',
        sendFailed: 'Could not send the reset email right now. Try again later.',
        notConfigured: 'Email sending is not set up yet. Contact support.',
        backToLogin: 'Back to sign in',
      },
      reset: {
        tagline: 'Choose a new key for your space',
        title: 'Set a new password',
        helper: 'Use a password with at least 8 characters.',
        newPassword: 'New password',
        save: 'Save new password',
        saving: 'Saving...',
        invalid: 'This reset link is invalid or expired.',
        success: 'Password updated. You can sign in now.',
        signIn: 'Sign in',
        noToken: 'No reset token found. Please request a new reset link.',
      },
      register: {
        tagline: 'Create your account and connect with care',
        title: 'Create your account',
        accountType: 'Account type',
        pluralSystem: 'Plural system',
        pluralSystemHelp: 'Use members, front tracking, notes, and the full Solara flow.',
        singlet: 'Singlet',
        singletHelp: 'A simpler account for trusted friends of systems.',
        switchLater: 'Singlet accounts can switch to a full system account later in Settings.',
        displayName: 'Display name',
        systemName: 'System name',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm password',
        passwordPlaceholder: 'At least 8 characters',
        confirmPlaceholder: 'Same password again',
        creating: 'Creating account...',
        create: 'Create account',
        alreadyHave: 'Already have an account?',
        signIn: 'Sign in',
        footer: 'Solara Plural - a warm, philanthropic space for systems and trusted friends',
        passwordMismatch: 'Passwords do not match.',
        passwordShort: 'Password must be at least 8 characters.',
        genericError: 'Something went wrong. Try again?',
        manualLogin: 'Account created but sign-in failed. Please log in manually.',
      },
    },
    nav: {
      primary: 'Primary navigation',
      mobilePrimary: 'Primary mobile navigation',
      more: 'More',
      moreOptions: 'Open more navigation options',
      moreMenu: 'More mobile navigation',
      home: 'Home',
      members: 'Members',
      partners: 'Partners',
      front: 'Front',
      frontHistory: 'Front history',
      notes: 'Notes',
      friends: 'Friends',
      notifications: 'Notifications',
      settings: 'Settings',
      signOut: 'Sign out',
      skip: 'Skip to main content',
      systemMenu: 'System menu',
      sidebarSymbol: 'Sidebar symbol',
      themePreset: 'Theme preset',
      appearanceSettings: 'Open appearance settings',
    },
    common: {
      friend: 'friend',
      manage: 'Manage',
      seeAll: 'See all',
      clearAll: 'Clear all',
      loading: 'Loading...',
      saving: 'Saving...',
      selected: 'selected',
      noResultsFor: 'Nothing found for "{query}".',
      noResultsTry: 'Nothing found for "{query}". Try a different name?',
      noteOptional: 'Note (optional)',
    },
    dashboard: {
      quickNavigation: 'Quick navigation',
      systemSummary: 'System summary',
      greetingNight: 'Good night',
      greetingMorning: 'Good morning',
      greetingAfternoon: 'Good afternoon',
      greetingEvening: 'Good evening',
      active: 'active',
      saved: 'saved',
      startOrSwitch: 'Start or switch',
      newNote: 'New note',
      captureContext: 'Capture context',
      history: 'History',
      editPastEntries: 'Edit past entries',
      inviteAndConnect: 'Invite and connect',
      currentFront: 'Current front',
      since: 'Since',
      noCurrentFront: 'No one is listed as fronting right now.',
      startFront: 'Start front',
      quickActions: 'Quick actions',
      addMember: 'Add member',
      startFrontSession: 'Start front session',
      writeNote: 'Write note',
      recentNotes: 'Recent notes',
      notesEmpty: 'Notes you write will live here.',
      writeFirstNote: 'Write first note',
      untitledNote: 'Untitled note',
    },
    front: {
      pageTitle: 'Front Tracker',
      pageSubtitle: 'Track who is currently fronting',
      currentSession: 'Current front session',
      currentlyFronting: 'Currently fronting',
      ending: 'Ending...',
      endFront: 'End front',
      quietMoment: 'Quiet moment',
      noMembersYet: 'No members yet -',
      addOneFirst: 'add one first',
      switchFront: 'Switch front',
      startFront: 'Start front',
      selectMembersHelp: 'Select one or more members to track this session.',
      closeSelector: 'Close member selector',
      chooseMembers: 'Choose members',
      searchMembers: 'Search members',
      searchPlaceholder: 'Type a name',
      selectionHelp: 'Tap a member to add or remove them from this session.',
      memberSelection: 'Member selection',
      toggleMember: 'Toggle member {name}',
      sessionDetails: 'Session details',
      selectedMembers: 'Selected members',
      noSelected: 'No members selected yet.',
      removeMember: 'Remove {name} from selection',
      notePlaceholder: 'Add context for this front session...',
      switching: 'Switching...',
      starting: 'Starting...',
      openHistory: 'Open front history',
      saveError: 'Could not save front session. Try again.',
      endError: 'Could not end front. Try again.',
      switched: 'Front switched.',
      started: 'Front started.',
      ended: 'Front session ended.',
    },
    pages: {
      friendsTitle: 'Friends',
      friendsSubtitle: 'Invite trusted systems and choose what to share.',
      settingsTitle: 'Settings',
      settingsSubtitle: 'Manage your account profile and data',
    },
  },
  'pt-BR': {
    language: {
      label: 'Idioma',
      helper: 'Escolha o idioma usado em toda a Solara.',
      current: 'Idioma atual',
    },
    auth: {
      login: {
        tagline: 'Seu espaço acolhedor, esperando por você',
        title: 'Boas-vindas de volta',
        email: 'E-mail',
        password: 'Senha',
        signIn: 'Entrar',
        signingIn: 'Entrando...',
        invalid: 'Esse e-mail ou senha não conferem. Tente de novo?',
        newHere: 'Primeira vez por aqui?',
        createAccount: 'Criar uma conta de sistema ou singlet',
        forgotPassword: 'Esqueceu a senha?',
        safeSpace: 'Solara Plural - um espaço seguro para sistemas plurais',
      },
      forgot: {
        tagline: 'Um caminho tranquilo de volta',
        title: 'Redefinir sua senha',
        helper: 'Digite o e-mail da conta para receber o link de redefinição.',
        send: 'Criar link de redefinição',
        sending: 'Criando link...',
        sent: 'Link enviado! Verifique seu e-mail.',
        sendFailed: 'Não foi possível enviar o e-mail de redefinição agora. Tente de novo mais tarde.',
        notConfigured: 'O envio de e-mail ainda não está configurado. Entre em contato com o suporte.',
        backToLogin: 'Voltar para entrar',
      },
      reset: {
        tagline: 'Escolha uma nova chave para seu espaço',
        title: 'Definir uma nova senha',
        helper: 'Use uma senha com pelo menos 8 caracteres.',
        newPassword: 'Nova senha',
        save: 'Salvar nova senha',
        saving: 'Salvando...',
        invalid: 'Esse link de redefinição é inválido ou expirou.',
        success: 'Senha atualizada. Você já pode entrar.',
        signIn: 'Entrar',
        noToken: 'Nenhum token encontrado. Solicite um novo link de redefinição.',
      },
      register: {
        tagline: 'Crie sua conta e se conecte com cuidado',
        title: 'Crie sua conta',
        accountType: 'Tipo de conta',
        pluralSystem: 'Sistema plural',
        pluralSystemHelp: 'Use membros, rastreamento de front, notas e o fluxo completo da Solara.',
        singlet: 'Singlet',
        singletHelp: 'Uma conta mais simples para amizades de confiança dos sistemas.',
        switchLater: 'Contas singlet podem virar uma conta completa de sistema depois em Configurações.',
        displayName: 'Nome de exibição',
        systemName: 'Nome do sistema',
        email: 'E-mail',
        password: 'Senha',
        confirmPassword: 'Confirmar senha',
        passwordPlaceholder: 'Pelo menos 8 caracteres',
        confirmPlaceholder: 'A mesma senha novamente',
        creating: 'Criando conta...',
        create: 'Criar conta',
        alreadyHave: 'Já tem uma conta?',
        signIn: 'Entrar',
        footer: 'Solara Plural - um espaço acolhedor e filantrópico para sistemas e amizades de confiança',
        passwordMismatch: 'As senhas não conferem.',
        passwordShort: 'A senha precisa ter pelo menos 8 caracteres.',
        genericError: 'Algo deu errado. Tente de novo?',
        manualLogin: 'A conta foi criada, mas o login falhou. Entre manualmente.',
      },
    },
    nav: {
      primary: 'Navegação principal',
      mobilePrimary: 'Navegação principal mobile',
      more: 'Menu',
      moreOptions: 'Abrir mais opções de navegação',
      moreMenu: 'Mais navegação mobile',
      home: 'Início',
      members: 'Membros',
      front: 'Front',
      partners: 'Parceiras',
      frontHistory: 'Histórico de front',
      notes: 'Notas',
      friends: 'Amizades',
      notifications: 'Notificações',
      settings: 'Configurações',
      signOut: 'Sair',
      skip: 'Pular para o conteúdo principal',
      systemMenu: 'Menu do sistema',
      sidebarSymbol: 'Símbolo da barra lateral',
      themePreset: 'Tema predefinido',
      appearanceSettings: 'Abrir configurações de aparência',
    },
    common: {
      friend: 'amizade',
      manage: 'Gerenciar',
      seeAll: 'Ver tudo',
      clearAll: 'Limpar tudo',
      loading: 'Carregando...',
      saving: 'Salvando...',
      selected: 'selecionados',
      noResultsFor: 'Nada encontrado para "{query}".',
      noResultsTry: 'Nada encontrado para "{query}". Tente outro nome?',
      noteOptional: 'Nota (opcional)',
    },
    dashboard: {
      quickNavigation: 'Navegação rápida',
      systemSummary: 'Resumo do sistema',
      greetingNight: 'Boa noite',
      greetingMorning: 'Bom dia',
      greetingAfternoon: 'Boa tarde',
      greetingEvening: 'Boa noite',
      active: 'ativos',
      saved: 'salvos',
      startOrSwitch: 'Começar ou trocar',
      newNote: 'Nova nota',
      captureContext: 'Registrar contexto',
      history: 'Histórico',
      editPastEntries: 'Editar entradas passadas',
      inviteAndConnect: 'Convidar e conectar',
      currentFront: 'Front atual',
      since: 'Desde',
      noCurrentFront: 'Ninguém está registrado no front agora.',
      startFront: 'Iniciar front',
      quickActions: 'Ações rápidas',
      addMember: 'Adicionar membro',
      startFrontSession: 'Iniciar sessão de front',
      writeNote: 'Escrever nota',
      recentNotes: 'Notas recentes',
      notesEmpty: 'As notas que você escrever vão aparecer aqui.',
      writeFirstNote: 'Escrever primeira nota',
      untitledNote: 'Nota sem título',
    },
    front: {
      pageTitle: 'Rastreador de front',
      pageSubtitle: 'Acompanhe quem está no front agora',
      currentSession: 'Sessão de front atual',
      currentlyFronting: 'No front agora',
      ending: 'Encerrando...',
      endFront: 'Encerrar front',
      quietMoment: 'Momento tranquilo',
      noMembersYet: 'Nenhum membro ainda -',
      addOneFirst: 'adicione um primeiro',
      switchFront: 'Trocar front',
      startFront: 'Iniciar front',
      selectMembersHelp: 'Selecione um ou mais membros para acompanhar esta sessão.',
      closeSelector: 'Fechar seletor de membros',
      chooseMembers: 'Escolher membros',
      searchMembers: 'Buscar membros',
      searchPlaceholder: 'Digite um nome',
      selectionHelp: 'Toque em um membro para adicionar ou remover desta sessão.',
      memberSelection: 'Seleção de membros',
      toggleMember: 'Alternar membro {name}',
      sessionDetails: 'Detalhes da sessão',
      selectedMembers: 'Membros selecionados',
      noSelected: 'Nenhum membro selecionado ainda.',
      removeMember: 'Remover {name} da seleção',
      notePlaceholder: 'Adicione contexto para esta sessão de front...',
      switching: 'Trocando...',
      starting: 'Iniciando...',
      openHistory: 'Abrir histórico de front',
      saveError: 'Não foi possível salvar a sessão de front. Tente de novo.',
      endError: 'Não foi possível encerrar o front. Tente de novo.',
      switched: 'Front trocado.',
      started: 'Front iniciado.',
      ended: 'Sessão de front encerrada.',
    },
    pages: {
      friendsTitle: 'Amizades',
      friendsSubtitle: 'Convide sistemas de confiança e escolha o que compartilhar.',
      settingsTitle: 'Configurações',
      settingsSubtitle: 'Gerencie perfil, conta e dados',
    },
  },
  es: {
    language: {
      label: 'Idioma',
      helper: 'Elige el idioma usado en todo Solara.',
      current: 'Idioma actual',
    },
    auth: {
      login: {
        tagline: 'Tu espacio cálido, esperándote',
        title: 'Bienvenide de vuelta',
        email: 'Correo electrónico',
        password: 'Contraseña',
        signIn: 'Entrar',
        signingIn: 'Entrando...',
        invalid: 'Ese correo o contraseña no coinciden. ¿Intentas otra vez?',
        newHere: '¿Primera vez por aquí?',
        createAccount: 'Crear una cuenta de sistema o singlet',
        forgotPassword: '¿Olvidaste tu contraseña?',
        safeSpace: 'Solara Plural - un espacio seguro para sistemas plurales',
      },
      forgot: {
        tagline: 'Una forma tranquila de volver',
        title: 'Restablecer tu contraseña',
        helper: 'Escribe el correo de tu cuenta para recibir el enlace de restablecimiento.',
        send: 'Crear enlace de restablecimiento',
        sending: 'Creando enlace...',
        sent: '¡Enlace enviado! Revisa tu correo.',
        sendFailed: 'No se pudo enviar el correo de restablecimiento ahora. Inténtalo más tarde.',
        notConfigured: 'El envío de correo aún no está configurado. Contacta al soporte.',
        backToLogin: 'Volver a iniciar sesión',
      },
      reset: {
        tagline: 'Elige una nueva llave para tu espacio',
        title: 'Define una nueva contraseña',
        helper: 'Usa una contraseña con al menos 8 caracteres.',
        newPassword: 'Nueva contraseña',
        save: 'Guardar nueva contraseña',
        saving: 'Guardando...',
        invalid: 'Este enlace de restablecimiento es inválido o expiró.',
        success: 'Contraseña actualizada. Ya puedes iniciar sesión.',
        signIn: 'Iniciar sesión',
        noToken: 'No se encontró ningún token. Solicita un nuevo enlace de restablecimiento.',
      },
      register: {
        tagline: 'Crea tu cuenta y conecta con cuidado',
        title: 'Crea tu cuenta',
        accountType: 'Tipo de cuenta',
        pluralSystem: 'Sistema plural',
        pluralSystemHelp: 'Usa miembros, seguimiento de front, notas y todo el flujo de Solara.',
        singlet: 'Singlet',
        singletHelp: 'Una cuenta más simple para amistades de confianza de sistemas.',
        switchLater: 'Las cuentas singlet pueden cambiar a una cuenta completa de sistema más tarde en Configuración.',
        displayName: 'Nombre visible',
        systemName: 'Nombre del sistema',
        email: 'Correo electrónico',
        password: 'Contraseña',
        confirmPassword: 'Confirmar contraseña',
        passwordPlaceholder: 'Al menos 8 caracteres',
        confirmPlaceholder: 'La misma contraseña otra vez',
        creating: 'Creando cuenta...',
        create: 'Crear cuenta',
        alreadyHave: '¿Ya tienes una cuenta?',
        signIn: 'Entrar',
        footer: 'Solara Plural - un espacio cálido y filantrópico para sistemas y amistades de confianza',
        passwordMismatch: 'Las contraseñas no coinciden.',
        passwordShort: 'La contraseña debe tener al menos 8 caracteres.',
        genericError: 'Algo salió mal. ¿Intentas otra vez?',
        manualLogin: 'La cuenta fue creada, pero el inicio de sesión falló. Entra manualmente.',
      },
    },
    nav: {
      primary: 'Navegación principal',
      mobilePrimary: 'Navegación principal móvil',
      more: 'Menú',
      moreOptions: 'Abrir más opciones de navegación',
      moreMenu: 'Más navegación móvil',
      home: 'Inicio',
      members: 'Miembros',
      front: 'Front',
      partners: 'Parejas',
      frontHistory: 'Historial de front',
      notes: 'Notas',
      friends: 'Amistades',
      notifications: 'Notificaciones',
      settings: 'Configuración',
      signOut: 'Salir',
      skip: 'Saltar al contenido principal',
      systemMenu: 'Menú del sistema',
      sidebarSymbol: 'Símbolo de la barra lateral',
      themePreset: 'Tema predefinido',
      appearanceSettings: 'Abrir configuración de apariencia',
    },
    common: {
      friend: 'amistad',
      manage: 'Gestionar',
      seeAll: 'Ver todo',
      clearAll: 'Limpiar todo',
      loading: 'Cargando...',
      saving: 'Guardando...',
      selected: 'seleccionados',
      noResultsFor: 'No se encontró nada para "{query}".',
      noResultsTry: 'No se encontró nada para "{query}". ¿Intentas otro nombre?',
      noteOptional: 'Nota (opcional)',
    },
    dashboard: {
      quickNavigation: 'Navegación rápida',
      systemSummary: 'Resumen del sistema',
      greetingNight: 'Buenas noches',
      greetingMorning: 'Buenos días',
      greetingAfternoon: 'Buenas tardes',
      greetingEvening: 'Buenas noches',
      active: 'activos',
      saved: 'guardados',
      startOrSwitch: 'Iniciar o cambiar',
      newNote: 'Nueva nota',
      captureContext: 'Guardar contexto',
      history: 'Historial',
      editPastEntries: 'Editar entradas pasadas',
      inviteAndConnect: 'Invitar y conectar',
      currentFront: 'Front actual',
      since: 'Desde',
      noCurrentFront: 'Nadie aparece en front ahora mismo.',
      startFront: 'Iniciar front',
      quickActions: 'Acciones rápidas',
      addMember: 'Añadir miembro',
      startFrontSession: 'Iniciar sesión de front',
      writeNote: 'Escribir nota',
      recentNotes: 'Notas recientes',
      notesEmpty: 'Las notas que escribas vivirán aquí.',
      writeFirstNote: 'Escribir primera nota',
      untitledNote: 'Nota sin título',
    },
    front: {
      pageTitle: 'Rastreador de front',
      pageSubtitle: 'Sigue quién está en front ahora',
      currentSession: 'Sesión de front actual',
      currentlyFronting: 'En front ahora',
      ending: 'Terminando...',
      endFront: 'Terminar front',
      quietMoment: 'Momento tranquilo',
      noMembersYet: 'No hay miembros todavía -',
      addOneFirst: 'añade uno primero',
      switchFront: 'Cambiar front',
      startFront: 'Iniciar front',
      selectMembersHelp: 'Selecciona uno o más miembros para seguir esta sesión.',
      closeSelector: 'Cerrar selector de miembros',
      chooseMembers: 'Elegir miembros',
      searchMembers: 'Buscar miembros',
      searchPlaceholder: 'Escribe un nombre',
      selectionHelp: 'Toca un miembro para añadirlo o quitarlo de esta sesión.',
      memberSelection: 'Selección de miembros',
      toggleMember: 'Alternar miembro {name}',
      sessionDetails: 'Detalles de la sesión',
      selectedMembers: 'Miembros seleccionados',
      noSelected: 'Aún no hay miembros seleccionados.',
      removeMember: 'Quitar {name} de la selección',
      notePlaceholder: 'Añade contexto para esta sesión de front...',
      switching: 'Cambiando...',
      starting: 'Iniciando...',
      openHistory: 'Abrir historial de front',
      saveError: 'No se pudo guardar la sesión de front. Intenta otra vez.',
      endError: 'No se pudo terminar el front. Intenta otra vez.',
      switched: 'Front cambiado.',
      started: 'Front iniciado.',
      ended: 'Sesión de front terminada.',
    },
    pages: {
      friendsTitle: 'Amistades',
      friendsSubtitle: 'Invita sistemas de confianza y elige qué compartir.',
      settingsTitle: 'Configuración',
      settingsSubtitle: 'Gestiona tu perfil, cuenta y datos',
    },
  },
} as const;

export type TranslationKey = NestedKeyOf<(typeof translations)[typeof DEFAULT_LANGUAGE]>;

type NestedKeyOf<T> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? `${K}.${NestedKeyOf<T[K]>}`
    : K;
}[keyof T & string];

export function interpolate(template: string, values?: Record<string, string | number>) {
  if (!values) return template;
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  );
}

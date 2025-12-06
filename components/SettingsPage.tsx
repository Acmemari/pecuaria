import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  User as UserIcon,
  Lock,
  Bell,
  Palette,
  Shield,
  HelpCircle,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Trash2,
  LogOut,
  Upload,
  Download,
  Globe,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';

interface SettingsPageProps {
  user: User;
  onBack: () => void;
  onToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onLogout: () => void;
}

type TabId = 'profile' | 'account' | 'notifications' | 'appearance' | 'privacy' | 'support';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onBack, onToast, onLogout }) => {
  const { refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: '',
    avatar: user.avatar || user.name?.charAt(0).toUpperCase() || 'U'
  });

  // Account state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [emailVerified, setEmailVerified] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weeklySummary: true,
    securityAlerts: true
  });

  // Appearance state
  const [appearance, setAppearance] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    language: 'pt-BR',
    dateFormat: 'DD/MM/YYYY',
    currency: 'BRL'
  });

  // Privacy state
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'private',
    dataSharing: false
  });

  const tabs: Tab[] = [
    { id: 'profile', label: 'Perfil', icon: <UserIcon size={18} /> },
    { id: 'account', label: 'Conta', icon: <Lock size={18} /> },
    { id: 'notifications', label: 'Notificações', icon: <Bell size={18} /> },
    { id: 'appearance', label: 'Aparência', icon: <Palette size={18} /> },
    { id: 'privacy', label: 'Privacidade', icon: <Shield size={18} /> },
    { id: 'support', label: 'Suporte', icon: <HelpCircle size={18} /> }
  ];

  useEffect(() => {
    // Check email verification status
    const checkEmailVerification = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setEmailVerified(authUser.email_confirmed_at !== null);
      }
    };
    checkEmailVerification();

    // Load user profile data
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setProfileData({
          name: data.name || user.name || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          avatar: data.avatar || user.avatar || user.name?.charAt(0).toUpperCase() || 'U'
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          name: profileData.name,
          phone: profileData.phone || null,
          avatar: profileData.avatar
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update email if changed
      if (profileData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profileData.email
        });
        if (emailError) throw emailError;
      }

      await refreshProfile();
      onToast('Perfil atualizado com sucesso!', 'success');
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      onToast(error.message || 'Erro ao salvar perfil', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      onToast('As senhas não coincidem', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      onToast('A senha deve ter pelo menos 6 caracteres', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      onToast('Senha alterada com sucesso!', 'success');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      onToast(error.message || 'Erro ao alterar senha', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsSaving(true);
    try {
      // Note: Actual account deletion requires admin privileges
      // For now, we'll mark the account as inactive and sign out
      // Admin can handle actual deletion via admin panel
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ status: 'inactive' })
        .eq('id', user.id);

      if (profileError) throw profileError;

      onToast('Sua conta foi marcada para exclusão. Entre em contato com o suporte para finalizar o processo.', 'info');

      // Sign out the user
      await supabase.auth.signOut();

      setTimeout(() => {
        onLogout();
      }, 2000);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      onToast(error.message || 'Erro ao processar exclusão. Entre em contato com o suporte.', 'error');
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDownloadData = async () => {
    try {
      // Fetch all user data
      const [profileData, messagesData, scenariosData] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', user.id).single(),
        supabase.from('chat_messages').select('*').eq('user_id', user.id),
        supabase.from('cattle_scenarios').select('*').eq('user_id', user.id)
      ]);

      const exportData = {
        profile: profileData.data,
        messages: messagesData.data,
        scenarios: scenariosData.data,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pecuaria-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onToast('Dados exportados com sucesso!', 'success');
    } catch (error: any) {
      console.error('Error exporting data:', error);
      onToast('Erro ao exportar dados', 'error');
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-ai-text mb-4">Informações do Perfil</h3>

        {/* Avatar Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-ai-text mb-2">Foto do Perfil</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-ai-accent text-white flex items-center justify-center text-2xl font-bold">
              {profileData.avatar || profileData.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <button className="px-4 py-2 bg-ai-surface border border-ai-border rounded-lg text-sm text-ai-text hover:bg-ai-surface2 transition-colors flex items-center gap-2">
                <Upload size={16} />
                Alterar Foto
              </button>
              <p className="text-xs text-ai-subtext mt-1">JPG, PNG ou GIF. Máx. 2MB</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-ai-text mb-2">Nome Completo</label>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => handleProfileChange('name', e.target.value)}
            className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
            placeholder="Seu nome completo"
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-ai-text mb-2">Email</label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => handleProfileChange('email', e.target.value)}
              className="flex-1 px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
              placeholder="seu@email.com"
            />
            {emailVerified && (
              <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-200">
                <CheckCircle2 size={14} />
                Verificado
              </span>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-ai-text mb-2">Telefone</label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => handleProfileChange('phone', e.target.value)}
            className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
            placeholder="(00) 00000-0000"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveProfile}
          disabled={isSaving || !hasUnsavedChanges}
          className="px-6 py-2.5 bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save size={16} />
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {/* Current Plan Info */}
      <div className="border-t border-ai-border pt-6">
        <h3 className="text-lg font-semibold text-ai-text mb-4">Plano Atual</h3>
        <div className="p-4 bg-ai-surface rounded-lg border border-ai-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-ai-text capitalize">
                {user.plan === 'basic' ? 'Básico' : user.plan === 'pro' ? 'Profissional' : user.plan === 'enterprise' ? 'Enterprise' : 'Gratuito'}
              </p>
              <p className="text-sm text-ai-subtext mt-1">
                {user.plan === 'basic' ? 'Plano gratuito com recursos limitados' :
                  user.plan === 'pro' ? 'Acesso completo a todos os recursos' :
                    user.plan === 'enterprise' ? 'Solução empresarial completa' :
                      'Plano padrão'}
              </p>
            </div>
            <span className="px-3 py-1 bg-ai-accent/10 text-ai-accent text-xs font-medium rounded-full border border-ai-accent/20">
              Ativo
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
      {/* Change Password */}
      <div>
        <h3 className="text-lg font-semibold text-ai-text mb-4">Alterar Senha</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ai-text mb-2">Senha Atual</label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent pr-10"
                placeholder="Digite sua senha atual"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ai-subtext hover:text-ai-text"
              >
                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ai-text mb-2">Nova Senha</label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent pr-10"
                placeholder="Digite sua nova senha"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ai-subtext hover:text-ai-text"
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ai-text mb-2">Confirmar Nova Senha</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent pr-10"
                placeholder="Confirme sua nova senha"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ai-subtext hover:text-ai-text"
              >
                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            onClick={handlePasswordChange}
            disabled={isSaving || !passwordData.newPassword || !passwordData.confirmPassword}
            className="px-6 py-2.5 bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </div>
      </div>

      {/* Two Factor Authentication */}
      <div className="border-t border-ai-border pt-6">
        <h3 className="text-lg font-semibold text-ai-text mb-4">Segurança</h3>
        <div className="flex items-center justify-between p-4 bg-ai-surface rounded-lg border border-ai-border">
          <div>
            <p className="font-medium text-ai-text">Verificação em Duas Etapas</p>
            <p className="text-sm text-ai-subtext mt-1">Adicione uma camada extra de segurança à sua conta</p>
          </div>
          <button
            onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${twoFactorEnabled ? 'bg-ai-accent' : 'bg-gray-300'
              }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="border-t border-ai-border pt-6">
        <h3 className="text-lg font-semibold text-ai-text mb-4">Sessões Ativas</h3>
        <div className="space-y-2">
          <div className="p-4 bg-ai-surface rounded-lg border border-ai-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ai-text">Sessão Atual</p>
                <p className="text-sm text-ai-subtext">Este dispositivo • {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
              <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-200">
                Ativa
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account */}
      <div className="border-t border-ai-border pt-6">
        <h3 className="text-lg font-semibold text-red-600 mb-4">Zona de Perigo</h3>
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-800 mb-4">
            Ao excluir sua conta, todos os seus dados serão permanentemente removidos. Esta ação não pode ser desfeita.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
            Excluir Conta
          </button>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-ai-text mb-4">Preferências de Notificação</h3>

      {[
        { key: 'email', label: 'Notificações por Email', description: 'Receba notificações importantes por email' },
        { key: 'push', label: 'Notificações Push', description: 'Receba notificações no navegador' },
        { key: 'weeklySummary', label: 'Resumo Semanal', description: 'Receba um resumo semanal das suas atividades' },
        { key: 'securityAlerts', label: 'Alertas de Segurança', description: 'Sempre ativo para proteger sua conta', disabled: true }
      ].map((item) => (
        <div key={item.key} className="flex items-center justify-between p-4 bg-ai-surface rounded-lg border border-ai-border">
          <div>
            <p className="font-medium text-ai-text">{item.label}</p>
            <p className="text-sm text-ai-subtext mt-1">{item.description}</p>
          </div>
          <button
            onClick={() => !item.disabled && setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof notifications] }))}
            disabled={item.disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications[item.key as keyof typeof notifications] ? 'bg-ai-accent' : 'bg-gray-300'
              } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
        </div>
      ))}
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-ai-text mb-4">Personalização</h3>

      {/* Theme */}
      <div>
        <label className="block text-sm font-medium text-ai-text mb-2">Tema</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light', label: 'Claro', icon: <Sun size={20} /> },
            { value: 'dark', label: 'Escuro', icon: <Moon size={20} /> },
            { value: 'system', label: 'Automático', icon: <Monitor size={20} /> }
          ].map((theme) => (
            <button
              key={theme.value}
              onClick={() => setAppearance(prev => ({ ...prev, theme: theme.value as any }))}
              className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${appearance.theme === theme.value
                ? 'border-ai-accent bg-ai-accent/10'
                : 'border-ai-border bg-white hover:border-ai-subtext'
                }`}
            >
              {theme.icon}
              <span className="text-sm font-medium text-ai-text">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm font-medium text-ai-text mb-2">Idioma</label>
        <select
          value={appearance.language}
          onChange={(e) => setAppearance(prev => ({ ...prev, language: e.target.value }))}
          className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
        >
          <option value="pt-BR">Português (Brasil)</option>
          <option value="en-US">English (US)</option>
          <option value="es-ES">Español</option>
        </select>
      </div>

      {/* Date Format */}
      <div>
        <label className="block text-sm font-medium text-ai-text mb-2">Formato de Data</label>
        <select
          value={appearance.dateFormat}
          onChange={(e) => setAppearance(prev => ({ ...prev, dateFormat: e.target.value }))}
          className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
        >
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>
      </div>

      {/* Currency */}
      <div>
        <label className="block text-sm font-medium text-ai-text mb-2">Moeda Padrão</label>
        <select
          value={appearance.currency}
          onChange={(e) => setAppearance(prev => ({ ...prev, currency: e.target.value }))}
          className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
        >
          <option value="BRL">R$ (Real Brasileiro)</option>
          <option value="USD">$ (Dólar Americano)</option>
          <option value="EUR">€ (Euro)</option>
        </select>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-ai-text mb-4">Configurações de Privacidade</h3>

      {/* Profile Visibility */}
      <div>
        <label className="block text-sm font-medium text-ai-text mb-2">Visibilidade do Perfil</label>
        <select
          value={privacy.profileVisibility}
          onChange={(e) => setPrivacy(prev => ({ ...prev, profileVisibility: e.target.value }))}
          className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
        >
          <option value="private">Privado</option>
          <option value="public">Público</option>
          <option value="contacts">Apenas Contatos</option>
        </select>
      </div>

      {/* Data Sharing */}
      <div className="flex items-center justify-between p-4 bg-ai-surface rounded-lg border border-ai-border">
        <div>
          <p className="font-medium text-ai-text">Compartilhamento de Dados</p>
          <p className="text-sm text-ai-subtext mt-1">Permitir compartilhamento anônimo de dados para melhorias</p>
        </div>
        <button
          onClick={() => setPrivacy(prev => ({ ...prev, dataSharing: !prev.dataSharing }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${privacy.dataSharing ? 'bg-ai-accent' : 'bg-gray-300'
            }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${privacy.dataSharing ? 'translate-x-6' : 'translate-x-1'
              }`}
          />
        </button>
      </div>

      {/* Download Data */}
      <div className="border-t border-ai-border pt-6">
        <h3 className="text-lg font-semibold text-ai-text mb-4">LGPD - Seus Dados</h3>
        <div className="p-4 bg-ai-surface rounded-lg border border-ai-border">
          <p className="text-sm text-ai-subtext mb-4">
            Você tem o direito de baixar todos os seus dados pessoais armazenados em nossa plataforma.
          </p>
          <button
            onClick={handleDownloadData}
            className="px-4 py-2 bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Baixar Meus Dados
          </button>
        </div>
      </div>

      {/* Activity History */}
      <div className="border-t border-ai-border pt-6">
        <h3 className="text-lg font-semibold text-ai-text mb-4">Histórico de Atividades</h3>
        <div className="p-4 bg-ai-surface rounded-lg border border-ai-border">
          <p className="text-sm text-ai-subtext">
            Seu histórico de atividades está sendo registrado para melhorar sua experiência.
          </p>
          <button className="mt-4 px-4 py-2 border border-ai-border text-ai-text rounded-lg font-medium hover:bg-ai-surface2 transition-colors">
            Ver Histórico Completo
          </button>
        </div>
      </div>
    </div>
  );

  const renderSupportTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-ai-text mb-4">Central de Ajuda</h3>

      <div className="grid md:grid-cols-2 gap-4">
        <a
          href="#"
          className="p-6 bg-ai-surface rounded-lg border border-ai-border hover:border-ai-subtext transition-colors"
        >
          <HelpCircle size={24} className="text-ai-accent mb-3" />
          <h4 className="font-medium text-ai-text mb-2">Central de Ajuda</h4>
          <p className="text-sm text-ai-subtext">Encontre respostas para suas dúvidas</p>
        </a>

        <button
          onClick={() => onToast('Funcionalidade em desenvolvimento', 'info')}
          className="p-6 bg-ai-surface rounded-lg border border-ai-border hover:border-ai-subtext transition-colors text-left"
        >
          <HelpCircle size={24} className="text-ai-accent mb-3" />
          <h4 className="font-medium text-ai-text mb-2">Reportar Problema</h4>
          <p className="text-sm text-ai-subtext">Envie um relatório de bug ou problema</p>
        </button>

        <button
          onClick={() => onToast('Funcionalidade em desenvolvimento', 'info')}
          className="p-6 bg-ai-surface rounded-lg border border-ai-border hover:border-ai-subtext transition-colors text-left"
        >
          <HelpCircle size={24} className="text-ai-accent mb-3" />
          <h4 className="font-medium text-ai-text mb-2">Enviar Feedback</h4>
          <p className="text-sm text-ai-subtext">Compartilhe suas sugestões e ideias</p>
        </button>

        <div className="p-6 bg-ai-surface rounded-lg border border-ai-border">
          <Globe size={24} className="text-ai-accent mb-3" />
          <h4 className="font-medium text-ai-text mb-2">Documentação Legal</h4>
          <div className="space-y-2 mt-3">
            <a href="#" className="text-sm text-ai-accent hover:underline block">Termos de Uso</a>
            <a href="#" className="text-sm text-ai-accent hover:underline block">Política de Privacidade</a>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'account':
        return renderAccountTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'appearance':
        return renderAppearanceTab();
      case 'privacy':
        return renderPrivacyTab();
      case 'support':
        return renderSupportTab();
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 animate-in fade-in duration-500">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Confirmar Exclusão</h3>
            <p className="text-sm text-ai-subtext mb-6">
              Tem certeza que deseja excluir sua conta? Esta ação é permanente e não pode ser desfeita.
              Todos os seus dados serão perdidos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-ai-border text-ai-text rounded-lg font-medium hover:bg-ai-surface2 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Excluindo...' : 'Excluir Conta'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-lg border border-ai-border p-2 sticky top-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                    ? 'bg-ai-accent text-white'
                    : 'text-ai-text hover:bg-ai-surface2'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg border border-ai-border p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;


import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

export interface UserSettings {
  id?: string;
  user_id: string;
  email_enabled: boolean;
  email_address: string;
  digest_frequency: 'disabled' | 'daily' | 'weekly';
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  notification_types: Record<string, boolean>;
  created_at?: string;
  updated_at?: string;
  view_mode?: string; // Density: 'Comfortable', 'Compact' etc
  orders_view_mode?: 'list' | 'grid'; // Layout preference
  pagination_limit?: number;
}

interface UseUserSettingsReturn {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  saveSettings: (data: Partial<UserSettings>) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: Omit<UserSettings, 'user_id'> = {
  email_enabled: false,
  email_address: '',
  digest_frequency: 'disabled',
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  notification_types: {},
  view_mode: 'Comfortable',
  orders_view_mode: 'list',
  pagination_limit: 20
};

/**
 * Hook for fetching and saving user notification settings from Supabase
 */
export function useUserSettings(): UseUserSettingsReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user settings from Supabase
   */
  const fetchSettings = useCallback(async () => {
    if (!user?.id) {
      setSettings(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // If no settings exist, that's OK - user just hasn't saved yet
        if (fetchError.code === 'PGRST116') {
          setSettings({
            user_id: user.id,
            ...DEFAULT_SETTINGS
          });
        } else {
          throw fetchError;
        }
      } else {
        setSettings(data);
      }
    } catch (err) {
      logger.error(err, { 
        component: 'useUserSettings', 
        action: 'fetchSettings',
        userId: user.id 
      });
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Save user settings to Supabase (upsert)
   * Merges with existing settings to prevent nulling unspecified fields
   */
  const saveSettings = useCallback(async (data: Partial<UserSettings>): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: 'Not logged in',
        description: 'Please log in to save settings.',
        variant: 'destructive'
      });
      return false;
    }

    try {
      // Build complete payload from current settings + new data
      // This prevents nulling previously saved fields
      const baseSettings = settings || { user_id: user.id, ...DEFAULT_SETTINGS };
      const settingsData = {
        ...baseSettings,
        ...data,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      // Remove undefined values and id/created_at for clean upsert
      const { id: _id, created_at: _created, ...cleanedData } = settingsData;
      const finalData = Object.fromEntries(
        Object.entries(cleanedData).filter(([_, v]) => v !== undefined)
      );

      const { error: upsertError } = await supabase
        .from('user_settings')
        .upsert(finalData, { 
          onConflict: 'user_id' 
        });

      if (upsertError) throw upsertError;

      // Update local state with merged data
      setSettings(settingsData as UserSettings);

      toast({
        title: 'Settings Saved',
        description: 'Your notification preferences have been updated.'
      });

      logger.debug('User settings saved', { 
        userId: user.id, 
        fields: Object.keys(data) 
      });

      return true;
    } catch (err) {
      logger.error(err, { 
        component: 'useUserSettings', 
        action: 'saveSettings',
        userId: user.id 
      });
      
      toast({
        title: 'Save Failed',
        description: 'Could not save settings. Please try again.',
        variant: 'destructive'
      });
      
      return false;
    }
  }, [user?.id, settings, toast]);

  /**
   * Refresh settings from server
   */
  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  // Fetch settings on mount and when user changes
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    saveSettings,
    refreshSettings
  };
}

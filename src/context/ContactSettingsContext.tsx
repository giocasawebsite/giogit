import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ContactSettings } from '../types';
import { contactApi, DEFAULT_CONTACT_SETTINGS } from '../services/contactApi';

interface ContactSettingsContextType {
  settings: ContactSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettingsLocal: (updated: ContactSettings) => void;
}

const ContactSettingsContext = createContext<ContactSettingsContextType>({
  settings: DEFAULT_CONTACT_SETTINGS,
  loading: false,
  refreshSettings: async () => {},
  updateSettingsLocal: () => {},
});

export const ContactSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ContactSettings>(DEFAULT_CONTACT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await contactApi.getSettings();
      setSettings(data);
    } catch (err) {
      console.warn('Could not refresh contact settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const updateSettingsLocal = useCallback((updated: ContactSettings) => {
    setSettings(updated);
  }, []);

  return (
    <ContactSettingsContext.Provider value={{ settings, loading, refreshSettings, updateSettingsLocal }}>
      {children}
    </ContactSettingsContext.Provider>
  );
};

export const useContactSettings = () => useContext(ContactSettingsContext);

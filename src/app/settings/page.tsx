import ThemeSettings from '@/components/ThemeSettings';
import NotificationSettings from '@/components/NotificationSettings';

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <div className="space-y-8">
        <ThemeSettings />
        <NotificationSettings />
        
        {/* Add more settings sections here in the future */}
        {/* <AccountSettings /> */}
      </div>
    </div>
  );
}

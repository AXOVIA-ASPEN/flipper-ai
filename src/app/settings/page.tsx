import ThemeSettings from '@/components/ThemeSettings';

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <div className="space-y-8">
        <ThemeSettings />
        
        {/* Add more settings sections here in the future */}
        {/* <NotificationSettings /> */}
        {/* <AccountSettings /> */}
      </div>
    </div>
  );
}

/**
 * Layout - Layout principal de la aplicación tipo VS Code
 */

import { ActivityBar } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { ViewPort } from './ViewPort';

export function Layout() {
  return (
    <div className="h-screen flex bg-gray-900 text-white overflow-hidden">
      {/* Activity Bar */}
      <ActivityBar />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <ViewPort />
    </div>
  );
}

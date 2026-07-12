/**
 * layouts/AppLayout.jsx
 *
 * The authenticated page shell — wraps every protected page.
 * Renders the Topbar once at the top, then the page content below via {children}.
 *
 * Usage in App.jsx:
 *   <AppLayout>
 *     <UploadPage />
 *   </AppLayout>
 *
 * Why this exists:
 *  - Before this, each page duplicated <Header activePage="..." /> and
 *    <div className="app-surface"><div className="app-container"> wrappers.
 *  - Now change the shell layout in ONE file and every page updates.
 */
import { Topbar } from './Topbar';

export function AppLayout({ children }) {
  return (
    <div className="app-surface">
      <div className="app-container">
        <Topbar />
        <main className="page-content" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}

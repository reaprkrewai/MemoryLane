import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-bg">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}

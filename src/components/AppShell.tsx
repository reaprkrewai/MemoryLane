import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-bg text-text">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-bg">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

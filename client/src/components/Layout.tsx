import { ReactNode } from 'react';

interface Props {
  nav: ReactNode;
  sidebar: ReactNode;
  main: ReactNode;
}

export default function Layout({ nav, sidebar, main }: Props) {
  return (
    <div className="h-screen grid grid-cols-[56px_300px_1fr]">
      <nav className="border-r border-gray-800 bg-gray-950 flex flex-col items-center py-4">
        {nav}
      </nav>
      <aside className="border-r border-gray-800 overflow-y-auto bg-gray-900">
        {sidebar}
      </aside>
      <main className="overflow-hidden flex flex-col">
        {main}
      </main>
    </div>
  );
}

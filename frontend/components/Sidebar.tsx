'use client';

import {
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ClipboardList,
  DollarSign,
  FileText,
  Hospital,
  Landmark,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from './Logo';

interface SubItem {
  label: string;
  href: string;
}
interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: SubItem[];
}
interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  { title: 'Visão geral', items: [{ label: 'Dashboard', href: '/', icon: LayoutDashboard }] },
  {
    title: 'Cadastros',
    items: [
      { label: 'Profissionais', href: '/profissionais', icon: Users, children: [
        { label: 'Lista de profissionais', href: '/profissionais' },
        { label: 'Novo profissional', href: '/profissionais/novo' },
      ] },
      { label: 'Organizações', href: '/organizacoes', icon: Building2, children: [
        { label: 'Lista de organizações', href: '/organizacoes' },
        { label: 'Nova organização', href: '/organizacoes/nova' },
      ] },
      { label: 'Órgãos Públicos', href: '/orgaos-publicos', icon: Landmark },
      { label: 'Unidades', href: '/unidades', icon: Hospital },
      { label: 'Contratos', href: '/contratos', icon: FileText, children: [
        { label: 'Lista de contratos', href: '/contratos' },
        { label: 'Novo contrato', href: '/contratos/novo' },
      ] },
    ],
  },
  {
    title: 'Operação',
    items: [
      { label: 'Vagas', href: '/vagas', icon: Briefcase, children: [
        { label: 'Lista de vagas', href: '/vagas' },
        { label: 'Nova vaga', href: '/vagas/nova' },
      ] },
      { label: 'Candidaturas', href: '/candidaturas', icon: ClipboardList },
      { label: 'Matching', href: '/matching', icon: Sparkles },
      { label: 'Alocações', href: '/alocacoes', icon: CalendarRange },
      { label: 'Escala', href: '/escala', icon: CalendarDays },
      { label: 'Financeiro', href: '/financeiro', icon: DollarSign },
    ],
  },
  {
    title: 'Comunicação',
    items: [
      { label: 'Conversas', href: '/conversas', icon: MessageSquare },
      { label: 'I.A.', href: '/ia', icon: Bot },
      { label: 'Integrações', href: '/integracoes', icon: Plug },
    ],
  },
  {
    title: 'Governança',
    items: [
      { label: 'Auditoria', href: '/auditoria', icon: ShieldCheck },
      { label: 'Configurações', href: '/configuracoes', icon: Settings },
    ],
  },
];

const linkCls = (active: boolean) =>
  `flex items-center gap-2.5 rounded-hm-sm px-3 py-2 text-sm transition-colors ${
    active ? 'bg-hm-sidebar-active font-medium text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
  }`;

function Item({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
  const [open, setOpen] = useState(isActive);
  const Icon = item.icon;

  if (!item.children) {
    return (
      <li>
        <Link href={item.href} className={linkCls(isActive)}>
          <Icon size={17} strokeWidth={1.9} />
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button onClick={() => setOpen((o) => !o)} className={`${linkCls(isActive && !open)} w-full`}>
        <Icon size={17} strokeWidth={1.9} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
          {item.children.map((c) => {
            const active = c.href === item.href ? pathname === c.href : pathname.startsWith(c.href);
            return (
              <li key={c.href}>
                <Link href={c.href} className={`block rounded-hm-sm px-3 py-1.5 text-sm transition-colors ${active ? 'text-white font-medium' : 'text-slate-400 hover:text-white'}`}>
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex shrink-0 flex-col bg-hm-sidebar-bg text-slate-300" style={{ width: '15.75rem' }}>
      <div className="flex items-center px-5" style={{ height: '3.25rem' }}>
        <Logo light />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mt-5">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <Item key={item.href} item={item} pathname={pathname} />
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

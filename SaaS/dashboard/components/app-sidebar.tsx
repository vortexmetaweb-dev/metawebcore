"use client"

import * as React from "react"

import { NavMain } from "@/SaaS/dashboard/components/nav-main"
import { NavProjects } from "@/SaaS/dashboard/components/nav-projects"
import { NavUser } from "@/SaaS/dashboard/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/SaaS/dashboard/components/ui/sidebar"
import {
  Command,
  TerminalSquareIcon,
  BotIcon,
  BookOpenIcon,
  Settings2Icon,
  FrameIcon,
  PieChartIcon,
  MapIcon,
  CreditCardIcon,
} from "lucide-react"

// This is sample data.
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: (
        <TerminalSquareIcon
        />
      ),
      isActive: true,
      items: [
        {
          title: "Resumen Mensual",
          url: "#",
        },
        {
          title: "Tendencias",
          url: "#",
        },
        {
          title: "Alertas e IA",
          url: "#",
        },
      ],
    },
    {
      title: "Movimientos",
      url: "#",
      icon: (
        <BotIcon
        />
      ),
      items: [
        {
          title: "Registrar",
          url: "#",
        },
        {
          title: "Historial",
          url: "#",
        },
        {
          title: "Categorías",
          url: "#",
        },
      ],
    },
    {
      title: "Presupuesto",
      url: "#",
      icon: (
        <BookOpenIcon
        />
      ),
      items: [
        {
          title: "Presupuestos Activos",
          url: "#",
        },
        {
          title: "Gastos Fijos",
          url: "#",
        },
        {
          title: "Metas de Ahorro",
          url: "#",
        },
      ],
    },
    {
      title: "Cuentas",
      url: "#",
      icon: (
        <CreditCardIcon
        />
      ),
      items: [
        {
          title: "Mis Cuentas",
          url: "#",
        },
        {
          title: "Tarjetas de Crédito",
          url: "#",
        },
        {
          title: "Conexiones Bancarias",
          url: "#",
        },
      ],
    },
    {
      title: "Configuración",
      url: "#",
      icon: (
        <Settings2Icon
        />
      ),
      items: [
        {
          title: "Ajustes Generales",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: (
        <FrameIcon
        />
      ),
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: (
        <PieChartIcon
        />
      ),
    },
    {
      name: "Travel",
      url: "#",
      icon: (
        <MapIcon
        />
      ),
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid size-8 place-items-center text-sidebar-foreground">
            <Command className="size-5" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">MetaWeb Core</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

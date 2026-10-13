import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  ClipboardList,
  CalendarClock,
  Banknote,
  FolderOpen,
  ListChecks,
  Megaphone,
  CalendarDays,
  Star,
  UserPlus,
  FileBarChart,
  Bell,
  ShieldCheck,
  Award,
  HeartPulse,
  Laptop,
  MonitorPlay,
  Car,
  Landmark,
  MessageSquareWarning,
  FolderKanban,
  LifeBuoy,
  type LucideIcon,
} from 'lucide-react'


export interface NavItem {
  title: string
  to: string
  icon: LucideIcon
  adminOnly?: boolean
  employeeOnly?: boolean
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const adminNav: NavSection[] = [
  {
    title: 'Overview',
    items: [{ title: 'Dashboard', to: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Organization',
    items: [
      { title: 'Employees', to: '/employees', icon: Users },
      { title: 'Departments', to: '/departments', icon: Building2 },
      { title: 'Recruitment', to: '/recruitment', icon: Briefcase },
      { title: 'Careers (Public)', to: '/careers', icon: UserPlus },
      { title: 'Incentives', to: '/incentives', icon: Award },
    ],
  },
  {
    title: 'Workforce',
    items: [
      { title: 'Projects', to: '/projects', icon: FolderKanban },
      { title: 'Attendance', to: '/attendance', icon: ClipboardList },
      { title: 'Leave', to: '/leave', icon: CalendarClock },
      { title: 'Payroll', to: '/payroll', icon: Banknote },
      { title: 'Tasks', to: '/tasks', icon: ListChecks },
      { title: 'Performance', to: '/performance', icon: Star },
    ],
  },
  {
    title: 'Resources',
    items: [
      { title: 'Documents', to: '/documents', icon: FolderOpen },
      { title: 'Assets & QR Codes', to: '/assets', icon: Laptop },
      { title: 'Parking Pass & QR', to: '/parking', icon: Car },
      { title: 'Bank Details Sector', to: '/bank-details', icon: Landmark },
      { title: 'Meeting Hall', to: '/meeting-hall', icon: MonitorPlay },
      { title: 'Complaint Box', to: '/complaints', icon: MessageSquareWarning },
      { title: 'Announcements', to: '/announcements', icon: Megaphone },
      { title: 'Holidays', to: '/holidays', icon: CalendarDays },
      { title: 'Insurance', to: '/insurance-enrollment', icon: HeartPulse },
      { title: 'Service Request Sector', to: '/service-requests', icon: LifeBuoy },
    ],
  },
  {
    title: 'Insights',
    items: [
      { title: 'Reports', to: '/reports', icon: FileBarChart },
      { title: 'Audit Logs', to: '/audit-logs', icon: ShieldCheck, adminOnly: true },
    ],
  },
]

export const employeeNav: NavSection[] = [
  {
    title: 'Overview',
    items: [{ title: 'Dashboard', to: '/', icon: LayoutDashboard }],
  },
  {
    title: 'My Work',
    items: [
      { title: 'My Projects', to: '/projects', icon: FolderKanban },
      { title: 'My Attendance', to: '/attendance', icon: ClipboardList },
      { title: 'My Leave', to: '/leave', icon: CalendarClock },
      { title: 'My Payslips', to: '/payslips', icon: Banknote },
      { title: 'My Bank Details', to: '/bank-details', icon: Landmark },
      { title: 'My Tasks', to: '/tasks', icon: ListChecks },
      { title: 'My Documents', to: '/documents', icon: FolderOpen },
      { title: 'My Assets', to: '/assets', icon: Laptop },
      { title: 'My Parking Pass', to: '/parking', icon: Car },
      { title: 'Complaint Box', to: '/complaints', icon: MessageSquareWarning },
      { title: 'My Performance', to: '/performance', icon: Star },
      { title: 'My Profile', to: '/profile', icon: Users },
      { title: 'Service Request Sector', to: '/service-requests', icon: LifeBuoy },
    ],
  },
  {
    title: 'Company',
    items: [
      { title: 'Meeting Hall', to: '/meeting-hall', icon: MonitorPlay },
      { title: 'Announcements', to: '/announcements', icon: Megaphone },
      { title: 'Holidays', to: '/holidays', icon: CalendarDays },
      { title: 'Insurance', to: '/insurance-enrollment', icon: HeartPulse },
      { title: 'Careers', to: '/careers', icon: UserPlus },
      { title: 'Service Request Sector', to: '/service-requests', icon: LifeBuoy },
    ],
  },
]

export const extraNavItems = [
  { title: 'Recruitment', to: '/recruitment', icon: UserPlus },
  { title: 'Notifications', to: '/notifications', icon: Bell },
]

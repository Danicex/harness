"use client"

import { useEffect, useState, useMemo, lazy, Suspense } from "react"
import {
  Hotel,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  Mail,
  FileText,
  Menu,
  Bell,
  User,
  BotMessageSquare,
  Megaphone,
  Group,
  BookCheck,
  CircleDollarSign,
  History,
  Check, ListTodo
} from "lucide-react"
import { Button } from "@/components/ui/button"
import logo from '../assets/963c7620-ebc1-427c-b9c2-009612cfa83b.png';
import logo2 from '../assets/9afc9890-5863-44a2-9c58-42eebfc842f4.png';
import { useMyContext } from "@/Context/AppContext"
import ThemeToggle from "@/components/ThemeToggle"
import PageSpinner from "@/components/PageSpinner"
import api from "@/lib/api"

// Lazy-loaded tab panels. Each tab's code is only downloaded the first time
// the user actually opens it — paired with <Suspense fallback={<PageSpinner />}>
// below so the rest of the dashboard (sidebar, header) stays interactive
// while a panel's chunk is loading.

const RenderAnalytics = lazy(() => import("./RenderAnalytics"))
const Room = lazy(() => import("./Room"))
const Inventory = lazy(() => import("./Inventory"))
const AutomatedCalls = lazy(() => import("./AutomatedCalls"))
const CampaignsPage = lazy(() => import("./Champagne"))
const CustomerList = lazy(() => import("./CustomerList"))
const CampaignHistory = lazy(() => import("./CampaignHistory"))
const BookingList = lazy(() => import("./Bookings"))
const SalesList = lazy(() => import("./ProductSales"))
const Staff = lazy(() => import("./Staff"))
const Inbox = lazy(() => import("./Inbox"))
const Blog = lazy(() => import("./Blog"))
const Setting = lazy(() => import("./Setting"))
const Chatbot = lazy(() => import("./Chatbot"))
const AttendanceDisplay = lazy(() => import("./AttendanceDisplay"))
const AttendanceScanner = lazy(() => import("@/staff_endpoint/AttendantScanner"))
const ProfilePage = lazy(() => import("@/staff_endpoint/StaffProfile"))
const TaskManagement = lazy(() => import("./TaskManagement"))

// NOTE: AttendanceDisplay (the rotating-QR kiosk screen) is intentionally NOT
// wired into this authenticated dashboard. It's meant to run unattended on a
// wall-mounted screen/tablet at the entrance, so it should live on its own
// standalone route (e.g. /kiosk/attendance) outside the login-gated app shell.

// Tabs every role sees, appended after their role-specific tabs.
// reg_attendant (self check-in scanner) lives here, not per-role, since
// every employee — regardless of role — needs to be able to check themselves in.
const COMMON_TABS = [
  { id: 'reg_attendant', label: 'Register Attendance', icon: User },
  { id: 'chatbot', label: 'Chatbot', icon: BotMessageSquare },
]

// Tabs unique to each role. Roles not listed here fall back to DEFAULT_ROLE_TABS.
const ROLE_TABS = {
  admin: [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: Check },
    { id: 'room', label: 'Rooms', icon: Hotel },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'bookings', label: 'Bookings', icon: BookCheck },
    { id: 'sales', label: 'Sales', icon: CircleDollarSign },
    { id: 'customers', label: 'Customers', icon: Group },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'task', label: 'Task Management', icon: ListTodo  },
    { id: 'inbox', label: 'Inbox', icon: Mail },
    { id: 'blog', label: 'Blog', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  receptionist: [
    { id: 'bookings', label: 'Bookings', icon: BookCheck },
    { id: 'profile', label: 'Profile', icon: User },

  ],
  sales_attendant: [
    { id: 'sales', label: 'Sales', icon: CircleDollarSign },
    { id: 'profile', label: 'Profile', icon: User },
  ],
}
// manager sees the same tabs as admin
ROLE_TABS.manager = ROLE_TABS.admin

// Roles with no role-specific tabs of their own still get COMMON_TABS
// (which includes Register Attendance) via the ?? fallback below.
const DEFAULT_ROLE_TABS = []

// Which tab a role should land on when they first open the dashboard.
// Roles not listed here keep whatever tab is already active (default: "home").
const DEFAULT_TAB_BY_ROLE = {
  receptionist: 'bookings',
  sales_attendant: 'sales',
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, user_role } = useMyContext()

  const get_admin_profile = async () => {
    try {
      const res = await api.get("/hotel_profile/get_hotel_profile");
      localStorage.setItem("hotel_data", JSON.stringify(res.data))
    } catch (error) {
      console.error("Failed to fetch hotel profile:", error);
    }
  };

  useEffect(() => {
    get_admin_profile();
  }, []);

  // Pure derivation of the visible nav — no side effects, safe in useMemo.
  const tabs = useMemo(() => {
    const roleTabs = ROLE_TABS[user_role] ?? DEFAULT_ROLE_TABS;
    if(user_role == "admin"){
      return [...roleTabs];
    }
     return [...roleTabs, ...COMMON_TABS];
  }, [user_role]);

  // Side effect (changing the active tab on role load) lives in its own
  // effect instead of inside useMemo.
  useEffect(() => {
    const defaultTab = DEFAULT_TAB_BY_ROLE[user_role];
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [user_role]);

  // Component mapping for better performance
  const componentMap = useMemo(() => ({
    home: RenderAnalytics,
    room: Room,
    inventory: Inventory,
    bookings: BookingList,
    reg_attendant: AttendanceScanner,
    sales: SalesList,
    customers: CustomerList,
    campaign_history: CampaignHistory,
    staff: Staff,
    Campaign: CampaignsPage,
    inbox: Inbox,
    chatbot: Chatbot,
    blog: Blog,
    profile: ProfilePage,
    attendance: AttendanceDisplay,
    automated_calls: AutomatedCalls,
    settings: Setting,
    task: TaskManagement,
  }), []);

  // Render active tab content
  const renderTabContent = () => {
    const Component = componentMap[activeTab];

    // CustomerList needs to be able to jump to the Campaign History tab.
    if (activeTab === "customers") {
      return <Component onNavigate={setActiveTab} />;
    }

    return <Component />;
  };

  // Get current tab label for header
  const currentTabLabel = useMemo(() => {
    const currentTab = tabs.find(tab => tab.id === activeTab);
    return currentTab?.label || 'Dashboard';
  }, [tabs, activeTab]);

  // Toggle sidebar for mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex min-h-screen w-[100dvw] overflow-hidden">
      {/* Sidebar */}
      <div className={`hidden w-300px flex-col border-r bg-background p-6 md:flex ${!sidebarOpen ? 'hidden' : ''}`}>
        <div className="flex items-center gap-2 font-semibold text-lg mb-8">
          <div className="flex lg:flex-1 items-center">
            {theme === 'dark' ? (
              <img alt="" src={logo2} className="h-8 w-auto" />
            ) : (
              <img alt="" src={logo} className="h-8 w-auto" />
            )}
            <span className='px-3 font-bold' id='text'>Harness</span>
          </div>
        </div>
        <nav className="grid gap-2 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                className={`justify-start gap-2 px-2 ${activeTab === tab.id ? "bg-secondary text-secondary-foreground" : "bg-none"}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </nav>
      </div>

      {/* Mobile nav */}
      {sidebarOpen && (
        <div className="side-nav hidden max-md:flex h-[100dvh] absolute z-20 w-64 flex-col border-r bg-background p-6">
          <div className="flex items-center gap-2 font-semibold text-lg mb-8">
            <div className="flex lg:flex-1 items-center">
              {theme === 'dark' ? (
                <img alt="" src={logo2} className="h-8 w-auto" />
              ) : (
                <img alt="" src={logo} className="h-8 w-auto" />
              )}
              <span className='px-3 font-bold' id='text'>Harness</span>
            </div>
          </div>
          <nav className="grid gap-2 overflow-y-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant="ghost"
                  className={`justify-start gap-2 px-2 ${activeTab === tab.id ? "bg-secondary text-secondary-foreground" : "bg-none"}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 w-full">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-background px-6">
          <div className="flex flex-1 items-center gap-4">
            <Button variant="outline" size="icon" className="md:hidden" onClick={toggleSidebar}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
            <h1 className="text-xl font-semibold">{currentTabLabel}</h1>
          </div>
          <div className="flex items-center gap-2">
            {user_role === "admin" && (
              <div>
            <Button variant="outline" size="icon" onClick={() => setActiveTab("inbox")}>
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            <Button variant="outline" size="icon" onClick={() => setActiveTab("settings")}>
              <User className="h-5 w-5" />
              <span className="sr-only">User</span>
            </Button>
              </div>
            )}
            <ThemeToggle />
          </div>
        </header>
        <main className="relative pt-6 px-6 h-[90dvh] w-full overflow-x-scroll" onClick={() => setSidebarOpen(false)}>
          <Suspense fallback={<PageSpinner />}>
            {renderTabContent()}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
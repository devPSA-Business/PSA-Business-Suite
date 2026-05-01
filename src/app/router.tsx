import { createRootRoute, createRoute, createRouter, lazyRouteComponent, redirect } from '@tanstack/react-router';
import { MainLayout } from './MainLayout';
import { useSecurityStore } from '../shared/store/useSecurityStore';
import { useAuthStore } from '../shared/store/authStore';
import { UserRole } from '../domain/models/User';

const rootRoute = createRootRoute({
  component: MainLayout,
});

// --- ROUTE GUARD (Keamanan Lapis Ganda) ---
const requireAuth = ({ location }: { location: { href: string } }) => {
  const { firebaseUser, isFirebaseInitialized } = useAuthStore.getState();
  const { isSetupComplete, isPinVerified } = useSecurityStore.getState();

  // Pastikan Firebase sudah selesai inisialisasi sebelum melempar redirect
  if (!isFirebaseInitialized) return;

  if (!firebaseUser) {
    throw redirect({ to: '/login', search: { redirect: location.href } });
  }
  if (!isSetupComplete) {
    throw redirect({ to: '/onboarding' });
  }
  if (!isPinVerified) {
    throw redirect({ to: '/locked', search: { redirect: location.href } });
  }
};

const requireRole = (allowedRoles: UserRole[]) => ({ location }: { location: { href: string } }) => {
  requireAuth({ location });
  const user = useAuthStore.getState().user;
  if (!user || !allowedRoles.includes(user.role as UserRole)) {
    throw redirect({ to: '/workspace' });
  }
};

const requireAdminOrManager = requireRole([UserRole.ADMIN, UserRole.MANAGER]);

// --- PUBLIC ROUTES (Lazy Loaded) ---
const indexRoute = createRoute({ 
  getParentRoute: () => rootRoute, 
  path: '/', 
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('../pages/HomePage'), 'HomePage')
});
const workspaceRoute = createRoute({ getParentRoute: () => rootRoute, path: '/workspace', beforeLoad: requireAuth, component: lazyRouteComponent(() => import('../pages/WorkspacePage'), 'WorkspacePage') });
const officeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/office', beforeLoad: requireRole([UserRole.ADMIN, UserRole.MANAGER]), component: lazyRouteComponent(() => import('../pages/OfficePage'), 'OfficePage') });
const cashierRoute = createRoute({ getParentRoute: () => rootRoute, path: '/cashier', beforeLoad: requireAuth, component: lazyRouteComponent(() => import('../features/pos/ui/CashierPage'), 'CashierPage') });
const servicePosRoute = createRoute({ getParentRoute: () => rootRoute, path: '/service-pos', beforeLoad: requireAuth, component: lazyRouteComponent(() => import('../features/services/ui/ServicePosPage'), 'ServicePosPage') });
const buybackRoute = createRoute({ getParentRoute: () => rootRoute, path: '/buyback', beforeLoad: requireRole([UserRole.ADMIN, UserRole.MANAGER]), component: lazyRouteComponent(() => import('../features/gold/ui/ForensicBuybackPage'), 'ForensicBuybackPage') });
const goldBuybackSalesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/gold-buyback-sales', beforeLoad: requireRole([UserRole.ADMIN, UserRole.MANAGER]), component: lazyRouteComponent(() => import('../features/gold/ui/GoldBuybackSalesPage'), 'GoldBuybackSalesPage') });
const receiveStockRoute = createRoute({ getParentRoute: () => rootRoute, path: '/receive-stock', beforeLoad: requireRole([UserRole.ADMIN, UserRole.MANAGER]), component: lazyRouteComponent(() => import('../features/inventory/ui/ReceiveStockPage'), 'ReceiveStockPage') });
const barcodePrintRoute = createRoute({ getParentRoute: () => rootRoute, path: '/barcode-print', beforeLoad: requireRole([UserRole.ADMIN, UserRole.MANAGER]), component: lazyRouteComponent(() => import('../features/inventory/ui/BarcodePrintPage'), 'BarcodePrintPage') });
const servicesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/services', beforeLoad: requireAuth, component: lazyRouteComponent(() => import('../features/services/ui/RepairPage'), 'RepairPage') });
const shiftRoute = createRoute({ getParentRoute: () => rootRoute, path: '/shift', beforeLoad: requireRole([UserRole.ADMIN, UserRole.MANAGER]), component: lazyRouteComponent(() => import('../features/shift/ui/ShiftPage'), 'ShiftPage') });
const handoverRoute = createRoute({ getParentRoute: () => rootRoute, path: '/handover', component: lazyRouteComponent(() => import('../features/shift/ui/HandoverPage'), 'HandoverPage') });
const syncStatusRoute = createRoute({ getParentRoute: () => rootRoute, path: '/office/sync-status', component: lazyRouteComponent(() => import('../pages/reports/SyncStatusPage'), 'SyncStatusPage') });
const conflictResolutionRoute = createRoute({ getParentRoute: () => rootRoute, path: '/office/conflict-resolution', beforeLoad: requireAuth, component: lazyRouteComponent(() => import('../pages/reports/ConflictResolutionPage'), 'ConflictResolutionPage') });

// --- SECURE ROUTES (Membutuhkan PIN) ---
const lockedRoute = createRoute({ 
  getParentRoute: () => rootRoute, 
  path: '/locked', 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validateSearch: (search: Record<string, any>): { redirect?: string } => {
    return {
      redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    };
  },
  beforeLoad: ({ search }) => {
    const { firebaseUser, isFirebaseInitialized } = useAuthStore.getState();
    const { isSetupComplete, isPinVerified } = useSecurityStore.getState();
    if (!isFirebaseInitialized) return;
    if (!firebaseUser) throw redirect({ to: '/login' });
    if (!isSetupComplete) throw redirect({ to: '/onboarding' });
    if (isPinVerified) {
       throw redirect({ to: search.redirect || '/' });
    }
  },
  component: lazyRouteComponent(() => import('../pages/LockedPage'), 'LockedPage') 
});

const inventoryRoute = createRoute({ getParentRoute: () => rootRoute, path: '/inventory', beforeLoad: requireRole([UserRole.ADMIN, UserRole.MANAGER]), component: lazyRouteComponent(() => import('../features/inventory/ui/InventoryPage'), 'InventoryPage') });
const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/dashboard', beforeLoad: requireRole([UserRole.ADMIN, UserRole.MANAGER]), component: lazyRouteComponent(() => import('../pages/reports/DashboardPage'), 'DashboardPage') });
const auditRoute = createRoute({ getParentRoute: () => rootRoute, path: '/audit', beforeLoad: requireRole([UserRole.ADMIN, UserRole.MANAGER]), component: lazyRouteComponent(() => import('../pages/reports/AuditPage'), 'AuditPage') });
const financeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/finance', beforeLoad: requireRole([UserRole.ADMIN, UserRole.MANAGER]), component: lazyRouteComponent(() => import('../pages/reports/FinanceReportPage'), 'FinanceReportPage') });
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', beforeLoad: requireRole([UserRole.ADMIN, UserRole.MANAGER]), component: lazyRouteComponent(() => import('../features/settings/ui/SettingsPage'), 'SettingsPage') });

const ownerDashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/owner-dashboard', beforeLoad: requireRole([UserRole.ADMIN]), component: lazyRouteComponent(() => import('../features/admin/ui/OwnerDashboardPage'), 'OwnerDashboardPage') });

// --- BYPASS ROUTES ---
const loginRoute = createRoute({ 
  getParentRoute: () => rootRoute, 
  path: '/login', 
  beforeLoad: () => {
    const { firebaseUser, isFirebaseInitialized } = useAuthStore.getState();
    if (!isFirebaseInitialized) return;
    if (firebaseUser) throw redirect({ to: '/' });
  },
  component: lazyRouteComponent(() => import('../pages/auth/LoginPage'), 'LoginPage') 
});

const onboardingRoute = createRoute({ 
  getParentRoute: () => rootRoute, 
  path: '/onboarding', 
  beforeLoad: () => {
    const { firebaseUser, isFirebaseInitialized } = useAuthStore.getState();
    const { isSetupComplete } = useSecurityStore.getState();
    if (!isFirebaseInitialized) return;
    if (!firebaseUser) throw redirect({ to: '/login' });
    if (isSetupComplete) throw redirect({ to: '/' });
  },
  component: lazyRouteComponent(() => import('../pages/auth/OnboardingPage'), 'OnboardingPage') 
});
const employeesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/employees', beforeLoad: requireRole([UserRole.ADMIN, UserRole.MANAGER]), component: lazyRouteComponent(() => import('../pages/employees/EmployeesPage'), 'EmployeesPage') });
const customersRoute = createRoute({ getParentRoute: () => rootRoute, path: '/customers', beforeLoad: requireRole([UserRole.ADMIN, UserRole.MANAGER]), component: lazyRouteComponent(() => import('../pages/employees/CustomersPage'), 'CustomersPage') });
const printerSettingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings/printer', beforeLoad: requireRole([UserRole.ADMIN, UserRole.MANAGER]), component: lazyRouteComponent(() => import('../features/settings/ui/PrinterSettingsPage'), 'PrinterSettingsPage') });
const receiptSettingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings/receipt', beforeLoad: requireRole([UserRole.ADMIN, UserRole.MANAGER]), component: lazyRouteComponent(() => import('../features/settings/ui/ReceiptSettingsPage'), 'ReceiptSettingsPage') });
const syncDlqRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings/sync-dlq', beforeLoad: requireRole([UserRole.ADMIN]), component: lazyRouteComponent(() => import('../features/settings/ui/DeadLetterQueuePage'), 'DeadLetterQueuePage') });

const routeTree = rootRoute.addChildren([
  indexRoute, workspaceRoute, officeRoute, cashierRoute, dashboardRoute, 
  auditRoute, syncStatusRoute, conflictResolutionRoute, financeRoute, servicePosRoute, buybackRoute,
  goldBuybackSalesRoute, inventoryRoute, receiveStockRoute, barcodePrintRoute,
  servicesRoute, shiftRoute, handoverRoute, settingsRoute,
  lockedRoute, loginRoute, onboardingRoute, employeesRoute, customersRoute, printerSettingsRoute, receiptSettingsRoute, syncDlqRoute, ownerDashboardRoute
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

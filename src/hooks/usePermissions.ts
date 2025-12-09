import { useAuthStore } from '@/stores';

/**
 * 权限控制 Hook
 *
 * 角色权限说明:
 * - admin: 完整权限 (所有功能)
 * - manager: 仓库管理员权限 (管理订单和库存)
 * - tester: 测试员权限 (与manager相同权限)
 * - staff: 员工权限 (只读访问)
 */

export type Role = 'admin' | 'manager' | 'staff' | 'tester';

export const usePermissions = () => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role as Role | undefined;

  /**
   * 检查是否有管理员权限
   */
  const isAdmin = userRole === 'admin';

  /**
   * 检查是否有仓库管理员或更高权限（包含tester）
   */
  const isManagerOrAbove = userRole === 'admin' || userRole === 'manager' || userRole === 'tester';

  /**
   * 检查是否有员工或更高权限（即任何已认证用户）
   */
  const isStaffOrAbove = userRole === 'admin' || userRole === 'manager' || userRole === 'staff' || userRole === 'tester';

  /**
   * 检查是否可以编辑数据（manager 和 admin）
   */
  const canEdit = isManagerOrAbove;

  /**
   * 检查是否只读（staff）
   */
  const isReadOnly = userRole === 'staff';

  /**
   * 检查是否可以访问用户管理（仅 admin）
   */
  const canManageUsers = isAdmin;

  /**
   * 检查是否可以管理库存（manager 和 admin）
   */
  const canManageInventory = isManagerOrAbove;

  /**
   * 检查是否可以管理订单（manager 和 admin）
   */
  const canManageOrders = isManagerOrAbove;

  /**
   * 检查是否可以查看分析报告（所有角色）
   */
  const canViewAnalytics = isStaffOrAbove;

  /**
   * 检查是否可以导出数据（manager 和 admin）
   */
  const canExportData = isManagerOrAbove;

  return {
    userRole,
    isAdmin,
    isManagerOrAbove,
    isStaffOrAbove,
    canEdit,
    isReadOnly,
    canManageUsers,
    canManageInventory,
    canManageOrders,
    canViewAnalytics,
    canExportData,
  };
};

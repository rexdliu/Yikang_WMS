import { Badge } from '@/components/ui/badge';
import { Shield, Briefcase, User, TestTube } from 'lucide-react';

const ROLE_CONFIG = {
  admin: {
    label: '管理员',
    variant: 'destructive' as const,
    Icon: Shield,
  },
  manager: {
    label: '经理',
    variant: 'default' as const,
    Icon: Briefcase,
  },
  staff: {
    label: '员工',
    variant: 'secondary' as const,
    Icon: User,
  },
  tester: {
    label: '测试员',
    variant: 'outline' as const,
    Icon: TestTube,
  },
};

interface RoleBadgeProps {
  role: string;
  className?: string;
}

export const RoleBadge = ({ role, className }: RoleBadgeProps) => {
  const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];

  if (!config) {
    return <Badge variant="secondary">{role}</Badge>;
  }

  const { label, variant, Icon } = config;

  return (
    <Badge variant={variant} className={`gap-1.5 ${className || ''}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
};

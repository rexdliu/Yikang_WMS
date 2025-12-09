import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiService } from '@/services/api';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 验证密码匹配
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    try {
      // 调用注册 API
      await apiService.register({
        username,
        email,
        password,
        full_name: fullName || undefined,
        phone: phone || undefined,
      });

      // 注册成功
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请检查输入信息');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-center">注册新用户</h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded">
            注册成功！正在跳转到登录页面...
          </div>
        )}

        <div className="space-y-2">
          <Input
            type="text"
            placeholder="用户名 *"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading || success}
          />
          <Input
            type="email"
            placeholder="邮箱 *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || success}
          />
          <Input
            type="text"
            placeholder="姓名（可选）"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading || success}
          />
          <Input
            type="tel"
            placeholder="手机号（可选）"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading || success}
          />
          <Input
            type="password"
            placeholder="密码 *"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading || success}
          />
          <Input
            type="password"
            placeholder="确认密码 *"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading || success}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading || success}>
          {loading ? '注册中...' : '注册'}
        </Button>

        <p className="text-sm text-center text-muted-foreground">
          已有账号？{' '}
          <Link to="/login" className="text-primary hover:underline">
            返回登录
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;

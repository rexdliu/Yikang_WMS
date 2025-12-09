#!/usr/bin/env python3
"""
测试和验证密码哈希
"""
from passlib.context import CryptContext
import bcrypt
from types import SimpleNamespace

# Temporary compatibility shim for passlib + bcrypt 4.3+
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = SimpleNamespace(__version__=getattr(bcrypt, "__version__", "0"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Seed文件中使用的哈希
SEED_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIW.hlO3CO"

# 测试的密码列表
test_passwords = [
    "admin123",
    "manager123",
    "staff123",
    "admin1234",
    "1234",
    "password",
    "test123"
]

print("="*60)
print("验证 Seed 文件中的密码哈希")
print("="*60)
print(f"\n哈希值: {SEED_HASH}\n")

print("测试密码匹配:")
found = False
for password in test_passwords:
    match = pwd_context.verify(password, SEED_HASH)
    status = "✓ 匹配" if match else "✗ 不匹配"
    print(f"  {password:15s} -> {status}")
    if match and not found:
        found = True
        print(f"\n    >>> 找到匹配密码: {password} <<<\n")

if not found:
    print("\n⚠ 警告: 没有找到匹配的密码！")

print("\n" + "="*60)
print("生成新的密码哈希")
print("="*60 + "\n")

# 生成推荐的密码哈希
passwords_to_generate = {
    "admin": "admin123",
    "manager": "manager123",
    "staff": "staff123",
    "rextest": "admin123"
}

print("推荐使用的密码哈希:\n")
for username, password in passwords_to_generate.items():
    hash_value = pwd_context.hash(password)
    print(f"{username:10s} / {password:12s}")
    print(f"  -> {hash_value}\n")

# 验证新生成的哈希
print("\n" + "="*60)
print("验证新生成的哈希")
print("="*60 + "\n")

for username, password in passwords_to_generate.items():
    new_hash = pwd_context.hash(password)
    verified = pwd_context.verify(password, new_hash)
    print(f"{username}: {'✓ 验证成功' if verified else '✗ 验证失败'}")

print("\n" + "="*60)
print("数据库检查建议")
print("="*60 + "\n")

print("请执行以下SQL查询来检查数据库中的用户:")
print("""
SELECT username, email, role,
       LEFT(hashed_password, 30) as password_prefix,
       LENGTH(hashed_password) as hash_length
FROM users;
""")

print("\n如果用户不存在，请先执行数据库初始化:")
print("  mysql -h HOST -u USER -pPASSWORD warehouse_test_data < database/complete_setup.sql")

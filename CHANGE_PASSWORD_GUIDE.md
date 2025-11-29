# Hướng dẫn đổi mật khẩu Backend

Có 3 cách để đổi/cập nhật mật khẩu trong hệ thống:

## 🔐 Cách 1: User tự đổi mật khẩu (Qua API)

User đã đăng nhập có thể tự đổi mật khẩu của mình qua API endpoint.

### Endpoint:
```
POST /api/auth/change-password
```

### Headers:
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Body:
```json
{
  "currentPassword": "old_password_here",
  "newPassword": "new_password_here"
}
```

### Ví dụ với cURL:
```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "oldpassword123",
    "newPassword": "newpassword123"
  }'
```

### Yêu cầu:
- Phải có token hợp lệ (đã đăng nhập)
- `currentPassword`: Mật khẩu hiện tại (bắt buộc)
- `newPassword`: Mật khẩu mới (tối thiểu 6 ký tự)

---

## 👨‍💼 Cách 2: Admin đổi mật khẩu user khác (Qua API)

Admin có thể đổi mật khẩu của bất kỳ user nào qua endpoint `/api/users/:id`.

### Endpoint:
```
PUT /api/users/:id
```

### Headers:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

### Body:
```json
{
  "password": "new_password_here"
}
```

### Ví dụ với cURL:
```bash
curl -X PUT http://localhost:5000/api/users/1 \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "newpassword123"
  }'
```

**Lưu ý:** Không cần password cũ, admin có thể reset trực tiếp.

---

## 🛠️ Cách 3: Reset mật khẩu qua Script (Command Line)

Sử dụng script để reset mật khẩu trực tiếp trong database (không cần password cũ).

### Cú pháp:
```bash
cd backend
npm run reset-password <username> <new_password>
```

### Ví dụ:
```bash
# Reset password cho user "admin"
npm run reset-password admin newpassword123

# Reset password cho user "manager"
npm run reset-password manager manager123
```

### Output:
```
📋 Found user: admin (admin@test.com, admin)
✅ Password reset successfully for user: admin
🔑 New password: newpassword123
⚠️  Please change this password after logging in!
```

### Yêu cầu:
- Phải có quyền truy cập database
- Username phải tồn tại
- Password mới tối thiểu 6 ký tự

---

## 📋 So sánh các phương pháp

| Phương pháp | Yêu cầu password cũ | Cần token | Quyền admin | Sử dụng khi |
|------------|---------------------|-----------|-------------|-------------|
| **API: change-password** | ✅ Có | ✅ Có | ❌ Không | User tự đổi |
| **API: PUT /users/:id** | ❌ Không | ✅ Có | ✅ Có | Admin reset cho user |
| **Script: reset-password** | ❌ Không | ❌ Không | ✅ Có | Quên password, khẩn cấp |

---

## 🔒 Bảo mật

1. **Mật khẩu được hash** bằng bcrypt (10 rounds)
2. **Không lưu plain text** trong database
3. **Validation**: Password tối thiểu 6 ký tự
4. **Token required**: API endpoints yêu cầu authentication

---

## ⚠️ Lưu ý

- Sau khi reset password qua script, user nên đổi lại mật khẩu
- Admin nên thông báo cho user sau khi reset password
- Không share password mới qua email/text không an toàn

---

## 🐛 Troubleshooting

### Lỗi: "Current password is incorrect"
- Kiểm tra lại password hiện tại
- Đảm bảo không có khoảng trắng thừa

### Lỗi: "Password must be at least 6 characters"
- Password mới phải có ít nhất 6 ký tự

### Lỗi: "User not found" (script)
- Kiểm tra username có đúng không
- Kiểm tra database connection

### Lỗi: "Authentication required"
- Đảm bảo đã gửi token trong header
- Token có thể đã hết hạn, cần login lại


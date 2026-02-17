import React from 'react';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../services/api';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 380 }}>
        <LoginForm
          title="摩的管理端"
          subTitle="司机审核与运营看板（Web）"
          onFinish={async (values) => {
            try {
              const res = await adminLogin({ username: values.username, password: values.password });
              if (!res.success || !res.data) {
                message.error(res.message || '登录失败');
                return false;
              }
              localStorage.setItem('admin_token', res.data.token);
              localStorage.setItem('admin_profile', JSON.stringify(res.data.admin));
              message.success('登录成功');
              navigate('/stats', { replace: true });
              return true;
            } catch (e: any) {
              message.error(e?.response?.data?.message || e?.message || '登录失败');
              return false;
            }
          }}
        >
          <ProFormText
            name="username"
            fieldProps={{
              size: 'large',
              prefix: <UserOutlined />
            }}
            placeholder="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{
              size: 'large',
              prefix: <LockOutlined />
            }}
            placeholder="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          />
        </LoginForm>
      </div>
    </div>
  );
};

export default LoginPage;


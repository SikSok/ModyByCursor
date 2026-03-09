import React from 'react';
import { ProLayout } from '@ant-design/pro-components';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'antd';

const BasicLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const pathname = location.pathname;

  return (
    <ProLayout
      title="摩迪管理端"
      logo={false}
      layout="mix"
      location={{ pathname }}
        route={{
        path: '/',
        routes: [
          { path: '/stats', name: '数据统计' },
          { path: '/users', name: '用户列表' },
          { path: '/drivers/pending', name: '司机审核' },
          { path: '/feedback', name: '反馈管理' }
        ]
      }}
      menuItemRender={(item, dom) => {
        if (!item.path) return dom;
        return <Link to={item.path}>{dom}</Link>;
      }}
      actionsRender={() => [
        <Button
          key="logout"
          onClick={() => {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_profile');
            navigate('/login');
          }}
        >
          退出
        </Button>
      ]}
    >
      <Outlet />
    </ProLayout>
  );
};

export default BasicLayout;


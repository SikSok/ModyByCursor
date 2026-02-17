import React, { useMemo, useState } from 'react';
import { ProTable, type ProColumns, PageContainer } from '@ant-design/pro-components';
import { Button, Tag, message } from 'antd';
import { getUserList, type UserListItem } from '../services/api';

const UserListPage: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const columns = useMemo<ProColumns<UserListItem>[]>(() => {
    return [
      { title: 'ID', dataIndex: 'id', width: 80, search: false },
      { title: '手机号', dataIndex: 'phone', width: 140 },
      { title: '姓名', dataIndex: 'name', width: 120, search: false, render: (_, r) => r.name || '-' },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        valueType: 'select',
        valueEnum: { 0: { text: '禁用', status: 'Error' }, 1: { text: '正常', status: 'Success' } },
        render: (_, r) => (
          <Tag color={r.status === 1 ? 'green' : 'red'}>{r.status === 1 ? '正常' : '禁用'}</Tag>
        )
      },
      { title: '注册时间', dataIndex: 'created_at', search: false, width: 180 }
    ];
  }, []);

  return (
    <PageContainer title="用户列表" subTitle="C 端用户查询">
      <ProTable<UserListItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        request={async ({ current = 1, pageSize = 20, phone, status }) => {
          setLoading(true);
          try {
            const res = await getUserList({
              page: current,
              pageSize,
              phone: phone as string | undefined,
              status: status !== undefined ? Number(status) as 0 | 1 : undefined
            });
            if (!res.success) throw new Error(res.message || '加载失败');
            return {
              data: res.data.list,
              success: true,
              total: res.data.total
            };
          } catch (e: any) {
            message.error(e?.response?.data?.message || e?.message || '加载失败');
            return { data: [], success: false, total: 0 };
          } finally {
            setLoading(false);
          }
        }}
        search={{ labelWidth: 'auto' }}
        options={false}
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        form={{ span: 6 }}
      />
    </PageContainer>
  );
};

export default UserListPage;

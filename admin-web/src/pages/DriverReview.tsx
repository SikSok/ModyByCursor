import React, { useEffect, useMemo, useState } from 'react';
import { ProTable, type ProColumns, PageContainer } from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag, message } from 'antd';
import { approveDriver, getPendingDrivers, rejectDriver, type PendingDriver } from '../services/api';

const DriverReviewPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PendingDriver[]>([]);

  const columns = useMemo<ProColumns<PendingDriver>[]>(() => {
    return [
      { title: 'ID', dataIndex: 'id', width: 80, search: false },
      { title: '手机号', dataIndex: 'phone', width: 140 },
      { title: '姓名', dataIndex: 'name', width: 120, search: false, render: (_, r) => r.name || '-' },
      { title: '身份证', dataIndex: 'id_card', width: 200, search: false, render: (_, r) => r.id_card || '-' },
      { title: '车牌', dataIndex: 'license_plate', width: 120, search: false, render: (_, r) => r.license_plate || '-' },
      { title: '车型', dataIndex: 'vehicle_type', width: 120, search: false, render: (_, r) => r.vehicle_type || '-' },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        search: false,
        render: (_, r) => {
          const color = r.status === 'pending' ? 'gold' : r.status === 'approved' ? 'green' : 'red';
          return <Tag color={color}>{r.status}</Tag>;
        }
      },
      { title: '申请时间', dataIndex: 'created_at', search: false, width: 200 },
      {
        title: '操作',
        valueType: 'option',
        width: 220,
        fixed: 'right',
        render: (_, r) => (
          <Space>
            <Popconfirm
              title="确认通过该司机？"
              onConfirm={async () => {
                await approveDriver(r.id);
                message.success('已通过');
                await reload();
              }}
            >
              <Button type="primary" size="small">
                通过
              </Button>
            </Popconfirm>
            <Popconfirm
              title="确认驳回该司机？"
              onConfirm={async () => {
                await rejectDriver(r.id);
                message.success('已驳回');
                await reload();
              }}
            >
              <Button danger size="small">
                驳回
              </Button>
            </Popconfirm>
          </Space>
        )
      }
    ];
  }, []);

  async function reload() {
    setLoading(true);
    try {
      const res = await getPendingDrivers();
      if (!res.success) throw new Error(res.message || '加载失败');
      setData(res.data);
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <PageContainer title="司机审核" subTitle="待审核司机列表">
      <ProTable<PendingDriver>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        search={false}
        options={false}
        pagination={{ pageSize: 10 }}
        toolBarRender={() => [
          <Button key="refresh" onClick={() => reload()} disabled={loading}>
            刷新
          </Button>
        ]}
      />
    </PageContainer>
  );
};

export default DriverReviewPage;


import React, { useEffect, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Row, Col, Statistic, Spin, message } from 'antd';
import { getStats, type AdminStats } from '../services/api';

const StatsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getStats();
        if (res.success && res.data && !cancelled) {
          setStats(res.data);
        }
      } catch (e: any) {
        if (!cancelled) {
          message.error(e?.response?.data?.message || '获取统计失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  if (!stats) {
    return (
      <PageContainer>
        <Card>暂无数据</Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="数据统计">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="用户总数" value={stats.totalUsers} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="司机总数" value={stats.totalDrivers} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="管理员数" value={stats.totalAdmins} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="待审核司机" value={stats.driversPending} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="已通过司机" value={stats.driversApproved} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="已驳回司机" value={stats.driversRejected} />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default StatsPage;

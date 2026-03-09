import React, { useEffect, useMemo, useState } from 'react';
import { ProTable, type ProColumns, PageContainer } from '@ant-design/pro-components';
import { Button, Drawer, Tag, Input, message, Space } from 'antd';
import {
  getFeedbackList,
  getFeedbackById,
  updateFeedback,
  type FeedbackItem,
  type FeedbackSource,
  type FeedbackType,
  type FeedbackStatus,
} from '../services/api';

const sourceLabels: Record<FeedbackSource, string> = {
  app: 'App',
  website: '官网',
};
const typeLabels: Record<FeedbackType, string> = {
  suggestion: '建议',
  experience: '体验反馈',
  report: '举报',
};
const statusLabels: Record<FeedbackStatus, string> = {
  pending: '待处理',
  replied: '已回复',
  closed: '已关闭',
};

const FeedbackPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [source, setSource] = useState<FeedbackSource | undefined>();
  const [type, setType] = useState<FeedbackType | undefined>();
  const [status, setStatus] = useState<FeedbackStatus | undefined>();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<FeedbackItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [statusSelect, setStatusSelect] = useState<FeedbackStatus | undefined>();

  async function loadList() {
    setLoading(true);
    try {
      const res = await getFeedbackList({
        page,
        limit,
        source,
        type,
        status,
      });
      if (!res.success) throw new Error(res.message || '加载失败');
      setData(res.data.list);
      setTotal(res.data.total);
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadList();
  }, [page, limit, source, type, status]);

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDrawerVisible(true);
    setDetail(null);
    setReplyText('');
    setStatusSelect(undefined);
    setDetailLoading(true);
    try {
      const res = await getFeedbackById(id);
      if (!res.success) throw new Error(res.message || '加载失败');
      const d = res.data as any;
      setDetail({
        ...d,
        content_summary: d.content_summary ?? (d.content?.slice(0, 50) + (d.content?.length > 50 ? '…' : '')),
      });
      setStatusSelect(d.status);
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || '加载失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (detailId == null || !detail) return;
    const text = replyText.trim();
    if (!text) {
      message.warning('请填写回复内容');
      return;
    }
    setReplySubmitting(true);
    try {
      await updateFeedback(detailId, { admin_reply: text });
      message.success('回复已发送');
      setReplyText('');
      const res = await getFeedbackById(detailId);
      if (res.success && res.data) setDetail(res.data as any);
      void loadList();
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || '回复失败');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: FeedbackStatus) => {
    if (detailId == null) return;
    try {
      await updateFeedback(detailId, { status: newStatus });
      message.success('状态已更新');
      setStatusSelect(newStatus);
      const res = await getFeedbackById(detailId);
      if (res.success && res.data) setDetail(res.data as any);
      void loadList();
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || '更新失败');
    }
  };

  const columns = useMemo<ProColumns<FeedbackItem>[]>(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 70,
        search: false,
      },
      {
        title: '提交时间',
        dataIndex: 'created_at',
        width: 175,
        search: false,
        render: (_, r) => (r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : '-'),
      },
      {
        title: '来源',
        dataIndex: 'source',
        width: 90,
        render: (_, r) => (
          <Space>
            <Tag color={r.source === 'app' ? 'blue' : 'default'}>{sourceLabels[r.source]}</Tag>
            {r.source === 'website' && (
              <Tag color="default">无法反馈</Tag>
            )}
          </Space>
        ),
      },
      {
        title: '类型',
        dataIndex: 'type',
        width: 100,
        render: (_, r) => typeLabels[r.type],
      },
      {
        title: '内容摘要',
        dataIndex: 'content_summary',
        ellipsis: true,
        search: false,
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 90,
        render: (_, r) => {
          const color = r.status === 'pending' ? 'gold' : r.status === 'replied' ? 'green' : 'default';
          return <Tag color={color}>{statusLabels[r.status]}</Tag>;
        },
      },
      {
        title: '操作',
        valueType: 'option',
        width: 90,
        fixed: 'right',
        render: (_, r) => (
          <Button type="link" size="small" onClick={() => openDetail(r.id)}>
            查看
          </Button>
        ),
      },
    ],
    []
  );

  const isWebsite = detail?.source === 'website';
  const hasContact = detail?.contact && String(detail.contact).trim();

  return (
    <PageContainer title="反馈管理" subTitle="用户建议、体验反馈与举报">
      <ProTable<FeedbackItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        search={false}
        options={false}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: false,
          onChange: (p) => setPage(p || 1),
        }}
        toolBarRender={() => [
          <Space key="filters">
            <span>来源：</span>
            <Button size="small" type={source === undefined ? 'primary' : 'default'} onClick={() => setSource(undefined)}>
              全部
            </Button>
            <Button size="small" type={source === 'app' ? 'primary' : 'default'} onClick={() => setSource('app')}>
              App
            </Button>
            <Button size="small" type={source === 'website' ? 'primary' : 'default'} onClick={() => setSource('website')}>
              官网
            </Button>
            <span style={{ marginLeft: 12 }}>类型：</span>
            <Button size="small" type={type === undefined ? 'primary' : 'default'} onClick={() => setType(undefined)}>全部</Button>
            <Button size="small" type={type === 'suggestion' ? 'primary' : 'default'} onClick={() => setType('suggestion')}>建议</Button>
            <Button size="small" type={type === 'experience' ? 'primary' : 'default'} onClick={() => setType('experience')}>体验反馈</Button>
            <Button size="small" type={type === 'report' ? 'primary' : 'default'} onClick={() => setType('report')}>举报</Button>
            <span style={{ marginLeft: 12 }}>状态：</span>
            <Button size="small" type={status === undefined ? 'primary' : 'default'} onClick={() => setStatus(undefined)}>
              全部
            </Button>
            <Button size="small" type={status === 'pending' ? 'primary' : 'default'} onClick={() => setStatus('pending')}>
              待处理
            </Button>
            <Button size="small" type={status === 'replied' ? 'primary' : 'default'} onClick={() => setStatus('replied')}>
              已回复
            </Button>
            <Button size="small" type={status === 'closed' ? 'primary' : 'default'} onClick={() => setStatus('closed')}>
              已关闭
            </Button>
          </Space>,
          <Button key="refresh" onClick={() => loadList()} disabled={loading}>
            刷新
          </Button>,
        ]}
      />

      <Drawer
        title="反馈详情"
        placement="right"
        width={480}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        loading={detailLoading}
      >
        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <strong>来源</strong>：{sourceLabels[detail.source]}
              {detail.source === 'website' && (
                <Tag color="default" style={{ marginLeft: 8 }}>无法反馈</Tag>
              )}
            </div>
            <div>
              <strong>类型</strong>：{typeLabels[detail.type]}
            </div>
            <div>
              <strong>提交时间</strong>：{detail.created_at ? new Date(detail.created_at).toLocaleString('zh-CN') : '-'}
            </div>
            {detail.user_id != null && (
              <div>
                <strong>用户 ID</strong>：{detail.user_id}
              </div>
            )}
            <div>
              <strong>内容</strong>
              <div style={{ marginTop: 4, padding: 12, background: '#fafafa', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
                {detail.content ?? detail.content_summary ?? '-'}
              </div>
            </div>
            {detail.reported_user_info && (
              <div>
                <strong>被举报人信息</strong>：{detail.reported_user_info}
              </div>
            )}
            {hasContact && (
              <div style={{ padding: 12, background: 'rgba(22, 163, 74, 0.08)', borderRadius: 8 }}>
                <strong>有联系方式，可尝试邮件/电话回复</strong>
                <div style={{ marginTop: 4 }}>{detail.contact}</div>
              </div>
            )}
            {isWebsite && (
              <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, color: '#666' }}>
                该条为官网留言，无法向用户反馈。
              </div>
            )}

            <div>
              <strong>状态</strong>
              <Space style={{ marginLeft: 8 }}>
                {(['pending', 'replied', 'closed'] as const).map((s) => (
                  <Button
                    key={s}
                    size="small"
                    type={statusSelect === s ? 'primary' : 'default'}
                    onClick={() => handleStatusChange(s)}
                  >
                    {statusLabels[s]}
                  </Button>
                ))}
              </Space>
            </div>

            {detail.admin_reply && (
              <div>
                <strong>管理员回复</strong>
                <div style={{ marginTop: 4, padding: 12, background: '#e6f7ff', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
                  {detail.admin_reply}
                </div>
                {detail.replied_at && (
                  <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                    回复时间：{new Date(detail.replied_at).toLocaleString('zh-CN')}
                  </div>
                )}
              </div>
            )}

            {!isWebsite && (
              <div>
                <strong>回复内容</strong>
                <Input.TextArea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="输入回复内容，提交后将通过站内消息通知用户"
                  style={{ marginTop: 8 }}
                />
                <Button
                  type="primary"
                  style={{ marginTop: 8 }}
                  onClick={handleSendReply}
                  loading={replySubmitting}
                >
                  发送回复
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default FeedbackPage;

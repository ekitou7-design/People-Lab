import { useEffect, useRef, useState } from 'react';
import { IconArrowLeft, IconBook2, IconChevronRight, IconFileText, IconSearch, IconShieldCheck, IconX } from '@tabler/icons-react';
import type { PageProps } from './types';
import { EmptyState, HighlightText, PageHeader, StatusBadge } from './ui';
import './pages.css';

export function KnowledgePage({ data, focus, onBack }: PageProps & { onBack?: () => void }) {
  const [selectedId, setSelectedId] = useState(focus?.knowledgeId || data.knowledge[0]?.id || '');
  const [selectedSection, setSelectedSection] = useState(focus?.sectionId || '');
  const [query, setQuery] = useState('');
  const reader = useRef<HTMLElement>(null);
  const current = data.knowledge.find(item => item.id === selectedId) || data.knowledge[0];
  const visible = data.knowledge.filter(item => `${item.title} ${item.category} ${item.summary} ${item.sections.map(section => `${section.title} ${section.content}`).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
  const quote = current?.id === focus?.knowledgeId ? focus.quote : undefined;
  useEffect(() => { setSelectedId(data.knowledge[0]?.id || ''); setSelectedSection(''); setQuery(''); }, [data.actor.id]);
  useEffect(() => {
    if (focus?.page !== 'knowledge') return;
    if (focus.knowledgeId) setSelectedId(focus.knowledgeId);
    setSelectedSection(focus.sectionId || ''); setQuery('');
  }, [focus?.page, focus?.knowledgeId, focus?.sectionId, focus?.quote]);
  useEffect(() => {
    if (!current) return;
    const frame = requestAnimationFrame(() => {
      const target = selectedSection ? reader.current?.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(selectedSection)}"]`) : reader.current;
      target?.scrollIntoView({ behavior: 'smooth', block: selectedSection ? 'center' : 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [current?.id, selectedSection, focus?.quote]);
  return <div className="v2p-page">
    <PageHeader title="企业知识库" description="查阅员工制度、入职指南和岗位作业指导书。" actions={onBack ? <button className="v2-button secondary" aria-label="返回原任务" onClick={onBack}><IconArrowLeft size={16} />返回原任务</button> : <StatusBadge tone="blue">{data.knowledge.length} 份演示资料</StatusBadge>} />
    {!data.knowledge.length ? <section className="v2-card"><EmptyState title="暂无已发布资料" description="资料发布后，制度问答和岗位训练将引用同一份文档。" icon={<IconBook2 size={27} />} /></section> : <div className="v2p-knowledge-layout">
      <aside className="v2-card v2p-knowledge-directory" aria-label="知识目录"><div className="v2-card-header"><div><h2>资料目录</h2><p>{data.knowledge.length} 份资料 · {data.knowledge.reduce((sum, item) => sum + item.sections.length, 0)} 个章节</p></div></div><div className="v2p-knowledge-search"><IconSearch size={16} /><input aria-label="搜索知识资料" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索标题或正文" />{query && <button className="v2-icon-button" aria-label="清空知识搜索" onClick={() => setQuery('')}><IconX size={14} /></button>}</div><div className="v2p-document-list">{visible.length ? visible.map(document => <div key={document.id} className={`v2p-document-entry ${current?.id === document.id ? 'selected' : ''}`}><button className="v2p-document-select" onClick={() => { setSelectedId(document.id); setSelectedSection(''); }} aria-label={`阅读${document.title}`}><IconFileText size={18} /><span><strong>{document.title}</strong><small>{document.category} · {document.version}</small></span><IconChevronRight size={14} /></button>{current?.id === document.id && <nav aria-label={`${document.title}章节`}>{document.sections.map(section => <button key={section.id} className={selectedSection === section.id ? 'selected' : ''} onClick={() => setSelectedSection(section.id)} aria-label={`阅读章节：${section.title}`}>{section.title}</button>)}</nav>}</div>) : <p className="v2p-directory-empty">没有匹配的资料，可调整关键词。</p>}</div><div className="v2p-directory-note"><IconShieldCheck size={15} /><p>只展示已提供的演示资料。当前版本不提供上传或编辑功能。</p></div></aside>
      {current && <section ref={reader} className="v2-card v2p-knowledge-reader" role="region" aria-label="知识原文"><header className="v2p-reader-header"><div><StatusBadge tone="blue">{current.category}</StatusBadge><h2>{current.title}</h2><p>{current.summary}</p></div><div className="v2p-document-version"><strong>{current.version}</strong><span>生效 {current.effectiveDate}</span></div></header><div className="v2p-source-label"><IconShieldCheck size={16} /><span>{current.sourceLabel}</span></div>{focus?.knowledgeId === current.id && focus?.sectionId && <p className="v2p-citation-context"><IconBook2 size={15} />已定位到引用章节。</p>}<div className="v2p-reader-sections">{current.sections.map(section => <section key={section.id} data-section-id={section.id} className={selectedSection === section.id ? 'v2p-highlighted-section' : ''}><div>{selectedSection === section.id && <StatusBadge tone="blue">当前章节</StatusBadge>}<h3>{section.title}</h3></div><p><HighlightText text={section.content} quote={selectedSection === section.id ? quote : undefined} /></p></section>)}</div><footer className="v2p-reader-footer"><IconFileText size={16} /><span>全文来自演示资料，不代表命题企业的真实制度或实际作业要求。</span></footer></section>}
    </div>}
  </div>;
}

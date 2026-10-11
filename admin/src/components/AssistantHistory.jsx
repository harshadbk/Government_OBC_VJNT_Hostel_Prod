import { Fragment, useCallback, useEffect, useState } from 'react';
import { FiRefreshCw, FiTrash2, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import MarkdownMessage from './MarkdownMessage';
import toast from '../utils/toast';
import {
  clearHistory,
  deleteHistoryEntry,
  fetchHistory,
  fetchHistoryEntry,
  fetchHistoryStats,
  formatDateTime,
  formatDuration,
} from '../utils/assistantApi';

const PAGE_SIZE = 20;

export default function AssistantHistory({ onAskAgain }) {
  const [filters, setFilters] = useState({ search: '', status: '', tool: '', date_from: '', date_to: '' });
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ items: [], total: 0 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, summary] = await Promise.all([
        fetchHistory({ ...filters, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
        fetchHistoryStats(14),
      ]);
      setData(list);
      setStats(summary);
    } catch (err) {
      setError('Could not load history. Check that the backend server is running and you are logged in.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const setFilter = (key, value) => {
    setPage(0);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const toggle = async (id) => {
    if (openId === id) return setOpenId(null);
    setOpenId(id);
    if (!details[id]) {
      try {
        const res = await fetchHistoryEntry(id);
        setDetails((d) => ({ ...d, [id]: res.item }));
      } catch {
        setDetails((d) => ({ ...d, [id]: { error: 'Could not load this entry.' } }));
      }
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this entry from history?')) return;
    try {
      await deleteHistoryEntry(id);
      toast.success('History entry deleted.');
    } catch {
      toast.error('Could not delete this entry.');
    }
    load();
  };

  const clearAll = async () => {
    if (!window.confirm('Delete the entire assistant history? This cannot be undone.')) return;
    try {
      const res = await clearHistory();
      toast.success(`Cleared ${res.deleted} history entries.`);
    } catch {
      toast.error('Could not clear the history.');
    }
    setPage(0);
    load();
  };

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const maxDay = Math.max(1, ...(stats?.per_day || []).map((d) => d.total));

  return (
    <div className="ah">
      {stats && (
        <div className="ah-stats">
          <div><span>Total questions</span><strong>{stats.total}</strong></div>
          <div><span>Today</span><strong>{stats.today}</strong></div>
          <div><span>Success rate</span><strong>{stats.success_rate == null ? '-' : `${stats.success_rate}%`}</strong></div>
          <div><span>Avg. response</span><strong>{formatDuration(stats.avg_duration_ms)}</strong></div>
          <div className="ah-chart" title="Questions per day (last 14 days)">
            <span>Last 14 days</span>
            <div className="ah-bars">
              {stats.per_day.map((d) => (
                <i
                  key={d.date}
                  style={{ height: `${Math.max(4, (d.total / maxDay) * 100)}%` }}
                  className={d.total ? '' : 'empty'}
                  title={`${d.date}: ${d.total} questions, ${d.errors} failed`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="ah-filters">
        <input
          type="search"
          placeholder="Search questions or answers"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
        />
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">All results</option>
          <option value="success">Answered</option>
          <option value="error">Failed</option>
        </select>
        <select value={filters.tool} onChange={(e) => setFilter('tool', e.target.value)}>
          <option value="">Any tool</option>
          {(stats?.top_tools || []).map((t) => (
            <option key={t.tool} value={t.tool}>{t.tool} ({t.count})</option>
          ))}
        </select>
        <label>From <input type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} /></label>
        <label>To <input type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} /></label>
        <button className="secondary-btn" onClick={load} disabled={loading} title="Refresh"><FiRefreshCw /></button>
        <button className="secondary-btn danger" onClick={clearAll} disabled={!data.total}>Clear all</button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="ah-table-wrap">
        <table className="ah-table">
          <thead>
            <tr>
              <th aria-label="Expand" />
              <th>Question</th>
              <th>Tools</th>
              <th>Status</th>
              <th>Time taken</th>
              <th>Asked</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {!loading && data.items.length === 0 && (
              <tr><td colSpan={7} className="ah-empty">No history yet.</td></tr>
            )}
            {data.items.map((item) => {
              const open = openId === item.id;
              const full = details[item.id];
              return (
                <Fragment key={item.id}>
                  <tr className={open ? 'open' : ''} onClick={() => toggle(item.id)}>
                    <td className="ah-caret">{open ? <FiChevronDown /> : <FiChevronRight />}</td>
                    <td className="ah-question">
                      {item.question}
                      {item.admin_user && <small>by {item.admin_user}</small>}
                    </td>
                    <td>{item.tool_count ? item.tools_used.map((t) => t.tool).join(', ') : <span className="muted">none</span>}</td>
                    <td><span className={`ah-status ${item.success ? 'ok' : 'fail'}`}>{item.success ? 'Answered' : 'Failed'}</span></td>
                    <td>{formatDuration(item.duration_ms)}</td>
                    <td className="nowrap">{formatDateTime(item.created_at)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="table-action" onClick={() => remove(item.id)} title="Delete"><FiTrash2 /></button>
                    </td>
                  </tr>
                  {open && (
                    <tr className="ah-detail">
                      <td />
                      <td colSpan={6}>
                        {!full ? (
                          <p className="muted">Loading…</p>
                        ) : full.error && !full.id ? (
                          <p className="form-error">{full.error}</p>
                        ) : (
                          <>
                            <h5>Answer</h5>
                            <div className="ah-answer"><MarkdownMessage content={full.answer || '(empty)'} /></div>
                            {(full.error || full.groq_error) && (
                              <>
                                <h5>Error</h5>
                                <pre>{[full.error, full.groq_error].filter(Boolean).join('\n')}</pre>
                              </>
                            )}
                            {full.tools_used.length > 0 && (
                              <>
                                <h5>Tool calls</h5>
                                <ol className="ah-tools">
                                  {full.tools_used.map((t, i) => (
                                    <li key={i}>
                                      <code>{t.tool}</code>
                                      {t.rows != null && <span className="muted"> · {t.rows} rows</span>}
                                      {t.ok === false && <span className="ah-status fail">failed</span>}
                                      <pre>{JSON.stringify(t.arguments, null, 2)}</pre>
                                    </li>
                                  ))}
                                </ol>
                              </>
                            )}
                            <p className="ah-meta">
                              Source: {full.source || '-'} · Session: {full.session_id || '-'} · {new Date(full.created_at).toLocaleString()}
                            </p>
                            {onAskAgain && (
                              <button className="secondary-btn" onClick={() => onAskAgain(full.question)}>Ask again</button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ah-pager">
        <span className="muted">{data.total} entries</span>
        <button className="secondary-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
        <span>Page {page + 1} of {pages}</span>
        <button className="secondary-btn" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}

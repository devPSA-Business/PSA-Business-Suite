import { logger } from '@lib/logger';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DIContainer } from '@infrastructure/di/Container';
import { Search, Filter, ArrowUpDown, User, Activity, Calendar } from 'lucide-react';

export function AuditLogViewer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async (pageNum: number) => {
    try {
      const newLogs = await DIContainer.reportQuery.getAuditLogs(pageNum, 50);
      if (pageNum === 0) {
        setLogs(newLogs);
      } else {
        setLogs(prev => [...prev, ...newLogs]);
      }
      setHasNextPage(newLogs.length === 50);
    } catch (error) {
      logger.error('Failed to fetch logs:', error);
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  };

  useEffect(() => {
    fetchLogs(0);
  }, []);

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(l => l.action));
    return Array.from(actions).sort();
  }, [logs]);

  const uniqueUsers = useMemo(() => {
    const users = new Set(logs.map(l => l.user));
    return Array.from(users).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    const result = logs.filter(log => {
      const matchesSearch = 
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = !filterAction || log.action === filterAction;
      const matchesUser = !filterUser || log.user === filterUser;

      let matchesDate = true;
      const logDate = new Date(log.timestamp);
      logDate.setHours(0, 0, 0, 0);

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (logDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (logDate > end) matchesDate = false;
      }

      return matchesSearch && matchesAction && matchesUser && matchesDate;
    });

    return result.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [logs, searchTerm, filterAction, filterUser, startDate, endDate, sortOrder]);

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? filteredLogs.length + 1 : filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    const [lastItem] = [...virtualItems].reverse();
    if (!lastItem) return;

    if (
      lastItem.index >= filteredLogs.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage &&
      searchTerm === '' && filterAction === '' && filterUser === '' && startDate === '' && endDate === '' // Only fetch more if not filtering
    ) {
      setIsFetchingNextPage(true);
      setPage(p => {
        const nextPage = p + 1;
        fetchLogs(nextPage);
        return nextPage;
      });
    }
  }, [
    virtualItems,
    hasNextPage,
    isFetchingNextPage,
    filteredLogs.length,
    searchTerm,
    filterAction,
    filterUser,
    startDate,
    endDate
  ]);

  if (isLoading && page === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-3 animate-pulse">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-stone-200 shrink-0"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-stone-200 rounded-md w-24"></div>
                  <div className="h-3 bg-stone-200 rounded-md w-32"></div>
                </div>
              </div>
            </div>
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 mt-auto space-y-2">
              <div className="h-3 bg-stone-200 rounded-md w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari detail log..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-brand-900/20 focus:border-brand-900 outline-none transition-all"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto bg-stone-50 p-2 sm:p-0 rounded-xl sm:bg-transparent sm:rounded-none border border-stone-200 sm:border-none">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2.5 rounded-xl border-none sm:border sm:border-stone-200 bg-transparent sm:bg-stone-50 text-sm font-medium text-stone-700 outline-none focus:ring-2 focus:ring-brand-900/20 w-full sm:w-auto"
                title="Tanggal Mulai"
              />
              <span className="text-stone-400 hidden sm:inline">-</span>
              <div className="h-px bg-stone-200 w-full sm:hidden my-1"></div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2.5 rounded-xl border-none sm:border sm:border-stone-200 bg-transparent sm:bg-stone-50 text-sm font-medium text-stone-700 outline-none focus:ring-2 focus:ring-brand-900/20 w-full sm:w-auto"
                title="Tanggal Akhir"
              />
            </div>

            <div className="relative w-full sm:w-auto flex-1 sm:flex-none">
              <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm font-medium text-stone-700 outline-none focus:ring-2 focus:ring-brand-900/20 appearance-none cursor-pointer"
              >
                <option value="">Semua Aksi</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-auto flex-1 sm:flex-none">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm font-medium text-stone-700 outline-none focus:ring-2 focus:ring-brand-900/20 appearance-none cursor-pointer"
              >
                <option value="">Semua User</option>
                {uniqueUsers.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm font-bold text-stone-700 hover:bg-stone-100 transition-all"
            >
              <ArrowUpDown size={16} className="text-stone-400" />
              {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}
            </button>
          </div>
        </div>
      </div>
      
      {filteredLogs.length === 0 && !isLoading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-12 text-center">
          <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📝</span>
          </div>
          <h3 className="text-stone-800 font-medium text-lg mb-1">Log tidak ditemukan</h3>
          <p className="text-stone-400 text-sm">Coba ubah filter atau kata kunci pencarian Anda.</p>
        </div>
      ) : (
        <div 
          ref={parentRef} 
          className="h-[600px] overflow-auto rounded-2xl border border-stone-200 bg-stone-50/30 p-4"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const isLoaderRow = virtualRow.index > filteredLogs.length - 1;
              const log = filteredLogs[virtualRow.index];

              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: '16px',
                  }}
                >
                  {isLoaderRow ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-900"></div>
                    </div>
                  ) : (
                    <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-3 h-full group">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500 font-bold text-sm shrink-0 group-hover:bg-brand-50 group-hover:text-brand-900 transition-colors">
                            {log.user.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-stone-800 text-sm">{log.user}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-medium">
                              <Calendar size={10} />
                              {new Intl.DateTimeFormat('id-ID', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }).format(new Date(log.timestamp))}
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 ml-2 ${
                          log.action.includes('DELETE') || log.action.includes('VOID') 
                            ? 'bg-red-50 text-red-600' 
                            : log.action.includes('CREATE') || log.action.includes('SUCCESS')
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-stone-100 text-stone-600'
                        }`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 mt-auto group-hover:bg-white transition-colors">
                        <p className="text-xs text-stone-600 leading-relaxed font-medium">
                          {log.details}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

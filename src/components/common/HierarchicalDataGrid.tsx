import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Search,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RotateCcw,
  Check
} from 'lucide-react';
import { cn } from '@/lib/cn';

export interface DataGridColumn<T> {
  id: string;
  header: string;
  accessor: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  sortValue?: (item: T) => number | string;
  sticky?: 'left' | 'right';
  className?: string;
  hideOnMobile?: boolean;
}

export interface DataGridColumnGroup<T> {
  id: string;
  title: string;
  description?: string;
  badge?: string;
  badgeColor?: string;
  columns: DataGridColumn<T>[];
  defaultVisible?: boolean;
}

export interface HierarchicalDataGridProps<T> {
  data: T[];
  groups: DataGridColumnGroup<T>[];
  rowKey: (item: T) => string;
  renderExpandedRow?: (item: T) => React.ReactNode;
  renderMobileCard?: (item: T, isExpanded: boolean, onToggleExpand: () => void) => React.ReactNode;
  onRowClick?: (item: T) => void;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  filterControls?: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  emptyState?: React.ReactNode;
  defaultSort?: { columnId: string; direction: 'asc' | 'desc' };
  pageSize?: number;
  className?: string;
}

export function HierarchicalDataGrid<T>({
  data,
  groups,
  rowKey,
  renderExpandedRow,
  renderMobileCard,
  onRowClick,
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  searchFilter,
  filterControls,
  title,
  subtitle,
  actions,
  emptyState,
  defaultSort,
  pageSize = 15,
  className
}: HierarchicalDataGridProps<T>) {
  // State for search query
  const [searchQuery, setSearchQuery] = useState('');

  // State for expanded rows (Set of row IDs)
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  // State for visible column groups (all default to true or group.defaultVisible)
  const [visibleGroupIds, setVisibleGroupIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    groups.forEach(g => {
      if (g.defaultVisible !== false) {
        initial.add(g.id);
      }
    });
    return initial;
  });

  // State for column group dropdown menu
  const [showGroupSelector, setShowGroupSelector] = useState(false);

  // State for sorting
  const [sortState, setSortState] = useState<{ columnId: string; direction: 'asc' | 'desc' } | null>(
    defaultSort || null
  );

  // Filter visible groups & their columns
  const activeGroups = useMemo(() => {
    return groups.filter(g => visibleGroupIds.has(g.id));
  }, [groups, visibleGroupIds]);

  const activeColumns = useMemo(() => {
    const cols: Array<DataGridColumn<T> & { groupId: string }> = [];
    activeGroups.forEach(g => {
      g.columns.forEach(c => {
        cols.push({ ...c, groupId: g.id });
      });
    });
    return cols;
  }, [activeGroups]);

  // Filter data by search query
  const searchedData = useMemo(() => {
    if (!searchQuery.trim() || !searchFilter) return data;
    const q = searchQuery.trim().toLowerCase();
    return data.filter(item => searchFilter(item, q));
  }, [data, searchQuery, searchFilter]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortState) return searchedData;
    const { columnId, direction } = sortState;

    // Find column
    let targetCol: DataGridColumn<T> | undefined;
    for (const g of groups) {
      targetCol = g.columns.find(c => c.id === columnId);
      if (targetCol) break;
    }

    if (!targetCol || !targetCol.sortValue) return searchedData;

    const sortFn = targetCol.sortValue;
    return [...searchedData].sort((a, b) => {
      const valA = sortFn(a);
      const valB = sortFn(b);
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [searchedData, sortState, groups]);

  // Toggle single row expand
  const toggleRowExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle all rows expand
  const toggleExpandAll = () => {
    if (expandedRowIds.size === sortedData.length) {
      setExpandedRowIds(new Set());
    } else {
      setExpandedRowIds(new Set(sortedData.map(rowKey)));
    }
  };

  // Toggle column group visibility
  const toggleGroupVisibility = (groupId: string) => {
    setVisibleGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        // Prevent hiding all groups
        if (next.size > 1) next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Handle column header sort click
  const handleSortClick = (column: DataGridColumn<T>) => {
    if (!column.sortable) return;
    setSortState(prev => {
      if (prev?.columnId === column.id) {
        if (prev.direction === 'asc') return { columnId: column.id, direction: 'desc' };
        return null; // Reset to unsorted
      }
      return { columnId: column.id, direction: 'asc' };
    });
  };

  return (
    <div className={cn('rounded-2xl bg-white border border-ink-200/90 shadow-sm overflow-hidden flex flex-col', className)}>
      {/* Top Action & Filter Toolbar */}
      <div className="p-3.5 sm:p-4 border-b border-ink-100 bg-ink-50/40 flex items-center justify-between gap-3 flex-wrap">
        {/* Title & Subtitle or Search */}
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          {title && (
            <div className="mr-2">
              <h3 className="text-sm sm:text-base font-extrabold text-ink-900 tracking-tight">{title}</h3>
              {subtitle && <p className="text-[11px] text-ink-500 font-medium">{subtitle}</p>}
            </div>
          )}

          {searchFilter && (
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs py-1.5 pl-8 pr-3 rounded-lg border border-ink-200 bg-white placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-sans"
              />
            </div>
          )}
        </div>

        {/* Custom Filters + Column Group Toggle + Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {filterControls}

          {/* Column Group Toggle Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowGroupSelector(!showGroupSelector)}
              className={cn(
                'btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5 transition-all',
                visibleGroupIds.size < groups.length && 'border-brand-500 text-brand-700 bg-brand-50/50'
              )}
              title="Tùy chỉnh nhóm cột hiển thị"
            >
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">Nhóm Cột ({visibleGroupIds.size}/{groups.length})</span>
              <ChevronDown size={12} className={cn('transition-transform', showGroupSelector && 'rotate-180')} />
            </button>

            {/* Dropdown Menu */}
            {showGroupSelector && (
              <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-white border border-ink-200 shadow-xl z-50 p-2 space-y-1 animate-fade-in-up text-xs font-sans">
                <div className="px-2 py-1 border-b border-ink-100 flex items-center justify-between text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                  <span>Ẩn / Hiện Nhóm Cột</span>
                  <button
                    onClick={() => setVisibleGroupIds(new Set(groups.map(g => g.id)))}
                    className="text-brand-600 hover:text-brand-700 font-normal normal-case"
                  >
                    Hiện tất cả
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 pt-1">
                  {groups.map(group => {
                    const isVisible = visibleGroupIds.has(group.id);
                    return (
                      <button
                        key={group.id}
                        onClick={() => toggleGroupVisibility(group.id)}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors',
                          isVisible ? 'bg-brand-50/60 text-brand-900 font-bold' : 'text-ink-500 hover:bg-ink-50'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn('w-4 h-4 rounded flex items-center justify-center text-[10px] border', isVisible ? 'bg-brand-600 border-brand-600 text-white' : 'border-ink-300')}>
                            {isVisible && <Check size={11} />}
                          </span>
                          <span>{group.title}</span>
                        </div>
                        <span className="text-[10px] text-ink-400 font-mono">({group.columns.length} cột)</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Expand/Collapse All */}
          {renderExpandedRow && (
            <button
              onClick={toggleExpandAll}
              className="btn btn-secondary text-xs py-1.5 px-2 text-ink-600 hover:text-ink-900 hidden sm:flex items-center gap-1"
              title={expandedRowIds.size === sortedData.length ? 'Thu gọn tất cả' : 'Mở rộng tất cả dòng'}
            >
              {expandedRowIds.size === sortedData.length ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span className="hidden md:inline">
                {expandedRowIds.size === sortedData.length ? 'Thu gọn' : 'Mở tất cả'}
              </span>
            </button>
          )}

          {actions}
        </div>
      </div>

      {/* Main Table: Desktop & Tablet */}
      <div className="hidden md:block overflow-x-auto relative">
        <table className="w-full text-xs text-left border-collapse">
          {/* Level 1: Grouped Column Headers */}
          <thead>
            <tr className="border-b border-ink-200 bg-ink-100/70 text-ink-600 font-mono text-[10px] uppercase tracking-wider">
              {renderExpandedRow && (
                <th className="w-9 py-2 px-2 text-center sticky left-0 bg-ink-100/90 z-20 border-r border-ink-200" />
              )}

              {activeGroups.map((group, gIdx) => (
                <th
                  key={group.id}
                  colSpan={group.columns.length}
                  className={cn(
                    'py-2 px-3.5 font-extrabold text-ink-800 text-center border-r border-ink-200 last:border-r-0',
                    gIdx % 2 === 0 ? 'bg-ink-100/90' : 'bg-brand-50/50 text-brand-900'
                  )}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>{group.title}</span>
                    {group.badge && (
                      <span className={cn('badge text-[9px] px-1 py-0 rounded', group.badgeColor || 'bg-brand-100 text-brand-800 border-brand-200')}>
                        {group.badge}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>

            {/* Level 2: Individual Sub-Column Headers */}
            <tr className="border-b border-ink-200/80 bg-ink-50/90 text-ink-600 font-sans font-bold text-[11px]">
              {renderExpandedRow && (
                <th className="w-9 py-2.5 px-2 text-center sticky left-0 bg-ink-50/90 z-20 border-r border-ink-200" />
              )}

              {activeColumns.map((col, cIdx) => {
                const isSorted = sortState?.columnId === col.id;
                const isStickyLeft = col.sticky === 'left';

                return (
                  <th
                    key={col.id}
                    style={{ width: col.width }}
                    onClick={() => handleSortClick(col)}
                    className={cn(
                      'py-2.5 px-3.5 transition-colors select-none font-bold',
                      col.sortable && 'cursor-pointer hover:bg-ink-100/90 hover:text-ink-900',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      isStickyLeft && 'sticky left-9 z-20 bg-ink-50/90 border-r border-ink-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]',
                      col.className
                    )}
                  >
                    <div className={cn('inline-flex items-center gap-1.5', col.align === 'right' && 'justify-end')}>
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-ink-400">
                          {isSorted ? (
                            sortState.direction === 'asc' ? (
                              <ArrowUp size={11} className="text-brand-600 font-bold" />
                            ) : (
                              <ArrowDown size={11} className="text-brand-600 font-bold" />
                            )
                          ) : (
                            <ArrowUpDown size={10} className="opacity-40 group-hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-ink-100 font-sans text-ink-800">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length + (renderExpandedRow ? 1 : 0)} className="py-12 text-center text-ink-400">
                  {emptyState || (
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-ink-700">Không tìm thấy bản ghi phù hợp</p>
                      <p className="text-xs text-ink-400">Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              sortedData.map((item, rowIdx) => {
                const id = rowKey(item);
                const isExpanded = expandedRowIds.has(id);

                return (
                  <React.Fragment key={id}>
                    {/* Primary Row */}
                    <tr
                      onClick={() => onRowClick ? onRowClick(item) : toggleRowExpand(id)}
                      className={cn(
                        'transition-colors group hover:bg-ink-50/70',
                        isExpanded ? 'bg-brand-50/30 font-medium' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-ink-50/20',
                        onRowClick && 'cursor-pointer'
                      )}
                    >
                      {/* Expand Toggle Chevron Column */}
                      {renderExpandedRow && (
                        <td
                          className="w-9 py-3 px-2 text-center sticky left-0 z-10 bg-inherit border-r border-ink-100"
                          onClick={(e) => toggleRowExpand(id, e)}
                        >
                          <button
                            type="button"
                            className={cn(
                              'w-6 h-6 rounded-md flex items-center justify-center text-ink-400 hover:text-brand-600 hover:bg-brand-100/50 transition-all mx-auto',
                              isExpanded && 'bg-brand-100 text-brand-700 rotate-90'
                            )}
                            title={isExpanded ? 'Thu gọn dòng' : 'Mở rộng chi tiết dòng'}
                          >
                            <ChevronRight size={13} className="transition-transform duration-200" />
                          </button>
                        </td>
                      )}

                      {/* Data Columns */}
                      {activeColumns.map((col) => {
                        const isStickyLeft = col.sticky === 'left';

                        return (
                          <td
                            key={col.id}
                            className={cn(
                              'py-3 px-3.5 align-middle',
                              col.align === 'right' && 'text-right font-mono',
                              col.align === 'center' && 'text-center',
                              isStickyLeft && 'sticky left-9 z-10 bg-inherit border-r border-ink-100 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] font-bold',
                              col.className
                            )}
                          >
                            {col.accessor(item)}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Nested Expandable Row Container */}
                    {renderExpandedRow && isExpanded && (
                      <tr className="bg-ink-50/80 border-b border-brand-200/80">
                        <td colSpan={activeColumns.length + 1} className="p-0">
                          <div className="p-4 sm:p-5 border-l-4 border-brand-500 bg-white/80 space-y-3 animate-fade-in-up">
                            {renderExpandedRow(item)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout (< 768px) */}
      <div className="md:hidden divide-y divide-ink-100">
        {sortedData.length === 0 ? (
          <div className="p-8 text-center text-ink-400">
            {emptyState || 'Không có dữ liệu phù hợp'}
          </div>
        ) : (
          sortedData.map((item) => {
            const id = rowKey(item);
            const isExpanded = expandedRowIds.has(id);

            if (renderMobileCard) {
              return (
                <div key={id} className="p-3.5 space-y-2.5">
                  {renderMobileCard(item, isExpanded, () => toggleRowExpand(id))}
                  {renderExpandedRow && isExpanded && (
                    <div className="pt-2 border-t border-ink-200/80 mt-2 space-y-2">
                      {renderExpandedRow(item)}
                    </div>
                  )}
                </div>
              );
            }

            // Fallback default mobile card
            return (
              <div key={id} className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-ink-900 text-xs">{id}</span>
                  {renderExpandedRow && (
                    <button
                      onClick={() => toggleRowExpand(id)}
                      className="text-xs text-brand-600 font-semibold flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Đóng' : 'Chi tiết'}</span>
                      <ChevronRight size={12} className={cn('transition-transform', isExpanded && 'rotate-90')} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {activeColumns.slice(0, 4).map((col) => (
                    <div key={col.id}>
                      <span className="text-[10px] text-ink-400 block">{col.header}:</span>
                      <div className="font-medium text-ink-800">{col.accessor(item)}</div>
                    </div>
                  ))}
                </div>

                {renderExpandedRow && isExpanded && (
                  <div className="pt-2 border-t border-ink-100 mt-2 space-y-2">
                    {renderExpandedRow(item)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Total Counter Strip */}
      <div className="p-2.5 sm:p-3 bg-ink-50/80 border-t border-ink-100 text-[11px] text-ink-500 font-mono flex items-center justify-between flex-wrap gap-2">
        <div>
          Hiển thị <strong className="text-ink-900">{sortedData.length}</strong> bản ghi
          {searchQuery && ` (lọc từ ${data.length})`}
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="badge bg-ink-200 text-ink-700 border-ink-300">
            {activeGroups.length} Nhóm Cột Đang Bật
          </span>
          <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300">
            {activeColumns.length} Cột Dữ Liệu
          </span>
        </div>
      </div>
    </div>
  );
}

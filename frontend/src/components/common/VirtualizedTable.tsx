import React, { useRef, useEffect, useState } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { Loader2 } from 'lucide-react';

interface VirtualizedTableProps<T> {
  data: T[];
  rowHeight?: number;
  height?: number;
  overscanCount?: number;
  renderRow: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * Virtualized table component for rendering large lists efficiently
 * Uses react-window for virtual scrolling to minimize DOM nodes
 */
export function VirtualizedTable<T>({
  data,
  rowHeight = 80,
  height = 600,
  overscanCount = 5,
  renderRow,
  loading = false,
  emptyMessage = 'No data available',
  className = '',
}: VirtualizedTableProps<T>) {
  const listRef = useRef<List>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Row renderer for react-window
  const Row = ({ index, style }: ListChildComponentProps) => {
    const item = data[index];
    return renderRow(item, index, style);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-[var(--text-sub)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      <List
        ref={listRef}
        height={height}
        itemCount={data.length}
        itemSize={rowHeight}
        width={containerWidth || '100%'}
        overscanCount={overscanCount}
      >
        {Row}
      </List>
    </div>
  );
}

/**
 * Example usage:
 * 
 * <VirtualizedTable
 *   data={attendanceRecords}
 *   rowHeight={80}
 *   height={600}
 *   renderRow={(record, index, style) => (
 *     <div key={record.id} style={style} className="border-b p-4">
 *       <div>{record.employeeName}</div>
 *       <div>{record.checkInTime}</div>
 *     </div>
 *   )}
 *   loading={isLoading}
 *   emptyMessage="No attendance records found"
 * />
 */

export default VirtualizedTable;


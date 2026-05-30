"use client";

import { memo, useCallback, useRef, useState, useEffect } from "react";
import { useVirtualScroll } from "@/lib/performance-hooks";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

/**
 * Virtual scrolling component for rendering large lists efficiently.
 * Only renders visible items to improve performance.
 * Memoized to prevent unnecessary re-renders.
 */
const VirtualList = memo(function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = "",
  overscan = 3,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { startIndex, endIndex, offsetY } = useVirtualScroll(
    items.length,
    itemHeight,
    containerHeight,
    scrollTop,
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop);
  }, []);

  const visibleItems = items.slice(
    Math.max(0, startIndex - overscan),
    Math.min(items.length, endIndex + overscan),
  );

  const visibleStartIndex = Math.max(0, startIndex - overscan);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: "relative" }}>
        <div
          style={{
            transform: `translateY(${(visibleStartIndex * itemHeight + offsetY) - (startIndex * itemHeight)}px)`,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={visibleStartIndex + index}
              style={{ height: itemHeight, overflow: "hidden" }}
            >
              {renderItem(item, visibleStartIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default VirtualList;

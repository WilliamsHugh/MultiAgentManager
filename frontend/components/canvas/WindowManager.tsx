/**
 * WindowManager — Hook quản lý floating windows state
 * 
 * Quản lý:
 * - Vị trí (x, y) của từng window
 * - Kích thước (width, height)
 * - Z-index stacking (focus → bring to front)
 * - Cascade khi tạo window mới
 * - Drag & resize với RAF-throttling
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { WindowState } from './FloatingWindow';

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 320;
const CASCADE_OFFSET = 28;
const MAX_CASCADE = 8;

interface UseWindowManagerReturn {
  windows: WindowState[];
  activeTaskId: string | null;
  openWindow: (taskId: string) => void;
  closeWindow: (taskId: string) => void;
  focusWindow: (taskId: string) => void;
  minimizeWindow: (taskId: string) => void;
  maximizeWindow: (taskId: string) => void;
  startDrag: (e: React.MouseEvent, taskId: string) => void;
  startResize: (e: React.MouseEvent, taskId: string) => void;
}

export function useWindowManager(): UseWindowManagerReturn {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [nextZIndex, setNextZIndex] = useState(10);

  // Drag state
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    type: 'drag' | 'resize';
    origW?: number;
    origH?: number;
  } | null>(null);

  // RAF-throttled handler
  useEffect(() => {
    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        const dr = dragRef.current;
        if (!dr) return;

        setWindows((prev) =>
          prev.map((w) => {
            if (w.taskId !== dr.id) return w;

            if (dr.type === 'drag') {
              return {
                ...w,
                x: Math.max(0, dr.origX + dx),
                y: Math.max(0, dr.origY + dy),
              };
            } else {
              // Resize
              const newW = Math.max(320, (dr.origW || w.width) + dx);
              const newH = Math.max(200, (dr.origH || w.height) + dy);
              return { ...w, width: newW, height: newH };
            }
          })
        );
      });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const bringToFront = useCallback((taskId: string) => {
    setNextZIndex((z) => z + 1);
    setWindows((prev) => {
      const maxZ = Math.max(...prev.map((w) => w.zIndex), 0);
      return prev.map((w) =>
        w.taskId === taskId ? { ...w, zIndex: maxZ + 1 } : w
      );
    });
    setActiveTaskId(taskId);
  }, []);

  const openWindow = useCallback(
    (taskId: string) => {
      const existing = windows.find((w) => w.taskId === taskId);
      if (existing) {
        bringToFront(taskId);
        return;
      }

      const offset = (windows.length % MAX_CASCADE) * CASCADE_OFFSET;
      const newWindow: WindowState = {
        taskId,
        x: 40 + offset,
        y: 40 + offset,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        zIndex: nextZIndex,
        minimized: false,
      };

      setNextZIndex((z) => z + 1);
      setWindows((prev) => [...prev, newWindow]);
      setActiveTaskId(taskId);
    },
    [windows, nextZIndex, bringToFront]
  );

  const closeWindow = useCallback(
    (taskId: string) => {
      setWindows((prev) => prev.filter((w) => w.taskId !== taskId));
      setActiveTaskId((prev) => (prev === taskId ? null : prev));
    },
    []
  );

  const focusWindow = useCallback(
    (taskId: string) => {
      bringToFront(taskId);
    },
    [bringToFront]
  );

  const minimizeWindow = useCallback((taskId: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.taskId === taskId ? { ...w, minimized: !w.minimized } : w
      )
    );
  }, []);

  const maximizeWindow = useCallback((taskId: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.taskId !== taskId) return w;
        // Toggle between maximized (full viewport) and normal
        if (w.width === window.innerWidth - 80 && w.height === window.innerHeight - 80) {
          return { ...w, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, x: 40, y: 40 };
        }
        return {
          ...w,
          x: 0,
          y: 0,
          width: window.innerWidth - 40,
          height: window.innerHeight - 40,
        };
      })
    );
  }, []);

  const startDrag = useCallback(
    (e: React.MouseEvent, taskId: string) => {
      e.preventDefault();
      bringToFront(taskId);
      const win = windows.find((w) => w.taskId === taskId);
      if (!win) return;

      dragRef.current = {
        id: taskId,
        startX: e.clientX,
        startY: e.clientY,
        origX: win.x,
        origY: win.y,
        type: 'drag',
      };
    },
    [windows, bringToFront]
  );

  const startResize = useCallback(
    (e: React.MouseEvent, taskId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const win = windows.find((w) => w.taskId === taskId);
      if (!win) return;

      dragRef.current = {
        id: taskId,
        startX: e.clientX,
        startY: e.clientY,
        origX: win.x,
        origY: win.y,
        origW: win.width,
        origH: win.height,
        type: 'resize',
      };
    },
    [windows]
  );

  return {
    windows,
    activeTaskId,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    maximizeWindow,
    startDrag,
    startResize,
  };
}

export default useWindowManager;

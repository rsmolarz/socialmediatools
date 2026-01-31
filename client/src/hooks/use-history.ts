import { useState, useCallback, useRef } from "react";

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseHistoryOptions<T> {
  initialState: T;
  maxHistorySize?: number;
}

interface UseHistoryReturn<T> {
  state: T;
  setState: (newState: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
  reset: (newInitialState?: T) => void;
  historySize: number;
  futureSize: number;
}

export function useHistory<T>({
  initialState,
  maxHistorySize = 50,
}: UseHistoryOptions<T>): UseHistoryReturn<T> {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const initialStateRef = useRef(initialState);

  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      setHistory((prev) => {
        const resolvedState =
          typeof newState === "function"
            ? (newState as (prev: T) => T)(prev.present)
            : newState;

        if (JSON.stringify(resolvedState) === JSON.stringify(prev.present)) {
          return prev;
        }

        const newPast = [...prev.past, prev.present].slice(-maxHistorySize);

        return {
          past: newPast,
          present: resolvedState,
          future: [],
        };
      });
    },
    [maxHistorySize]
  );

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;

      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];
      const newFuture = prev.future.slice(1);

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const clear = useCallback(() => {
    setHistory((prev) => ({
      past: [],
      present: prev.present,
      future: [],
    }));
  }, []);

  const reset = useCallback(
    (newInitialState?: T) => {
      const resetState = newInitialState ?? initialStateRef.current;
      setHistory({
        past: [],
        present: resetState,
        future: [],
      });
    },
    []
  );

  return {
    state: history.present,
    setState,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    clear,
    reset,
    historySize: history.past.length,
    futureSize: history.future.length,
  };
}

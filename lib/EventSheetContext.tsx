import { createContext, useContext, useRef, useState, ReactNode, useCallback } from 'react';
import { EventSummary } from '@/components/EventBottomSheet';

type PanFn = (lat: number, lng: number) => void;

type EventSheetContextType = {
  selectedEvent: EventSummary | null;
  selectedEventId: string | null;
  openSheet: (event: EventSummary & { lat?: number; lng?: number }) => void;
  closeSheet: () => void;
  registerMapPan: (fn: PanFn | null) => void;
};

const EventSheetContext = createContext<EventSheetContextType>({
  selectedEvent: null,
  selectedEventId: null,
  openSheet: () => {},
  closeSheet: () => {},
  registerMapPan: () => {},
});

export function EventSheetProvider({ children }: { children: ReactNode }) {
  const [selectedEvent, setSelectedEvent] = useState<EventSummary | null>(null);
  const panMapRef = useRef<PanFn | null>(null);

  const registerMapPan = useCallback((fn: PanFn | null) => {
    panMapRef.current = fn;
  }, []);

  const openSheet = useCallback((event: EventSummary & { lat?: number; lng?: number }) => {
    setSelectedEvent(event);
    if (panMapRef.current && event.lat != null && event.lng != null) {
      panMapRef.current(event.lat, event.lng);
    }
  }, []);

  return (
    <EventSheetContext.Provider
      value={{
        selectedEvent,
        selectedEventId: selectedEvent?.id ?? null,
        openSheet,
        closeSheet: () => setSelectedEvent(null),
        registerMapPan,
      }}
    >
      {children}
    </EventSheetContext.Provider>
  );
}

export function useEventSheet() {
  return useContext(EventSheetContext);
}

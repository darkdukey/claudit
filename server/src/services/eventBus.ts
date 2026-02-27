import { EventEmitter } from 'events';

export interface SessionEvent {
  type: 'session:created' | 'session:updated' | 'session:deleted' | 'session:archived';
  sessionId: string;
}

class EventBus extends EventEmitter {
  emitSessionEvent(event: SessionEvent) {
    this.emit('session', event);
  }

  onSessionEvent(handler: (event: SessionEvent) => void): () => void {
    this.on('session', handler);
    return () => this.off('session', handler);
  }
}

export const eventBus = new EventBus();

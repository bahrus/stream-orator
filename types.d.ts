export interface Options {
    shadowRoot?: 'open' | 'closed';
    noStreaming: boolean;
    rootTag?: string;
}

export interface NewChunkEvent {
    flush: boolean;
    chunk: string;
    chunkBuffer: string[];
}

//export type StreamOratorEvents = 'new-chunk' | 'stream-complete';

export interface Options {
    toShadow: boolean;
    noStreaming: boolean;
}

export interface NewChunkEvent {
    flush: boolean;
    chunk: string;
    chunkBuffer: string[];
}

//export type StreamOratorEvents = 'new-chunk' | 'stream-complete';

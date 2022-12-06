export interface Options {
    toShadow: boolean;
    noStreaming: boolean;
}

export interface NewChunkEvent {
    flush: boolean;
    chunk: string;
}

export type StreamOratorEvents = 'new-chunk' | '';

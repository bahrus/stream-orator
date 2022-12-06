export interface Options {
    toShadow: boolean;
    noStreaming: boolean;
}

export interface NewChunkEvent {
    flush: boolean;
    chunk: string;
}

export type MakeWritableEvents = 'new-chunk';

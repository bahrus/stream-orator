export interface Options {
    shadowRoot?: 'open' | 'closed';
    noStreaming?: boolean;
    rootTag?: string;
    inserts?: Inserts;
    between?: [lhs: string, rhs: string];
}

export interface NewChunkEvent {
    flush: boolean;
    chunk: string;
    chunkBuffer: string[];
}

export interface Inserts {
    before?: string | HTMLTemplateElement,
    after?: string | HTMLTemplateElement,
}

export interface newStreamEvent {
    rootNode: Element | ShadowRoot;
}

//export type StreamOratorEvents = 'new-chunk' | 'stream-complete';

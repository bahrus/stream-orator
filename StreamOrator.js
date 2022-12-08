// Modified from: https://streams.spec.whatwg.org/demos/streaming-element-backpressure.html
// with inspiration from https://jsbin.com/kaposeh/edit?js,output
export const newChunk = 'newChunk';
export const endStream = 'endStream';
export class StreamOrator extends EventTarget {
    target;
    options;
    constructor(target, options) {
        super();
        this.target = target;
        this.options = options;
        this.reset();
    }
    reset() {
        const { target, options } = this;
        const { toShadow } = options;
        let realTarget = target;
        const self = this;
        if (toShadow) {
            if (target.shadowRoot === null)
                target.attachShadow({ mode: 'open' });
            realTarget = target.shadowRoot;
        }
        realTarget.innerHTML = '';
        let idlePromise;
        let charactersWrittenInThisChunk = 0;
        // Sometimes the browser will decide to target 30fps and nothing we do will
        // make it change its mind. To avoid bad behaviour in this case,
        // always target 30fps.
        const MS_PER_FRAME = 1000 / 30;
        // This is dynamically adjusted according to the measured wait time.
        let charactersPerChunk = 4096;
        // Smooth over several frames to avoid overcorrection for outliers.
        let lastFewFrames = [];
        const FRAMES_TO_SMOOTH_OVER = 3;
        const chunkBuffer = [];
        function startNewChunk() {
            idlePromise = new Promise(resolve => {
                window.requestAnimationFrame(resolve);
            });
            charactersWrittenInThisChunk = 0;
        }
        this.target.writable = new WritableStream({
            async write(chunk) {
                const permissionToProceedEvent = {
                    chunk,
                    chunkBuffer,
                    flush: true
                };
                self.dispatchEvent(new CustomEvent(newChunk, {
                    detail: permissionToProceedEvent
                }));
                if (!permissionToProceedEvent.flush) {
                    chunkBuffer.push(chunk);
                    startNewChunk();
                    //I have no idea if this is right.  Needs lots of testing
                    return;
                }
                const chunkBlock = chunkBuffer.join('') + chunk;
                if (idlePromise === undefined) {
                    startNewChunk();
                    await idlePromise;
                    startNewChunk();
                }
                const doc = document.implementation.createHTMLDocument();
                doc.write('<div>');
                realTarget.append(doc.body.firstChild);
                let cursor = 0;
                while (cursor < chunk.length) {
                    const writeCharacters = Math.min(chunk.length - cursor, charactersPerChunk - charactersWrittenInThisChunk);
                    let newString = chunk.substr(cursor, writeCharacters);
                    doc.write(newString);
                    cursor += writeCharacters;
                    charactersWrittenInThisChunk += writeCharacters;
                    if (charactersWrittenInThisChunk === charactersPerChunk) {
                        const timeBeforeWait = performance.now();
                        await idlePromise;
                        const timeElapsed = performance.now() - timeBeforeWait;
                        lastFewFrames.push(timeElapsed);
                        if (lastFewFrames.length > FRAMES_TO_SMOOTH_OVER) {
                            lastFewFrames.shift();
                        }
                        const averageTimeElapsed = lastFewFrames.reduce((acc, val) => acc + val) / lastFewFrames.length;
                        charactersPerChunk = Math.max(256, Math.ceil(charactersPerChunk * MS_PER_FRAME / averageTimeElapsed));
                        startNewChunk();
                    }
                }
            },
        });
    }
    async fetch(href, requestInit) {
        const { target } = this;
        const response = await fetch(href, requestInit);
        if (typeof WritableStream === 'undefined') {
            console.debug('no writable stream');
            const text = await response.text();
            target.innerHTML = text;
        }
        else {
            await response.body
                .pipeThrough(new TextDecoderStream())
                .pipeTo(target.writable);
        }
        this.dispatchEvent(new Event(endStream));
    }
}
export async function streamOrator(href, requestInit, target, options) {
    const writeOptions = options || {
        toShadow: false,
    };
    const mw = new StreamOrator(target, writeOptions);
    mw.fetch(href, requestInit);
}

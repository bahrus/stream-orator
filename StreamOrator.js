export const newChunk = 'newChunk';
export const endStream = 'endStream';
export const beginStream = 'beginStream';
export class StreamOrator extends EventTarget {
    target;
    options;
    constructor(target, options) {
        super();
        this.target = target;
        this.options = options;
        this.reset();
    }
    #sanitize(inserts, key) {
        let str = inserts[key];
        if (str instanceof HTMLTemplateElement)
            return str;
        if (typeof Sanitizer !== undefined) {
            const sanitizer = new Sanitizer();
            str = sanitizer.sanitizeFor("template", str);
        }
        else {
            const templ = document.createElement('template');
            templ.innerHTML = str;
            str = templ;
        }
        inserts[key] = str;
        return str;
    }
    reset() {
        const { target, options } = this;
        const shadowRoot = options?.shadowRoot;
        const rootTag = options?.rootTag || "<div class=stream-orator-wrapper part=stream-orator-wrapper>";
        const inserts = options?.inserts;
        const between = options?.between;
        let rootNode = target;
        const self = this;
        if (shadowRoot !== undefined) {
            if (target.shadowRoot === null)
                target.attachShadow({ mode: shadowRoot });
            rootNode = target.shadowRoot;
        }
        rootNode.innerHTML = '';
        if (inserts !== undefined) {
            let { before, after } = inserts;
            if (before !== undefined) {
                before = this.#sanitize(inserts, 'before');
                rootNode.appendChild(before.content.cloneNode(true));
            }
            if (after !== undefined) {
                after = this.#sanitize(inserts, 'after');
                this.addEventListener(endStream, e => {
                    rootNode.appendChild(after.content.cloneNode(true));
                });
            }
        }
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
        const doc = document.implementation.createHTMLDocument();
        doc.write(rootTag);
        rootNode.append(doc.body.firstChild);
        this.dispatchEvent(new CustomEvent(beginStream, {
            detail: {
                rootNode
            }
        }));
        //   const observer = new MutationObserver(mutations => {
        //     mutations.forEach(({
        //         addedNodes
        //     }) => {
        //         addedNodes.forEach(node => {
        //             console.log({node});                                
        //         });
        //     });
        // });
        // observer.observe(rootNode as Element, {
        //     childList: true,
        //     subtree: true
        // });
        let pastLHS = between === undefined;
        let beforeRHS = true;
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
                let cursor = 0;
                while (cursor < chunk.length) {
                    const writeCharacters = Math.min(chunk.length - cursor, charactersPerChunk - charactersWrittenInThisChunk);
                    let newString = chunk.substr(cursor, writeCharacters);
                    if (between !== undefined) {
                        if (beforeRHS) {
                            if (pastLHS) {
                                const idxRHS = newString.indexOf(between[1]);
                                if (idxRHS === -1) {
                                    doc.write(newString);
                                }
                                else {
                                    doc.write(newString.substring(0, idxRHS));
                                    beforeRHS = false;
                                }
                            }
                            else {
                                const idxLHS = newString.indexOf(between[0]);
                                if (idxLHS > -1) {
                                    const idxRHS = newString.indexOf(between[1], idxLHS + 1);
                                    const start = idxLHS + between[0].length;
                                    if (idxRHS === -1) {
                                        doc.write(newString.substring(start));
                                    }
                                    else {
                                        doc.write(newString.substring(start, idxRHS));
                                    }
                                    pastLHS = true;
                                }
                            }
                        }
                    }
                    else {
                        doc.write(newString);
                    }
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
        const supportsWritableStream = typeof WritableStream !== 'undefined';
        if (!supportsWritableStream)
            console.debug('no writable stream support');
        if (!supportsWritableStream || this.options?.noStreaming /* || (
          navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
          navigator.userAgent &&
          navigator.userAgent.indexOf('CriOS') == -1 &&
          navigator.userAgent.indexOf('FxiOS') == -1)
        */) {
            const { nonStream } = await import('./nonStream.js');
            await nonStream(response, target, this.options);
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
    const mw = new StreamOrator(target, options);
    mw.fetch(href, requestInit);
}

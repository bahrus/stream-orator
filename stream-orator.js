// Modified from: https://streams.spec.whatwg.org/demos/streaming-element-backpressure.html
// with inspiration from https://jsbin.com/kaposeh/edit?js,output
export class MakeWritable {
    constructor(target, options) {
        this.target = target;
        this.options = options;
        this.reset();
    }
    reset() {
        this.target.innerHTML = '';
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
        function startNewChunk() {
            idlePromise = new Promise(resolve => {
                window.requestAnimationFrame(resolve);
            });
            charactersWrittenInThisChunk = 0;
        }
        const options = this.options;
        this.target.writable = new WritableStream({
            async write(chunk) {
                if (idlePromise === undefined) {
                    startNewChunk();
                    await idlePromise;
                    startNewChunk();
                }
                const doc = document.implementation.createHTMLDocument();
                doc.write('<div>');
                document.body.append(doc.body.firstChild);
                let cursor = 0;
                while (cursor < chunk.length) {
                    const writeCharacters = Math.min(chunk.length - cursor, charactersPerChunk - charactersWrittenInThisChunk);
                    let newString = chunk.substr(cursor, writeCharacters);
                    if (options !== undefined && options.filter)
                        newString = options.filter(newString);
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
}
export async function streamOrator(href, requestInit, target, options) {
    const response = await fetch(href, requestInit);
    if (typeof WritableStream === 'undefined') {
        const text = await response.text();
        target.innerHTML = text;
    }
    else {
        const mw = new MakeWritable(target, options);
        await response.body
            .pipeThrough(new TextDecoderStream())
            .pipeTo(target.writable);
    }
}
export class LHS_RHS_Processor {
    filter(s) {
        if (!this.lhs && !this.rhs)
            return s;
        if (!this._foundStart) {
            const iPos = s.indexOf(this.lhs);
            if (iPos === -1)
                return '';
            this._foundStart = true;
            return s.substr(iPos);
        }
        else if (!this._foundEnd) {
            const iPos = s.indexOf(this.rhs);
            if (iPos === -1)
                return s;
            this._foundEnd = true;
            return s.substr(0, iPos + this.rhs.length);
        }
    }
    constructor(lhs, rhs) {
        this.lhs = lhs;
        this.rhs = rhs;
        this._foundStart = false;
        this._foundEnd = false;
    }
}
export class TemplateProcessor {
    constructor(template) {
        this.template = template;
        const snipAtr = template.getAttribute('snip');
        if (snipAtr !== null) {
            let lhs, rhs;
            if (snipAtr.startsWith('{')) {
                const parsed = JSON.parse(snipAtr);
                lhs = parsed.lhs;
                rhs = parsed.rhs;
            }
            else {
                lhs = '<!---->';
                rhs = '<!---->';
            }
            this._lhs_rhs = new LHS_RHS_Processor(lhs, rhs);
        }
    }
    filter(s) {
        if (this._lhs_rhs !== undefined) {
            s = this._lhs_rhs.filter(s);
        }
        const detail = {
            text: s,
        };
        if (this.template.hasAttribute('enable-filter')) {
            this.template.dispatchEvent(new CustomEvent('stream-chunk', {
                detail: detail
            }));
        }
        return detail.text;
    }
}

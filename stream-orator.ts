import {Options, StreamWriterEvents} from './types';
// Modified from: https://streams.spec.whatwg.org/demos/streaming-element-backpressure.html
// with inspiration from https://jsbin.com/kaposeh/edit?js,output

export class StreamOrator extends EventTarget {
    static emits : {[key in StreamWriterEvents]: StreamWriterEvents} = {
      "new-chunk": "new-chunk",
      ""
    }
    constructor(public target: HTMLElement, public options: Options) {
        super();
        this.reset();
    }

    reset() {
        const {target, options} = this; 
        const {toShadow} = options;
        let realTarget = target as Element;
        if(toShadow){
          if(target.shadowRoot === null) target.attachShadow({mode: 'open'});
          realTarget = target.shadowRoot as any as Element;
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

        function startNewChunk() {
            idlePromise = new Promise(resolve => {
                window.requestAnimationFrame(resolve);
            });
            charactersWrittenInThisChunk = 0;
        }
        
        (<any>this.target).writable = new WritableStream({
            async write(chunk) {
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
                const writeCharacters = Math.min(chunk.length - cursor,
                                                 charactersPerChunk - charactersWrittenInThisChunk);
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


}

export async function streamOrator(href: string, requestInit: RequestInit, target:HTMLElement, options?: Options){
  const response = await fetch(href, requestInit); 
  if(typeof WritableStream === 'undefined'){
    const text = await response.text();
    target.innerHTML = text;
  }else{
    const writeOptions = options || {
      toShadow: false,
    } as Options;
    const mw = new StreamOrator(target, writeOptions);
    await response.body
    .pipeThrough(new TextDecoderStream())
    .pipeTo((<any>target).writable);
  }

}







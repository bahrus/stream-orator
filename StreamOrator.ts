import {Options, NewChunkEvent, newStreamEvent} from './types';
// Modified from: https://streams.spec.whatwg.org/demos/streaming-element-backpressure.html
// with inspiration from https://jsbin.com/kaposeh/edit?js,output

export const newChunk = 'newChunk';
export const endStream = 'endStream';
export const beginStream = 'beginStream';


export class StreamOrator extends EventTarget {
  
    constructor(public target: HTMLElement, public options?: Options) {
        super();
        this.reset();
    }

    reset() {
        const {target, options} = this; 
        const shadowRoot = options?.shadowRoot;
        const rootTag = options?.rootTag || "<div>";
        let rootNode = target as Element;
        const self = this;
        if(shadowRoot !== undefined){
          if(target.shadowRoot === null) target.attachShadow({mode: shadowRoot});
          rootNode = target.shadowRoot as any as Element;
        }
        this.dispatchEvent(new CustomEvent(beginStream, {
          detail: {
            rootNode
          } 
        }));
        rootNode.innerHTML = '';


        let idlePromise: Promise<any> | undefined;
        let charactersWrittenInThisChunk = 0;
        // Sometimes the browser will decide to target 30fps and nothing we do will
        // make it change its mind. To avoid bad behaviour in this case,
        // always target 30fps.
        const MS_PER_FRAME = 1000 / 30;
        // This is dynamically adjusted according to the measured wait time.
        let charactersPerChunk = 4096;
        // Smooth over several frames to avoid overcorrection for outliers.
        let lastFewFrames: number[] = [];
        const FRAMES_TO_SMOOTH_OVER = 3;
        const chunkBuffer: string[] = [];

        function startNewChunk() {
            idlePromise = new Promise(resolve => {
                window.requestAnimationFrame(resolve);
            });
            charactersWrittenInThisChunk = 0;
        }
        
        const doc = document.implementation.createHTMLDocument();
        doc.write(rootTag);
        rootNode.append(doc.body.firstChild!);

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
        (<any>this.target).writable = new WritableStream({
            async write(chunk) {
              const permissionToProceedEvent = {
                chunk,
                chunkBuffer,
                flush: true
              } as NewChunkEvent;
              self.dispatchEvent(new CustomEvent(newChunk, {
                detail: permissionToProceedEvent
              }));
              if(!permissionToProceedEvent.flush) {
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

    async fetch(href: string, requestInit: RequestInit){
      const {target} = this;
      const response = await fetch(href, requestInit);
      const supportsWritableStream =  typeof WritableStream === 'undefined';
      if(!supportsWritableStream) console.debug('no writable stream support');
      if(supportsWritableStream || this.options?.noStreaming){
        const text = await response.text();
        target.innerHTML = text;
      }else{
        await response.body!
        .pipeThrough(new TextDecoderStream())
        .pipeTo((<any>target).writable);
      }
      this.dispatchEvent(new Event(endStream));
    }

}

export async function streamOrator(href: string, requestInit: RequestInit, target:HTMLElement, options?: Options){
  const mw = new StreamOrator(target, options);
  mw.fetch(href, requestInit);
}







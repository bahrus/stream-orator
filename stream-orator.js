// Modified from: https://streams.spec.whatwg.org/demos/streaming-element-backpressure.html with copyright specified below:
// Copyright 2016 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
export class MakeWritable {
    constructor(target) {
        this.target = target;
        this.reset();
    }
    reset() {
        this.target.innerHTML = '';
        const iframeReady = new Promise(resolve => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            iframe.onload = () => {
                iframe.onload = null;
                iframe.contentDocument.write('<div>');
                this.target.appendChild(iframe.contentDocument.querySelector('div'));
                resolve(iframe);
            };
            iframe.src = '';
        });
        async function end() {
            let iframe = await iframeReady;
            iframe.contentDocument.write('</div>');
            iframe.contentDocument.close();
            iframe.remove();
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
        function startNewChunk() {
            idlePromise = new Promise(resolve => {
                window.requestAnimationFrame(resolve);
            });
            charactersWrittenInThisChunk = 0;
        }
        this.target.writable = new WritableStream({
            async write(chunk) {
                //console.log(chunk);
                //console.log('write chunk');
                if (idlePromise === undefined) {
                    startNewChunk();
                    await idlePromise;
                    startNewChunk();
                }
                let iframe = await iframeReady;
                let cursor = 0;
                while (cursor < chunk.length) {
                    const writeCharacters = Math.min(chunk.length - cursor, charactersPerChunk - charactersWrittenInThisChunk);
                    iframe.contentDocument.write(chunk.substr(cursor, writeCharacters));
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
                        //console.log(`timeElapsed = ${timeElapsed}, averageTimeElapsed = ${averageTimeElapsed}, charactersPerChunk = ${charactersPerChunk}`);
                        startNewChunk();
                    }
                }
            },
            close: end,
            abort: end
        });
    }
}
export async function streamOrator(href, requestInit, target) {
    const response = await fetch(href, requestInit);
    if (typeof WritableStream === 'undefined') {
        const text = await response.text();
        target.innerHTML = text;
    }
    else {
        const mw = new MakeWritable(target);
        await response.body
            .pipeThrough(new TextDecoderStream())
            .pipeTo(target.writable);
    }
}

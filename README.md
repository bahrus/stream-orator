# stream-orator

[![NPM version](https://badge.fury.io/js/stream-orator.png)](http://badge.fury.io/js/stream-orator)
[![How big is this package in your project?](https://img.shields.io/bundlephobia/minzip/stream-orator?style=for-the-badge)](https://bundlephobia.com/result?p=stream-orator)
<img src="http://img.badgesize.io/https://cdn.jsdelivr.net/npm/stream-orator?compression=gzip">

This package contains a utility function, streamOrator, that does a fetch and pipes the response to a DOM element.

Example:

```html
    <details>
        <summary>HTML Specs</summary>
        <div id=test></div>
    </details>
    <script type=module>
        import {streamOrator} from 'node_modules/stream-orator/stream-orator.js';
        streamOrator('https://html.spec.whatwg.org/', {}, test);
    </script>
```

The second parameter is the reqInit object (fetch options).

So basically, streamOrator is the fetch function, with a third parameter that specifies the target.

There is an additional optional "options" parameter, where we can utilize shadowDOM:

```html
<details>
    <summary>HTML Specs</summary>
    <div id=test></div>
</details>
<script type=module>
    import {streamOrator} from '../stream-orator.js';
    streamOrator('https://html.spec.whatwg.org/', {}, test, {toShadow: true});
</script>
```

## Access to the stream

If access to the stream chunks is needed, including modifying the chunks, a little more ceremony is needed:

```html
<details>
    <summary>HTML Specs</summary>
    <div id=test></div>
</details>
<script type=module>
    import {streamOrator, StreamWriter} from '../stream-orator.js';
    const sw =  new StreamWriter(target, {toShadow: true});
    sw.addEventListener('new-chunk', e => {
        const chunk = e.detail.chunk;
        //search for a string.  If the first part of the string you are searching for is found at the end of the chunk, may need to ask the writer to wait before flushing to the stream
        e.detail.flush = false;
    });
    sw.fetch('https://html.spec.whatwg.org/', {});
</script>
```

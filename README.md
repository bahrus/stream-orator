# stream-orator

[![NPM version](https://badge.fury.io/js/stream-orator.png)](http://badge.fury.io/js/stream-orator)
[![Playwright Tests](https://github.com/bahrus/stream-orator/actions/workflows/CI.yml/badge.svg?branch=baseline)](https://github.com/bahrus/stream-orator/actions/workflows/CI.yml)
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
        import {streamOrator} from 'node_modules/stream-orator/StreamOrator.js';
        streamOrator('https://html.spec.whatwg.org/', {}, test);
    </script>
```

The second parameter is the reqInit object (fetch options).

What this does:  It streams HTML directly from site:  https://html.spec.whatwg.org/ to the div element with id test.  The third parameter is expected to be a reference to an HTML Element (not a querySelector string).

So basically, streamOrator is the fetch function, with a third parameter that specifies the target.

This package is a core package that can enable us to to start simulating the power of an iframe, but within the context of our document.  

The first obstacle to fully achieving this is adjusting the url's for things like hyperlinks, images, script references, etc.

The most effective utility stream-orator provides is an event to subscribe to, giving access to the root node used during the import (which might be newly constructed shadowRoot):

[TODO] provide an example.

There is an additional optional "options" parameter, where we can utilize shadowDOM:

```html
<details>
    <summary>HTML Specs</summary>
    <div id=test></div>
</details>
<script type=module>
    import {streamOrator} from '../StreamOrator.js';
    streamOrator('https://html.spec.whatwg.org/', {}, test, {shadowRoot: 'open'});
</script>
```

## CORS 

Many sites are not so enlightened as whatwg, and prevent cross origin requests from passing through.

There are various services that aim to provide a gateway into public sites, serving as a reverse proxy, which unfortunately seem to die at an alarming rate.  One such service is [corslet](https://corslet.bahrus.workers.dev/) by yours truly:

```html
<details>
    <summary>Supreme Court</summary>
    <div id=test></div>
</details>
<script type=module>
    import {streamOrator} from '../StreamOrator.js';
    streamOrator('https://corslet.bahrus.workers.dev/?href=https%3A%2F%2Fwww.supremecourt.gov%2Fabout%2Fmembers_text.aspx&lhs=%3Cdiv+id%3D%22pagemaindiv%22+class%3D%22col-md-9%22%3E&rhs=script&exclude_rhs=on&ts=2022-12-06T00%3A26%3A47.783Z&wrapper=%3Cdiv%3E%7C%3C%2Fdiv%3E&ua=', {}, test);
</script>
```

## Access to the stream [One Hundo Untested]

If access to the stream chunks is needed, including modifying the chunks, a little more ceremony is needed:

```html
<details>
    <summary>HTML Specs</summary>
    <div id=test></div>
</details>
<script type=module>
    import {StreamOrator} from '../stream-orator.js';
    const so =  new StreamOrator(target, {toShadow: true});
    so.addEventListener('new-chunk', e => {
        const chunk = e.detail.chunk;
        //search for a string.  If the first part of the string you 
        //are searching for is found at the end of the chunk, 
        //may need to ask the orator to wait before flushing to the stream.
        e.detail.flush = false;
    });
    await so.fetch('https://html.spec.whatwg.org/', {}); //fetch is happening!
</script>
```

## Viewing Locally

1.  Install git.
2.  Fork/clone this repo.
3.  Install node.
4.  Open command window to folder where you cloned this repo.
5.  > npm install
6.  > npm run serve
7.  Open http://localhost:3030/demo/dev in a modern browser.

## Importing in ES Modules:

```JavaScript
import 'stream-orator/StreamOrator.js';

```

## CDN

```JavaScript
import 'https://esm.run/stream-orator/StreamOrator.js';

```


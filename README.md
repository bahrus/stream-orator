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

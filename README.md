# stream-orator

This package contains a utility function, streamOrator, that does a fetch and pipes the response to a DOM element.

Example:

```html
    <script type=module src="node_modules/stream-orator/stream-orator.js"></script>
    <details>
        <summary>HTML Specs</summary>
        <div id=test></div>
    </details>
    <script type=module>
        import {streamOrator} from '../stream-orator.js';
        streamOrator('https://html.spec.whatwg.org/', {}, test);
    </script>
```

The second parameter is the reqInit object (fetch options).

So basically, streamOrator is the fetch function, with a third parameter that specifies the target.

#  Proposal for server-side "template instantiation" - HTML rewriting (including moustache )

## Backdrop

One amazing achievement the WHATWG can take pride of in the past decade has been its reach beyond the browser -- a whole ecosystem has developed that allows for "isomorphic" code to work both on the server and in the browser (as well as during the build process), driven by the painstaking standards work of the WHATWG.

In particular, the tech stack that service workers tap into  -- including fetch, streaming, ES modules, caching, indexedDB, etc. can be utilized on the server-side, with solutions like CloudFlare Workers, Deno, Bun.js, and increasingly Node.  

We are seeing significant interest in solutions like [Astro](https://docs.astro.build/en/core-concepts/astro-components/), that enable easy swapping between server-side vs. client-side components.

But I believe there is one significant missing piece in the standards, where the WHATWG could benefit from a bit of humility, perhaps, and absorb ideas in the opposite direction.

Generating HTML with the help of language-neutral, declarative "static" templates (as opposed to servlet-like JavaScript) has proven itself over many [decades](https://w3techs.com/technologies/overview/programming_language/) of web development.  I think providing some server-side primitives to help these engines be able to handle complex scenarios, including embedding dynamic data into a stream of static templates, would be a "slam-dunk" win for the platform.

Such an idea has taken root in [a number](https://bun.sh/docs/api/html-rewriter#:~:text=Bun%20provides%20a%20fast%20native%20implementation%20of%20the,console.log%28el.tagName%29%3B%20%2F%2F%20%22body%22%20%7C%20%22div%22%20%7C...%20%7D%2C%20%7D%29%3B) [of](https://github.com/worker-tools/html-rewriter) these solutions - the [HTML Rewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter).  This proposal, in essence, seeks to incorporate an enhanced version of that proven, mature solution (with additional support for moustache markers).

Doing so would have a countless number of applications from the mundane but important "slam-dunk" use cases, to the more revolutionary, as discussed below.

## Edge of Tomorrow Design Pattern

The first use case, half-way between mundane and revolutionary, for this proposal, would be "iframes 2.0" without the performance (and rectangular topology) penalty.

To quote the good people of [github](https://github.com/github/include-fragment-element#relation-to-server-side-includes):

>This declarative approach is very similar to SSI or ESI directives. In fact, an edge implementation could replace the markup before its actually delivered to the client.

```html
<include-fragment src="/github/include-fragment/commit-count" timeout="100">
  <p>Counting commits…</p>
</include-fragment>
```

>A proxy may attempt to fetch and replace the fragment if the request finishes before the timeout. Otherwise the tag is delivered to the client. This library only implements the client side aspect.

So basically, we can have a four-legged "relay race" to deliver content to the user in the most efficient, cost effective manner possible.  A cdn can deliver an HTML include if it is in cache.  If not, optionally allow for an extremely short time window for retrieving the resource, and "punt" and hand over the HTML stream to the next layer (while caching the resource in a background thread for future requests) should such attempts come up short -- on to the service worker, which could isomorphically go through the same exact thought process, again searching its cache or providing a limited time window to retrieve, before punting to a web component or custom element enhancement (during template instantiation or in the live DOM tree (worse-case)).  

However, currently the service worker is significantly constrained in its ability to seek out these include statements in the streaming HTML, partly because there is no support, without a [1.2MB](https://github.com/worker-tools/html-rewriter#installation) polyfill, which almost defeats the purpose (high performance).

Or, if using service workers seems like overkill, a web component or custom enhancement, such as [be-written](https://github.com/bahrus/be-written) has enough complexity on its hands to dealing with. Having to build its own parser to parse the HTML as it streams in, searching for such incudes to inject cached HTML into would again likely measure up in the hundreds of kilobytes, based on the libraries cited above, especially if it strives to do the job right.  Waiting for the full HTML to stream, before parsing using built-in api's, wouldn't be particularly efficient either.

## Demonstrating a commitment to progress (iframes 2.0, continued)

If the WHATWG is at all interested in improving the end user experience, especially for those dealing with expensive networks (which I suspect they are), then I think they should be bold and show some leadership, and help us buck the industries' addiction to restful API mechanism as the only way (outside iframes) for sharing content.

To quote [this article](https://jakearchibald.com/2021/cors/):

>If a resource never contains private data, then it's totally safe to put Access-Control-Allow-Origin: * on it. Do it! Do it now!

But one issue with embedding an HTML stream from a third party, is needing to adjust hyperlinks, image links, etc so it points to the right place.  This is [probably the most mundane, slam-dunk reason for supporting this proposal](https://developers.cloudflare.com/workers/examples/rewrite-links/).

## A primitive that would make developing an HTML Parser somewhat trivial

If this primitive was built into the browser, creating a full-blown DOM parser would be quite simple, which has been a common (but often thwarted) use case.  As the [bun.js](https://bun.sh/docs/api/html-rewriter#:~:text=Bun%20provides%20a%20fast%20native%20implementation%20of%20the,console.log%28el.tagName%29%3B%20%2F%2F%20%22body%22%20%7C%20%22div%22%20%7C...%20%7D%2C%20%7D%29%3B) documentation demonstrates:

```JavaScript
const rewriter = new HTMLRewriter();

rewriter.on("*", {
  element(el) {
    console.log(el.tagName); // "body" | "div" | ...
  },
});
...
rewriter.transform(
  new Response(`
<!DOCTYPE html>
<html>
<!-- comment -->
<head>
  <title>My First HTML Page</title>
</head>
<body>
  <h1>My First Heading</h1>
  <p>My first paragraph.</p>
</body>
`));
```

Now what kinds of use cases, running in a worker thread, would be better served by a full, traversable DOM tree, versus use cases that could be done with the more streamlined, low memory SAX-like implementation that Cloudflare's/Bun's HTML Rewriter provides?  I'm not yet sure, but I do suspect, beyond sheer simplicity, that there are such use cases.  I will be collecting a list of use cases where HTML parsing in a worker would appear to be a valid use case, and, without doing a deep dive, *guessing* which model would serve better below.  This list is likely to grow (we are after, all, primarily focused on presenting HTML to the user, so I wouldn't be surprised if the list grows quite large).

But the idea here is it shouldn't be an either/or.  Having a SAX Parser like Cloudflare/Bun.js provides, seems like a must.  The DOM traversal argument on top of that seems like icing on the cake, that I hope the platform would eventually support, but which I think could, in the meantime, be built in userland with a relatively tiny footprint.














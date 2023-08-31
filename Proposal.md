#  Proposal for server-side "template instantiation" - HTML rewriting (including moustache based content grouping)

Author:  Bruce B. Anderson

Last Updated:  8/30/2023

## Backdrop

One amazing achievement the WHATWG can take pride of in the past decade has been its reach beyond the browser -- a whole ecosystem has developed that allows for "isomorphic" code to work both on the server and in the browser (as well as during the build process), driven by the painstaking standards work of the WHATWG.

In particular, the tech stack that service workers tap into  -- including fetch, streaming, ES modules, caching, indexedDB, etc. can be utilized on the server-side, with solutions like CloudFlare Workers, Deno, Bun.js, and increasingly Node.  

We are seeing significant interest in solutions like [Astro](https://docs.astro.build/en/core-concepts/astro-components/), that enable easy swapping between server-side vs. client-side components.

But I believe there is one significant missing piece in the standards, where the WHATWG could benefit from a bit of humility, perhaps, and absorb ideas in the opposite direction.

Processing HTML streams, plugging in dynamic data into "parts" with the help of language-neutral, declarative "static" templates (as opposed to servlet-like JavaScript) has proven itself over many [decades](https://w3techs.com/technologies/overview/programming_language/) of web development.  I think providing some server-side primitives to help these engines be able to handle complex scenarios, including embedding dynamic data into a stream of static templates, would be a "slam-dunk" win for the platform.

Such an idea has taken root in [a number](https://bun.sh/docs/api/html-rewriter#:~:text=Bun%20provides%20a%20fast%20native%20implementation%20of%20the,console.log%28el.tagName%29%3B%20%2F%2F%20%22body%22%20%7C%20%22div%22%20%7C...%20%7D%2C%20%7D%29%3B) [of](https://github.com/worker-tools/html-rewriter) these solutions - the [HTML Rewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter).  This proposal, in essence, seeks to incorporate an enhanced version of that proven, mature solution (with additional support for moustache markers).  Honorable mentions go to [other](https://www.npmjs.com/package/@trysound/sax) [packages](https://www.npmjs.com/package/sax) which certainly get quite a few downloads, if those numbers are to be believed.

Providing this feature would have address a significant number of use cases, from the mundane but important "slam-dunk" use cases, to the more revolutionary, as discussed below.

## Edge of Tomorrow Architectural Pattern

The first use case, half-way between mundane and revolutionary, for this proposal, would be "iframes 2.0" without the performance (and rectangular topology) penalty.

To quote the good people of [github](https://github.com/github/include-fragment-element#relation-to-server-side-includes), addressing the naysayers who [argue that a client side include promotes an inferior user experience](https://github.com/whatwg/html/issues/2791#issuecomment-311365657):

>This declarative approach is very similar to SSI or ESI directives. In fact, an edge implementation could replace the markup before it's actually delivered to the client.

```html
<include-fragment src="/github/include-fragment/commit-count" timeout="100">
  <p>Counting commits…</p>
</include-fragment>
```

>A proxy may attempt to fetch and replace the fragment if the request finishes before the timeout. Otherwise the tag is delivered to the client. This library only implements the client side aspect.

So basically, we can have a four-legged "relay race" to deliver content to the user in the most efficient, cost effective manner possible, to address that critique head-on.  A server-side cloudflare worker (say) can retrieve an HTML include from a cdn, when it detects includes in the HTML stream it is delivering, assuming the resource is already in its cache.  If not, optionally allow for an extremely short time window for retrieving the resource, and "punt" and hand over the HTML stream to the next layer (while caching the resource in a background thread for future requests) should such attempts come up short -- on to the service worker, which could isomorphically go through the same exact thought process, again searching its cache and then optionally  providing a limited time window to retrieve, before punting to a web component or custom element enhancement (during template instantiation or in the live DOM tree (worse-case)).  

However, currently the service worker is significantly constrained in its ability to seek out these include statements in the streaming HTML, partly because there is no support, without a [1.2MB](https://github.com/worker-tools/html-rewriter#installation) polyfill, which almost defeats the purpose (high performance).

Or, if using service workers seems like overkill, a web component or custom enhancement, such as [be-written](https://github.com/bahrus/be-written) has enough complexity on its hands already it needs to deal with. Having to build its own parser to parse the HTML as it streams in, searching for such includes to inject cached HTML into would again likely measure up in the hundreds of kilobytes, based on the libraries cited above, especially if it strives to do the job right.  Waiting for the full HTML to stream, before parsing using built-in api's, wouldn't be particularly efficient either.

## Demonstrating a commitment to progress (iframes 2.0, continued)

If the WHATWG is at all interested in improving the end user experience, especially for those dealing with expensive networks (which I suspect they are, at least in theory), then I think they should be bold and show some leadership, and help us buck the industries' addiction to restful API mechanism as the only way (outside iframes) for sharing content.

To quote [this article](https://jakearchibald.com/2021/cors/):

>If a resource never contains private data, then it's totally safe to put Access-Control-Allow-Origin: * on it. Do it! Do it now!

But one issue with embedding an HTML stream from a third party, is needing to adjust hyperlinks, image links, etc so it points to the right place.  This is [probably the most mundane, slam-dunk reason for supporting this proposal](https://developers.cloudflare.com/workers/examples/rewrite-links/).  Again, this is not only an issue in a service worker, but also for the [be-written](https://github.com/bahrus/be-written) custom enhancement, which tries its best, using mutation observers, to adjust links as the HTML streams in and gets written to the DOM.  This solution would be critical for using this library in a production setting outside tightly controlled scenarios.

## A primitive that would make developing an HTML Parser somewhat trivial

If this primitive (Cloudflare/Bun.s's HTML Rewriter) was built into the browser, creating a full-blown DOM parser would be quite straightforward, which has been a common (but often thwarted) use case.  As the [bun.js](https://bun.sh/docs/api/html-rewriter#:~:text=Bun%20provides%20a%20fast%20native%20implementation%20of%20the,console.log%28el.tagName%29%3B%20%2F%2F%20%22body%22%20%7C%20%22div%22%20%7C...%20%7D%2C%20%7D%29%3B) documentation demonstrates:

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

I don't mean to underestimate that effort -- creating a simple object structure, like JSON parsing provides, seems almost trivial.  But supporting DOM querying does seem like significantly more work, and likewise, increasing the payload size.

Now what kinds of use cases, running in a worker thread, would be better served by a full, traversable DOM tree, versus use cases that could be done with the more streamlined, low memory SAX-like implementation that Cloudflare's/Bun's HTML Rewriter provides, that can process real time as the HTML streams through the pipeline?  I'm not yet sure, but I do suspect, beyond sheer simplicity, that there are such use cases.  I will be collecting a list of use cases where HTML parsing in a worker and/or stream would appear to be a valid use case, and, without doing a deep dive, *guessing* which model would serve better below in some cases.  This list is likely to grow (we are after, all, primarily focused on presenting HTML to the user, so I wouldn't be surprised if the list grows quite large).

But the idea here is it shouldn't be an either/or.  Having a SAX Parser like Cloudflare/Bun.js provides, seems like a must.  The DOM traversal argument on top of that seems like icing on the cake, that I hope the platform would eventually support, but which I think could, in the meantime, be built in userland with a relatively tiny footprint.

## Use cases for DOM Parsing third party HTML (or XML) content in a worker or in a stream on the main thread

### [RSS Feeds](https://paul.kinlan.me/we-need-dom-apis-in-workers/)

I think, [looking at the code](https://github.com/PaulKinlan/topicdeck/blob/master/src/public/scripts/data/common.js#L98), full traversal not needed.  Unclear if streaming support is needed or would help.

### SVG SAX Parsing

Apparently, [this library](https://github.com/jakearchibald/svgomg), uses a SAX Parser so I believe it would benefit from this proposal.

### MS Word integration

Nice use case presented [here](https://github.com/whatwg/dom/issues/1217).  It sounds like full traversal is needed from the description, streaming, not so much.

### Link preview functionality

Streaming a must, no need for full traversal.

### Building a table of contents dynamically as content streams in

Suppose we request, within a large a app, an embedded huge document, and the document starts with a table of contents within a menu.  If the table of contents shows (or enables) everything at once, users may get frustrated when the links don't work, not realizing that the issue is that the section the link points to hasn't arrived in the browser, and stop using it.  This could be accomplished with a mutation observer, but a more elegant and direct approach, I think, would be using a SAX parser such as Cloudflare's/Bun's HTMLRewriter.  I think it would perform better as well.  This would not be best solved by a service worker, but rather by two web components or custom enhancements working together in the main thread with streaming HTML.

### Deriving state from HTML as it streams in.

Similar to the table of contents example.  Again, mutation observers are probably a working alternative, but at a cost.

### Three.js scenario

Mentioned [here](https://github.com/w3c/ServiceWorker/issues/846#issuecomment-273643690).  Unclear if full traversal needed, or streaming.

### Pushing work off the main thread.

I'm not advocating that this proposal go anywhere near supporting updating the DOM from a worker (not opposing it either, that just seems like [an entirely different proposal](https://github.com/whatwg/dom/issues/270), though I suspect such proposals would benefit from being able to parse streaming HTML in the worker, with the help of the platform, but that request isn't made with this particular proposal).

I do think the argument does apply to some degree with HTML that streams through the service worker on its way to the browser.  In that setting, there may be cached, persisted data from previous visits in IndexedDB, and in some of those scenarios, the code the would need to manipulate that data could be complex enough that doing it prior to leaving the service worker would make a tremendous amount of sense, from a performance point of view.  I am alluding to [thought-provoking arguments like this one](https://dassur.ma/things/react-redux-comlink/). I do think that the platform's inability to merge such computations with the HTML streaming in, due to lack of SAX parsing support, is a barrier to that vision. 

(More to come).









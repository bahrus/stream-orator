#  Proposal for server/service worker-side "template instantiation" - HTML / XML stream parsing/rewriting (including moustache token events)

Author:  Bruce B. Anderson

Last Updated:  9/2/2023

## Backdrop

One amazing achievement the WHATWG can take pride of in the past decade has been its reach beyond the browser -- a whole ecosystem has developed that allows for "isomorphic" code to work both on the server and in the browser (as well as during the build process), driven by the painstaking standards work of the WHATWG.

In particular, the tech stack that service workers tap into  -- including fetch, streaming, ES modules, caching, etc. can be utilized on the server-side, with solutions like CloudFlare Workers, Deno, Bun, and increasingly Node.  

But I believe there is one significant missing piece in the standards, where the WHATWG could benefit from a bit of humility, perhaps, and absorb ideas (and maybe even code) in the opposite direction:  Fundamental support for streaming (x)(ht)ml.

## Prior heartaches - already cited use cases by people encountering this missing primitive

### [RSS Feeds](https://paul.kinlan.me/we-need-dom-apis-in-workers/)

### MS Word integration

Nice use case presented [here](https://github.com/whatwg/dom/issues/1217). 

### ColladaLoader2 support

Mentioned [here](https://github.com/w3c/ServiceWorker/issues/846#issuecomment-273643690). 

These use cases are just the tip of the iceberg.  How long before we hear from folks using any of:

### SOAP/XML Services

[They're](http://www.gcomputer.net/webservices/dilbert.asmx) [still](https://www.dataaccess.com/webservicesserver/NumberConversion.wso) [out](https://www.dataaccess.com/webservicesserver/TextCasing.wso) [there.](http://www.xml-webservices.net/services/conversions/euro_convert/euro_conver.asmx)

### XML Vocabularies

[XML](https://en.wikipedia.org/wiki/XML_Signature) [still](https://www.xml.com/) [has](https://www.balisage.net/Proceedings/vol21/html/Thompson01/BalisageVol21-Thompson01.html) [many](https://developer.mozilla.org/en-US/docs/Web/SVG) [uses](https://developer.mozilla.org/en-US/docs/Web/SVG), [and](https://en.wikipedia.org/wiki/MathML) [is](https://en.wikipedia.org/wiki/Office_Open_XML) [still](https://www.fixtrading.org/standards/fixatdl-online/#:~:text=A%20set%20of%20XML%20Schema%20files%20has%20been,source%20code%20which%20maps%20classes%20to%20XML%20representations.) [a](https://en.wikipedia.org/wiki/XMPP) [standard](https://www.w3.org/XML/).

[Not](https://en.wikipedia.org/wiki/Health_Level_7) [supporting](http://www.opentraveldevelopersnetwork.com/implementation-guide) [this](https://www.fpml.org/spec/fpml-5-11-7-rec-1/html/confirmation/fpml-5-11-examples-frame.html) [entire](https://www.mismo.org/standards-resources/mismo-engineering-guidelines) [data](https://www.cms.gov/Medicare/Quality-Initiatives-Patient-Assessment-Instruments/HomeHealthQualityInits/DataSpecifications) [format](https://sourceforge.net/p/epidoc/wiki/Schema/) [in](https://en.wikipedia.org/wiki/MusicXML) such a broad space of development, while supporting JSON, strikes me as fundamentally unfair, frankly.  I think there are understandable reasons for how we ended up here at this point (baby steps, not my department and all that), but it really is not right, long term. I think it is tipping the scales in the IT industry,  leaving whole organizations out in the cold, not allowing the two data formats to compete on an even playing field.  And it is quite an insult to the origins of the web.

To this vast list of shortchanged parties, let me add my own petty grievances and desires, discussed below.

We are seeing significant interest in solutions like [Astro](https://docs.astro.build/en/core-concepts/astro-components/), that enable easy swapping between server-side vs. client-side components.

Processing HTML streams, plugging in / replacing dynamic data into "parts" with the help of language-neutral, declarative "static" templates (as opposed to servlet-like JavaScript) has proven itself over many [decades](https://w3techs.com/technologies/overview/programming_language/) of web development.  I think providing some server-side primitives to help these engines be able to handle complex scenarios, including embedding dynamic data into a stream of static templates or dynamic third party content, would be a "slam-dunk" win for the platform.

Such an idea has taken root in [a number](https://bun.sh/docs/api/html-rewriter#:~:text=Bun%20provides%20a%20fast%20native%20implementation%20of%20the,console.log%28el.tagName%29%3B%20%2F%2F%20%22body%22%20%7C%20%22div%22%20%7C...%20%7D%2C%20%7D%29%3B) [of](https://github.com/worker-tools/html-rewriter) these solutions - the [HTML Rewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter).  This proposal, in essence, seeks to incorporate an enhanced version of that proven, mature solution (with additional support for moustache markers).  Honorable mentions go to [other](https://www.npmjs.com/package/@trysound/sax) [packages](https://www.npmjs.com/package/sax) which certainly get quite a few downloads, if those numbers are to be believed.

Providing this feature would, I believe, address a significant number of use cases, from the mundane but important "slam-dunk" use cases, to the more revolutionary, as discussed below.  It would provide the equivalent of JSON.parse, at least (with the help of a small library, which maybe should be included as part of this proposal).  And it would provide a good foundation to create a robust DOM object model on top of, starting, perhaps, in userland.

## Highlights of the proposal

1.  Add native support for a SAX-like API built into the platform, accessible from workers and the main thread, capable of working with HTML5, with all its quirks.  I think the Cloudflare/Bun.js's HTMLRewriter API is a good, proven, concrete starting point as far as the basic shape of the API, and in how it integrates with streaming API's.  I have no suggestions on how to improve upon that basic API, so as far as I'm concerned, it is also a good ending point, at least for rewriting operations.
2.  Add (a subset of?) XPath support (which the HTMLRewriter API doesn't currently support).
3.  Crucially, it must provide support for parsing to a rudimentary object model,  similar to parsed JSON.  That is already the case with the HTML rewriter, with a judicious paragraph of code.  However, I think it would be clearest if another (base?) class, called HTMLReader was defined, which instead of having a "transform" method, would have a "subscribe" method, and the (base?) handler class would only have access to the properties and methods that read from the stream.  Code would still be required to generate whatever object the developer needs out of it.  Maybe a generic reference example/utility (equivalent of JSON.parse) could be baked into the platform as part of this step.
4.  Using the same basic API shape, support XML with XPath based "events".  (XMLRewriter and XMLReader).
5.  Add special support for configurable interpolation and processing markers, that would allow for templating engines to build on top of (e.g. XSLT, Template Instantiation on the server side, etc.)  As that is the least proven suggestion, I'm still mulling over what that would look like.

I have too much skin in the game to properly weigh how to prioritize these items, but however they are prioritized, rolling out in stages seems perfectly appropriate (including the supported CSS/XPath matches).

## Highlights of open questions (in my mind)

1.  Cloudflare's HTML Rewriter restricts queries to a small subset of the full CSS Selector specification (and modifies the syntax in some cases).  There may be some very practical reasons for this (and I think we can live with it).  But if it is just a matter of not devoting time to support low usage case scenarios, I don't know that we want to create a permanent "ceiling" in the css queries allowed.
   

## My personal use cases:

## Edge of Tomorrow Architectural Pattern

The first two use cases from my list of petty grievances centers around my personal pet peeve, an alarming lack of HTML love shown by the platform.  One could argue that these use cases will become superfluous once the platform builds what it has said it will build.  But at the rate things are progressing, it will be 2000 B.C. before that happens (as the progress has actually been negative over the past ten years).  

The first two use cases center around supporting a userland implementation of "iframes 2.0" without the performance (and rectangular topology) penalty.

To quote the good people of [github](https://github.com/github/include-fragment-element#relation-to-server-side-includes), addressing the naysayers who [argue that a client side include promotes an inferior user experience](https://github.com/whatwg/html/issues/2791#issuecomment-311365657):

>This declarative approach is very similar to SSI or ESI directives. In fact, an edge implementation could replace the markup before it's actually delivered to the client.

```html
<include-fragment src="/github/include-fragment/commit-count" timeout="100">
  <p>Counting commits…</p>
</include-fragment>
```

>A proxy may attempt to fetch and replace the fragment if the request finishes before the timeout. Otherwise the tag is delivered to the client. This library only implements the client side aspect.

So basically, we can have a four-legged "relay race" to deliver content to the user in the most efficient, cost effective manner possible, to address that critique head-on.  A server-side cloudflare worker (say) can sift through the HTML it is streaming, and when it encounters an include type instruction, see if it can optimize the naysayers' user experience, without causing a white screen of death.  It can first check its cache for that resource, and if not found, optionally retrieve the HTML include from a cdn or dynamically generated site or service, that uses HTML server rendering, within an extremely tight window of time.  Once the deadline is hit, "punt" and hand over the HTML stream to the next layer (while caching the resource in a background thread for future requests)  -- on to the service worker, which could isomorphically go through the same exact thought process, again searching its cache and then optionally  providing a limited time window to retrieve, before punting to a web component or custom element enhancement (during template instantiation or in the live DOM tree (worse-case)).  

However, currently, the service worker is significantly constrained in its ability to seek out these include statements in the streaming HTML, because there is no support, without a [1.2MB](https://github.com/worker-tools/html-rewriter#installation) polyfill, which almost defeats the purpose (high performance).

Or, if using service workers seems like overkill, a web component or custom enhancement, such as [be-written](https://github.com/bahrus/be-written) could handle includes embedded in the streaming HTML.  But such solutions have enough complexity on its hands already it needs to deal with. Having to build its own parser to parse the HTML as it streams in, searching for such includes to inject cached HTML into would again likely measure up in the hundreds of kilobytes or more, based on the libraries cited above, especially if it strives to do the job right.  Waiting for the full HTML to stream, before parsing using built-in api's, wouldn't be particularly efficient either.  

## Iframes 2.0 in userland

If the WHATWG is at all interested in improving the end user experience, especially for those dealing with expensive networks (which I suspect they are, at least in theory), then I think they should be bold and show some leadership, and help us buck the industries' addiction to restful JSON-only API mechanism as the only way (outside iframes) for sharing content.

To quote [this article](https://jakearchibald.com/2021/cors/):

>If a resource never contains private data, then it's totally safe to put Access-Control-Allow-Origin: * on it. Do it! Do it now!

But one issue with embedding an HTML stream from a third party, is needing to adjust hyperlinks, image links, etc so it points to the right place.  This is [probably the most mundane, slam-dunk reason for supporting this proposal](https://developers.cloudflare.com/workers/examples/rewrite-links/).  Again, this is not only an issue in a service worker, but also in the main thread.  The [be-written](https://github.com/bahrus/be-written) custom enhancement, which tries its best to deal with this, has to use mutation observers, to adjust links as the HTML streams in and gets written to the DOM.  This solution would be critical for using this library in a production setting outside tightly controlled scenarios.  As it is, it often results in 404's getting logged because the urls aren't adjusted fast enough.

[i18n support](https://developers.cloudflare.com/workers/tutorials/localize-a-website/) also seems like a good use case.

Other things for which the lack of a stream parser makes life difficult -- filtering out parts of the HTML stream, like jQuery supports -- filtering out script tags, style tags, etc.

## A primitive that would make developing an HTML/XML Parser somewhat trivial

If this primitive (Cloudflare/Bun.s's HTML Rewriter) was built into the browser, creating a full-blown DOM parser would be quite straightforward, which has been a common (but often thwarted) use case.  However, I suggest using clear language to indicate that these API's can be used for reading as well as writing:

```JavaScript
const reader = new HTMLReader();

reader.on("*", {
  element(el) {
    console.log(el.tagName, el.text, el.attributes, el.lastInTextNode); // "body" | "div" | ...
  },
});
...
reader.subscribe(
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

(Modified from Bun.js documentation, which hopefully is compatible with Cloudflare's API, which is documented with classes.)

In this case, the handler class would only have readonly access to the content.

I don't mean to underestimate that effort -- creating a simple object structure, like JSON parsing provides, seems almost trivial.  But creating a full blown object with bi-directional traversal, supporting CSS or XPATH querying, and the full gamut of DOM manipulation methods, does seem like significantly more work, and likewise, increasing the payload size.

Now what kinds of use cases, running in a service worker, would be better served by a full, bi-directional traversing of the DOM tree, versus use cases that could be done with the more streamlined, low memory SAX-like implementation that can process real time as the HTML/XML streams through the pipeline?  I'm not yet sure, but I do suspect, beyond sheer simplicity, that there are such use cases.  

But the idea here is it shouldn't be an either/or.  Having a SAX Parser like Cloudflare/Bun.js provides, seems like a must.  The DOM traversal argument on top of that seems like icing on the cake, that I hope the platform would eventually support, but which I think could, in the meantime, be built in userland with a relatively tiny footprint.

### Link preview functionality

Streaming a must, no need for full traversal.

### Building a table of contents dynamically as content streams in

Suppose we request, within a large app, an embedded huge document, and the document starts with a table of contents within a menu.  If the table of contents shows (or enables) everything at once, users may get frustrated when the links don't work, not realizing that the issue is that the section the link points to hasn't arrived in the browser.  One or two such clicks, and the user may abandon use of the table of contents altogether.  

So we need a way for the table of contents to grow in accordance to the sections of html being downloaded.  This could be accomplished with a mutation observer, but a more elegant and direct approach, I think, would be using a SAX parser such as Cloudflare's/Bun's HTMLRewriter.  I think it would perform better as well.  This would not be best solved by a service worker, but rather by two web components or custom enhancements working together in the main thread with streaming HTML.

### Deriving state from HTML as it streams in.

Similar to the table of contents example.  Again, mutation observers are probably a working alternative, but at a cost.


### Pushing work off the main thread.

I'm not advocating that this proposal go anywhere near supporting updating the DOM from a worker.  For the record, I'm not opposing it either.  It just seems like [an entirely different proposal](https://github.com/whatwg/dom/issues/270). But I do suspect such proposals would benefit from being able to parse streaming HTML in the worker, with the help of the platform, but that request isn't made with this particular proposal.

I do think the argument does apply to some degree with HTML that streams through the service worker on its way to the browser's main thread.  In that setting, there may be cached, persisted data from previous visits in IndexedDB, and in some of those scenarios, the code that would need to manipulate that data could be complex enough that doing it prior to leaving the service worker would make a tremendous amount of sense, from a performance point of view.  I am alluding to [thought-provoking arguments like this one](https://dassur.ma/things/react-redux-comlink/). I do think that the platform's inability to merge such computations with the HTML streaming in, due to lack of SAX parsing support, is a barrier to that vision.

### Hydrating streaming HTML - my most central interest in this proposal.

As [many have argued](https://make.wordpress.org/core/2023/03/30/proposal-the-interactivity-api-a-better-developer-experience-in-building-interactive-blocks/), there are great synergies that can be achieved between [custom enhancement attributes](https://github.com/WICG/webcomponents/issues/1000) between the main thread and the server.  For many of my enhancements, I first check if the server has created a button I need (with a certain class, say), and then I need to document "for a better user experience, please make the server add such and such button with such and such class".  If the enhancement finds no such button, it creates it in the main thread, knowing that that isn't the optimal experience.

I would like to instead provide a "server-side" library I can point the developer to that could execute in the two "back-end legs" isomorphically -- the CloudFare or Bun.js (or Deno.js) service, and the service worker.  This would follow the same "Edge of Tomorrow" approach -- if the remote server has already downloaded the library, great, it will add that button.  If not, it can punt: "Sorry, I don't know about that attribute yet, maybe the service worker knows about it, but [I might know about it next time it passes through](https://github.com/WICG/webcomponents/issues/896)".  Same logic in the service worker.  And for that approach to work in the service worker, it needs to be able to "subscribe" to certain attributes being present in the HTML as it streams in. Which requires an HTMLRewriter built in to the platform.  If the library isn't loaded yet, it can punt to the custom enhancement in the main thread, with a slightly degraded user experience (but at least it wasn't for lack of effort of all the proletariat workers).  

Knowing that I could use the same API both in a server setting, and in the browser's service worker, would tell me that the approach I'm using will have enough longevity, that it is worth my time to do it.  It means developers using a server technology that isn't JavaScript based could at least rely on the service-worker half of the equation.  Otherwise, I'd rather target a server technology with more reach (I may anyway, just saying.)











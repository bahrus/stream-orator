import {Options} from './types';
export async function nonStream(response: Response, target: Element, options?: Options){
    let text = await response.text();
    const between = options?.between;
    if(between){
      const lhs = between[0];
      const rhs = between[1];
      const iPosLHS = text.indexOf(lhs);
      if(iPosLHS !== -1){
        const iPosRHS = text.indexOf(rhs);
        if(iPosRHS !== -1){
          text = text.substring(iPosLHS + lhs.length, iPosRHS);
        }
      }
    }
    let finalTarget : Element | ShadowRoot = target;
    if(options?.shadowRoot){
        if(target.shadowRoot === null){
            target.attachShadow({mode: options.shadowRoot});
        }
        finalTarget = target.shadowRoot!;
    }
    finalTarget.innerHTML = text;
}
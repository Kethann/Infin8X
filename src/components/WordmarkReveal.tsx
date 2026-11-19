import { useId } from 'react';
import { CyclingWordmark } from './CyclingWordmark';

const columns=Array.from({length:48},(_,index)=>index);

/** One live wordmark, revealed through vertical apertures rather than duplicate text. */
export function WordmarkReveal() {
  const id=`wordmark-${useId().replace(/:/g,'')}`;
  return <span className="wordmark-reveal">
    <svg className="wordmark-reveal__definitions" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-down`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" /><stop offset=".92" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-up`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset=".08" stopColor="white" /><stop offset="1" stopColor="white" />
        </linearGradient>
        <mask id={id} maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x="0" y="0" width="1" height="1">
          {columns.map(index=><rect key={index} data-wordmark-slice x={index/columns.length}
            y="0" width={1/columns.length+0.0005} height="1" fill={`url(#${id}-${index%3===0?'up':'down'})`} />)}
        </mask>
      </defs>
    </svg>
    <span className="wordmark-reveal__face" style={{maskImage:`url(#${id})`,WebkitMaskImage:`url(#${id})`}}><CyclingWordmark /></span>
    <span className="wordmark-reveal__beams" aria-hidden="true">
      {columns.map(index=>{
        const colour=index<28 ? (index%4===0?'#91bfff':'#e4efff') : (index%3===0?'#eaa0e8':'#aaa5ff');
        return <span key={index} data-wordmark-beam style={{left:`${(index+0.3)/columns.length*100}%`,
          width:`${(index%4===0?0.5:0.24)/columns.length*100}%`,
          background:`linear-gradient(to bottom, transparent, ${colour} 35%, #fff 50%, ${colour} 65%, transparent)`}} />;
      })}
    </span>
  </span>;
}

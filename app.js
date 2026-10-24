'use strict';
const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const reportLink=(page,label)=>`<a class="source-link" href="assets/report.pdf#page=${page}" target="_blank" rel="noopener">${label} ↗</a>`;
let currentMove=0,currentCountry='denmark',mapLayer='all',decisionStep=0,choices=[null,null,null];
let mapProjection,mapRedraw,mapSvg,zoomLevel=1;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function renderMove(index,focus=false){
  currentMove=Math.max(0,Math.min(2,index));
  const move=MOVES[currentMove];
  $$('[data-move]').forEach((button,i)=>{button.classList.toggle('selected',i===currentMove);button.setAttribute('aria-selected',String(i===currentMove));button.tabIndex=i===currentMove?0:-1;});
  const panel=$('#move-panel');
  panel.setAttribute('aria-labelledby',`move-tab-${currentMove}`);
  panel.innerHTML=`<div class="move-overview fade-in"><div class="status-label"><span class="status-bars">${[1,2,3].map(i=>`<i class="${i<=move.level?'on':''}"></i>`).join('')}</span>${move.status}</div><h3>${move.title}</h3><p>${move.summary}</p><div class="cause-chain">${move.chain.map((item,i)=>`${i?'<i>→</i>':''}<span>${item}</span>`).join('')}</div>${reportLink(move.page,`Scenario · report p. ${move.printed}`)}</div><div class="events fade-in">${move.events.map((event,i)=>`<details class="event" ${i===0?'open':''}><summary><span class="event-number">0${i+1}</span><div><small>${event.date}</small><b>${event.title}</b></div><span class="expand" aria-hidden="true">+</span></summary><p>${event.text}</p><button class="event-map" data-place="${event.place}">Open location briefing ↗</button></details>`).join('')}</div>`;
  $('#move-count').textContent=`0${currentMove+1} / 03`;
  $('#previous-move').disabled=currentMove===0;$('#next-move').disabled=currentMove===2;
  if(mapRedraw)mapRedraw();
  if(focus)$(`#move-tab-${currentMove}`).focus();
}
function renderCountry(key,focus=false){
  currentCountry=key;const country=COUNTRIES[key];
  $$('[data-country]').forEach(button=>{const active=button.dataset.country===key;button.classList.toggle('selected',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
  const panel=$('#country-panel');panel.setAttribute('aria-labelledby',`country-tab-${key}`);
  panel.innerHTML=`<div class="country-identity fade-in"><div class="country-code">${country.code}</div><h3>${country.tagline}</h3>${reportLink(country.page,`Team analysis · p. ${country.printed}`)}</div><div class="country-block fade-in"><h4>THE STRATEGIC LENS</h4><p>${country.lens}</p><div class="country-tension"><b>THE DIFFICULT BALANCE</b>${country.tension}</div></div><div class="country-block fade-in"><h4>WHAT COMES FIRST</h4><ul>${country.priorities.map(priority=>`<li>${priority}</li>`).join('')}</ul></div>`;
  if(focus)$(`#country-tab-${key}`).focus();
}
function keyboardTabs(event,items,index,select){
  let next=index;
  if(event.key==='ArrowRight')next=(index+1)%items.length;
  else if(event.key==='ArrowLeft')next=(index-1+items.length)%items.length;
  else if(event.key==='Home')next=0;
  else if(event.key==='End')next=items.length-1;
  else return;
  event.preventDefault();select(items[next]);
}
function showDialog(kicker,html){
  $('#dialog-kicker').textContent=kicker;$('#dialog-content').innerHTML=html;
  const dialog=$('#detail-dialog');
  if(!dialog.open){dialog.showModal();document.body.style.overflow='hidden';}
  dialog.scrollTop=0;$('#close-dialog').focus({preventScroll:true});
}
function locationDialog(id){
  const place=PLACES.find(p=>p.id===id);if(!place)return;
  showDialog('ARCTIC LOCATION BRIEFING · FICTIONAL SCENARIO',`<div class="eyebrow" style="margin-bottom:12px">${place.sub.toUpperCase()}</div><h2>${place.name}</h2><p>${place.text}</p><h3>Why it matters</h3><p>${place.stakes}</p><p class="dialog-note">${place.extra}</p><div class="dialog-links">${reportLink(place.page,`Read the source · report p. ${place.printed}`)}<button id="back-locations" class="quiet-link">All locations <span>↗</span></button></div>`);
}
function locationIndex(){showDialog('THE HIGH NORTH · LOCATION INDEX',`<h2>Explore the fault lines.</h2><p>Every location connects geography to a policy dilemma. Positions and routes are schematic; all events are from the imagined 2030–2035 scenario.</p>${PLACES.map(place=>`<button class="location-row" data-place="${place.id}"><div><b>${place.name}</b><small>${place.sub} · ${place.moves.map(i=>MOVES[i].year).join(' / ')}</small></div><span>↗</span></button>`).join('')}`);}
function sourceDialog(){showDialog('SOURCES & METHODOLOGY',`<h2>A game about preparedness.</h2><p>This explorer is based on <em>Thawing Order: The Arctic Question</em>, published by Körber-Stiftung in cooperation with the Geneva Centre for Security Policy (GCSP), 2026. The confidential exercise took place in Berlin in June 2026.</p><p>Senior experts and officials formed four teams: the Kingdom of Denmark, Germany, Norway and the United Kingdom. They considered a short-to-medium-term scenario in three escalating moves.</p><h3>A scenario, not a prediction</h3><p>The events set in 2030–2035 are plausible fictional developments designed to test interests and policy options. They are not reported events, probabilities or forecasts. The report reflects its authors’ analysis of the exercise, not necessarily the views of participants or their organizations. Team responses are not official government positions.</p><h3>How this adaptation works</h3><p>The timeline and country briefings paraphrase the report. The decision room is an original reflection exercise inspired by those discussions, not a reconstruction of the original game. Its trade-offs and team comparisons are editorial interpretations; it has no predictive scoring model. Choices stay in memory while the page is open. Downloading your briefing saves a text file on your device.</p><h3>Find it in the original</h3><p>Introduction and methodology: pp. 1, 3. Scenario: pp. 4–5. Recommendations: p. 6. Country teams: pp. 7–10. Aaja Chemnitz’s reflection: p. 11. Links use the PDF’s physical page numbers to open the relevant printed page.</p><h3>Map & interface</h3><p>Geography: Natural Earth via world-atlas (110m resolution). Rendering: D3 and topojson-client. The polar projection is illustrative; routes and event markers are schematic and show no live data, jurisdictional boundaries or measured sea-ice extent. Fonts: Inter and Barlow Condensed. This independent adaptation is not affiliated with or endorsed by Körber-Stiftung or GCSP.</p><div class="dialog-links"><a class="button primary" href="assets/report.pdf" target="_blank" rel="noopener">Open the full report <span>↗</span></a><a class="source-link" href="assets/report.pdf" download="Thawing Order - The Arctic Question.pdf">Download PDF ↓</a></div>`);}
function compareDialog(){showDialog('FOUR TEAMS · ONE CRISIS',`<h2>Different instincts.<br><em>A shared need to coordinate.</em></h2><p>These are the expert teams’ approaches within the exercise, as summarized by the report’s authors.</p><div class="compare-grid">${Object.values(COUNTRIES).map(c=>`<article class="compare-card"><div><span class="flag ${c.flag}"></span>${c.name}</div><h3>${c.tagline}</h3><p>${c.comparison}</p>${reportLink(c.page,`Report p. ${c.printed}`)}</article>`).join('')}</div><p class="dialog-note" style="margin-top:20px">Greenland was not a separate country team in the exercise. Its political agency and Indigenous perspectives are emphasized in the report and in Aaja Chemnitz’s reflection.</p>`);}
function renderGlossary(query=''){
 const matches=GLOSSARY.filter(item=>`${item.term} ${item.definition}`.toLowerCase().includes(query.toLowerCase().trim()));
 $('#glossary-results').innerHTML=matches.length?matches.map(item=>`<article class="glossary-item"><h3>${item.term}</h3><p>${item.definition}</p><a href="assets/report.pdf#page=${item.page}" target="_blank" rel="noopener">In the report ↗</a></article>`).join(''):'<div class="empty-note">No matching terms. Try “NATO”, “Greenland” or “navigation”.</div>';
 $('#glossary-count').textContent=`${matches.length} ${matches.length===1?'term':'terms'}`;
}
function glossaryDialog(){showDialog('THE ARCTIC FIELD GUIDE',`<h2>A little context goes a long way.</h2><label class="sr-only" for="glossary-search">Search the Arctic field guide</label><input id="glossary-search" class="glossary-search" type="search" placeholder="Search a place, institution or idea…" autocomplete="off"><div id="glossary-count" class="mono" aria-live="polite"></div><div id="glossary-results"></div>`);renderGlossary();$('#glossary-search').addEventListener('input',event=>renderGlossary(event.target.value));}

function renderDecision(){
 const content=$('#decision-content');
 $$('#decision-progress li').forEach((li,i)=>{li.classList.toggle('current',i===decisionStep);li.classList.toggle('done',choices[i]!==null&&i!==decisionStep);li.querySelector('span').textContent=choices[i]!==null&&i!==decisionStep?'✓':`0${i+1}`;if(i===decisionStep)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
 if(decisionStep===3){renderResults();return;}
 const item=DECISIONS[decisionStep],selected=choices[decisionStep];
 content.innerHTML=`<div class="eyebrow">DILEMMA 0${decisionStep+1} / 03 · ${item.year}</div><h3>${item.title}</h3><p class="decision-context">${item.context}</p><div class="decision-options" role="group" aria-label="Choose a policy response">${item.choices.map((choice,i)=>`<button class="decision-option ${selected===i?'chosen':''}" data-choice="${i}" aria-pressed="${selected===i}"><span>${selected===i?'✓':String.fromCharCode(65+i)}</span><div><strong>${choice.title}</strong><small>${choice.sub}</small></div><i aria-hidden="true">↗</i></button>`).join('')}</div><div id="choice-reveal">${selected!==null?choiceReveal(item.choices[selected]):''}</div><div class="decision-actions">${reportLink(item.page,`Scenario & team analysis · pp. ${item.printed}`)}<button class="button primary" id="next-decision" ${selected===null?'disabled':''}>${decisionStep===2?'See your briefing':'Next dilemma'} <span>→</span></button></div>`;
}
function choiceReveal(choice){return `<div class="choice-reveal"><h4>THE POLICY TRADE-OFF</h4><p>${choice.response}</p><p class="tradeoff"><b>The pressure point:</b> ${choice.tradeoff}</p><p class="team-match">↗ ${choice.match}</p><p style="font-size:9px;color:var(--dim);margin-top:10px">Choose another response to compare the trade-offs.</p></div>`;}
function choosePolicy(index){
 const selected=Number(index);if(!Number.isInteger(selected)||selected<0||selected>2||decisionStep>2)return;
 choices[decisionStep]=selected;
 $$('.decision-option').forEach((button,i)=>{button.classList.toggle('chosen',i===selected);button.setAttribute('aria-pressed',String(i===selected));button.querySelector('span').textContent=i===selected?'✓':String.fromCharCode(65+i);});
 $('#choice-reveal').innerHTML=choiceReveal(DECISIONS[decisionStep].choices[selected]);$('#next-decision').disabled=false;
 $('#announce').textContent=`Selected ${DECISIONS[decisionStep].choices[selected].title}. Trade-off and team comparison are now available.`;
}
function renderResults(){
 $('#decision-content').innerHTML=`<div class="eyebrow">YOUR BRIEFING · THREE DECISIONS</div><h3>You have a position.<br>Now build the coalition.</h3><p class="decision-context">Your choices expose the balance between speed, legitimacy, capability and restraint. Here is the approach you brought to the table.</p><div class="results-list">${DECISIONS.map((item,i)=>{const choice=item.choices[choices[i]];return `<div class="result-item"><span>0${i+1}</span><div><h4>${choice.title}</h4><p>${choice.theme} · ${choice.match}</p><button class="quiet-link revisit-decision" data-revisit="${i}">Revisit this choice <span>↗</span></button></div></div>`;}).join('')}</div><p class="result-note">Preparedness and credibility are the foundation. Coordination turns them into a strategy.</p><div class="decision-actions"><button class="quiet-link" id="restart-decisions">Start again <span>↺</span></button><button class="button primary" id="download-briefing">Download your briefing <span>↓</span></button></div>`;
}
function downloadBriefing(){
 const text=['THAWING ORDER — YOUR ARCTIC POLICY BRIEFING','A reflection exercise inspired by the Körber Policy Game 2026.','Fictional scenario: 2030–2035. This is not a forecast or official policy.',...DECISIONS.map((item,i)=>{const choice=item.choices[choices[i]];return `\nDILEMMA ${i+1}: ${item.title}\nYOUR CHOICE: ${choice.title}\n\n${choice.response}\n\nTHE PRESSURE POINT: ${choice.tradeoff}\n\nTEAM COMPARISON (editorial interpretation): ${choice.match}`;}),'\nSOURCE: Thawing Order: The Arctic Question, Körber-Stiftung in cooperation with GCSP, 2026. Scenario pp. 4–5; team analysis pp. 7–10.','The report reflects its authors’ analysis, not necessarily participants’ or organizations’ views. Team responses are not official government positions.'].join('\n\n');
 const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Thawing-Order-Your-Policy-Briefing.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 $('#announce').textContent='Your policy briefing has been downloaded.';
}

function initMap(){
 if(!window.d3||!window.topojson||!window.ARCTIC_WORLD){$('#map-fallback').hidden=false;$('#map-fallback').style.cssText='position:absolute;top:150px;left:30px;right:30px;color:var(--muted)';return;}
 const width=820,height=700,baseScale=445,baseRadius=310,center=[418,357];
 const projection=d3.geoAzimuthalEquidistant().rotate([30,-90,0]).translate(center).scale(baseScale).clipAngle(40);
 mapProjection=projection;const path=d3.geoPath(projection),svg=d3.select('#arctic-map');mapSvg=svg;
 const defs=svg.append('defs');
 const ocean=defs.append('radialGradient').attr('id','ocean-gradient').attr('cx','40%').attr('cy','35%');ocean.append('stop').attr('offset','0%').attr('stop-color','#19434b');ocean.append('stop').attr('offset','65%').attr('stop-color','#102f3b');ocean.append('stop').attr('offset','100%').attr('stop-color','#0a222d');
 const landGradient=defs.append('linearGradient').attr('id','land-gradient').attr('x1','0%').attr('y1','0%').attr('x2','25%').attr('y2','100%');landGradient.append('stop').attr('offset','0%').attr('stop-color','#a8c3be');landGradient.append('stop').attr('offset','55%').attr('stop-color','#7ba5a5');landGradient.append('stop').attr('offset','100%').attr('stop-color','#446e76');
 defs.append('clipPath').attr('id','sphere-clip').append('circle').attr('cx',center[0]).attr('cy',center[1]).attr('r',baseRadius);
 const glow=defs.append('filter').attr('id','marker-glow').attr('x','-100%').attr('y','-100%').attr('width','300%').attr('height','300%');glow.append('feGaussianBlur').attr('stdDeviation','4');
 const rings=svg.append('g').attr('aria-hidden','true');[328,345].forEach((radius,i)=>rings.append('circle').attr('cx',center[0]).attr('cy',center[1]).attr('r',radius).attr('fill','none').attr('stroke',i?'#b1d5d317':'#b1d5d322').attr('stroke-width','.6').attr('stroke-dasharray',i?'1 8':'none'));
 const sphere=svg.append('path').datum({type:'Sphere'}).attr('fill','url(#ocean-gradient)').attr('stroke','#a7d3d345').attr('stroke-width','1');
 const group=svg.append('g').attr('clip-path','url(#sphere-clip)');
 const graticule=group.append('path').datum(d3.geoGraticule().step([30,10])()).attr('class','graticule');
 const land=topojson.feature(ARCTIC_WORLD,ARCTIC_WORLD.objects.land),countries=topojson.mesh(ARCTIC_WORLD,ARCTIC_WORLD.objects.countries,(a,b)=>a!==b);
 const landShape=group.append('path').datum(land).attr('class','globe-land');
 const greenland=topojson.feature(ARCTIC_WORLD,ARCTIC_WORLD.objects.countries).features.find(feature=>String(feature.id)==='304');
 const greenlandShape=group.append('path').datum(greenland).attr('fill','#c9ddd5').attr('stroke','#e1f0e4').attr('stroke-width','.65');
 const borders=group.append('path').datum(countries).attr('class','globe-border');
 const arcticCircle=group.append('path').datum(d3.geoCircle().center([0,90]).radius(23.44)()).attr('fill','none').attr('stroke','#c3dfd255').attr('stroke-width','1').attr('stroke-dasharray','3 5');
 const routes=[{type:'LineString',coordinates:[[-44,60],[-20,64],[0,58]],kind:'giuk'},{type:'LineString',coordinates:[[-51.7,64.2],[-43,59],[-20,64]],kind:'cable'},{type:'LineString',coordinates:[[-51.7,64.2],[-62,61],[-66,58]],kind:'cable'}];
 const routePaths=group.append('g').selectAll('path').data(routes).join('path').attr('fill','none').attr('stroke',d=>d.kind==='giuk'?'#e7a283':'#7fc2d0').attr('stroke-width',d=>d.kind==='giuk'?1.4:1).attr('stroke-dasharray',d=>d.kind==='giuk'?'4 5':'2 4').attr('opacity',.65);
 const labelData=[{text:'GREENLAND',coord:[-40,73.5]},{text:'CANADA',coord:[-100,66]},{text:'RUSSIA',coord:[85,67]},{text:'NORWAY',coord:[18,63]},{text:'ICELAND',coord:[-19,67]},{text:'ARCTIC OCEAN',coord:[110,80],sea:true},{text:'NORTH ATLANTIC',coord:[-30,48],sea:true}];
 const labels=group.append('g').attr('aria-hidden','true').selectAll('text').data(labelData).join('text').text(d=>d.text).attr('class',d=>`map-label ${d.sea?'sea-label':''}`).attr('text-anchor','middle');
 const polar=group.append('g').attr('aria-hidden','true');polar.append('path').attr('d','M-7,0H7M0,-7V7').attr('stroke','#b9e1cd66').attr('stroke-width','.8');polar.append('text').text('90° N').attr('x',12).attr('y',3).attr('fill','#a3c3bd').attr('font-family','monospace').attr('font-size','8');
 const colors={economy:'#eea181',environment:'#b9e1cd',security:'#83c9db'};
 const markers=group.append('g').selectAll('g').data(PLACES).join('g').attr('class','place-point').attr('role','button').attr('tabindex',0).attr('aria-haspopup','dialog').attr('aria-label',d=>`${d.name}: ${d.sub}. Open scenario briefing.`).on('click',(event,d)=>{event.stopPropagation();locationDialog(d.id);}).on('keydown',(event,d)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();locationDialog(d.id);}});
 markers.append('rect').attr('class','marker-hit').attr('fill','transparent').attr('pointer-events','all');
 markers.append('circle').attr('r',20).attr('fill','transparent').attr('stroke','none');
 markers.append('title').text(d=>`${d.name} — ${d.sub}`);
 markers.append('circle').attr('r',12).attr('fill',d=>colors[d.category]).attr('opacity',.22).attr('filter','url(#marker-glow)');
 markers.append('circle').attr('class','marker-ring').attr('r',10).attr('fill',d=>`${colors[d.category]}18`).attr('stroke',d=>colors[d.category]).attr('stroke-width','.7');
 markers.append('circle').attr('r',3.5).attr('fill',d=>colors[d.category]).attr('stroke','#09212c').attr('stroke-width','1');
 markers.append('text').attr('class','marker-label').attr('x',d=>d.offset[0]).attr('y',d=>d.offset[1]).attr('text-anchor',d=>d.offset[0]<0?'end':'start').text(d=>d.label);
 const bearing=svg.append('g').attr('transform','translate(765,563)').attr('aria-hidden','true');bearing.append('path').attr('d','M0 -17V17M-12 0H12M0 -17L-3 -8H3Z').attr('stroke','#abc7c1').attr('stroke-width','.7').attr('fill','#abc7c1');bearing.append('text').text('N').attr('y',-25).attr('text-anchor','middle').attr('fill','#a7c4bd').attr('font-size','9');
 function visible(coord){return d3.geoDistance(coord,[-projection.rotate()[0],-projection.rotate()[1]])<40*Math.PI/180-.01;}
 function redraw(){
  [sphere,graticule,landShape,greenlandShape,borders,arcticCircle].forEach(selection=>selection.attr('d',path));
  const scale=projection.scale()/baseScale*baseRadius;defs.select('#sphere-clip circle').attr('r',scale);
  rings.selectAll('circle').attr('r',(_,i)=>scale+18+(i*17));
  routePaths.attr('d',path).attr('opacity',d=>mapLayer==='all'||mapLayer==='security'?(d.kind==='cable'&&currentMove<2?.18:.65):.08);
  labels.attr('transform',d=>`translate(${projection(d.coord)})`).attr('display',d=>visible(d.coord)?null:'none');
  polar.attr('transform',`translate(${projection([0,90])})`).attr('display',visible([0,90])?null:'none');
  markers.attr('transform',d=>`translate(${projection(d.coord)})`).attr('display',d=>visible(d.coord)&&(mapLayer==='all'||mapLayer===d.category)?null:'none').attr('tabindex',d=>visible(d.coord)&&(mapLayer==='all'||mapLayer===d.category)?0:-1);
  markers.selectAll('.marker-ring').attr('opacity',d=>d.moves.includes(currentMove)?1:.45).attr('r',d=>d.moves.includes(currentMove)?11:8);
  markers.selectAll('.marker-label').attr('display',d=>['polaris','cables','pituffik'].includes(d.id)&&mapLayer==='all'? 'none':null).attr('opacity',d=>d.moves.includes(currentMove)?1:.7);
  markers.each(function(){const label=this.querySelector('text');const b=label.getBBox();const x=Math.min(-20,b.x-4),y=Math.min(-20,b.y-4);d3.select(this).select('.marker-hit').attr('x',x).attr('y',y).attr('width',Math.max(20,b.x+b.width+4)-x).attr('height',Math.max(20,b.y+b.height+4)-y);});
 }
 mapRedraw=redraw;redraw();
 let startRotation,startPoint;
 svg.call(d3.drag().filter(event=>!event.touches&&event.pointerType!=='touch'&&(!event.button)&&!event.target.closest('.place-point')).on('start',event=>{startRotation=projection.rotate();startPoint=[event.x,event.y];}).on('drag',event=>{if(!startPoint)return;projection.rotate([startRotation[0]+(event.x-startPoint[0])*.18,Math.max(-90,Math.min(-60,startRotation[1]-(event.y-startPoint[1])*.12)),0]);redraw();}).on('end',()=>{startPoint=null;}));
 $('#zoom-in').addEventListener('click',()=>{zoomLevel=Math.min(1.7,zoomLevel+.15);projection.scale(baseScale*zoomLevel);redraw();});
 $('#zoom-out').addEventListener('click',()=>{zoomLevel=Math.max(.75,zoomLevel-.15);projection.scale(baseScale*zoomLevel);redraw();});
 $('#reset-map').addEventListener('click',()=>{zoomLevel=1;projection.rotate([30,-90,0]).scale(baseScale);redraw();});
}

$$('[data-move]').forEach(button=>{button.addEventListener('click',()=>renderMove(Number(button.dataset.move)));button.addEventListener('keydown',event=>keyboardTabs(event,[0,1,2],currentMove,index=>renderMove(index,true)));});
$('#previous-move').addEventListener('click',()=>renderMove(currentMove-1));$('#next-move').addEventListener('click',()=>renderMove(currentMove+1));
$$('[data-country]').forEach(button=>{button.addEventListener('click',()=>renderCountry(button.dataset.country));button.addEventListener('keydown',event=>{const keys=Object.keys(COUNTRIES);keyboardTabs(event,keys,keys.indexOf(currentCountry),key=>renderCountry(key,true));});});
$$('[data-layer]').forEach(button=>button.addEventListener('click',()=>{mapLayer=button.dataset.layer;$$('[data-layer]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});if(mapRedraw)mapRedraw();$('#announce').textContent=`Map showing ${mapLayer==='all'?'all scenario locations':mapLayer+' locations'}.`;}));
document.addEventListener('click',event=>{
 const place=event.target.closest('[data-place]');if(place){locationDialog(place.dataset.place);return;}
 if(event.target.closest('.source-trigger')){sourceDialog();return;}
 const choice=event.target.closest('[data-choice]');if(choice){choosePolicy(choice.dataset.choice);return;}
 const revisit=event.target.closest('[data-revisit]');if(revisit){decisionStep=Number(revisit.dataset.revisit);renderDecision();$('#decision-content h3').setAttribute('tabindex','-1');$('#decision-content h3').focus({preventScroll:true});return;}
 if(event.target.closest('#next-decision')&&choices[decisionStep]!==null){decisionStep++;renderDecision();$('#decision-content h3').setAttribute('tabindex','-1');$('#decision-content h3').focus({preventScroll:true});return;}
 if(event.target.closest('#restart-decisions')){choices=[null,null,null];decisionStep=0;renderDecision();return;}
 if(event.target.closest('#download-briefing')){downloadBriefing();return;}
 if(event.target.closest('#back-locations'))locationIndex();
});
$('#location-list').addEventListener('click',locationIndex);$('#compare-teams').addEventListener('click',compareDialog);$('#glossary-trigger').addEventListener('click',glossaryDialog);
$('#close-dialog').addEventListener('click',()=>$('#detail-dialog').close());
$('#detail-dialog').addEventListener('close',()=>{document.body.style.overflow='';});
$('#detail-dialog').addEventListener('click',event=>{if(event.target===$('#detail-dialog')){const bounds=event.target.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)event.target.close();}});
$('#recommendations').innerHTML=RECOMMENDATIONS.map((item,i)=>`<details class="recommendation"><summary><span class="rec-number">0${i+1}</span><h3>${item.title}</h3><span class="rec-tag">${item.tag}</span><span class="expand" aria-hidden="true">+</span></summary><div><p>${item.text}</p><a href="assets/report.pdf#page=8" target="_blank" rel="noopener">Policy recommendations · report p. 6 ↗</a></div></details>`).join('');
renderMove(0);renderCountry('denmark');renderDecision();initMap();

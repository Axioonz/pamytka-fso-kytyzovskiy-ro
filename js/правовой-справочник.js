/* Правовой справочник: навигация по статьям, частям и пунктам.
   Используются только реальные тексты из docsData и связи из RELATED_NORMS. */
(function () {
  "use strict";
  const modal=document.getElementById("normModal");
  const cards=[...document.querySelectorAll("#page-basis .basis-card[data-norm]")];
  const article=document.getElementById("modalArticle");
  const related=document.getElementById("modalRelated");
  if(!modal||!cards.length||!article||!related||typeof findLegalUnit!=="function") return;

  const docList=JSON.parse(document.getElementById("docsData").textContent);
  const documents=Object.fromEntries(docList.map(d=>[d.id,d]));
  const html=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  let activeCard=null,activeNorm=null,sourceItems=[],currentSource=null,activeLineData=[];

  /* Переносим существующие элементы, не удаляя кнопки закрытия и шпаргалки. */
  const card=modal.querySelector(".modal-card");
  const summary=document.getElementById("modalShort");
  const form=document.getElementById("modalFormula");
  const full=document.getElementById("modalOpenDoc");
  const grid=document.createElement("div");
  grid.className="nm-grid";
  const nav=document.createElement("aside");
  nav.className="nm-nav";
  nav.setAttribute("aria-label","Навигация по статьям и пунктам");
  const navArticles=document.createElement("div");
  navArticles.className="nm-nav-articles";
  const navParts=document.createElement("div");
  navParts.className="nm-nav-parts";
  nav.append(navArticles,navParts);
  const content=document.createElement("section");
  content.className="nm-content";
  const sourceHeader=document.createElement("div");
  sourceHeader.className="nm-article-heading";
  const sourceKicker=document.createElement("div");
  sourceKicker.className="nm-article-kicker";
  const sourceTitle=document.createElement("b");
  sourceHeader.append(sourceKicker,sourceTitle);
  content.append(sourceHeader,article);
  grid.append(content);
  form.after(grid);
  const relatedWrap=document.createElement("section");
  relatedWrap.className="nm-related-wrap";
  related.parentNode.insertBefore(relatedWrap,related);
  relatedWrap.appendChild(related);
  grid.after(relatedWrap);
  modal.setAttribute("role","dialog");
  modal.setAttribute("aria-modal","true");
  modal.setAttribute("aria-labelledby","modalTitle");

  function expandNumbers(input) {
    const list=[];
    const re=/(\d+(?:\.\d+)*)(?:\s*[–−-]\s*(\d+(?:\.\d+)*))?/g;
    let m;
    while((m=re.exec(String(input||"")))!==null){
      const first=m[1],last=m[2];
      if(!last){list.push(first);continue;}
      const a=first.split("."), b=last.split(".");
      if(a.length!==b.length || a.slice(0,-1).join(".")!==b.slice(0,-1).join(".")){
        list.push(first,last);continue;
      }
      const n=Number(a[a.length-1]),z=Number(b[b.length-1]);
      if(z<n || z-n>20){list.push(first,last);continue;}
      const prefix=a.slice(0,-1);
      for(let i=n;i<=z;i++)list.push([...prefix,i].join("."));
    }
    return [...new Set(list)];
  }
  function referencesFor(x) {
    const label=String(x.r||"");
    const marker=/(?:^|\s)(?:ст\.|п\.)\s*/i.exec(label);
    const candidates=marker?expandNumbers(label.slice(marker.index+marker[0].length).split(/\s+(?:ч\.|п\.)/i)[0]):[];
    const numbers=[...new Set([String(x.a||""),...candidates].filter(Boolean))];
    return numbers.slice(0,22).map(num=>({doc:x.doc,article:num,chapter:x.chapter||"",label:"ст. "+num}));
  }
  function focusReference(x) {
    const str=String(x.r||"");
    const parts=[],points=[];
    for(const m of str.matchAll(/ч\.\s*(\d+(?:\.\d+)?(?:\s*[–−-]\s*\d+(?:\.\d+)?)?)/gi))parts.push(...expandNumbers(m[1]));
    for(const m of str.matchAll(/п\.\s*(\d+(?:\.\d+)?(?:\s*[–−-]\s*\d+(?:\.\d+)?)?)/gi)){
      /* "ПДД п. 4.1" и "ПГО п. 1.20" являются самостоятельными пунктами документа. */
      if(/^(?:ПДД|ПГО)\b/i.test(str))continue;
      points.push(...expandNumbers(m[1]));
    }
    return {parts:new Set(parts),points:new Set(points)};
  }
  function key(item){return [item.doc,item.chapter||"",item.article||""].join(":");}
  function label(item){
    const d=documents[item.doc];
    if(!item.article)return d?.title||item.doc;
    return (d?.category==="Правила проекта"?"п. ":"ст. ")+item.article;
  }
  function makeArticleList(){
    navArticles.innerHTML='<div class="nm-nav-list">'+
      sourceItems.map(item=>'<button type="button" data-nm-source="'+html(key(item))+'" class="'+(currentSource&&key(currentSource)===key(item)?"active":"")+'" aria-pressed="'+(currentSource&&key(currentSource)===key(item))+'">'+html(label(item))+'<small>'+html(documents[item.doc]?.title||item.doc)+'</small></button>').join("")+'</div>';
  }
  function classifyLines(unit,x,item){
    const lines=unit.text.split("\n");
    const target=(item.doc===x.doc && String(item.article)===String(x.a))?focusReference(x):{parts:new Set(),points:new Set()};
    let activePart="";
    return lines.map((line,index)=>{
      const title=index===0;
      const part=!title?line.match(/^(\d+(?:\.\d+)?)\.\s+/):null;
      const point=!title?line.match(/^(\d+(?:\.\d+)?)\)\s+/):null;
      if(part)activePart=part[1];
      const selectedPart=Boolean(part&&target.parts.has(part[1]));
      /* ПДД и ПГО нумеруют саму норму как пункт, а не часть внутри статьи. */
      const unitIsPoint=title && /^(?:ПДД|ПГО)\b/i.test(String(x.r||""))
        && item.doc===x.doc && referencesFor(x).some(ref=>ref.article===String(item.article));
      const selectedPoint=Boolean(unitIsPoint||(point&&target.points.has(point[1])&&(!target.parts.size||target.parts.has(activePart)||!activePart)));
      return {line,index,kind:title?"heading":part?"part":point?"point":"text",number:part?.[1]||point?.[1]||"",selectedPart,selectedPoint,selected:selectedPart||selectedPoint};
    });
  }
  function makePartList(){
    const items=activeLineData.filter(item=>item.kind==="part"||item.kind==="point");
    const note=items.length?"":'<div class="nm-nav-note">В статье нет отдельно пронумерованных частей или пунктов.</div>';
    navParts.innerHTML='<hr class="nm-nav-divider">'+note+
      (items.length?'<div class="nm-nav-list">'+items.map(item=>
        '<button type="button" data-nm-line="'+item.index+'" class="'+(item.selected?"nm-focus":"")+'" title="'+html(item.line)+'">'+
        (item.kind==="point"?"Пункт ":"Часть ")+html(item.number)+
        '<small>'+html(item.line.replace(/^\d+(?:\.\d+)?[.)]\s*/,"").slice(0,70))+'</small></button>'
      ).join("")+'</div>':"");
  }
  function paintArticle(){
    const item=currentSource,doc=documents[item.doc];
    sourceKicker.textContent=(doc?.title||"Документ")+(item.chapter?" · глава "+item.chapter:"");
    sourceTitle.textContent=label(item);
    if(!doc){
      article.classList.remove("nm-whole-article");
      article.innerHTML='<div class="nm-article-note">Документ отсутствует в базе памятки.</div>';
      activeLineData=[];makePartList();return;
    }
    const unit=findLegalUnit(doc.text,item.article,item.chapter||"");
    if(!unit){
      article.classList.remove("nm-whole-article");
      article.innerHTML='<div class="nm-article-note">Не удалось однозначно найти эту статью в сохранённом документе. Проверьте её в разделе «Документы».</div>';
      activeLineData=[];makePartList();return;
    }
    activeLineData=classifyLines(unit,activeNorm,item);
    const focus=focusReference(activeNorm);
    const isPrimary=item.doc===activeNorm.doc && String(item.article)===String(activeNorm.a);
    const numbered=activeLineData.filter(row=>row.kind==="part"||row.kind==="point");
    const allNumberedSelected=numbered.length>0 && numbered.every(row=>row.selected);
    // Ссылка на всю статью, включая случаи, когда явно перечислены ВСЕ её части.
    const wholeArticle=isPrimary && ((!focus.parts.size&&!focus.points.size) || allNumberedSelected);
    article.classList.toggle("nm-whole-article",wholeArticle);
    article.innerHTML=wholeArticle
      ? '<div class="nm-whole-block">'+html(unit.text)+'</div>'
      : activeLineData.map(row=>
          '<div class="nm-line nm-'+row.kind+(row.selectedPart?" nm-selected":"")+(row.selectedPoint?" nm-selected-point":"")+'" data-nm-index="'+row.index+'">'+html(row.line)+'</div>'
        ).join("");
    const first=wholeArticle?null:(activeLineData.find(r=>r.selectedPoint)||activeLineData.find(r=>r.selectedPart));
    if(first){
      requestAnimationFrame(()=>{
        const target=article.querySelector('[data-nm-index="'+first.index+'"]');
        if(target)article.scrollTop=Math.max(0,target.offsetTop-article.offsetTop-28);
      });
    }else article.scrollTop=0;
  }
  function addSource(item){
    if(!item?.doc||!item?.article)return;
    const normalized={doc:item.doc,article:String(item.article),chapter:item.chapter||"",label:item.label||""};
    if(!sourceItems.some(x=>key(x)===key(normalized)))sourceItems.push(normalized);
    currentSource=sourceItems.find(x=>key(x)===key(normalized));
    paintArticle();
  }
  function renderRelated(){
    const x=activeNorm;
    const norms=[],seen=new Set(sourceItems.map(key));
    const mainArticle=String(x.a||"");
    const table=(typeof RELATED_NORMS!=="undefined"?RELATED_NORMS:{});
    const links=table[typeof relatedKey==="function"?relatedKey(x.doc,mainArticle,x.chapter||""):x.doc+":"+mainArticle]
      || table[x.doc+":"+mainArticle] || [];
    for(const r of links){
      const target={doc:r.doc,article:String(r.article||r.a||""),chapter:r.chapter||"",label:r.label||"",note:r.note||""};
      if(!target.doc||!documents[target.doc])continue;
      if(target.article && seen.has(key(target)))continue;
      if(target.article && !findLegalUnit(documents[target.doc].text,target.article,target.chapter))continue;
      const k=key(target);if(seen.has(k))continue;seen.add(k);norms.push(target);
    }
    let out="";
    if(norms.length){
      out+='<div class="nm-related-section"><h4>Связанные нормы</h4><div class="nm-related-list">'+norms.map(r=>
        '<button class="nm-related-link" type="button" data-nm-doc="'+html(r.doc)+'" data-nm-article="'+html(r.article)+'" data-nm-chapter="'+html(r.chapter)+'"><b>'+html(r.label||label(r))+'</b><small>'+html(r.note||documents[r.doc]?.title||"")+'</small></button>'
      ).join("")+'</div></div>';
    }
    if(x.rel)out+='<p class="nm-related-note"><b>Дополнительные ссылки из основания</b> · '+html(x.rel)+'</p>';
    if(x.scenario)out+='<div class="nm-related-section"><h4>Практическая ситуация</h4><div class="nm-related-list"><button type="button" class="nm-related-link" data-local-scenario="'+html(x.scenario)+'">Открыть порядок действий</button></div></div>';
    if(!out)out='<p class="nm-related-note">Для этого основания дополнительные связи в памятке не указаны.</p>';
    related.innerHTML=out;
  }
  function openBasisPanel(el){
    let x;try{x=JSON.parse(el.dataset.norm)}catch(_){return;}
    activeCard=el;activeNorm=x;
    /* Сохраняем глобальную текущую норму для функции добавления в шпаргалку. */
    if(typeof currentNorm!=="undefined")currentNorm=x;
    document.getElementById("modalTitle").textContent=x.t||"Основание";
    document.getElementById("modalRef").textContent=(documents[x.doc]?.title||"Документ")+" · "+(x.r||"");
    const refs=typeof normReferences==="function"?normReferences(x):[{doc:x.doc,a:x.a,chapter:x.chapter||""}];
    const pending=refs.some(r=>documents[r.doc]?.reviewRequired);
    summary.textContent=(pending?"Текст основания обновлён. Пояснение требует повторной сверки. ":"")+(x.s||"");
    form.innerHTML=x.f?'<div class="formula"><b>Формулировка</b><p>'+html(x.f)+'</p></div>':"";
    sourceItems=referencesFor(x);
    const primary={doc:x.doc,article:String(x.a||""),chapter:x.chapter||""};
    if(!sourceItems.some(r=>key(r)===key(primary)))sourceItems.unshift(primary);
    /* Показываем ссылки из refs, если они содержатся в сохранённой карточке. */
    for(const r of refs){
      const extra={doc:r.doc,article:String(r.a||r.article||""),chapter:r.chapter||""};
      if(extra.doc&&extra.article&&!sourceItems.some(v=>key(v)===key(extra)))sourceItems.push(extra);
    }
    currentSource=sourceItems.find(r=>key(r)===key(primary))||sourceItems[0];
    paintArticle();
    renderRelated();
    modal.classList.add("open");
    modal.querySelector(".modal-close")?.focus();
  }
  /* Кнопка добавления остаётся прежней по действию, меняется только размер. */
  [...modal.querySelectorAll("button")].filter(button=>/в мою шпаргалку/i.test(button.textContent||"")).forEach(button=>button.classList.add("nm-save-compact"));
  cards.forEach(card=>{card.onclick=()=>openBasisPanel(card);});
  nav.addEventListener("click",e=>{
    const source=e.target.closest("button[data-nm-source]");
    if(source){
      const target=sourceItems.find(item=>key(item)===source.dataset.nmSource);
      if(target){currentSource=target;paintArticle();}
      return;
    }
    const line=e.target.closest("button[data-nm-line]");
    if(line){
      const index=Number(line.dataset.nmLine);
      const node=article.querySelector('[data-nm-index="'+index+'"]');
      if(node){
        article.scrollTop=Math.max(0,node.offsetTop-article.offsetTop-28);
        node.focus?.({preventScroll:true});
        nav.querySelectorAll("[data-nm-line]").forEach(b=>b.classList.toggle("active",b===line));
      }
    }
  });
  related.addEventListener("click",e=>{
    const link=e.target.closest("[data-nm-doc]");
    if(link){
      if(link.dataset.nmArticle)addSource({doc:link.dataset.nmDoc,article:link.dataset.nmArticle,chapter:link.dataset.nmChapter||""});
      else if(typeof openDoc==="function")openDoc(link.dataset.nmDoc);
      return;
    }
    const cardLink=e.target.closest("[data-nm-card]");
    if(cardLink){const target=cards[Number(cardLink.dataset.nmCard)];if(target)openBasisPanel(target);}
  });
  full.onclick=()=>{
    if(!currentSource||typeof openDoc!=="function")return;
    modal.classList.remove("open");
    openDoc(currentSource.doc,currentSource.article,currentSource.chapter||"");
  };
})();


/* Раскрытие правовых норм непосредственно в текущем разделе памятки. */
(() => {
  "use strict";
  const docsNode=document.getElementById("docsData");
  if(!docsNode || typeof findLegalUnit!=="function" || typeof legalUnits!=="function")return;
  const documents=Object.fromEntries(JSON.parse(docsNode.textContent).map(d=>[d.id,d]));
  const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const numberPattern=/^\d+(?:\.\d+)*$/;
  const viewer=document.createElement("section");
  viewer.className="inline-law-viewer";
  viewer.setAttribute("aria-label","Текст правовой нормы");
  let lastTrigger=null,entries=[],active=0;

  function expandRange(start,end){
    if(!end)return [start];
    const a=start.split("."),b=end.split(".");
    if(a.length!==b.length || a.slice(0,-1).join(".")!==b.slice(0,-1).join("."))return [start,end];
    const x=Number(a.at(-1)),y=Number(b.at(-1));
    if(!Number.isInteger(x)||!Number.isInteger(y)||y<x||y-x>15)return [start,end];
    return Array.from({length:y-x+1},(_,i)=>[...a.slice(0,-1),String(x+i)].join("."));
  }
  function readNumbers(label){
    const match=String(label||"").match(/(?:ст(?:атья|атьи|атью)?\.?|п(?:ункт|ункты)?\.?)\s*(\d+(?:\.\d+)*)(?:\s*([–−-]|,)\s*(\d+(?:\.\d+)*))?/i);
    if(!match)return [];
    return match[2]===","?[match[1],match[3]]:expandRange(match[1],match[3]);
  }
  function selectionFor(button,doc){
    const label=button.textContent||"";
    const part=button.dataset.part||label.match(/(?:^|[\s,(])ч(?:асть)?\.?\s*(\d+(?:\.\d+)*)/i)?.[1]||"";
    // В правилах проекта «п. 12.4» обозначает саму норму, а не пункт внутри статьи.
    const point=button.dataset.point||(doc?.category!=="Правила проекта" && /(?:^|[\s,(])ст(?:атья|атьи|атью)?\.?\s*\d/i.test(label)
      ? label.match(/(?:^|[\s,(])п(?:ункт)?\.?\s*(\d+(?:\.\d+)*)/i)?.[1]||"" : "");
    return {part:String(part),point:String(point)};
  }
  function references(button,doc){
    const explicit=button.dataset.article||button.dataset.cart||button.dataset.territoryArticle||"";
    const nums=explicit?[explicit]:readNumbers(button.textContent);
    const chapter=button.dataset.chapter||button.dataset.cchap||"";
    const seen=new Set(),out=[];
    for(const num of nums){
      if(!numberPattern.test(num))continue;
      const candidates=legalUnits(doc.text).filter(u=>u.num===num&&(!chapter||u.chapter===chapter.toUpperCase()));
      // При повторении номера в разных главах предлагаем точный выбор, а не берём первый.
      if(!candidates.length){
        const k=chapter+":"+num;
        if(!seen.has(k)){seen.add(k);out.push({num,chapter,missing:true});}
      }else{
        for(const unit of candidates){
          const k=unit.chapter+":"+num;
          if(!seen.has(k)){seen.add(k);out.push({num,chapter:unit.chapter||"",unit});}
        }
      }
    }
    return out.slice(0,18);
  }
  function lineMarker(text){
    const s=text.trim();
    const part=s.match(/^(?:ч\.\s*|часть\s+)(\d+(?:\.\d+)*)\b/i);
    const numbered=s.match(/^(\d+(?:\.\d+)*)([.)])\s+/);
    const letter=s.match(/^([а-яёa-z])\)\s+/i);
    return {
      part:part?.[1]||(numbered?.[2]==="."?numbered[1]:""),
      point:numbered?.[2]===")"?numbered[1]:(letter?.[1]||""),
      boundary:Boolean(part||numbered||letter)
    };
  }
  function content(entry){
    const doc=documents[entry.doc],ref=entry.ref,selection=entry.selection;
    if(!ref.unit)return '<p class="inline-law-empty">Норма не найдена однозначно в сохранённом документе. Проверьте номер статьи и главу.</p>';
    const raw=doc.category==="Правила проекта"
      ?cleanRulesDisplayText(ref.unit.text)
      :cleanLegalDisplayText(ref.unit.text);
    const lines=raw.split("\n");
    const targeted=Boolean(selection.part||selection.point);
    if(!targeted)return '<div class="inline-law-whole">'+escapeHtml(raw)+'</div>';
    let part="",point="",found=false;
    const rows=lines.map((line,index)=>{
      const marker=index?lineMarker(line):{part:"",point:"",boundary:false};
      if(marker.part)part=marker.part;
      if(marker.point)point=marker.point;
      else if(marker.boundary)point="";
      // Когда указан пункт, подсвечиваем только его. Часть задаёт контекст.
      const matches=selection.point
        ?point===selection.point && (!selection.part||part===selection.part)
        :part===selection.part;
      if(matches)found=true;
      return '<div class="inline-law-line'+(matches?' inline-law-selected':'')+'">'+escapeHtml(line||" ")+'</div>';
    }).join("");
    return (found?"":'<p class="inline-law-warning">Указанная часть или пункт не найдены. Ниже приведён полный текст без выделения.</p>')+rows;
  }
  function render(){
    const current=entries[active],doc=documents[current.doc],ref=current.ref;
    const sub=(doc?.category==="Правила проекта"?"п. ":"ст. ")+ref.num+(ref.chapter?" · гл. "+ref.chapter:"");
    const tabs=entries.length>1?'<div class="inline-law-tabs" role="tablist" aria-label="Ссылки на нормы">'+entries.map((e,i)=>
      '<button type="button" data-inline-tab="'+i+'" class="'+(i===active?"active":"")+'" role="tab" aria-selected="'+(i===active)+'">'+
      escapeHtml((documents[e.doc]?.category==="Правила проекта"?"п. ":"ст. ")+e.ref.num+(e.ref.chapter?" · гл. "+e.ref.chapter:""))+'</button>').join("")+'</div>':"";
    viewer.innerHTML='<div class="inline-law-head"><div><small>ПРАВОВАЯ НОРМА</small><h4>'+escapeHtml(doc?.title||current.doc)+'</h4><span>'+escapeHtml(sub)+'</span></div><button type="button" class="inline-law-close" data-inline-close aria-label="Закрыть статью">×</button></div>'+
      tabs+(doc?.reviewRequired?'<p class="inline-law-warning">Документ требует повторной сверки.</p>':"")+
      '<div class="inline-law-body">'+content(current)+'</div>';
    viewer.querySelector("[data-inline-close]").addEventListener("click",()=>{
      viewer.remove();lastTrigger=null;
    });
    viewer.querySelectorAll("[data-inline-tab]").forEach(tab=>tab.addEventListener("click",()=>{
      active=Number(tab.dataset.inlineTab);render();
    }));
  }
  document.addEventListener("click",e=>{
    const button=e.target.closest(".open-doc[data-doc], [data-cdoc][data-cart], [data-territory-article]");
    if(!button || button.closest("#page-laws, #normModal, .inline-law-viewer"))return;
    const page=button.closest(".page");
    if(!page)return;
    const id=button.dataset.doc||button.dataset.cdoc||(button.hasAttribute("data-territory-article")?"territory":"");
    const doc=documents[id];
    if(!doc)return;
    const refs=references(button,doc);
    // Ссылки на документ без конкретной нормы продолжают открывать «Законодательство».
    if(!refs.length)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if(lastTrigger===button && viewer.isConnected){viewer.remove();lastTrigger=null;return;}
    const select=selectionFor(button,doc);
    entries=refs.map(ref=>({doc:id,ref,selection:select}));
    active=0;lastTrigger=button;
    const anchor=button.closest(".refs, .sit-refs, .scenario-law-links, .cross-doc-results, .convoy-law-links")||button;
    anchor.insertAdjacentElement("afterend",viewer);
    render();
    viewer.scrollIntoView({behavior:"smooth",block:"nearest"});
  },true);
})();

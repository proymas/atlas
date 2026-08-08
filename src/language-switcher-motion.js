const STYLE_ID='atlas-language-switcher-motion';

function installStyles(){
  if(document.getElementById(STYLE_ID)) return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    .language-switcher{
      position:relative;
      isolation:isolate;
      display:grid!important;
      grid-template-columns:1fr 1fr;
      gap:0!important;
      overflow:hidden;
    }
    .language-switcher::before{
      content:'';
      position:absolute;
      z-index:0;
      top:3px;
      bottom:3px;
      left:3px;
      width:calc(50% - 3px);
      border-radius:9px;
      background:linear-gradient(135deg,#63d4ff,#8794ff);
      transform:translateX(0);
      transition:transform 220ms cubic-bezier(.22,.8,.24,1);
      pointer-events:none;
    }
    .language-switcher[data-active-locale='en']::before{
      transform:translateX(100%);
    }
    .language-switcher>span{
      display:none!important;
    }
    .language-switcher button{
      position:relative;
      z-index:1;
      margin:0!important;
      border-color:transparent!important;
      background:transparent!important;
      box-shadow:none!important;
      color:#a9bdd4;
      transition:color 160ms ease!important;
    }
    .language-switcher button:hover,
    .language-switcher button:focus-visible{
      background:transparent!important;
      box-shadow:none!important;
    }
    .language-switcher button[aria-pressed='true']{
      color:#07111f!important;
      border-color:transparent!important;
      background:transparent!important;
      box-shadow:none!important;
    }
    @media(prefers-reduced-motion:reduce){
      .language-switcher::before{transition:none!important}
    }
  `;
  document.head.appendChild(style);
}

function sync(){
  const switcher=document.querySelector('.language-switcher');
  if(!switcher) return;
  const active=switcher.querySelector('[data-locale][aria-pressed="true"]')?.dataset.locale;
  if(active==='es'||active==='en') switcher.dataset.activeLocale=active;
}

function init(){
  installStyles();
  sync();
  window.addEventListener('atlas:locale',sync);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
else init();

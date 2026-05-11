/* Petsidian - Obsidian native plugin */
"use strict";var C=Object.defineProperty;var Y=Object.getOwnPropertyDescriptor;var X=Object.getOwnPropertyNames;var G=Object.prototype.hasOwnProperty;var Q=(n,t)=>{for(var e in t)C(n,e,{get:t[e],enumerable:!0})},J=(n,t,e,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of X(t))!G.call(n,o)&&o!==e&&C(n,o,{get:()=>t[o],enumerable:!(i=Y(t,o))||i.enumerable});return n};var Z=n=>J(C({},"__esModule",{value:!0}),n);var ut={};Q(ut,{default:()=>I});module.exports=Z(ut);var k=require("obsidian");var r={width:1536,height:1872,columns:8,rows:9,cellWidth:192,cellHeight:208},W=["waving","jumping","waiting","running","review","failed"],y={waving:"Wave",jumping:"Jump",waiting:"Wait",running:"Run in place",review:"Review",failed:"Fail"},F={idle:{id:"idle",row:0,frameCount:6,frameDurationsMs:[280,110,110,140,140,320]},"running-right":{id:"running-right",row:1,frameCount:8,frameDurationsMs:[120,120,120,120,120,120,120,220]},"running-left":{id:"running-left",row:2,frameCount:8,frameDurationsMs:[120,120,120,120,120,120,120,220]},waving:{id:"waving",row:3,frameCount:4,frameDurationsMs:[140,140,140,280]},jumping:{id:"jumping",row:4,frameCount:5,frameDurationsMs:[140,140,140,140,280]},failed:{id:"failed",row:5,frameCount:8,frameDurationsMs:[140,140,140,140,140,140,140,240]},waiting:{id:"waiting",row:6,frameCount:6,frameDurationsMs:[150,150,150,150,150,260]},running:{id:"running",row:7,frameCount:6,frameDurationsMs:[120,120,120,120,120,220]},review:{id:"review",row:8,frameCount:6,frameDurationsMs:[150,150,150,150,150,280]}},K=.75;function D(n){return Math.max(.25,n*K)}function w(n){return typeof n=="string"&&W.includes(n)}function E(n){let t=D(n);return{width:Math.ceil(r.cellWidth*t),height:Math.ceil(r.cellHeight*t)}}function tt(n){var e;return(e=["#f8d98d","#f5c46c","#f2b85e","#f7d480","#ffce76","#b9c2d1","#c7d7ff","#e6bd7d","#bce8dc"][n])!=null?e:"#f8d98d"}function et(){let n=[];for(let e=0;e<r.rows;e+=1)for(let i=0;i<r.columns;i+=1){let o=i*r.cellWidth,s=e*r.cellHeight,d=e===4?-Math.abs(i%5-2)*7:Math.sin(i)*4,m=e===1?7:e===2?-7:0,g=e===3?i%2===0?-20:16:e===8?-8:0,u=e===5?"#b8b5c0":"#f3cdb5",p=tt(e),h=e===5?"#778399":"#2ca6a4",c=e===5?"M84 112 Q96 104 108 112":"M84 110 Q96 120 108 110";n.push(`
        <g transform="translate(${o+m} ${s+d})">
          <rect x="${-m}" y="${-d}" width="${r.cellWidth}" height="${r.cellHeight}" fill="transparent"/>
          <ellipse cx="96" cy="150" rx="46" ry="38" fill="#ffffff" opacity="0.98"/>
          <path d="M65 126 Q96 92 127 126 L122 154 Q96 171 70 154 Z" fill="${p}"/>
          <path d="M55 95 L18 69 L48 118 Z" fill="${u}"/>
          <path d="M137 95 L174 69 L144 118 Z" fill="${u}"/>
          <path d="M53 91 Q96 28 139 91 Q125 74 96 76 Q67 74 53 91 Z" fill="#f9e29b"/>
          <circle cx="76" cy="100" r="8" fill="${h}"/>
          <circle cx="116" cy="100" r="8" fill="${h}"/>
          <circle cx="78" cy="97" r="2.5" fill="#ffffff"/>
          <circle cx="118" cy="97" r="2.5" fill="#ffffff"/>
          <path d="${c}" fill="none" stroke="#5f4b43" stroke-width="4" stroke-linecap="round"/>
          <path d="M63 147 q${-16+g} ${e===6?12:-12} -22 28" fill="none" stroke="#f3cdb5" stroke-width="13" stroke-linecap="round"/>
          <path d="M129 147 q${16-g} ${e===6?12:-12} 22 28" fill="none" stroke="#f3cdb5" stroke-width="13" stroke-linecap="round"/>
          <rect x="70" y="132" width="52" height="54" rx="18" fill="#f7fbff"/>
          <text x="96" y="188" text-anchor="middle" font-family="Verdana, sans-serif" font-size="16" fill="#5d6877">Nia</text>
        </g>
      `)}let t=`<svg xmlns="http://www.w3.org/2000/svg" width="${r.width}" height="${r.height}" viewBox="0 0 ${r.width} ${r.height}">${n.join("")}</svg>`;return`data:image/svg+xml;charset=utf-8,${encodeURIComponent(t)}`}var f=[{id:"nia",displayName:"Nia",description:"Bundled fallback Nia pet using the OpenPet atlas layout and a generated SVG spritesheet.",spritesheetPath:"generated-nia-atlas.svg",spritesheetUrl:et(),imported:!1}];function x(n,t=f){var e,i;return(i=(e=t.find(o=>o.id===n))!=null?e:t[0])!=null?i:f[0]}function N(n){return n.spritesheetUrl}var S=24,it=96,nt=50;function U(n){return typeof n=="object"&&n!==null}function ot(n){return typeof n=="function"}function H(n){return U(n)?typeof n.getPrimaryDisplay=="function":!1}function z(n){if(!U(n)||!ot(n.BrowserWindow))return null;let t={BrowserWindow:n.BrowserWindow};return H(n.screen)&&(t.screen=n.screen),t}function st(){let n=window;if(typeof n.require!="function")throw new Error("Obsidian desktop did not expose window.require().");return n.require}function at(){var e;let n=st(),t=[];try{let i=z(n("@electron/remote"));if(i!==null)return i}catch(i){t.push(i instanceof Error?i.message:String(i))}try{let i=n("electron"),o=z(i.remote);if(o!==null){let s={BrowserWindow:o.BrowserWindow},d=(e=o.screen)!=null?e:H(i.screen)?i.screen:void 0;return d!==void 0&&(s.screen=d),s}}catch(i){t.push(i instanceof Error?i.message:String(i))}throw new Error(`Obsidian desktop did not expose Electron remote BrowserWindow APIs.${t.length>0?` ${t.join(" ")}`:""}`)}function O(n){return n===void 0?{x:0,y:0,width:window.screen.availWidth||1280,height:window.screen.availHeight||720}:n.getPrimaryDisplay().workArea}function B(n){let t=E(n.scale);return{width:Math.max(t.width+32,280),height:t.height+it}}function V(n,t){let e=B(n);return{x:Math.round(t.x+t.width-e.width-S),y:Math.round(t.y+t.height-e.height-S)}}function L(n){return JSON.stringify(n).replace(/</g,"\\u003c").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")}function rt(n){let t=x(n.activePetId,f),e=E(n.scale),i=D(n.scale),o={atlas:r,animations:F,settings:n,pet:{displayName:t.displayName,spritesheetUrl:N(t)},spriteSize:e,renderScale:i};return`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <style>
      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: transparent;
      }

      body {
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        user-select: none;
      }

      #root {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 8px;
        box-sizing: border-box;
        background: transparent;
      }

      #bubble {
        max-width: 260px;
        min-height: 0;
        padding: 8px 10px;
        border: 1px solid rgba(88, 95, 112, 0.24);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.92);
        color: #242936;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
        font-size: 13px;
        line-height: 1.35;
        overflow-wrap: anywhere;
        opacity: 0;
        transform: translateY(6px);
        transition:
          opacity 160ms ease,
          transform 160ms ease;
        pointer-events: none;
      }

      #bubble.visible {
        opacity: 1;
        transform: translateY(0);
      }

      #pet {
        width: ${e.width}px;
        height: ${e.height}px;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 999px;
        background-color: transparent;
        background-repeat: no-repeat;
        background-image: url("${N(t)}");
        background-size: ${r.width*i}px ${r.height*i}px;
        cursor: pointer;
        filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.22));
        transition: transform 160ms ease;
      }

      #pet:hover,
      #pet:focus-visible {
        outline: none;
        transform: translateY(-2px);
      }

      body.reduced-motion #bubble,
      body.reduced-motion #pet {
        transition: none;
      }
    </style>
  </head>
  <body>
    <main id="root" aria-live="polite">
      <div id="bubble"></div>
      <button id="pet" type="button" aria-label="Petsidian desktop pet"></button>
    </main>
    <script>
      (() => {
        "use strict";

        const state = ${L(o)};
        const petButton = document.getElementById("pet");
        const bubble = document.getElementById("bubble");
        let activeAnimationId = "idle";
        let animationStartedAtMs = performance.now();
        let actionEndsAtMs = 0;
        let bubbleTimerId = null;
        let walkingDirection = 1;

        function getAnimation(id) {
          return state.animations[id] || state.animations.idle;
        }

        function getAnimationDuration(animation) {
          return animation.frameDurationsMs.reduce((sum, value) => sum + value, 0);
        }

        function getFrameAtTime(animation, elapsedMs) {
          const totalDuration = getAnimationDuration(animation);
          if (totalDuration <= 0) return 0;
          const cursor = ((elapsedMs % totalDuration) + totalDuration) % totalDuration;
          let consumed = 0;
          for (let index = 0; index < animation.frameDurationsMs.length; index += 1) {
            consumed += animation.frameDurationsMs[index] || 0;
            if (cursor < consumed) return index;
          }
          return Math.max(0, animation.frameCount - 1);
        }

        function getFrameOffset(animation, frame) {
          const safeFrame = Math.min(Math.max(0, frame), animation.frameCount - 1);
          const renderScale = Math.max(0.25, state.settings.scale * 0.75);
          return {
            x: -safeFrame * state.atlas.cellWidth * renderScale,
            y: -animation.row * state.atlas.cellHeight * renderScale
          };
        }

        function pickActionFromPool() {
          const pool = Array.isArray(state.settings.clickActionPool) && state.settings.clickActionPool.length > 0
            ? state.settings.clickActionPool
            : [state.settings.clickAction || "waving"];
          return pool[Math.floor(Math.random() * pool.length)] || state.settings.clickAction || "waving";
        }

        function applySettings(nextSettings) {
          state.settings = { ...state.settings, ...nextSettings };
          const spriteWidth = Math.ceil(state.atlas.cellWidth * Math.max(0.25, state.settings.scale * 0.75));
          const spriteHeight = Math.ceil(state.atlas.cellHeight * Math.max(0.25, state.settings.scale * 0.75));
          petButton.style.width = spriteWidth + "px";
          petButton.style.height = spriteHeight + "px";
          petButton.style.backgroundSize =
            (state.atlas.width * Math.max(0.25, state.settings.scale * 0.75)) + "px " +
            (state.atlas.height * Math.max(0.25, state.settings.scale * 0.75)) + "px";
          document.body.classList.toggle("reduced-motion", Boolean(state.settings.reducedMotion));
        }

        function hideBubble() {
          bubble.classList.remove("visible");
        }

        function showBubble(text, ttlMs) {
          if (!state.settings.bubblesEnabled) return;
          const normalized = String(text || "").trim();
          if (normalized.length === 0) return;
          bubble.textContent = normalized.slice(0, 512);
          bubble.classList.add("visible");
          if (bubbleTimerId !== null) window.clearTimeout(bubbleTimerId);
          bubbleTimerId = window.setTimeout(hideBubble, ttlMs || state.settings.bubbleTtlMs || 4000);
        }

        function playAction(animationId, bubbleText, ttlMs) {
          activeAnimationId = typeof animationId === "string" && state.animations[animationId] ? animationId : "waving";
          const now = performance.now();
          animationStartedAtMs = now;
          actionEndsAtMs = now + getAnimationDuration(getAnimation(activeAnimationId));
          if (bubbleText !== undefined && bubbleText !== null) showBubble(bubbleText, ttlMs);
        }

        function renderFrame(now) {
          if (activeAnimationId !== "idle" && now >= actionEndsAtMs) {
            activeAnimationId = "idle";
            animationStartedAtMs = now;
            actionEndsAtMs = 0;
          }

          const animationId =
            state.settings.autonomousWalking && !state.settings.reducedMotion && activeAnimationId === "idle"
              ? walkingDirection > 0
                ? "running-right"
                : "running-left"
              : activeAnimationId;
          const animation = getAnimation(animationId);
          const elapsedMs = state.settings.reducedMotion ? 0 : now - animationStartedAtMs;
          const frame = state.settings.reducedMotion ? 0 : getFrameAtTime(animation, elapsedMs);
          const offset = getFrameOffset(animation, frame);
          petButton.style.backgroundPosition = offset.x + "px " + offset.y + "px";
          window.requestAnimationFrame(renderFrame);
        }

        petButton.addEventListener("click", () => {
          const animationId = state.settings.clickActionMode === "random"
            ? pickActionFromPool()
            : state.settings.clickAction;
          playAction(animationId, "Hi from Petsidian!", state.settings.bubbleTtlMs);
        });

        petButton.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          showBubble("Use Obsidian commands to control Petsidian.", state.settings.bubbleTtlMs);
        });

        window.PetsidianRenderer = {
          updateSettings: applySettings,
          playAction,
          say: showBubble,
          setWalkingDirection: (direction) => {
            walkingDirection = direction >= 0 ? 1 : -1;
          }
        };

        applySettings(state.settings);
        window.requestAnimationFrame(renderFrame);
      })();
    <\/script>
  </body>
</html>`}var T=class{constructor(t){this.runtime=null;this.window=null;this.walkingTimerId=null;this.walkingDirection=1;this.lastWalkTickMs=0;this.getSettings=t}async show(){let t=await this.ensureWindow();this.applyNativeSettings(t),this.clampWindowToWorkArea(t),t.show(),await this.refreshFromSettings()}hide(){this.stopWalking(),this.window!==null&&!this.window.isDestroyed()&&this.window.hide()}destroy(){this.stopWalking();let t=this.window;this.window=null,t!==null&&!t.isDestroyed()&&(t.close(),t.isDestroyed()||t.destroy())}async refreshFromSettings(){let t=this.window;if(t===null||t.isDestroyed())return;let e=this.getSettings(),i=B(e);t.setSize(i.width,i.height,!1),this.applyNativeSettings(t),this.clampWindowToWorkArea(t),await this.executeRendererMethod("updateSettings",e),this.updateWalkingState()}async playAction(t,e,i){await this.show(),await this.executeRendererMethod("playAction",t,e!=null?e:null,i!=null?i:null)}async say(t,e){await this.show(),await this.executeRendererMethod("say",t,e!=null?e:null)}async ensureWindow(){var d;if(this.window!==null&&!this.window.isDestroyed())return this.window;this.runtime=(d=this.runtime)!=null?d:at();let t=this.getSettings(),e=O(this.runtime.screen),i=B(t),o=V(t,e),s=new this.runtime.BrowserWindow({width:i.width,height:i.height,x:o.x,y:o.y,show:!1,frame:!1,transparent:!0,resizable:!1,movable:!0,alwaysOnTop:t.alwaysOnTop,skipTaskbar:t.skipTaskbar,hasShadow:!1,backgroundColor:"#00000000",title:"Petsidian Desktop Pet",webPreferences:{contextIsolation:!0,nodeIntegration:!1,sandbox:!0}});return s.once("closed",()=>{this.window===s&&(this.window=null),this.stopWalking()}),this.window=s,await s.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(rt(t))}`),s}applyNativeSettings(t){let e=this.getSettings();t.setAlwaysOnTop(e.alwaysOnTop,"floating"),t.setSkipTaskbar(e.skipTaskbar)}clampWindowToWorkArea(t){let e=this.runtime,[i,o]=t.getPosition(),s=O(e==null?void 0:e.screen),[d,m]=t.getSize(),g=s.x,u=s.y,p=Math.max(g,s.x+s.width-d),h=Math.max(u,s.y+s.height-m),c=V(this.getSettings(),s),_=Number.isFinite(i)?Math.min(Math.max(i,g),p):c.x,$=Number.isFinite(o)?Math.min(Math.max(o,u),h):c.y;(_!==i||$!==o)&&t.setPosition(Math.round(_),Math.round($),!1)}updateWalkingState(){let t=this.getSettings();if(!t.autonomousWalking||t.reducedMotion||this.window===null){this.stopWalking();return}this.startWalking()}startWalking(){this.walkingTimerId===null&&(this.lastWalkTickMs=performance.now(),this.walkingTimerId=window.setInterval(()=>{this.walkDesktopWindow()},nt))}stopWalking(){this.walkingTimerId!==null&&(window.clearInterval(this.walkingTimerId),this.walkingTimerId=null)}async walkDesktopWindow(){let t=this.window,e=this.runtime;if(t===null||t.isDestroyed()){this.stopWalking();return}let i=this.getSettings();if(!i.autonomousWalking||i.reducedMotion){this.stopWalking();return}let o=performance.now(),s=Math.max(0,(o-this.lastWalkTickMs)/1e3);this.lastWalkTickMs=o;let[d]=t.getSize(),[m,g]=t.getPosition(),u=O(e==null?void 0:e.screen),p=u.x+S,h=Math.max(p,u.x+u.width-d-S),c=m+this.walkingDirection*i.walkingSpeedPx*s;c>=h?(c=h,this.walkingDirection=-1,await this.executeRendererMethod("setWalkingDirection",this.walkingDirection)):c<=p&&(c=p,this.walkingDirection=1,await this.executeRendererMethod("setWalkingDirection",this.walkingDirection)),t.setPosition(Math.round(c),g,!1)}async executeRendererMethod(t,...e){let i=this.window;if(i===null||i.isDestroyed())return;let o=e.map(L).join(", ");await i.webContents.executeJavaScript(`window.PetsidianRenderer && window.PetsidianRenderer[${L(t)}](${o});`,!0)}};var P=["thinking","tool-running","reviewing","success","failure","attention"],A={thinking:{type:"thinking",label:"Thinking",description:"The companion is thinking through the next step.",animationId:"waiting",defaultBubble:"Thinking..."},"tool-running":{type:"tool-running",label:"Tool running",description:"A command, build, test, or tool action is in progress.",animationId:"running",defaultBubble:"Running a tool..."},reviewing:{type:"reviewing",label:"Reviewing",description:"Changes are being reviewed.",animationId:"review",defaultBubble:"Reviewing changes..."},success:{type:"success",label:"Success",description:"The current task or check completed successfully.",animationId:"jumping",defaultBubble:"Done!"},failure:{type:"failure",label:"Failure",description:"A command failed or needs attention.",animationId:"failed",defaultBubble:"Something needs attention."},attention:{type:"attention",label:"Attention",description:"The companion needs the user to look at something.",animationId:"waving",defaultBubble:"Need your attention."}};function j(n){return typeof n=="string"&&P.includes(n)}var a={visible:!0,scale:1,reducedMotion:!1,activePetId:"nia",clickActionMode:"random",clickAction:"waving",clickActionPool:["waving","jumping","waiting","running","review"],bubblesEnabled:!0,bubbleTtlMs:4e3,autonomousWalking:!1,walkingSpeedPx:48,hoverPause:!0,alwaysOnTop:!0,skipTaskbar:!0};function lt(n){return typeof n=="object"&&n!==null&&!Array.isArray(n)}function b(n,t,e){let i=n[t];return typeof i=="boolean"?i:e}function R(n,t,e,i,o){let s=n[t];return typeof s!="number"||!Number.isFinite(s)?e:Math.min(Math.max(s,i),o)}function dt(n){return n.clickActionMode==="fixed"||n.clickActionMode==="random"?n.clickActionMode:a.clickActionMode}function ct(n){let t=n.clickActionPool;if(!Array.isArray(t))return[...a.clickActionPool];let e=t.filter(w);return e.length>0?[...new Set(e)]:[...a.clickActionPool]}function v(n){if(!lt(n))return{...a,clickActionPool:[...a.clickActionPool]};let t=typeof n.clickAction=="string"?n.clickAction:null,e=w(t)?t:a.clickAction,i=n.activePetId,o=typeof i=="string"?x(i,f).id:a.activePetId;return{visible:b(n,"visible",a.visible),scale:R(n,"scale",a.scale,.5,2),reducedMotion:b(n,"reducedMotion",a.reducedMotion),activePetId:o,clickActionMode:dt(n),clickAction:e,clickActionPool:ct(n),bubblesEnabled:b(n,"bubblesEnabled",a.bubblesEnabled),bubbleTtlMs:Math.round(R(n,"bubbleTtlMs",a.bubbleTtlMs,1e3,15e3)),autonomousWalking:b(n,"autonomousWalking",a.autonomousWalking),walkingSpeedPx:R(n,"walkingSpeedPx",a.walkingSpeedPx,10,160),hoverPause:b(n,"hoverPause",a.hoverPause),alwaysOnTop:b(n,"alwaysOnTop",a.alwaysOnTop),skipTaskbar:b(n,"skipTaskbar",a.skipTaskbar)}}function q(){return W}var l=require("obsidian");var M=class extends l.PluginSettingTab{constructor(t,e){super(t,e),this.plugin=e}display(){let{containerEl:t}=this;t.empty(),t.addClass("petsidian-settings"),new l.Setting(t).setName("Petsidian").setHeading(),t.createEl("p",{text:"Configure the detached desktop pet window. Petsidian is desktop-only and uses Obsidian's Electron runtime to create a transparent pet outside the main Obsidian window."}),new l.Setting(t).setName("Show pet").setDesc("Create or show the detached transparent desktop pet window.").addToggle(i=>i.setValue(this.plugin.settings.visible).onChange(async o=>{await this.plugin.updateSettings({visible:o})})),new l.Setting(t).setName("Always on top").setDesc("Keep the pet window above normal desktop windows.").addToggle(i=>i.setValue(this.plugin.settings.alwaysOnTop).onChange(async o=>{await this.plugin.updateSettings({alwaysOnTop:o})})),new l.Setting(t).setName("Skip taskbar").setDesc("Hide the pet window from the operating-system taskbar or dock when Electron supports it.").addToggle(i=>i.setValue(this.plugin.settings.skipTaskbar).onChange(async o=>{await this.plugin.updateSettings({skipTaskbar:o})})),new l.Setting(t).setName("Scale").setDesc("Adjust the rendered pet size.").addSlider(i=>i.setLimits(.5,2,.05).setValue(this.plugin.settings.scale).setDynamicTooltip().onChange(async o=>{await this.plugin.updateSettings({scale:o})})),new l.Setting(t).setName("Reduced motion").setDesc("Show a still frame and disable autonomous walking.").addToggle(i=>i.setValue(this.plugin.settings.reducedMotion).onChange(async o=>{await this.plugin.updateSettings({reducedMotion:o})})),new l.Setting(t).setName("Click action mode").setDesc("Use a fixed action or randomly pick from the action pool.").addDropdown(i=>i.addOption("fixed","Fixed").addOption("random","Random").setValue(this.plugin.settings.clickActionMode).onChange(async o=>{await this.plugin.updateSettings({clickActionMode:o==="fixed"?"fixed":"random"})})),new l.Setting(t).setName("Fixed click action").setDesc("The action used when click action mode is fixed, and as the random fallback.").addDropdown(i=>{for(let o of q())i.addOption(o,y[o]);return i.setValue(this.plugin.settings.clickAction).onChange(async o=>{w(o)&&await this.plugin.updateSettings({clickAction:o})})}),new l.Setting(t).setName("Bubbles").setDesc("Show speech bubbles for clicks, commands, and companion events.").addToggle(i=>i.setValue(this.plugin.settings.bubblesEnabled).onChange(async o=>{await this.plugin.updateSettings({bubblesEnabled:o})})),new l.Setting(t).setName("Bubble duration").setDesc("How long bubbles remain visible.").addSlider(i=>i.setLimits(1e3,15e3,500).setValue(this.plugin.settings.bubbleTtlMs).setDynamicTooltip().onChange(async o=>{await this.plugin.updateSettings({bubbleTtlMs:o})})),new l.Setting(t).setName("Autonomous walking").setDesc("Move the detached pet window horizontally within the primary display work area.").addToggle(i=>i.setValue(this.plugin.settings.autonomousWalking).onChange(async o=>{await this.plugin.updateSettings({autonomousWalking:o})})),new l.Setting(t).setName("Walking speed").setDesc("Horizontal movement speed in pixels per second.").addSlider(i=>i.setLimits(10,160,5).setValue(this.plugin.settings.walkingSpeedPx).setDynamicTooltip().onChange(async o=>{await this.plugin.updateSettings({walkingSpeedPx:o})}));let e="thinking";new l.Setting(t).setName("Preview companion events").setDesc("Trigger the OpenPet-compatible event-to-animation mapping.").addDropdown(i=>{for(let o of P)i.addOption(o,A[o].label);return i.setValue(e).onChange(o=>{e=o})}).addButton(i=>i.setButtonText("Trigger").onClick(()=>{this.plugin.triggerCompanionEvent(e)}))}};var I=class extends k.Plugin{constructor(){super(...arguments);this.settings={...a,clickActionPool:[...a.clickActionPool]};this.desktopPetWindow=null}async onload(){await this.loadSettings(),this.desktopPetWindow=new T(()=>this.settings),this.settings.visible&&await this.showDesktopPetWindow(),this.addRibbonIcon("paw-print","Toggle Petsidian pet",()=>{this.togglePetVisibility()}),this.addSettingTab(new M(this.app,this)),this.registerCommands()}onunload(){var e;(e=this.desktopPetWindow)==null||e.destroy(),this.desktopPetWindow=null}async loadSettings(){this.settings=v(await this.loadData())}async saveSettings(){var e;this.settings=v(this.settings),await this.saveData(this.settings),await((e=this.desktopPetWindow)==null?void 0:e.refreshFromSettings())}async updateSettings(e){var s,d;let i=v({...this.settings,...e}),o=i.visible!==this.settings.visible;this.settings=i,await this.saveData(this.settings),o?this.settings.visible?await this.showDesktopPetWindow()||(this.settings=v({...this.settings,visible:!1}),await this.saveData(this.settings)):(s=this.desktopPetWindow)==null||s.hide():await((d=this.desktopPetWindow)==null?void 0:d.refreshFromSettings())}async togglePetVisibility(){await this.setPetVisible(!this.settings.visible)}async setPetVisible(e){await this.updateSettings({visible:e}),new k.Notice(this.settings.visible?"Petsidian pet shown":"Petsidian pet hidden")}async triggerAction(e,i){var o;this.settings.visible||await this.updateSettings({visible:!0}),await((o=this.desktopPetWindow)==null?void 0:o.playAction(e,i))}async say(e){var i;this.settings.visible||await this.updateSettings({visible:!0}),await((i=this.desktopPetWindow)==null?void 0:i.say(e))}async triggerCompanionEvent(e){var s;if(!j(e)){new k.Notice(`Unknown Petsidian event: ${e}`);return}this.settings.visible||await this.updateSettings({visible:!0});let i=A[e],o=this.settings.bubblesEnabled?i.defaultBubble:null;await((s=this.desktopPetWindow)==null?void 0:s.playAction(i.animationId,o,this.settings.bubbleTtlMs))}async showDesktopPetWindow(){var e;try{return await((e=this.desktopPetWindow)==null?void 0:e.show()),!0}catch(i){return console.error("Petsidian failed to create the desktop pet window",i),new k.Notice("Petsidian requires Obsidian desktop Electron remote APIs to create a detached pet window."),!1}}registerCommands(){this.addCommand({id:"toggle-pet",name:"Toggle pet visibility",callback:()=>{this.togglePetVisibility()}}),this.addCommand({id:"show-pet",name:"Show pet",callback:()=>{this.setPetVisible(!0)}}),this.addCommand({id:"hide-pet",name:"Hide pet",callback:()=>{this.setPetVisible(!1)}}),this.addCommand({id:"wave",name:"Wave",callback:()=>{this.triggerAction("waving","Hello from Petsidian!")}}),this.addCommand({id:"say-sample-message",name:"Say sample message",callback:()=>{this.say("Petsidian is a detached desktop pet.")}});for(let e of P)this.addCompanionEventCommand(e);for(let e of Object.keys(y))w(e)&&this.addCommand({id:`play-${e}`,name:`Play pet action: ${y[e]}`,callback:()=>{this.triggerAction(e)}})}addCompanionEventCommand(e){this.addCommand({id:`trigger-event-${e}`,name:`Trigger companion event: ${A[e].label}`,callback:()=>{this.triggerCompanionEvent(e)}})}};

const menuButton=document.getElementById('menuButton');
const navLinks=document.getElementById('navLinks');

function closeMenu({returnFocus=false}={}){
  if(!menuButton||!navLinks) return;
  navLinks.classList.remove('active');
  menuButton.setAttribute('aria-expanded','false');
  menuButton.setAttribute('aria-label','Open navigation');
  menuButton.textContent='☰';
  if(returnFocus) menuButton.focus();
}

if(menuButton&&navLinks){
  menuButton.addEventListener('click',()=>{
    const open=navLinks.classList.toggle('active');
    menuButton.setAttribute('aria-expanded',open?'true':'false');
    menuButton.setAttribute('aria-label',open?'Close navigation':'Open navigation');
    menuButton.textContent=open?'×':'☰';
  });

  navLinks.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>closeMenu()));

  document.addEventListener('click',event=>{
    if(!navLinks.classList.contains('active')) return;
    if(navLinks.contains(event.target)||menuButton.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&navLinks.classList.contains('active')){
      event.preventDefault();
      closeMenu({returnFocus:true});
    }
  });
}

const year=document.getElementById('year');
if(year) year.textContent=new Date().getFullYear();

const bookingStatusStep=document.getElementById('bookingStatusStep');
const bookingStatusMessage=document.getElementById('bookingStatusMessage');
const selectedStylistSummary=document.getElementById('selectedStylistSummary');
const stylistButtons=[...document.querySelectorAll('[data-stylist]')];
const clientStatusButtons=[...document.querySelectorAll('[data-client-status]')];
const changeStylistButton=document.getElementById('changeStylist');
let selectedStylist='';

function stylistDisplayName(key){return key==='latoya'?'LaToya Terry':key==='kottia'?'Kottia Cotton':key==='jahniqua'?'JahNiqua Speight':'';}
function selectBookingStylist(key,{focusStep=true}={}){
  if(!['latoya','kottia','jahniqua'].includes(key)) return;
  selectedStylist=key;
  stylistButtons.forEach(button=>button.setAttribute('aria-pressed',button.dataset.stylist===key?'true':'false'));
  if(selectedStylistSummary) selectedStylistSummary.textContent=`You selected ${stylistDisplayName(key)}.`;
  if(bookingStatusStep){bookingStatusStep.hidden=false;if(focusStep) bookingStatusStep.focus();}
  if(bookingStatusMessage) bookingStatusMessage.textContent='';
}
function resetBookingStylist(){
  selectedStylist='';
  stylistButtons.forEach(button=>button.setAttribute('aria-pressed','false'));
  if(bookingStatusStep) bookingStatusStep.hidden=true;
  if(bookingStatusMessage) bookingStatusMessage.textContent='';
  stylistButtons[0]?.focus();
}
function openBookingRoute(status){
  if(!selectedStylist) return;
  const key=`${selectedStylist}-${status}`;
  const url=window.PAZZION_BOOKING_ROUTES?.[key]?.trim();
  if(!url){
    if(bookingStatusMessage){bookingStatusMessage.textContent='Online booking for this selection is temporarily unavailable. Call Pazzion Stylez Salon / Appointments / Consultations at 252-468-1243 for assistance.';bookingStatusMessage.focus();}
    return;
  }
  window.location.assign(url);
}
stylistButtons.forEach(button=>button.addEventListener('click',()=>selectBookingStylist(button.dataset.stylist)));
clientStatusButtons.forEach(button=>button.addEventListener('click',()=>openBookingRoute(button.dataset.clientStatus)));
changeStylistButton?.addEventListener('click',resetBookingStylist);
document.querySelectorAll('[data-book-stylist]').forEach(link=>link.addEventListener('click',()=>selectBookingStylist(link.dataset.bookStylist,{focusStep:false})));


const lightbox=document.getElementById('lightbox');
const lightboxImage=document.getElementById('lightboxImage');
const lightboxClose=document.getElementById('lightboxClose');
let lastGalleryButton=null;
const modalBackground=[...document.querySelectorAll('.topbar,.site-header,main,footer')];

function setBackgroundModalState(isModal){
  modalBackground.forEach(el=>{
    el.inert=isModal;
    if(isModal){
      el.dataset.previousAriaHidden=el.getAttribute('aria-hidden')??'';
      el.setAttribute('aria-hidden','true');
    }else{
      const previous=el.dataset.previousAriaHidden;
      if(previous==='') el.removeAttribute('aria-hidden');
      else if(previous!==undefined) el.setAttribute('aria-hidden',previous);
      delete el.dataset.previousAriaHidden;
    }
  });
}

if(lightbox&&lightboxImage&&lightboxClose){
  document.querySelectorAll('.gallery-item').forEach(item=>{item.disabled=false;});
  document.querySelectorAll('.gallery-item').forEach(item=>item.addEventListener('click',()=>{
    lastGalleryButton=item;
    const thumb=item.querySelector('img');
    lightboxImage.src=item.dataset.full;
    lightboxImage.alt=thumb?.alt||'Expanded Pazzion Stylez gallery image';
    setBackgroundModalState(true);
    document.body.classList.add('modal-open');
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden','false');
    lightboxClose.focus();
  }));

  function closeLightbox(){
    if(!lightbox.classList.contains('open')) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden','true');
    lightboxImage.src='';
    lightboxImage.alt='Expanded Pazzion Stylez gallery image';
    setBackgroundModalState(false);
    document.body.classList.remove('modal-open');
    const returnTarget=lastGalleryButton;
    lastGalleryButton=null;
    if(returnTarget) returnTarget.focus();
  }

  lightboxClose.addEventListener('click',closeLightbox);
  lightbox.addEventListener('click',event=>{if(event.target===lightbox) closeLightbox();});
  document.addEventListener('keydown',event=>{
    if(!lightbox.classList.contains('open')) return;
    if(event.key==='Escape'){
      event.preventDefault();
      closeLightbox();
      return;
    }
    if(event.key==='Tab'){
      event.preventDefault();
      lightboxClose.focus();
    }
  });
}

function fetchWithTimeout(url,options={},timeoutMs=20000){
  if(typeof AbortController==='undefined') return fetch(url,options);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));
}

function validPhoneInput(value){
  if(!value) return true;
  const match=value.match(/^(.*?)(?:\s*(?:ext\.?|x)\s*(\d{1,6}))?$/i);
  if(!match) return false;
  const base=match[1].trim();
  if(!/^[0-9+().\-\s]+$/.test(base)) return false;
  const digits=base.replace(/\D/g,'');
  return digits.length>=7&&digits.length<=15;
}

function focusValidationTarget(field){
  if(!field) return;
  field.setAttribute('aria-invalid','true');
  field.focus();
  const clearInvalid=()=>field.removeAttribute('aria-invalid');
  field.addEventListener('input',clearInvalid,{once:true});
  field.addEventListener('change',clearInvalid,{once:true});
}

/* Turnstile is a required production control. If configuration or the
   challenge service is unavailable, online submission fails closed and
   the page keeps call/email alternatives visible. */
const formProtection={
  mode:'loading',
  tokens:{contact:'',photoRelease:''},
  widgets:{contact:null,photoRelease:null},
  sizes:{contact:null,photoRelease:null},
  sitekey:''
};
let protectionInitPromise=null;

function protectionMessage(){
  if(formProtection.mode==='loading') return 'Spam protection is still loading. Please wait a moment and try again.';
  if(formProtection.mode==='error') return 'Spam protection could not load. Please refresh the page, or call/text Pazzion Stylez if the problem continues.';
  return 'Please complete the spam-protection verification.';
}

function loadTurnstileScript(){
  return new Promise((resolve,reject)=>{
    if(window.turnstile) return resolve();

    const existing=document.querySelector('script[data-pazzion-turnstile]');
    if(existing) existing.remove();

    const tag=document.createElement('script');
    tag.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    tag.async=true;
    tag.defer=true;
    tag.dataset.pazzionTurnstile='true';

    let settled=false;
    const finish=(error)=>{
      if(settled) return;
      settled=true;
      clearTimeout(timer);
      if(error){
        tag.remove();
        reject(error);
      }else{
        resolve();
      }
    };

    tag.addEventListener('load',()=>finish(),{once:true});
    tag.addEventListener('error',()=>finish(new Error('Turnstile failed to load')),{once:true});
    const timer=setTimeout(()=>finish(new Error('Turnstile timed out')),12000);
    document.head.appendChild(tag);
  });
}

function resetTurnstile(kind){
  formProtection.tokens[kind]='';
  const widget=formProtection.widgets[kind];
  if(window.turnstile&&widget!==null){
    try{ window.turnstile.reset(widget); }catch{}
  }
}

function desiredTurnstileSize(slot){
  return slot.getBoundingClientRect().width<310?'compact':'flexible';
}

function renderProtectionWidget(kind,wrapId,slotId,action,sitekey){
  const wrap=document.getElementById(wrapId);
  const slot=document.getElementById(slotId);
  if(!wrap||!slot) throw new Error(`Missing ${kind} Turnstile container`);
  wrap.hidden=false;

  if(formProtection.widgets[kind]===null){
    const size=desiredTurnstileSize(slot);
    formProtection.sizes[kind]=size;
    formProtection.widgets[kind]=window.turnstile.render(slot,{
      sitekey,
      action,
      theme:'light',
      size,
      appearance:'always',
      retry:'auto',
      'refresh-expired':'auto',
      'refresh-timeout':'auto',
      callback:token=>{formProtection.tokens[kind]=token;},
      'expired-callback':()=>{formProtection.tokens[kind]='';},
      'timeout-callback':()=>{formProtection.tokens[kind]='';},
      'error-callback':()=>{formProtection.tokens[kind]='';},
      'unsupported-callback':()=>{formProtection.tokens[kind]='';}
    });
  }
}

function rerenderProtectionIfNeeded(kind,wrapId,slotId,action){
  if(formProtection.mode!=='ready'||!formProtection.sitekey||!window.turnstile) return;
  const slot=document.getElementById(slotId);
  if(!slot) return;

  const nextSize=desiredTurnstileSize(slot);
  if(formProtection.sizes[kind]===nextSize) return;

  const widget=formProtection.widgets[kind];
  if(widget!==null){
    try{window.turnstile.remove(widget);}catch{}
  }
  slot.replaceChildren();
  formProtection.widgets[kind]=null;
  formProtection.tokens[kind]='';
  formProtection.sizes[kind]=null;
  renderProtectionWidget(kind,wrapId,slotId,action,formProtection.sitekey);
}

async function initFormProtection(){
  formProtection.mode='loading';
  try{
    const response=await fetchWithTimeout('/api/form-config',{
      headers:{'Accept':'application/json'},
      cache:'no-store'
    },10000);
    const config=await response.json().catch(()=>({}));
    if(!response.ok||config.configuration_error||!config.turnstile_enabled||!config.sitekey){
      throw new Error('Spam protection is not fully configured');
    }

    await loadTurnstileScript();
    if(!window.turnstile) throw new Error('Turnstile API unavailable');

    formProtection.sitekey=config.sitekey;
    // Forms live on separate pages; only initialize widgets present on this page.
    if(document.getElementById('contactForm')){
      renderProtectionWidget('contact','contactTurnstileWrap','contactTurnstile','contact',config.sitekey);
    }
    if(document.getElementById('photoReleaseForm')){
      renderProtectionWidget('photoRelease','photoReleaseTurnstileWrap','photoReleaseTurnstile','photo_release',config.sitekey);
    }
    formProtection.mode='ready';
  }catch{
    formProtection.mode='error';
  }
}

function startProtectionInit(force=false){
  // Share an in-flight initialization across simultaneous submit attempts.
  // A failed initialization can still be retried once it has settled.
  if(!protectionInitPromise||(force&&formProtection.mode!=='loading')){
    protectionInitPromise=initFormProtection();
  }
  return protectionInitPromise;
}

async function ensureProtectionReady(){
  if(formProtection.mode==='ready') return true;
  if(formProtection.mode==='loading') await startProtectionInit();
  if(formProtection.mode==='error'){
    await startProtectionInit(true);
  }
  return formProtection.mode==='ready';
}

function scheduleProtectionInit(){
  const forms=[
    document.getElementById('photoReleaseForm'),
    document.getElementById('contactForm')
  ].filter(Boolean);
  if(!forms.length) return;

  const prime=()=>{ void startProtectionInit(); };
  forms.forEach(form=>form.addEventListener('focusin',prime,{once:true}));

  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){
        observer.disconnect();
        prime();
      }
    },{rootMargin:'600px 0px'});
    forms.forEach(form=>observer.observe(form));
  }
}
scheduleProtectionInit();

let responsiveResizeTimer=null;
window.addEventListener('resize',()=>{
  if(window.innerWidth>1080&&navLinks?.classList.contains('active')){
    closeMenu();
  }
  clearTimeout(responsiveResizeTimer);
  responsiveResizeTimer=setTimeout(()=>{
    rerenderProtectionIfNeeded('contact','contactTurnstileWrap','contactTurnstile','contact');
    rerenderProtectionIfNeeded('photoRelease','photoReleaseTurnstileWrap','photoReleaseTurnstile','photo_release');
  },220);
});

const contactForm=document.getElementById('contactForm');
if(contactForm){
  const contactTopic=document.getElementById('contactTopic');
  const preferredStylistWrap=document.getElementById('contactPreferredStylistWrap');
  const preferredStylistField=document.getElementById('contactPreferredStylist');
  function syncPreferredStylist(){
    const required=contactTopic?.value==='Hair or beauty service';
    if(preferredStylistWrap) preferredStylistWrap.hidden=!required;
    if(preferredStylistField){preferredStylistField.required=required;if(!required) preferredStylistField.value='';}
  }
  contactTopic?.addEventListener('change',syncPreferredStylist);
  syncPreferredStylist();
  contactForm.addEventListener('submit',async event=>{
    event.preventDefault();

    const name=document.getElementById('contactName').value.trim();
    const email=document.getElementById('contactEmail').value.trim();
    const phone=document.getElementById('contactPhone').value.trim();
    const topic=document.getElementById('contactTopic').value.trim();
    const preferredStylist=preferredStylistField?.value.trim()||'';
    const message=document.getElementById('contactMessage').value.trim();
    const honey=document.getElementById('contactWebsite').value.trim();
    const status=document.getElementById('contactFormStatus');
    const submitButton=document.getElementById('contactSubmit');

    status.classList.remove('success','error');

    if(honey){
      status.textContent='Thank you. Your message has been received.';
      status.classList.add('success');
      contactForm.reset();
      syncPreferredStylist();
      resetTurnstile('contact');
      return;
    }

    if(!name||!topic||!message){
      status.textContent='Please complete your name, topic, and message.';
      status.classList.add('error');
      if(!name) focusValidationTarget(document.getElementById('contactName'));
      else if(!topic) focusValidationTarget(document.getElementById('contactTopic'));
      else focusValidationTarget(document.getElementById('contactMessage'));
      return;
    }
    if(topic==='Hair or beauty service'&&!preferredStylist){
      status.textContent='Please choose a preferred stylist.';
      status.classList.add('error');
      preferredStylistField?.focus();
      return;
    }
    if(!email&&!phone){
      status.textContent='Please provide an email address or phone number so Pazzion Stylez can respond.';
      status.classList.add('error');
      focusValidationTarget(document.getElementById('contactEmail'));
      return;
    }
    if(email&&!document.getElementById('contactEmail').checkValidity()){
      status.textContent='Please enter a valid email address.';
      status.classList.add('error');
      focusValidationTarget(document.getElementById('contactEmail'));
      return;
    }
    if(phone&&!validPhoneInput(phone)){
      status.textContent='Please enter a valid phone number.';
      status.classList.add('error');
      focusValidationTarget(document.getElementById('contactPhone'));
      return;
    }

    // Lock the submit control before awaiting protection initialization to
    // prevent rapid clicks/Enter presses from sending duplicate messages.
    submitButton.disabled=true;
    submitButton.setAttribute('aria-disabled','true');
    if(!(await ensureProtectionReady())){
      status.textContent=protectionMessage();
      status.classList.add('error');
      submitButton.disabled=false;
      submitButton.removeAttribute('aria-disabled');
      return;
    }
    if(!formProtection.tokens.contact){
      status.textContent=protectionMessage();
      status.classList.add('error');
      submitButton.disabled=false;
      submitButton.removeAttribute('aria-disabled');
      return;
    }

    contactForm.setAttribute('aria-busy','true');
    status.textContent='Sending your message…';

    try{
      const response=await fetchWithTimeout('/api/contact',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Accept':'application/json'
        },
        body:JSON.stringify({
          name,
          email,
          phone,
          topic,
          preferred_stylist:preferredStylist,
          message,
          _honey:honey,
          turnstile_token:formProtection.tokens.contact
        })
      },20000);

      const result=await response.json().catch(()=>({}));
      if(!response.ok||result.success===false){
        throw new Error(result.message||'We could not send your message right now.');
      }

      status.textContent=`Thank you! Your message has been received${result.record_id?` (reference ${result.record_id})`:''}.`;
      status.classList.add('success');
      contactForm.reset();
      syncPreferredStylist();
      resetTurnstile('contact');
    }catch(error){
      const timedOut=error?.name==='AbortError';
      status.textContent=timedOut
        ? 'The request timed out. Please try again, or call/text Pazzion Stylez.'
        : (error?.message||'We could not send your message right now. Please call, text, or email Pazzion Stylez instead.');
      status.classList.add('error');
      resetTurnstile('contact');
    }finally{
      contactForm.removeAttribute('aria-busy');
      submitButton.disabled=false;
      submitButton.removeAttribute('aria-disabled');
    }
  });
}

document.querySelectorAll('.square-shop-button').forEach(button=>{
  button.addEventListener('click',event=>{
    const url=button.dataset.squareShopUrl?.trim();
    if(!url){
      event.preventDefault();
      alert('Square online checkout is being connected. Please text or call Pazzion Stylez to order for now.');
    }
  });
});

const photoReleaseForm=document.getElementById('photoReleaseForm');
if(photoReleaseForm){
  const permissionInputs=[...photoReleaseForm.querySelectorAll('input[name="permission"]')];
  const useInputs=[...photoReleaseForm.querySelectorAll('input[name="allowed_uses"]')];
  const ageInputs=[...photoReleaseForm.querySelectorAll('input[name="age_status"]')];
  const guardianFields=document.getElementById('guardianFields');
  const guardianName=document.getElementById('guardianName');
  const guardianRelationship=document.getElementById('guardianRelationship');
  const guardianEmail=document.getElementById('guardianEmail');
  const guardianSignature=document.getElementById('guardianSignature');
  const signedDate=document.getElementById('releaseSignedDate');
  const faceInputs=[...photoReleaseForm.querySelectorAll('input[name="face_visible"]')];
  const nameUseInputs=[...photoReleaseForm.querySelectorAll('input[name="name_use"]')];

  function localToday(){
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(new Date());
    const values=Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function setSigningDate(){
    if(!signedDate) return;
    const today=localToday();
    signedDate.max=today;
    if(!signedDate.value) signedDate.value=today;
  }
  setSigningDate();

  function selectedValue(name){
    return photoReleaseForm.querySelector(`input[name="${name}"]:checked`)?.value||'';
  }

  function updateGuardianFields(){
    const isMinor=selectedValue('age_status')==='Client is under 18';
    guardianFields.hidden=!isMinor;
    [guardianName,guardianRelationship,guardianEmail,guardianSignature].forEach(field=>{
      field.required=isMinor;
    });
  }

  function updateConsentFields(){
    const permission=selectedValue('permission');
    const declined=permission==='I DO NOT CONSENT to public photo/video use';

    [...useInputs,...faceInputs,...nameUseInputs].forEach(input=>{
      input.disabled=declined;
      if(declined) input.checked=false;
    });

    const usesFieldset=document.getElementById('releaseUsesFieldset');
    if(usesFieldset){
      usesFieldset.classList.toggle('is-disabled',declined);
      usesFieldset.setAttribute('aria-disabled',declined?'true':'false');
    }
  }

  function resetReleaseFormState(){
    photoReleaseForm.reset();
    setSigningDate();
    updateGuardianFields();
    updateConsentFields();
    resetTurnstile('photoRelease');
  }

  ageInputs.forEach(input=>input.addEventListener('change',updateGuardianFields));
  permissionInputs.forEach(input=>input.addEventListener('change',updateConsentFields));
  updateGuardianFields();
  updateConsentFields();

  photoReleaseForm.addEventListener('submit',async event=>{
    event.preventDefault();

    const status=document.getElementById('photoReleaseStatus');
    const submitButton=document.getElementById('photoReleaseSubmit');
    const clientName=document.getElementById('releaseClientName').value.trim();
    const email=document.getElementById('releaseEmail').value.trim();
    const phone=document.getElementById('releasePhone').value.trim();
    const serviceDate=document.getElementById('releaseServiceDate').value;
    const serviceProvider=document.getElementById('releaseServiceProvider').value.trim();
    const permission=selectedValue('permission');
    const faceVisible=selectedValue('face_visible');
    const nameUse=selectedValue('name_use');
    const ageStatus=selectedValue('age_status');
    const signature=document.getElementById('releaseSignature').value.trim();
    const dateSigned=document.getElementById('releaseSignedDate').value;
    const acknowledgment=document.getElementById('releaseAcknowledgment').checked;
    const honey=document.getElementById('releaseWebsite').value.trim();
    const selectedUses=useInputs.filter(input=>input.checked).map(input=>input.value);

    status.classList.remove('success','error');

    if(honey){
      status.textContent='Thank you. Your photo-release preference has been recorded.';
      status.classList.add('success');
      resetReleaseFormState();
      return;
    }

    if(!clientName||!email||!serviceProvider||!permission||!ageStatus||!signature||!dateSigned||!acknowledgment){
      status.textContent='Please complete all required fields and confirm the acknowledgment.';
      status.classList.add('error');
      if(!clientName) focusValidationTarget(document.getElementById('releaseClientName'));
      else if(!email) focusValidationTarget(document.getElementById('releaseEmail'));
      else if(!serviceProvider) focusValidationTarget(document.getElementById('releaseServiceProvider'));
      else if(!permission) focusValidationTarget(permissionInputs[0]);
      else if(!ageStatus) focusValidationTarget(ageInputs[0]);
      else if(!signature) focusValidationTarget(document.getElementById('releaseSignature'));
      else if(!dateSigned) focusValidationTarget(document.getElementById('releaseSignedDate'));
      else focusValidationTarget(document.getElementById('releaseAcknowledgment'));
      return;
    }
    if(!document.getElementById('releaseEmail').checkValidity()){
      status.textContent='Please enter a valid email address.';
      status.classList.add('error');
      focusValidationTarget(document.getElementById('releaseEmail'));
      return;
    }
    if(phone&&!validPhoneInput(phone)){
      status.textContent='Please enter a valid phone number.';
      status.classList.add('error');
      focusValidationTarget(document.getElementById('releasePhone'));
      return;
    }

    const isConsent=permission==='I CONSENT to selected photo/video uses';
    if(isConsent&&selectedUses.length===0){
      status.textContent='Please select at least one allowed use, or choose “I do not consent.”';
      status.classList.add('error');
      focusValidationTarget(useInputs[0]);
      return;
    }
    if(isConsent&&!faceVisible){
      status.textContent='Please choose whether your face may be visible.';
      status.classList.add('error');
      focusValidationTarget(faceInputs[0]);
      return;
    }
    if(isConsent&&!nameUse){
      status.textContent='Please choose whether your name may be used.';
      status.classList.add('error');
      focusValidationTarget(nameUseInputs[0]);
      return;
    }

    const isMinor=ageStatus==='Client is under 18';
    if(isMinor){
      if(!guardianName.value.trim()||!guardianRelationship.value.trim()||!guardianEmail.value.trim()||!guardianSignature.value.trim()){
        status.textContent='A parent or legal guardian must complete the guardian fields for a client under 18.';
        status.classList.add('error');
        if(!guardianName.value.trim()) focusValidationTarget(guardianName);
        else if(!guardianRelationship.value.trim()) focusValidationTarget(guardianRelationship);
        else if(!guardianEmail.value.trim()) focusValidationTarget(guardianEmail);
        else focusValidationTarget(guardianSignature);
        return;
      }
      if(!guardianEmail.checkValidity()){
        status.textContent='Please enter a valid guardian email address.';
        status.classList.add('error');
        focusValidationTarget(guardianEmail);
        return;
      }
      const guardianPhoneValue=document.getElementById('guardianPhone').value.trim();
      if(guardianPhoneValue&&!validPhoneInput(guardianPhoneValue)){
        status.textContent='Please enter a valid guardian phone number.';
        status.classList.add('error');
        focusValidationTarget(document.getElementById('guardianPhone'));
        return;
      }
    }

    // Lock the submit control before awaiting protection initialization to
    // prevent rapid clicks/Enter presses from sending duplicate releases.
    submitButton.disabled=true;
    submitButton.setAttribute('aria-disabled','true');
    if(!(await ensureProtectionReady())){
      status.textContent=protectionMessage();
      status.classList.add('error');
      submitButton.disabled=false;
      submitButton.removeAttribute('aria-disabled');
      return;
    }
    if(!formProtection.tokens.photoRelease){
      status.textContent=protectionMessage();
      status.classList.add('error');
      submitButton.disabled=false;
      submitButton.removeAttribute('aria-disabled');
      return;
    }

    photoReleaseForm.setAttribute('aria-busy','true');
    status.textContent='Submitting your photo-release preference…';

    try{
      const payload={
        client_name:clientName,
        client_email:email,
        client_phone:phone,
        service_date:serviceDate,
        service_provider:serviceProvider,
        permission,
        allowed_uses:isConsent?selectedUses:[],
        face_visible:isConsent?faceVisible:'',
        name_use:isConsent?nameUse:'',
        age_status:ageStatus,
        client_signature:signature,
        date_signed:dateSigned,
        acknowledgment:'Confirmed',
        guardian_name:isMinor?guardianName.value.trim():'',
        guardian_relationship:isMinor?guardianRelationship.value.trim():'',
        guardian_email:isMinor?guardianEmail.value.trim():'',
        guardian_phone:isMinor?document.getElementById('guardianPhone').value.trim():'',
        guardian_signature:isMinor?guardianSignature.value.trim():'',
        _honey:honey,
        turnstile_token:formProtection.tokens.photoRelease
      };

      const response=await fetchWithTimeout('/api/photo-release',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Accept':'application/json'
        },
        body:JSON.stringify(payload)
      },20000);

      const result=await response.json().catch(()=>({}));
      if(!response.ok||result.success===false){
        throw new Error(result.message||'We could not submit the photo release right now.');
      }

      status.textContent=`Thank you. Your photo-release preference has been recorded${result.record_id?` (reference ${result.record_id})`:''}.`;
      status.classList.add('success');
      resetReleaseFormState();
    }catch(error){
      const timedOut=error?.name==='AbortError';
      status.textContent=timedOut
        ? 'The request timed out. Please try again, or contact Pazzion Stylez before any photos are used.'
        : (error?.message||'We could not submit the release right now. Please contact Pazzion Stylez before any photos are used.');
      status.classList.add('error');
      resetTurnstile('photoRelease');
    }finally{
      photoReleaseForm.removeAttribute('aria-busy');
      submitButton.disabled=false;
      submitButton.removeAttribute('aria-disabled');
    }
  });
}

/* If a synchronous JavaScript error occurs before this point, the page
   remains in no-js safety mode and the online submit buttons stay hidden. */
document.documentElement.classList.remove('no-js');
document.documentElement.classList.add('js');
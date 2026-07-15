(function(){
  "use strict";

  /** Owns responsive browse-panel behavior shared by music, video, and text tabs. */
  function create(options){
    const {nav,textList,setOpen,toggleOpen,buttonIcon,getMediaType,mobileBreakpoint}=options;
    let collapsed=true;
    const isMobile=()=>window.innerWidth<=mobileBreakpoint;
    function updateBrowseToggle(){
      document.body.classList.toggle("browseCollapsed",collapsed&&!isMobile());
      document.querySelectorAll(".browseToggle").forEach(button=>{
        button.innerHTML=buttonIcon("browse");
        button.title=collapsed&&!isMobile()?"Show browse panel":"Browse";
        button.setAttribute("aria-label",button.title);
      });
    }
    function collapseDesktop(){
      if(isMobile())return;
      collapsed=true;
      localStorage.setItem("browseCollapsed","true");
      updateBrowseToggle();
    }
    function closeBrowse(){setOpen(nav,false); collapseDesktop();}
    function closeTextBrowse(){setOpen(textList,false); collapseDesktop();}
    function toggleBrowse(){
      if(isMobile()){
        toggleOpen(getMediaType()==="interviews"?textList:nav);
        return;
      }
      collapsed=!collapsed;
      localStorage.setItem("browseCollapsed",collapsed?"true":"false");
      updateBrowseToggle();
    }
    function setDeviceClass(){document.body.classList.toggle("mobileUi",isMobile()); updateBrowseToggle();}
    function collapse(){collapsed=true; localStorage.setItem("browseCollapsed","true"); updateBrowseToggle();}
    return {collapse,closeBrowse,closeTextBrowse,isMobile,setDeviceClass,toggleBrowse,updateBrowseToggle};
  }

  window.MediaPlayerNavigationController={create};
})();
